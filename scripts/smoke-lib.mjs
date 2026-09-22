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

export function installHardTimeout(
  label,
  ms = Number(process.env.SMOKE_HARD_TIMEOUT_MS || 240000),
) {
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
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
  ];
  if (process.env.SMOKE_SINGLE_PROCESS === "1")
    args.push("--single-process", "--in-process-gpu", "--no-zygote");
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

export async function captureShot(page, dest) {
  // Capture one rendered frame without a continuous WebGL loop starving the
  // compositor on software-rendered CI hosts. Resume the real loop afterwards.
  const wasRunning = await page.evaluate(() => {
    const engine = window.__gameTest?.getEngine?.();
    if (!engine?.running) return false;
    engine.running = false;
    cancelAnimationFrame(engine.raf);
    engine.draw();
    return true;
  });
  try {
    await page.screenshot({ path: dest, fullPage: false, timeout: 20000, animations: "disabled" });
    console.log(`shot: ${dest}`);
    return true;
  } finally {
    if (wasRunning) await page.evaluate(() => window.__gameTest.getEngine().startLoop());
  }
}
