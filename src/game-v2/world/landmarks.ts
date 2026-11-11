import * as THREE from "three";
import { tex } from "../gfx/tex";
import { MAT, emissiveMat, facade, lambert, std, type BuildCtx } from "./kit";
import { FAR_BANK_Z, RIVER_Z } from "./map";

/**
 * The far bank: the skyline, the Pyramid and the bridge that say Memphis from anywhere on the river.
 * It is scenery. Nothing here is walkable, so it is cheap: lit boxes and a few big shapes.
 */
export function buildFarBank(ctx: BuildCtx) {
  const z0 = FAR_BANK_Z;
  ctx.ground.flat(1400, 260, 0, 0.3, z0 - 130, lambert(0x14161a));
  // Bluff wall and a line of shore lights.
  ctx.solid.box(1400, 3, 2, 0, -0.6, z0, lambert(0x23201c));
  const shore = emissiveMat(ctx, 0xffc27a, 0.1, 3.2);
  for (let x = -330; x <= 330; x += 11) ctx.solid.box(0.5, 0.5, 0.5, x + (ctx.rand() - 0.5) * 3, 1.4, z0 + 0.6, shore);

  const far = facade(ctx, "far", 0);
  const far2 = facade(ctx, "far", 1);
  const towers: [number, number, number, number, number][] = [
    // x, depth offset, width, depth, height
    [-250, 30, 26, 22, 34],
    [-214, 18, 20, 20, 52],
    [-128, 34, 30, 24, 40],
    [-96, 14, 22, 22, 78],
    [-66, 30, 26, 22, 56],
    [-38, 10, 24, 24, 118],
    [-8, 28, 28, 24, 66],
    [20, 12, 22, 22, 96],
    [46, 32, 26, 22, 48],
    [70, 16, 20, 20, 70],
    [200, 26, 30, 24, 38],
    [240, 14, 24, 22, 58],
    [286, 30, 28, 24, 32],
  ];
  towers.forEach(([x, off, w, d, h], i) => {
    const f = i % 2 ? far : far2;
    const z = z0 - 14 - off;
    ctx.solid.walls(w, h, d, x, 0.3, z, f.mat, f.tileW, f.tileH, i * 0.31);
    ctx.solid.flat(w, d, x, 0.3 + h, z, MAT.roof());
    if (h > 90) {
      ctx.solid.add(new THREE.ConeGeometry(w * 0.5, 16, 4), lambert(0x2a2c30), x, h + 8.3, z, Math.PI / 4);
      ctx.solid.cyl(0.25, 0.25, 16, x, h + 24, z, MAT.steel(), 5);
      ctx.solid.add(new THREE.SphereGeometry(0.9, 8, 6), emissiveMat(ctx, 0xff2a1a, 0.8, 4), x, h + 32.6, z);
    } else if (h > 60) {
      ctx.solid.box(w + 0.4, 1.6, d + 0.4, x, h - 1.4, z, emissiveMat(ctx, i % 3 === 0 ? 0x39ff14 : 0xffc878, 0.1, 1.6));
    }
  });

  buildPyramid(ctx, 132, z0 - 62);
  buildBridge(ctx, -196);
}

/** The glass pyramid on the river. */
function buildPyramid(ctx: BuildCtx, x: number, z: number) {
  const base = 92;
  const height = 60;
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

/** The M bridge: two steel arches over the river, lit along the top chord after dark. */
function buildBridge(ctx: BuildCtx, x: number) {
  const z0 = RIVER_Z - 4;
  const z1 = FAR_BANK_Z + 6;
  const deckY = 13;
  const steel = lambert(0x3c4046);
  const span = (z1 - z0) / 2;
  ctx.solid.box(15, 1.5, Math.abs(z1 - z0) + 80, x, deckY, (z0 + z1) / 2 - 30, steel);
  const lights = emissiveMat(ctx, 0xbfe0ff, 0.12, 1.5);
  for (const side of [-7.6, 7.6]) {
    for (let k = 0; k < 2; k++) {
      const a = z0 + span * k;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        pts.push(new THREE.Vector3(x + side, deckY + Math.sin(t * Math.PI) * 30, a + span * t));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      ctx.solid.add(new THREE.TubeGeometry(curve, 28, 1.05, 5, false), steel);
      ctx.solid.add(new THREE.TubeGeometry(curve, 28, 0.2, 4, false), lights, 0, 1.25, 0);
      for (let i = 2; i <= 14; i += 2) {
        const t = i / 16;
        const top = deckY + Math.sin(t * Math.PI) * 30;
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
  for (let z = -120; z <= 190; z += 38) {
    put(-232 - r() * 10, z);
    put(196 + r() * 10, z);
    if (r() > 0.4) put(-272, z + 14);
    if (r() > 0.4) put(240, z + 14);
  }
  for (let x = -160; x <= 160; x += 40) put(x, 186 + r() * 12);
  void std;
}
