import * as THREE from "three";
import { paintMat } from "../gfx/tex";
import { addGround } from "./ground";
import { MAT, Frame, YAW, bench, hydrant, streetLamp, streetSign, trashCan, tree, type BuildCtx } from "./kit";
import { CURB, EDGE, RIVER_Z, ROAD_HALF, STREETS_X, STREETS_Z, STREET_NAMES_X, STREET_NAMES_Z, WALK, slab } from "./map";

/** Traffic lights run on one city-wide clock: north-south green, then east-west. */
export type SignalMats = {
  ns: { red: THREE.MeshBasicMaterial; amber: THREE.MeshBasicMaterial; green: THREE.MeshBasicMaterial };
  ew: { red: THREE.MeshBasicMaterial; amber: THREE.MeshBasicMaterial; green: THREE.MeshBasicMaterial };
};

function lens(on: number) {
  return new THREE.MeshBasicMaterial({ color: on, toneMapped: false });
}

export function buildStreets(ctx: BuildCtx): SignalMats {
  const asphalt = MAT.asphalt(ctx.glow);
  const yellow = paintMat(0xd9a521, 0.85);
  const white = paintMat(0xe8e6de, 0.8);
  const X0 = -230;
  const X1 = 230;
  const Z1 = 200;
  const north = STREETS_Z[0] - ROAD_HALF;

  // Base under the city, so a gap never shows sky. It stops at the bank: the river is water, not floor.
  ctx.ground.flat(1400, 810, 0, -0.06, RIVER_Z + 405, MAT.darkConcrete());

  // East-west streets run the full width; north-south pieces fill between them.
  for (const z of STREETS_Z) {
    ctx.ground.flat(X1 - X0, ROAD_HALF * 2, 0, 0, z, asphalt, 0, 8);
  }
  for (const x of STREETS_X) {
    for (let j = 0; j <= STREETS_Z.length; j++) {
      const a = j === 0 ? north : STREETS_Z[j - 1]! + ROAD_HALF;
      const b = j === STREETS_Z.length ? Z1 : STREETS_Z[j]! - ROAD_HALF;
      if (j === 0) continue;
      ctx.ground.flat(ROAD_HALF * 2, b - a, x, 0, (a + b) / 2, asphalt, 0, 8);
    }
  }

  // Paint: double yellow between junctions, stop bars and zebra crossings at them.
  const dashGap = 0.16;
  for (const z of STREETS_Z) {
    for (let i = -1; i < STREETS_X.length; i++) {
      const a = (i < 0 ? X0 : STREETS_X[i]! + EDGE + 1.2);
      const b = (i === STREETS_X.length - 1 ? X1 : STREETS_X[i + 1]! - EDGE - 1.2);
      for (const off of [-dashGap, dashGap]) ctx.flat.flat(b - a, 0.12, (a + b) / 2, 0.012, z + off, yellow);
    }
  }
  for (const x of STREETS_X) {
    for (let j = 0; j < STREETS_Z.length; j++) {
      const a = STREETS_Z[j]! + EDGE + 1.2;
      const b = j === STREETS_Z.length - 1 ? Z1 : STREETS_Z[j + 1]! - EDGE - 1.2;
      for (const off of [-dashGap, dashGap]) ctx.flat.flat(0.12, b - a, x + off, 0.012, (a + b) / 2, yellow);
    }
  }
  for (const x of STREETS_X) {
    for (const z of STREETS_Z) {
      for (const s of [-1, 1]) {
        // Crossings over the east-west street (walkers go north-south) sit either side in X.
        const cx = x + s * (ROAD_HALF + 1.9);
        for (let k = -3; k <= 3; k++) ctx.flat.flat(2.4, 0.55, cx, 0.012, z + k * 1.45, white);
        ctx.flat.flat(0.4, ROAD_HALF - 0.3, x + s * (ROAD_HALF + 3.9), 0.012, z + s * (ROAD_HALF / 2 + 0.1) * -1, white);
        const cz = z + s * (ROAD_HALF + 1.9);
        for (let k = -3; k <= 3; k++) ctx.flat.flat(0.55, 2.4, x + k * 1.45, 0.012, cz, white);
        ctx.flat.flat(ROAD_HALF - 0.3, 0.4, x + s * (ROAD_HALF / 2 + 0.1), 0.012, z + s * (ROAD_HALF + 3.9), white);
      }
    }
  }

  // Raised blocks: sidewalk ring on a curb. Lot surfaces are laid by whoever builds the block.
  const walk = MAT.sidewalk(ctx.glow);
  const curb = MAT.curb();
  const slabAt = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    ctx.ground.flat(w, d, (minX + maxX) / 2, CURB, (minZ + maxZ) / 2, walk, 0, WALK);
    ctx.ground.wall(w, CURB, (minX + maxX) / 2, CURB / 2, maxZ, curb, YAW.south);
    ctx.ground.wall(w, CURB, (minX + maxX) / 2, CURB / 2, minZ, curb, YAW.north);
    ctx.ground.wall(d, CURB, maxX, CURB / 2, (minZ + maxZ) / 2, curb, YAW.east);
    ctx.ground.wall(d, CURB, minX, CURB / 2, (minZ + maxZ) / 2, curb, YAW.west);
    addGround({ minX, maxX, minZ, maxZ, y: CURB });
  };
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const s = slab(col, row);
      slabAt(s.minX, s.maxX, s.minZ, s.maxZ);
    }
  }
  // Riverfront, the outer edges and the strip south of Park Avenue.
  slabAt(X0, X1, RIVER_Z, north);
  const westEdge = STREETS_X[0] - ROAD_HALF;
  const eastEdge = STREETS_X[4] + ROAD_HALF;
  const southEdge = STREETS_Z[4] + ROAD_HALF;
  for (let row = 0; row < 4; row++) {
    const a = STREETS_Z[row]! + ROAD_HALF;
    const b = STREETS_Z[row + 1]! - ROAD_HALF;
    slabAt(X0, westEdge, a, b);
    slabAt(eastEdge, X1, a, b);
  }
  slabAt(X0, westEdge, southEdge, Z1);
  slabAt(eastEdge, X1, southEdge, Z1);
  for (let col = 0; col < 4; col++) slabAt(STREETS_X[col]! + ROAD_HALF, STREETS_X[col + 1]! - ROAD_HALF, southEdge, Z1);

  // Lamps, trees and street furniture along every block face.
  const y0 = CURB;
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const s = slab(col, row);
      const beale = row === 0 || row === 1;
      const along = (t: number, a: number, b: number) => a + (b - a) * t;
      // North and south faces.
      for (const [z, yaw, isBeale] of [
        [s.minZ + 0.8, YAW.north, row === 1],
        [s.maxZ - 0.8, YAW.south, row === 0],
      ] as const) {
        for (const t of [0.2, 0.8]) streetLamp(ctx, along(t, s.minX, s.maxX), z, yaw, y0);
        if (!isBeale) for (const t of [0.36, 0.64]) tree(ctx, along(t, s.minX, s.maxX), z + (yaw === YAW.north ? 0.5 : -0.5), 0.9, y0, col === 1 && row === 3);
        if (ctx.rand() > 0.4) trashCan(ctx, along(0.5, s.minX, s.maxX), z, y0);
        if (ctx.rand() > 0.55) bench(ctx, along(0.44, s.minX, s.maxX), z + (yaw === YAW.north ? 1.4 : -1.4), yaw, y0);
      }
      void beale;
      for (const [x, yaw] of [
        [s.minX + 0.8, YAW.west],
        [s.maxX - 0.8, YAW.east],
      ] as const) {
        for (const t of [0.25, 0.75]) streetLamp(ctx, x, along(t, s.minZ, s.maxZ), yaw, y0);
        for (const t of [0.5]) tree(ctx, x + (yaw === YAW.west ? 0.5 : -0.5), along(t, s.minZ, s.maxZ), 0.9, y0);
        if (ctx.rand() > 0.5) hydrant(ctx, x, along(0.12, s.minZ, s.maxZ), y0);
      }
    }
  }
  // Riverside Drive, river side.
  for (let x = -140; x <= 140; x += 28) streetLamp(ctx, x, north - 0.8, YAW.south, y0);

  return buildSignals(ctx);
}

