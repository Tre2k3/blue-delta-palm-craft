#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { captureShot, closeBrowser, createOk, installHardTimeout, launchBrowser, preparePage } from "./smoke-lib.mjs";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const failures = [];
const pageErrors = [];
const ok = createOk(failures);
const clearHardTimeout = installHardTimeout("Game smoke");

const browser = await launchBrowser(true);
await mkdir("artifacts", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(20000);
page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
await preparePage(page);

try {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok((resp?.status() ?? 0) < 400, "production preview returns OK", { status: resp?.status() });

  await page.waitForSelector("button:has-text('ENTER MEMPHIS')", { timeout: 30000 });
  await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
  await page.waitForFunction(
    () => window.__gameTest && window.__controlsTest && window.__gameTest.furnitureCollisionProbe && window.__gameTest.environmentCollisionProbe && window.__SACK_ENVIRONMENT__,
    { timeout: 20000 },
  );
  await page.waitForTimeout(4200);

  const boot = await page.evaluate(() => {
    const s = window.__gameTest.getState();
    return { title: document.title, hasCanvas: !!document.querySelector("canvas"), mode: s.mode, facing: s.facing };
  });
  ok(!!boot.title, "document title is present", boot);
  ok(boot.hasCanvas, "game canvas is mounted", boot);
  ok(!!boot.mode, "game test hook reports a mode", boot);

  const furniture = await page.evaluate(() => window.__gameTest.furnitureCollisionProbe());
  ok(furniture.bed === true, "apartment bed is physically solid", furniture);
  ok(furniture.hqCounter === true, "HQ checkout counter is physically solid", furniture);
  ok(furniture.apartmentDoorLane === false, "apartment doorway remains walkable", furniture);
  ok(furniture.hqDoorLane === false, "HQ doorway remains walkable", furniture);

  const environment = await page.evaluate(() => ({
    visuals: window.__SACK_ENVIRONMENT__,
    collision: window.__gameTest.environmentCollisionProbe(),
  }));
  ok(environment.visuals?.river === true, "Mississippi River is rendered as a real world feature", environment);
  ok(environment.visuals?.riverRailing === true, "riverfront has a boardwalk railing", environment);
  ok(environment.visuals?.streetFurniture === true, "Memphis street furniture pass is active", environment);
  ok(environment.collision?.riverWater === true, "Benji cannot walk out onto the river water", environment);
  ok(environment.collision?.riverBoardwalk === false, "riverfront boardwalk remains walkable", environment);
  await captureShot(page, "artifacts/game-smoke-boot.png");

  // Test the real controller from Benji's playable home spawn. The old test
  // teleported him to the curb outside HQ, where a live traffic car could
  // legitimately block the movement probe and create a false failure.
  await page.evaluate(() => window.__gameTest.resetSave());
  await page.waitForTimeout(180);
  const before = await page.evaluate(() => window.__gameTest.getState());
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(700);
  const moving = await page.evaluate(() => window.__gameTest.getState());
  await page.keyboard.up("KeyD");
  ok(
    Math.abs(moving.px - before.px) > 2 || Math.abs(moving.py - before.py) > 2 || Math.abs(moving.vx) > 1 || Math.abs(moving.vy) > 1,
    "movement keys change Benji position",
    { before, moving },
  );

  await page.evaluate(() => window.__gameTest.teleport("court"));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__gameTest.interact());
  await page.waitForTimeout(300);
  const court = await page.evaluate(() => window.__gameTest.getState());
  ok(court.mode === "basketball", "court interact enters basketball", court);
  const leave = page.getByRole("button", { name: /Leave court/i });
  if (await leave.count()) await leave.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  await captureShot(page, "artifacts/game-smoke-court.png");

  ok(pageErrors.length === 0, "no uncaught page errors", pageErrors);
} catch (err) {
  failures.push(err?.stack || String(err));
  console.error(err);
} finally {
  await closeBrowser(browser);
  clearHardTimeout();
}

if (failures.length) {
  console.error(`\nGame smoke failed (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nGame smoke passed.");
