import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
await page.waitForFunction(
  () => window.__gameTest && window.__controlsTest && window.__gameTest.enterHQ,
  { timeout: 15000 },
);

const log = async (label) => {
  const s = await page.evaluate(() => window.__gameTest.getState());
  console.log(label, JSON.stringify(s));
  return s;
};

const drainDialogue = async () => {
  for (let i = 0; i < 6; i++) {
    const mode = await page.evaluate(() => window.__gameTest.getState().mode);
    if (mode !== "dialogue") break;
    await page.evaluate(() => window.__gameTest.advanceDialogue());
    await page.waitForTimeout(120);
  }
};

await page.evaluate(() => window.__gameTest.resetSave());
await page.waitForTimeout(200);
await log("fresh");

await page.evaluate(() => {
  window.__controlsTest.setKeys(["KeyS"]);
});
await page.waitForTimeout(900);
await page.evaluate(() => window.__controlsTest.setKeys([]));
await page.waitForFunction(() => window.__gameTest.getState().step === "link_k", { timeout: 8000 }).catch(() => {});
await log("after walk");

await page.evaluate(() => window.__gameTest.enterHQ());
await page.waitForTimeout(200);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(250);
await drainDialogue();
await log("after K talk");

await page.evaluate(() => window.__gameTest.teleport("dropvan"));
await page.waitForTimeout(150);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(200);
await log("after van");

for (const loc of ["neighborhood", "downtown", "culture"]) {
  await page.evaluate((l) => window.__gameTest.teleport(l), loc);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__gameTest.interact());
  await page.waitForTimeout(150);
  await drainDialogue();
  await log("after " + loc);
}

await page.evaluate(() => window.__gameTest.teleport("court"));
await page.waitForTimeout(150);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(200);
await log("court enter");
await page.evaluate(() => window.__gameTest.setBallScore(8));
await page.waitForTimeout(200);
await log("after score 8");
const leave = page.getByRole("button", { name: /Leave court/i });
if (await leave.count()) await leave.click();
await page.waitForTimeout(300);
await log("after leave court");

await page.evaluate(() => window.__gameTest.enterHQ());
await page.waitForTimeout(200);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(200);
await drainDialogue();
const final = await log("FINAL");

await page.evaluate(() => window.__gameTest.enterHQShop?.());
await page.waitForTimeout(200);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/mission-done.png" });
await log("shop open?");

if ((await page.evaluate(() => window.__gameTest.getState().mode)) === "shop") {
  const back = page.getByRole("button", { name: /Back to streets/i });
  if (await back.count()) await back.click({ force: true, timeout: 5000 }).catch(() => {});
}
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/final-world.png" });

const pageErrors = errors.filter((e) => !/status of 404/.test(e) && !/Failed to load resource/.test(e));
console.log("ERRORS:", pageErrors);
console.log("SUCCESS:", final.missionComplete === true);
await browser.close();
process.exit(final.missionComplete ? 0 : 1);
