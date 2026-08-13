import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => errors.push("page:" + String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console:" + m.text());
});

const st = () => page.evaluate(() => window.__gameTest.getState());

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1400);
await page.screenshot({ path: "/workspace/screenshots/title.png" });
console.log("TITLE:\n", (await page.evaluate(() => document.body.innerText)).slice(0, 400));

await page.keyboard.press("Enter");
await page.waitForTimeout(350);
await page.screenshot({ path: "/workspace/screenshots/title-choose.png" });
await page.getByRole("button", { name: /NEW GAME/i }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/workspace/screenshots/briefing.png" });
await page.waitForTimeout(3600);
await page.screenshot({ path: "/workspace/screenshots/in-world.png" });
console.log("STATE0", await st());

await page.evaluate(() => window.__gameTest.resetSave());
await page.evaluate(() => {
  const e = window.__gameTest;
  e.teleport("apartment");
});
await page.keyboard.down("KeyS");
await page.waitForTimeout(800);
await page.keyboard.up("KeyS");
await page.waitForTimeout(200);
console.log("AFTER WAKE", await st());

await page.evaluate(() => window.__gameTest.teleport("store"));
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/dialogue-k.png" });
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => window.__gameTest.advanceDialogue());
  await page.waitForTimeout(120);
}
console.log("AFTER K", await st());

await page.evaluate(() => window.__gameTest.teleport("dropvan"));
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(280);
await page.evaluate(() => window.__gameTest.teleport("neighborhood"));
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(280);
await page.evaluate(() => window.__gameTest.teleport("downtown"));
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(280);
await page.evaluate(() => window.__gameTest.teleport("culture"));
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(280);
console.log("AFTER DROPS", await st());

await page.evaluate(() => window.__gameTest.teleport("court"));
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/basketball.png" });
await page.evaluate(() => window.__gameTest.setBallScore(10));
await page.waitForTimeout(200);
await page.evaluate(() => {
  const eng = document.querySelector("canvas");
  void eng;
});
// leave court via API
await page.evaluate(() => {
  window.__gameTest.teleport("court");
});
console.log("AFTER BALL", await st());

await page.evaluate(() => window.__gameTest.teleport("store"));
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(200);
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => window.__gameTest.advanceDialogue());
  await page.waitForTimeout(120);
}
await page.waitForTimeout(400);
console.log("AFTER RETURN", await st());
await page.screenshot({ path: "/workspace/screenshots/mission-done.png" });

// shop
await page.waitForTimeout(3800);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(1400);
await page.screenshot({ path: "/workspace/screenshots/shop.png" });
const buy = page.getByRole("button", { name: "$40" }).first();
if (await buy.count()) {
  await buy.click();
  await page.waitForTimeout(250);
}
await page.screenshot({ path: "/workspace/screenshots/shop-bought.png" });

await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/pause.png" });

const missions = page.getByRole("button", { name: /Missions/i });
if (await missions.count()) {
  await missions.click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: "/workspace/screenshots/pause-missions.png" });
}
const trophies = page.getByRole("button", { name: /Trophies/i });
if (await trophies.count()) {
  await trophies.click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: "/workspace/screenshots/pause-trophies.png" });
}
const resume = page.getByRole("button", { name: /Resume/i });
if (await resume.count()) await resume.click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/final-world.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/mobile.png" });

console.log("ERRORS", errors);
await browser.close();
if (errors.length) process.exit(2);
