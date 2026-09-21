/**
 * Optimizer for the Sketchfab iPhone 16 GLB used by the hero phone.
 * - names the display plane "Screen" so PhoneCanvas can find/hide it
 * - bakes the graphite recolour + powered-off glass that PhoneCanvas would
 *   otherwise apply at runtime, so identical materials can dedup/join
 * - prunes/welds/quantizes (KHR_mesh_quantization — decoded natively by three)
 * - compresses with EXT_meshopt_compression (decoded by the MeshoptDecoder
 *   drei's useGLTF already wires in — no CDN, so the CSP stays happy)
 *
 * Idempotent: safe to re-run on its own output (quantization is skipped when
 * the input already carries KHR_mesh_quantization), which is how the shipped
 * public/models/iphone16.glb gets re-optimized without the Sketchfab source.
 *
 * Usage: node scripts/optimize-iphone.mjs <in.glb> <out.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, weld, quantize, flatten, join, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error("usage: node scripts/optimize-iphone.mjs <in.glb> <out.glb>");

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(src);
const root = doc.getRoot();

// The display: flat plane at z=0.39 spanning x ±3.263, y ±7.042 (mesh Object_3).
// The dynamic-island cutout pieces sit on the same plane (Object_0/1/2) — name
// them too so the app can hide all of them behind the live DOM screen.
const SCREEN_MESHES = new Set(["Object_3", "Object_0", "Object_1", "Object_2"]);
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  if (mesh.getName() === "Object_3") node.setName("Screen");
  else if (SCREEN_MESHES.has(mesh.getName())) node.setName("ScreenIsland");
}

// ---- bake the colourway (mirrors useKauntechPhone in PhoneCanvas) ----------
// The model ships teal; the site wants graphite titanium. Doing it here rather
// than at runtime lets dedup()/join() collapse the primitives that become
// identical, and leaves the runtime pass as a no-op safety net.
for (const mat of root.listMaterials()) {
  const [r, g, b, a] = mat.getBaseColorFactor();
  if (g > r * 1.3 && b > r * 1.3) {
    const lum = 0.3 * r + 0.5 * g + 0.2 * b; // hue-free, keep luminance
    const v = Math.min(Math.max(lum * 0.62, 0.02), 0.75);
    mat.setBaseColorFactor([v, v, Math.min(v * 1.06, 1), a]); // graphite, cool cast
  }
  const [er, eg] = mat.getEmissiveFactor();
  if (er > 0.5 || eg > 0.5) mat.setEmissiveFactor([0, 0, 0]);
}
// the glass: emissive 1/1/1 in the source would glow white — power it off
for (const node of root.listNodes()) {
  if (node.getName() !== "Screen") continue;
  for (const prim of node.getMesh()?.listPrimitives() ?? []) {
    prim
      .getMaterial()
      ?.setName("ScreenGlass")
      .setBaseColorFactor([0.0134, 0.0134, 0.0157, 1]) // #060607
      .setMetallicFactor(0.4)
      .setRoughnessFactor(0.12)
      .setEmissiveFactor([0, 0, 0]);
  }
}

// Only the screen plane and its island cutouts have to stay addressable by
// name at runtime; drop the rest of the Sketchfab node names so join() isn't
// held back by them (the per-mesh names still keep most primitives apart, and
// that's fine — 41 draw calls for one hero object is not what costs us).
for (const node of root.listNodes()) {
  const name = node.getName();
  if (name !== "Screen" && name !== "ScreenIsland") node.setName("");
}

const alreadyQuantized = root
  .listExtensionsUsed()
  .some((e) => e.extensionName === "KHR_mesh_quantization");

await doc.transform(
  dedup(),
  flatten(),
  join({ keepNamed: true }),
  ...(alreadyQuantized
    ? []
    : [weld(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 })]),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);

await io.write(out, doc);
const { statSync } = await import("node:fs");
const r = doc.getRoot();
const prims = r.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0);
console.log(
  `${src}: ${(statSync(src).size / 1e6).toFixed(2)} MB -> ${out}: ${(statSync(out).size / 1e6).toFixed(2)} MB` +
    ` (${prims} primitives, ${r.listMaterials().length} materials${alreadyQuantized ? ", quantization kept" : ""})`,
);
