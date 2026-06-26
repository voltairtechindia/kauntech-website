/**
 * Optimize a user-uploaded .glb before it lands in the ar-models bucket.
 *
 * This is the SAME pipeline kauntech-admin runs on curated gallery models — kept
 * in sync deliberately. Both feed the same AR viewer (A-Frame's <a-gltf-model> /
 * 8th Wall, plain three GLTFLoader, no custom decoders), so we use ONLY transforms
 * whose output loads without a Draco/meshopt decoder: dedup, weld, simplify
 * (decimates at build time — writes plain geometry, no runtime decoder), resample,
 * prune, texture recompress (WebP + cap dimensions), and KHR_mesh_quantization
 * (three-native).
 *
 * Optimizing on upload shrinks the stored file (so it counts less against the
 * owner's cloud_ar_bytes quota) and makes the model load faster on phones.
 *
 * simplify() can distort skinned/morphed meshes, so it is skipped per-model when
 * the model deforms (see `deforms()`): static props get decimated, animated
 * avatars are left untouched. Never throws — falls back to the original bytes.
 */
import type { Document } from "@gltf-transform/core";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, quantize, resample, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

export interface OptimizeResult {
  buffer: Uint8Array;
  before: number;
  after: number;
}

/** Largest texture dimension we keep — plenty for a business-card-sized AR element. */
const MAX_TEXTURE = 2048;

/** Mesh decimation error budget, as a fraction of mesh radius (0.1% — imperceptible at card scale). */
const SIMPLIFY_ERROR = 0.001;

/** True if the model has skins, animations, or morph targets — geometry decimation would distort those. */
function deforms(doc: Document): boolean {
  const root = doc.getRoot();
  if (root.listSkins().length > 0 || root.listAnimations().length > 0) return true;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (prim.listTargets().length > 0) return true;
    }
  }
  return false;
}

/**
 * Returns the optimized glb, or the original bytes if optimization fails or
 * doesn't actually shrink the file. Never throws.
 */
export async function optimizeGlb(input: Uint8Array): Promise<OptimizeResult> {
  const before = input.length;
  try {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const doc = await io.readBinary(new Uint8Array(input));

    // Decimate triangle count on static models only. quantize() (below) shrinks
    // vertex *precision*; simplify() shrinks vertex *count* — the only real win
    // for high-poly models.
    const decimate = !deforms(doc);
    if (decimate) await MeshoptSimplifier.ready;

    await doc.transform(
      dedup(),
      weld(),
      ...(decimate ? [simplify({ simplifier: MeshoptSimplifier, ratio: 0, error: SIMPLIFY_ERROR })] : []),
      resample(),
      // Drop unused vertex attributes (stray UV sets, vertex colors) and fold
      // single-color textures back into material factors.
      prune({ keepAttributes: false, keepSolidTextures: false }),
      // Data maps carry geometry/lighting info — near-lossless so WebP artifacts
      // don't show up as banding on normals or wrong roughness.
      textureCompress({
        encoder: sharp,
        targetFormat: "webp",
        resize: [MAX_TEXTURE, MAX_TEXTURE],
        slots: /normal|metallicRoughness|occlusion/i,
        nearLossless: true,
        quality: 90,
      }),
      // Color/emissive maps tolerate lossy compression well.
      textureCompress({
        encoder: sharp,
        targetFormat: "webp",
        resize: [MAX_TEXTURE, MAX_TEXTURE],
        slots: /baseColor|emissive/i,
        quality: 80,
      }),
      quantize(),
    );

    const out = Buffer.from(await io.writeBinary(doc));
    // Keep whichever is smaller — quantization can occasionally inflate a tiny mesh.
    if (out.length < before) return { buffer: out, before, after: out.length };
    return { buffer: input, before, after: before };
  } catch {
    return { buffer: input, before, after: before };
  }
}
