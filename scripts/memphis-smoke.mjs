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
    const sides = [L.bots.filter((b) => b.team === 0).length, L.bots.filter((b) => b.team === 1).length];
    // Stand in front of the pink base with a clear line and put three into it.
    const base = L.bases[1];
    g.pos.x = base.x - 3;
    g.pos.z = base.z + 1.5;
    g.camYaw = Math.atan2(base.x - g.pos.x, base.z - g.pos.z);
    for (const b of L.bots) b.stun = 30;
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
  check(tag.sides.join() === "2,4" && tag.scored.hits === 3 && tag.scored.dark && tag.scored.score >= 400, "laser tag has teams and a base that pays when it goes down", tag);
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
    const pink = l.bots.find((b) => b.team === 1);
    pink.x = g.pos.x + Math.sin(g.camYaw) * 5;
    pink.z = g.pos.z + Math.cos(g.camYaw) * 5;
    pink.tx = pink.x;
    pink.tz = pink.z;
    pink.stun = 0;
    tick();
    const lock = l.lock.visible && l.aimed() === pink;
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
  check(round.laser.lock && round.laser.dash.moved > 2 && round.laser.dash.shook && round.laser.frenzy && round.laser.worth === 2, "laser tag marks the target, a dash shakes off a pink lining him up, and the last twenty seconds count double", round.laser);
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
    const { OUTFITS, PEDS, BALLERS, CAST, POSTCARDS } = g.tables;
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
    const people = [...Object.values(OUTFITS).map((o) => o.art), ...PEDS.map((q) => q.art), ...BALLERS, ...Object.values(CAST).map((c) => c.art)];
    const files = [...new Set(people.flatMap(every))];
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
    return { files: files.length, broken, album: { cards: album.postcards.length, fish: album.fish.length, ranks: album.ranks.length }, shown, blank, held, caught, reeling, landed, book, drawn, fist, down, posed, dropped, talking, quiet, hands, still: still.length, after, drive };
  });
  check(pics.files > 150 && pics.broken.length === 0, "every drawing a character can be shown as is a real picture", { files: pics.files, broken: pics.broken });
  check(pics.shown.cards === 6 && pics.shown.got >= 1 && pics.shown.fish === 8 && pics.shown.ranks === 7 && pics.shown.earned >= 3 && pics.blank.length === 0, "the album shows the postcards, the fish book and the names, each with its picture", { shown: pics.shown, blank: pics.blank });
  check(/postcards\/pyramid\.webp$/.test(pics.held.img) && pics.held.title === "The Pyramid", "a postcard is held up when it is collected", pics.held);
  check(/fish\/largemouth-bass\.webp$/.test(pics.caught.img ?? "") && pics.book === pics.caught.lb && pics.reeling === "reel" && pics.landed === "cheer", "a catch has its picture, goes in the fish book, and Benji leans on the rod and then celebrates", { caught: pics.caught, book: pics.book, reeling: pics.reeling, landed: pics.landed });
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
    const shoved = { pushed: a.state, v: +a.v.toFixed(2) };
    // Played out with good throws, it ends on a card and counts as a win.
    c.start();
    run(12);
    g.sound = quiet;
    let guard = 0;
    while (guard++ < 40000 && !g.overlay) {
      g.tick(1 / 30);
      if (c.phase === "aim" && c.t > 0.3) c.toss(0, (Math.random() - 0.5) * 0.2, 0.62 + Math.random() * 0.07, 0, 0);
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
  check(rec.first.state === "in" && rec.short.includes("grass") && rec.shoved.pushed !== "hand" && (rec.shoved.pushed === "in" || rec.shoved.v > 0.85), "cornhole: a bag slides up into the hole, a short one lands on the grass, and one bag shoves another", { first: rec.first, short: rec.short, shoved: rec.shoved });
  check(/BAGS/.test(rec.bags.title) && rec.bags.score[0] >= 21 && rec.bags.wins === 1, "cornhole: a match is played out to 21 and counts as a win", rec.bags);
  check(rec.opening.phase === "serve" && rec.opening.server === 0 && /FAULT/.test(rec.fault.call) && rec.fault.pts === "0,0" && rec.box.live && rec.box.x > 0 && rec.box.x < 6.5, "tennis: a serve hit too hard is a fault, and a good one comes down in the box", { opening: rec.opening, fault: rec.fault, box: rec.box });
  check(rec.match.title.length > 0 && Math.max(...rec.match.games) === 3 && rec.match.hits > 5 && rec.match.longest >= 3, "tennis: a match is rallied out to three games", rec.match);
  check(rec.sky.flew > 20 && rec.sky.y > 60 && rec.sky.day === 0 && rec.sky.night > 0.03, "a blimp circles over the city, and searchlights come on over the boutique after dark", rec.sky);
  check(errors.length === 0, "no page errors", errors);
  console.log("Memphis smoke passed.");
} finally {
  await browser.close();
}
