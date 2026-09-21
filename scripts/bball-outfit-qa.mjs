#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { captureShot, closeBrowser, launchBrowser, preparePage } from "./smoke-lib.mjs";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const outfits = [
  "tour_red",
  "tour_white",
  "tour_black",
  "jersey_black_fresh",
  "jersey_white_224",
  "jersey_blue_fresh",
];

const browser = await launchBrowser(true);
await mkdir("artifacts/bball", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);
await preparePage(page);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("button:has-text('ENTER MEMPHIS')", { timeout: 30000 });
await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
await page.waitForFunction(() => window.__gameTest && window.__gameTest.enterCourt, { timeout: 25000 });
await page.waitForTimeout(2500);

for (const id of outfits) {
  await page.evaluate((outfit) => {
    window.__gameTest.wearProduct(outfit);
    window.__gameTest.enterCourt();
  }, id);
  await page.waitForTimeout(1200);
  await captureShot(page, `artifacts/bball/${id}-ready.png`);

  await page.evaluate(() => window.__gameTest.beginCharge());
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    window.__gameTest.setKeys?.([]);
    window.__gameTest.releaseShot();
  });
  await page.waitForTimeout(280);
  await captureShot(page, `artifacts/bball/${id}-shot.png`);
}

await page.evaluate(() => {
  window.__gameTest.wearProduct("tour_red");
  window.__gameTest.enterCourt();
});
await page.waitForTimeout(800);
await page.evaluate(() => {
  const t = window.__controlsTest;
  if (t?.setKeys) t.setKeys(["KeyW"]);
});
await page.waitForTimeout(500);
await captureShot(page, "artifacts/bball/tour_red-dribble.png");
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.evaluate(() => window.__gameTest.beginCharge());
await page.waitForTimeout(500);
await captureShot(page, "artifacts/bball/tour_red-gather.png");
await page.evaluate(() => window.__gameTest.releaseShot());
await page.waitForTimeout(180);
await captureShot(page, "artifacts/bball/ball-leaving.png");
await page.waitForTimeout(700);
await captureShot(page, "artifacts/bball/ball-flight.png");

const state = await page.evaluate(() => window.__gameTest.getState());
console.log("STATE", JSON.stringify({ mode: state.mode, equipped: state.equipped, score: state.score, owned: state.owned }));

await closeBrowser(browser);
console.log("bball qa shots written to artifacts/bball/");
