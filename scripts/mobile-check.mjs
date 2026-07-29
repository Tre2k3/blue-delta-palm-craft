import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/workspace/screenshots/mobile-play.png" });
const overflow = await page.evaluate(() => ({
  sw: document.documentElement.scrollWidth,
  cw: document.documentElement.clientWidth,
  body: document.body.innerText.slice(0, 200),
}));
console.log(JSON.stringify({ overflow, errors }, null, 2));
await browser.close();
