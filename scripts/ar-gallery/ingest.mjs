#!/usr/bin/env node
/**
 * Ingest curated .glb models into the KaunTech AR gallery.
 *
 *   node scripts/ar-gallery/ingest.mjs [sourceDir]
 *
 * sourceDir defaults to ~/Desktop/ar-gallery-models and must contain category
 * subfolders: social/ arrows/ avatars/ objects/. Each .glb is validated, uploaded
 * to the public `ar-gallery` Supabase bucket, and the catalogue
 * (lib/ar/gallery.generated.json) is regenerated. Re-running is idempotent
 * (uploads upsert), so add models and run again any time.
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_KEY from .env.local — the SITE project
 * (ujzchcirgmveryjavfzk), which hosts the public `ar-gallery` bucket. NOTE: this
 * is deliberately NOT the app project (bhpiv…, home of ar-models): the gallery
 * lives on the site project because that's where this repo has a service key, and
 * next.config.ts whitelists this origin in the CSP connect-src for both the editor
 * previews and the WebAR viewer. Keep all three (bucket, catalogue URLs, CSP) on
 * the same origin or the viewer silently fails to load models.
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, quantize, resample, textureCompress, weld } from "@gltf-transform/functions";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BUCKET = "ar-gallery";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — matches the bucket's file_size_limit
const CATEGORIES = ["social", "arrows", "avatars", "objects"];
const SOCIAL_KEYS = ["instagram", "linkedin", "x", "facebook", "youtube", "whatsapp", "website", "email"];

const SRC = process.argv[2] || path.join(homedir(), "Desktop", "ar-gallery-models");

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  const out = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

// Same decoder-free optimization the admin upload uses (textures→WebP, geometry
// quantized + welded + pruned). No Draco/meshopt — the A-Frame viewer can't
// decode those. Falls back to the original bytes on any failure.
async function optimizeGlb(input) {
  try {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const doc = await io.readBinary(new Uint8Array(input));
    await doc.transform(
      dedup(), weld(), resample(), prune(),
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [2048, 2048] }),
      quantize(),
    );
    const out = Buffer.from(await io.writeBinary(doc));
    return out.length < input.length ? out : input;
  } catch (e) {
    console.warn(`    optimize failed, using original: ${e?.message}`);
    return input;
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
// Proper brand / known casing — naive title-case mangles these.
const NAME_OVERRIDES = {
  linkedin: "LinkedIn", whatsapp: "WhatsApp", youtube: "YouTube",
  x: "X", instagram: "Instagram", facebook: "Facebook",
  email: "Email", website: "Website", phone: "Phone",
};
function titleize(slug) {
  if (NAME_OVERRIDES[slug]) return NAME_OVERRIDES[slug];
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function main() {
  const env = await loadEnv();
  const SUPABASE_URL = env.SUPABASE_URL;
  const KEY = env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !KEY) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local");
    process.exit(1);
  }
  if (!existsSync(SRC)) {
    console.error(`Source folder not found: ${SRC}`);
    process.exit(1);
  }

  const entries = [];
  let uploaded = 0;
  let skipped = 0;

  for (const category of CATEGORIES) {
    const dir = path.join(SRC, category);
    if (!existsSync(dir)) continue;
    const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".glb"));
    for (const file of files.sort()) {
      const abs = path.join(dir, file);
      const buf = await readFile(abs);
      const size = (await stat(abs)).size;

      // glTF-Binary magic = "glTF" (0x46546C67 little-endian).
      if (buf.length < 4 || buf.toString("ascii", 0, 4) !== "glTF") {
        console.warn(`  skip (not a .glb): ${category}/${file}`);
        skipped++;
        continue;
      }
      if (size > MAX_BYTES) {
        console.warn(`  skip (>${(MAX_BYTES / 1048576).toFixed(0)}MB, ${(size / 1048576).toFixed(2)}MB): ${category}/${file}`);
        skipped++;
        continue;
      }

      // base name without .glb, honouring .anim / .static animation overrides.
      let base = file.replace(/\.glb$/i, "");
      let animated = category === "avatars";
      if (/\.anim$/i.test(base)) { animated = true; base = base.replace(/\.anim$/i, ""); }
      else if (/\.static$/i.test(base)) { animated = false; base = base.replace(/\.static$/i, ""); }

      const slug = slugify(base);
      const id = `${category}-${slug}`;
      const objectPath = `${category}/${slug}.glb`;

      // platform for social coins → enables the tap-link prefix in the editor.
      let platform;
      if (category === "social") {
        platform = SOCIAL_KEYS.find((k) => slug === k || slug.startsWith(`${k}-`) || slug.includes(k));
      }

      const optimized = await optimizeGlb(buf);

      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          apikey: KEY,
          "Content-Type": "model/gltf-binary",
          "x-upsert": "true",
        },
        body: optimized,
      });
      if (!res.ok) {
        console.error(`  FAIL upload ${objectPath}: ${res.status} ${await res.text()}`);
        skipped++;
        continue;
      }

      entries.push({
        id,
        name: titleize(slug),
        category,
        glbUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`,
        ...(animated ? { animated: true } : {}),
        ...(platform ? { platform } : {}),
      });
      uploaded++;
      const savedPct = Math.max(0, Math.round(100 - (100 * optimized.length) / size));
      console.log(`  ok ${category}/${slug}.glb  (${(size / 1024).toFixed(0)}KB → ${(optimized.length / 1024).toFixed(0)}KB, -${savedPct}%${animated ? ", animated" : ""}${platform ? ", " + platform : ""})`);
    }
  }

  entries.sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));
  const json = JSON.stringify(entries, null, 2) + "\n";

  // Bundled fallback (build-time) ...
  const outPath = path.join(ROOT, "lib", "ar", "gallery.generated.json");
  await writeFile(outPath, json);

  // ... AND the live catalogue in the bucket, which the editor reads at runtime
  // so admin-added models appear without a redeploy.
  const catRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/catalog.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      apikey: KEY,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-upsert": "true",
    },
    body: json,
  });
  if (!catRes.ok) console.error(`  WARN: catalog.json upload failed: ${catRes.status} ${await catRes.text()}`);
  else console.log("  catalog.json published to bucket");

  console.log(`\nDone. uploaded=${uploaded} skipped=${skipped}`);
  console.log(`Catalogue written: ${path.relative(ROOT, outPath)} (${entries.length} models)`);
  if (uploaded === 0) console.log("No models found — drop .glb files into the category subfolders and re-run.");
}

main().catch((e) => { console.error(e); process.exit(1); });
