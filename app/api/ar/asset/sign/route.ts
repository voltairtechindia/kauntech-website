/**
 * Step 1 of the AR scene-asset upload: mint a Supabase **signed upload URL** so
 * the editor can PUT the file STRAIGHT to Storage, bypassing Vercel's 4.5 MB
 * Function request-body limit (which otherwise rejects a multi-MB .glb at the
 * edge with a plain-text "Request Entity Too Large" before any route runs).
 *
 * This route only validates + authorizes + reserves a path; it never touches the
 * bytes. Step 2 ([/api/ar/asset] POST = finalize) re-checks the uploaded object,
 * optimizes models, and charges tokens. No token charge happens here.
 *
 * POST /api/ar/asset/sign  (application/json: { card_id, kind, filename, content_type, size })
 *   -> 200 { ok:true, path, token } | 4xx { ok:false, error }
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";
import { effectiveTier } from "@/lib/ar/db";
import { AR_ASSET_LIMITS, AR_BUCKET, isArAssetKind, maxLabel, resolveArAsset } from "@/lib/ar/assetLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("Not signed in.", 401);

  let body: { card_id?: unknown; kind?: unknown; filename?: unknown; content_type?: unknown; size?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Expected JSON.");
  }

  const cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
  const kind = body.kind;
  const filename = typeof body.filename === "string" ? body.filename : "";
  const contentType = typeof body.content_type === "string" ? body.content_type : "";
  const size = Number(body.size);
  if (!cardId) return bad("Missing card_id.");
  if (!isArAssetKind(kind)) return bad("Unknown asset kind.");

  // Confirm ownership of the card.
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();
  if (!card) return bad("Card not found.", 404);

  // Tier gate: custom element uploads are an ULTRA feature (Pro AR is
  // template-only). Reject before minting any upload URL.
  const { data: prof } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_ends_at")
    .eq("id", user.id)
    .single();
  const tier = effectiveTier(prof?.subscription_tier ?? null, prof?.trial_ends_at ?? null);
  if (tier !== "ultra") {
    return bad("Custom 3D models, video and uploads are an Ultra feature. Apply a pre-made template, or upgrade to build a full AR scene.", 403);
  }

  // Validate type and resolve the stored extension/content-type.
  const resolved = resolveArAsset(kind, contentType, filename);
  if ("error" in resolved) return bad(resolved.error);

  // Fast size gate on the declared size — finalize re-checks the ACTUAL bytes
  // (a signed URL itself does not enforce a max size).
  if (Number.isFinite(size) && size > AR_ASSET_LIMITS[kind]) {
    return bad(`${kind[0].toUpperCase()}${kind.slice(1)} is larger than ${maxLabel(kind)}.`, 413);
  }

  // Reserve a fresh path under the owner's assets folder and sign it. The random
  // id guarantees the path is new, so the signed upload is a clean INSERT (no
  // overwrite — keeps the storage byte-cap trigger exact).
  const path = `${user.id}/${cardId}/assets/${randomUUID()}.${resolved.ext}`;
  const { data, error } = await supabase.storage.from(AR_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return bad("Could not start the upload. Please retry.", 500);

  // Hand back the resolved content-type so the client can stamp it onto the
  // uploaded Blob — supabase-js's uploadToSignedUrl derives the STORED type from
  // the Blob's own .type (it ignores the contentType option), and browsers report
  // a .glb with an empty / application/octet-stream type. Stamping the correct
  // type keeps the stored object well-typed and safe against a future
  // allowed_mime_types lockdown (the curated ar-gallery bucket already has one).
  return NextResponse.json({ ok: true, path: data.path, token: data.token, content_type: resolved.contentType });
}
