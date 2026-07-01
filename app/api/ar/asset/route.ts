/**
 * FINALIZE step of an AR scene-asset upload. The editor first calls
 * `/api/ar/asset/sign` for a Supabase signed upload URL and PUTs the file
 * STRAIGHT to Storage (bypassing Vercel's 4.5 MB Function request-body limit,
 * which otherwise 413s a multi-MB .glb at the edge before any route runs). It
 * then calls THIS route with the resulting object path so the server can:
 *   - re-validate the ACTUAL uploaded bytes against the per-kind size cap,
 *   - optimize models (.glb) in place,
 *   - charge tokens for heavy elements (model / video).
 * Returns the asset's public URL, which the editor stores inside
 * ar_models.scene.elements (saved via /api/ar/upload). Authed — RLS + the
 * ar-models byte-cap trigger enforce the per-plan cloud-storage limit (every
 * file in the bucket counts against profiles.cloud_ar_bytes).
 *
 * POST /api/ar/asset  (application/json: { card_id, kind=model|image|video|audio, path })
 *   -> 200 { ok: true, url, path } | 4xx { ok:false, error }
 */
import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";
import { AR_COST, chargeArTokens, refundArTokens, chargeErrorResponse } from "@/lib/ar/billing";
import { effectiveTier } from "@/lib/ar/db";
import { AR_ASSET_LIMITS, AR_BUCKET, contentTypeForExt, isArAssetKind, maxLabel } from "@/lib/ar/assetLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Optimizing an uploaded .glb (sharp re-encodes textures, meshoptimizer decimates
// geometry) can take a while — give it headroom so big models aren't killed mid-run.
export const maxDuration = 60;

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function mapErr(message: string): { error: string; status: number } {
  if (message.includes("ar_not_available_for_tier")) return { error: "AR is a Pro / Ultra feature.", status: 403 };
  if (message.includes("ar_storage_limit_reached")) return { error: "This would exceed your cloud storage limit.", status: 413 };
  if (message.includes("ar_storage_not_available_for_tier")) return { error: "Cloud storage isn’t on your plan.", status: 403 };
  return { error: "Upload failed. Please retry.", status: 500 };
}

