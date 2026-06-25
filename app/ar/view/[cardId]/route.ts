/**
 * Public WebAR viewer. Renders the owner's composed scene (3D models with
 * animation, tappable social icons / images, video) anchored on the printed
 * card via 8th Wall — image targets + World Tracking (SLAM) with IMU fusion, so
 * content stays glued at all angles and doesn't shimmer. Standalone HTML loaded
 * by the app's WebView. 8th Wall is the ONLY engine (the old MindAR fallback was
 * removed); the viewer + loader are built in lib/ar/eightwallViewer.
 *
 * The image target is built in the browser from whatever target image the card
 * has — preferring the grayscale luminance the editor precompiles
 * (scene.card.eightwall.lumUrl), else the chosen side's photo, so EVERY published
 * card works without a re-save. ?worldtracking=0 forces image-only (no IMU).
 */
import { createClient } from "@supabase/supabase-js";
import { normalizeLink, socialPreset } from "@/lib/ar/scene";
import { eightwallViewerHtml } from "@/lib/ar/eightwallViewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_URL ?? "";
const APP_ANON = process.env.NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_ANON_KEY ?? "";

function page(body: string) {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Never cache the viewer HTML — the WebView/CDN must always get the latest
      // (deploys were appearing stale otherwise).
      "cache-control": "no-store, must-revalidate",
    },
  });
}
function fallback(message: string) {
  return page(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>body{margin:0;background:#0B0D12;color:#e6edf3;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px}</style>
</head><body><div><p>${message}</p></div></body></html>`);
}

export async function GET(req: Request, ctx: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await ctx.params;
  if (!APP_URL || !APP_ANON) return fallback("AR isn’t configured.");

  const supabase = createClient(APP_URL, APP_ANON, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("resolve_ar_model_for_card", { p_card_id: cardId });
  if (error || !data) return fallback("This card doesn’t have an AR experience yet.");

  const m = data as Record<string, any>;
  const isHttp = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u);

  // Target image for 8th Wall's PLANAR image target. Track a SINGLE side — the
  // one the owner chose. Prefer the precompiled grayscale luminance (exact 8th
  // Wall format), else the chosen side's photo, else either side, else the legacy
  // reference image. The viewer reads the image's real dimensions client-side, so
  // any of these works and every published card tracks without a re-save.
  const sceneCard = (m.scene && typeof m.scene === "object" ? (m.scene as any).card : null) ?? {};
  const targetSide = sceneCard.target === "back" ? "back" : "front";
  const ew = sceneCard.eightwall && typeof sceneCard.eightwall === "object" ? sceneCard.eightwall : {};
  const chosenPhoto = targetSide === "back" ? sceneCard.backUrl : sceneCard.frontUrl;
  const imageUrl =
    [ew.lumUrl, chosenPhoto, sceneCard.frontUrl, sceneCard.backUrl, m.reference_image_path].find(isHttp) ?? null;
  if (!imageUrl) return fallback("This card isn’t set up for AR tracking yet.");

  const rawEls = Array.isArray(m.scene?.elements) ? m.scene.elements : [];
  const elements = rawEls
    .filter((el: Record<string, any>) => !el.hidden)
    .map((el: Record<string, any>) => {
      const p = socialPreset(el.platform);
      return {
        type: el.type,
        url: typeof el.url === "string" ? el.url : null,
        color: el.type === "text" ? (typeof el.color === "string" ? el.color : "#18181b") : p?.color ?? null,
        label: el.label ?? p?.label ?? null,
        text: typeof el.text === "string" ? el.text : null,
        link: el.link ? normalizeLink(String(el.link)) : null,
        position: Array.isArray(el.position) ? el.position : [0, 0.2, 0.15],
        rotationX: Number(el.rotationX) || 0,
        // Auto stand-up tilt baked at add time; effective tilt = baseRotationX +
        // rotationX (legacy elements have no baseRotationX → the tilt is in
        // rotationX itself, so 0 here keeps them upright).
        baseRotationX: Number(el.baseRotationX) || 0,
        rotationY: Number(el.rotationY) || 0,
        rotationZ: Number(el.rotationZ) || 0,
        scale: Number(el.scale) || 1,
        // Auto-fit normalization factor; effective render scale = baseScale * scale.
        baseScale: Number(el.baseScale) > 0 ? Number(el.baseScale) : 1,
        // Flat-media (image/video) aspect ratio (w/h) so the plane keeps its real
        // shape instead of being squashed square. Absent → 1.
        aspect: Number(el.aspect) > 0 ? Number(el.aspect) : 1,
        // Video/audio playback flags. Absent → loop on, autoplay on (audio).
        loop: el.loop !== false,
        autoplay: el.autoplay !== false,
        animated: !!el.animated,
        // Playback-rate multiplier for GLB animation + self-rotate spin (1 = normal).
        animationSpeed: Number(el.animationSpeed) > 0 ? Number(el.animationSpeed) : 1,
        spin: !!el.spin,
        // Per-model brightness multiplier (1.2 = neutral, matches the editor preview
        // baseline). Applied to the model's material colors in the viewer.
        brightness: Number(el.brightness) > 0 ? Number(el.brightness) : 1.2,
      };
    });

  const li = (m.scene && typeof m.scene === "object" ? (m.scene as any).lighting : null) ?? {};
  const lighting = { intensity: typeof li.intensity === "number" && li.intensity > 0 ? Math.min(3, li.intensity) : 1.2 };

  // World Tracking (SLAM) on by default; ?worldtracking=0 = image-only (no IMU).
  const worldTracking = new URL(req.url).searchParams.get("worldtracking") !== "0";

  return page(eightwallViewerHtml({ elements, lighting, target: { imageUrl, name: cardId }, worldTracking }));
}
