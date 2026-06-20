/**
 * AR scene model. A published AR card is a list of elements anchored on the
 * card image — 3D models, images, social icons, videos — each optionally with a
 * tap link. This is what makes the experience composable ("put whatever you
 * want and attach links"), like PlugXR / Kivicube / MyWebAR.
 *
 * Stored in ar_models.scene as { elements: ArElement[] }. The viewer
 * (app/ar/view/[cardId]) renders them; the editor (components/ar/Editor) builds
 * them. Asset files are uploaded via /api/ar/asset and referenced by URL.
 */
export type ArElementType = "model" | "image" | "video" | "social" | "text";

export interface ArElement {
  id: string;
  type: ArElementType;
  /** Asset URL for model (.glb) / image / video. */
  url?: string;
  /** Social platform key (for type 'social'). */
  platform?: string;
  /** Tap action — opens this URL. */
  link?: string;
  label?: string;
  /** Content for a text element (name / title / tagline). */
  text?: string;
  /** Text colour (type 'text'). */
  color?: string;
  /** Position relative to the card centre, in card-width units. */
  position: [number, number, number];
  /** Rotation around the Y axis (turn), in radians. Always present. */
  rotationY: number;
  /** Rotation around the X axis (tilt forward/back), in radians. */
  rotationX?: number;
  /** Rotation around the Z axis (roll), in radians. */
  rotationZ?: number;
  /** User-facing size as a MULTIPLIER of baseScale (1 = the auto-fit size). */
  scale: number;
  /** Auto-fit normalization factor set when a model is added, so wildly-sized
   *  glbs (icon vs. car) all start at a sane size. Effective render scale =
   *  (baseScale ?? 1) * scale. Absent on older elements → treated as 1. */
  baseScale?: number;
  /** Play GLB animations (avatars). */
  animated?: boolean;
  /** Continuously self-rotate in the published view. */
  spin?: boolean;
  /** Hide from the scene and the published view (draft element). */
  hidden?: boolean;
}

export const DEFAULT_TEXT_COLOR = "#18181b";

/** Scene-wide lighting. `intensity` is a brightness multiplier on every light
 *  (1 = default). Models render dark in AR if this is too low. */
export interface ArLighting {
  intensity: number;
}
export const DEFAULT_LIGHTING: ArLighting = { intensity: 1.2 };
export function readLighting(raw: unknown): ArLighting {
  const i = (raw as { intensity?: unknown } | null)?.intensity;
  const intensity = typeof i === "number" && i > 0 ? Math.min(3, i) : DEFAULT_LIGHTING.intensity;
  return { intensity };
}

export interface ArScene {
  elements: ArElement[];
  lighting?: ArLighting;
}

export interface SocialPreset {
  key: string;
  label: string;
  color: string;
  /** href prefix when the owner enters a handle instead of a full URL. */
  prefix?: string;
}

export const SOCIAL_PRESETS: SocialPreset[] = [
  { key: "instagram", label: "Instagram", color: "#E4405F", prefix: "https://instagram.com/" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", prefix: "https://linkedin.com/in/" },
  { key: "x", label: "X", color: "#0F1419", prefix: "https://x.com/" },
  { key: "facebook", label: "Facebook", color: "#1877F2", prefix: "https://facebook.com/" },
  { key: "youtube", label: "YouTube", color: "#FF0000", prefix: "https://youtube.com/@" },
  { key: "whatsapp", label: "WhatsApp", color: "#25D366", prefix: "https://wa.me/" },
  { key: "website", label: "Website", color: "#F59E0B" },
  { key: "email", label: "Email", color: "#6B7280", prefix: "mailto:" },
];

export function socialPreset(key?: string): SocialPreset | undefined {
  return SOCIAL_PRESETS.find((s) => s.key === key);
}

/** Normalize a tap link — allow tel:/mailto:, else ensure https://. */
export function normalizeLink(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^(https?:|tel:|mailto:)/i.test(v)) return v;
  return `https://${v.replace(/^www\./i, "")}`;
}

export function emptyScene(): ArScene {
  return { elements: [] };
}
