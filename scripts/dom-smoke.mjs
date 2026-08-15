#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.GAME_URL || "http://127.0.0.1:8080";
const failures = [];
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

function check(ok, msg, detail) {
  if (ok) console.log(`PASS: ${msg}`);
  else { console.error(`FAIL: ${msg}${detail ? ` :: ${JSON.stringify(detail)}` : ""}`); failures.push(msg); }
}
async function characterInfo(selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel); if (!el) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display:cs.display, visibility:cs.visibility, opacity:cs.opacity, backgroundImage:cs.backgroundImage, width:r.width, height:r.height, left:r.left, top:r.top, right:r.right, bottom:r.bottom, zIndex:cs.zIndex, viewport:{w:innerWidth,h:innerHeight} };
  }, selector);
}
async function bestEffortWait(fn, arg, timeout) {
  try { await page.waitForFunction(fn, arg, { timeout }); return true; }
  catch (err) { console.warn(`Best-effort visual wait timed out after ${timeout}ms: ${err?.message || err}`); return false; }
}

try {
  await mkdir("artifacts", { recursive: true });
  await page.goto(baseURL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V8_ENGINE__ && window.__SACK_V8_BOOT__?.installed, null, { timeout: 30000 });
  await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; e.start(true); e.cinematic=null; e.letterbox=0; e.input.keys.clear(); e.emitHud?.(); });
  await page.waitForFunction(() => window.__SACK_CHARACTER_DOM_V8__?.playerDisplay === "block", null, { timeout: 15000 });

  let info = await characterInfo('[data-sack-character-v8="benji"]');
  check(!!info, "Benji DOM actor exists", info);
  check(info?.display === "block", "Benji DOM actor is displayed", info);
  check((info?.width || 0) > 25 && (info?.height || 0) > 45, "Benji DOM actor has visible size", info);
  check(info?.backgroundImage?.includes("benji_") || info?.backgroundImage?.includes("data:image/webp"), "Benji uses illustrated/wardrobe sprite art", info);
  check(info && info.right > 0 && info.left < info.viewport.w && info.bottom > 0 && info.top < info.viewport.h, "Benji intersects the viewport", info);
  await page.screenshot({ path: "artifacts/v8-dom-apartment.png", fullPage: true });

  for (const [key, expected] of [["a","left"],["d","right"],["w","up"],["s","down"]]) {
    await page.keyboard.down(key);
    const passed = await bestEffortWait((want) => window.__SACK_V8_ENGINE__.facing === want, expected, 8000);
    const state = await page.evaluate(() => ({ facing:window.__SACK_V8_ENGINE__.facing, diag:window.__SACK_INPUT_V8__ || null }));
    await page.keyboard.up(key); await page.waitForTimeout(80);
    check(passed && state.facing === expected, `${key.toUpperCase()} physical key faces ${expected}`, state);
  }

  await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; e.py=-3200+86-18; e.updateProximity?.(); e.tryInteract(); });
  await bestEffortWait(() => (window.__SACK_CHARACTER_DOM_V8__?.pedsVisible || 0) > 0, null, 12000);
  let dom = await page.evaluate(() => window.__SACK_CHARACTER_DOM_V8__ || null);
  check((dom?.pedsVisible || 0) > 0, "Memphis pedestrian skins are projected outside", dom);
  const ped = await characterInfo('[data-sack-character-v8="memphis-ped"]');
  check(ped?.backgroundImage?.includes("memphis_npc"), "Pedestrian uses character-map-derived sprite art", ped);
  await page.screenshot({ path: "artifacts/v8-dom-street.png", fullPage: true });

  await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; window.__gameTest.teleport("store"); e.updateProximity?.(); e.tryInteract(); });
  await bestEffortWait(() => window.__SACK_HQ_V8__?.inHQ && window.__SACK_CHARACTER_DOM_V8__?.hqKVisible, null, 12000);
  const hq = await page.evaluate(() => ({ hq:window.__SACK_HQ_V8__||null, dom:window.__SACK_CHARACTER_DOM_V8__||null }));
  check(hq?.hq?.inHQ === true, "HQ visual state is active", hq);
  const k = await characterInfo('[data-sack-character-v8="k-blanco-hq"]');
  check(k?.display === "block" && k?.backgroundImage?.includes("k_blanco"), "K Blanco is visibly present inside HQ", {k,hq});
  await page.screenshot({ path: "artifacts/v8-dom-hq.png", fullPage: true });

  await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; e.mode="world"; e.__v8Interior=null; e.__v8DialogueReturn=null; e.__v8ShopReturn=null; e.enterBasketball(); });
  await bestEffortWait(() => (window.__SACK_CHARACTER_DOM_V8__?.gymVisible || 0) >= 6, null, 15000);
  dom = await page.evaluate(() => window.__SACK_CHARACTER_DOM_V8__ || null);
  check((dom?.gymVisible || 0) >= 6, "Six illustrated Sackrow court actors are visible", dom);
  await page.screenshot({ path: "artifacts/v8-dom-gym.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await bestEffortWait(() => document.querySelector('[data-sack-character-v8="benji"]')?.style.display !== "none", null, 8000);
  info = await characterInfo('[data-sack-character-v8="benji"]');
  check(info?.display === "block" && info.right > 0 && info.left < 390 && info.bottom > 0 && info.top < 844, "Benji remains visible on mobile viewport", info);
  await page.screenshot({ path: "artifacts/v8-mobile.png", fullPage: true });
} catch (err) {
  console.error(err); failures.push(err?.message || String(err));
} finally { await browser.close(); }

if (failures.length) { console.error(`DOM visual smoke failed: ${failures.join("; ")}`); process.exit(1); }
console.log("V8 DOM visual smoke passed.");
