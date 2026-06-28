/**
 * Uploads ONE scene asset (a .glb model, image, video or audio clip) for the AR
 * composer and returns its public URL. The editor calls this when the owner adds
 * or replaces an element; the URL is then stored inside ar_models.scene.elements
 * (saved via /api/ar/upload). Authed — RLS + the ar-models byte-cap trigger
 * enforce the per-plan cloud-storage limit (every file in the ar-models bucket,
 * regardless of type, counts against profiles.cloud_ar_bytes).
 *
 * POST /api/ar/asset  (multipart/form-data: card_id, kind=model|image|video|audio, file)
 *   -> 200 { ok: true, url, path } | 4xx { ok:false, error }
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";
import { AR_COST, chargeArTokens, refundArTokens, chargeErrorResponse } from "@/lib/ar/billing";
import { effectiveTier } from "@/lib/ar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Optimizing an uploaded .glb (sharp re-encodes textures, meshoptimizer decimates
// geometry) can take a while — give it headroom so big models aren't killed mid-run.
export const maxDuration = 60;

const AR_BUCKET = "ar-models";
const MAX_MODEL = 25 * 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;
const MAX_AUDIO = 12 * 1024 * 1024;

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Expected multipart/form-data.");
  }

  const cardId = typeof form.get("card_id") === "string" ? String(form.get("card_id")).trim() : "";
  const kind = String(form.get("kind") || "image");
  const file = form.get("file");
  if (!cardId) return bad("Missing card_id.");
  if (!(file instanceof File)) return bad("No file.");

  // Confirm ownership.
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();
  if (!card) return bad("Card not found.", 404);

  // Tier gate: custom element uploads (3D model / image / video / audio) are an
  // ULTRA feature. Pro AR is template-only — Pro composes by applying a pre-made
  // template (whose assets are shared/hosted, not uploaded here). Reject BEFORE
  // any validation/optimization/charge so a Pro upload never bills or stores.
  {
    const { data: prof } = await supabase
      .from("profiles")
      .select("subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .single();
    const tier = effectiveTier(prof?.subscription_tier ?? null, prof?.trial_ends_at ?? null);
    if (tier !== "ultra") {
      return bad("Custom 3D models, video and uploads are an Ultra feature. Apply a pre-made template, or upgrade to build a full AR scene.", 403);
    }
  }

  let ext: string;
  let contentType: string;
  if (kind === "model") {
    const isGlb = file.type === "model/gltf-binary" || file.name.toLowerCase().endsWith(".glb");
    if (!isGlb) return bad("Models must be .glb.");
    if (file.size > MAX_MODEL) return bad("Model is larger than 25 MB.", 413);
    ext = "glb";
    contentType = "model/gltf-binary";
  } else if (kind === "video") {
    const ok = ["video/mp4", "video/webm", "video/quicktime"].includes(file.type) || /\.(mp4|webm|m4v|mov)$/i.test(file.name);
    if (!ok) return bad("Video must be an MP4 or WebM file.");
    if (file.size > MAX_VIDEO) return bad("Video is larger than 40 MB. Trim or compress it first.", 413);
    ext = /\.webm$/i.test(file.name) || file.type === "video/webm" ? "webm" : "mp4";
    contentType = ext === "webm" ? "video/webm" : "video/mp4";
  } else if (kind === "audio") {
    const ok =
      ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/x-m4a"].includes(file.type) ||
      /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name);
    if (!ok) return bad("Audio must be an MP3, WAV, OGG or M4A file.");
    if (file.size > MAX_AUDIO) return bad("Audio is larger than 12 MB. Trim or compress it first.", 413);
    ext = /\.(\w+)$/i.exec(file.name)?.[1]?.toLowerCase() || (file.type.includes("mp4") || file.type.includes("m4a") ? "m4a" : "mp3");
    contentType = file.type || "audio/mpeg";
  } else {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!ok) return bad("Images must be JPG, PNG or WebP.");
    if (file.size > MAX_IMAGE) return bad("Image is larger than 8 MB.", 413);
    ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    contentType = file.type || "image/jpeg";
  }

  const path = `${user.id}/${cardId}/assets/${randomUUID()}.${ext}`;
  let bytes: Uint8Array = Buffer.from(await file.arrayBuffer());
  // Shrink models the same way the curated gallery does: smaller stored file =
  // less of the owner's cloud_ar_bytes quota used and a faster load on phones.
  if (kind === "model") {
    // Imported lazily so `next build`'s page-data pass never eagerly loads the
    // native sharp / gltf-transform graph (that fails at build time). It only
    // loads here, at request time, inside the Node function runtime.
    const { optimizeGlb } = await import("@/lib/ar/glbOptimize");
    const opt = await optimizeGlb(bytes);
    bytes = opt.buffer;
    if (opt.after < opt.before) {
      console.log(`[ar/asset] model optimized ${(opt.before / 1024).toFixed(0)}KB → ${(opt.after / 1024).toFixed(0)}KB`);
    }
  }

  // Token charge for heavy elements: 3D models and videos cost tokens (Pro+);
  // images and audio are free (small, negligible owner cost). Charge only once the
  // file is validated + optimized (so a failed optimize never bills), right before
  // the upload; refund if the upload is rejected (e.g. the storage byte-cap trigger).
  const assetCost = kind === "model" ? AR_COST.model : kind === "video" ? AR_COST.video : 0;
  let assetCharge: { amount: number; source: string } | null = null;
  if (assetCost > 0) {
    const charge = await chargeArTokens(user.id, assetCost);
    if (!charge.ok) {
      const m = chargeErrorResponse(charge);
      return bad(m.error, m.status);
    }
    assetCharge = { amount: assetCost, source: charge.source };
  }

  const { error } = await supabase.storage.from(AR_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) {
    if (assetCharge) await refundArTokens(user.id, assetCharge.amount, assetCharge.source);
    const m = mapErr(error.message);
    return bad(m.error, m.status);
  }

  const url = supabase.storage.from(AR_BUCKET).getPublicUrl(path).data.publicUrl;
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
