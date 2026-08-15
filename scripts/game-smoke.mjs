#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.GAME_URL || "http://127.0.0.1:8080";
const failures = [];
const logs = [];
function assert(cond, message, detail) {
  if (!cond) { failures.push(message); console.error(`FAIL: ${message}${detail ? ` :: ${JSON.stringify(detail)}` : ""}`); }
  else console.log(`PASS: ${message}`);
}

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => logs.push(`[console:${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.stack || err.message}`));

try {
  await page.goto(baseURL, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(() => window.__gameTest && window.__SACK_V8_GUARD_BOOT__?.installed, null, { timeout: 30_000 });
  await page.waitForFunction(() => !!window.__SACK_V8_ENGINE__, null, { timeout: 15_000 });

  let boot = await page.evaluate(() => ({ v8: window.__SACK_V8_BOOT__, guard: window.__SACK_V8_GUARD_BOOT__ }));
  assert(boot.v8?.installed === true, "V8 runtime booted", boot);
  assert(boot.guard?.installed === true, "V8 diagnostic guard booted", boot);

  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.start(true); e.cinematic = null; e.letterbox = 0; e.input.keys.clear(); e.updateProximity?.(); e.emitHud?.();
  });
  await page.waitForFunction(() => window.__SACK_CHARACTER_DOM_V8__?.installed, null, { timeout: 15_000 });
  await page.waitForFunction(() => window.__SACK_CHARACTER_DOM_V8__?.playerDisplay === "block", null, { timeout: 15_000 });

  let state = await page.evaluate(() => ({
    mode: window.__SACK_V8_ENGINE__.mode,
    interior: window.__SACK_V8_ENGINE__.__v8Interior,
    dom: window.__SACK_CHARACTER_DOM_V8__,
  }));
  assert(state.mode === "interior", "new game begins in an interior", state);
  assert(state.interior === "apartment", "new game begins inside Benji's apartment", state);
  assert(state.dom?.playerDisplay === "block", "Benji final 2.5D actor is visible", state.dom);
  await page.screenshot({ path: "artifacts/v8-apartment.png", fullPage: true });

  // Headless SwiftShader can run below 5 FPS. Hold each real key until the game
  // processes a frame rather than assuming a 220 ms timer is enough.
  for (const [code, label, expected] of [
    ["KeyA", "A", "left"], ["KeyD", "D", "right"], ["KeyW", "W", "up"], ["KeyS", "S", "down"],
  ]) {
    await page.evaluate((c) => { const e = window.__SACK_V8_ENGINE__; e.input.keys.clear(); e.input.keys.add(c); }, code);
    let passed = true;
    try { await page.waitForFunction((want) => window.__SACK_V8_ENGINE__.facing === want, expected, { timeout: 8_000 }); }
    catch { passed = false; }
    const facing = await page.evaluate(() => ({ facing: window.__SACK_V8_ENGINE__.facing, diag: window.__SACK_INPUT_V8__ || null }));
    await page.evaluate(() => window.__SACK_V8_ENGINE__.input.keys.clear());
    assert(passed && facing.facing === expected, `${label} faces ${expected}`, facing);
  }

  await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; e.py=-3200+86-18; e.updateProximity?.(); e.tryInteract(); });
  await page.waitForFunction(() => window.__SACK_V8_ENGINE__.mode === "world", null, { timeout: 8_000 });
  await page.waitForFunction(() => (window.__SACK_CHARACTER_DOM_V8__?.pedsVisible || 0) > 0, null, { timeout: 12_000 });
  state = await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; return { mode:e.mode, step:e.mission.steps[e.mission.activeStep]?.id, wake:e.mission.steps.find(s=>s.id==="wake")?.done, dom:window.__SACK_CHARACTER_DOM_V8__ }; });
  assert(state.mode === "world", "apartment exit returns to Memphis world", state);
  assert(state.wake === true, "leaving apartment completes wake objective", state);
  assert(state.step === "link_k", "next objective is Link up with K Blanco", state);
  assert((state.dom?.pedsVisible || 0) > 0, "illustrated Memphis pedestrians are visible", state.dom);

  await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; window.__gameTest.teleport("store"); e.cinematic=null; e.updateProximity?.(); e.tryInteract(); });
  await page.waitForFunction(() => window.__SACK_V8_ENGINE__.__v8Interior === "hq", null, { timeout: 8_000 });
  state = await page.evaluate(() => ({ mode:window.__SACK_V8_ENGINE__.mode, interior:window.__SACK_V8_ENGINE__.__v8Interior }));
  assert(state.mode === "interior" && state.interior === "hq", "SackReligious HQ is enterable", state);
  await page.screenshot({ path: "artifacts/v8-hq.png", fullPage: true });

  await page.evaluate(() => {
    const e=window.__SACK_V8_ENGINE__; e.mode="world"; e.__v8Interior=null; e.cinematic=null; e.enterBasketball();
    const r=Math.random; Math.random=()=>0.5; e.beginCharge(); e.ball.power=.65; e.releaseShot(); Math.random=r;
  });
  await page.waitForFunction(() => window.__SACK_V8_ENGINE__.ball.inFlight === true, null, { timeout: 6_000 });
  state = await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; return {mode:e.mode,shots:e.ball.shots,inFlight:e.ball.inFlight,grade:e.ball.grade}; });
  assert(state.mode === "basketball", "basketball enters Sackrow gameplay mode", state);
  assert(state.shots === 1 && state.inFlight, "release creates a real shot in flight", state);
  assert(state.grade === "PERFECT", "0.65 release is a PERFECT timing shot", state);
  await page.waitForFunction(() => window.__SACK_V8_ENGINE__.ball.score >= 2, null, { timeout: 8_000 });
  await page.waitForFunction(() => window.__SACK_V8_ENGINE__.ball.held && !window.__SACK_V8_ENGINE__.ball.inFlight, null, { timeout: 8_000 });
  await page.waitForFunction(() => (window.__SACK_CHARACTER_DOM_V8__?.gymVisible || 0) >= 6, null, { timeout: 12_000 });
  state = await page.evaluate(() => ({ score:window.__SACK_V8_ENGINE__.ball.score, held:window.__SACK_V8_ENGINE__.ball.held, inFlight:window.__SACK_V8_ENGINE__.ball.inFlight, dom:window.__SACK_CHARACTER_DOM_V8__, diag:window.__SACK_BBALL_V8__ }));
  assert(state.score >= 2, "PERFECT shot scores", state);
  assert(state.held && !state.inFlight, "ball resets to the next possession", state);
  assert((state.dom?.gymVisible || 0) >= 6, "Sackrow gym has six illustrated actors", state.dom);
  await page.screenshot({ path: "artifacts/v8-sackrow-gym.png", fullPage: true });

  await page.evaluate(() => { const e=window.__SACK_V8_ENGINE__; e.exitBasketball(); window.__gameTest.teleport("neighborhood"); });
  await page.waitForTimeout(500);
  const blanks = await page.evaluate(() => [...(window.__SACK_V8_ENGINE__.world3d?.npcSprites?.values?.() || [])].filter(x=>x?.visible).length);
  assert(blanks === 0, "legacy blank NPC cards are hidden", { blanks });
  const runtimeErrors = await page.evaluate(() => window.__SACK_RUNTIME_ERRORS__ || []);
  assert(runtimeErrors.length === 0, "runtime watchdog captured no uncaught game errors", runtimeErrors);
} catch (err) {
  failures.push(err?.stack || String(err)); console.error(err);
} finally {
  if (logs.length) { console.log("\n--- Browser log ---"); for (const line of logs.slice(-100)) console.log(line); }
  await browser.close();
}
if (failures.length) { console.error(`\n${failures.length} smoke-test failure(s):`); failures.forEach((f,i)=>console.error(`${i+1}. ${f}`)); process.exit(1); }
console.log("\nV8 gameplay smoke test passed.");
