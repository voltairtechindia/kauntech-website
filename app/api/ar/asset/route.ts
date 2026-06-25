/**
 * Uploads ONE scene asset (a .glb model or an image) for the AR composer and
 * returns its public URL. The editor calls this when the owner adds an element;
 * the URL is then stored inside ar_models.scene.elements (saved via
 * /api/ar/upload). Authed — RLS + the ar-models byte-cap trigger enforce limits.
 *
 * POST /api/ar/asset  (multipart/form-data: card_id, kind=model|image, file)
 *   -> 200 { ok: true, url, path } | 4xx { ok:false, error }
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AR_BUCKET = "ar-models";
const MAX_MODEL = 25 * 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;

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

  let ext: string;
  let contentType: string;
  if (kind === "model") {
    const isGlb = file.type === "model/gltf-binary" || file.name.toLowerCase().endsWith(".glb");
    if (!isGlb) return bad("Models must be .glb.");
    if (file.size > MAX_MODEL) return bad("Model is larger than 25 MB.", 413);
    ext = "glb";
    contentType = "model/gltf-binary";
  } else {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!ok) return bad("Images must be JPG, PNG or WebP.");
    if (file.size > MAX_IMAGE) return bad("Image is larger than 8 MB.", 413);
    ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    contentType = file.type || "image/jpeg";
  }

  const path = `${user.id}/${cardId}/assets/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(AR_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) {
    const m = mapErr(error.message);
    return bad(m.error, m.status);
  }

  const url = supabase.storage.from(AR_BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, url, path });
}
