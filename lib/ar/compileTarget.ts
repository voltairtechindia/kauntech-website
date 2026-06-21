"use client";

/**
 * Precompile MindAR image targets in the browser (owner side, at save time) so
 * the public viewer can SKIP the slow on-device feature-extraction compile and
 * just download the prebuilt .mind — much faster AR start. Best-effort: any
 * failure returns null and the viewer falls back to runtime compilation, so this
 * can never break saving or viewing.
 *
 * Uses the SAME MindAR build + version the viewer runs (1.2.5), from the same CDN
 * the /ar CSP already allows. The core (non-aframe) build exposes
 * MINDAR.IMAGE.Compiler without pulling in A-Frame; it's an ESM module loaded at
 * runtime (webpack/turbopack told to ignore it) since it's a large tfjs-backed
 * lib only needed on the save path.
 */

const MINDAR_CORE_URL =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadMindar(): Promise<any> {
  if (!modPromise) {
    const url = MINDAR_CORE_URL; // indirected so bundlers don't try to resolve it
    modPromise = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
  }
  return modPromise;
}

function srcToImage(src: File | string): Promise<{ img: HTMLImageElement; revoke?: () => void }> {
  return new Promise((resolve, reject) => {
    const isFile = typeof src !== "string";
    const objUrl = isFile ? URL.createObjectURL(src as File) : null;
    const img = new Image();
    // Remote photos must be CORS-clean for the compiler to read their pixels;
    // Supabase storage public objects serve `access-control-allow-origin: *`.
    if (!isFile) img.crossOrigin = "anonymous";
    img.onload = () => resolve({ img, revoke: objUrl ? () => URL.revokeObjectURL(objUrl) : undefined });
    img.onerror = () => {
      if (objUrl) URL.revokeObjectURL(objUrl);
      reject(new Error("image load failed"));
    };
    img.src = objUrl ?? (src as string);
  });
}

export interface CompiledTargets {
  blob: Blob;
  count: number;
}

/**
 * Compile an ordered set of target images (front, then back…) into one .mind
 * blob. The ORDER must match the viewer's target order so anchor indices line
 * up. Returns null on any failure (caller proceeds without the prebuilt target).
 */
export async function compileMindTargets(
  sources: (File | string)[],
  onProgress?: (p: number) => void,
): Promise<CompiledTargets | null> {
  if (typeof window === "undefined") return null;
  const clean = sources.filter(Boolean);
  if (!clean.length) return null;

  const loaded: { img: HTMLImageElement; revoke?: () => void }[] = [];
  try {
    for (const s of clean) loaded.push(await srcToImage(s));
    const mod = await loadMindar();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Compiler = mod?.Compiler ?? (window as any)?.MINDAR?.IMAGE?.Compiler;
    if (!Compiler) return null;
    const compiler = new Compiler();
    await compiler.compileImageTargets(
      loaded.map((l) => l.img),
      (p: number) => {
        try {
          onProgress?.(Number(p) || 0);
        } catch {
          /* ignore progress errors */
        }
      },
    );
    const buffer = await compiler.exportData();
    return { blob: new Blob([buffer]), count: loaded.length };
  } catch {
    return null;
  } finally {
    loaded.forEach((l) => l.revoke?.());
  }
}
