#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { captureShot, closeBrowser, installHardTimeout, launchBrowser, preparePage } from "./smoke-lib.mjs";

const url=new URL(process.env.GAME_URL || "http://127.0.0.1:8080/");url.searchParams.set("qa","1");
const clearTimeout=installHardTimeout("Upgrade smoke",300000);
let browser=await launchBrowser();
const errors=[];
await mkdir("artifacts",{recursive:true});

async function open(page) {
  page.setDefaultTimeout(20000);
  page.on("pageerror",e=>errors.push(e.message));
  await preparePage(page);
  await page.goto(url.href,{waitUntil:"domcontentloaded",timeout:60000});
  await page.getByRole("button",{name:"ENTER MEMPHIS",exact:true}).waitFor({timeout:60000});
  // Stop wall-clock animation, then advance the real fixed-step simulation. Real
  // keyboard/pointer events still feed InputManager; no synthetic scores are used.
  await page.evaluate(()=>{const e=window.__gameTest.getEngine();e.running=false;cancelAnimationFrame(e.raf);});
  await page.getByRole("button",{name:"ENTER MEMPHIS",exact:true}).click();
  await step(page,3.6);
}
async function step(page,seconds=.05){await page.evaluate(t=>{window.__gameTest.step(t);window.__gameTest.getEngine().draw();},seconds);}
async function state(page){return page.evaluate(()=>window.__gameTest.getState());}
async function travel(page,id){await page.evaluate(id=>window.__gameTest.teleport(id),id);await step(page);}
async function interact(page){await page.evaluate(()=>window.__gameTest.interact());await step(page);}
async function dialogue(page){for(let i=0;i<12&&(await state(page)).mode==="dialogue";i++)await page.evaluate(()=>window.__gameTest.advanceDialogue());await step(page);}
async function greenShot(page){
  await page.keyboard.down("KeyF");await step(page,.83);
  const charged=await state(page);assert.ok(charged.power>=.54 && charged.power<=.76,"charge reaches the green window");
  await page.keyboard.up("KeyF");await step(page,1.45);
  const shot=await state(page);assert.equal(shot.shots,charged.shots+1,"one release produces one shot");
  assert.ok(shot.score>charged.score,"actual ball arc scores");
  await step(page,1);assert.equal((await state(page)).score,shot.score,"basket is counted once");
}

