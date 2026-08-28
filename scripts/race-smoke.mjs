import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
await page.waitForFunction(() => window.__gameTest?.startRace, { timeout: 20000 });
await page.evaluate(() => window.__gameTest.resetSave());
await page.waitForTimeout(250);

await page.evaluate(() => window.__gameTest.startRace(false));
await page.waitForFunction(() => window.__gameTest.getState().racePhase === "countdown", { timeout: 8000 });
await page.screenshot({ path: "screenshots/race-countdown.png" });

await page.waitForFunction(() => window.__gameTest.getState().racePhase === "green", { timeout: 8000 });
const green = await page.evaluate(() => window.__gameTest.getState());
if (!green.driving) throw new Error("expected driving on green");
if (!green.raceActive) throw new Error("expected race active");
const rivalStart = { x: green.rivalX, y: green.rivalY };

await page.waitForTimeout(1400);
const mid = await page.evaluate(() => window.__gameTest.getState());
await page.screenshot({ path: "screenshots/race-green.png" });

const moved = Math.hypot((mid.px ?? 0) - (green.px ?? 0), (mid.py ?? 0) - (green.py ?? 0));
const camMoved = Math.hypot((mid.rivalX ?? 0) - (rivalStart.x ?? 0), (mid.rivalY ?? 0) - (rivalStart.y ?? 0));
if (moved < 40) throw new Error(`Benji did not roll (${moved.toFixed(1)}px)`);
if (camMoved < 40) throw new Error(`Cam did not roll (${camMoved.toFixed(1)}px)`);

await page.evaluate(() => window.__gameTest.completeRace(true));
await page.waitForTimeout(400);
await page.screenshot({ path: "screenshots/race-win.png" });
const recap = await page.getByText(/YOU TOOK THE LOOP|1ST/i);
if (!(await recap.count())) throw new Error("missing win recap");
const trophies = await page.evaluate(() => {
  const root = document.body.innerText;
  return root.includes("Strip King") || root.includes("YOU BEAT CAM") || root.includes("1ST");
});
if (!trophies) throw new Error("win recap text missing");

await page.getByRole("button", { name: /Keep roaming/i }).click();
await page.waitForTimeout(300);
const after = await page.evaluate(() => window.__gameTest.getState());
if (after.raceActive) throw new Error("race still active after dismiss");

console.log(JSON.stringify({
  ok: true,
  moved,
  camMoved,
  place: mid.racePlace,
  errors: errors.filter((e) => !/favicon|404/.test(e)).slice(0, 8),
}, null, 2));
await browser.close();
if (errors.filter((e) => !/favicon|404|Failed to load/.test(e)).length) process.exit(1);