export async function POST(req: Request) {
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("Not signed in.", 401);

  let body: { card_id?: unknown; kind?: unknown; path?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Expected JSON.");
  }

  const cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
  const kind = body.kind;
  const path = typeof body.path === "string" ? body.path : "";
  if (!cardId) return bad("Missing card_id.");
  if (!isArAssetKind(kind)) return bad("Unknown asset kind.");
  // Hard-scope the path to THIS owner's assets folder for THIS card, so a crafted
  // path can never finalize (download/replace) another user's object.
  if (!path.startsWith(`${user.id}/${cardId}/assets/`)) return bad("That asset doesn't belong to this card.", 403);

  const bucket = supabase.storage.from(AR_BUCKET);
  const removeSilently = async () => {
    try {
      await bucket.remove([path]);
    } catch {
      /* best-effort */
    }
  };

  // Confirm ownership.
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();
  if (!card) {
    await removeSilently();
    return bad("Card not found.", 404);
  }

  // Tier gate: custom element uploads (3D model / image / video / audio) are an
  // ULTRA feature. Pro AR is template-only. Defense-in-depth — sign already gated.
  const { data: prof } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_ends_at")
    .eq("id", user.id)
    .single();
  const tier = effectiveTier(prof?.subscription_tier ?? null, prof?.trial_ends_at ?? null);
  if (tier !== "ultra") {
    await removeSilently();
    return bad("Custom 3D models, video and uploads are an Ultra feature. Apply a pre-made template, or upgrade to build a full AR scene.", 403);
  }

  // Pull the just-uploaded object back (server -> Storage, not a request body, so
  // the 4.5 MB limit doesn't apply) to validate and, for models, optimize it.
  const { data: blob, error: dlErr } = await bucket.download(path);
  if (dlErr || !blob) return bad("Upload not found — please retry.", 404);
  let bytes: Uint8Array = Buffer.from(await blob.arrayBuffer());

  // Authoritative size gate: the signed URL itself does not enforce a max size,
  // so this is where an oversized file is actually rejected (and reclaimed).
  if (bytes.length > AR_ASSET_LIMITS[kind]) {
    await removeSilently();
    return bad(`${kind[0].toUpperCase()}${kind.slice(1)} is larger than ${maxLabel(kind)}.`, 413);
  }

  // Reject a mislabeled model before we optimize or charge tokens: a real binary
  // glTF starts with the ASCII magic "glTF". Without this a renamed/corrupt file
  // would be stored, billed, and then silently fail to render in the AR scene.
  if (kind === "model" && (bytes.length < 4 || Buffer.from(bytes.subarray(0, 4)).toString("ascii") !== "glTF")) {
    await removeSilently();
    return bad("That file isn't a valid .glb 3D model. Re-export it as binary glTF (.glb) and try again.");
  }

  const ext = path.split(".").pop()?.toLowerCase() || "";
  const contentType = contentTypeForExt(ext);

  // Shrink models the same way the curated gallery does: smaller stored file =
  // less of the owner's cloud_ar_bytes quota used and a faster load on phones.
  let needsReplace = false;
  if (kind === "model") {
    // Imported lazily so `next build`'s page-data pass never eagerly loads the
    // native sharp / gltf-transform graph (that fails at build time). It only
    // loads here, at request time, inside the Node function runtime.
    //
    // Wrapped: if the native optimizer (sharp/meshopt) can't load in this runtime,
    // DON'T fail the upload — keep the raw .glb that's already in Storage. The
    // model just isn't shrunk; far better than 500-ing the whole upload.
    try {
      const { optimizeGlb } = await import("@/lib/ar/glbOptimize");
      const opt = await optimizeGlb(bytes);
      if (opt.after < opt.before) {
        bytes = opt.buffer;
        needsReplace = true;
        console.log(`[ar/asset] model optimized ${(opt.before / 1024).toFixed(0)}KB → ${(opt.after / 1024).toFixed(0)}KB`);
      }
    } catch (e) {
      console.error("[ar/asset] glb optimize unavailable — storing original:", e instanceof Error ? e.message : e);
    }
  }

  // Token charge for heavy elements: 3D models and videos cost tokens (Pro+);
  // images and audio are free. Charge after validation + optimize (so a failed
  // optimize never bills); refund if the in-place replace below is rejected.
  const assetCost = kind === "model" ? AR_COST.model : kind === "video" ? AR_COST.video : 0;
  let assetCharge: { amount: number; source: string } | null = null;
  if (assetCost > 0) {
    const charge = await chargeArTokens(user.id, assetCost);
    if (!charge.ok) {
      await removeSilently();
      const m = chargeErrorResponse(charge);
      return bad(m.error, m.status);
    }
    assetCharge = { amount: assetCost, source: charge.source };
  }

  // Replace the raw upload with the optimized bytes at the SAME path. Delete +
  // re-insert (rather than an upsert overwrite) keeps the storage byte-cap trigger
  // exact: -raw then +optimized nets to the optimized size. The optimized file is
  // smaller than the raw one (which already passed the cap), so this never re-trips it.
  if (needsReplace) {
    await bucket.remove([path]);
    const { error: upErr } = await bucket.upload(path, bytes, { contentType, upsert: false });
    if (upErr) {
      if (assetCharge) await refundArTokens(user.id, assetCharge.amount, assetCharge.source);
      const m = mapErr(upErr.message);
      return bad(m.error, m.status);
    }
  }

  const url = bucket.getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, url, path });
}

/**
 * Delete ONE scene asset the editor uploaded but the owner then removed before
 * saving — otherwise that file lingers in the bucket counting against cloud
 * storage forever (the save-time cleanup only reclaims assets that were once
 * persisted). The editor calls this on element removal / media replace for
 * session-uploaded files. Deleting fires the storage trigger that decrements
 * profiles.cloud_ar_bytes, so the meter stays accurate.
 *
 * DELETE /api/ar/asset  (application/json: { card_id, url })
 *   -> 200 { ok:true } | 4xx { ok:false, error }
 */
export async function DELETE(req: Request) {
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("Not signed in.", 401);

  let body: { card_id?: unknown; url?: unknown };
  try {
    body = (await req.json()) as { card_id?: unknown; url?: unknown };
  } catch {
    return bad("Expected JSON { card_id, url }.");
  }
  const cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
  const url = typeof body.url === "string" ? body.url : "";
  if (!cardId || !url) return bad("Missing card_id or url.");

  // Confirm ownership of the card before deleting anything.
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();
  if (!card) return bad("Card not found.", 404);

  // Resolve the storage key from the public URL and HARD-SCOPE it to this owner's
  // own assets folder for this card — so a crafted URL can never delete another
  // user's (or another card's) files. RLS on the bucket is a second layer.
  const marker = `/${AR_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return bad("Not an AR asset URL.");
  let path = url.slice(idx + marker.length).split("?")[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw */
  }
  if (!path.startsWith(`${user.id}/${cardId}/assets/`)) {
    return bad("That asset doesn't belong to this card.", 403);
  }

  const { error } = await supabase.storage.from(AR_BUCKET).remove([path]);
  if (error) return bad("Could not remove the asset. Please try again.", 500);
  return NextResponse.json({ ok: true });
}
