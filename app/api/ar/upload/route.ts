/**
 * Save the composed AR scene for one of the owner's cards. The scene is a list
 * of elements (models / images / social icons / video) built in the editor and
 * stored in ar_models.scene; asset files were already uploaded via
 * /api/ar/asset. Authed — RLS + the ar_models cap triggers enforce limits.
 *
 * POST /api/ar/upload  (multipart/form-data)
 *   card_id, name?, publish, scene (JSON {elements:[...]}), reference_image? (File)
 *   -> 200 { ok:true, model } | 4xx { ok:false, error }
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";
import { AR_COST, chargeArTokens, refundArTokens, chargeErrorResponse } from "@/lib/ar/billing";
import { effectiveTier } from "@/lib/ar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AR_BUCKET = "ar-models";

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
// Storage object key (path inside the bucket) from one of our public URLs, e.g.
// ".../object/public/ar-models/<uid>/<card>/<model>-front.jpg?v=123" -> the path
// "<uid>/<card>/<model>-front.jpg". Used to know which files to KEEP on cleanup.
function keyFromPublicUrl(u: string | null): string | null {
  if (!u) return null;
  const marker = `/${AR_BUCKET}/`;
  const i = u.indexOf(marker);
  if (i === -1) return null;
  const key = u.slice(i + marker.length).split("?")[0];
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}
function mapDbError(message: string): { error: string; status: number } {
  if (message.includes("ar_not_available_for_tier"))
    return { error: "AR cards are a Pro / Ultra feature. Upgrade in the app to set one up.", status: 403 };
  if (message.includes("ar_model_limit_reached"))
    return { error: "You've reached your AR model limit for this plan.", status: 403 };
  if (message.includes("ar_storage_limit_reached"))
    return { error: "This would exceed your cloud storage limit.", status: 413 };
  return { error: "Could not save. Please try again.", status: 500 };
}

export async function POST(req: Request) {
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("Not signed in.", 401);
  const userId = user.id;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Expected multipart/form-data.");
  }

  const cardId = str(form.get("card_id"));
  if (!cardId) return bad("Missing card_id.");

  const { data: card } = await supabase
    .from("cards")
    .select("id, custom_qr_url")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();
  if (!card) return bad("Card not found.", 404);

  const name = str(form.get("name")) || null;
  const publish = str(form.get("publish")) === "true";

  let scene: { elements?: unknown; card?: Record<string, unknown> } = { elements: [] };
  try {
    const raw = str(form.get("scene"));
    if (raw) scene = JSON.parse(raw);
  } catch {
    return bad("Invalid scene JSON.");
  }
  if (!Array.isArray(scene.elements)) scene.elements = [];

  const { data: existing } = await supabase
    .from("ar_models")
    .select("id, reference_image_path, ocr_text, scene")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  const modelId = existing?.id ?? randomUUID();

  // Effective tier (reused for the scene-content gate below AND the build charge).
  const { data: prof } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_ends_at")
    .eq("id", userId)
    .single();
  const tier = effectiveTier(prof?.subscription_tier ?? null, prof?.trial_ends_at ?? null);

  // Tier gate on scene CONTENT: custom 3D model / video elements are an Ultra
  // feature (Pro AR is template-only). A non-Ultra owner may only save model/video
  // elements that are KaunTech-hosted (template / gallery assets on our Supabase
  // storage) or that were ALREADY on this card (grandfathered) — never a new,
  // externally-hosted .glb/.mp4. Mirrors the /api/ar/asset upload gate and closes
  // the "self-host the file, reference its URL in the scene" bypass.
  if (tier !== "ultra") {
    // Allow-list OUR storage prefixes only: the app project's ar-models bucket
    // (custom + template assets; derived from the live client so no env guessing)
    // and the site project's ar-gallery bucket (curated models). A bare
    // "/storage/v1/object/public/" substring would ALSO match the user's own
    // Supabase project, so pin host+bucket to actually close the self-host bypass.
    const arModelsBase = supabase.storage.from(AR_BUCKET).getPublicUrl("_").data.publicUrl.replace(/_$/, "");
    const galleryBase = `${new URL(process.env.SUPABASE_URL ?? "https://ujzchcirgmveryjavfzk.supabase.co").origin}/storage/v1/object/public/ar-gallery/`;
    const HOSTED_PREFIXES = [arModelsBase, galleryBase];
    const priorUrls = new Set(
      ((((existing?.scene as { elements?: Array<{ url?: unknown }> } | null)?.elements) ?? [])
        .map((el) => (typeof el?.url === "string" ? el.url : null))
        .filter((u): u is string => !!u)),
    );
    const hasCustomHeavy = (scene.elements as Array<{ type?: unknown; url?: unknown }>).some((el) => {
      if (el?.type !== "model" && el?.type !== "video") return false;
      const url = typeof el?.url === "string" ? el.url : "";
      if (!url) return false;                // blank placeholder (e.g. video-by-URL not yet filled)
      if (priorUrls.has(url)) return false;  // unchanged / grandfathered element
      return !HOSTED_PREFIXES.some((p) => url.startsWith(p)); // new + foreign host/bucket => block
    });
    if (hasCustomHeavy) {
      return bad("Custom 3D models and video are an Ultra feature. On Pro, use a template or upgrade to add your own.", 403);
    }
  }

  // Resolve one card side to a public URL: upload a freshly-cropped file (to a
  // deterministic path so re-uploads overwrite, never orphaning bytes), or keep
  // an already-saved url the editor sent back.
  const bucket = supabase.storage.from(AR_BUCKET);
  function ownUrl(u: string | null): string | null {
    // Only trust storage urls we host; ignore anything else.
    return u && u.includes(`/${AR_BUCKET}/`) ? u : null;
  }
  async function resolveSide(side: "front" | "back"): Promise<string | null> {
    const file = form.get(`${side}_image`);
    if (file instanceof File && file.size > 0) {
      const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!okType) throw new Error("Card image must be JPG, PNG or WebP.");
      if (file.size > 6 * 1024 * 1024) throw new Error("Card image is larger than 6 MB.");
      const path = `${userId}/${cardId}/${modelId}-${side}.jpg`;
      const bytes = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await bucket.upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: true });
      if (upErr) throw new Error(upErr.message);
      // Deterministic path means re-uploads overwrite (no orphaned bytes), but
      // the public URL is unchanged — bust the CDN/browser cache so a replaced
      // photo actually shows in the editor and the AR viewer.
      return `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    }
    return ownUrl(str(form.get(`${side}_url`)) || null);
  }

  let frontUrl: string | null;
  let backUrl: string | null;
  try {
    frontUrl = await resolveSide("front");
    backUrl = await resolveSide("back");
  } catch (e) {
    const m = mapDbError(e instanceof Error ? e.message : "");
    return bad(e instanceof Error && !e.message.includes("ar_") ? e.message : m.error, m.status);
  }

  const targetSide = str(form.get("target_side")) === "back" ? "back" : "front";
  const isSentFile = (k: string) => {
    const f = form.get(k);
    return f instanceof File && f.size > 0;
  };

  const existingCard = ((existing?.scene as { card?: Record<string, unknown> } | null)?.card) ?? {};

  // 8th Wall PLANAR target (premium engine) for the chosen side: a grayscale
  // luminance image generated in the editor — store when sent, else keep the
  // existing one unless the target side/photo changed.
  let eightwall: { lumUrl: string; w: number; h: number } | null = null;
  const ewFile = form.get("eightwall");
  if (ewFile instanceof File && ewFile.size > 0) {
    try {
      const path = `${userId}/${cardId}/${modelId}.lum.jpg`;
      const bytes = Buffer.from(await ewFile.arrayBuffer());
      const { error: eErr } = await bucket.upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (!eErr) {
        const lumUrl = `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
        const w = parseInt(str(form.get("eightwall_w")), 10);
        const h = parseInt(str(form.get("eightwall_h")), 10);
        if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) eightwall = { lumUrl, w, h };
      }
    } catch {
      /* non-fatal — the viewer tracks on the raw card photo instead */
    }
  } else {
    const targetPhotoChanged = targetSide === "back" ? isSentFile("back_image") : isSentFile("front_image");
    const targetSideChanged = typeof existingCard.target === "string" && existingCard.target !== targetSide;
    const prevEw = existingCard.eightwall as { lumUrl?: string; w?: number; h?: number } | undefined;
    if (!targetPhotoChanged && !targetSideChanged && prevEw && typeof prevEw.lumUrl === "string" && Number(prevEw.w) > 0 && Number(prevEw.h) > 0) {
      eightwall = { lumUrl: prevEw.lumUrl, w: Number(prevEw.w), h: Number(prevEw.h) };
    }
  }

  // AR tracking target = the chosen side; fall back to the other side, then the
  // existing target, then the card's QR image so older cards keep working.
  const referenceImagePath =
    (targetSide === "back" ? backUrl : frontUrl) ??
    (targetSide === "back" ? frontUrl : backUrl) ??
    existing?.reference_image_path ??
    card.custom_qr_url ??
    null;

  // Printed text per side (OCR'd in the editor). Stored on scene.card so the
  // editor can re-seed without re-OCR, and combined into ar_models.ocr_text so
  // the app's markerless AR matcher (resolve_ar_card_by_text) can match a
  // scanned card against what this card actually prints.
  const frontOcr = str(form.get("front_ocr")) || null;
  const backOcr = str(form.get("back_ocr")) || null;
  // Don't wipe previously-captured text when a save sends none (e.g. an edit that
  // didn't re-OCR the photo) — keep whatever the model already had.
  const ocrText = [frontOcr, backOcr].filter(Boolean).join("\n") || existing?.ocr_text || null;

  scene.card = {
    frontUrl: frontUrl ?? undefined,
    backUrl: backUrl ?? undefined,
    target: targetSide,
    frontOcr: frontOcr ?? undefined,
    backOcr: backOcr ?? undefined,
    eightwall: eightwall ?? undefined,
  };

  const row = {
    id: modelId,
    user_id: user.id,
    card_id: cardId,
    name,
    source: "upload",
    template_key: null,
    scene,
    glb_path: null,
    reference_image_path: referenceImagePath,
    ocr_text: ocrText,
    scale: 1,
    orientation: { x: 0, y: 0, z: 0 },
    is_default: true,
    is_published: publish,
  };

  // Token charge: building a NEW AR card is billed by tier — Pro publishes a
  // pre-made template card (buildPro), Ultra builds a custom card (buildUltra).
  // Edits to an existing card are free — only the create event is billed, which
  // also sidesteps the editor's auto-save firing many updates per session. Charge
  // just before the insert; refund if the insert is rejected (cap / storage trigger).
  let buildCharge: { amount: number; source: string } | null = null;
  if (!existing) {
    const buildCost = tier === "ultra" ? AR_COST.buildUltra : AR_COST.buildPro;
    const charge = await chargeArTokens(userId, buildCost);
    if (!charge.ok) {
      const m = chargeErrorResponse(charge);
      return bad(m.error, m.status);
    }
    buildCharge = { amount: buildCost, source: charge.source };
  }

  const { data: saved, error: saveErr } = existing
    ? await supabase.from("ar_models").update(row).eq("id", modelId).select().single()
    : await supabase.from("ar_models").insert(row).select().single();

  if (saveErr) {
    if (buildCharge) await refundArTokens(userId, buildCharge.amount, buildCharge.source);
    const m = mapDbError(saveErr.message);
    return bad(m.error, m.status);
  }

  // Keep storage lean: a card should hold only its CURRENT front/back photo and
  // the current 8th Wall luminance target. Delete every other top-level file left
  // behind by a previous save (an old model id, a removed side, a stale .mind or
  // .lum) so only the current files stay. Best-effort: never fail the save over
  // cleanup. Deleting a file fires the storage trigger that decrements
  // cloud_ar_bytes, so the cloud-storage meter stays accurate.
  try {
    const prefix = `${userId}/${cardId}`;

    // Top-level files: keep only the current front/back photo + 8th Wall target.
    const keep = new Set(
      [keyFromPublicUrl(frontUrl), keyFromPublicUrl(backUrl), keyFromPublicUrl(eightwall?.lumUrl ?? null)]
        .filter((k): k is string => !!k)
        .map((k) => k.split("/").pop() as string),
    );
    const { data: files } = await bucket.list(prefix, { limit: 100 });
    const stale = (files ?? [])
      .filter((f) => f.id && !keep.has(f.name)) // f.id present => a file (folders have none)
      .map((f) => `${prefix}/${f.name}`);
    if (stale.length) await bucket.remove(stale);

    // Element assets (models/images) live in the `assets/` subfolder, each
    // referenced by an element's `url`. When an element is removed or its model
    // swapped, the old file would otherwise be orphaned and keep counting against
    // cloud storage forever. Delete any asset no current element points at.
    const keepAssets = new Set(
      (scene.elements as Array<{ url?: unknown }>)
        .map((el) => (typeof el?.url === "string" ? keyFromPublicUrl(el.url) : null))
        .filter((k): k is string => !!k)
        .map((k) => k.split("/").pop() as string),
    );
    const assetPrefix = `${prefix}/assets`;
    const { data: assetFiles } = await bucket.list(assetPrefix, { limit: 200 });
    const staleAssets = (assetFiles ?? [])
      .filter((f) => f.id && !keepAssets.has(f.name))
      .map((f) => `${assetPrefix}/${f.name}`);
    if (staleAssets.length) await bucket.remove(staleAssets);
  } catch {
    /* best-effort cleanup */
  }

  return NextResponse.json({ ok: true, model: saved });
}
