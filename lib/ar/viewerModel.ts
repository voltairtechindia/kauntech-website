/**
 * Turns the `resolve_ar_model_for_card` RPC result into the 8th Wall viewer
 * page. This used to run in the /ar/view/[cardId] route handler; the site is
 * static now, so app/ar/view/page.tsx runs it in the browser with the app's
 * public (anon) key. The mapping is unchanged from the server version.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { normalizeLink, socialPreset } from "@/lib/ar/scene";
import { eightwallViewerHtml } from "@/lib/ar/eightwallViewer";

export type ViewerResult = { html: string } | { message: string };

export function buildViewer(data: unknown, cardId: string, worldTracking: boolean): ViewerResult {
  if (!data) return { message: "This card doesn’t have an AR experience yet." };
  const m = data as Record<string, any>;
  const isHttp = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u);

  // Track the single side the owner chose. Prefer the precompiled grayscale
  // luminance, else the chosen side's photo, else either side, else the legacy
  // reference image.
  const sceneCard = (m.scene && typeof m.scene === "object" ? (m.scene as any).card : null) ?? {};
  const targetSide = sceneCard.target === "back" ? "back" : "front";
  const ew = sceneCard.eightwall && typeof sceneCard.eightwall === "object" ? sceneCard.eightwall : {};
  const chosenPhoto = targetSide === "back" ? sceneCard.backUrl : sceneCard.frontUrl;
  const imageUrl =
    [ew.lumUrl, chosenPhoto, sceneCard.frontUrl, sceneCard.backUrl, m.reference_image_path].find(isHttp) ?? null;
  if (!imageUrl) return { message: "This card isn’t set up for AR tracking yet." };
  const targetDims =
    imageUrl === ew.lumUrl && Number(ew.w) > 0 && Number(ew.h) > 0
      ? { w: Number(ew.w), h: Number(ew.h) }
      : null;

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
        baseRotationX: Number(el.baseRotationX) || 0,
        rotationY: Number(el.rotationY) || 0,
        rotationZ: Number(el.rotationZ) || 0,
        scale: Number(el.scale) || 1,
        baseScale: Number(el.baseScale) > 0 ? Number(el.baseScale) : 1,
        aspect: Number(el.aspect) > 0 ? Number(el.aspect) : 1,
        loop: el.loop !== false,
        autoplay: el.autoplay !== false,
        muted: el.muted === true,
        volume: typeof el.volume === "number" ? Math.max(0, Math.min(1, el.volume)) : 1,
        playbackRate: Number(el.playbackRate) > 0 ? Number(el.playbackRate) : 1,
        animated: !!el.animated,
        animationSpeed: Number(el.animationSpeed) > 0 ? Number(el.animationSpeed) : 1,
        spin: !!el.spin,
        brightness: Number(el.brightness) > 0 ? Number(el.brightness) : 1.2,
      };
    });

  // A published but empty scene looks identical to "AR is broken"; say so instead.
  if (elements.length === 0) return { message: "This card doesn’t have an AR experience yet." };

  const li = (m.scene && typeof m.scene === "object" ? (m.scene as any).lighting : null) ?? {};
  const lighting = {
    intensity: typeof li.intensity === "number" && li.intensity > 0 ? Math.min(3, li.intensity) : 1.2,
  };

  return {
    html: eightwallViewerHtml({
      elements,
      lighting,
      target: { imageUrl, name: cardId, ...targetDims },
      worldTracking,
    }),
  };
}
