/**
 * Per-kind size/type rules for AR scene-asset uploads, shared by the upload
 * client ([components/ar/Editor.tsx]) and BOTH halves of the upload flow:
 * `/api/ar/asset/sign` (mints a Supabase signed upload URL) and `/api/ar/asset`
 * (finalize: validate the uploaded object, optimize models, charge).
 *
 * WHY a direct-to-storage flow exists: Vercel caps a Function's REQUEST BODY at
 * 4.5 MB, so posting a multi-MB .glb through a route handler is rejected at the
 * edge with a plain-text "Request Entity Too Large" (413) before our code runs.
 * Uploading the file straight to Supabase Storage via a signed URL sidesteps that
 * limit, so these maxima are the ONLY ceiling that actually applies.
 *
 * This module is browser-safe (pure constants + a pure resolver, no server-only
 * imports) so the editor can pre-check a pick before it ever hits the network.
 */
export const AR_BUCKET = "ar-models";

/** Largest file we accept per element kind (bytes). Enforced client-side as a
 * fast pre-check and server-side (authoritatively) in the finalize route. */
export const AR_ASSET_LIMITS = {
  model: 15 * 1024 * 1024,
  image: 8 * 1024 * 1024,
  video: 40 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
} as const;

export type ArAssetKind = keyof typeof AR_ASSET_LIMITS;

export function isArAssetKind(v: unknown): v is ArAssetKind {
  return v === "model" || v === "image" || v === "video" || v === "audio";
}

/** Human-readable cap (e.g. "15 MB") for the too-large message of each kind. */
export function maxLabel(kind: ArAssetKind): string {
  return `${Math.round(AR_ASSET_LIMITS[kind] / (1024 * 1024))} MB`;
}

export interface ResolvedAsset {
  ext: string;
  contentType: string;
}

/**
 * Validate a picked file's type/name for `kind` and resolve the stored
 * extension + content-type. Mirrors the rules the single upload route used
 * before the split, so sign + finalize agree. Returns an error string instead
 * of throwing so both the client and the routes can surface it directly.
 */
export function resolveArAsset(
  kind: ArAssetKind,
  fileType: string,
  fileName: string,
): ResolvedAsset | { error: string } {
  const name = (fileName || "").toLowerCase();
  if (kind === "model") {
    const isGlb = fileType === "model/gltf-binary" || name.endsWith(".glb");
    if (!isGlb) return { error: "Models must be .glb." };
    return { ext: "glb", contentType: "model/gltf-binary" };
  }
  if (kind === "video") {
    const ok = ["video/mp4", "video/webm", "video/quicktime"].includes(fileType) || /\.(mp4|webm|m4v|mov)$/i.test(name);
    if (!ok) return { error: "Video must be an MP4 or WebM file." };
    const ext = /\.webm$/i.test(name) || fileType === "video/webm" ? "webm" : "mp4";
    return { ext, contentType: ext === "webm" ? "video/webm" : "video/mp4" };
  }
  if (kind === "audio") {
    const ok =
      ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/x-m4a"].includes(fileType) ||
      /\.(mp3|wav|ogg|m4a|aac)$/i.test(name);
    if (!ok) return { error: "Audio must be an MP3, WAV, OGG or M4A file." };
    const ext = /\.(\w+)$/i.exec(name)?.[1]?.toLowerCase() || (fileType.includes("mp4") || fileType.includes("m4a") ? "m4a" : "mp3");
    return { ext, contentType: fileType || "audio/mpeg" };
  }
  const ok = ["image/jpeg", "image/png", "image/webp"].includes(fileType) || /\.(jpe?g|png|webp)$/i.test(name);
  if (!ok) return { error: "Images must be JPG, PNG or WebP." };
  const ext = fileType === "image/png" ? "png" : fileType === "image/webp" ? "webp" : "jpg";
  return { ext, contentType: fileType || "image/jpeg" };
}

/** Map a stored extension back to a content-type (used by finalize, which only
 * has the object's path). Keep in lock-step with resolveArAsset's outputs. */
export function contentTypeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case "glb": return "model/gltf-binary";
    case "webm": return "video/webm";
    case "mp4": return "video/mp4";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "jpg": case "jpeg": return "image/jpeg";
    case "wav": return "audio/wav";
    case "ogg": return "audio/ogg";
    case "m4a": return "audio/mp4";
    case "aac": return "audio/aac";
    case "mp3": return "audio/mpeg";
    default: return "application/octet-stream";
  }
}
