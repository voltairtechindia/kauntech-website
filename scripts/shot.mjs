/* Screenshot helper: node scripts/shot.mjs <out.png> [scrollY] [width] [height] [settleMs] */
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const [out = "/tmp/shot.png", scrollY = "0", width = "1440", height = "900", settle = "6000"] =
  process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "shell",
  args: ["--use-angle=swiftshader", "--hide-scrollbars"],
  defaultViewport: { width: +width, height: +height },
});
const page = await browser.newPage();
await page.goto(process.env.SHOT_URL ?? "http://localhost:3000", { waitUntil: "networkidle2", timeout: 60000 });
if (+scrollY > 0) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), +scrollY);
}
await new Promise((r) => setTimeout(r, +settle));
writeFileSync(out, await page.screenshot({ type: "png" }));
await browser.close();
console.log("saved", out);
