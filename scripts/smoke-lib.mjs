import { writeFile } from "node:fs/promises";
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

const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

let consecutiveShotFails = 0;

export async function captureShot(page, dest) {
  if (consecutiveShotFails >= 3) {
    await writeFile(dest, EMPTY_PNG);
    console.warn(`shot skipped: ${dest}`);
    return false;
  }
  try {
    await page.screenshot({
      path: dest,
      fullPage: false,
      timeout: 4000,
      animations: "disabled",
    });
    consecutiveShotFails = 0;
    console.log(`shot: ${dest}`);
    return true;
  } catch (err) {
    consecutiveShotFails += 1;
    console.warn(`playwright shot failed ${dest}: ${err?.message || err}`);
  }
  await writeFile(dest, EMPTY_PNG);
  console.warn(`shot placeholder: ${dest}`);
  return false;
}
