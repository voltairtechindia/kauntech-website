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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AR_BUCKET = "ar-models";

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
function mapDbError(message: string): { error: string; status: number } {
  if (message.includes("ar_not_available_for_tier"))
    return { error: "AR cards are a Pro / Ultra feature. Upgrade in the app to set one up.", status: 403 };
  if (message.includes("ar_model_limit_reached"))
    return { error: "You've reached your AR model limit for this plan.", status: 403 };
  if (message.includes("ar_storage_limit_reached"))
    return { error: "This would exceed your AR storage limit.", status: 413 };
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

  const isSentFile = (k: string) => {
    const f = form.get(k);
    return f instanceof File && f.size > 0;
  };
  const photosChanged = isSentFile("front_image") || isSentFile("back_image");

  // Prebuilt MindAR target (.mind), compiled in the editor at save time, so the
  // public viewer can skip the slow on-device compile. Optional + non-fatal: if
  // it's absent or fails to store, the viewer just compiles at view time.
  let mindUrl: string | null = null;
  let mindTargets: number | null = null;
  const mindFile = form.get("mind");
  if (mindFile instanceof File && mindFile.size > 0) {
    try {
      const path = `${userId}/${cardId}/${modelId}.mind`;
      const bytes = Buffer.from(await mindFile.arrayBuffer());
      const { error: mErr } = await bucket.upload(path, bytes, {
        contentType: "application/octet-stream",
        upsert: true,
      });
      if (!mErr) {
        // Cache-bust like the photos: deterministic path, so a recompile must
        // bust the CDN/WebView cache or a replaced target would serve stale.
        mindUrl = `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
        const c = parseInt(str(form.get("mind_target_count")), 10);
        mindTargets = Number.isFinite(c) && c > 0 ? c : null;
      }
    } catch {
      /* non-fatal — fall back to runtime compile in the viewer */
    }
  } else {
    // No new .mind this save. Keep the existing one ONLY if the target photos
    // didn't change; otherwise it was built from the old photos and would track
    // against stale features, so drop it and let the viewer recompile.
    const existingCard = ((existing?.scene as { card?: Record<string, unknown> } | null)?.card) ?? {};
    if (!photosChanged && typeof existingCard.mindUrl === "string") {
      mindUrl = existingCard.mindUrl;
      mindTargets = typeof existingCard.mindTargets === "number" ? existingCard.mindTargets : null;
    }
  }

  const targetSide = str(form.get("target_side")) === "back" ? "back" : "front";
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
    mindUrl: mindUrl ?? undefined,
    mindTargets: mindTargets ?? undefined,
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

  const { data: saved, error: saveErr } = existing
    ? await supabase.from("ar_models").update(row).eq("id", modelId).select().single()
    : await supabase.from("ar_models").insert(row).select().single();

  if (saveErr) {
    const m = mapDbError(saveErr.message);
    return bad(m.error, m.status);
  }
  return NextResponse.json({ ok: true, model: saved });
}
