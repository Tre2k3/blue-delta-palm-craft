#!/usr/bin/env node
// Two real browsers in one crew, through the real /api/rtc and a real peer-to-peer connection.
// The smoke test wires its two devices together itself, so it needs no network; this is the
// same story over the real line. Run it by hand against a running game: `npm run test:crew`.
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
  // Both browsers are on this machine: let them offer each other its own address.
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-features=WebRtcHideLocalIpsWithMdns", "--allow-loopback-in-peer-connection"],
});
await mkdir(out, { recursive: true });
const errors = [];
const check = (ok, name, detail) => {
  assert.ok(ok, `${name}: ${JSON.stringify(detail)}`);
  console.log(`PASS: ${name}`, detail ?? "");
};
const code = "Q" + Array.from({ length: 3 }, () => "ABCDEFGHJKLMNPRSTUVWXYZ"[Math.floor(Math.random() * 23)]).join("");

// Each in its own browser profile, as two people would be, and each arriving by the link.
const open = async (name) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript((n) => localStorage.setItem("sack-v2-name", n), name);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(`${base}?q=low&calm=1&intro=0&crew=${code}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__GAME__, undefined, { timeout: 120000 });
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.setRain(false);
    g.play(true);
    g.skipIntro?.();
    g.dialogue.length = 0;
  });
  return page;
};
const on = (page, fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });
const table = (page) => page.evaluate(() => window.__GAME__.board.hud());

try {
  const tre = await open("Tre");
  const kay = await open("Kay");
  const started = Date.now();
  await on(tre, () => window.__GAME__.crew.linked().length === 1);
  await on(kay, () => window.__GAME__.crew.linked().length === 1);
  const linked = { ms: Date.now() - started, tre: await tre.evaluate(() => window.__GAME__.crew.hud().friends[0].name), kay: await kay.evaluate(() => window.__GAME__.crew.hud().friends[0].name) };
  check(linked.tre === "Kay" && linked.kay === "Tre", "two browsers that open the same link find each other and connect", linked);

  const fit = await tre.evaluate(() => {
    const g = window.__GAME__;
    const id = Object.keys(g.tables.OUTFITS).find((o) => o !== g.save.wearing);
    if (!g.save.outfits.includes(id)) g.save.outfits.push(id);
    g.wear(id);
    g.warp(2, -70, 0);
    return g.save.wearing;
  });
  await kay.evaluate(() => window.__GAME__.warp(2, -76, 0));
  await on(kay, (o) => {
    const f = window.__GAME__.crew.shown[0];
    return f && f.visible && f.outfit === o && Math.hypot(f.x - 2, f.z + 70) < 0.6;
  }, fit);
  await tre.evaluate(() => window.__GAME__.crew.react("🔥"));
  await on(kay, () => window.__GAME__.crew.shown[0].say);
  await kay.waitForTimeout(500);
  await kay.screenshot({ path: `${out}/crew-live-friend.png` });
  check(true, "one sees the other where they stand, in their fit, and the reaction they threw", await kay.evaluate(() => window.__GAME__.crew.shown[0]));

  await tre.evaluate(() => {
    const g = window.__GAME__;
    g.warp(g.driver.x + 2.2, g.driver.z, 0);
  });
  await tre.waitForTimeout(400);
  await tre.evaluate(() => window.__GAME__.input.press("interact"));
  await on(tre, () => window.__GAME__.mode === "drive");
  await tre.evaluate(() => window.__GAME__.input.hold("up", true));
  await on(kay, () => window.__GAME__.crew.shown[0].car);
  await tre.evaluate(() => window.__GAME__.input.hold("up", false));
  check(true, "a friend who drives off is seen as their car", await kay.evaluate(() => window.__GAME__.crew.shown[0]));

  // Tic-tac-toe: he asks, she says yes, X takes the top row.
  const kayId = await tre.evaluate(() => window.__GAME__.crew.linked()[0].id);
  await tre.evaluate((id) => window.__GAME__.board.invite(id, "tictactoe"), kayId);
  await on(kay, () => !!window.__GAME__.board.inviteHud());
  await kay.click("[data-invite-yes]");
  await on(tre, () => window.__GAME__.board.hud()?.stage === "play");
  for (const [page, other, cell] of [
    [tre, kay, 0],
    [kay, tre, 3],
    [tre, kay, 1],
    [kay, tre, 4],
    [tre, kay, 2],
  ]) {
    await page.click(`[data-cell="${cell}"]:not([disabled])`);
    await on(other, (c) => window.__GAME__.board.hud().view.cells[c] !== 0, cell);
  }
  await on(kay, () => window.__GAME__.board.hud().stage === "done");
  const result = { his: (await table(tre)).result, hers: (await table(kay)).result };
  check(result.his.won === true && result.hers.won === false, "a game asked for across the line is played out on both screens", result);

  await tre.click("[data-rematch]");
  await on(kay, () => window.__GAME__.board.hud().online.theirs);
  await kay.click("[data-rematch]");
  await on(tre, () => window.__GAME__.board.hud().stage === "play");
  const seats = [(await table(tre)).online.seat, (await table(kay)).online.seat];
  check(seats.join() === "1,0", "a rematch swaps who goes first", seats);

  // She closes the window in the middle of it: he is told.
  await kay.context().close();
  await on(tre, () => window.__GAME__.board.hud()?.online?.gone === true, undefined, 60000);
  check(true, "a friend whose window closes is seen to have dropped off", (await table(tre)).result);
  check(errors.length === 0, "no page errors", errors);
  console.log("Crew line check passed.");
} finally {
  await browser.close();
}
