#!/usr/bin/env node
import { chromium } from "playwright";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
await page.waitForFunction(() => window.__gameTest, { timeout: 20000 });
await page.waitForTimeout(400);

await page.evaluate(() => window.__gameTest.resetSave());
await page.waitForTimeout(150);
await page.evaluate(() => window.__gameTest.teleport("store"));
await page.waitForFunction(() => window.__gameTest.getState().step !== "wake", { timeout: 8000 });

const afterWake = await page.evaluate(() => window.__gameTest.getState());
const dollarsAfterWake = afterWake.sackdollars;

const saveDump = await page.evaluate(() => {
  const raw = localStorage.getItem("sackreligious-memphis-v3");
  return raw ? JSON.parse(raw) : null;
});

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const cont = page.getByRole("button", { name: /CONTINUE/i });
if (await cont.count()) await cont.click();
else await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
await page.waitForFunction(() => window.__gameTest, { timeout: 20000 });
await page.waitForTimeout(600);
const afterReload = await page.evaluate(() => window.__gameTest.getState());

await page.evaluate(() => window.__gameTest.teleport("store"));
await page.waitForTimeout(400);
const afterSecondLeave = await page.evaluate(() => window.__gameTest.getState());

const pageErrors = errors.filter((e) => !/status of 404/.test(e) && !/Failed to load resource/.test(e));
const ok =
  afterWake.step !== "wake" &&
  saveDump?.version === 3 &&
  afterReload.sackdollars === dollarsAfterWake &&
  afterSecondLeave.sackdollars === dollarsAfterWake &&
  pageErrors.length === 0;

console.log(
  "SAVE",
  JSON.stringify({
    afterWake,
    dollarsAfterWake,
    version: saveDump?.version,
    afterReload,
    afterSecondLeave,
    errors: pageErrors,
  }),
);
console.log("SUCCESS:", ok);
await browser.close();
process.exit(ok ? 0 : 1);
