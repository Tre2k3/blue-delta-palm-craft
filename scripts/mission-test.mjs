import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
await page.waitForTimeout(800);

// Wait for __gameTest
await page.waitForFunction(() => window.__gameTest, { timeout: 10000 });

const log = async (label) => {
  const s = await page.evaluate(() => window.__gameTest.getState());
  console.log(label, JSON.stringify(s));
  return s;
};

await page.evaluate(() => window.__gameTest.resetSave());
await page.waitForTimeout(200);
await log("fresh");

// Leave apartment for wake
await page.evaluate(() => window.__gameTest.teleport("apartment"));
// walk south by teleporting slightly out
await page.evaluate(() => {
  const g = window.__gameTest;
  g.teleport("store"); // leaving apartment area completes wake via leftSpawn
});
// Force leave: teleport far
await page.evaluate(() => {
  // start near store so wake can complete - but wake needs leftSpawn from apartment exit
  // reset and set leftSpawn by teleporting then checking mission auto
});
// Manually complete via interacting mission flow:
// 1. teleport store, interact for K, advance dialogue
await page.evaluate(() => window.__gameTest.resetSave());
// mark leftSpawn by moving via setKeys briefly
await page.evaluate(() => {
  window.__controlsTest.setKeys(["KeyS"]);
});
await page.waitForTimeout(400);
await page.evaluate(() => window.__controlsTest.setKeys([]));
await log("after walk");

// Link K
await page.evaluate(() => window.__gameTest.teleport("store"));
await page.waitForTimeout(200);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(300);
// advance dialogue twice
await page.evaluate(() => window.__gameTest.advanceDialogue());
await page.waitForTimeout(150);
await page.evaluate(() => window.__gameTest.advanceDialogue());
await page.waitForTimeout(200);
await log("after K talk");

// Pickup van
await page.evaluate(() => window.__gameTest.teleport("dropvan"));
await page.waitForTimeout(150);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(200);
await log("after van");

// Deliveries
for (const loc of ["neighborhood", "downtown", "culture"]) {
  await page.evaluate((l) => window.__gameTest.teleport(l), loc);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__gameTest.interact());
  await page.waitForTimeout(150);
  // if dialogue opened, advance
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      if (window.__gameTest.getState().mode === "dialogue") window.__gameTest.advanceDialogue();
    });
    await page.waitForTimeout(100);
  }
  await log("after " + loc);
}

// Basketball
await page.evaluate(() => window.__gameTest.teleport("court"));
await page.waitForTimeout(150);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(200);
await log("court enter");
await page.evaluate(() => window.__gameTest.setBallScore(8));
await page.waitForTimeout(200);
await log("after score 8");
await page.evaluate(() => {
  // leave court via exit if still in basketball
  if (window.__gameTest.getState().mode === "basketball") {
    // press leave - call through DOM
  }
});
// click Leave court if present
const leave = page.getByRole("button", { name: /Leave court/i });
if (await leave.count()) await leave.click();
await page.waitForTimeout(300);
await log("after leave court");

// Return to HQ
await page.evaluate(() => window.__gameTest.teleport("store"));
await page.waitForTimeout(200);
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(200);
await page.evaluate(() => window.__gameTest.advanceDialogue());
await page.waitForTimeout(150);
await page.evaluate(() => window.__gameTest.advanceDialogue());
await page.waitForTimeout(200);
const final = await log("FINAL");

// Shop
await page.evaluate(() => window.__gameTest.interact());
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/mission-done.png" });
await log("shop open?");

// Open world minimap shot
if ((await page.evaluate(() => window.__gameTest.getState().mode)) === "shop") {
  await page.getByRole("button", { name: /Back to streets/i }).click();
}
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/final-world.png" });

console.log("ERRORS:", errors);
console.log("SUCCESS:", final.missionComplete === true);
await browser.close();
process.exit(final.missionComplete ? 0 : 1);
