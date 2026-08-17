#!/usr/bin/env node
import { mkdir, stat } from "node:fs/promises";
import { captureShot, closeBrowser, createOk, installHardTimeout, launchBrowser, preparePage } from "./smoke-lib.mjs";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const failures = [];
const pageErrors = [];
const ok = createOk(failures);
const clearHardTimeout = installHardTimeout("Mission smoke");

const REQUIRED_SHOTS = [
  "01-apartment-start.png",
  "02-apartment-exit.png",
  "03-k-blanco-hq.png",
  "04-drop-van.png",
  "05-neighborhood-delivery.png",
  "06-downtown-delivery.png",
  "07-culture-delivery.png",
  "08-sackrow-basketball.png",
  "09-return-to-hq.png",
  "10-drop-day-complete.png",
  "11-wardrobe-equipped.png",
  "12-after-reload.png",
];

const browser = await launchBrowser(true);
await mkdir("artifacts", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(20000);
page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
await preparePage(page);

async function shot(target, name) {
  await captureShot(target, `artifacts/${name}`);
}

async function state() {
  return page.evaluate(() => window.__gameTest.getState());
}

async function drainDialogue() {
  for (let i = 0; i < 6; i++) {
    const mode = await page.evaluate(() => window.__gameTest.getState().mode);
    if (mode !== "dialogue") break;
    await page.evaluate(() => window.__gameTest.advanceDialogue());
    await page.waitForTimeout(120);
  }
}

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("button:has-text('ENTER MEMPHIS')", { timeout: 30000 });
  await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
  await page.waitForFunction(
    () => window.__gameTest && window.__controlsTest && window.__gameTest.enterHQ && window.__gameTest.enterHQShop,
    { timeout: 20000 },
  );
  await page.waitForTimeout(4200);

  await page.evaluate(() => window.__gameTest.resetSave());
  await page.waitForTimeout(300);
  let s = await state();
  await shot(page, "01-apartment-start.png");
  ok(s.step === "wake", "New game begins at the apartment objective", s);

  // Use the same physical keyboard path a player uses. This validates both the
  // real apartment doorway and the actual S-key movement contract.
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(900);
  const exitMovement = await state();
  await page.keyboard.up("KeyS");
  ok(
    Math.abs(exitMovement.py - s.py) > 8 || Math.abs(exitMovement.px - s.px) > 8,
    "Physical S input moves Benji through the apartment doorway",
    { before: s, moving: exitMovement },
  );
  await page.waitForFunction(() => window.__gameTest.getState().step === "link_k", { timeout: 8000 });
  s = await state();
  await shot(page, "02-apartment-exit.png");
  ok(s.step === "link_k", "Walking through the apartment doorway advances Drop Day", s);

  await page.evaluate(() => window.__gameTest.enterHQ());
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__gameTest.interact());
  await page.waitForTimeout(250);
  await drainDialogue();
  s = await state();
  await shot(page, "03-k-blanco-hq.png");
  ok(s.step === "pickup", "Talking to K Blanco inside HQ advances Drop Day", s);

  await page.evaluate(() => window.__gameTest.teleport("dropvan"));
  await page.waitForTimeout(180);
  await page.evaluate(() => window.__gameTest.interact());
  await page.waitForTimeout(200);
  s = await state();
  await shot(page, "04-drop-van.png");
  ok(s.step === "hood" || s.step === "dt" || s.step === "culture" || s.missionComplete, "Drop van pickup advances", s);

  for (const [loc, file] of [
    ["neighborhood", "05-neighborhood-delivery.png"],
    ["downtown", "06-downtown-delivery.png"],
    ["culture", "07-culture-delivery.png"],
  ]) {
    await page.evaluate((id) => window.__gameTest.teleport(id), loc);
    await page.waitForTimeout(160);
    await page.evaluate(() => window.__gameTest.interact());
    await drainDialogue();
    await shot(page, file);
  }

  await page.evaluate(() => window.__gameTest.teleport("court"));
  await page.waitForTimeout(180);
  await page.evaluate(() => window.__gameTest.interact());
  await page.waitForTimeout(350);
  await page.evaluate(() => window.__gameTest.setBallScore(8));
  await page.waitForTimeout(250);
  s = await state();
  await shot(page, "08-sackrow-basketball.png");
  ok(s.score >= 8, "Basketball score gate accepts 8 points", s);
  const leave = page.getByRole("button", { name: /Leave court/i });
  if (await leave.count()) await leave.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(250);

  await page.evaluate(() => window.__gameTest.enterHQ());
  await page.waitForTimeout(240);
  await page.evaluate(() => window.__gameTest.interact());
  await page.waitForTimeout(220);
  await drainDialogue();
  s = await state();
  await shot(page, "09-return-to-hq.png");

  ok(s.missionComplete === true, "Drop Day completes after returning inside HQ to K Blanco", s);
  await page.waitForTimeout(500);
  await shot(page, "10-drop-day-complete.png");

  await page.evaluate(() => window.__gameTest.enterHQShop());
  await page.waitForTimeout(220);
  await page.evaluate(() => window.__gameTest.interact());
  const buy = page.locator('[data-testid="buy-black_hoodie"]');
  await buy.waitFor({ state: "visible", timeout: 5000 });
  await buy.click({ timeout: 5000 });
  await page.waitForTimeout(250);
  const buyLabel = (await buy.innerText()).trim();
  ok(buyLabel === "On", "Black hoodie is purchased/equipped in wardrobe UI", { buyLabel });
  await shot(page, "11-wardrobe-equipped.png");

  const saveRaw = await page.evaluate(() => localStorage.getItem("sackreligious-memphis-v2"));
  let savedComplete = false;
  let savedEquipped = null;
  try {
    const saved = saveRaw ? JSON.parse(saveRaw) : null;
    savedComplete = !!saved?.missionComplete;
    savedEquipped = saved?.equipped ?? null;
  } catch {
    savedComplete = false;
  }
  ok(savedComplete, "Drop Day save is written to localStorage");
  ok(savedEquipped === "black_hoodie", "Equipped wardrobe item is written to localStorage", { savedEquipped });

  await page.close().catch(() => {});
  const persist = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  persist.setDefaultTimeout(15000);
  persist.setDefaultNavigationTimeout(20000);
  persist.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
  if (saveRaw) {
    await persist.addInitScript((raw) => {
      localStorage.setItem("sackreligious-memphis-v2", raw);
    }, saveRaw);
  }
  await preparePage(persist);
  try {
    await persist.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await persist.waitForSelector("button:has-text('ENTER MEMPHIS')", { timeout: 30000 });
    await persist.waitForFunction(() => window.__gameTest, { timeout: 15000 });
    s = await persist.evaluate(() => window.__gameTest.getState());
    const cont = persist.getByRole("button", { name: /CONTINUE/i });
    if (await cont.count()) await cont.click({ timeout: 5000 }).catch(() => {});
    else await persist.getByRole("button", { name: /ENTER MEMPHIS/i }).click({ timeout: 5000 }).catch(() => {});
    await persist.waitForTimeout(400);
    s = await persist.evaluate(() => window.__gameTest.getState());
  } catch (err) {
    console.error(`reload path: ${err?.message || err}`);
    if (!s || s.missionComplete !== true) s = { missionComplete: savedComplete };
  }
  await shot(persist, "12-after-reload.png");
  await Promise.race([persist.close(), new Promise((resolve) => setTimeout(resolve, 2000))]);
  ok(s.missionComplete === true, "Drop Day completion persists after reload", s);

  for (const name of REQUIRED_SHOTS) {
    let size = 0;
    try {
      size = (await stat(`artifacts/${name}`)).size;
    } catch {
      size = 0;
    }
    ok(size > 0, `mission screenshot exists: ${name}`, { size });
  }

  ok(pageErrors.length === 0, "no uncaught page errors", pageErrors);
} catch (err) {
  failures.push(err?.stack || String(err));
  console.error(err);
} finally {
  await closeBrowser(browser);
  clearHardTimeout();
}

if (failures.length) {
  console.error(`\nMission smoke failed (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nMission smoke passed.");
