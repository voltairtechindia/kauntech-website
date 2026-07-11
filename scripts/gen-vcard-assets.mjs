/**
 * Generates the V-Card phone-screen assets:
 *  - public/assets/vcard-qr.svg — a REAL scannable QR encoding Harshal's vCard
 *    (error correction H, so the centered K badge doesn't break scanning)
 *  - public/assets/founder.jpg — face-cropped avatar from the supplied portrait
 * Usage: node scripts/gen-vcard-assets.mjs [path-to-portrait]
 */
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";
import sharp from "sharp";

const VCARD = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "N:Vadgama;Harshal;;;",
  "FN:Harshal Vadgama",
  "ORG:Kauntech",
  "TITLE:Founder",
  "TEL;TYPE=CELL:+917021000764",
  "EMAIL:business@voltairtech.com",
  "URL:https://kauntech.com",
  "END:VCARD",
].join("\n");

const svg = await QRCode.toString(VCARD, {
  type: "svg",
  errorCorrectionLevel: "H",
  margin: 0,
  color: { dark: "#09090B", light: "#ffffff00" },
});
writeFileSync("public/assets/vcard-qr.svg", svg);
console.log("wrote public/assets/vcard-qr.svg", svg.length, "bytes");

const src = process.argv[2];
if (src) {
  // portrait is 1024×1024 with the face around (512, 340) — crop tight for the
  // small circular avatar, then downscale
  await sharp(src)
    .extract({ left: 192, top: 20, width: 640, height: 640 })
    .resize(240, 240)
    .jpeg({ quality: 80 })
    .toFile("public/assets/founder.jpg");
  console.log("wrote public/assets/founder.jpg");
}
