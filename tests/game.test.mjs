import test from "node:test";
import assert from "node:assert/strict";
import { crossesHoop, driveStep, FIXED_STEP, GRAVITY, shotVelocity, wrapAngle } from "../src/game/physics.ts";
import { parseSave, sanitizeSettings } from "../src/game/persistence.ts";
import { NPCS, POIS, createDropDayMission } from "../src/game/data.ts";
import { circleHitsRect, overlaps, poiColliders, poiEntrance, roadRects, trafficLanes, isRoadPoint } from "../src/game/worldTopology.ts";

test("green releases cross the rim once at short, medium and long distances", () => {
  for (const distance of [65, 155, 252, 320]) for (const angle of [-3.13, -1, 0, 1, 3.13]) {
    const hoop = {x:500, y:500, z:86};
    let ball = {x:hoop.x + Math.sin(angle)*distance, y:hoop.y + Math.cos(angle)*distance, z:42};
    const shot = shotVelocity(ball.x, ball.y, wrapAngle(angle + 0.12), 0.65, hoop);
    let vz = shot.vz, crossings = 0;
    for (let t=0; t<1.8; t+=FIXED_STEP) {
      const after = {x:ball.x+shot.vx*FIXED_STEP, y:ball.y+shot.vy*FIXED_STEP, z:ball.z+vz*FIXED_STEP-0.5*GRAVITY*FIXED_STEP**2};
      crossings += Number(crossesHoop(ball, after, hoop));
      vz -= GRAVITY*FIXED_STEP; ball=after;
    }
    assert.equal(crossings,1,`distance ${distance}, angle ${angle}`);
  }
});

test("hoop crossings reject upward shots and wide misses, handle fast downward shots", () => {
  const hoop={x:100,y:100,z:86};
  assert.equal(crossesHoop({x:100,y:100,z:75},{x:100,y:100,z:110},hoop),false);
  assert.equal(crossesHoop({x:125,y:100,z:110},{x:125,y:100,z:75},hoop),false);
  assert.equal(crossesHoop({x:100,y:100,z:150},{x:100,y:100,z:20},hoop),true);
  assert.equal(shotVelocity(100,300,0,.1,hoop).grade,"EARLY");
  assert.equal(shotVelocity(100,300,0,1,hoop).grade,"LATE");
});

test("van accelerates, reverses, steers both directions, and brakes independently of frame rate", () => {
  let v={speed:0,yaw:0};
  for(let i=0;i<180;i++) v=driveStep(v.speed,v.yaw,0,1,false,FIXED_STEP);
  assert.ok(v.speed>450 && v.speed<470);
  assert.ok(driveStep(v.speed,0,-1,1,false,FIXED_STEP).yaw>0);
  assert.ok(driveStep(v.speed,0,1,1,false,FIXED_STEP).yaw<0);
  for(let i=0;i<60;i++) v=driveStep(v.speed,v.yaw,0,1,true,FIXED_STEP);
  assert.ok(v.speed<1);
  for(let i=0;i<180;i++) v=driveStep(v.speed,v.yaw,0,-1,false,FIXED_STEP);
  assert.ok(v.speed < -160 && v.speed >= -170);
  const once=driveStep(0,0,0,1,false,1);
  let small={speed:0,yaw:0};for(let i=0;i<60;i++)small=driveStep(small.speed,small.yaw,0,1,false,FIXED_STEP);
  assert.ok(Math.abs(once.speed-small.speed)<0.001);
});

test("legacy saves preserve earned progress and migrate safely", () => {
  const steps=createDropDayMission().steps;
  const save=parseSave(JSON.stringify({version:2,sackdollars:123,respect:45,owned:["starter_tee","black_hoodie"],equipped:"black_hoodie",missionProgress:{[steps[0].id]:true,[steps[1].id]:true},basketballHighScore:24,trophies:["family"]}));
  assert.equal(save.version,3);assert.equal(save.sackdollars,123);assert.equal(save.equipped,"black_hoodie");
  assert.equal(save.missionActiveStep,2);assert.equal(save.missionComplete,false);assert.equal(save.basketballHighScore,24);
  assert.deepEqual(save.trophies,["family"]);assert.equal(save.position.y,558);assert.equal(save.vehicle.x,1896);
});

test("invalid saves, IDs, values and nonsequential objectives cannot corrupt game state", () => {
  for(const raw of ["{", "null", "[]", "{}", '{"version":999}'])assert.equal(parseSave(raw),null);
  const steps=createDropDayMission().steps;
  const save=parseSave(JSON.stringify({version:3,sackdollars:-50,respect:"infinite",owned:["fake","black_hoodie","black_hoodie"],equipped:"gold_chain",missionActiveStep:900,missionComplete:true,missionProgress:{[steps[2].id]:true},position:{x:1e9,y:-10},talked:["fake",NPCS[0].id,NPCS[0].id]}));
  assert.equal(save.sackdollars,0);assert.equal(save.respect,0);assert.deepEqual(save.owned,["starter_tee","black_hoodie"]);
  assert.equal(save.equipped,"starter_tee");assert.equal(save.missionActiveStep,0);assert.equal(save.missionComplete,false);
  assert.ok(save.position.x<4000);assert.equal(save.position.y,62);assert.deepEqual(save.talked,[NPCS[0].id]);
  assert.deepEqual(sanitizeSettings({master:Infinity,music:-1,sfx:5,sensitivity:0}),{master:.85,music:0,sfx:1,sensitivity:.25,shake:true,rumble:true,cameraView:"third",quality:"high",showTouch:false});
});

test("saved exploration and parked van survive a round trip", () => {
  const save=parseSave(JSON.stringify({version:3,position:{x:200,y:650,yaw:1},vehicle:{x:1550,y:1070,yaw:-1},visited:["court","court","fake"],talked:[NPCS[0].id]}));
  assert.deepEqual(parseSave(JSON.stringify(save)),save);assert.deepEqual(save.visited,["court"]);
  assert.deepEqual(save.vehicle,{x:1550,y:1070,yaw:-1});
});

test("landmarks, entrances and mission NPCs keep roads and solid buildings navigable", () => {
  for(const p of POIS.filter(p=>p.id!=="river"&&p.id!=="dropvan")) {
    assert.equal(roadRects().some(r=>overlaps(p,r)),false,`${p.id} blocks a road`);
    const entry=poiEntrance(p.id);
    assert.equal(poiColliders().some(r=>circleHitsRect(entry.x,entry.y,14,r)),false,`${p.id} entrance blocked`);
  }
  for(const npc of NPCS) assert.equal(poiColliders().some(r=>circleHitsRect(npc.x,npc.y,14,r)),false,`${npc.id} inside a building`);
  for(const lane of trafficLanes()) assert.equal(isRoadPoint(lane.axis==="x"?100:lane.fixed,lane.axis==="y"?100:lane.fixed),true);
});
