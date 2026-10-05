import { captureGameFrame } from "./browser-frame.mjs";
import { chromium } from "playwright";

export function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function createOk(failures) {
  return function ok(cond, message, detail) {
    if (cond) console.log(`PASS: ${message}`);
    else {
      failures.push(message);
      const extra = detail ? ` :: ${safeJson(detail)}` : "";
      console.error(`FAIL: ${message}${extra}`);
    }
  };
}

export function installHardTimeout(label, ms = Number(process.env.SMOKE_HARD_TIMEOUT_MS || 240000)) {
  const killer = setTimeout(() => {
    console.error(`${label} hard timeout`);
    process.exit(1);
  }, ms);
  killer.unref?.();
  return () => clearTimeout(killer);
}

export async function launchBrowser(webgl = true) {
  const headed = process.env.SMOKE_HEADED !== "0";
  const args = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
  ];
  if (webgl) args.push("--enable-webgl");
  return chromium.launch({
    headless: !headed,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args,
  });
}

export async function preparePage(page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("sackreligious-memphis-v3")) localStorage.setItem("sackreligious-memphis-v3", JSON.stringify({ version: 3, owned: ["starter_tee"], settings: { quality: "low" } }));
  });
  await page.bringToFront();
  try {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await session.send("Page.setWebLifecycleState", { state: "active" }).catch(() => {});
  } catch {
    /* older chromium */
  }
}

export async function closeBrowser(browser) {
  if (!browser) return;
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 4000))]);
}

export async function captureShot(page, dest) {
  await captureGameFrame(page, dest);
  console.log(`shot: ${dest}`);
  return true;
}

/** Shared boot flow: wait for the engine, then select the real New Game UI. */
export async function enterGame(page, url, fresh = true) {
  const target = new URL(url);
  target.searchParams.set("qa", "1");
  target.searchParams.set("hauntdebug", "1");
  if (!target.searchParams.has("season")) target.searchParams.set("season", "none");
  await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => !!window.__sack, null, { timeout: 90000 });
  const rotate = page.getByRole("button", { name: /^LANDSCAPE/ });
  if (await rotate.count()) await rotate.click({ force: true });
  await page.getByRole("button", { name: fresh ? /^NEW GAME$/ : /^CONTINUE$/ }).click({ force: true });
  await page.waitForFunction(() => window.__sack.started, null, { timeout: 20000 });
  await page.keyboard.press("e"); // normal briefing skip
  await page.waitForFunction(() => !window.__sack.cinematic, null, { timeout: 30000 });
}
