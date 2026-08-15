#!/usr/bin/env node
import { chromium } from "playwright";

const url = process.env.GAME_URL || "http://127.0.0.1:8080";
const failures = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

function ok(value, message, detail) {
  if (value) console.log(`PASS: ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL: ${message}${detail ? ` :: ${JSON.stringify(detail)}` : ""}`);
  }
}

async function engineState() {
  return page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    return {
      mode: e.mode,
      interior: e.__v8Interior ?? null,
      step: e.mission.steps[e.mission.activeStep]?.id ?? "done",
      complete: !!e.missionComplete,
      dollars: e.sackdollars,
      respect: e.respect,
      equipped: e.equipped,
      owned: [...e.owned],
      progress: Object.fromEntries(e.mission.steps.map((s) => [s.id, !!s.done])),
    };
  });
}

async function drainDialogue() {
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    let guard = 0;
    while (e.dialogue && guard++ < 12) e.advanceDialogue();
  });
  await page.waitForTimeout(120);
}

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__SACK_V8_ENGINE__ && window.__gameTest, null, { timeout: 30000 });
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.start(true);
    e.cinematic = null;
    e.letterbox = 0;
    e.input.keys.clear();
  });
  await page.waitForTimeout(400);

  // 0 -> 1: Apartment exit.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.py = -3200 + 86 - 18;
    e.updateProximity();
    e.tryInteract();
  });
  await page.waitForTimeout(250);
  let s = await engineState();
  ok(s.progress.wake && s.step === "link_k", "Apartment exit advances to K Blanco", s);
  const afterWake = s.dollars;

  // 1 -> 2: enter physical HQ and talk to K.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    window.__gameTest.teleport("store");
    e.cinematic = null;
    e.updateProximity();
    e.tryInteract();
  });
  await page.waitForTimeout(250);
  s = await engineState();
  ok(s.mode === "interior" && s.interior === "hq", "Mission enters physical HQ", s);

  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.px = -3700 + 42;
    e.py = -3200 - 32;
    e.updateProximity();
    e.tryInteract();
  });
  await drainDialogue();
  s = await engineState();
  ok(s.progress.link_k && s.step === "pickup", "K Blanco briefing advances to Drop Van", s);
  ok(s.dollars === afterWake + 25, "K Blanco reward credited once", s);

  // Leave HQ.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    if (e.mode !== "interior") { e.mode = "interior"; e.__v8Interior = "hq"; }
    e.py = -3200 + 105 - 18;
    e.updateProximity();
    e.tryInteract();
  });
  await page.waitForTimeout(150);

  // 2 -> 3: Drop van.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    window.__gameTest.teleport("dropvan");
    e.cinematic = null;
    e.updateProximity();
    e.tryInteract();
  });
  await page.waitForTimeout(160);
  s = await engineState();
  ok(s.progress.pickup && s.step === "hood", "Drop Van advances to Neighborhood", s);

  // 3 -> 6: location handoffs via their actual mission contacts.
  for (const [npc, expectedDone, next] of [
    ["supporter_1", "hood", "dt"],
    ["downtown_fan", "dt", "culture"],
    ["culture_host", "culture", "ball"],
  ]) {
    await page.evaluate((id) => {
      const e = window.__SACK_V8_ENGINE__;
      e.mode = "world";
      e.cinematic = null;
      e.openDialogue(id);
    }, npc);
    await drainDialogue();
    s = await engineState();
    ok(s.progress[expectedDone] && s.step === next, `${npc} advances ${expectedDone} -> ${next}`, s);
  }

  // 6 -> 7: court objective. Real shot functionality is covered by game-smoke;
  // here we prove the mission's score gate is wired correctly and only once.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.enterBasketball();
    e.ball.score = 8;
    e.tryCreditBasketball();
    e.exitBasketball();
  });
  await page.waitForTimeout(180);
  s = await engineState();
  ok(s.progress.ball && s.step === "return", "8 Sackrow points advance to Return to HQ", s);

  // 7 -> complete: physical HQ return + K dialogue.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    window.__gameTest.teleport("store");
    e.cinematic = null;
    e.updateProximity();
    e.tryInteract();
    e.px = -3700 + 42;
    e.py = -3200 - 32;
    e.updateProximity();
    e.tryInteract();
  });
  await drainDialogue();
  s = await engineState();
  ok(s.complete && s.step === "done", "Drop Day completes after returning to K Blanco", s);
  const completedDollars = s.dollars;

  // Idempotence: attempting to repeat completed steps cannot farm money.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.completeStep("return");
    e.tryMissionAction("dropvan");
    e.completeStep("wake");
  });
  s = await engineState();
  ok(s.dollars === completedDollars, "Completed objectives cannot duplicate rewards", s);

  // Economy + wardrobe: purchase is atomic, visual outfit state persists.
  await page.evaluate(() => {
    const e = window.__SACK_V8_ENGINE__;
    e.sackdollars = Math.max(e.sackdollars, 500);
    e.buyItem("black_hoodie");
    e.save();
  });
  await page.waitForTimeout(900);
  s = await engineState();
  ok(s.equipped === "black_hoodie" && s.owned.includes("black_hoodie"), "Purchased wardrobe item equips visibly/statefully", s);
  const wardrobeDiag = await page.evaluate(() => window.__SACK_WARDROBE_V8__ || null);
  ok(wardrobeDiag?.equipped === "black_hoodie", "Wardrobe renderer sees equipped item", wardrobeDiag);

  const saveSnapshot = { dollars: s.dollars, equipped: s.equipped, complete: s.complete };
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__SACK_V8_ENGINE__ && window.__gameTest, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  s = await engineState();
  ok(s.complete === saveSnapshot.complete, "Mission completion persists after reload", s);
  ok(s.equipped === saveSnapshot.equipped, "Equipped outfit persists after reload", s);
  ok(s.dollars === saveSnapshot.dollars, "$ackdollars persist after reload", s);

  // Duplicate purchase path should equip without charging again.
  const beforeDuplicate = s.dollars;
  await page.evaluate(() => window.__SACK_V8_ENGINE__.buyItem("black_hoodie"));
  s = await engineState();
  ok(s.dollars === beforeDuplicate, "Already-owned apparel cannot charge twice", s);

} catch (err) {
  failures.push(err?.stack || String(err));
  console.error(err);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\nMission smoke failed (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nFull Drop Day/save/economy/wardrobe smoke passed.");
