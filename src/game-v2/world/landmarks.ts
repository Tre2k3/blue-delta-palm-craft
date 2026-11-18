import * as THREE from "three";
import { tex } from "../gfx/tex";
import { MAT, emissiveMat, facade, lambert, std, type BuildCtx } from "./kit";
import { BRIDGE } from "./bridgelights";
import { FAR_BANK_Z, LANDMARKS, WORLD } from "./map";

/**
 * Across the river is Arkansas: low, flat and dark, a line of shore lights, warehouses, trees and a
 * few lit billboards. Memphis is on this side. The Pyramid stands at the north end of the
 * riverfront and the M bridge crosses just past it.
 * It is scenery. Nothing here is walkable, so it is cheap: lit boxes and a few big shapes.
 */
export function buildFarBank(ctx: BuildCtx) {
  const z0 = FAR_BANK_Z;
  ctx.ground.flat(1600, 260, 0, 0.3, z0 - 130, lambert(0x14161a));
  // Levee and a line of shore lights.
  ctx.solid.box(1600, 3, 2, 0, -0.6, z0, lambert(0x23201c));
  const shore = emissiveMat(ctx, 0xffc27a, 0.1, 3.2);
  for (let x = -480; x <= 720; x += 13) ctx.solid.box(0.5, 0.5, 0.5, x + (ctx.rand() - 0.5) * 3, 1.4, z0 + 0.6, shore);
  // Tree line along the levee, low warehouses behind it, and a couple of billboards facing Memphis.
  const leaf = lambert(0x1c2a1e);
  for (let x = -470; x <= 710; x += 9) {
    const h = 6 + ctx.rand() * 7;
    ctx.solid.add(new THREE.ConeGeometry(3 + ctx.rand() * 2, h, 6), leaf, x + ctx.rand() * 4, 0.3 + h / 2, z0 - 6 - ctx.rand() * 8);
  }
  const far = facade(ctx, "far", 0);
  for (let x = -440; x <= 680; x += 52 + ctx.rand() * 40) {
    const w = 30 + ctx.rand() * 40;
    const d = 18 + ctx.rand() * 20;
    const h = 6 + ctx.rand() * 9;
    const z = z0 - 30 - ctx.rand() * 40;
    ctx.solid.walls(w, h, d, x, 0.3, z, far.mat, far.tileW, far.tileH, ctx.rand());
    ctx.solid.flat(w, d, x, 0.3 + h, z, MAT.roof());
  }
  const boards = [
    ["WEST MEMPHIS", "#ffd23a"],
    ["ARKANSAS WELCOMES YOU", "#5ac8ff"],
    ["TRUCK STOP · OPEN 24 HRS", "#ff3b3b"],
  ] as const;
  boards.forEach(([text, color], i) => {
    const x = -260 + i * 330;
    const z = z0 - 22;
    ctx.solid.cyl(0.4, 0.4, 12, x, 6, z, MAT.steel(), 6);
    ctx.solid.box(24, 7, 0.6, x, 15, z, MAT.black());
    const map = tex(512, 160, (g, w, h) => {
      g.fillStyle = "#0b0b0d";
      g.fillRect(0, 0, w, h);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = '900 64px "Bebas Neue", Impact, sans-serif';
      g.shadowColor = color;
      g.shadowBlur = 20;
      g.fillStyle = color;
      g.fillText(text, w / 2, h / 2);
    }, { repeat: false });
    const m = new THREE.MeshBasicMaterial({ map, toneMapped: false });
    ctx.glow.basic(m, 0.6, 2.2);
    ctx.flat.add(new THREE.PlaneGeometry(23.4, 6.6), m, x, 15, z + 0.32);
  });

  buildPyramid(ctx, LANDMARKS.pyramid.x, LANDMARKS.pyramid.z);
  buildBridge(ctx);
}

/** The Pyramid: the glass pyramid on the river at the north end of downtown. */
function buildPyramid(ctx: BuildCtx, x: number, z: number) {
  const base = LANDMARKS.pyramid.base;
  const height = LANDMARKS.pyramid.height;
  const map = tex(
    512,
    512,
    (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#a8b4c0");
      grd.addColorStop(1, "#4a5866");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(14,18,24,0.75)";
      g.lineWidth = 3;
      for (let i = 0; i <= 16; i++) {
        g.beginPath();
        g.moveTo(0, (i / 16) * h);
        g.lineTo(w, (i / 16) * h);
        g.moveTo((i / 16) * w, 0);
        g.lineTo((i / 16) * w, h);
        g.stroke();
      }
    },
    { repeat: false },
  );
  const glass = new THREE.MeshStandardMaterial({ map, roughness: 0.12, metalness: 0.85, emissive: 0x6a7a8a, emissiveMap: map, emissiveIntensity: 0.05 });
  ctx.glow.emissive(glass, 0.05, 0.38);
  ctx.solid.add(new THREE.ConeGeometry((base / 2) * Math.SQRT2, height, 4), glass, x, 0.3 + height / 2, z, Math.PI / 4);
  // Beacon at the tip.
  ctx.solid.add(new THREE.SphereGeometry(1.4, 10, 8), emissiveMat(ctx, 0xffffff, 0.6, 5), x, height + 1.2, z);
  ctx.solid.box(base + 6, 3, base + 6, x, 1, z, lambert(0x2a2c30));
}

