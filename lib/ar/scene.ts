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
export type ArElementType = "model" | "image" | "video" | "social" | "text" | "audio";

export interface ArElement {
  id: string;
  type: ArElementType;
  /** Asset URL for model (.glb) / image / video / audio. */
  url?: string;
  /** Loop playback (video / audio). Absent → true (media loops by default). */
  loop?: boolean;
  /** Auto-play on scan (audio). Absent → true. Audio also has a tappable speaker
   *  control in AR for devices that block autoplay. */
  autoplay?: boolean;
  /** Start the video silent (video). Absent → false (the clip's own sound plays).
   *  A muted clip stays silent; an unmuted one starts muted only long enough to
   *  satisfy the browser's autoplay rule, then un-mutes on the first tap. */
  muted?: boolean;
  /** Playback volume 0–1 (video). Absent → 1 (full). */
  volume?: number;
  /** Playback speed multiplier (video). 1 = normal, 0.5 = half, 2 = double.
   *  Absent → 1. */
  playbackRate?: number;
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
  /** Rotation around the X axis (tilt forward/back), in radians. This is the
   *  USER's tilt offset — it starts at 0 (upright). */
  rotationX?: number;
  /** Auto stand-up tilt baked at add time (radians, X axis), analogous to
   *  baseScale: models are authored Y-up but the card face is the ground, so a
   *  model needs +90° about X to stand upright. Effective tilt = baseRotationX +
   *  rotationX, so the user's Tilt slider is a clean offset from upright. Absent →
   *  0 (legacy elements baked the stand tilt into rotationX itself). */
  baseRotationX?: number;
  /** Rotation around the Z axis (roll), in radians. */
  rotationZ?: number;
  /** User-facing size as a MULTIPLIER of baseScale (1 = the auto-fit size). */
  scale: number;
  /** Natural aspect ratio (width / height) of a flat media element (image /
   *  video), captured when it's added so its plane keeps the media's real shape
   *  instead of being squashed into a square. Analogous to baseScale for models.
   *  Absent → 1 (square). */
  aspect?: number;
  /** Auto-fit normalization factor set when a model is added, so wildly-sized
   *  glbs (icon vs. car) all start at a sane size. Effective render scale =
   *  (baseScale ?? 1) * scale. Absent on older elements → treated as 1. */
  baseScale?: number;
  /** Play GLB animations (avatars). */
  animated?: boolean;
  /** Playback-rate multiplier for the model's animation AND self-rotate spin
   *  (1 = normal, 2 = twice as fast, 0.5 = half). Absent → 1. */
  animationSpeed?: number;
  /** Continuously self-rotate in the published view. */
  spin?: boolean;
  /** Hide from the scene and the published view (draft element). */
  hidden?: boolean;
  /** Model-specific brightness multiplier. */
  brightness?: number;
}

export const DEFAULT_TEXT_COLOR = "#18181b";

/** Base size (longest side, in card-width units) of a flat media plane, before
 *  the user's scale multiplier. Image and video start a touch differently so each
 *  lands at a sensible on-card size. */
export const FLAT_BASE = { image: 0.3, video: 0.5 } as const;

/** Width/height of a flat media plane for a given aspect (w/h), keeping the
 *  longest side at `base`. Shared by the editor preview AND the AR viewer so what
 *  you compose is what gets published (no square-cropping / stretching). */
export function flatPlaneSize(aspect: number | undefined, base: number): [number, number] {
  const a = Number(aspect) > 0 ? Number(aspect) : 1;
  return a >= 1 ? [base, base / a] : [base * a, base];
}

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

/** A streaming-site page URL (YouTube/Vimeo/etc.) that is NOT a direct video
 *  file. AR plays video as a WebGL texture, so these don't work — only direct
 *  .mp4/.webm files do. Used to warn the owner in the editor. */
export function isStreamingPageUrl(raw: string): boolean {
  return /(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|tiktok\.com|facebook\.com\/watch|drive\.google\.com|dropbox\.com\/s)/i.test(
    raw || "",
  );
}

/** A direct, playable media file URL (by extension) — the only thing AR video can
 *  actually render. */
export function isDirectVideoUrl(raw: string): boolean {
  return /\.(mp4|webm|m4v|mov)(\?|#|$)/i.test(raw || "");
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
