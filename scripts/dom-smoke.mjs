#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { captureShot, closeBrowser, createOk, installHardTimeout, launchBrowser, preparePage } from "./smoke-lib.mjs";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const failures = [];
const pageErrors = [];
const ok = createOk(failures);
const clearHardTimeout = installHardTimeout("DOM visual smoke");

const browser = await launchBrowser(false);
await mkdir("artifacts", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(20000);
page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
await preparePage(page);

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  const title = await page.title();
  const body = (await page.locator("body").innerText()).trim();
  ok(title.length > 0, "title screen has a document title", { title });
  ok(/ENTER MEMPHIS|Memphis|SackReligious|\$ack/i.test(body), "title screen shows brand copy", {
    sample: body.slice(0, 180),
  });
  await captureShot(page, "artifacts/dom-title.png");

  await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
  await page.waitForFunction(() => window.__gameTest, { timeout: 20000 });
  await page.waitForTimeout(4200);

  const play = await page.evaluate(() => ({
    canvas: document.querySelector("canvas")?.getBoundingClientRect() || null,
    text: document.body.innerText.slice(0, 400),
  }));
  ok(!!play.canvas && play.canvas.width > 100 && play.canvas.height > 100, "play view has a visible canvas", play.canvas);
  ok(/\$ack|WASD|MEMPHIS|901|RESPECT/i.test(play.text), "play view HUD text is visible", {
    sample: play.text.slice(0, 180),
  });
  await captureShot(page, "artifacts/dom-desktop.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    canvas: document.querySelector("canvas")?.getBoundingClientRect() || null,
    text: document.body.innerText.slice(0, 240),
  }));
  ok(mobile.overflow < 8, "mobile width has no meaningful horizontal overflow", mobile);
  ok(!!mobile.canvas && mobile.canvas.width > 80, "canvas remains visible on mobile", mobile.canvas);
  await captureShot(page, "artifacts/dom-mobile.png");

  ok(pageErrors.length === 0, "no uncaught page errors", pageErrors);
} catch (err) {
  failures.push(err?.stack || String(err));
  console.error(err);
} finally {
  await closeBrowser(browser);
  clearHardTimeout();
}

if (failures.length) {
  console.error(`\nDOM visual smoke failed (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nDOM visual smoke passed.");
