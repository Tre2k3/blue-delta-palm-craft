#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { captureShot, enterGame, closeBrowser, createOk, installHardTimeout, launchBrowser, preparePage } from "./smoke-lib.mjs";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const failures = [];
const pageErrors = [];
const ok = createOk(failures);
const clearHardTimeout = installHardTimeout("Traffic smoke");

const browser = await launchBrowser(true);
await mkdir("artifacts", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(20000);
page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
await preparePage(page);

try {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok((resp?.status() ?? 0) < 400, "production preview returns OK", { status: resp?.status() });

  await enterGame(page, url);
  await page.waitForTimeout(2500);

  const initial = await page.evaluate(() => window.__SACK_TRAFFIC__);
  ok(initial?.cars >= 20, "city has a real traffic population", initial);
  ok(initial?.lanes >= 10, "cars are constrained to authored road lanes", initial);
  ok(initial?.signals >= 12, "street intersections have live traffic signals", initial);
  ok(initial?.turningEnabled === true, "traffic route changes are enabled", initial);
  ok(initial?.offLaneCars === 0, "traffic starts on legal lanes", initial);
  ok(initial?.courtTrafficProtected === true, "901 Court has a traffic exclusion zone", initial);
  ok(initial?.carsOnCourt === 0, "moving cars do not spawn or drive on 901 Court", initial);
  ok(initial?.carsOnBlockedLane === 0, "court-crossing traffic lanes are rerouted", initial);
  ok((initial?.markers ?? 0) >= 8, "landmarks and Sackrow have readable world signage", initial);
  ok((initial?.parkedCars ?? 0) >= 10, "city includes parked vehicles in addition to moving traffic", initial);
  ok(initial?.vehicle3D === true, "moving traffic uses 3D vehicle rigs instead of flat cross-cards", initial);
  ok((initial?.vehicleRigCount ?? 0) >= 20, "the visible traffic population has 3D bodies and wheels", initial);

  await page.evaluate(() => window.__gameTest.teleport("downtown"));
  await page.waitForTimeout(700);
  await captureShot(page, "artifacts/traffic-street-life.png");

  let maxTurns = initial?.totalTurns ?? 0;
  let maxStopped = initial?.stoppedAtRed ?? 0;
  let maxPedPauses = initial?.pedestrianPauses ?? 0;
  let worstOffLane = initial?.offLaneCars ?? 0;
  let worstCarsOnCourt = initial?.carsOnCourt ?? 0;
  let worstBlockedLane = initial?.carsOnBlockedLane ?? 0;
  for (let i = 0; i < 60; i++) {
    await page.evaluate(() => { const e = window.__sack; e.running = false; cancelAnimationFrame(e.raf); clearTimeout(e.loopBackup); for (let n = 0; n < 60; n++) e.update(1 / 60); e.draw(); });
    const state = await page.evaluate(() => window.__SACK_TRAFFIC__);
    maxTurns = Math.max(maxTurns, state?.totalTurns ?? 0);
    maxStopped = Math.max(maxStopped, state?.stoppedAtRed ?? 0);
    maxPedPauses = Math.max(maxPedPauses, state?.pedestrianPauses ?? 0);
    worstOffLane = Math.max(worstOffLane, state?.offLaneCars ?? 0);
    worstCarsOnCourt = Math.max(worstCarsOnCourt, state?.carsOnCourt ?? 0);
    worstBlockedLane = Math.max(worstBlockedLane, state?.carsOnBlockedLane ?? 0);
  }

  const final = await page.evaluate(() => window.__SACK_TRAFFIC__);
  ok(maxTurns > 0, "traffic makes controlled turns instead of looping one straight rail forever", { maxTurns, final });
  ok(maxStopped > 0, "at least one car obeys a red light during the sample", { maxStopped, final });
  console.log(`INFO: ambient pedestrian pauses observed: ${maxPedPauses}`);
  ok(worstOffLane === 0, "route changes keep cars on legal road lanes", { worstOffLane, final });
  ok(worstCarsOnCourt === 0, "traffic stays off 901 Court for the full sample", { worstCarsOnCourt, final });
  ok(worstBlockedLane === 0, "no car re-enters a court-crossing lane after turns", { worstBlockedLane, final });
  ok(pageErrors.length === 0, "traffic pass produces no uncaught page errors", pageErrors);
} catch (err) {
  failures.push(err?.stack || String(err));
  console.error(err);
} finally {
  await closeBrowser(browser);
  clearHardTimeout();
}

if (failures.length) {
  console.error(`\nTraffic smoke failed (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nTraffic smoke passed.");
