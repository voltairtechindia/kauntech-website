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
 * Cheap, engine-agnostic trackability score (0..100) for a candidate AR target
 * photo. MindAR tracks on local image features, so a card with dense, well-SPREAD
 * high-contrast detail tracks steadily, while a near-blank card (lots of white, a
 * small logo in one corner) wobbles and loses lock at angles. We approximate
 * "feature richness + spread" from a Sobel edge-energy map summarised over an 8×8
 * grid: mean cell energy rewards detail, the share of populated cells rewards
 * spread (so detail crammed into one corner scores low). Downscaled to 256px so
 * it's fast. Best-effort: returns 0 on any failure (callers just skip the hint).
 */
export async function scoreTargetTrackability(src: File | string): Promise<number> {
  if (typeof window === "undefined") return 0;
  let loaded: { img: HTMLImageElement; revoke?: () => void } | null = null;
  try {
    loaded = await srcToImage(src);
    const img = loaded.img;
    const W = 256;
    const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W) || 256);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 0;
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    const gray = new Float32Array(W * H);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const GRID = 8;
    const cell = new Float32Array(GRID * GRID);
    const cellN = new Float32Array(GRID * GRID);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx =
          -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1] +
          gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
        const gy =
          -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1] +
          gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
        const mag = Math.sqrt(gx * gx + gy * gy);
        const cx = Math.min(GRID - 1, Math.floor((x / W) * GRID));
        const cy = Math.min(GRID - 1, Math.floor((y / H) * GRID));
        const ci = cy * GRID + cx;
        cell[ci] += mag;
        cellN[ci]++;
      }
    }

    let energySum = 0;
    let populated = 0;
    const CELL_THRESH = 14; // mean edge magnitude that counts as "has features"
    for (let c = 0; c < cell.length; c++) {
      const mean = cellN[c] ? cell[c] / cellN[c] : 0;
      energySum += mean;
      if (mean >= CELL_THRESH) populated++;
    }
    const detail = Math.min(1, energySum / cell.length / 45); // ~45 mean = rich
    const spread = populated / cell.length; // 0..1
    const score = Math.round(100 * detail * (0.35 + 0.65 * spread));
    return Math.max(0, Math.min(100, score));
  } catch {
    return 0;
  } finally {
    loaded?.revoke?.();
  }
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