function buildSignals(ctx: BuildCtx): SignalMats {
  const mats: SignalMats = {
    ns: { red: lens(0x330000), amber: lens(0x332200), green: lens(0x003300) },
    ew: { red: lens(0x330000), amber: lens(0x332200), green: lens(0x003300) },
  };
  const pole = MAT.black();
  const y0 = CURB;
  STREETS_X.forEach((x, i) => {
    STREETS_Z.forEach((z, j) => {
      // One mast per approach, on the far right corner, arm reaching over the lane it controls.
      const masts: { cx: number; cz: number; yaw: number; axis: "ns" | "ew" }[] = [
        { cx: x + EDGE - 0.6, cz: z - EDGE + 0.6, yaw: YAW.south, axis: "ns" }, // faces northbound traffic (driving -Z)
        { cx: x - EDGE + 0.6, cz: z + EDGE - 0.6, yaw: YAW.north, axis: "ns" },
        { cx: x - EDGE + 0.6, cz: z - EDGE + 0.6, yaw: YAW.east, axis: "ew" }, // faces westbound traffic
        { cx: x + EDGE - 0.6, cz: z + EDGE - 0.6, yaw: YAW.west, axis: "ew" },
      ];
      for (const m of masts) {
        const f = new Frame(ctx, m.cx, m.cz, m.yaw);
        f.add(new THREE.CylinderGeometry(0.1, 0.14, 6.4, 6), pole, 0, y0 + 3.2, 0);
        // Arm runs along local -X (over the road), head hangs facing local +Z.
        f.box(6.6, 0.14, 0.14, -3.2, y0 + 6.2, 0, pole);
        for (const hx of [-3.0, -5.6]) {
          f.box(0.42, 1.2, 0.3, hx, y0 + 5.5, 0, pole);
          const set = mats[m.axis];
          f.add(new THREE.CircleGeometry(0.14, 10), set.red, hx, y0 + 5.88, 0.16, ctx.flat);
          f.add(new THREE.CircleGeometry(0.14, 10), set.amber, hx, y0 + 5.5, 0.16, ctx.flat);
          f.add(new THREE.CircleGeometry(0.14, 10), set.green, hx, y0 + 5.12, 0.16, ctx.flat);
        }
      }
      streetSign(ctx, x + EDGE - 1.4, z + EDGE - 1.4, STREET_NAMES_X[i]!, STREET_NAMES_Z[j]!, y0);
    });
  });
  return mats;
}

export type SignalState = { ns: "green" | "amber" | "red"; ew: "green" | "amber" | "red" };

const CYCLE = 22;
export function signalState(t: number): SignalState {
  const p = ((t % CYCLE) + CYCLE) % CYCLE;
  if (p < 9) return { ns: "green", ew: "red" };
  if (p < 11) return { ns: "amber", ew: "red" };
  if (p < 20) return { ns: "red", ew: "green" };
  return { ns: "red", ew: "amber" };
}

export function applySignals(mats: SignalMats, s: SignalState) {
  for (const axis of ["ns", "ew"] as const) {
    const set = mats[axis];
    const st = s[axis];
    set.red.color.setRGB(st === "red" ? 3.2 : 0.18, 0.02, 0.02);
    set.amber.color.setRGB(st === "amber" ? 3 : 0.16, st === "amber" ? 1.9 : 0.1, 0.02);
    set.green.color.setRGB(0.02, st === "green" ? 3 : 0.16, st === "green" ? 0.9 : 0.05);
  }
}
