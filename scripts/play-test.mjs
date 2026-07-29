import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const btn = page.getByRole("button", { name: /ENTER MEMPHIS/i });
await btn.click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/workspace/screenshots/playing.png" });

await page.locator("canvas").click({ position: { x: 640, y: 400 } });

// Leave apartment south
for (let i = 0; i < 40; i++) {
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(40);
  await page.keyboard.up("KeyS");
}
// East toward HQ
for (let i = 0; i < 120; i++) {
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(35);
  await page.keyboard.up("KeyD");
}
for (let i = 0; i < 20; i++) {
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(40);
  await page.keyboard.up("KeyW");
}
await page.keyboard.press("KeyE");
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/at-hq.png" });
console.log("AT HQ:\n", (await page.evaluate(() => document.body.innerText)).slice(0, 800));

for (let i = 0; i < 6; i++) {
  const tap = page.getByText(/Tap to continue/i);
  if (await tap.count()) {
    await tap.click();
    await page.waitForTimeout(250);
  } else {
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(200);
  }
}
await page.screenshot({ path: "/workspace/screenshots/after-dialogue.png" });
console.log("AFTER DIALOGUE:\n", (await page.evaluate(() => document.body.innerText)).slice(0, 800));
console.log("ERRORS:", errors);

// Open shop at HQ if possible
await page.keyboard.press("KeyE");
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/shop-or-next.png" });
console.log("SHOP/NEXT:\n", (await page.evaluate(() => document.body.innerText)).slice(0, 800));

await browser.close();
