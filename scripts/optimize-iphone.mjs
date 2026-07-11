/**
 * One-shot optimizer for the Sketchfab iPhone 16 GLB used by the hero phone.
 * - names the display plane "Screen" so PhoneCanvas can find/hide it
 * - prunes/welds/quantizes (KHR_mesh_quantization — decoded natively by three)
 * Usage: node scripts/optimize-iphone.mjs public/models/iphone16-src.glb public/models/iphone16.glb
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, weld, quantize, flatten, join } from "@gltf-transform/functions";

const [src, out] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
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

await doc.transform(
  dedup(),
  flatten(),
  join({ keepNamed: true }),
  weld(),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
  prune()
);

await io.write(out, doc);
const { statSync } = await import("node:fs");
console.log(`${src}: ${(statSync(src).size / 1e6).toFixed(2)} MB -> ${out}: ${(statSync(out).size / 1e6).toFixed(2)} MB`);