/** The M bridge: two steel arches over the river. Its lights are in `bridgelights.ts`. */
function buildBridge(ctx: BuildCtx) {
  const { x, z0, z1, deckY } = BRIDGE;
  const steel = lambert(0x3c4046);
  const span = (z1 - z0) / 2;
  ctx.solid.box(15, 1.5, Math.abs(z1 - z0) + 80, x, deckY, (z0 + z1) / 2 - 30, steel);
  for (const side of [-BRIDGE.side, BRIDGE.side]) {
    for (let k = 0; k < 2; k++) {
      const a = z0 + span * k;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        pts.push(new THREE.Vector3(x + side, deckY + Math.sin(t * Math.PI) * BRIDGE.rise, a + span * t));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      ctx.solid.add(new THREE.TubeGeometry(curve, 28, 1.05, 5, false), steel);
      for (let i = 2; i <= 14; i += 2) {
        const t = i / 16;
        const top = deckY + Math.sin(t * Math.PI) * BRIDGE.rise;
        ctx.solid.box(0.3, top - deckY, 0.3, x + side, (top + deckY) / 2, a + span * t, steel);
      }
    }
  }
  // Piers in the water and the approach running back over the bank.
  for (const z of [z0, z0 + span, z1]) ctx.solid.box(18, 30, 7, x, deckY - 15.7, z, lambert(0x5a5a58));
  for (let z = z0 + 30; z < 190; z += 34) ctx.solid.box(3, deckY, 3, x, deckY / 2 - 0.4, z, lambert(0x5a5a58));
  ctx.solid.box(15, 1.5, 420, x, deckY, z0 + 210, steel);
}

export type Riverboat = { group: THREE.Group; update(dt: number): void };

/** Paddle steamer working the channel. */
export function buildRiverboat(ctx: BuildCtx): Riverboat {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa3261c, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.7 });
  const lit = new THREE.MeshStandardMaterial({ color: 0x332a1c, emissive: 0xffc878, emissiveIntensity: 0.2 });
  ctx.glow.emissive(lit, 0.15, 2.8);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(34, 2.2, 9), white, 0, 0.6, 0);
  add(new THREE.BoxGeometry(28, 2.6, 7.6), white, -1, 3, 0);
  add(new THREE.BoxGeometry(28.2, 1.2, 7.8), lit, -1, 3.1, 0);
  add(new THREE.BoxGeometry(22, 2.4, 6.4), white, -2, 5.5, 0);
  add(new THREE.BoxGeometry(22.2, 1.1, 6.6), lit, -2, 5.6, 0);
  add(new THREE.BoxGeometry(5, 2.2, 4), white, 5, 7.8, 0);
  add(new THREE.BoxGeometry(30, 0.2, 9.2), red, -1, 1.75, 0);
  add(new THREE.BoxGeometry(24, 0.2, 7), red, -2, 4.35, 0);
  for (const z of [-1.4, 1.4]) {
    add(new THREE.CylinderGeometry(0.5, 0.5, 6, 8), dark, 1, 10.5, z);
    add(new THREE.CylinderGeometry(0.75, 0.5, 0.8, 8), red, 1, 13.6, z);
  }
  const wheel = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 7.4), red);
    p.rotation.z = (i / 8) * Math.PI;
    wheel.add(p);
  }
  wheel.position.set(-18.5, 1.2, 0);
  g.add(wheel);
  g.position.set(-260, -0.6, -262);
  let dir = 1;
  return {
    group: g,
    update(dt) {
      g.position.x += dir * 3.4 * dt;
      if (g.position.x > 300) dir = -1;
      if (g.position.x < -300) dir = 1;
      g.rotation.y = dir > 0 ? 0 : Math.PI;
      g.position.y = -0.6 + Math.sin(performance.now() / 1600) * 0.08;
      wheel.rotation.z -= dir * dt * 1.6;
    },
  };
}

/** Ring of dark blocks past the playable grid so the city does not end at a line. */
export function buildHorizon(ctx: BuildCtx) {
  const far = facade(ctx, "far", 2);
  const r = ctx.rand;
  const put = (x: number, z: number) => {
    const w = 22 + r() * 16;
    const d = 20 + r() * 14;
    const h = 12 + r() * 30;
    ctx.solid.walls(w, h, d, x, 0, z, far.mat, far.tileW, far.tileH, r());
    ctx.solid.flat(w, d, x, h, z, MAT.roof());
  };
  // South past Butler, north past the Pyramid, and east past Park Avenue.
  for (let z = -120; z <= WORLD.maxZ + 40; z += 38) {
    put(WORLD.minX - 30 - r() * 10, z);
    if (r() > 0.4) put(WORLD.minX - 70, z + 14);
    if (z > LANDMARKS.pyramid.z + LANDMARKS.pyramid.base / 2 + 20) {
      put(WORLD.maxX + 40 + r() * 10, z);
      if (r() > 0.4) put(WORLD.maxX + 80, z + 14);
    }
  }
  for (let x = WORLD.minX - 20; x <= WORLD.maxX + 40; x += 40) put(x, WORLD.maxZ + 42 + r() * 12);
  void std;
}
