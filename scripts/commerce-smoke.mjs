#!/usr/bin/env node
import { chromium } from "playwright";

const url = process.env.GAME_URL || "http://127.0.0.1:8080/";
const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (res) => {
  if (res.status() === 404) errors.push(`404 ${res.url()}`);
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /ENTER MEMPHIS/i }).click();
await page.waitForFunction(() => window.__gameTest && window.__SACK_COMMERCE__, { timeout: 20000 });
await page.waitForTimeout(400);

await page.evaluate(() => window.__gameTest.resetSave());
await page.waitForTimeout(200);
await page.evaluate(() => window.__gameTest.openShop?.());
await page.waitForTimeout(400);

const shop = await page.evaluate(() => {
  const catalog = window.__SACK_COMMERCE__.catalog();
  const buy = document.querySelector('[data-testid="buy-classic_green"]');
  const irl = document.querySelector('[data-testid="buy-irl-sr-black-gold-tee"]');
  const view = document.querySelector('[data-testid="view-sr-black-gold-tee"]');
  const html = document.documentElement.innerHTML;
  return {
    catalogCount: catalog.length,
    hasVirtualBuy: !!buy,
    hasIrl: !!irl,
    hasView: !!view,
    leakedStripe: /sk_live|sk_test|STRIPE_SECRET|service_role/i.test(html),
  };
});

await page.click('[data-testid="buy-irl-sr-black-gold-tee"]');
await page.waitForTimeout(200);
const intent = await page.evaluate(() => window.__SACK_COMMERCE__.lastIntent());
const analytics = await page.evaluate(() =>
  (window.__SACK_ANALYTICS__?.events() ?? []).some((e) => e.name === "product_buy_clicked"),
);

const back = page.getByRole("button", { name: /Back to streets/i });
if (await back.count()) await back.click();

const pageErrors = errors.filter((e) => !/status of 404/.test(e) && !/^404 /.test(e) && !/Failed to load resource/.test(e));
console.log("COMMERCE", JSON.stringify({ shop, intent, analytics, errors: pageErrors, missing: errors.filter((e) => /404/.test(e)) }));
const ok =
  shop.catalogCount >= 6 &&
  shop.hasVirtualBuy &&
  shop.hasIrl &&
  shop.hasView &&
  !shop.leakedStripe &&
  intent?.kind === "buy" &&
  intent?.productId === "sr-black-gold-tee" &&
  analytics &&
  pageErrors.length === 0;
console.log("SUCCESS:", ok);
await browser.close();
process.exit(ok ? 0 : 1);
