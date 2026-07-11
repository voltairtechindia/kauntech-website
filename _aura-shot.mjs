/* Cursor-aware screenshot: loads a URL, moves a real cursor to (cx,cy), settles, shoots. */
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const [out, url, cx = "1050", cy = "440", settle = "3500"] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "shell",
  args: ["--use-angle=swiftshader", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900, hasTouch: false },
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
// nudge the cursor across the viewport so GSAP eases the orb toward it
await page.mouse.move(+cx - 120, +cy - 80, { steps: 6 });
await page.mouse.move(+cx, +cy, { steps: 12 });
await new Promise((r) => setTimeout(r, +settle));
const probe = await page.evaluate(() => {
  const el = document.querySelector(".k-aura-cursor");
  const cs = el && getComputedStyle(el);
  return {
    pointerFine: matchMedia("(pointer: fine)").matches,
    cursorOpacity: cs && cs.opacity,
    cursorTransform: cs && cs.transform,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    orbs: document.querySelectorAll(".k-aura-orb").length,
  };
});
console.log(JSON.stringify(probe));
writeFileSync(out, await page.screenshot({ type: "png" }));
await browser.close();
console.log("saved", out);
