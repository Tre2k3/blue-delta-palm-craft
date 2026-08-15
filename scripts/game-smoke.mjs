#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.GAME_URL || "http://127.0.0.1:8080";
const failures = [];
const logs = [];

function assert(cond, message) {
  if (!cond) {
    failures.push(message);
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => logs.push(`[console:${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.stack || err.message}`));

try {
  await page.goto(baseURL, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(
    () => window.__gameTest && window.__SACK_V8_GUARD_BOOT__?.installed,
    null,
    { timeout: 30_000 },
  );
  await page.waitForFunction(() => !!window.__SACK_V8_ENGINE__, null, { timeout: 15_000 });

  const boot = await page.evaluate(() => ({
    v8: window.__SACK_V8_BOOT__ || null,
    guard: window.__SACK_V8_GUARD_BOOT__ || null,
  }));
  assert(boot.v8?.installed === true, "V8 runtime booted");
  assert(boot.guard?.installed === true, "V8 diagnostic guard booted");

  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.start(true);
    e.cinematic = null;
    e.letterbox = 0;
    e.input?.keys?.clear?.();
    e.updateProximity?.();
    e.emitHud?.();
  });
  await page.waitForTimeout(900);

  let state = await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    const w = e.world3d;
    let ndc = null;
    if (w?.sprite && w?.camera) {
      const Vec3 = w.camera.position.constructor;
      const v = new Vec3();
      w.sprite.getWorldPosition(v);
      v.project(w.camera);
      ndc = { x: v.x, y: v.y, z: v.z };
    }
    const image = w?.sprite?.material?.map?.image;
    return {
      mode: e.mode,
      interior: e.__v8Interior,
      visible: w?.sprite?.visible,
      ndc,
      spriteTexture: image ? {
        width: image.width || image.naturalWidth || 0,
        height: image.height || image.naturalHeight || 0,
      } : null,
    };
  });
  assert(state.mode === "interior", "new game begins in an interior");
  assert(state.interior === "apartment", "new game begins inside Benji's apartment");
  assert(state.visible === true, "Benji sprite is enabled in third person");
  assert(
    !!state.spriteTexture && state.spriteTexture.width > 0 && state.spriteTexture.height > 0,
    "Benji has a loaded visible sprite texture",
  );
  assert(
    !!state.ndc && Math.abs(state.ndc.x) <= 1 && Math.abs(state.ndc.y) <= 1 && state.ndc.z >= -1 && state.ndc.z <= 1,
    "Benji projects inside the active camera viewport",
  );
  await page.screenshot({ path: "artifacts/v8-apartment.png", fullPage: true });

  // Direction contract. Manipulate the engine's real InputManager key set so
  // the check is deterministic in headless CI and still exercises poll/update.
  for (const [code, label, expected] of [
    ["KeyA", "A", "left"],
    ["KeyD", "D", "right"],
    ["KeyW", "W", "up"],
    ["KeyS", "S", "down"],
  ]) {
    await page.evaluate((nextCode) => {
      const e = window.__SACK_V8_ENGINE__;
      e.input.keys.clear();
      e.input.keys.add(nextCode);
    }, code);
    await page.waitForTimeout(220);
    const facing = await page.evaluate(() => window.__SACK_V8_ENGINE__.facing);
    await page.evaluate(() => window.__SACK_V8_ENGINE__.input.keys.clear());
    await page.waitForTimeout(70);
    assert(facing === expected, `${label} faces ${expected}`);
  }

  // Exit apartment and ensure the first objective advances exactly once.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.cinematic = null;
    e.py = -3200 + 86 - 18;
    e.updateProximity?.();
    e.tryInteract();
  });
  await page.waitForTimeout(500);
  state = await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    return {
      mode: e.mode,
      step: e.mission.steps[e.mission.activeStep]?.id,
      wakeDone: e.mission.steps.find((s) => s.id === "wake")?.done,
      visible: e.world3d?.sprite?.visible,
    };
  });
  assert(state.mode === "world", "apartment exit returns to Memphis world");
  assert(state.wakeDone === true, "leaving apartment completes wake objective");
  assert(state.step === "link_k", "next objective is Link up with K Blanco");
  assert(state.visible === true, "Benji remains visible after apartment exit");

  // HQ is a physical interior, not a menu teleport.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.cinematic = null;
    window.__gameTest.teleport("store");
    e.updateProximity?.();
    e.tryInteract();
  });
  await page.waitForTimeout(500);
  state = await page.evaluate(() => ({
    mode: window.__SACK_V8_ENGINE__.mode,
    interior: window.__SACK_V8_ENGINE__.__v8Interior,
  }));
  assert(state.mode === "interior" && state.interior === "hq", "SackReligious HQ is enterable");
  await page.screenshot({ path: "artifacts/v8-hq.png", fullPage: true });

  // Basketball: enter Sackrow, fire a centered PERFECT release, resolve it,
  // and guarantee the player receives another playable possession.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.mode = "world";
    e.__v8Interior = null;
    e.cinematic = null;
    e.enterBasketball();
    const originalRandom = Math.random;
    Math.random = () => 0.5;
    e.beginCharge();
    e.ball.power = 0.65;
    e.releaseShot();
    Math.random = originalRandom;
  });
  await page.waitForTimeout(150);
  state = await page.evaluate(() => ({
    mode: window.__SACK_V8_ENGINE__.mode,
    shots: window.__SACK_V8_ENGINE__.ball.shots,
    inFlight: window.__SACK_V8_ENGINE__.ball.inFlight,
    grade: window.__SACK_V8_ENGINE__.ball.grade,
  }));
  assert(state.mode === "basketball", "basketball enters Sackrow gameplay mode");
  assert(state.shots === 1, "release creates a shot attempt");
  assert(state.inFlight === true, "basketball visibly enters flight state");
  assert(state.grade === "PERFECT", "0.65 release is a PERFECT timing shot");

  await page.waitForTimeout(4200);
  state = await page.evaluate(() => ({
    score: window.__SACK_V8_ENGINE__.ball.score,
    held: window.__SACK_V8_ENGINE__.ball.held,
    inFlight: window.__SACK_V8_ENGINE__.ball.inFlight,
    shots: window.__SACK_V8_ENGINE__.ball.shots,
    diag: window.__SACK_BBALL_V8__ || null,
  }));
  if (state.score < 2 || !state.held || state.inFlight) {
    console.error("Basketball diagnostic:", JSON.stringify(state.diag));
  }
  assert(state.score >= 2, "centered PERFECT shot scores");
  assert(state.held === true && state.inFlight === false, "ball resets to a playable next possession");
  await page.screenshot({ path: "artifacts/v8-sackrow-gym.png", fullPage: true });

  // No old blank named-NPC cards should be visible after V8 takes over.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.exitBasketball();
    window.__gameTest.teleport("neighborhood");
  });
  await page.waitForTimeout(900);
  const blanksVisible = await page.evaluate(() => {
    const values = [...(window.__SACK_V8_ENGINE__.world3d?.npcSprites?.values?.() || [])];
    return values.filter((x) => x?.visible).length;
  });
  assert(blanksVisible === 0, "legacy blank NPC sprite cards are hidden");

  const runtimeErrors = await page.evaluate(() => window.__SACK_RUNTIME_ERRORS__ || []);
  assert(runtimeErrors.length === 0, "runtime watchdog captured no uncaught game errors");
} catch (err) {
  failures.push(err?.stack || String(err));
  console.error(err);
} finally {
  if (logs.length) {
    console.log("\n--- Browser log ---");
    for (const line of logs.slice(-120)) console.log(line);
  }
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} smoke-test failure(s):`);
  failures.forEach((f, i) => console.error(`${i + 1}. ${f}`));
  process.exit(1);
}

console.log("\nV8 gameplay smoke test passed.");
