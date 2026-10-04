import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";

// One process owns both preview and browser, including restricted QA runtimes.
const server = process.env.GAME_URL ? null : await createServer({ server: { host: "127.0.0.1", port: 8088, strictPort: true } });
await server?.listen();
const base = process.env.GAME_URL || "http://127.0.0.1:8088/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const shots = process.env.FOUNDATION_SCREENSHOTS || "artifacts/foundation";
await mkdir(shots, { recursive: true });
const errors = [];
const check = (condition, name, detail) => { assert.ok(condition, `${name}: ${JSON.stringify(detail)}`); console.log(`PASS: ${name}`, detail ?? ""); };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (!localStorage.getItem("sackreligious-memphis-v3")) localStorage.setItem("sackreligious-memphis-v3", JSON.stringify({ version: 3, owned: ["starter_tee"], settings: { quality: "low" } }));
  });
  const boot = async (season) => {
    await page.goto(`${base}?season=${season}&hauntdebug=1&qa=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__sack, { timeout: 90000 });
    await page.evaluate(() => {
      const e = window.__sack;
      e.running = false; cancelAnimationFrame(e.raf); clearTimeout(e.loopBackup);
      e.start(false); e.cinematic = null; e.letterbox = 0; e.userPaused = e.hiddenPaused = e.parentPaused = e.paused = false;
    });
  };
  const tick = (frames = 1) => page.evaluate((count) => { for (let i = 0; i < count; i++) window.__sack.update(1 / 60); }, frames);
  const capture = async (name) => {
    // A live WebGL loop is necessary: the default drawing buffer is discarded
    // after a frame, so a stopped-loop page screenshot can show only the HUD.
    await page.evaluate(() => window.__sack.startLoop());
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${shots}/${name}.png`, timeout: 20000 });
    await page.evaluate(() => { const e = window.__sack; e.running = false; cancelAnimationFrame(e.raf); clearTimeout(e.loopBackup); });
  };
  await boot("none");
  check(await page.evaluate(() => !document.querySelector(".sack-halloween")), "everyday season applies after hydration");
  const assets = await page.evaluate(() => window.__SACK_DEBUG__.snapshot().assets);
  check(assets.length > 50 && assets.every((a) => a.status === "loaded"), "boot catalog loads without missing assets", { count: assets.length, missing: assets.filter((a) => a.status !== "loaded") });
  check(new Set(assets.map((a) => a.id)).size === assets.length, "stable asset IDs are unique");
  for (const [key, facing] of [["a", "left"], ["d", "right"], ["w", "up"], ["s", "down"]]) {
    await page.evaluate(() => { const e = window.__sack; e.warpTo("downtown"); e.px = 1800; e.py = 960; e.yaw = 0; e.mover.reset(0); e.playtestNoclip = true; e.input.reset(); });
    await page.keyboard.down(key); await tick(40);
    const s = await page.evaluate(() => { const e = window.__sack; e.draw(); return { facing: e.facing, x: e.px, y: e.py, visual: window.__BENJI_VISUAL_DEBUG__ }; });
    await page.keyboard.up(key); await tick();
    check(s.facing === facing, `${key.toUpperCase()} movement faces ${facing}`, s);
    check(s.visual?.cardAVisible && !s.visual?.cardBVisible, "one Benji visual is active", s.visual);
  }
  const distances = [];
  for (const sprint of [false, true]) {
    await page.evaluate(() => { const e = window.__sack; e.px = 1800; e.py = 960; e.mover.reset(0); e.input.reset(); });
    if (sprint) await page.keyboard.down("Shift");
    await page.keyboard.down("w"); await tick(40);
    distances.push(await page.evaluate(() => 960 - window.__sack.py));
    await page.keyboard.up("w"); await page.keyboard.up("Shift"); await tick(60);
    check(await page.evaluate(() => window.__sack.mover.speed < 0.1), "release returns locomotion to idle");
  }
  check(distances[1] > distances[0] * 1.2, "Shift sprint travels farther than walking", distances);
  await page.keyboard.down("Space"); await tick(8);
  check(await page.evaluate(() => window.__sack.mover.air > 0), "Space jumps away from the court");
  await page.keyboard.up("Space"); await tick(90);
  check(await page.evaluate(() => window.__sack.mover.air === 0), "jump returns to the ground");
  await page.evaluate(() => { window.__sack.playtestNoclip = false; window.__gameTest.enterCourt(); });
  await page.keyboard.press("Space"); await tick(2);
  check(await page.evaluate(() => window.__sack.ball.shots === 1), "tap shoot releases once");
  await page.evaluate(() => window.__gameTest.enterCourt());
  await page.keyboard.down("Space"); await tick(90);
  const held = await page.evaluate(() => ({ charging: window.__sack.ball.charging, shots: window.__sack.ball.shots, pending: !!window.__sack.ball.pending, flight: window.__sack.ball.inFlight }));
  check(!held.charging && held.shots === 1 && (held.pending || held.flight), "maximum held charge automatically releases", held);
  await page.keyboard.up("Space"); await tick();
  check(await page.evaluate(() => window.__sack.ball.shots === 1), "key-up after auto-release does not duplicate shot");
  await page.evaluate(() => window.__gameTest.enterCourt());
  await page.keyboard.down("Space"); await tick(20);
  await page.evaluate(() => window.dispatchEvent(new Event("blur"))); await tick();
  check(await page.evaluate(() => !window.__sack.ball.charging && window.__sack.ball.shots === 1), "lost keyboard focus releases basketball charge");
  await page.keyboard.up("Space"); await tick();
  const reset = await page.evaluate(() => {
    const e = window.__sack;
    e.input.touch.mx = 1; e.input.touch.my = -1; e.input.touch.run = true; e.input.touch.shoot = true; e.input.poll();
    window.dispatchEvent(new Event("blur"));
    const first = e.input.poll(), second = e.input.poll();
    return { first, second };
  });
  check(reset.first.mx === 0 && reset.first.my === 0 && !reset.first.run && !reset.first.shoot && reset.first.shootReleased && !reset.second.shootReleased, "interruption clears touch actions and emits one release", reset);
  const pad = await page.evaluate(() => {
    const e = window.__sack; const original = navigator.getGamepads.bind(navigator);
    let axes = [0, 0, 0, 0], pressed = new Set([3]);
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [{ axes, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.has(i), value: pressed.has(i) ? 1 : 0 })) }] });
    e.input.poll(); pressed.clear(); e.input.poll(); pressed.add(3); const sprint = e.input.poll().run;
    pressed.add(2); e.input.poll(); e.input.reset(); const blocked = e.input.poll();
    pressed.clear(); e.input.poll(); pressed.add(2); const rearmed = e.input.poll();
    pressed.clear(); axes = [1, 1, 1, 1]; const diagonal = e.input.poll();
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: original }); e.input.reset();
    return { sprint, blocked, rearmed, diagonal };
  });
  check(pad.sprint && !pad.blocked.shoot && pad.rearmed.shootPressed && Math.abs(pad.diagonal.lookX) <= 1 && Math.abs(pad.diagonal.lookY) <= 1, "controller sprint, neutral rearm and clamped sticks", pad);
  const saved = await page.evaluate(() => {
    const e = window.__sack; e.warpTo("apartment");
    // A known solid bed: even jumping/noclip must not persist inside it.
    const room = window.__SACK_LOCATION_DEBUG__.snapshot().locations.find((p) => p.id === "apartment");
    e.px = room.x + room.w / 2 - 2.55 * 16; e.py = room.y + room.h / 2 - 2.55 * 16;
    e.mover.air = 0; e.playtestNoclip = false;
    const originalBlocked = e.collides(e.px, e.py, 14);
    e.mover.air = 2; e.playtestNoclip = true;
    e.equipped = "starter_tee"; const dollars = e.sackdollars, respect = e.respect; e.save();
    const s = JSON.parse(localStorage.getItem("sackreligious-memphis-v3"));
    e.mover.air = 0; e.playtestNoclip = false;
    return { originalBlocked, position: s.position, blocked: e.collides(s.position.x, s.position.y, 14), equipped: s.equipped, dollarsPreserved: dollars === s.sackdollars, respectPreserved: respect === s.respect };
  });
  check(saved.originalBlocked && !saved.blocked && saved.equipped === "starter_tee" && saved.dollarsPreserved && saved.respectPreserved, "save recovery preserves outfit/economy and uses a free ground position", saved);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("sackreligious-memphis-v3")); s.position = { x: 960, y: 2100, yaw: 0 }; localStorage.setItem("sackreligious-memphis-v3", JSON.stringify(s)); });
  await boot("none");
  const restored = await page.evaluate(() => ({ ...window.__SACK_DEBUG__.snapshot().player, blocked: window.__sack.collides(window.__sack.px, window.__sack.py, 14), equipped: window.__sack.equipped }));
  check(!restored.blocked && !restored.deepWater && restored.equipped === "starter_tee", "reload recovers a water save without losing equipped outfit", restored);
  await page.evaluate(() => { window.__gameTest.enterHQ(); });
  const hqBefore = await page.evaluate(() => window.__SACK_DEBUG__.snapshot().player);
  await capture("hq-approach");
  console.log("HQ placement observation (connected-slice acceptance remains pending)", { before: hqBefore, after: await page.evaluate(() => window.__SACK_DEBUG__.snapshot().player) });
  for (const [width, height] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    check(size.scroll <= size.client, `HUD has no horizontal overflow at ${width}x${height}`, size);
    await capture(`mobile-${width < height ? "portrait" : "landscape"}`);
  }
  await page.route("**/game/benji/phone-1.webp*", (route) => route.abort());
  await boot("halloween_2026");
  check(await page.evaluate(() => !!document.querySelector(".sack-halloween")), "Halloween season remains available");
  const missing = await page.evaluate(() => window.__SACK_DEBUG__.snapshot().assets.filter((a) => a.status === "missing"));
  check(missing.length === 1 && missing[0].runtimeKey === "phone-1", "a missing optional sprite is diagnosed without blocking startup", missing);
  check(errors.length === 0, "both seasonal variants have no uncaught/hydration errors", errors);
  console.log("Foundation smoke passed. Target-device performance and the full connected slice remain separate gates.");
} finally { await browser.close(); await server?.close(); }
