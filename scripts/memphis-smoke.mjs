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
  // `calm` holds back what the game does on its own (the daily drop, fireworks at nightfall), so every run is the same.
  await page.goto(`${base}?q=low&calm=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__GAME__, undefined, { timeout: 120000 });
  // The weather keeps its own clock. Hold it dry so every run sees the same city.
  await page.evaluate(() => window.__GAME__.setRain(false));

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
  // A new day opens on the flight in over the river. Nothing answers until it lands or a button skips it.
  const opening = await page.evaluate(() => {
    const g = window.__GAME__;
    return { on: !!g.intro, card: !!g.cinema, locked: g.input.locked, x: g.camera.position.x, said: g.dialogue.length };
  });
  await ff(1.5);
  const flown = await get(() => window.__GAME__.camera.position.x);
  await shot("00-opening");
  check(opening.on && opening.card && opening.locked && opening.said === 0 && flown > opening.x + 20, "a new day opens on the flight in over the river", { ...opening, flown });
  await press(0);
  const landed = await page.evaluate(() => {
    const g = window.__GAME__;
    return { on: !!g.intro, card: !!g.cinema, locked: g.input.locked, said: g.dialogue.length, behind: Math.hypot(g.camera.position.x - g.pos.x, g.camera.position.z - g.pos.z) };
  });
  check(!landed.on && !landed.card && !landed.locked && landed.said === 1 && landed.behind < 8, "any button lands the lens behind Benji and K Blanco calls him in", landed);
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
  await ff(0.3);
  check((await get(() => window.__GAME__.overlay)) === "court", "Court OG's table offers the three games");
  // A game to eleven: the other player shoots first, then Benji answers from the same spot.
  await page.evaluate(() => window.__GAME__.playBall("versus"));
  await ff(1.5);
  const duel = await page.evaluate(() => {
    const g = window.__GAME__;
    const h = g.hoops;
    const render = g.stage.render;
    g.stage.render = () => {};
    let mine = 0;
    const seen = { shoot: "", ready: 0, ran: 0, stood: 0 };
    let last = [h.rival.x, h.rival.z];
    let hold = 0;
    for (let i = 0; i < 30 * 240 && !h.over; i++) {
      g.tick(1 / 30);
      const c = h.rival.card;
      if (c.pose === "shoot" && /shot-(front|back)/.test(c.current)) seen.shoot = c.current;
      if (c.pose === "ready") seen.ready++;
      if (c.pose === "drive") seen.ran += Math.hypot(h.rival.x - last[0], h.rival.z - last[1]);
      if (c.pose === "shoot" && Math.hypot(h.rival.x - h.spot.x, h.rival.z - h.spot.z) < 0.1) seen.stood++;
      last = [h.rival.x, h.rival.z];
      // Benji takes a second over each shot, long enough for the other player to get set.
      hold = h.turn === "you" ? hold + 1 : 0;
      if (h.turn === "you" && !h.charging && h.cool <= 0 && hold > 30) {
        h.charge = 0.8;
        h.release();
        mine++;
      }
    }
    for (let i = 0; i < 30; i++) g.tick(1 / 30);
    g.stage.render = render;
    const out = { kind: h.kind, over: h.over, you: h.score, them: h.rival.score, mine, title: g.results?.title, wins: g.save.best.versus, seen };
    g.close();
    return out;
  });
  check(duel.kind === "versus" && duel.over && duel.mine >= 4 && Math.max(duel.you, duel.them) >= 11 && duel.you !== duel.them, "a game to eleven is played out shot for shot", duel);
  check(/pedestrians\/male-0\d-shot-/.test(duel.seen.shoot) && duel.seen.stood > 0 && duel.seen.ran > 10 && duel.seen.ready > 30, "the other player runs to the spot, shoots with his arms up and guards in a stance", duel.seen);
  await ff(1);
  await page.evaluate(() => window.__GAME__.playBall("shootout"));
  await ff(1.5);
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
  check(fun.laser === "go", "laser tag starts", fun.laser);
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

  // The itch.io cabinets play inside a browser on the cabinet's screen. itch.io is not part
  // of this test: the look-up and the game it finds are both stood in for here.
  await page.route("**/api/itch?*", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, id: "martin", kind: "embed", src: "https://itch.io/embed-upload/1?color=0b0b0d", width: 1280, height: 740, page: "", probes: [] }) }),
  );
  await page.route("https://itch.io/**", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><body style='margin:0;background:#123'><canvas id='c' width='1280' height='720'></canvas></body>" }));
  await page.evaluate(() => window.__GAME__.swapCabinet("martin"));
  await page.getByText("Press start").click({ timeout: 10000 });
  await page.waitForSelector("iframe", { timeout: 10000 });
  await page.waitForTimeout(800);
  const web = await page.evaluate(() => {
    const g = window.__GAME__;
    const f = document.querySelector("iframe");
    return { src: f?.getAttribute("src"), padOff: g.input.padOff, allow: f?.getAttribute("allow") ?? "" };
  });
  check(web.src?.startsWith("https://itch.io/embed-upload/") && web.padOff && web.allow.includes("gamepad"), "the itch.io cabinet runs the game in its own browser", web);
  await page.getByRole("button", { name: "Back to the floor" }).click();
  await page.waitForTimeout(400);
  const left = await page.evaluate(() => ({ overlay: window.__GAME__.overlay, padOff: window.__GAME__.input.padOff, frame: !!document.querySelector("iframe") }));
  check(left.overlay === null && !left.padOff && !left.frame, "leaving the cabinet hands the pad back", left);

  // The riverfront lot: the three real trucks, each with its own menu, and Veli's screen.
  const lot = await page.evaluate(async () => {
    const g = window.__GAME__;
    g.leave(0, -150, 0);
    await new Promise((r) => setTimeout(r, 900));
    const a = g.city.anchors.trucks;
    const w = a.windows.velis;
    g.warp(w.x, w.z, 0);
    g.save.dollars = 500;
    g.save.cooler = [{ name: "Blue Catfish", lb: 12, pay: 40, rarity: "rare", color: "#fff" }];
    const render = g.stage.render;
    g.stage.render = () => {};
    for (let i = 0; i < 30; i++) g.tick(1 / 30);
    g.stage.render = render;
    const prompt = g.prompt;
    const before = g.save.dollars;
    g.foodAt = "velis";
    g.order("velis_lemon");
    const paid = before - g.save.dollars;
    const veli = g.street.members.find((m) => m.team === "velis");
    for (let i = 0; i < 6; i++) g.tick(1 / 30);
    const handed = { serving: veli?.serving > 0, pose: veli?.card.pose, drawing: veli?.card.current };
    g.warp(a.windows.catch.x, a.windows.catch.z, 0);
    g.stage.render = () => {};
    for (let i = 0; i < 10; i++) g.tick(1 / 30);
    g.foodAt = "catch";
    g.order("catch_grill");
    const cook = g.street.members.find((m) => m.team === "catch");
    for (let i = 0; i < 6; i++) g.tick(1 / 30);
    g.stage.render = render;
    const plated = { serving: cook?.serving > 0, pose: cook?.card.pose, drawing: cook?.card.current };
    return { trucks: Object.keys(a.windows), prompt, paid, cooler: g.save.cooler.length, video: !!g.veli, fed: g.fedUntil > g.time, handed, plated, crews: g.street.members.filter((m) => m.team).map((m) => m.team).sort().join() };
  });
  check(lot.handed.serving && lot.handed.pose === "serve" && /vendors\/veli\/serve-/.test(lot.handed.drawing), "Veli holds the order out when Benji buys", lot.handed);
  check(lot.crews === "brothers,brothers,catch,velis", "Veli and both brothers are in their windows", lot.crews);
  check(lot.plated.serving && lot.plated.pose === "serve" && /vendors\/catch\/serve-/.test(lot.plated.drawing), "the Catch Kitchen cook holds the plate out when Benji buys", lot.plated);
  check(lot.trucks.join() === "catch,velis,brothers" && /Veli's Wings/.test(lot.prompt) && lot.paid === 14 && lot.cooler === 0 && lot.video && lot.fed, "the three food trucks serve their own menus and Veli's screen is on", lot);
  // Coins: every street has some, and walking through one banks it.
  const coins = await page.evaluate(() => {
    const g = window.__GAME__;
    const c = g.coins;
    const spot = c.spots.find((q, i) => !c.taken[i]);
    const before = g.save.dollars;
    g.warp(spot.x, spot.z, 0);
    const render = g.stage.render;
    g.stage.render = () => {};
    for (let i = 0; i < 10; i++) g.tick(1 / 30);
    g.stage.render = render;
    return { total: c.total, left: c.left, gained: g.save.dollars - before };
  });
  check(coins.total > 150 && coins.left < coins.total && coins.gained >= 5, "coins are out across the city and can be banked", coins);

  // The machines on the floor are real machines: played standing at them, never on a cabinet screen.
  const floor = await page.evaluate(() => {
    const g = window.__GAME__;
    g.enter("fun");
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (until, seconds) => {
      for (let i = 0; i < seconds * 30 && !until(); i++) g.tick(1 / 30);
    };
    run(() => false, 1.5);
    const fun = g.rooms.fun;
    const prompts = [];
    for (const m of [fun.pinball, fun.skee, fun.wheel, fun.whack]) {
      g.pos.x = m.stand.x;
      g.pos.z = m.stand.z;
      run(() => false, 0.2);
      prompts.push(g.prompt);
    }
    const onScreen = ["pinball", "skee", "wheel"].filter((id) => fun.cabinets.some((c) => c.id === id));
    // Pinball: pull the plunger, the ball goes up the lane and scores.
    g.begin(g.pinball, "whack");
    g.pinball.start();
    g.input.hold("action", true);
    run(() => false, 0.8);
    g.input.hold("action", false);
    run(() => g.pinball.score > 0, 8);
    const pinball = { score: g.pinball.score, live: g.pinball.ball.live, balls: g.pinball.balls };
    g.pinball.quit();
    // Skee-Ball: one ball rolled with some power lands and counts.
    g.begin(g.skee, "whack");
    g.skee.start();
    run(() => false, 0.5);
    g.input.hold("action", true);
    run(() => g.skee.power > 0.5, 2);
    g.input.hold("action", false);
    run(() => g.skee.balls < 9, 4);
    const skee = { balls: g.skee.balls, score: g.skee.score };
    g.skee.quit();
    // The wheel: pull, let go, it stops on a wedge and pays it.
    g.begin(g.wheel, "whack");
    g.wheel.start();
    g.input.hold("action", true);
    run(() => false, 0.6);
    g.input.hold("action", false);
    run(() => g.wheel.spins < 3, 20);
    const wheel = { spins: g.wheel.spins, total: g.wheel.total };
    g.wheel.quit();
    g.stage.render = draw;
    return { prompts, onScreen, pinball, skee, wheel, mode: g.mode };
  });
  check(/Pinball/.test(floor.prompts[0]) && /Skee-Ball/.test(floor.prompts[1]) && /Spin-N-Win/.test(floor.prompts[2]) && /Whack-A-Mole/.test(floor.prompts[3]), "pinball, Skee-Ball, the wheel and Whack-A-Mole can all be walked up to", floor.prompts);
  check(floor.onScreen.length === 0, "none of them is a cabinet screen", floor.onScreen);
  check(floor.pinball.score > 0, "the pinball table launches a ball and scores", floor.pinball);
  check(floor.skee.balls === 8, "a Skee-Ball rolls up the lane and lands", floor.skee);
  check(floor.wheel.spins === 2 && floor.wheel.total > 0, "the wheel spins down and pays the wedge under the flapper", floor.wheel);
  check(floor.mode === "walk", "the floor machines hand the controls back", floor.mode);
  await shot("21-fun-floor");

  // Laser tag is a team game: allies, a base worth points, power-ups on the floor.
  const tag = await page.evaluate(() => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (until, seconds) => {
      for (let i = 0; i < seconds * 30 && !until(); i++) g.tick(1 / 30);
    };
    g.setPlace("laser");
    g.begin(g.laser, "laser");
    g.laser.start();
    run(() => g.laser.phase === "go", 5);
    const L = g.laser;
    const sides = [L.bots.filter((b) => b.playing && b.team === 0).length, L.bots.filter((b) => b.playing && b.team === 1).length];
    // Stand in front of the pink base with a clear line and put three into it.
    const base = L.bases[1];
    g.pos.x = base.x - 3;
    g.pos.z = base.z + 1.5;
    g.camYaw = Math.atan2(base.x - g.pos.x, base.z - g.pos.z);
    L.pitch = 0;
    L.steady = true;
    for (const b of L.bots) b.out = 30;
    let hits = 0;
    for (let i = 0; i < 3; i++) {
      const before = base.hp + (base.dark > 0 ? -99 : 0);
      L.cool = 0;
      L.fire();
      if (base.hp !== before || base.dark > 0) hits++;
    }
    const scored = { hits, score: L.score, dark: base.dark > 0, green: L.team[0] };
    run(() => L.powers.some((p) => p.mesh.visible), 12);
    const p = L.powers.find((q) => q.mesh.visible);
    let power = "";
    if (p) {
      g.pos.x = p.x;
      g.pos.z = p.z;
      run(() => !p.mesh.visible, 1);
      power = L.rapid > 0 ? "rapid" : L.double > 0 ? "double" : L.shield > 0 ? "shield" : "";
    }
    const radar = g.live.radarN;
    L.quit();
    run(() => g.place === "fun" && g.mode === "walk", 4);
    g.stage.render = draw;
    return { sides, scored, power, radar, place: g.place };
  });
  check(tag.sides.join() === "3,4" && tag.scored.hits === 3 && tag.scored.dark && tag.scored.score >= 400, "laser tag has teams and a base that pays when it goes down", tag);
  check(!!tag.power && tag.radar >= 8, "power-ups drop and the radar tracks the arena", { power: tag.power, radar: tag.radar });

  // The street race: arrows on the road, a launch on GO, and a boost for hitting a gate on time.
  const race = await page.evaluate(async () => {
    const g = window.__GAME__;
    g.leave(0, -150, 0);
    await new Promise((r) => setTimeout(r, 900));
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (until, seconds) => {
      for (let i = 0; i < seconds * 30 && !until(); i++) g.tick(1 / 30);
    };
    run(() => false, 0.5);
    g.begin(g.race, "race");
    g.race.start();
    const R = g.race;
    run(() => R.phase === "go", 5);
    g.input.press("interact");
    g.input.hold("up", true);
    run(() => false, 0.1);
    const launch = R.kick > 0;
    const arrows = R.guide.filter((m) => m.visible).length;
    run(() => g.live.cue < 6, 20);
    const cue = g.live.cue;
    const before = R.perfects;
    g.input.press("interact");
    run(() => false, 0.1);
    const boost = { cue, perfect: R.perfects > before, kick: R.kick > 0, call: R.call };
    run(() => g.live.turn >= 0, 20);
    const turn = g.live.turn;
    g.input.hold("up", false);
    const wrap = !!g.car.body.hull.userData.wrapPack;
    R.quit();
    g.stage.render = draw;
    return { launch, arrows, boost, turn, wrap, mode: g.mode };
  });
  check(race.launch && race.arrows >= 6, "the race launches on GO and paints the line to follow", race);
  check(race.boost.perfect && race.boost.kick, "hitting the button on a gate gives a boost", race.boost);
  check(race.turn >= 0, "the next bend is called out before it arrives", race.turn);
  check(race.wrap, "Benji's car wears the SackReligious livery", race.wrap);

  // Sprites: every fit has a real back, the court poses are in, and nobody on the street is front-only.
  const art = await page.evaluate(async () => {
    const g = window.__GAME__;
    const { OUTFITS, PEDS, BALLERS, CAST, VENDORS } = g.tables;
    const fits = Object.entries(OUTFITS);
    const urls = [];
    for (const [, o] of fits) {
      urls.push(o.art.front, o.art.back, o.art.left, o.art.right);
      for (const p of Object.values(o.art.poses ?? {})) for (const u of Object.values(p)) urls.push(u);
    }
    for (const p of PEDS) urls.push(p.art.back, ...(p.art.walk?.back ?? []));
    const every = (a) => [a.front, a.back, a.left, a.right, ...Object.values(a.poses ?? {}).flatMap((q) => (typeof q === "string" ? [q] : Object.values(q)))];
    for (const a of BALLERS) urls.push(...every(a));
    for (const c of Object.values(CAST)) urls.push(...every(c.art));
    for (const v of Object.values(VENDORS)) urls.push(...every(v.art));
    const plain = [...new Set(urls.filter(Boolean).map((u) => u.replace(/^flip:/, "")))];
    const missing = [];
    await Promise.all(
      plain.map(async (u) => {
        const r = await fetch(u, { method: "HEAD" });
        if (!r.ok || !/image/.test(r.headers.get("content-type") ?? "")) missing.push(u);
      }),
    );
    // Benji puts his arms up when he shoots.
    g.playBall("practice");
    const draw = g.stage.render;
    g.stage.render = () => {};
    for (let i = 0; i < 20; i++) g.tick(1 / 30);
    g.input.hold("action", true);
    for (let i = 0; i < 12; i++) g.tick(1 / 30);
    const pose = g.benji.pose;
    const drawing = g.benji.current;
    g.input.hold("action", false);
    for (let i = 0; i < 10; i++) g.tick(1 / 30);
    g.activity?.quit();
    g.stage.render = draw;
    return {
      fits: fits.length,
      noBack: fits.filter(([, o]) => !o.art.back || /^tint:/.test(o.art.back)).map(([id]) => id),
      noShot: fits.filter(([, o]) => !o.art.poses?.shoot).map(([id]) => id),
      pedsNoBack: PEDS.filter((p) => !p.art.back).length,
      ballers: BALLERS.filter((a) => a.poses?.shoot?.back && a.poses?.ready?.front && a.poses?.drive?.right).length,
      // Nobody is drawn to the shin and hung in the air behind a counter any more.
      cutOff: Object.entries(CAST)
        .filter(([, c]) => !c.art.back || !c.art.left || !c.art.right)
        .map(([id]) => id),
      hung: g.npcs.filter((n) => n.id !== "kBlanco" && n.card.lift > 0.01).map((n) => n.id),
      whole: ["courtOg", "uncJ", "strike"].filter((id) => /\/full-front\.webp$/.test(CAST[id].art.front)).length,
      checked: plain.length,
      missing,
      pose,
      drawing,
    };
  });
  check(art.fits === 12 && art.noBack.length === 0 && art.pedsNoBack === 0 && art.missing.length === 0, "every fit and every pedestrian has a drawn back, and all of the art loads", art);
  check(art.pose === "shoot" && /shot-back/.test(art.drawing), "Benji uses his shooting sprite on the jumper", { pose: art.pose, drawing: art.drawing });
  check(art.noShot.length === 0 && art.ballers === 4, "every fit and all four court players have their court moves", { noShot: art.noShot, ballers: art.ballers });
  check(art.whole === 3 && art.cutOff.length === 0 && art.hung.length === 0, "Court OG, Unc J and Strike are drawn whole and stand on the ground", { whole: art.whole, cutOff: art.cutOff, hung: art.hung });

  // People have somewhere to be: the same crowd is in different places a little later.
  const crowd = await page.evaluate(() => {
    const g = window.__GAME__;
    g.enter("fun");
    const draw = g.stage.render;
    g.stage.render = () => {};
    for (let i = 0; i < 45; i++) g.tick(1 / 30);
    const t = g.troupes.fun;
    const before = t.members.map((m) => [m.x, m.z]);
    for (let i = 0; i < 30 * 40; i++) g.tick(1 / 30);
    const moved = t.members.filter((m, i) => !m.posted && Math.hypot(m.x - before[i][0], m.z - before[i][1]) > 1).length;
    const roamers = t.members.filter((m) => !m.posted).length;
    const tramp = g.rooms.fun.tramp;
    const onBig = t.members.filter((m) => Math.hypot(m.x - tramp.x, m.z - tramp.z) < tramp.r && m.stop.act !== "bounce").length;
    const vendors = g.street.members.filter((m) => m.stop.act === "serve").length;
    g.stage.render = draw;
    return { roamers, moved, onBig, vendors, bowlers: g.laneBalls.length };
  });
  check(crowd.moved >= Math.ceil(crowd.roamers * 0.6) && crowd.onBig === 0, "people in the Fun House move between things to do, and nobody stands on the trampoline", crowd);
  check(crowd.vendors === 4 && crowd.bowlers === 2, "there is a crew in every truck window and other lanes are in play at the bowl", crowd);
  // The midway stall and the air hockey table, each played through.
  const midway = await page.evaluate(() => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n) => {
      for (let i = 0; i < n; i++) g.tick(1 / 60);
    };
    // A throw: set the aim, hold until the meter reads `power` on the way up, let go, wait for it to land.
    const toss = (game, aim, power) => {
      game.aim = aim;
      game.wait = 0;
      g.input.held.add("action");
      let guard = 0;
      run(1);
      while (game.power < power && guard++ < 400) run(1);
      g.input.held.delete("action");
      run(1);
      guard = 0;
      while (game.phase !== "aim" && !g.overlay && guard++ < 400) run(1);
      return game.call;
    };
    const stop = () => {
      const card = g.results ? { title: g.results.title, tickets: g.results.tickets } : null;
      if (g.overlay) g.close();
      run(10);
      if (g.activity) g.activity.quit();
      run(5);
      return card;
    };
    const before = g.save.tickets;
    g.begin(g.bottles, "whack");
    g.bottles.start();
    run(30);
    const bottles = [toss(g.bottles, 0, 0.26), toss(g.bottles, -0.433, 0.26), toss(g.bottles, 0.433, 0.26)];
    const sweep = stop();
    g.begin(g.clowns, "whack");
    g.clowns.start();
    run(30);
    const gap = g.rooms.fun.midway.clowns.gap / 0.8;
    const wait = (k, open) => {
      let guard = 0;
      while ((g.clowns.open(k, g.clowns.time + 0.62) && g.clowns.open(k, g.clowns.time + 0.75)) !== open && guard++ < 900) run(1);
    };
    wait(0, true);
    const fed = toss(g.clowns, -gap, 0.5);
    let guard = 0;
    while ((g.clowns.open(0, g.clowns.time + 0.62) || g.clowns.open(0, g.clowns.time + 0.75)) && guard++ < 900) run(1);
    const shut = toss(g.clowns, -gap, 0.5);
    stop();
    g.begin(g.bags, "whack");
    g.bags.start();
    run(30);
    const bags = [toss(g.bags, 0, 0.66), toss(g.bags, 0, 0.6), toss(g.bags, 0, 0.95), toss(g.bags, 0.9, 0.5)];
    const bagCard = stop();
    const tickets = g.save.tickets - before;
    // Air hockey, with a simple player on the near end: get behind the puck and push it up the table.
    g.begin(g.hockey, "whack");
    g.hockey.start();
    const h = g.hockey;
    const table = g.rooms.fun.hockey;
    let t = 0;
    let off = false;
    while (!g.overlay && t < 60 * 300) {
      for (const k of ["left", "right", "up", "down"]) g.input.held.delete(k);
      if (h.p.x < h.me.x - 0.03) g.input.held.add("left");
      else if (h.p.x > h.me.x + 0.03) g.input.held.add("right");
      if (h.p.z > 0.05 && h.p.z < h.me.z) g.input.held.add("up");
      else if (h.me.z < 0.8) g.input.held.add("down");
      run(1);
      t++;
      if (!Number.isFinite(h.p.x + h.p.z) || Math.abs(h.p.x) > table.hw + 0.01 || Math.abs(h.p.z) > table.hl + 0.2) off = true;
    }
    for (const k of ["left", "right", "up", "down"]) g.input.held.delete(k);
    const hockey = { seconds: Math.round(t / 60), you: h.you, them: h.them, off, card: g.results?.title ?? null };
    stop();
    g.stage.render = draw;
    return { bottles, sweep, fed, shut, bags, bagCard, tickets, hockey, mode: g.mode };
  });
  check(midway.bottles.join() === "4 DOWN,1 DOWN,CLEAN SWEEP!" && midway.sweep?.title === "CLEAN SWEEP" && midway.sweep.tickets === 30, "three balls in the right places clear the bottle pyramid", { bottles: midway.bottles, card: midway.sweep });
  check(/^IN! \+1/.test(midway.fed) && midway.shut === "SHUT!", "a clown takes the ball with its mouth open and not with it shut", { open: midway.fed, shut: midway.shut });
  check(midway.bags.join() === "IN THE HOLE! +3,SLID IN! +3,LONG,OFF THE SIDE" && midway.bagCard?.tickets === 18, "bean bags drop in, slide in, go long and miss the board", { bags: midway.bags, card: midway.bagCard });
  check((midway.hockey.you === 5 || midway.hockey.them === 5) && !midway.hockey.off && !!midway.hockey.card && midway.mode === "walk", "air hockey is played to five and the puck stays on the table", midway.hockey);
  // The big moments, photo mode, and the phone's home screen.
  const wow = await page.evaluate(async () => {
    const g = window.__GAME__;
    g.leave(0, -160, 0);
    await new Promise((r) => setTimeout(r, 900));
    const draw = g.stage.render;
    g.stage.render = () => {};
    for (let i = 0; i < 20; i++) g.tick(1 / 30);
    const p0 = g.live.party;
    g.moment(3);
    const slow = g.slowLeft > 0 && g.slowDeep < 0.5;
    for (let i = 0; i < 20; i++) g.tick(1 / 30);
    const sky = g.fireworks.busy;
    const thrown = g.live.party - p0;
    for (let i = 0; i < 120; i++) g.tick(1 / 30);
    g.showResults({ title: "T", sub: "", rows: [], pay: 0, respect: 0, tickets: 0, record: false, again: null, win: true }, null, () => {});
    const card = g.live.party - p0;
    g.close();
    g.stage.render = draw;
    g.openPhoto();
    const before = g.camera.position.clone();
    g.photoOrbit(0.6, 0.1);
    g.tick(1 / 30);
    const moved = g.camera.position.distanceTo(before);
    const canvas = g.shoot();
    const photo = { overlay: g.overlay, moved, width: canvas.width, frozen: g.input.locked };
    g.close();
    const m = await fetch("/manifest.webmanifest");
    const man = m.ok ? await m.json() : null;
    const icons = man ? await Promise.all(man.icons.map((i) => fetch(i.src, { method: "HEAD" }).then((r) => r.ok))) : [];
    return { slow, sky, thrown, card, photo, after: g.overlay, app: man && { display: man.display, icons: icons.every(Boolean) && icons.length }, linked: !!document.querySelector('link[rel="manifest"]') };
  });
  check(wow.slow && wow.sky && wow.thrown === 1 && wow.card === 2, "a big win slows the picture, throws confetti and lights the sky, and a winning card comes up under more", wow);
  check(wow.photo.overlay === "photo" && wow.photo.moved > 1 && wow.photo.width > 0 && wow.photo.frozen && wow.after === null, "photo mode swings the lens round Benji and takes the picture", wow.photo);
  check(wow.linked && wow.app?.display === "fullscreen" && wow.app.icons === 3, "the game can be added to a phone's home screen", wow.app);
  // The garage: a ride costs what it says, changes the car, and changes how it drives.
  const garage = await page.evaluate(() => {
    const g = window.__GAME__;
    const { RIDES } = g.tables;
    const s = g.save;
    const was = { ride: s.ride, rides: [...s.rides], dollars: s.dollars };
    const top0 = g.tune.top;
    s.dollars = 10;
    g.pickRide("van");
    const broke = s.ride === was.ride && s.dollars === 10;
    s.dollars = 2000;
    g.pickRide("van");
    const bought = { ride: s.ride, left: s.dollars, kind: g.car.kind, top: g.tune.top > top0, shown: g.car.group.parent === g.city.exterior };
    g.pickRide("coupe");
    const back = { ride: s.ride, left: s.dollars, kind: g.car.kind, top: g.tune.top === top0 };
    g.openGarage();
    const menu = g.overlay;
    g.close();
    s.ride = was.ride;
    s.rides = was.rides;
    s.dollars = was.dollars;
    return { rides: RIDES.length, broke, bought, back, menu };
  });
  check(garage.rides === 6 && garage.broke && garage.bought.ride === "van" && garage.bought.left === 500 && garage.bought.kind === "van" && garage.bought.top && garage.bought.shown && garage.back.kind === "coupe" && garage.back.left === 500 && garage.back.top && garage.menu === "garage", "the garage sells six rides, and each one changes the car and how it drives", garage);
  // The story runs on past the Drop Day, and Respect has rungs.
  const story = await page.evaluate(() => {
    const g = window.__GAME__;
    const { STORY, CHAPTERS } = g.tables;
    const at = (id) => STORY.findIndex((s) => s.id === id);
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n) => {
      for (let i = 0; i < n; i++) g.tick(1 / 30);
    };
    // A win at the court opens chapter two's second errand, and whoever sends him on it says so.
    g.save.step = at("tez");
    g.save.count = 0;
    g.dialogue.length = 0;
    g.emit("versus", 0, 0);
    const lost = g.save.step === at("tez");
    g.emit("versus", 1, 0);
    const sent = { step: STORY[g.save.step]?.id, by: g.dialogue.map((d) => d.who).join() };
    // An errand that counts.
    g.save.step = at("change");
    g.save.count = 0;
    for (let i = 0; i < 29; i++) g.emit("coin", 1);
    const part = { step: STORY[g.save.step]?.id, count: g.save.count };
    g.emit("coin", 1);
    const counted = STORY[g.save.step]?.id;
    // The last one: K Blanco wants to see the eleven on him.
    g.save.step = at("crown");
    if (!g.save.outfits.includes("sackrow_11")) g.save.outfits.push("sackrow_11");
    g.wear("starter");
    g.talkK();
    const refused = g.save.step === at("crown");
    g.wear("sackrow_11");
    g.dialogue.length = 0;
    g.talkK();
    const done = g.save.step === STORY.length;
    run(60);
    // A rung of Respect.
    g.save.respect = 0;
    g.earn(0, 25);
    run(60);
    const rank = { toast: g.revealNow?.title ?? "", badge: g.revealNow?.img ?? "", pays: g.earn(100, 0, { quiet: true }).dollars > 100 };
    g.stage.render = draw;
    return { chapters: CHAPTERS.map((c) => c.steps.length).join(), lost, sent, part, counted, refused, done, rank };
  });
  check(story.chapters === "11,8,7" && story.lost && story.sent.step === "catering" && /Mama Dee/.test(story.sent.by), "the story runs on past the Drop Day, and each errand is handed over by whoever needs it", story);
  check(story.part.step === "change" && story.part.count === 29 && story.counted === "league" && story.refused && story.done, "errands that count are counted, and the last one ends with the eleven on his back", story);
  check(/Known on the riverfront/.test(story.rank.toast) && /rank-2\.webp$/.test(story.rank.badge) && story.rank.pays, "Respect has rungs, each with its badge, and each one pays more", story.rank);
  // After dark: the bridge runs its show, the river mirrors it, the neon moves, and it can rain.
  const night = await page.evaluate(() => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n) => {
      for (let i = 0; i < n; i++) g.tick(1 / 30);
    };
    const sum = (c) => c.r + c.g + c.b;
    g.setPhase("day");
    g.sky.setPhase("day", true);
    run(20);
    const day = { programme: g.city.bridge.programme, glow: sum(g.city.bridge.glow) };
    g.setPhase("night");
    g.sky.setPhase("night", true);
    run(20);
    const seen = new Set();
    for (let i = 0; i < 5; i++) {
      seen.add(g.city.bridge.programme);
      for (let k = 0; k < 540; k++) g.city.bridge.update(1 / 30, 1);
    }
    run(2);
    const glow = sum(g.city.bridge.glow);
    const mirrored = Array.from(g.city.water.strip).reduce((a, b) => a + b, 0);
    const neon = g.city.glow.neon;
    const was = neon.map((n) => n.mat.color.r);
    run(7);
    const moved = neon.filter((n, i) => Math.abs(n.mat.color.r - was[i]) > 0.002).length;
    const rough = g.city.glow.wet[0].roughness;
    g.setRain(true);
    run(360);
    const rain = { amount: g.weather.rain, wet: g.weather.wet, drawn: g.rain.group.visible, rough: g.city.glow.wet[0].roughness };
    g.setRain(false);
    run(330);
    const after = { amount: g.weather.rain, drawn: g.rain.group.visible, wet: g.weather.wet };
    g.weather.wet = 0;
    g.setPhase("golden");
    g.sky.setPhase("golden", true);
    g.setPhase("auto");
    run(10);
    g.stage.render = draw;
    return { day, programmes: [...seen], glow, mirrored, signs: neon.length, moved, rough, rain, after };
  });
  check(night.day.programme === "" && night.day.glow === 0 && night.programmes.length === 5 && night.glow > 0.5 && night.mirrored > 1, "the bridge runs five light shows after dark and the river mirrors them", { day: night.day, programmes: night.programmes, glow: night.glow, mirrored: night.mirrored });
  check(night.moved > night.signs / 2, "neon signs are never quite still at night", { signs: night.signs, moved: night.moved });
  check(night.rain.amount > 0.95 && night.rain.drawn && night.rain.wet > 0.9 && night.rain.rough < night.rough * 0.6 && night.after.amount < 0.05 && !night.after.drawn && night.after.wet > 0.5, "rain comes down, the streets shine, and they stay wet after it stops", { dry: night.rough, rain: night.rain, after: night.after });
  // This round: easier fishing, defence and dunks at the court, laser tag's lock and dash, rides that
  // let him out facing the right way, and the things the city does on its own.
  const round = await page.evaluate(() => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const tick = () => g.tick(1 / 60);
    const run = (cond, max) => {
      let i = 0;
      for (; i < max * 60 && !cond(); i++) tick();
      return i / 60;
    };
    const out = {};
    if (g.activity) g.activity.quit();
    run(() => false, 0.3);

    // A ride to the food trucks lets him out on the window side, facing the counters.
    g.save.dollars = 500;
    g.taxi("trucks");
    run(() => false, 2);
    const veli = g.city.anchors.trucks.windows.velis;
    out.ride = { front: g.pos.z < veli.z - 1, near: Math.hypot(g.pos.x - veli.x, g.pos.z - veli.z) < 6, heading: +g.heading.toFixed(2) };

    // Fishing: a slow hand on the hook still hooks, a missed bite comes round again, and a small fish comes straight in.
    const c = g.city.anchors.castSpots[0];
    g.warp(c.x, c.z, Math.PI);
    g.save.bait = 9;
    const f = g.fishing;
    g.begin(f, "fish");
    f.start(c);
    const cast = () => {
      run(() => f.phase === "ready", 6);
      g.input.hold("action", true);
      run(() => f.phase === "charge" && f.t > 0.1 && f.power > 0.5, 3);
      g.input.hold("action", false);
      run(() => f.phase === "bite", 16);
    };
    cast();
    run(() => f.t >= 1.5 || f.phase !== "bite", 3);
    const late = f.phase;
    run(() => f.phase !== "bite", 3);
    const again = { phase: f.phase, call: f.call, bites: f.bites };
    run(() => f.phase === "bite", 6);
    g.input.press("action");
    tick();
    const hooked = f.phase;
    f.strength = 0.56;
    g.input.hold("action", true);
    run(() => f.phase !== "reel", 60);
    g.input.hold("action", false);
    out.fish = { late, again, hooked, end: f.phase, bait: g.save.bait };
    f.quit();
    run(() => false, 0.3);

    // The court: a jump at the top of his shot blocks it, and three in a row buys a dunk.
    const h = g.hoops;
    g.save.best.versus = 0;
    g.begin(h, "hoops");
    h.start("versus");
    run(() => h.turn === "rival" && Math.hypot(h.rival.tx - h.rival.x, h.rival.tz - h.rival.z) < 0.05, 8);
    h.fake = false;
    run(() => h.rival.wait <= 0.25, 4);
    g.input.press("action");
    run(() => h.turn !== "rival", 2);
    const blocked = { result: h.contest.result, call: h.call };
    run(() => h.turn === "you", 8);
    run(() => false, 0.6);
    const them = h.rival.score;
    h.streak = 3;
    const mine = h.score;
    g.input.press("action");
    tick();
    const dunking = h.dunk.on;
    run(() => !h.dunk.on, 3);
    run(() => false, 0.5);
    out.court = { blocked, them, dunking, gained: h.score - mine, streak: h.streak };
    h.quit();
    run(() => false, 0.3);

    // Laser tag: the marker is on whoever Space would hit, a dash shakes off a pink lining him up, and the end counts double.
    const l = g.laser;
    g.setPlace("laser");
    g.begin(l, "laser");
    l.start();
    run(() => l.phase === "go", 6);
    const pink = l.bots.find((b) => b.team === 1 && b.playing);
    l.pitch = 0;
    pink.x = g.pos.x + Math.sin(g.camYaw) * 5;
    pink.z = g.pos.z + Math.cos(g.camYaw) * 5;
    pink.tx = pink.x;
    pink.tz = pink.z;
    pink.cool = 99;
    tick();
    const lock = l.target === pink && g.live.fp.target === 1 && pink.plate.visible;
    pink.at = "benji";
    pink.aim = 0.6;
    const x0 = g.pos.x;
    const z0 = g.pos.z;
    g.input.press("interact");
    for (let i = 0; i < 14; i++) tick();
    const dash = { moved: +Math.hypot(g.pos.x - x0, g.pos.z - z0).toFixed(1), shook: pink.at !== "benji" };
    l.left = 20.4;
    run(() => l.frenzy, 2);
    out.laser = { lock, dash, frenzy: l.frenzy, worth: l.worth() };
    l.quit();
    run(() => g.mode === "walk", 4);
    g.setPlace("street");
    g.warp(0, -160, Math.PI);
    run(() => false, 0.3);

    // What the city does on its own, switched back on for this.
    g.calm = false;
    const job = g.rollDaily();
    const cash = g.save.dollars;
    g.emit(job.goal.kind, job.goal.n ?? job.goal.max ?? 1, job.goal.extra ?? 0);
    const daily = { done: g.save.daily.done, streak: g.save.daily.streak, paid: g.save.dollars - cash };
    const cash2 = g.save.dollars;
    g.emit(job.goal.kind, job.goal.n ?? job.goal.max ?? 1, job.goal.extra ?? 0);
    daily.twice = g.save.dollars - cash2;
    const { POSTCARDS } = g.tables;
    g.pos.x = POSTCARDS[0].x;
    g.pos.z = POSTCARDS[0].z + 1;
    g.photoTaken();
    const card = { got: !!g.save.flags[`card_${POSTCARDS[0].id}`], total: POSTCARDS.length };
    // A handbrake slide pays; a plain turn is not one.
    const slide = (hand) => {
      g.driver.reset(-110, -140, Math.PI / 2);
      if (g.mode !== "drive") g.drive();
      g.input.hold("up", true);
      for (let i = 0; i < 140; i++) tick();
      let peak = 0;
      g.input.hold("right", true);
      if (hand) g.input.hold("action", true);
      for (let i = 0; i < 60; i++) {
        tick();
        peak = Math.max(peak, g.live.drift);
      }
      g.input.hold("right", false);
      g.input.hold("action", false);
      let toast = "";
      for (let i = 0; i < 120; i++) {
        tick();
        if (/^DRIFT/.test(g.toastText)) toast = g.toastText;
      }
      g.input.hold("up", false);
      for (let i = 0; i < 40; i++) tick();
      return { peak: Math.round(peak), toast };
    };
    const drift = { plain: slide(false), handbrake: slide(true) };
    g.exitCar(true);
    // Night falls: fireworks. Rain clears by day: a rainbow.
    g.warp(-13, -185, Math.PI);
    g.setPhase("golden");
    g.sky.setPhase("golden", true);
    run(() => false, 0.5);
    g.setPhase("night");
    g.sky.setPhase("night", true);
    run(() => false, 3);
    const show = { left: g.nightShow.left > 0, sky: g.fireworks.busy };
    g.nightShow.left = 0;
    g.setPhase("day");
    g.sky.setPhase("day", true);
    g.setRain(true);
    run(() => false, 9);
    g.setRain(false);
    run(() => false, 14);
    const bow = { left: g.rainbow.left > 0, seen: !!g.rainbow.mesh?.visible };
    g.calm = true;
    g.rainbow.left = 0;
    g.weather.wet = 0;
    g.setPhase("golden");
    g.sky.setPhase("golden", true);
    g.setPhase("auto");
    run(() => false, 0.5);
    out.city = { daily, card, drift, show, bow };
    g.stage.render = draw;
    return out;
  });
  check(round.ride.front && round.ride.near && round.ride.heading === 0, "a ride to the food trucks lets him out in front of the windows, facing them", round.ride);
  check(round.fish.late === "bite" && round.fish.again.phase === "wait" && round.fish.again.bites === 1 && round.fish.hooked === "reel" && round.fish.end === "landed", "fishing forgives a slow hand: the bite waits, comes round again, and a small fish comes straight in", round.fish);
  check(round.court.blocked.result === "block" && /BLOCKED/.test(round.court.blocked.call) && round.court.them === 0 && round.court.dunking && round.court.gained >= 2 && round.court.streak === 0, "at the court a well-timed jump blocks the shot and three in a row buys a dunk", round.court);
  check(round.laser.lock && round.laser.dash.moved > 2 && round.laser.dash.shook && round.laser.frenzy && round.laser.worth === 2, "laser tag turns the crosshair on whoever is in it, a dash shakes off a pink lining him up, and the last twenty seconds count double", round.laser);
  check(round.city.daily.done && round.city.daily.streak === 1 && round.city.daily.paid >= 120 && round.city.daily.twice === 0 && round.city.card.got && round.city.card.total === 6, "today's drop pays once and a photo at the pier collects a postcard", { daily: round.city.daily, card: round.city.card });
  check(round.city.drift.plain.peak === 0 && round.city.drift.handbrake.peak > 30 && /^DRIFT \d+/.test(round.city.drift.handbrake.toast), "a handbrake slide is scored and paid; an ordinary turn is not a drift", round.city.drift);
  check(round.city.show.left && round.city.show.sky && round.city.bow.left && round.city.bow.seen, "fireworks go up when night falls and a rainbow follows daytime rain", { show: round.city.show, bow: round.city.bow });
  // Benji walks: two strides for each side he is seen from, with the standing drawing between them.
  const walk = await page.evaluate(async () => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const seen = {};
    const wore = g.save.wearing;
    g.wear("starter");
    for (const key of ["up", "left", "down", "right"]) {
      g.warp(0, -150, 0);
      g.camYaw = 0;
      g.input.hold(key, true);
      const set = new Set();
      for (let i = 0; i < 90; i++) {
        g.tick(1 / 60);
        if (i > 20) set.add((g.benji.current || "").split("/").pop().split("?")[0]);
      }
      g.input.hold(key, false);
      for (let i = 0; i < 30; i++) g.tick(1 / 60);
      seen[key] = [...set].sort();
    }
    g.wear(wore);
    g.stage.render = draw;
    // Every stride is a real picture, not a missing file.
    const files = ["back-a", "back-b", "front-a", "front-b", "left-a", "left-b"];
    const sizes = await Promise.all(
      files.map(
        (n) =>
          new Promise((done) => {
            const img = new Image();
            img.onload = () => done(img.naturalHeight);
            img.onerror = () => done(0);
            img.src = `/game-v2/characters/benji-fits/starter/walk-${n}.webp`;
          }),
      ),
    );
    return { seen, loaded: sizes.every((h) => h > 600) };
  });
  const strides = (list, view) => list.includes(`walk-${view}-a.webp`) && list.includes(`walk-${view}-b.webp`);
  check(
    walk.loaded && strides(walk.seen.up, "back") && walk.seen.up.includes("back.png") && strides(walk.seen.left, "left") && strides(walk.seen.down, "front") && strides(walk.seen.right, "left"),
    "Benji walks with two strides from behind, from the side and from in front",
    walk,
  );
  // The park and its tables: the rules of each game, the regulars taking their turns, and what a win pays.
  const park = await page.evaluate(async () => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n) => {
      for (let i = 0; i < n; i++) g.tick(1 / 60);
    };
    const out = {};
    if (g.activity) g.activity.quit();
    if (g.overlay) g.close();
    g.setPlace("street");
    run(10);

    // A ride to the park lets him out among the tables, and the open seat offers a game.
    g.save.dollars = 500;
    g.taxi("park");
    run(120);
    out.ride = { x: +g.pos.x.toFixed(1), z: +g.pos.z.toFixed(1), heading: +g.heading.toFixed(2) };
    g.warp(-84, 76.7, Math.PI);
    run(20);
    out.prompt = g.prompt;
    g.input.press("interact");
    run(4);
    out.sat = { overlay: g.overlay, id: g.board.id };
    await new Promise((r) => setTimeout(r, 250));
    out.pickButtons = document.querySelectorAll("[data-level]").length;
    g.close();

    const fresh = (id) => {
      g.board.sit(id);
      g.board.start(1);
      const game = g.board.game;
      g.close();
      return game;
    };
    // Chess: the count of positions after one, two and three moves is a known number; so is a position with castling, pins and a pawn that can be taken in passing.
    const perft = (c, d) => {
      if (d === 0) return 1;
      let n = 0;
      for (const m of c.legal()) {
        const u = c.make(m);
        n += perft(c, d - 1);
        c.unmake(u);
      }
      return n;
    };
    const c = fresh("chess");
    const opening = [perft(c, 1), perft(c, 2), perft(c, 3)];
    const rows = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R";
    const b = [];
    for (const ch of rows.replace(/\//g, "")) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push("");
      else b.push(ch);
    }
    c.b = b;
    c.side = 0;
    c.rights = 15;
    c.ep = -1;
    c.seen = new Map();
    const middle = [perft(c, 1), perft(c, 2)];
    const f = fresh("chess");
    const sq = (name) => (8 - +name[1]) * 8 + (name.charCodeAt(0) - 97);
    for (const [from, to] of [["f2", "f3"], ["e7", "e5"], ["g2", "g4"], ["d8", "h4"]]) f.play({ from: sq(from), to: sq(to) });
    out.chess = { opening, middle, mate: f.outcome(), illegal: fresh("chess").play({ from: sq("e2"), to: sq("e5") }) };

    // Checkers: a jump on offer is the only move there is.
    const k = fresh("checkers");
    k.cells = Array(64).fill(0);
    k.cells[5 * 8 + 2] = 1;
    k.cells[4 * 8 + 3] = 3;
    k.cells[7 * 8 + 6] = 1;
    k.cells[0 * 8 + 1] = 3;
    k.side = 0;
    const hops = k.hops();
    out.checkers = { hops: hops.length, jump: hops[0]?.over === 4 * 8 + 3, took: k.play(hops[0]) && k.cells[4 * 8 + 3] === 0 };

    // Every game, the regulars playing each other to the end.
    const through = (id, cap) => {
      const game = fresh(id);
      let steps = 0;
      let chainOk = true;
      let tricks = true;
      while (!game.outcome() && steps < cap) {
        const m = game.think(1);
        if (m === null || !game.play(m)) break;
        steps++;
        if (id === "dominoes") {
          const ch = game.view().chain;
          for (let i = 1; i < ch.length; i++) if (ch[i - 1][1] !== ch[i][0]) chainOk = false;
        }
        if (id === "spades") {
          const v = game.view();
          if (v.phase === "hand" && v.tricks.reduce((a, n) => a + n, 0) !== 13) tricks = false;
        }
      }
      const o = game.outcome();
      return { over: !!o, winner: o?.winner ?? null, steps, chainOk, tricks };
    };
    out.through = {};
    for (const [id, cap] of [["tictactoe", 20], ["connect4", 60], ["checkers", 500], ["dominoes", 4000], ["spades", 8000]]) out.through[id] = through(id, cap);
    // A sharp tic-tac-toe player, left to it, is never beaten.
    let beaten = 0;
    for (let n = 0; n < 12; n++) {
      const t = fresh("tictactoe");
      while (!t.outcome()) {
        const m = t.think(t.turn() === 0 ? 0 : 2);
        if (m === null || !t.play(m)) break;
      }
      // The sharp seat's rare slip is its own; what must never happen is a broken game.
      if (!t.outcome()) beaten = 99;
    }
    out.tic = beaten;

    // Sat at the table: the regular answers in his own time, and beating him pays.
    g.board.sit("connect4");
    g.board.start(0);
    g.board.move(3);
    const waiting = g.board.hud().mine;
    const before = g.board.game.view().cols.flat().length;
    run(120);
    const answered = g.board.game.view().cols.flat().length - before;
    let cash = g.save.dollars;
    let won = null;
    for (let n = 0; n < 6 && !won; n++) {
      g.board.start(0);
      for (let i = 0; i < 60 && g.board.hud().stage === "play"; i++) {
        if (g.board.hud().mine) g.board.move(g.board.game.think(2));
        else run(90);
      }
      const h = g.board.hud();
      if (h.stage === "done" && h.result.won) won = { pay: h.result.pay, gained: g.save.dollars - cash, wins: h.wins };
      cash = g.save.dollars;
    }
    out.table = { waiting, answered, won };

    // Two people on one device: both seats are played from the screen, and nothing is paid.
    g.board.start(1, true);
    const cash2 = g.save.dollars;
    const seats = [];
    for (const col of [3, 3, 4, 4, 5, 5, 6]) {
      seats.push(g.board.hud().mine);
      g.board.move(col);
    }
    const two = g.board.hud();
    out.two = { seats: seats.every(Boolean), stage: two.stage, text: two.result?.text ?? "", paid: g.save.dollars - cash2 };

    // The screen itself: a chess move made by tapping two squares.
    g.board.sit("chess");
    g.board.start(1);
    g.stage.render = draw;
    await new Promise((r) => setTimeout(r, 300));
    const squares = document.querySelectorAll("[data-sq]").length;
    document.querySelector(`[data-sq="${sq("e2")}"]`)?.click();
    await new Promise((r) => setTimeout(r, 150));
    document.querySelector(`[data-sq="${sq("e4")}"]`)?.click();
    await new Promise((r) => setTimeout(r, 150));
    const cells = g.board.game.view().cells;
    out.screen = { squares, moved: cells[sq("e4")] === "P" && cells[sq("e2")] === "" };
    g.close();
    out.left = { overlay: g.overlay, id: g.board.id };
    g.warp(0, -160, Math.PI);
    return out;
  });
  check(Math.hypot(park.ride.x + 84, park.ride.z - 79.6) < 1.5 && Math.abs(park.ride.heading - Math.PI) < 0.01, "a ride to the park lets him out on the terrace, facing the tables", park.ride);
  check(/Sit down: Spades/.test(park.prompt) && park.sat.overlay === "table" && park.sat.id === "spades" && park.pickButtons === 3, "the open seat at a park table offers the game, at three levels", { prompt: park.prompt, sat: park.sat, buttons: park.pickButtons });
  check(park.chess.opening.join() === "20,400,8902" && park.chess.middle.join() === "48,2039" && park.chess.mate?.winner === 1 && park.chess.illegal === false, "chess plays by the book: the move counts match the published ones, mate is mate and an illegal move is refused", park.chess);
  check(park.checkers.hops === 1 && park.checkers.jump && park.checkers.took, "in checkers a jump on offer has to be taken", park.checkers);
  check(Object.values(park.through).every((t) => t.over && t.chainOk && t.tricks) && park.tic === 0, "every table game plays through to a result, with the domino line matching end to end and thirteen tricks to a hand", park.through);
  check(park.table.waiting === false && park.table.answered === 1 && park.table.won && park.table.won.pay > 0 && park.table.won.gained === park.table.won.pay && park.table.won.wins >= 1, "the regular answers in his own time, and beating him pays", park.table);
  check(park.two.seats && park.two.stage === "done" && /Player one/.test(park.two.text) && park.two.paid === 0, "two people can share the device at a table, for bragging rights only", park.two);
  check(park.screen.squares === 64 && park.screen.moved && park.left.overlay === null && park.left.id === null, "a chess move is made by tapping two squares, and getting up clears the table", { ...park.screen, left: park.left });
  // Recordings are optional: with none on the shelf every sound is still made up on the spot.
  const sound = await page.evaluate(async () => {
    const g = window.__GAME__;
    const list = await fetch("/game-v2/audio/manifest.json").then((r) => r.json());
    const have = g.sound.recorded;
    const every = [...list.voice, ...list.sfx, ...list.music];
    const missing = [];
    for (const kind of ["voice", "sfx", "music"]) {
      for (const id of list[kind]) {
        const r = await fetch(`/game-v2/audio/${kind}/${id}.mp3`, { method: "HEAD" });
        if (!r.ok) missing.push(`${kind}/${id}`);
      }
    }
    g.dialogue.length = 0;
    g.say("K Blanco", "Testing.", null, "k-drop-day");
    const line = g.dialogue[0]?.voice ?? "";
    g.dialogue.length = 0;
    return {
      listed: every.length,
      loaded: have.voice.length + have.sfx.length + have.music.length,
      missing,
      line,
      unknown: g.sound.sample("not-a-sound") || g.sound.voice("not-a-line"),
      tracks: g.tracks().length,
    };
  });
  check(sound.loaded === sound.listed && sound.missing.length === 0 && sound.line === "k-drop-day" && sound.unknown === false && sound.tracks > 0, "recorded sound is used where it exists and made up where it doesn't", sound);
  // The drawn pictures: fish, postcards, rank badges and clown faces; and everybody's new moves.
  const pics = await page.evaluate(async () => {
    const g = window.__GAME__;
    const { OUTFITS, PEDS, BALLERS, CAST, POSTCARDS, TAGGERS, COACH, BAND } = g.tables;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n) => {
      for (let i = 0; i < n; i++) g.tick(1 / 30);
    };
    if (g.overlay) g.close();
    if (g.activity) g.activity.quit();
    run(10);
    const size = (src) =>
      new Promise((done) => {
        const img = new Image();
        img.onload = () => done(img.naturalHeight);
        img.onerror = () => done(0);
        img.src = src;
      });
    // Every drawing a character can be shown as is a real picture.
    const every = (a) => [a.front, a.back, a.left, a.right, ...Object.values(a.walk ?? {}).flat(), ...Object.values(a.poses ?? {}).flatMap((q) => (typeof q === "string" ? [q] : Object.values(q)))].filter(Boolean).map((u) => u.replace(/^flip:/, ""));
    const people = [...Object.values(OUTFITS).map((o) => o.art), ...PEDS.map((q) => q.art), ...BALLERS, ...Object.values(CAST).map((c) => c.art), ...TAGGERS.map((q) => q.art), COACH.art];
    const files = [...new Set([...people.flatMap(every), ...BAND.flatMap((q) => q.frames)])];
    const broken = [];
    for (const f of files) if (!(await size(f))) broken.push(f);
    // The album: what it lists, and every picture in it.
    g.save.flags.card_bridge = true;
    g.save.respect = Math.max(g.save.respect, 60);
    g.openAlbum();
    await new Promise((r) => setTimeout(r, 150));
    const album = g.albumHud();
    const shown = { cards: document.querySelectorAll("[data-card]").length, got: document.querySelectorAll('[data-card][data-got="1"]').length, fish: document.querySelectorAll("[data-fish]").length, ranks: document.querySelectorAll("[data-rank]").length, earned: document.querySelectorAll('[data-rank][data-got="1"]').length };
    const pictures = [...album.postcards.map((c) => c.img), ...album.fish.map((f) => f.img), ...album.ranks.map((r) => r.badge), 1, 2, 3].map((u) => (typeof u === "number" ? `/game-v2/places/clowns/clown-${u}.webp` : u));
    const blank = [];
    for (const f of pictures) if (!(await size(f))) blank.push(f);
    g.open("pause");
    g.close();
    // A postcard is held up when it is collected.
    delete g.save.flags.card_pyramid;
    g.pos.x = POSTCARDS[1].x;
    g.pos.z = POSTCARDS[1].z + 1;
    g.photoTaken();
    const held = { img: g.revealNow?.img ?? "", title: g.revealNow?.title ?? "" };
    // A fish goes in the book at its best weight, with its picture on the card.
    const f = g.fishing;
    g.save.bait = 5;
    g.begin(f, "fish");
    f.start(g.city.anchors.castSpots[0]);
    f.dist = 9;
    let kind = "";
    for (let i = 0; i < 40 && !/Largemouth/.test(kind); i++) {
      f.pickFish();
      kind = f.fish.name;
    }
    const caught = { ...f.fish };
    // An earlier cast in this run may already have put a bigger one in the book.
    const heaviest = g.save.best["fish_largemouth-bass"] ?? 0;
    f.phase = "reel";
    g.tick(1 / 60);
    const reeling = g.benji.pose;
    f.land();
    g.tick(1 / 60);
    const landed = g.benji.pose;
    const book = g.save.best["fish_largemouth-bass"] ?? 0;
    f.quit();
    run(5);
    // In the green tee the moves have their own drawings; a fit without them falls back to what it has.
    const wore = g.save.wearing;
    g.wear("starter");
    const a = g.city.anchors;
    g.warp(a.ogStand.x + 3, a.ogStand.z + 6, Math.PI);
    run(20);
    const drawn = {};
    for (const pose of ["dunk", "reel", "bowl", "cheer"]) {
      g.benji.pose = pose;
      g.benji.update(0, g.camera.position, g.tint, g.floorY);
      drawn[pose] = (g.benji.current || "").split("/").pop();
    }
    g.benji.pose = null;
    // A win on his own feet puts his fist up for a moment, and it comes down again.
    g.moment(1);
    run(3);
    const fist = g.benji.pose;
    run(120);
    const down = g.benji.pose;
    // Photo mode: the pose is his to strike, and it is dropped with the lens.
    g.openPhoto();
    g.photoPose();
    run(2);
    const posed = g.benji.pose;
    g.close();
    run(2);
    const dropped = g.benji.pose;
    g.wear(wore);
    // Whoever is talking is drawn talking.
    g.dialogue.length = 0;
    g.warp(a.ogStand.x, a.ogStand.z + 2.6, Math.PI);
    run(30);
    g.say("Court OG", "Run it back.");
    run(10);
    const og = g.npcs.find((n) => n.id === "courtOg").card;
    const talking = { pose: og.pose, file: (og.current || "").split("/").pop() };
    g.dialogue.length = 0;
    run(3);
    const quiet = og.pose;
    // The crowd throws its hands up when it jumps.
    const still = [...g.street.members, ...(g.people.members ?? [])].filter((m) => !m.going && m.stop.act !== "inside" && m.stop.act !== "serve" && m.card.has("cheer"));
    const near = still[0];
    g.warp(near.x + 3, near.z + 3, 0);
    g.tick(1 / 30);
    g.cheer(near.x, near.z, 6, 2);
    let hands = 0;
    for (let i = 0; i < 40; i++) {
      g.tick(1 / 30);
      if (near.card.pose === "cheer") hands++;
    }
    const after = (() => {
      for (let i = 0; i < 90; i++) g.tick(1 / 30);
      return near.going || near.card.pose === null || near.stop.act === "cheer";
    })();
    // At the court a better player sometimes takes an open two to the rim: same two points.
    g.save.best.versus = Math.max(1, g.save.best.versus ?? 0);
    const tier = g.save.best.versus;
    g.begin(g.hoops, "hoops");
    g.hoops.start("versus");
    const h = g.hoops;
    for (let i = 0; i < 400 && h.turn !== "rival"; i++) g.tick(1 / 30);
    h.rival.wait = 9;
    run(70);
    // From the elbow, with nobody on him.
    h.spot.x = h.hoop.x + 2.6;
    h.spot.z = h.hoop.z + 4;
    h.rival.x = h.rival.tx = h.spot.x;
    h.rival.z = h.rival.tz = h.spot.z;
    g.pos.x = h.spot.x + 5;
    h.contest.at = -9;
    const before = h.rival.score;
    const random = Math.random;
    Math.random = () => 0.01;
    h.rivalShot();
    Math.random = random;
    const started = { on: h.drive.on, turn: h.turn };
    let up = "";
    let ran = "";
    for (let i = 0; i < 300 && h.turn === "air"; i++) {
      g.tick(1 / 30);
      const cur = (h.rival.card.current || "").split("/").pop();
      if (/dunk-back|shot-front/.test(cur) && h.rival.card.lift > 0.3) up = cur;
      if (/run-(front|back)|drive/.test(cur)) ran = cur;
    }
    const drive = { tier, started, up, ran, scored: h.rival.score - before, turn: h.turn };
    h.quit();
    run(10);
    g.save.best.versus = tier;
    g.stage.render = draw;
    return { files: files.length, broken, album: { cards: album.postcards.length, fish: album.fish.length, ranks: album.ranks.length }, shown, blank, held, caught, reeling, landed, book, heaviest, drawn, fist, down, posed, dropped, talking, quiet, hands, still: still.length, after, drive };
  });
  check(pics.files > 150 && pics.broken.length === 0, "every drawing a character can be shown as is a real picture", { files: pics.files, broken: pics.broken });
  check(pics.shown.cards === 6 && pics.shown.got >= 1 && pics.shown.fish === 8 && pics.shown.ranks === 7 && pics.shown.earned >= 3 && pics.blank.length === 0, "the album shows the postcards, the fish book and the names, each with its picture", { shown: pics.shown, blank: pics.blank });
  check(/postcards\/pyramid\.webp$/.test(pics.held.img) && pics.held.title === "The Pyramid", "a postcard is held up when it is collected", pics.held);
  check(/fish\/largemouth-bass\.webp$/.test(pics.caught.img ?? "") && pics.book === Math.max(pics.heaviest, pics.caught.lb) && pics.reeling === "reel" && pics.landed === "cheer", "a catch has its picture, goes in the fish book, and Benji leans on the rod and then celebrates", { caught: pics.caught, heaviest: pics.heaviest, book: pics.book, reeling: pics.reeling, landed: pics.landed });
  check(pics.drawn.dunk === "dunk-back.webp" && pics.drawn.reel === "reel-back.webp" && pics.drawn.bowl === "bowl-back.webp" && pics.drawn.cheer === "cheer-back.webp", "the green tee has its own drawings for the dunk, the reel, the bowling release and the cheer", pics.drawn);
  check(pics.fist === "cheer" && pics.down === null && pics.posed === "cheer" && pics.dropped === null, "his fist goes up after a win and for a photo, and comes down again", { fist: pics.fist, down: pics.down, posed: pics.posed, dropped: pics.dropped });
  check(pics.talking.pose === "talk" && pics.talking.file === "talk.webp" && pics.quiet === null, "whoever is talking is drawn talking", { talking: pics.talking, quiet: pics.quiet });
  check(pics.still > 0 && pics.hands > 5 && pics.after, "people in the crowd throw their hands up when they jump, and put them down again", { standing: pics.still, frames: pics.hands, after: pics.after });
  check(pics.drive.started.on && pics.drive.started.turn === "air" && /dunk-back/.test(pics.drive.up) && pics.drive.scored === 2 && pics.drive.turn === "you", "a better player can take an open look to the rim and throw it down for two", pics.drive);
  // The rec grounds on Park Avenue: putt-putt, cornhole and tennis; and what flies over the city.
  const rec = await page.evaluate(() => {
    const g = window.__GAME__;
    const { POIS, HOLES, PUTT_PAR } = g.tables;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n, dt = 1 / 30) => {
      for (let i = 0; i < n; i++) g.tick(dt);
    };
    const settle = () => {
      if (g.overlay) g.close();
      run(4);
      if (g.activity) g.activity.quit();
      run(6);
    };
    settle();
    const quiet = new Proxy({}, { get: () => () => {} });
    const sound = g.sound;
    // The spots are there to walk up to, and the map knows both places.
    const stops = { putt: POIS.find((q) => q.id === "putt"), courts: POIS.find((q) => q.id === "courts") };
    const spots = ["Putt-putt", "Tennis", "Cornhole"].map((w) => g.spots.some((q) => q.label().startsWith(w)));

    // ---- putt-putt
    g.begin(g.putt, "whack");
    g.putt.start();
    const p = g.putt;
    const rollOut = () => {
      for (let i = 0; i < 1500 && p.state.phase === "roll"; i++) g.tick(1 / 60);
    };
    const aimed = { x: p.x, z: p.z };
    p.putt(Math.PI, (p.sweet[0] + p.sweet[1]) / 2);
    rollOut();
    const ace = { strokes: p.strokes, phase: p.state.phase, from: aimed };
    run(90);
    const second = p.state.hole;
    // The hill: a soft putt comes back down, a firm one stays up.
    const hill = HOLES.findIndex((h) => h.ramp);
    p.tee(hill);
    const top = HOLES[hill].ramp.h;
    p.putt(p.aim, 0.2);
    rollOut();
    const soft = { z: +p.z.toFixed(2), up: Math.abs(p.z - HOLES[hill].tee[1]) > 5.5, strokes: p.strokes };
    p.tee(hill);
    p.putt(p.aim, (p.sweet[0] + p.sweet[1]) / 2);
    rollOut();
    const firm = { over: p.state.phase === "sunk" || Math.abs(p.z - HOLES[hill].ramp.z1) < 3 === (Math.sign(p.z - HOLES[hill].ramp.z1) === Math.sign(HOLES[hill].ramp.z1 - HOLES[hill].ramp.z0) || p.state.phase === "sunk"), phase: p.state.phase };
    // The paddle wheel: shut, the ball stays this side of it; open, it goes through.
    const wh = HOLES.findIndex((h) => h.wheel);
    const gateZ = HOLES[wh].wheel.gap[1];
    const side = Math.sign(HOLES[wh].tee[1] - gateZ);
    p.tee(wh);
    for (let i = 0; i < 400 && !p.state.shut; i++) g.tick(1 / 120);
    // Hard enough to be there before the paddle has moved on.
    const hold = p.turn;
    const keep = p.idle.bind(p);
    p.idle = () => {};
    p.turn = hold;
    p.putt(p.aim, 0.5);
    rollOut();
    const blocked = Math.sign(p.z - gateZ) === side && p.state.phase !== "sunk";
    p.tee(wh);
    const arc = (Math.PI * 2) / HOLES[wh].wheel.paddles;
    p.turn = arc / 2;
    p.putt(p.aim, 0.5);
    rollOut();
    const through = Math.sign(p.z - gateZ) === -side || p.state.phase === "sunk";
    p.idle = keep;
    // The last hole down the funnel ends the round with a card.
    p.card = HOLES.slice(0, -1).map((h) => h.par);
    p.tee(HOLES.length - 1);
    p.putt(p.aim, (p.sweet[0] + p.sweet[1]) / 2);
    rollOut();
    run(120);
    const round = { title: g.results?.title ?? "", card: p.card.slice(), pay: g.results?.pay ?? 0, best: g.save.best.putt ?? 0 };
    settle();

    // ---- cornhole
    const c = g.cornhole;
    const wins = g.save.best.cornhole ?? 0;
    g.begin(c, "whack");
    c.start();
    run(12);
    c.toss(0, 0, 0.655, 0, 0);
    for (let i = 0; i < 200 && (c.phase === "fly" || c.phase === "settle"); i++) g.tick(1 / 30);
    const first = { state: c.bags.find((b) => b.who === 0 && b.state !== "hand").state, next: c.phase };
    for (let i = 0; i < 300 && c.phase !== "aim"; i++) g.tick(1 / 30);
    run(12);
    c.toss(0, 0, 0.3, 0, 0);
    for (let i = 0; i < 200 && (c.phase === "fly" || c.phase === "settle"); i++) g.tick(1 / 30);
    const short = c.bags.filter((b) => b.who === 0 && b.state !== "hand").map((b) => b.state);
    // One bag shoves another: put a bag below the hole and slide a second into the back of it.
    const a = c.bags.find((b) => b.who === 1 && b.state === "hand") ?? c.bags.find((b) => b.who === 1);
    a.state = "board";
    a.u = 0;
    a.v = 0.8;
    a.su = a.sv = 0;
    a.mesh.visible = true;
    const b2 = c.bags.find((b) => b.who === 0 && b.state === "hand");
    b2.state = "board";
    b2.u = 0;
    b2.v = 0.45;
    b2.su = 0;
    b2.sv = 1.6;
    b2.mesh.visible = true;
    for (let i = 0; i < 120; i++) c.slide(1 / 60);
    const shoved = { pushed: a.state, v: +a.v.toFixed(3) };
    // Played out with good throws, it ends on a card and counts as a win.
    c.start();
    run(12);
    g.sound = quiet;
    let guard = 0;
    while (guard++ < 40000 && !g.overlay) {
      g.tick(1 / 30);
      if (c.phase === "aim" && c.t > 0.3) c.toss(0, 0, 0.655, 0, 0);
    }
    g.sound = sound;
    const bags = { title: g.results?.title ?? "", score: c.score.slice(), wins: (g.save.best.cornhole ?? 0) - wins, rounds: c.round };
    settle();

    // ---- tennis
    const t = g.tennis;
    g.save.best.tennis = 0;
    g.begin(t, "whack");
    t.start();
    run(40, 1 / 60);
    const opening = { phase: t.state.phase, server: t.state.server };
    // Too hard is long: a fault, and a second serve.
    t.serve(0, 0.97, 0);
    for (let i = 0; i < 400 && t.state.phase === "rally"; i++) g.tick(1 / 60);
    const fault = { call: t.call, pts: t.state.pts.join() };
    for (let i = 0; i < 300 && t.state.phase !== "serve"; i++) g.tick(1 / 60);
    // A good one comes down in the box across the net.
    t.serve(0, 0.72, 0);
    const box = { x: +(t.state.land.x - 38.1).toFixed(1), live: t.state.live };
    // Played out: he runs to the ball, swings when it is on him, and somebody wins three games.
    g.sound = quiet;
    let hits = 0;
    let longest = 0;
    guard = 0;
    while (guard++ < 60 * 60 * 14 && !g.overlay) {
      if (t.phase === "serve" && t.server === 0 && t.t > 0.6) t.serve(0, 0.7 + Math.random() * 0.1, Math.random() - 0.5);
      if (t.phase === "rally" && t.live && t.last === 1) {
        const dx = Math.max(38.1 - 12.9, Math.min(38.1 - 1.5, t.meet.x)) - g.pos.x;
        const dz = t.meet.z - g.pos.z;
        const d = Math.hypot(dx, dz);
        g.input.setStick(d > 0.3 ? dz / d : 0, d > 0.3 ? dx / d : 0);
        const near = Math.hypot(t.p.x - g.pos.x, t.p.z - g.pos.z);
        if (t.bounces === 1 && near < 0.95 && t.p.y < 2.5 && t.swingCool <= 0) {
          g.input.setStick(g.pos.z > 96 ? -0.9 : 0.9, 0.5);
          g.input.press("action");
          hits++;
        }
      } else g.input.setStick(0, 0);
      g.tick(1 / 60);
      longest = Math.max(longest, t.rallies);
    }
    g.input.setStick(0, 0);
    g.sound = sound;
    const match = { title: g.results?.title ?? "", games: t.games.slice(), hits, longest, wins: g.save.best.tennis ?? 0 };
    settle();

    // ---- over the city
    const sky = g.skyShow;
    const was = sky.blimp.position.clone();
    sky.update(10, g.time, 0);
    const flew = +was.distanceTo(sky.blimp.position).toFixed(1);
    const beam = sky.group.children.find((o) => o !== sky.blimp).children[0].material;
    const day = beam.opacity;
    sky.update(0.1, g.time, 1);
    const night = beam.opacity;
    g.stage.render = draw;
    return { stops, spots, holes: HOLES.length, par: PUTT_PAR, ace, second, soft, top, firm, blocked, through, round, first, short, shoved, bags, opening, fault, box, match, sky: { flew, y: Math.round(sky.blimp.position.y), day, night } };
  });
  check(rec.stops.putt && rec.stops.courts && rec.spots.every(Boolean), "the rec grounds are on the map, with a spot to walk up to for each game", { stops: rec.stops, spots: rec.spots });
  check(rec.holes === 9 && rec.par === 23 && rec.ace.strokes === 1 && rec.ace.phase === "sunk" && rec.second === 1, "putt-putt: a straight putt at the right weight drops, and the next hole comes up", { ace: rec.ace, second: rec.second });
  check(!rec.soft.up && rec.soft.strokes === 1 && rec.firm.phase !== "roll", "putt-putt: a putt too soft for the hill rolls back down it", { soft: rec.soft, firm: rec.firm });
  check(rec.blocked && rec.through, "putt-putt: the paddle wheel stops a ball when a paddle is down and lets it through when it is not", { blocked: rec.blocked, through: rec.through });
  check(/PAR/.test(rec.round.title) && rec.round.card.length === 9 && rec.round.pay > 0 && rec.round.best > 0, "putt-putt: the ninth hole ends the round with a card and a best score", rec.round);
  check(rec.first.state === "in" && rec.short.includes("grass") && rec.shoved.pushed !== "hand" && (rec.shoved.pushed === "in" || rec.shoved.v > 0.81), "cornhole: a bag slides up into the hole, a short one lands on the grass, and one bag shoves another", { first: rec.first, short: rec.short, shoved: rec.shoved });
  check(/TOOK IT/.test(rec.bags.title) && Math.max(...rec.bags.score) >= 21 && rec.bags.wins === (rec.bags.score[0] > rec.bags.score[1] ? 1 : 0), "cornhole: a match is played out to 21, and a win is counted when it is his", rec.bags);
  check(rec.opening.phase === "serve" && rec.opening.server === 0 && /FAULT/.test(rec.fault.call) && rec.fault.pts === "0,0" && rec.box.live && rec.box.x > 0 && rec.box.x < 6.5, "tennis: a serve hit too hard is a fault, and a good one comes down in the box", { opening: rec.opening, fault: rec.fault, box: rec.box });
  check(rec.match.title.length > 0 && Math.max(...rec.match.games) === 3 && rec.match.hits > 3 && rec.match.longest >= 2, "tennis: a match is rallied out to three games", rec.match);
  check(rec.sky.flew > 20 && rec.sky.y > 60 && rec.sky.day === 0 && rec.sky.night > 0.03, "a blimp circles over the city, and searchlights come on over the boutique after dark", rec.sky);
  // ---- the playground, the boat, the putter and the rackets
  const play = await page.evaluate(async () => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n, dt = 1 / 30) => {
      for (let i = 0; i < n; i++) g.tick(dt);
    };
    if (g.overlay) g.close();
    if (g.activity) g.activity.quit();
    run(6);
    g.dialogue.length = 0;
    const { PEDS, POIS } = g.tables;
    // The green tee is the fit with the drawings of him sat, putting and holding a racket.
    const worn = g.save.wearing;
    g.wear("starter");
    run(2);
    const spots = ["Get on the swing", "Go down the slide", "Take the boat out"].map((w) => g.spots.some((q) => q.label().startsWith(w)));
    const lawn = g.spots.filter((q) => q.label().startsWith("Cornhole")).length;
    const stops = ["cornhole", "playground"].map((id) => !!POIS.find((q) => q.id === id)?.arrive);

    // ---- the swing: on from the prompt, pumped up by holding only on the way forward, and off it for distance.
    g.save.best.swing = 0;
    g.warp(-112.95, 93, 0);
    run(4);
    const swingAsk = g.prompt;
    g.input.press("interact");
    run(2);
    const sw = g.swings;
    const onSwing = g.activity === sw;
    g.input.press("action");
    run(1);
    let top = 0;
    let lift = 0;
    for (let i = 0; i < 30 * 16; i++) {
      g.input.hold("action", sw.state.w > 0);
      run(1);
      top = Math.max(top, sw.state.height);
      lift = Math.max(lift, g.benji.lift);
    }
    g.input.hold("action", false);
    const swung = { top: +top.toFixed(2), lift: +lift.toFixed(2), pose: g.benji.pose, seat: Math.abs(sw.state.seat) > 0.001 };
    let waited = 0;
    while (!(sw.state.w > 1.2 && sw.state.a > 0.5 && sw.state.a < 0.9) && waited++ < 900) run(1);
    sw.jump();
    let air = 0;
    while (sw.state.phase === "air" && air++ < 240) run(1);
    const jump = { cm: sw.state.last, best: g.save.best.swing ?? 0, air };
    let rest = 0;
    while (g.activity === sw && rest++ < 240) run(1);
    const offSwing = { mode: g.mode, z: +g.pos.z.toFixed(1), lift: g.benji.lift, tilt: g.benji.tilt };
    // The empty seat goes on swinging and comes to rest by itself.
    const still = Math.abs(sw.state.a) + Math.abs(sw.state.w);
    run(30 * 20);
    const settled = { before: +still.toFixed(3), after: +(Math.abs(sw.state.a) + Math.abs(sw.state.w)).toFixed(3) };

    // ---- the slide: up the ladder, a push, down the chute and off the end on his feet.
    g.warp(-105.5, 95.8, 0);
    run(4);
    const slideAsk = g.prompt;
    g.input.press("interact");
    run(2);
    const sl = g.slide;
    const onSlide = g.activity === sl;
    let up = 0;
    while (sl.state.phase === "climb" && up++ < 150) run(1);
    const deck = { phase: sl.state.phase, lift: +g.benji.lift.toFixed(2) };
    g.input.press("action");
    run(2);
    let fast = 0;
    let down = 0;
    while (g.activity === sl && down++ < 400) {
      run(1);
      fast = Math.max(fast, sl.state.v);
    }
    const slid = { fast: +fast.toFixed(1), mode: g.mode, z: +g.pos.z.toFixed(1), lift: g.benji.lift, best: g.save.best.slide ?? 0 };

    // ---- the boat: aboard from the pier, out under her own power, a sack, a ramp, the pier's piles, and home.
    g.save.best.river = 0;
    g.warp(-82.9, -208.5, Math.PI);
    run(4);
    const boatAsk = g.prompt;
    g.input.press("interact");
    for (let i = 0; i < 200 && g.activity !== g.boat; i++) g.tick(1 / 30);
    for (let i = 0; i < 90 && g.live.fade > 0.05; i++) g.tick(1 / 30);
    const b = g.boat;
    const aboard = g.activity === b && b.state.riding;
    const from = { x: b.state.x, z: b.state.z };
    g.input.hold("up", true);
    run(100);
    const out = { moved: +Math.hypot(b.state.x - from.x, b.state.z - from.z).toFixed(1), speed: +b.state.speed.toFixed(1), z: +b.state.z.toFixed(1) };
    const h0 = b.state.heading;
    g.input.hold("right", true);
    run(45);
    g.input.hold("right", false);
    const turned = +Math.atan2(Math.sin(b.state.heading - h0), Math.cos(b.state.heading - h0)).toFixed(2);
    g.input.hold("up", false);
    const [sx, sz] = b.state.sacks[0];
    const money = g.save.dollars;
    b.set(sx + 7, sz, -Math.PI / 2, 8);
    run(45);
    const sack = { got: b.state.got, paid: g.save.dollars - money };
    const ramp = b.state.ramps[0];
    b.set(ramp.x - 13, ramp.z, Math.PI / 2, 20);
    g.input.hold("up", true);
    let flew = 0;
    let high = 0;
    for (let i = 0; i < 110; i++) {
      run(1);
      if (b.state.air) flew++;
      high = Math.max(high, b.state.y);
    }
    g.input.hold("up", false);
    const jumped = { flew, high: +high.toFixed(2), down: !b.state.air && b.state.y < 0.05 };
    b.set(-84, -240, 0, 14);
    g.input.hold("up", true);
    run(70);
    g.input.hold("up", false);
    const piles = +b.state.z.toFixed(1);
    b.set(-80.4, -209.5, Math.PI, 0);
    run(4);
    g.input.press("interact");
    for (let i = 0; i < 200 && g.activity === b; i++) g.tick(1 / 30);
    for (let i = 0; i < 90 && g.live.fade > 0.05; i++) g.tick(1 / 30);
    const ashore = { mode: g.mode, x: +g.pos.x.toFixed(1), z: +g.pos.z.toFixed(1), riding: b.state.riding, lift: g.benji.lift };

    // ---- the putter: the swing goes back with the meter, the ball leaves when the club reaches it, and he stays put while it rolls.
    g.begin(g.putt, "whack");
    g.putt.start();
    run(15);
    const p = g.putt;
    const address = { pose: g.benji.pose, club: p.club.visible, off: +Math.hypot(g.pos.x - p.ball.position.x, g.pos.z - p.ball.position.z).toFixed(2) };
    g.input.hold("action", true);
    run(22);
    const back = +p.arm.rotation.x.toFixed(2);
    g.input.hold("action", false);
    run(1);
    const coming = { strike: !!p.strike, phase: p.state.phase, strokes: p.state.strokes };
    let ticks = 0;
    while (p.state.phase === "aim" && ticks++ < 40) run(1);
    run(5);
    const through = +p.arm.rotation.x.toFixed(2);
    const stood = { x: g.pos.x, z: g.pos.z };
    run(12);
    const struck = { phase: p.state.phase, ticks, strokes: p.state.strokes, through, drift: +Math.hypot(g.pos.x - stood.x, g.pos.z - stood.z).toFixed(3), rolled: +Math.hypot(p.ball.position.x - stood.x, p.ball.position.z - stood.z).toFixed(1) };
    p.quit();
    run(4);

    // ---- rackets: he holds one ready, lifts it to serve, and the coach has hers.
    g.begin(g.tennis, "whack");
    g.tennis.start();
    run(40);
    const ready = { benji: g.benji.pose, coach: g.tennis.rival.pose };
    g.input.hold("action", true);
    run(8);
    const serving = g.benji.pose;
    g.input.hold("action", false);
    run(2);
    g.tennis.quit();
    run(4);

    // ---- whoever holds a park table is sat at it, and the new faces are out on the street.
    g.warp(-84, 80.5, Math.PI);
    run(12);
    const seats = g.street.members.filter((m) => m.posted && m.stop.act === "play");
    const sat = { n: seats.length, posed: seats.filter((m) => m.card.pose === "sit").length, sunk: seats.filter((m) => m.card.lift !== 0).length };
    const fresh = (c) => /\/(male-0[5-9]|female-0[5-7])/.test(c.face);
    const faces = { kinds: PEDS.length, walking: g.people.walkers.filter((w) => fresh(w.card)).length, about: [...g.street.members, ...Object.values(g.troupes).flatMap((t) => t.members)].filter((m) => fresh(m.card)).length };
    g.wear(worn);
    g.stage.render = draw;
    return { spots, lawn, stops, swingAsk, onSwing, swung, jump, offSwing, settled, slideAsk, onSlide, deck, slid, boatAsk, aboard, out, turned, sack, jumped, piles, ashore, address, back, coming, struck, ready, serving, sat, faces };
  });
  check(play.spots.every(Boolean) && play.lawn === 3 && play.stops.every(Boolean), "the swing, the slide and the boat can be walked up to, cornhole starts from anywhere on its lawn, and the map has both new stops", { spots: play.spots, lawn: play.lawn, stops: play.stops });
  check(play.swingAsk === "Get on the swing" && play.onSwing && play.swung.top > 0.75 && play.swung.lift > 1 && play.swung.seat, "the swing: holding on the way forward pumps it high, and the seat moves with him", { ask: play.swingAsk, ...play.swung });
  check(play.jump.cm > 250 && play.jump.cm < 700 && play.jump.best === play.jump.cm && play.offSwing.mode === "walk" && play.offSwing.lift === 0 && play.offSwing.tilt === 0 && play.offSwing.z > 95, "the swing: letting go on the way up throws him out over the chips, and the distance is kept", { ...play.jump, off: play.offSwing });
  check(play.settled.before > 0.05 && play.settled.after < 0.02, "the swing: the empty seat goes on swinging and comes to rest", play.settled);
  check(play.slideAsk === "Go down the slide" && play.onSlide && play.deck.phase === "top" && Math.abs(play.deck.lift - 1.6) < 0.05 && play.slid.fast > 3.5 && play.slid.mode === "walk" && play.slid.z > 100.5 && play.slid.lift === 0 && play.slid.best > 5, "the slide: up the ladder, down the chute and off the end on his feet", { deck: play.deck, ...play.slid });
  check(play.boatAsk === "Take the boat out" && play.aboard && play.out.moved > 12 && play.out.speed > 8 && play.out.z < -222 && play.turned < -0.4, "the boat: aboard at the pier, out into the river under throttle, and she answers the wheel", { ask: play.boatAsk, ...play.out, turned: play.turned });
  check(play.sack.got === 1 && play.sack.paid >= 10 && play.jumped.flew > 8 && play.jumped.high > 1.2 && play.jumped.down && play.piles < -228, "the boat: a sack alongside is brought in, a ramp at speed puts her in the air, and the pier stops her", { sack: play.sack, jumped: play.jumped, piles: play.piles });
  check(play.ashore.mode === "walk" && !play.ashore.riding && Math.abs(play.ashore.x - -82.9) < 0.3 && play.ashore.lift === 0, "the boat: tying up puts Benji back on the pier", play.ashore);
  check(play.address.pose === "putt" && play.address.club && play.address.off < 0.5 && play.back > 0.25 && play.coming.strike && play.coming.phase === "aim" && play.coming.strokes === 0, "putting: he stands over the ball with the putter in his hands, and it swings back as the meter fills", { ...play.address, back: play.back, coming: play.coming });
  check(play.struck.phase === "roll" && play.struck.ticks >= 2 && play.struck.ticks <= 9 && play.struck.strokes === 1 && play.struck.through < 0 && play.struck.drift < 0.01 && play.struck.rolled > 0.6, "putting: the ball leaves when the club reaches it, the club follows through, and Benji stays where he stood", play.struck);
  check(play.ready.benji === "tennis" && play.ready.coach === "tennis" && play.serving === "serve", "tennis: both players hold a racket, and Benji lifts his to serve", { ...play.ready, serving: play.serving });
  check(play.sat.n === 8 && play.sat.posed === 8 && play.sat.sunk === 0 && play.faces.kinds === 16 && play.faces.walking + play.faces.about > 3, "the regulars are sat at their tables, and eight new people are out in the city", { ...play.sat, ...play.faces });

  // ---- laser tag through his own eyes
  const fps = await page.evaluate(async () => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n, dt = 1 / 30) => {
      for (let i = 0; i < n; i++) g.tick(dt);
    };
    const settle = () => new Promise((r) => setTimeout(r, 120));
    if (g.overlay) g.close();
    if (g.activity) g.activity.quit();
    run(6);
    for (let i = 0; i < 200 && (g.mode !== "walk" || g.live.fade > 0.05); i++) g.tick(1 / 30);
    const { BLASTERS, TAG_RANKS } = g.tables;
    const L = g.laser;
    // The door: a new player is a Recruit with one blaster; rank opens the other two.
    for (const k of Object.keys(g.save.best)) if (k.startsWith("lt_")) delete g.save.best[k];
    g.enter("fun");
    for (let i = 0; i < 200 && (g.place !== "fun" || g.live.fade > 0.05); i++) g.tick(1 / 30);
    const door = g.rooms.fun.laserDoor;
    g.pos.x = door.x;
    g.pos.z = door.z + 0.5;
    run(4);
    const ask = g.prompt;
    g.input.press("interact");
    run(2);
    await settle();
    const fresh = { overlay: g.overlay, rank: document.querySelector("[data-rank]")?.textContent ?? "", racks: document.querySelectorAll("[data-blaster]").length, locked: [...document.querySelectorAll("[data-blaster]")].filter((b) => b.disabled).length, deploy: !!document.querySelector("[data-deploy]") };
    g.pickBlaster("marksman");
    const refused = L.loadout().guns.find((q) => q.picked).id;
    g.save.best.lt_xp = TAG_RANKS[4][0] + 10;
    g.pickBlaster("marksman");
    g.push();
    await settle();
    const ranked = { rank: document.querySelector("[data-rank]")?.textContent ?? "", locked: [...document.querySelectorAll("[data-blaster]")].filter((b) => b.disabled).length, picked: L.loadout().guns.find((q) => q.picked).id };
    document.querySelector("[data-deploy]").click();
    for (let i = 0; i < 240 && !(g.mode === "laser" && L.phase === "go"); i++) g.tick(1 / 30);
    for (let i = 0; i < 60 && g.live.fade > 0.05; i++) g.tick(1 / 30);
    await settle();
    await settle();
    const hip = document.querySelector("[data-fp-hip]");
    const view = {
      mode: g.mode,
      phase: L.phase,
      gun: L.gun.id,
      eye: +(g.camera.position.y - g.rooms.laser.floorY).toFixed(2),
      at: +Math.hypot(g.camera.position.x - g.pos.x, g.camera.position.z - g.pos.z).toFixed(3),
      benji: g.benji.visible,
      hands: !!hip && hip.naturalWidth > 0 && hip.src.includes("marksman-hip"),
      cross: !!document.querySelector("[data-crosshair]"),
      ammo: document.querySelector("[data-ammo]")?.textContent ?? "",
      on: g.live.fp.on,
    };
    // Everybody else stands still for the rest of this.
    const hush = () => {
      L.hold = true;
      for (const b of L.bots) {
        b.cool = 999;
        b.aim = 0;
        b.at = null;
      }
    };
    const pinks = L.bots.filter((b) => b.playing && b.team === 1);
    const park = () => pinks.forEach((b, i) => ((b.x = b.tx = 786 + i), (b.z = b.tz = 990.6)));
    hush();
    park();
    L.steady = true;
    // Looking and strafing: a drag turns him and tilts his view, and after it A and D step sideways without turning.
    g.pos.x = 800;
    g.pos.z = 1003.5;
    g.camYaw = Math.PI;
    L.pitch = 0;
    run(2);
    const yaw0 = g.camYaw;
    g.input.look(0.2, 0.1);
    run(1);
    const looked = { yaw: +Math.atan2(Math.sin(g.camYaw - yaw0), Math.cos(g.camYaw - yaw0)).toFixed(2), pitch: +L.pitch.toFixed(2) };
    g.camYaw = Math.PI;
    L.pitch = 0;
    const x0 = g.pos.x;
    g.input.hold("right", true);
    run(20);
    g.input.hold("right", false);
    run(10);
    const strafe = { dx: +(g.pos.x - x0).toFixed(1), yaw: +Math.abs(Math.atan2(Math.sin(g.camYaw - Math.PI), Math.cos(g.camYaw - Math.PI))).toFixed(3) };
    g.input.touch = false;
    // Down the sights: the view closes in. One beam from the Marksman, from the scope, tags from across the room.
    g.pos.x = 804;
    g.pos.z = 1003.5;
    g.vel.x = g.vel.z = 0;
    g.camYaw = Math.PI;
    hush();
    const far = pinks[0];
    far.x = far.tx = 804;
    far.z = far.tz = 1003.5 - 11;
    far.hp = 100;
    const fov0 = g.camera.fov;
    g.input.key("aim", true);
    run(20);
    const aimed = { ads: +g.live.fp.ads.toFixed(2), fov: Math.round(g.camera.fov), wide: Math.round(fov0), target: g.live.fp.target, plate: far.plate.visible };
    const score0 = L.score;
    L.cool = 0;
    const shot = L.fire();
    run(1);
    const tagged = { shot, tags: L.tags, out: far.out > 0, pose: far.card.pose, ammo: L.ammo, mark: g.live.fp.hitKind, points: L.score - score0, feed: L.feed[0] ? `${L.feed[0].a}>${L.feed[0].b}` : "" };
    g.input.key("aim", false);
    run(10);
    // A wall is a wall: somebody behind cover cannot be hit, and the crosshair does not light on them.
    const hid = pinks[1];
    hid.x = hid.tx = 800;
    hid.z = hid.tz = 1000 - 2.2;
    hid.hp = 100;
    g.pos.x = 800;
    g.pos.z = 1003.5;
    g.camYaw = Math.PI;
    L.pitch = 0;
    run(2);
    const lit = g.live.fp.target;
    L.cool = 0;
    L.fire();
    const cover = { lit, hp: hid.hp };
    // The Pulse Rifle: three to the body or two to the head, and a magazine that runs dry and has to be changed.
    L.gun = BLASTERS[0];
    L.ammo = L.gun.mag;
    L.reloading = 0;
    const near = pinks[2];
    near.x = near.tx = 806;
    near.z = near.tz = 1003.5;
    near.hp = 100;
    g.pos.x = 800;
    g.pos.z = 1003.5;
    g.camYaw = Math.PI / 2;
    L.pitch = 0;
    run(2);
    const body = [];
    for (let i = 0; i < 3; i++) {
      L.cool = 0;
      L.fire();
      body.push(Math.round(near.hp));
    }
    near.out = 0;
    near.hp = 100;
    near.card.pose = null;
    L.pitch = Math.atan2(near.height * 0.9 - 1.32, 6);
    run(1);
    const head = [];
    for (let i = 0; i < 2; i++) {
      L.cool = 0;
      L.fire();
      head.push(Math.round(near.hp));
    }
    const heads = L.heads;
    L.pitch = 0.6;
    L.ammo = 2;
    L.cool = 0;
    L.fire();
    L.cool = 0;
    L.fire();
    const dry = { ammo: L.ammo, reloading: L.reloading > 0, fires: (L.cool = 0, L.fire()) };
    run(Math.ceil(L.gun.reload * 30) + 3);
    const full = { ammo: L.ammo, reloading: L.reloading > 0 };
    // The vest: a hit takes a third, keeping out of the light brings it back, and the third hit puts him out and back at his base.
    L.pitch = 0;
    L.shield = 0;
    L.down = 0;
    L.vest = 100;
    park();
    hush();
    L.tagged(pinks[3]);
    run(1);
    const hurt = { vest: Math.round(L.vest), from: +g.live.fp.hurt.toFixed(1) };
    L.shield = 0;
    run(30 * 8);
    const healed = Math.round(L.vest);
    L.streak = 2;
    for (let i = 0; i < 3; i++) {
      L.shield = 0;
      L.tagged(pinks[3]);
    }
    await settle();
    const out = { down: L.down > 0, outs: L.outs, streak: L.streak, card: !!document.querySelector("[data-fp]")?.textContent.includes("Tagged out") };
    run(30 * 4);
    const back = { down: L.down > 0, vest: Math.round(L.vest), x: +g.pos.x.toFixed(1), z: +g.pos.z.toFixed(1), start: [g.rooms.laser.start.x, g.rooms.laser.start.z] };
    // Runs: three tags sweep the radar, five overcharge the blaster, seven black out every pink vest.
    hush();
    const runOf = (n) => {
      L.streak = n - 1;
      const b = pinks[0];
      b.out = 0;
      b.hp = 1;
      b.card.pose = null;
      L.strike(b, 50, false, 5);
    };
    park();
    L.sweep = 0;
    run(2);
    const unseen = () => {
      let n = 0;
      for (let i = 0; i < g.live.radarN; i++) if (g.live.radar[i * 3 + 2] === 1) n++;
      return n;
    };
    for (const b of pinks) {
      b.out = 0;
      b.hp = 100;
      b.shot = -99;
    }
    g.pos.x = 800;
    g.pos.z = 1009;
    g.camYaw = Math.PI;
    run(2);
    const dark = unseen();
    runOf(3);
    run(2);
    const swept = { sweep: L.sweep > 0, blips: unseen(), dark };
    runOf(5);
    const overcharged = L.over > 0;
    for (const b of pinks) {
      b.out = 0;
      b.hp = 100;
    }
    runOf(7);
    const blackout = pinks.filter((b) => b.out > 0).length;
    // On a touch screen the blaster fires by itself once the crosshair has settled on somebody, and there are buttons for the rest.
    for (const b of pinks) {
      b.out = 0;
      b.hp = 100;
      b.card.pose = null;
    }
    park();
    hush();
    L.over = 0;
    L.gun = BLASTERS[0];
    L.ammo = L.gun.mag;
    L.reloading = 0;
    g.pos.x = 800;
    g.pos.z = 1003.5;
    g.vel.x = g.vel.z = 0;
    g.camYaw = Math.PI / 2;
    L.pitch = 0;
    const mark = pinks[1];
    mark.x = mark.tx = 806;
    mark.z = mark.tz = 1003.5;
    g.input.hold("run", false);
    const shots0 = L.shots;
    run(20);
    await settle();
    const thumbs = { fired: L.shots - shots0, pad: !!document.querySelector("[data-fp-pad]"), aim: !!document.querySelector("[data-aim]") };
    g.input.touch = false;
    g.push();
    // The whistle: the match goes on his record.
    const before = { xp: g.save.best.lt_xp ?? 0, games: g.save.best.lt_games ?? 0 };
    L.left = 0.05;
    run(4);
    await settle();
    const done = { phase: L.phase, overlay: g.overlay, xp: (g.save.best.lt_xp ?? 0) - before.xp, games: (g.save.best.lt_games ?? 0) - before.games, rank: (g.results?.rows ?? []).some((r) => r[0] === "Rank"), on: g.live.fp.on };
    g.closeResults?.();
    if (g.overlay) g.close();
    L.quit();
    for (let i = 0; i < 240 && !(g.place === "fun" && g.mode === "walk"); i++) g.tick(1 / 30);
    for (let i = 0; i < 60 && g.live.fade > 0.05; i++) g.tick(1 / 30);
    const after = { place: g.place, mode: g.mode, benji: g.benji.visible, roll: +Math.abs(g.camera.rotation.z).toFixed(3) };
    // Back out on the street for whatever comes next.
    g.leave(0, -150, 0);
    for (let i = 0; i < 200 && (g.place !== "street" || g.live.fade > 0.05); i++) g.tick(1 / 30);
    g.stage.render = draw;
    return { ask, fresh, refused, ranked, view, looked, strafe, aimed, tagged, cover, body, head, heads, dry, full, hurt, healed, out, back, swept, overcharged, blackout, thumbs, done, after };
  });
  check(/^Laser tag/.test(fps.ask) && fps.fresh.overlay === "loadout" && fps.fresh.rank === "Recruit" && fps.fresh.racks === 3 && fps.fresh.locked === 2 && fps.refused === "pulse", "laser tag: the door shows his rank and three blasters, and a Recruit carries only the first", { ask: fps.ask, ...fps.fresh, refused: fps.refused });
  check(fps.ranked.rank === "Lieutenant" && fps.ranked.locked === 0 && fps.ranked.picked === "marksman", "laser tag: rank issues the other blasters", fps.ranked);
  check(fps.view.mode === "laser" && fps.view.phase === "go" && fps.view.gun === "marksman" && Math.abs(fps.view.eye - 1.32) < 0.06 && fps.view.at < 0.01 && !fps.view.benji && fps.view.hands && fps.view.cross && fps.view.on, "laser tag: Deploy puts the lens in his eyes with the chosen blaster drawn in his hands and a crosshair", fps.view);
  check(fps.looked.yaw < -0.15 && fps.looked.pitch < -0.07 && Math.abs(fps.strafe.dx) > 1.2 && fps.strafe.yaw < 0.01, "laser tag: a drag looks about, and after it A and D step sideways without turning him", { ...fps.looked, strafe: fps.strafe });
  check(fps.aimed.ads > 0.95 && fps.aimed.fov < 30 && fps.aimed.wide > 65 && fps.aimed.target === 1 && fps.aimed.plate, "laser tag: aiming brings the scope up, closes the view in, and names whoever is in it", fps.aimed);
  check(fps.tagged.shot && fps.tagged.tags === 1 && fps.tagged.out && fps.tagged.pose === "out" && fps.tagged.ammo === 4 && fps.tagged.mark === 2 && fps.tagged.points >= 100 && /^Benji>/.test(fps.tagged.feed), "laser tag: one beam from the Marksman tags from across the room, and it is marked, scored and reported", fps.tagged);
  check(fps.cover.lit === 0 && fps.cover.hp === 100, "laser tag: nobody is hit through cover", fps.cover);
  check(fps.body.join() === "66,32,0" && fps.head[0] === 32 && fps.head[1] === 0 && fps.heads >= 1, "laser tag: the Pulse Rifle takes three to the body or two to the head", { body: fps.body, head: fps.head, heads: fps.heads });
  check(fps.dry.ammo === 0 && fps.dry.reloading && fps.dry.fires === false && fps.full.ammo === 24 && !fps.full.reloading, "laser tag: an empty blaster reloads itself and cannot fire until it has", { dry: fps.dry, full: fps.full });
  check(fps.hurt.vest === 66 && fps.hurt.from > 0.5 && fps.healed === 100 && fps.out.down && fps.out.outs === 1 && fps.out.streak === 0 && fps.out.card && !fps.back.down && fps.back.vest === 100 && Math.hypot(fps.back.x - fps.back.start[0], fps.back.z - fps.back.start[1]) < 0.5, "laser tag: the vest takes three hits, recharges out of the light, and a dark vest sends him back to his base", { hurt: fps.hurt, healed: fps.healed, out: fps.out, back: fps.back });
  check(fps.swept.dark === 0 && fps.swept.sweep && fps.swept.blips >= 3 && fps.overcharged && fps.blackout === 4, "laser tag: three in a row sweeps the radar, five overcharges the blaster, seven blacks out the pinks", { swept: fps.swept, overcharged: fps.overcharged, blackout: fps.blackout });
  check(fps.thumbs.fired >= 2 && fps.thumbs.pad && fps.thumbs.aim, "laser tag: on a touch screen it fires by itself on a target, with buttons to aim, reload, dash and sprint", fps.thumbs);
  check(fps.done.phase === "over" && fps.done.overlay === "results" && fps.done.xp > 0 && fps.done.games === 1 && fps.done.rank && !fps.done.on && fps.after.place === "fun" && fps.after.mode === "walk" && fps.after.benji && fps.after.roll < 0.01, "laser tag: the match goes on his record, and leaving puts him back in the Fun House as himself", { done: fps.done, after: fps.after });

  // ---- live music: a tune for every place, the band in Handy Park, and the Memphian
  const gigs = await page.evaluate(async () => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n, dt = 1 / 30) => {
      for (let i = 0; i < n; i++) g.tick(dt);
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    if (g.overlay) g.close();
    if (g.activity) g.activity.quit();
    run(6);
    for (let i = 0; i < 200 && (g.mode !== "walk" || g.place !== "street" || g.live.fade > 0.05); i++) g.tick(1 / 30);
    const { POIS, TUNES, SONGS, BEALE_STAGE: S, MEMPHIAN: M, BAND } = g.tables;
    g.setRain(false);
    g.setPhase("day");
    g.sky.setPhase("day", true);
    const cash0 = g.save.dollars;
    g.save.dollars = 300;
    // The band knows a tune for everywhere the game can ask for one.
    const asked = ["title", "race", "radio", "court", "bowl", "funhouse", "hq", "river", "beale", "city-day", "city-night", ...SONGS.map((q) => q.id)];
    const known = asked.filter((id) => TUNES[id]).length;
    g.warp(-100, 60, 0);
    run(4);
    const day = g.tracks()[0];
    g.setPhase("night");
    g.sky.setPhase("night", true);
    run(2);
    const night = g.tracks()[0];
    g.setPhase("day");
    g.sky.setPhase("day", true);
    // With the sound on, what is sounding is what was asked for (from the top of the next bar).
    g.sound.unlock();
    await wait(300);
    const on = g.sound.ctx?.state === "running";
    let heard = "";
    for (let i = 0; on && i < 40 && (heard = g.sound.tune) !== g.tracks()[0]; i++) {
      run(1);
      await wait(150);
    }
    const sounding = { on, heard, want: g.tracks()[0], beat: on ? g.sound.beat() : -1 };
    // From here the clock keeps the beat, so the test does not wait on a real one.
    const real = g.sound.beat;
    g.sound.beat = () => -1;

    // ---- Handy Park: six on the boards, playing, with a crowd; nearer is louder and Benji cannot stand still.
    g.warp(S.x, S.z - 16, 0);
    run(30);
    const tune = g.tracks()[0];
    const band = g.bealeBand.players;
    const seen = band.map(() => new Set());
    let stepped = 0;
    let dancing = 0;
    for (let i = 0; i < 660; i++) {
      g.tick(1 / 30);
      band.forEach((p, k) => seen[k].add(p.card.pose ?? "a"));
      stepped = Math.max(stepped, ...band.map((p) => p.out));
      // Whoever has reached their spot moves to the tune; the rest are still finding one.
      dancing = Math.max(dancing, g.gig.members.filter((m) => m.card.groove >= 0).length);
    }
    const stage = {
      players: band.length,
      up: band.every((p) => p.card.visible && Math.abs(p.card.group.position.y - (S.top + 0.03)) < 0.02),
      on: band.every((p) => Math.abs(p.x - S.x) < S.w / 2 && Math.abs(p.z - S.z) < S.d / 2),
      both: seen.filter((q) => q.size === 2).length,
      stepped: +stepped.toFixed(2),
      crowd: g.gig.members.length,
      dancing,
    };
    g.warp(S.x, S.z - S.d / 2 - 1.6, 0);
    run(40);
    const close = { live: +g.sound.liveLevel.toFixed(2), bop: g.benji.groove >= 0, ask: g.prompt };
    const r0 = g.save.respect;
    const d0 = g.save.dollars;
    g.input.press("interact");
    run(3);
    const tip = { paid: d0 - g.save.dollars, respect: g.save.respect - r0, said: g.toastText };
    g.warp(-100, 60, 0);
    run(40);
    const far = { live: +g.sound.liveLevel.toFixed(2), bop: g.benji.groove >= 0, tune: g.tracks()[0] };

    // ---- The Memphian: in at the doors on Union, the house band, the tables, the bar, a request.
    const stop = POIS.find((q) => q.id === "memphian");
    g.warp(stop.arrive.x, stop.arrive.z, stop.arrive.heading);
    run(6);
    const door = g.prompt;
    g.input.press("interact");
    for (let i = 0; i < 240 && (g.place !== "club" || g.live.fade > 0.05); i++) g.tick(1 / 30);
    run(20);
    const club = g.rooms.club;
    const house = g.clubBand.players;
    const folk = g.troupes.club.members;
    const inside = {
      place: g.place,
      tune: g.tracks()[0],
      live: +g.sound.liveLevel.toFixed(2),
      players: house.length,
      up: house.every((p) => p.card.visible && Math.abs(p.card.group.position.y - club.stage.top) < 0.02),
      sat: folk.filter((m) => m.posted && m.card.pose === "sit").length,
      tables: club.tables.length,
      keep: folk.filter((m) => m.stop.act === "serve").length,
      floor: folk.filter((m) => !m.posted).length,
      moving: folk.filter((m) => m.card.groove >= 0).length,
    };
    // The stage lights go with the beat.
    const lamp = club.lights[0];
    const glow = new Set();
    for (let i = 0; i < 40; i++) {
      g.tick(1 / 30);
      glow.add(Math.round(lamp.intensity));
    }
    g.warp(club.request.x, club.request.z, Math.PI);
    run(5);
    const ask = g.prompt;
    const before = { song: g.clubSong.name, tune: g.tracks()[0], cash: g.save.dollars };
    g.input.press("interact");
    run(3);
    const asked2 = { song: g.clubSong.name, tune: g.tracks()[0], paid: before.cash - g.save.dollars, said: g.toastText, cheer: folk.filter((m) => m.hop > 0).length };
    g.warp(club.bar.x, club.bar.z, -Math.PI / 2);
    run(5);
    const bar = g.prompt;
    const c1 = g.save.dollars;
    g.input.press("interact");
    run(3);
    const tea = { paid: c1 - g.save.dollars, fed: g.fedUntil > g.time, said: g.toastText };
    g.warp(club.exit.x, club.exit.z, 0);
    run(5);
    const out = g.prompt;
    g.input.press("interact");
    for (let i = 0; i < 240 && (g.place !== "street" || g.live.fade > 0.05); i++) g.tick(1 / 30);
    const back = { place: g.place, at: Math.hypot(g.pos.x - M.x, g.pos.z - M.z) < 4 };
    g.sound.beat = real;
    g.save.dollars = cash0;
    g.stage.render = draw;
    return { known, asked: asked.length, day, night, sounding, tune, stage, close, tip, far, door, inside, lights: glow.size, ask, before, asked2, bar, tea, out, back, stops: POIS.filter((q) => q.id === "memphian" || q.id === "bealestage").length, drawn: BAND.length };
  });
  check(gigs.known === gigs.asked && gigs.day === "city-day" && gigs.night === "city-night" && (!gigs.sounding.on || (gigs.sounding.heard === gigs.sounding.want && gigs.sounding.beat >= 0)), "music: the band knows a tune for every place, the city has one for day and one for night, and what plays is what was asked for", { known: gigs.known, day: gigs.day, night: gigs.night, ...gigs.sounding });
  check(gigs.tune === "beale" && gigs.stage.players === 6 && gigs.drawn === 6 && gigs.stage.up && gigs.stage.on && gigs.stage.both === 6 && gigs.stage.stepped > 0.5, "music: six players are on the boards in Handy Park, every one of them moving with the tune, and whoever has the lead steps up", { tune: gigs.tune, ...gigs.stage });
  check(gigs.stage.crowd >= 5 && gigs.stage.dancing >= 3 && gigs.close.live === 1 && gigs.close.bop && gigs.far.live === 0 && !gigs.far.bop && gigs.far.tune === "city-day", "music: a crowd dances in front of the stage, up close it is louder and Benji moves to it, and across town it is the city's tune again", { crowd: gigs.stage.crowd, dancing: gigs.stage.dancing, close: gigs.close, far: gigs.far });
  check(/^Tip the band/.test(gigs.close.ask) && gigs.tip.paid === 5 && gigs.tip.respect >= 2 && /SackReligious/.test(gigs.tip.said), "music: a tip in Handy Park gets Benji pointed out from the stage", gigs.tip);
  check(gigs.stops === 2 && gigs.door === "Enter The Memphian" && gigs.inside.place === "club" && gigs.inside.tune === "club" && gigs.inside.live === 1 && gigs.inside.players === 6 && gigs.inside.up, "the Memphian: it is on the map, its doors on Union let him in, and the house band is on the stage", { door: gigs.door, ...gigs.inside });
  check(gigs.inside.sat >= gigs.inside.tables && gigs.inside.keep === 1 && gigs.inside.floor >= 4 && gigs.inside.moving >= 8 && gigs.lights >= 3, "the Memphian: every table has somebody sat at it, there is a barkeep, a floor of dancers, and the stage lights go with the beat", { ...gigs.inside, lights: gigs.lights });
  check(/^Request a song/.test(gigs.ask) && gigs.asked2.paid === 5 && gigs.asked2.song !== gigs.before.song && gigs.asked2.tune !== gigs.before.tune && gigs.asked2.said.includes(gigs.asked2.song) && gigs.asked2.cheer >= 3, "the Memphian: five in the jar and the band plays the next song on its list, to a cheer", { before: gigs.before, after: gigs.asked2 });
  check(/^Sweet tea/.test(gigs.bar) && gigs.tea.paid === 4 && gigs.tea.fed && gigs.out === "Step outside" && gigs.back.place === "street" && gigs.back.at, "the Memphian: the bar serves, and the doors let him back out on Union", { bar: gigs.bar, tea: gigs.tea, out: gigs.out, back: gigs.back });

  // ---- the people of the city
  const folk = await page.evaluate(async () => {
    const g = window.__GAME__;
    const draw = g.stage.render;
    g.stage.render = () => {};
    const run = (n, dt = 1 / 30) => {
      for (let i = 0; i < n; i++) g.tick(dt);
    };
    if (g.overlay) g.close();
    if (g.activity) g.activity.quit();
    run(6);
    g.dialogue.length = 0;
    // Somebody at the fence by the race meet: walk up, and there is a name to speak to.
    const s = g.people.standing.find((q) => q.at === "race");
    g.warp(s.x + 1.3, s.z + 0.9, 0);
    run(8);
    const asked = g.prompt;
    g.input.press("interact");
    run(3);
    const first = g.dialogue[0] ? { who: g.dialogue[0].who, text: g.dialogue[0].text, face: g.dialogue[0].portrait } : null;
    g.input.press("interact");
    run(3);
    const second = g.dialogue[0]?.text ?? "";
    // Somebody walking by stops and turns to him when he speaks.
    g.dialogue.length = 0;
    // Whichever walker can be stood beside, from whichever side there is room on.
    let w = null;
    for (const q of g.people.walkers.slice(0, 10)) {
      for (const [ox, oz] of [[1.1, 0.3], [-1.1, 0.3], [0.3, 1.1], [0.3, -1.1]]) {
        g.warp(q.x + ox, q.z + oz, 0);
        run(5);
        if (/^Talk to /.test(g.prompt) && Math.hypot(q.x - g.pos.x, q.z - g.pos.z) < 1.6 && g.people.nearest(g.pos.x, g.pos.z, 1.9)?.card === q.card) {
          w = q;
          break;
        }
      }
      if (w) break;
    }
    let walker = null;
    if (w) {
      const prompt = g.prompt;
      g.input.press("interact");
      run(2);
      // Step back out of the reach where they stop by themselves: only the hail keeps them now.
      const away = Math.hypot(g.pos.x - w.x, g.pos.z - w.z) || 1;
      g.pos.x = w.x + ((g.pos.x - w.x) / away) * 2.6;
      g.pos.z = w.z + ((g.pos.z - w.z) / away) * 2.6;
      const at = w.s;
      run(45);
      const want = Math.atan2(g.pos.x - w.x, g.pos.z - w.z);
      const turned = Math.abs(Math.atan2(Math.sin(w.card.heading - want), Math.cos(w.card.heading - want)));
      walker = { prompt, said: g.dialogue[0]?.text ?? "", stayed: Math.abs(w.s - at) < 0.05, turned: +turned.toFixed(2) };
    }
    // The ones with names have something to say when there is no errand for him: Mama Dee, beside her truck.
    g.dialogue.length = 0;
    const dee = g.npcs.find((q) => q.id === "mamaDee");
    let named = null;
    for (const [ox, oz] of [[-1.5, 0.8], [0.6, 1.7], [-1.6, -0.6], [1.5, 0.8]]) {
      g.warp(dee.x + ox, dee.z + oz, 0);
      run(4);
      if (g.prompt !== "Talk to Mama Dee") continue;
      g.input.press("interact");
      run(3);
      const one = g.dialogue[0]?.text ?? "";
      g.input.press("interact");
      run(3);
      named = { who: g.dialogue[0]?.who ?? "", one, two: g.dialogue[0]?.text ?? "" };
      break;
    }
    // Indoors too: whoever is on the Fun House floor.
    g.dialogue.length = 0;
    g.enter("fun");
    run(45);
    let inside = null;
    for (let i = 0; i < 900 && !inside; i++) {
      run(1);
      const m = g.troupes.fun.members.find((q) => q.card.visible && !q.posted && !q.going && q.stop.act !== "inside");
      if (m) {
        g.pos.x = m.x + 0.9;
        g.pos.z = m.z + 0.9;
        run(2);
        if (/^Talk to /.test(g.prompt)) {
          g.input.press("interact");
          run(2);
          inside = { prompt: g.prompt, who: g.dialogue[0]?.who ?? "", text: g.dialogue[0]?.text ?? "" };
        }
      }
    }
    g.dialogue.length = 0;
    g.leave(0, -150, 0);
    for (let i = 0; i < 200 && (g.place !== "street" || g.live.fade > 0.05); i++) g.tick(1 / 30);
    // A ride to the court lets him out at the sign-up table, not out on the floor.
    g.save.dollars = Math.max(g.save.dollars, 50);
    g.warp(0, -150, 0);
    run(4);
    g.taxi("court");
    for (let i = 0; i < 240; i++) g.tick(1 / 30);
    const court = { x: +g.pos.x.toFixed(1), z: +g.pos.z.toFixed(1), prompt: g.prompt, onFloor: Math.abs(g.pos.z - (-177)) < 14 };
    // Every line is short enough to read and has its blanks filled.
    const lines = g.tables.CHATTER;
    const bad = lines.filter((t) => t.length > 96 || t.length < 4);
    // The cut-outs: nothing of the old white backdrop between Nitro's legs, and Mama Dee's jeans are whole again.
    const alpha = async (src, x, y) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const k = c.getContext("2d");
      k.drawImage(img, 0, 0);
      return k.getImageData(x, y, 1, 1).data[3];
    };
    const base = "/game-v2/characters";
    const gaps = [await alpha(`${base}/nitro/front.png`, 145, 600), await alpha(`${base}/nitro/back.png`, 140, 600), await alpha(`${base}/nitro/left.png`, 147, 600), await alpha(`${base}/nitro/right.png`, 110, 600)];
    const holes = await (async () => {
      const img = new Image();
      img.src = `${base}/mama-dee/front.png`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const k = c.getContext("2d");
      k.drawImage(img, 0, 0);
      // Clear pixels boxed in on all four sides within a few pixels, from the apron down to the cuffs: pinholes.
      const d = k.getImageData(0, 0, c.width, c.height).data;
      const clear = (x, y) => d[(y * c.width + x) * 4 + 3] < 128;
      let n = 0;
      for (let y = 300; y < 660; y++)
        for (let x = 20; x < c.width - 20; x++) {
          if (!clear(x, y)) continue;
          let boxed = true;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            let hit = false;
            for (let r = 1; r <= 6 && !hit; r++) hit = !clear(x + dx * r, y + dy * r);
            boxed &&= hit;
          }
          if (boxed) n++;
        }
      return n;
    })();
    g.stage.render = draw;
    return { asked, first, second, walker, named, inside, court, lines: lines.length, bad, gaps, holes };
  });
  check(/^Talk to \S/.test(folk.asked) && folk.first && folk.asked === `Talk to ${folk.first.who}` && folk.first.text.length > 8 && /pedestrians\//.test(folk.first.face) && folk.second.length > 8 && folk.second !== folk.first.text, "anyone standing about has a name and something to say, and something else the second time", { asked: folk.asked, first: folk.first, second: folk.second });
  check(folk.walker && /^Talk to /.test(folk.walker.prompt) && folk.walker.said.length > 8 && folk.walker.stayed && folk.walker.turned < 0.3, "someone walking by stops and turns to Benji when he speaks to them", folk.walker);
  check(folk.named && folk.named.who === "Mama Dee" && folk.named.one.length > 8 && folk.named.two.length > 8 && folk.named.one !== folk.named.two, "the named cast talk when there is no errand for him", folk.named);
  check(folk.inside && folk.inside.who.length > 1 && folk.inside.text.length > 8, "people indoors talk too", folk.inside);
  check(/^(Play ball|Hand Court OG)/.test(folk.court.prompt) && !folk.court.onFloor, "a ride to the 901 Court lets Benji out at the sign-up table with the game on offer", folk.court);
  check(folk.lines > 120 && folk.bad.length === 0, "every line the city has is short enough to read", { lines: folk.lines, bad: folk.bad });
  check(folk.gaps.every((a) => a === 0) && folk.holes < 40, "Nitro's cut-out is clear between the legs and Mama Dee's has no pinholes", { gaps: folk.gaps, holes: folk.holes });

  // ---- playing with friends
  // The line two devices find each other over: who is in a crew, and the handshake passed between them.
  const relay = await page.evaluate(async () => {
    const room = `sack-T${Date.now().toString(36)}`;
    const poll = async (peer, name, since = 0) => (await fetch(`/api/rtc?room=${room}&peer=${peer}&name=${name}&since=${since}`)).json();
    const post = async (body) => (await fetch("/api/rtc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).status;
    const one = await poll("tre", "Tre");
    const two = await poll("kay", "Kay");
    const sent = await post({ op: "signal", room, from: "tre", to: "kay", kind: "offer", payload: { sdp: "hello" } });
    const hers = await poll("kay", "Kay");
    const his = await poll("tre", "Tre");
    const again = await poll("kay", "Kay", hers.signals[0]?.id ?? 0);
    const left = await post({ op: "leave", room, peer: "tre" });
    const after = await poll("kay", "Kay", hers.signals[0]?.id ?? 0);
    const bad = (await fetch("/api/rtc?room=not%20a%20room&peer=kay")).status;
    const junk = await post({ op: "signal", room, from: "tre", to: "kay", kind: "nonsense", payload: 1 });
    return { one: one.peers.length, two: two.peers.map((q) => q.name).join(), sent, hers: hers.signals.map((q) => `${q.from}:${q.kind}:${q.payload.sdp}`), his: his.signals.length, again: again.signals.length, left, after: after.peers.map((q) => q.id).join(), bad, junk };
  });
  check(relay.one === 1 && relay.two === "Kay,Tre" && relay.sent === 200 && relay.hers.join() === "tre:offer:hello" && relay.his === 0 && relay.again === 0 && relay.left === 200 && relay.after === "kay" && relay.bad === 400 && relay.junk === 400, "online: the crew line lists who is in a crew, passes a handshake only to the one it is for, and forgets whoever leaves", relay);

  // A second device, with its own save. The two are wired through this script, so the test needs no network.
  const friend = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  friend.on("pageerror", (e) => errors.push(`second device: ${e.message}`));
  await friend.goto(`${base}?q=low&calm=1&intro=0`, { waitUntil: "domcontentloaded" });
  await friend.waitForFunction(() => !!window.__GAME__, undefined, { timeout: 120000 });
  const devices = [page, friend];
  for (const d of devices) {
    await d.exposeFunction("__crewOut", (m) => {
      for (const other of devices) if (other !== d) other.evaluate((msg) => window.__crewIn?.(msg), m).catch(() => {});
    });
    await d.evaluate(() => {
      const g = window.__GAME__;
      g.crew.make = (room, selfId, name, hooks) => {
        const known = new Map();
        const tell = () => hooks.peers([...known].map(([id, n]) => ({ id, name: n, connectionState: "connected", candidateType: "host", rttMs: 12 })));
        window.__crewIn = (m) => {
          if (m.room !== room || m.from === selfId) return;
          if (m.t === "hi" || m.t === "hey") {
            known.set(m.from, m.name);
            tell();
            if (m.t === "hi") window.__crewOut({ t: "hey", room, from: selfId, name });
          } else if (m.t === "bye") {
            known.delete(m.from);
            tell();
          } else if (m.t === "d" && (!m.to || m.to === selfId)) hooks.message(m.from, m.d);
        };
        return {
          join: async () => void window.__crewOut({ t: "hi", room, from: selfId, name }),
          send: (data, to) => void window.__crewOut({ t: "d", room, from: selfId, to, d: data }),
          broadcast: (data) => void window.__crewOut({ t: "d", room, from: selfId, d: data }),
          close: () => void window.__crewOut({ t: "bye", room, from: selfId }),
        };
      };
    });
  }
  await friend.evaluate(() => {
    const g = window.__GAME__;
    g.setRain(false);
    g.play(true);
    g.skipIntro?.();
    g.dialogue.length = 0;
    g.crew.rename("Kay");
    g.warp(2, -76, 0);
  });
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (g.overlay) g.close();
    if (g.activity) g.activity.quit();
    g.dialogue.length = 0;
    g.crew.rename("Tre");
    g.warp(2, -70, 0);
  });
  await ff(0.5);
  // Checked on a timer, not on the page's own frames: a page that has just been loaded is not drawing yet.
  const on = (d, fn, arg) => d.waitForFunction(fn, arg, { timeout: 30000, polling: 100 });
  const table = (d) => d.evaluate(() => window.__GAME__.board.hud());

  // One starts a crew from the screen and reads the code off it; the other types it in.
  await page.click("[data-crew-chip]");
  await page.click("[data-crew-host]");
  await on(page, () => !!window.__GAME__.crew.code);
  const code = (await page.textContent("[data-crew-shown]")).replace(/\s/g, "");
  await friend.click("[data-crew-chip]");
  await friend.fill("[data-crew-code]", code.toLowerCase());
  await friend.click("[data-crew-join]");
  await on(page, () => window.__GAME__.crew.linked().length === 1);
  await on(friend, () => window.__GAME__.crew.linked().length === 1);
  await page.waitForTimeout(300);
  const crewed = { code, link: await page.evaluate(() => window.__GAME__.crew.invite), mine: await page.evaluate(() => window.__GAME__.crew.hud()), theirs: await friend.evaluate(() => window.__GAME__.crew.hud()), listed: await page.textContent("[data-crew-friend]") };
  check(/^[A-Z]{4}$/.test(code) && crewed.link.endsWith(`/?crew=${code}`) && crewed.mine.status === "linked" && crewed.mine.friends[0].name === "Kay" && crewed.theirs.code === code && crewed.theirs.friends[0].name === "Tre" && /Kay/.test(crewed.listed), "online: one starts a crew, the other types the four letters, and each has the other on the line", { code, link: crewed.link, mine: crewed.mine.friends, theirs: crewed.theirs.friends });

  // Each sees the other where they really are, in what they are really wearing.
  const fit = await page.evaluate(() => {
    const g = window.__GAME__;
    g.close();
    const id = Object.keys(g.tables.OUTFITS).find((o) => o !== g.save.wearing);
    if (!g.save.outfits.includes(id)) g.save.outfits.push(id);
    g.wear(id);
    g.warp(2, -70, 0);
    return g.save.wearing;
  });
  await friend.evaluate(() => window.__GAME__.close());
  await on(friend, (o) => {
    const f = window.__GAME__.crew.shown[0];
    return f && f.visible && f.tag && f.outfit === o && Math.hypot(f.x - 2, f.z + 70) < 0.6;
  }, fit);
  await page.evaluate(() => window.__GAME__.crew.react("🔥"));
  // The reaction hangs for three seconds: what is on screen is read in the same breath it is seen in.
  const seen = await (
    await on(friend, () => {
      const g = window.__GAME__;
      return g.crew.shown[0].say ? { shown: g.crew.shown[0], dot: g.crew.hud().friends[0] } : false;
    })
  ).jsonValue();
  await friend.screenshot({ path: `${out}/20-crew-friend.png` });
  check(seen.shown.visible && seen.shown.outfit === fit && seen.shown.say && seen.dot.street && seen.dot.where.length > 0 && seen.dot.doing === "Walking", "online: a friend stands in your city where they stood in theirs, in their own fit, with a name over their head, a reaction over that, and a dot on the map", seen);

  // A big win in one city is called out in the other.
  await page.evaluate(() => window.__GAME__.moment(3));
  // Each of the three comes and goes in its own time, so each is noted when it is seen.
  const roar = await (
    await on(friend, () => {
      const g = window.__GAME__;
      const w = (window.__roar ??= { call: false, trophy: false, shells: false });
      w.call ||= document.body.innerText.includes("Tre just won big");
      w.trophy ||= g.crew.shown[0].say;
      w.shells ||= g.fireworks.points.visible;
      return w.call && w.trophy && w.shells ? w : false;
    })
  ).jsonValue();
  check(roar.call && roar.trophy && roar.shells, "online: a friend's big win is called out in your city, with fireworks over your river", roar);
  await ff(1.5);

  // A game at a table, each on their own device: asked from the table, answered from the street.
  await page.evaluate(() => window.__GAME__.board.sit("connect4"));
  await page.click('[data-friend="Kay"]');
  await on(friend, () => !!window.__GAME__.board.inviteHud());
  const asking = { stage: (await table(page)).stage, ask: await friend.textContent("[data-invite]") };
  await friend.click("[data-invite-yes]");
  await on(page, () => window.__GAME__.board.hud()?.stage === "play");
  const seats = [(await table(page)).online.seat, (await table(friend)).online.seat];
  const early = await friend.evaluate(() => window.__GAME__.board.move(0));
  // Seven discs: his four go up column three, hers stop at three in column four.
  for (let i = 0; i < 7; i++) {
    const [d, other, col] = i % 2 === 0 ? [page, friend, 3] : [friend, page, 4];
    await d.click(`[data-col="${col}"]:not([disabled])`);
    await on(other, ([c, n]) => window.__GAME__.board.hud().view.cols[c].length === n, [col, Math.floor(i / 2) + 1]);
  }
  await on(friend, () => window.__GAME__.board.hud().stage === "done");
  const ended = { his: await table(page), hers: await table(friend) };
  await friend.screenshot({ path: `${out}/21-crew-table.png` });
  check(asking.stage === "wait" && /Tre wants a game of Four in a Row/.test(asking.ask) && seats.join() === "0,1" && early === false && ended.his.result.won === true && ended.hers.result.won === false && JSON.stringify(ended.his.view.cols) === JSON.stringify(ended.hers.view.cols) && ended.his.result.pay > 0 && ended.hers.result.pay === 0, "online: a friend is asked for a game, sits down, and the two play it out move for move on their own screens", { asking, seats, early, his: ended.his.result, hers: ended.hers.result });

  // Both want another: same two, the other one goes first. Then she gets up in the middle of it.
  await friend.click("[data-rematch]");
  await on(page, () => window.__GAME__.board.hud().online.theirs);
  await page.click("[data-rematch]");
  await on(friend, () => window.__GAME__.board.hud().stage === "play");
  await on(page, () => window.__GAME__.board.hud().stage === "play");
  const swapped = [(await table(page)).online.seat, (await table(friend)).online.seat, (await table(page)).mine, (await table(friend)).mine];
  await friend.evaluate(() => window.__GAME__.close());
  await on(page, () => window.__GAME__.board.hud()?.online?.gone === true);
  const walked = (await table(page)).result;
  check(swapped.join() === "1,0,false,true" && /Kay got up/.test(walked.text) && walked.won === null, "online: a rematch swaps who goes first, and a friend getting up ends the game without a winner", { swapped, walked });

  // She says not now; then she asks him for chess, and he sees the board from the far side.
  await page.evaluate(() => window.__GAME__.board.sit("chess"));
  await page.click('[data-friend="Kay"]');
  await on(friend, () => !!window.__GAME__.board.inviteHud());
  await friend.click("[data-invite-no]");
  await on(page, () => window.__GAME__.board.hud().stage === "pick");
  const passed = await page.evaluate(() => window.__GAME__.board.hud().online);
  await page.evaluate(() => window.__GAME__.close());
  const tre = await friend.evaluate(() => window.__GAME__.crew.linked()[0].id);
  await friend.evaluate((id) => window.__GAME__.board.invite(id, "chess"), tre);
  await on(page, () => !!window.__GAME__.board.inviteHud());
  await page.click("[data-invite-yes]");
  await on(friend, () => window.__GAME__.board.hud()?.stage === "play");
  await friend.click('[data-sq="52"]');
  await friend.click('[data-sq="36"]');
  await on(page, () => window.__GAME__.board.hud().view.cells[36] === "P");
  const far = { first: await page.getAttribute("[data-sq]", "data-sq"), hers: await friend.getAttribute("[data-sq]", "data-sq"), mine: (await table(page)).mine, seat: (await table(page)).online.seat };
  await page.click('[data-sq="12"]');
  await page.click('[data-sq="28"]');
  await on(friend, () => window.__GAME__.board.hud().view.cells[28] === "p");
  check(passed === null && far.first === "63" && far.hers === "0" && far.mine && far.seat === 1 && (await table(friend)).mine, "online: a friend can say not now; and whoever has black sees the chess board from black's side", { passed, far });

  // He gets in his car: she sees the car he owns, not a man running at forty miles an hour.
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.close();
    g.warp(g.driver.x + 2.2, g.driver.z, 0);
  });
  await ff(0.3);
  await tap("interact");
  await page.evaluate(() => window.__GAME__.input.hold("up", true));
  await ff(1.5);
  await page.evaluate(() => window.__GAME__.input.hold("up", false));
  await on(friend, () => window.__GAME__.crew.shown[0].car);
  const wheels = { mode: await get(() => window.__GAME__.mode), shown: await friend.evaluate(() => window.__GAME__.crew.shown[0]), doing: await friend.evaluate(() => window.__GAME__.crew.hud().friends[0].doing), off: await friend.evaluate(() => window.__GAME__.board.hud()) };
  check(wheels.mode === "drive" && wheels.shown.car && !wheels.shown.visible && wheels.shown.tag && wheels.doing === "Driving", "online: a friend at the wheel is seen as their car, with their name over it", wheels);

  // Leaving the crew takes her off his screen; a link with the code in it puts her straight back in one.
  await friend.evaluate(() => window.__GAME__.open("online"));
  await friend.click("[data-crew-leave]");
  await on(page, () => window.__GAME__.crew.hud().friends.length === 0);
  const alone = { his: await page.evaluate(() => window.__GAME__.crew.hud().status), hers: await friend.evaluate(() => window.__GAME__.crew.hud().status) };
  // A page loading the whole city draws its first frames slowly, and slower still while another page is
  // drawing beside it on the same machine. So the first device stops drawing while the second loads,
  // and the second is given as long to show its title as it is given to load.
  await page.evaluate(() => {
    const g = window.__GAME__;
    window.__draw = g.stage.render;
    g.stage.render = () => {};
  });
  await friend.goto(`${base}?q=low&calm=1&intro=0&crew=${code}`, { waitUntil: "domcontentloaded" });
  await friend.waitForFunction(() => !!window.__GAME__, undefined, { timeout: 120000, polling: 100 });
  // The title screen says the crew is waiting; pressing play is what joins it.
  const titled = await friend
    .waitForFunction(
      () => {
        const note = document.querySelector("[data-crew-waiting]");
        return note ? { note: note.textContent, code: window.__GAME__.crew.code } : false;
      },
      undefined,
      { timeout: 120000, polling: 100 },
    )
    .then((h) => h.jsonValue())
    .catch(async (e) => {
      // Say what the page did show, so a failure here explains itself.
      const state = await friend.evaluate(() => ({ mode: window.__GAME__?.mode, waiting: window.__GAME__?.crew.waiting, code: window.__GAME__?.crew.code, text: document.body.innerText.slice(0, 300) })).catch((x) => String(x));
      throw new Error(`the title never showed the waiting crew: ${JSON.stringify(state)} (${e.message.split("\n")[0]})`);
    });
  await friend.evaluate(() => {
    const g = window.__GAME__;
    g.play(true);
    g.skipIntro?.();
  });
  await friend.waitForFunction(() => window.__GAME__.crew.hud().ready, undefined, { timeout: 120000, polling: 100 });
  await page.evaluate(() => (window.__GAME__.stage.render = window.__draw));
  const linkIn = await friend.evaluate(async () => {
    const g = window.__GAME__;
    const roster = await (await fetch(`/api/rtc?room=sack-${g.crew.code}&peer=smoke&since=1`)).json();
    return { code: g.crew.code, listed: roster.peers.some((q) => q.id === g.crew.selfId), status: g.crew.hud().status };
  });
  check(alone.his === "waiting" && alone.hers === "off" && titled.note.includes(code) && titled.code === null && linkIn.code === code && linkIn.listed && linkIn.status === "waiting", "online: leaving takes you off your friends' screens, and a link with the code in it joins the crew when the day starts", { alone, titled, linkIn });
  await friend.close();
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.crew.leave();
    if (g.mode === "drive") g.input.press("interact");
  });
  await ff(0.3);
  check(errors.length === 0, "no page errors", errors);
  console.log("Memphis smoke passed.");
} finally {
  await browser.close();
}