try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await open(page);
  await captureShot(page,"artifacts/upgrade-city.png");
  const start=await state(page);
  await page.keyboard.down("KeyW");await step(page,.5);await page.keyboard.up("KeyW");
  assert.ok((await state(page)).px>start.px+20,"forward movement follows the starting camera");
  await page.keyboard.press("KeyM");await step(page);
  assert.equal((await state(page)).paused,true,"M opens map");
  await page.getByRole("button",{name:/901 Court.*Explore/}).click();
  assert.equal((await state(page)).hud.waypoint,"court","map sets the destination");
  await captureShot(page,"artifacts/upgrade-map.png");
  await page.keyboard.press("Escape");await step(page);
  assert.equal((await state(page)).paused,false,"Escape resumes with keyboard focus in the menu");

  await travel(page,"store");await interact(page);await dialogue(page);
  assert.equal((await state(page)).step,"pickup");
  await travel(page,"dropvan");await interact(page);
  assert.equal((await state(page)).step,"hood");
  await page.keyboard.press("KeyG");await step(page);
  assert.equal((await state(page)).driving,true,"pickup unlocks driving");
  const vanStart=await state(page);
  await page.keyboard.down("KeyW");await step(page,.5);await page.keyboard.up("KeyW");
  assert.ok((await state(page)).px>vanStart.px+20,"van accelerates along its heading");
  const beforeYaw=await page.evaluate(()=>window.__controlsTest.getYaw());
  await page.keyboard.down("KeyA");await step(page,.15);await page.keyboard.up("KeyA");
  assert.ok((await page.evaluate(()=>window.__controlsTest.getYaw()))>beforeYaw,"A steers left under chase camera");
  const leftYaw=await page.evaluate(()=>window.__controlsTest.getYaw());
  await page.keyboard.down("KeyD");await step(page,.15);await page.keyboard.up("KeyD");
  assert.ok((await page.evaluate(()=>window.__controlsTest.getYaw()))<leftYaw,"D steers right under chase camera");
  await page.keyboard.down("Space");await step(page,1);await page.keyboard.up("Space");
  await page.keyboard.press("KeyG");await step(page);
  assert.equal((await state(page)).driving,false,"brake and exit safely");
  const parked=await page.evaluate(()=>({...window.__gameTest.getEngine().vehicle}));
  for(const id of ["neighborhood","downtown","culture"]){await travel(page,id);await interact(page);}
  assert.equal((await state(page)).step,"ball");
  await travel(page,"court");await interact(page);
  assert.equal((await state(page)).mode,"basketball");
  await greenShot(page);await greenShot(page);
  assert.equal((await state(page)).step,"return","real baskets complete the mission objective");
  await captureShot(page,"artifacts/upgrade-court.png");
  await page.getByRole("button",{name:"Leave court",exact:true}).click();
  const paid=await state(page);
  await page.evaluate(()=>window.__gameTest.getEngine().exitBasketball());
  assert.equal((await state(page)).sackdollars,paid.sackdollars,"court payout cannot repeat");
  await travel(page,"court");await interact(page);
  await page.getByRole("button",{name:"Leave court",exact:true}).click();
  assert.equal((await state(page)).sackdollars,paid.sackdollars,"empty round cannot reuse an earlier streak bonus");
  await travel(page,"store");await interact(page);await dialogue(page);
  assert.equal((await state(page)).missionComplete,true,"Drop Day completes through real interactions and shots");
  await page.evaluate(()=>{const e=window.__gameTest.getEngine();e.save();e.loadSave();});
  const restored=await page.evaluate(()=>({...window.__gameTest.getEngine().vehicle}));
  assert.equal(restored.x,parked.x);assert.equal(restored.y,parked.y);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:"CONTINUE",exact:true}).waitFor({timeout:60000});
  assert.equal((await state(page)).missionComplete,true,"progress survives full reload");
  await page.getByRole("button",{name:"NEW GAME",exact:true}).click();
  await page.getByRole("button",{name:"Keep my save",exact:true}).click();
  assert.equal((await state(page)).missionComplete,true,"cancel reset preserves the save");
  await page.close();
  console.log("PASS: movement, map, mission, physical shots, payouts, van, reload and reset protection");

  // Separate browser processes also support constrained single-process runners.
  await closeBrowser(browser);browser=await launchBrowser();
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await open(mobile);
  const stick=mobile.getByRole("group",{name:"Movement joystick"});await stick.waitFor({state:"visible"});
  const rect=await stick.boundingBox(), before=await state(mobile);
  await mobile.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await mobile.mouse.down();
  await mobile.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2-35);await step(mobile,.5);await mobile.mouse.up();await step(mobile);
  assert.ok(Math.hypot((await state(mobile)).px-before.px,(await state(mobile)).py-before.py)>20,"touch joystick moves the player");
  assert.equal(await mobile.evaluate(()=>window.__gameTest.getEngine().input.touch.my),0,"touch release stops movement");
  await captureShot(mobile,"artifacts/upgrade-mobile.png");
  await mobile.getByRole("button",{name:"Open city map",exact:true}).click();
  assert.equal((await state(mobile)).paused,true);
  await captureShot(mobile,"artifacts/upgrade-mobile-map.png");
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"mobile UI fits its viewport");
  await mobile.setViewportSize({width:844,height:390});
  await captureShot(mobile,"artifacts/upgrade-landscape-map.png");
  await mobile.close();
  assert.deepEqual(errors,[],"no uncaught browser errors");
  console.log("PASS: mobile movement, release, map and portrait/landscape layout; no browser errors");
} finally {await closeBrowser(browser);clearTimeout();}
