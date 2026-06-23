"use client";

/**
 * Owner-side (save time) helpers for the 8th Wall AR target:
 *  - compileEightwallTarget — builds the grayscale luminance image 8th Wall tracks
 *  - scoreTargetTrackability — rates how well a card photo will track
 * All run in the browser, best-effort (null/0 on failure), so they can never
 * break saving.
 */

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

export interface EightwallTarget {
  /** Grayscale luminance JPEG of the card photo (the 8th Wall PLANAR target). */
  blob: Blob;
  /** Source image dimensions (the target's originalWidth/Height). */
  w: number;
  h: number;
}

/**
 * Build an 8th Wall PLANAR image target from the chosen card photo: a grayscale
 * "luminance" JPEG at height 640 (matching 8th Wall's image-target-cli output),
 * which the engine downloads and feature-extracts at runtime. Returns the blob +
 * the SOURCE dimensions (used as originalWidth/Height in the target JSON the
 * viewer builds). Generated client-side at save time. Best-effort: null on any
 * failure (the viewer then tracks on the raw card photo instead).
 */
export async function compileEightwallTarget(src: File | string): Promise<EightwallTarget | null> {
  if (typeof window === "undefined") return null;
  let loaded: { img: HTMLImageElement; revoke?: () => void } | null = null;
  try {
    loaded = await srcToImage(src);
    const img = loaded.img;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;

    const outH = 640; // 8th Wall luminanceHeight
    const outW = Math.max(1, Math.round((w / h) * outH));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, outW, outH);

    // Convert to true grayscale luminance (the engine wants a luminance image).
    // Remote photos are CORS-clean (Supabase serves access-control-allow-origin:
    // *), so getImageData won't taint.
    const id = ctx.getImageData(0, 0, outW, outH);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(id, 0, 0);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    if (!blob) return null;
    return { blob, w, h };
  } catch {
    return null;
  } finally {
    loaded?.revoke?.();
  }
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