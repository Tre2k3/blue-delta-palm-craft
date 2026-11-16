import * as THREE from "three";
import type { Hoop, Solid } from "../core/types";
import { makeWater, type Water } from "../gfx/water";
import { buildBlocks, resetBlocks, type BlockAnchors } from "./blocks";
import { resetBuildings, resetLots } from "./buildings";
import { BRIDGE, buildBridgeLights, type BridgeShow } from "./bridgelights";
import { clearGround } from "./ground";
import { Glow, makeCtx, resetKit, type Lamp } from "./kit";
import { buildFarBank, buildHorizon, buildRiverboat, type Riverboat } from "./landmarks";
import { FAR_BANK_Z, RIVER_Z, WORLD } from "./map";
import { buildOpenSpots } from "./openspots";
import { buildRiverfront, type Riverfront } from "./riverfront";
import { buildHalle, type Halle } from "./moriah";
import { buildWaterpark, type Waterpark } from "./waterpark";
import { buildRiverside, type Riverside } from "./riverside";
import {
  applySignals,
  buildStreets,
  signalState,
  type SignalMats,
  type SignalState,
} from "./streets";

export type City = {
  scene: THREE.Scene;
  /** Everything outdoors. Hidden while Benji is in a room. */
  exterior: THREE.Group;
  solids: Solid[];
  /** What stops a car: buildings, the river, the edge of the map. */
  carSolids: Solid[];
  glow: Glow;
  lamps: Lamp[];
  water: Water;
  boat: Riverboat;
  bridge: BridgeShow;
  hoops: Hoop[];
  nets: THREE.Mesh[];
  rims: THREE.Mesh[];
  /** Halle Stadium and its courts, out on Mt. Moriah. */
  halle: Halle;
  /** Adventure River, out by I-40. */
  waterpark: Waterpark;
  /** The new Tom Lee Park, Beale Street Landing and the Big River Crossing. */
  riverside: Riverside;
  anchors: BlockAnchors & Omit<Riverfront, "hoops" | "nets" | "rims">;
  signals: SignalState;
  update(dt: number, time: number): void;
};

export function buildCity(): City {
  resetKit();
  resetBuildings();
  resetLots();
  resetBlocks();
  clearGround();
  const scene = new THREE.Scene();
  const exterior = new THREE.Group();
  exterior.name = "exterior";
  scene.add(exterior);
  const ctx = makeCtx(901);

  const signalMats: SignalMats = buildStreets(ctx);
  const blocks = buildBlocks(ctx);
  const river = buildRiverfront(ctx);
  const halle = buildHalle(ctx);
  const waterpark = buildWaterpark(ctx);
  const riverside = buildRiverside(ctx);
  buildOpenSpots(ctx);
  buildFarBank(ctx);
  buildHorizon(ctx);

  ctx.ground.build(exterior, { cast: false, receive: true, name: "ground" });
  ctx.solid.build(exterior, { cast: true, receive: true, name: "city" });
  for (const mesh of ctx.flat.build(exterior, { cast: false, receive: false, name: "flat" }))
    mesh.renderOrder = 2;
  for (const m of [...river.nets, ...river.rims, ...halle.meshes]) exterior.add(m);
  exterior.add(waterpark.group);

  const water = makeWater(-1000, 1100, FAR_BANK_Z - 4, RIVER_Z + 0.2, FAR_BANK_Z, BRIDGE);
  exterior.add(water.mesh);
  const boat = buildRiverboat(ctx);
  exterior.add(boat.group);
  const bridge = buildBridgeLights();
  exterior.add(bridge.group);

  // Walkers are also held to the map. The river edge has its own rail solids.
  const solids = ctx.solids;
  const FAR = 3000;
  solids.push({ minX: -FAR, maxX: WORLD.minX, minZ: -FAR, maxZ: FAR });
  solids.push({ minX: WORLD.maxX, maxX: FAR, minZ: -FAR, maxZ: FAR });
  solids.push({ minX: -FAR, maxX: FAR, minZ: WORLD.maxZ, maxZ: FAR });
  solids.push({ minX: -FAR, maxX: FAR, minZ: -FAR, maxZ: WORLD.minZ });
  const carSolids = solids.filter((s) => s.maxX - s.minX > 0.9 && s.maxZ - s.minZ > 0.9);
  carSolids.push({ minX: -FAR, maxX: FAR, minZ: -FAR, maxZ: RIVER_Z + 1.2 });

  const city: City = {
    scene,
    exterior,
    solids,
    carSolids,
    glow: ctx.glow,
    lamps: ctx.lamps,
    water,
    boat,
    bridge,
    hoops: river.hoops,
    nets: river.nets,
    rims: river.rims,
    halle,
    waterpark,
    riverside,
    anchors: {
      ...blocks,
      hqDoor: river.hqDoor,
      baitCounter: river.baitCounter,
      trucks: river.trucks,
      castSpots: river.castSpots,
      ogSpot: river.ogSpot,
      ogStand: river.ogStand,
      uncStand: river.uncStand,
    },
    signals: signalState(0),
    update(dt, time) {
      city.signals = signalState(time);
      applySignals(signalMats, city.signals);
      boat.update(dt);
      waterpark.update(dt, time);
      riverside.update(dt, time);
    },
  };
  return city;
}
