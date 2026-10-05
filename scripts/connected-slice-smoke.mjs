import assert from "node:assert/strict";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { captureGameFrame } from "./browser-frame.mjs";

const server = process.env.GAME_URL ? null : await createServer({ server: { host: "127.0.0.1", port: 8089, strictPort: true } });
await server?.listen();
const base = process.env.GAME_URL || "http://127.0.0.1:8089/";
const out = process.env.SLICE_SCREENSHOTS || "artifacts/connected-slice";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [], checkpoints = [], failedResponses = [];
const check = (ok, label, detail) => { assert.ok(ok, label + ": " + JSON.stringify(detail)); console.log("PASS:", label, detail ?? ""); };
try {
  const makePage = async (options) => {
    const p = await browser.newPage(options);
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("response", (r) => { if (r.status() >= 400) failedResponses.push({ url: r.url(), status: r.status() }); });
    await p.bringToFront();
    const focus = await p.context().newCDPSession(p);
    await focus.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await p.addInitScript(() => {
      if (!localStorage.getItem("sackreligious-memphis-v3")) localStorage.setItem("sackreligious-memphis-v3", JSON.stringify({ version: 3, owned: ["starter_tee"], settings: { quality: "low" } }));
    });
    return p;
  };
  let page = await makePage({ viewport: { width: 1280, height: 800 } });
  const stopLoop = () => page.evaluate(() => { const e = window.__sack; e.running = false; cancelAnimationFrame(e.raf); clearTimeout(e.loopBackup); });
  const tick = (frames = 1) => page.evaluate((n) => { for (let i = 0; i < n; i++) window.__sack.update(1 / 60); window.__sack.emitHud(); }, frames);
  const state = () => page.evaluate(() => { const e = window.__sack; return { x: e.px, y: e.py, mode: e.mode, nearNpc: e.nearNpc, nearPoi: e.nearPoi, step: e.mission.steps[e.mission.activeStep]?.id, dollars: e.sackdollars, respect: e.respect, deliveries: e.run.deliveries, missionComplete: e.missionComplete, dropLive: e.dropLive, equipped: e.equipped, owned: [...e.owned], score: e.ball.score, shots: e.ball.shots, vehicle: e.vehicle?.kind, elapsed: e.clock }; });
  const missionShots = {
    home: "01-apartment-start", "home-exit": "02-apartment-exit", "k-blanco": "03-k-blanco-hq",
    "drop-van": "04-drop-van", neighborhood: "05-neighborhood-delivery", downtown: "06-downtown-delivery",
    culture: "07-culture-delivery", "court-cleared": "08-sackrow-basketball", "return-hq": "09-return-to-hq",
    "drop-complete": "10-drop-day-complete", "wardrobe-equipped": "11-wardrobe-equipped", "after-reload": "12-after-reload",
  };
  const capture = async (name) => {
    await captureGameFrame(page, out + "/" + name + ".png");
    if (missionShots[name]) await copyFile(out + "/" + name + ".png", "artifacts/" + missionShots[name] + ".png");
    await stopLoop(); const s = await state(); checkpoints.push({ name, ...s }); console.log("SCENE", name, s);
  };
  const enter = async (season, fresh) => {
    await page.goto(base + "?season=" + season + "&qa=1&hauntdebug=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__sack, null, { timeout: 90000 });
    const portraitHint = page.getByRole("button", { name: /^LANDSCAPE/ });
    if (await portraitHint.count()) await portraitHint.click({ force: true });
    await page.getByRole("button", { name: fresh ? /^NEW GAME$/ : /^CONTINUE$/ }).click({ force: true });
    await stopLoop(); await tick(100);
  };
  // Navigation uses actual collision and authored sidewalks. It drives shared
  // movement through the normal engine update path, never assigning position,
  // enabling noclip, warping, completing steps, injecting rewards or score.
  const walk = async (target, label, tolerance = 30) => {
    const result = await page.evaluate(({ target, label }) => {
      const e = window.__sack, cell = 16, cols = 192, rows = 144;
      const id = (x, y) => y * cols + x;
      const point = (i) => ({ x: (i % cols) * cell, y: Math.floor(i / cols) * cell });
      const free = (x, y) => x >= 4 && y >= 4 && x < cols - 4 && y < rows - 4 && !e.collides(x * cell, y * cell, 20);
      const nearest = (p, reachable = false) => {
        const cx = Math.round(p.x / cell), cy = Math.round(p.y / cell);
        for (let r = 0; r <= 8; r++) {
          const candidates = [];
          for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
            if (!free(x, y)) continue;
            if (reachable && Array.from({ length: 8 }, (_, i) => (i + 1) / 8).some(t => e.collides(p.x + (x * cell - p.x) * t, p.y + (y * cell - p.y) * t, 14))) continue;
            candidates.push({ node: id(x, y), distance: Math.hypot(x * cell - p.x, y * cell - p.y) });
          }
          candidates.sort((a, b) => a.distance - b.distance);
          if (candidates.length) return candidates[0].node;
        }
        throw new Error("No free node near " + JSON.stringify(p));
      };
      const plan = () => {
        let start;
        for (let attempt = 0; attempt < 12; attempt++) {
          try { start = nearest({ x: e.px, y: e.py }, true); break; }
          catch (error) {
            if (attempt === 11) throw error;
            e.input.reset(); for (let i = 0; i < 120; i++) e.update(1 / 60);
          }
        }
        const goal = nearest(target), prev = new Map([[start, -1]]), costs = new Map([[start, 0]]), buckets = [[start]];
        let largest = 0;
        for (let cost = 0; cost <= largest; cost++) while (buckets[cost]?.length) {
          const at = buckets[cost].pop();
          if (costs.get(at) !== cost) continue;
          if (at === goal) { largest = -1; break; }
          const x = at % cols, y = Math.floor(at / cols);
          for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            const next = id(nx, ny); if (!free(nx, ny)) continue;
            const onSidewalk = e.walks.some(r => nx * cell >= r.x && nx * cell <= r.x + r.w && ny * cell >= r.y && ny * cell <= r.y + r.h);
            const nextCost = cost + (onSidewalk ? 1 : 6);
            if ((costs.get(next) ?? Infinity) <= nextCost) continue;
            costs.set(next, nextCost); prev.set(next, at);
            (buckets[nextCost] ??= []).push(next); largest = Math.max(largest, nextCost);
          }
        }
        if (!prev.has(goal)) throw new Error("No collision-free walking route to " + label);
        const path = []; for (let at = goal; at !== -1; at = prev.get(at)) path.push(point(at)); return path.reverse();
      };
      let path = plan(), at = 0, frames = 0, stuck = 0, replans = 0, penetrations = 0;
      e.input.reset();
      while (at < path.length && frames++ < 20000) {
        const p = path[at], dx = p.x - e.px, dy = p.y - e.py, d = Math.hypot(dx, dy);
        if (d < 5) { at++; continue; }
        const yaw = e.yaw, right = { x: Math.cos(yaw), y: -Math.sin(yaw) }, forward = { x: -Math.sin(yaw), y: -Math.cos(yaw) };
        e.input.touch.mx = (dx * right.x + dy * right.y) / d;
        e.input.touch.my = -(dx * forward.x + dy * forward.y) / d;
        e.input.touch.run = true;
        const x = e.px, y = e.py; e.update(1 / 60);
        if (e.collides(e.px, e.py, 13.5)) penetrations++;
        if (Math.hypot(e.px - x, e.py - y) < 0.05) stuck++; else stuck = 0;
        if (stuck > 30) {
          if (++replans > 12) throw new Error("Walking stuck: " + JSON.stringify({ label, x: e.px, y: e.py, mode: e.mode, paused: e.paused, cinematic: e.cinematic, started: e.started, target: p, input: e.input.touch, collision: e.collides(p.x, p.y, 14) }));
          e.input.reset(); for (let i = 0; i < 35; i++) e.update(1 / 60);
          path = plan(); at = 0; stuck = 0;
        }
      }
      e.input.reset(); for (let i = 0; i < 35; i++) e.update(1 / 60); e.emitHud();
      if (at !== path.length) throw new Error("Walking timed out to " + label + " at " + e.px + "," + e.py);
      return { label, x: e.px, y: e.py, frames, replans, penetrations, distance: Math.hypot(target.x - e.px, target.y - e.py) };
    }, { target, label });
    check(result.distance < tolerance, "walk reaches " + label, result); return result;
  };
  const press = async (key = "e") => { await page.keyboard.press(key); await tick(2); await page.waitForTimeout(160); };
  const dialogue = async () => { for (let i = 0; i < 8 && (await state()).mode === "dialogue"; i++) await press(); };
  const locations = () => page.evaluate(() => window.__SACK_LOCATION_DEBUG__.snapshot());

  await enter("none", true);
  check((await state()).step === "wake", "new game begins at home"); await capture("home");
  await walk({ x: 288, y: 576 }, "home exit");
  check((await state()).step === "link_k", "physical home exit advances the mission"); await capture("home-exit");
  const loc = await locations();
  const solids = await page.evaluate(() => window.__gameTest.furnitureCollisionProbe());
  check(solids.bed && solids.hqCounter && !solids.hqDoorLane && !solids.apartmentThreshold, "furniture blocks movement while physical door lanes stay open", solids);
  await walk({ x: loc.hq.frontDoor.x, y: loc.hq.frontDoor.y + 40 }, "HQ exterior"); await capture("hq-exterior");
  check(!(await locations()).hq.inside, "HQ approach remains outside");
  await walk({ x: loc.hq.frontDoor.x, y: loc.hq.frontDoor.y - 52 }, "HQ interior");
  check((await locations()).hq.inside && !(await page.evaluate(() => window.__SACK_COMMERCE__.snapshot().storeDisclaimer)), "HQ entry does not launch the real store");
  const render = await page.evaluate(() => { const e = window.__sack; e.draw(); return { inside: e.world3d.hqInterior?.visible, outside: e.world3d.hqExterior?.visible, k: e.world3d.hqInterior?.getObjectByName("k-blanco-desk")?.visible }; });
  check(render.inside && !render.outside && render.k, "HQ interior and one K Blanco actor are visible", render); await capture("hq-interior");
  await walk({ x: loc.hq.anchors.kBlanco.x + 32, y: loc.hq.anchors.kBlanco.y + 22 }, "K Blanco");
  check((await state()).nearNpc === "k_blanco", "K Blanco prompt matches the physical actor");
  await press(); check((await state()).mode === "dialogue", "real interact opens K Blanco dialogue"); await capture("k-blanco"); await dialogue();
  check((await state()).step === "pickup", "K Blanco briefing advances to pickup");

  await walk(loc.hq.anchors.showroom, "showroom"); await press();
  check((await state()).mode === "shop", "showroom interaction opens virtual wardrobe");
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('img[data-testid^="view-"]')];
    return images.length >= 6 && images.every((img) => img.complete && img.naturalWidth > 0);
  });
  check(await page.locator('img[data-testid^="view-"]').count() >= 6, "local showroom product thumbnails load");
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const size = await page.getByTestId("hq-shop-scroll").evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    check(size.scroll <= size.client + 1, `showroom content fits at ${width}x${height}`, size);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("hq-real-store").click();
  check(await page.getByRole("heading", { name: "Real $ackReligious store" }).isVisible(), "explicit shop action opens the commerce confirmation");
  await page.getByRole("button", { name: "Stay in the game" }).click();
  await page.getByTestId("hq-shop-close").click(); await tick(2);
  const position = await state(); await press("v");
  await enter("none", false); const restored = await state();
  check(Math.hypot(restored.x - position.x, restored.y - position.y) < 2 && restored.step === "pickup" && restored.dollars === position.dollars && restored.equipped === position.equipped, "reload remains inside HQ and preserves progress/outfit/rewards", { position, restored });
  if (await page.evaluate(() => window.__sack.presentedView() !== "third")) await press("v");
  await walk({ x: loc.hq.frontDoor.x, y: loc.hq.frontDoor.y + 40 }, "HQ return to street");
  check(!(await locations()).hq.inside, "HQ exit stays at the same doorway");

  const poi = (id) => loc.locations.find((p) => p.id === id);
  const front = (p) => ({ x: p.x + p.w / 2, y: p.y + p.h + 24 });
  await walk(front(poi("dropvan")), "Drop Van"); await press();
  check((await state()).step === "hood" && (await state()).vehicle === "van", "pickup interaction secures the drop and enters the van"); await capture("drop-van");
  for (const [key, sign] of [["a", 1], ["d", -1]]) {
    const before = await page.evaluate(() => window.__sack.yaw);
    await page.keyboard.down("w"); await page.keyboard.down(key); await tick(15);
    const after = await page.evaluate(() => ({ yaw: window.__sack.yaw, speed: Math.hypot(window.__sack.vx, window.__sack.vy) }));
    await page.keyboard.up(key); await page.keyboard.up("w"); await tick(2);
    const delta = Math.atan2(Math.sin(after.yaw - before), Math.cos(after.yaw - before));
    check(sign * delta > 0.05 && after.speed > 1, key.toUpperCase() + " steers the moving van with the correct chase-camera sign", after);
  }
  await press(); check(!(await state()).vehicle, "parking returns to on-foot traversal");
  for (const [id, step] of [["neighborhood", "dt"], ["downtown", "culture"], ["culture", "ball"]]) {
    await walk(front(poi(id)), id, 64); const before = await state();
    check(before.nearPoi === id, id + " physical arrival exposes its own interaction", before);
    await tick(2); check((await state()).step === before.step, "arrival alone does not complete a delivery");
    await press(); await dialogue(); const after = await state();
    check(after.step === step && after.dollars > before.dollars, id + " interaction pays and advances once", { before, after });
    await press(); await dialogue(); check((await state()).dollars === after.dollars, "repeated delivery interaction does not duplicate payout"); await capture(id);
  }
  await walk({ x: poi("court").x + poi("court").w / 2, y: poi("court").y + poi("court").h - 48 }, "901 Court");
  await press(); await dialogue();
  if (!(await page.getByRole("button", { name: /^PLAY / }).count())) await press();
  await page.getByRole("button", { name: /^PLAY / }).click(); await tick(2);
  check((await state()).mode === "basketball", "physical court arrival starts basketball through the menu");
  await page.keyboard.down("Space"); await tick(42); await page.keyboard.up("Space"); await tick(180);
  check((await state()).shots === 1, "court hold-release produces a real shot"); await capture("court");
  const ball = await page.evaluate(() => ({ held: window.__sack.ball.held, flight: window.__sack.ball.inFlight, x: window.__sack.ball.ballX, y: window.__sack.ball.ballY }));
  check(!ball.flight, "shot resolves into rebound/recovery", ball);
  if (!ball.held) await walk({ x: ball.x, y: ball.y }, "basketball recovery");
  await tick(120); check(await page.evaluate(() => window.__sack.ball.held), "separate ball returns to possession");
  await page.keyboard.down("Space"); await tick(90); await page.keyboard.up("Space"); await tick(2);
  check((await state()).shots === 2, "next maximum-charge shot releases once");
  await capture("court-max-charge"); await tick(240);
  check(await page.evaluate(() => !window.__sack.ball.inFlight && window.__sack.ball.held && window.__sack.ball.shots === 2), "maximum-charge flight/bounce resolves to separate-ball recovery");
  // An off-axis, late shot must resolve through the real loose-ball path.
  await walk({ x: poi("court").x + poi("court").w / 2, y: poi("court").y + poi("court").h / 2 }, "court wing");
  await page.keyboard.down("Space"); await tick(90); await page.keyboard.up("Space"); await tick(2);
  check(await page.evaluate(() => window.__sack.ball.grade === "LATE"), "late wing release is graded by the normal shot system");
  let loose = false;
  for (let i = 0; i < 300; i++) {
    await tick();
    if (await page.evaluate(() => !window.__sack.ball.held && !window.__sack.ball.inFlight && window.__sack.ball.ballZ <= 28)) { loose = true; break; }
  }
  check(loose, "miss reaches a loose, separate basketball");
  await tick(120);
  check(await page.evaluate(() => window.__sack.ball.held && !window.__sack.ball.inFlight), "Court OG returns the missed ball without a reset or score injection");
  // Walk into the paint and complete the real mission score gate with releases.
  await walk({ x: poi("court").x + poi("court").w / 2, y: poi("court").y + poi("court").h - 100 }, "court paint");
  for (let i = 0; i < 12 && (await state()).step === "ball"; i++) {
    check((await state()).mode === "basketball", "court challenge remains active before each shot");
    await page.keyboard.down("Space"); await tick(38); await page.keyboard.up("Space"); await tick(180);
  }
  const cleared = await state();
  check(cleared.score >= 8 && cleared.step === "return", "real made shots clear the eight-point Drop Day challenge", cleared);
  await capture("court-cleared");
  await page.getByRole("button", { name: /^Leave court$/ }).click({ force: true }); await tick(2);
  const payout = await state();
  check(payout.mode === "world" && payout.dollars > cleared.dollars, "leaving the court pays the earned score");
  // Repeat leave must be harmless, including stale/double UI clicks.
  await page.evaluate(() => window.__sack.exitBasketball()); await tick(2);
  check((await state()).dollars === payout.dollars, "court payout settles once");
  await walk({ x: loc.hq.anchors.kBlanco.x + 32, y: loc.hq.anchors.kBlanco.y + 22 }, "return to K Blanco");
  await capture("return-hq");
  await press(); await dialogue(); await tick(420); await dialogue();
  const complete = await state();
  check(complete.missionComplete && complete.dropLive && complete.dollars > payout.dollars, "K Blanco completes Drop Day and awards the return reward", complete);
  await capture("drop-complete");
  await press(); await dialogue(); await tick(240);
  check((await state()).dollars === complete.dollars, "K Blanco completion reward is not duplicated");
  const recap = page.getByRole("button", { name: /Keep roaming/i });
  if (await recap.count()) await recap.click({ force: true });
  await walk(loc.hq.anchors.showroom, "completed-run showroom"); await press();
  const buy = page.getByTestId("buy-black_hoodie");
  await buy.click({ force: true }); await tick(2);
  const dressed = await state();
  check(dressed.equipped === "black_hoodie" && dressed.owned.includes("black_hoodie") && dressed.dollars < complete.dollars, "wardrobe purchase deducts dollars and equips an owned hoodie", dressed);
  await capture("wardrobe-equipped");
  await page.getByTestId("hq-shop-close").click({ force: true }); await tick(2);
  await enter("none", false);
  const final = await state();
  check(final.missionComplete && final.dropLive && final.equipped === dressed.equipped && final.owned.includes("black_hoodie") && final.dollars === dressed.dollars && final.respect === dressed.respect && Math.hypot(final.x - dressed.x, final.y - dressed.y) < 2, "completed mission, owned/equipped outfit, money, respect and HQ position survive Continue", { dressed, final });
  await capture("after-reload");
  await page.close();
  page = await makePage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await enter("halloween_2026", true);
  check(await page.evaluate(() => !!document.querySelector(".sack-halloween")), "Halloween season hydrates");
  await walk({ x: 288, y: 576 }, "Halloween home exit");
  await walk({ x: loc.hq.frontDoor.x, y: loc.hq.frontDoor.y + 40 }, "Halloween HQ approach");
  await walk({ x: loc.hq.anchors.kBlanco.x + 32, y: loc.hq.anchors.kBlanco.y + 22 }, "Halloween K Blanco");
  check((await state()).nearNpc === "k_blanco" && (await locations()).hq.inside, "Halloween preserves physical HQ/K anchors");
  const interact = page.getByRole("button", { name: /^(TAP|E)$/ }).last();
  await interact.dispatchEvent("pointerdown", { pointerType: "touch", bubbles: true }); await tick(2);
  check((await state()).mode === "dialogue", "mobile pointer interaction opens K Blanco dialogue");
  await capture("halloween-hq-mobile");
  check(errors.length === 0, "connected slice has no uncaught/hydration errors", errors);
  check(failedResponses.length === 0, "connected route has no HTTP asset failures", failedResponses);
  await writeFile(out + "/checkpoints.json", JSON.stringify(checkpoints, null, 2));
  await writeFile(out + "/failed-responses.json", JSON.stringify(failedResponses, null, 2));
  console.log("Connected Drop Day passed through three deliveries, real court score/miss/recovery, return to HQ, purchase and reload. Halloween room puzzles and target hardware remain separate gates.");
} finally { await browser.close(); await server?.close(); }
