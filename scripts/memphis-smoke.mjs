#!/usr/bin/env node
// End-to-end smoke of the live game: boots it, plays one beat of every activity through the
// real input and simulation paths, and saves a frame of each place to artifacts/.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.GAME_URL || "http://127.0.0.1:8080/";
const out = process.env.SMOKE_OUT || "artifacts";
const local = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(local) ? local : undefined),
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await mkdir(out, { recursive: true });
const errors = [];
const check = (ok, name, detail) => {
  assert.ok(ok, `${name}: ${JSON.stringify(detail)}`);
  console.log(`PASS: ${name}`, detail ?? "");
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => errors.push(e.message));
  // A stand-in controller the test can press.
  await page.addInitScript(() => {
    const pad = { id: "smoke pad", index: 0, connected: true, mapping: "standard", timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__pad = pad;
    window.__padOn = false;
    navigator.getGamepads = () => (window.__padOn ? [pad] : []);
  });
  await page.goto(`${base}?q=low`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__GAME__, undefined, { timeout: 120000 });

  // Run the simulation at a fixed step without drawing, then draw one frame.
  const ff = (seconds) =>
    page.evaluate((s) => {
      const g = window.__GAME__;
      const draw = g.stage.render;
      g.stage.render = () => {};
      for (let i = 0; i < s * 60; i++) g.tick(1 / 60);
      g.stage.render = draw;
      g.tick(1 / 60);
    }, seconds);
  const tap = async (action) => {
    await page.evaluate((a) => window.__GAME__.input.press(a), action);
    await ff(0.1);
  };
  const shot = async (name) => {
    await ff(0.05);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${name}.png` });
  };
  const get = (fn) => page.evaluate(fn);

  await ff(2);
  check((await get(() => window.__GAME__.mode)) === "title", "boots to the title screen");
  await shot("01-title");

  // Gamepad: A on the title, the stick on foot, Start and the d-pad in a menu, the trigger in a car.
  const button = (i, on) =>
    page.evaluate(([n, down]) => {
      window.__padOn = true;
      window.__pad.buttons[n].pressed = down;
      window.__pad.buttons[n].value = down ? 1 : 0;
    }, [i, on]);
  const press = async (i) => {
    await button(i, true);
    await ff(0.1);
    await page.waitForTimeout(150);
    await button(i, false);
    await ff(0.1);
  };
  await press(0);
  await page.waitForTimeout(300);
  await ff(1);
  check((await get(() => window.__GAME__.mode)) === "walk", "A on the pad starts the day from the title");
  const z0 = await get(() => window.__GAME__.pos.z);
  await page.evaluate(() => (window.__pad.axes[1] = -1));
  await ff(1.2);
  await page.evaluate(() => (window.__pad.axes[1] = 0));
  await ff(0.1);
  const z1 = await get(() => window.__GAME__.pos.z);
  check(z1 < z0 - 2 && (await get(() => window.__GAME__.input.pad)), "the left stick walks Benji", { from: z0, to: z1 });
  await press(9);
  await page.waitForTimeout(400);
  check((await get(() => window.__GAME__.overlay)) === "pause", "Start opens the pause menu");
  await press(13);
  await page.waitForTimeout(200);
  check((await page.locator('[data-padfocus="1"]').count()) === 1, "the d-pad moves a highlight through the menu");
  await press(1);
  check((await get(() => window.__GAME__.overlay)) === null, "B closes the menu");
  await page.evaluate(() => window.__GAME__.drive());
  await button(7, true);
  await ff(2);
  const rolled = await get(() => window.__GAME__.driver.speed);
  await button(7, false);
  check(rolled > 5, "the right trigger is the gas", rolled);
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.driver.reset(g.save.car.x, g.save.car.z, g.save.car.heading);
    g.exitCar(true);
    g.warp(-13.4, -160.5, Math.PI);
    window.__padOn = false;
  });
  await ff(0.3);

  // Controls: W walks away from the camera, A swings left.
  const before = await get(() => ({ z: window.__GAME__.pos.z, yaw: window.__GAME__.camYaw }));
  await page.evaluate(() => window.__GAME__.input.hold("up", true));
  await ff(1.5);
  await page.evaluate(() => {
    window.__GAME__.input.hold("up", false);
    window.__GAME__.input.hold("left", true);
  });
  await ff(0.6);
  await page.evaluate(() => window.__GAME__.input.hold("left", false));
  const after = await get(() => ({ z: window.__GAME__.pos.z, yaw: window.__GAME__.camYaw }));
  check(after.z < before.z - 2, "W walks forward", { from: before.z, to: after.z });
  const turned = Math.atan2(Math.sin(after.yaw - before.yaw), Math.cos(after.yaw - before.yaw));
  check(turned > 0.3, "A turns left", turned);
  await shot("02-plaza");

  // The boutique, K Blanco, the shop.
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.warp(g.city.anchors.hqDoor.x, g.city.anchors.hqDoor.z + 0.5, Math.PI);
  });
  await ff(0.3);
  await tap("interact");
  await ff(2);
  check((await get(() => window.__GAME__.place)) === "hq", "the front door leads into the HQ");
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.warp(g.rooms.hq.counter.x, g.rooms.hq.counter.z, Math.PI);
  });
  await ff(0.3);
  await tap("interact");
  check(await get(() => window.__GAME__.save.flags.carrying === true && window.__GAME__.save.step === 2), "K Blanco hands over the drop");
  await shot("03-hq");
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.save.dollars += 500;
    g.buy("sr-tour-black");
    g.wear("tour_black");
  });
  check(await get(() => window.__GAME__.save.owned.includes("sr-tour-black") && window.__GAME__.save.wearing === "tour_black"), "a piece can be bought and worn");

  // Deliver, then the court.
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.setPlace("street");
    g.warp(g.city.anchors.ogSpot.x, g.city.anchors.ogSpot.z + 1.5, Math.PI);
  });
  await ff(0.3);
  await tap("interact");
  check((await get(() => window.__GAME__.save.step)) === 3, "the drop is delivered to Court OG");
  await tap("interact");
  await ff(0.5);
  check((await get(() => window.__GAME__.mode)) === "hoops", "the shootout starts");
  const made = await get(() => {
    const g = window.__GAME__;
    const h = g.hoops;
    h.charge = 0.8;
    h.release();
    const ball = h.balls.find((b) => b.live);
    for (let i = 0; i < 600 && !ball.judged; i++) h.physics(ball, 1 / 60);
    return h.made;
  });
  check(made === 1, "a shot released in the green goes in", made);
  await shot("04-court");
  await tap("back");

  // Fishing.
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.warp(g.city.anchors.castSpots[0].x, g.city.anchors.castSpots[0].z, Math.PI);
  });
  await ff(0.3);
  await tap("interact");
  check((await get(() => window.__GAME__.mode)) === "fish", "a line can be cast from the pier");
  const fished = await get(() => {
    const g = window.__GAME__;
    const f = g.fishing;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (cond, max) => {
      for (let i = 0; i < max * 60 && !cond(); i++) g.tick(1 / 60);
    };
    g.input.hold("action", true);
    run(() => f.phase === "charge" && f.power > 0.8, 3);
    g.input.hold("action", false);
    run(() => f.phase === "bite", 14);
    g.input.press("action");
    g.tick(1 / 60);
    for (let i = 0; i < 9000 && f.phase === "reel"; i++) {
      g.input.hold("action", !f.running || f.tension < 0.45);
      g.tick(1 / 60);
    }
    g.input.hold("action", false);
    g.stage.render = draw;
    return { phase: f.phase, cooler: g.save.cooler.length };
  });
  check(fished.phase === "landed" && fished.cooler === 1, "a hooked fish can be landed", fished);
  await shot("05-pier");
  await tap("back");

  // Bowling.
  const bowled = await get(() => {
    const g = window.__GAME__;
    g.setPlace("bowl");
    g.begin(g.bowling, "bowl");
    g.bowling.start();
    const b = g.bowling;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (cond, max) => {
      for (let i = 0; i < max * 60 && !cond(); i++) g.tick(1 / 60);
    };
    const press = () => {
      g.input.press("action");
      g.tick(1 / 60);
    };
    press();
    run(() => Math.abs(b.aim) < 0.05, 5);
    press();
    run(() => Math.abs(b.power - 0.82) < 0.03, 5);
    press();
    run(() => b.phase !== "roll" && b.phase !== "settle", 20);
    g.stage.render = draw;
    return b.frames[0][0];
  });
  check(bowled >= 5, "a ball down the middle takes pins with it", bowled);
  await shot("06-bowl");
  await tap("back");

  // The strip.
  const raced = await get(() => {
    const g = window.__GAME__;
    g.setPlace("street");
    g.begin(g.race, "race");
    g.race.start();
    const draw = g.stage.render;
    g.stage.render = () => {};
    for (let i = 0; i < 4 * 60; i++) g.tick(1 / 60);
    g.input.hold("up", true);
    for (let i = 0; i < 5 * 60; i++) g.tick(1 / 60);
    g.input.hold("up", false);
    g.stage.render = draw;
    return { phase: g.race.phase, prog: g.race.prog, rivals: g.race.rivals.map((r) => r.s) };
  });
  check(raced.phase === "go" && raced.prog > 60 && raced.rivals.every((s) => s > 60), "the race starts and everyone gets off the line", raced);
  await shot("07-race");
  await tap("back");
  await page.evaluate(() => window.__GAME__.exitCar(true));

  // The Fun House.
  const fun = await get(() => {
    const g = window.__GAME__;
    g.setPlace("fun");
    g.visitTickets = 0;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (cond, max) => {
      for (let i = 0; i < max * 60 && !cond(); i++) g.tick(1 / 60);
    };
    g.begin(g.whack, "whack");
    g.whack.start();
    run(() => g.whack.moles.some((m) => m.up > 0 && m.show > 0.6 && m.kind !== 2), 8);
    g.whack.hit(g.whack.moles.findIndex((m) => m.up > 0 && m.show > 0.6 && m.kind !== 2));
    const whack = g.whack.score;
    g.whack.quit();
    g.begin(g.popshot, "hoops");
    g.popshot.start();
    g.popshot.charge = 0.8;
    g.popshot.throwBall();
    run(() => g.popshot.made > 0, 4);
    const pop = g.popshot.made;
    g.popshot.quit();
    g.begin(g.pit, "pit");
    g.pit.start();
    run(() => false, 1);
    g.pit.quit();
    g.begin(g.bounce, "bounce");
    g.bounce.start();
    run(() => false, 1);
    g.bounce.quit();
    g.setPlace("laser");
    g.begin(g.laser, "laser");
    g.laser.start();
    run(() => g.laser.phase === "go", 5);
    const laser = g.laser.phase;
    g.laser.quit();
    run(() => g.place === "fun" && g.mode === "walk", 4);
    g.setPlace("street");
    g.begin(g.kart, "kart");
    g.kart.start();
    run(() => g.kart.phase === "go", 5);
    g.input.hold("up", true);
    run(() => false, 3);
    g.input.hold("up", false);
    const kart = g.kart.prog;
    g.kart.quit();
    run(() => g.place === "fun" && g.mode === "walk", 4);
    g.stage.render = draw;
    return { whack, pop, laser, kart, place: g.place, mode: g.mode };
  });
  check(fun.whack >= 10, "a mole can be whacked", fun.whack);
  check(fun.pop === 1, "the hoop machine scores a clean throw", fun.pop);
  check(fun.laser === "go", "laser tag starts");
  check(fun.kart > 10, "the kart drives", fun.kart);
  check(fun.place === "fun" && fun.mode === "walk", "every attraction hands the controls back", fun);
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.warp(g.rooms.fun.spawn.x, g.rooms.fun.spawn.z - 6, Math.PI);
  });
  await shot("08-funhouse");
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.cabinet = "stacker";
    g.open("arcade");
  });
  await page.getByText("Start", { exact: true }).first().waitFor({ timeout: 10000 });
  check(true, "an arcade cabinet opens");
  check(errors.length === 0, "no page errors", errors);
  console.log("Memphis smoke passed.");
} finally {
  await browser.close();
}
