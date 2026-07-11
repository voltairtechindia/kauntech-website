import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];

const fmt = (b) =>
  `min=[${b.min.map((v) => v.toFixed(3))}] max=[${b.max.map((v) => v.toFixed(3))}] size=[${b.max.map((v, i) => (v - b.min[i]).toFixed(3))}] center=[${b.max.map((v, i) => ((v + b.min[i]) / 2).toFixed(3))}]`;

console.log("SCENE ", fmt(getBounds(scene)));
for (const node of root.listNodes()) {
  if (node.getName() === "Screen" || node.getName() === "ScreenIsland") {
    console.log(`${node.getName()} (mesh=${node.getMesh()?.getName()}) `, fmt(getBounds(node)));
  }
}

// also: biggest nodes by bbox area to spot stray geometry
const all = root
  .listNodes()
  .filter((n) => n.getMesh())
  .map((n) => {
    const b = getBounds(n);
    const s = b.max.map((v, i) => v - b.min[i]);
    return { name: n.getName() || n.getMesh().getName(), vol: s[0] * s[1], b };
  })
  .sort((a, b) => b.vol - a.vol)
  .slice(0, 8);
console.log("\nLargest nodes by XY area:");
for (const n of all) console.log(`  ${n.name}: ${fmt(n.b)}`);
