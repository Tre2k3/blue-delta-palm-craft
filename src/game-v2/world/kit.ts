import * as THREE from "three";
import type { Solid } from "../core/types";
import { Batch } from "../gfx/batch";
import { asphaltTex, blobTex, brickTex, facadeTex, grassTex, neonTex, plazaTex, sidewalkTex, signTex, storefrontTex, wetRoughTex, type FacadeStyle } from "../gfx/tex";
import { rng } from "../core/util";

/**
 * Everything that changes with the hour. Materials register once; `apply` is called with
 * the current `lights` value (0 by day, 1 at night) and only touches them when it moves.
 */
export class Glow {
  private windows: { mat: THREE.MeshStandardMaterial; lo: number; hi: number }[] = [];
  private neon: { mat: THREE.MeshBasicMaterial; base: THREE.Color; lo: number; hi: number }[] = [];
  private fades: { mat: THREE.Material & { opacity: number }; lo: number; hi: number }[] = [];
  private wet: THREE.MeshStandardMaterial[] = [];
  private last = -1;
  private lastRough = -1;

  emissive(mat: THREE.MeshStandardMaterial, lo = 0.03, hi = 1.2) {
    this.windows.push({ mat, lo, hi });
    return mat;
  }

  basic(mat: THREE.MeshBasicMaterial, lo = 0.6, hi = 1.9) {
    this.neon.push({ mat, base: mat.color.clone(), lo, hi });
    return mat;
  }

  fade<T extends THREE.Material & { opacity: number }>(mat: T, lo = 0, hi = 1) {
    this.fades.push({ mat, lo, hi });
    return mat;
  }

  wetSurface(mat: THREE.MeshStandardMaterial) {
    this.wet.push(mat);
    return mat;
  }

  apply(lights: number, roadRough: number) {
    if (Math.abs(lights - this.last) > 0.004) {
      this.last = lights;
      for (const w of this.windows) w.mat.emissiveIntensity = w.lo + (w.hi - w.lo) * lights;
      for (const n of this.neon) n.mat.color.copy(n.base).multiplyScalar(n.lo + (n.hi - n.lo) * lights);
      // Pools and streaks come up late: faint at sunset, full after dark.
      const late = lights * lights;
      for (const f of this.fades) {
        f.mat.opacity = f.lo + (f.hi - f.lo) * late;
        f.mat.visible = f.mat.opacity > 0.01;
      }
    }
    if (Math.abs(roadRough - this.lastRough) > 0.004) {
      this.lastRough = roadRough;
      for (const m of this.wet) m.roughness = Math.min(1, roadRough * (m.userData.roughScale ?? 1));
    }
  }
}

export type Lamp = { x: number; y: number; z: number; color: number };

export type BuildCtx = {
  /** Opaque world geometry that casts and receives shadows. */
  solid: Batch;
  /** Ground: receives shadows, casts none. */
  ground: Batch;
  /** Unlit or additive bits (neon, decals, light pools). */
  flat: Batch;
  glow: Glow;
  solids: Solid[];
  lamps: Lamp[];
  rand: () => number;
};

export function addSolid(ctx: BuildCtx, minX: number, maxX: number, minZ: number, maxZ: number) {
  ctx.solids.push({ minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ) });
}

const cache = new Map<string, unknown>();
function once<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

export function resetKit() {
  cache.clear();
}

export function std(color: number, roughness = 0.8, metalness = 0) {
  return once(`std:${color}:${roughness}:${metalness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness }));
}

export function lambert(color: number) {
  return once(`lam:${color}`, () => new THREE.MeshLambertMaterial({ color }));
}

export const MAT = {
  asphalt: (glow: Glow) =>
    once("asphalt", () => {
      const m = new THREE.MeshStandardMaterial({ map: asphaltTex(), roughnessMap: wetRoughTex(3), roughness: 0.5, metalness: 0, color: 0xffffff });
      return glow.wetSurface(m);
    }),
  plaza: (glow: Glow) =>
    once("plaza", () => {
      const m = new THREE.MeshStandardMaterial({ map: plazaTex(), roughnessMap: wetRoughTex(9), roughness: 0.4, metalness: 0.05, color: 0xffffff });
      m.userData.roughScale = 0.85;
      return glow.wetSurface(m);
    }),
  sidewalk: (glow: Glow) =>
    once("sidewalk", () => {
      const m = new THREE.MeshStandardMaterial({ map: sidewalkTex(), roughnessMap: wetRoughTex(14), roughness: 0.7, color: 0xffffff });
      m.userData.roughScale = 1.2;
      return glow.wetSurface(m);
    }),
  curb: () => std(0x77736c, 0.85),
  grass: () => once("grass", () => new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 1 })),
  dirt: () => std(0x4a3a2a, 1),
  concrete: () => std(0x8c8983, 0.9),
  darkConcrete: () => std(0x3c3b3a, 0.9),
  steel: () => std(0x2a2d31, 0.45, 0.7),
  chrome: () => std(0xc9ccd2, 0.2, 0.9),
  black: () => std(0x0e0e10, 0.55, 0.2),
  white: () => std(0xeeeae2, 0.6),
  wood: () => std(0x6b4a2e, 0.85),
  darkWood: () => std(0x3a281a, 0.8),
  bark: () => std(0x4a3628, 1),
  roof: () => std(0x26282c, 0.95),
  gold: () => std(0xd8a93a, 0.32, 0.85),
  leaf: (i: number) => once(`leaf${i % 4}`, () => new THREE.MeshStandardMaterial({ color: [0x2d5a2c, 0x3b6e34, 0x24492a, 0x4a7a3a][i % 4]!, roughness: 1, flatShading: true })),
  autumn: (i: number) => once(`aut${i % 3}`, () => new THREE.MeshStandardMaterial({ color: [0xb5642a, 0xc98a2e, 0x8a3a24][i % 3]!, roughness: 1, flatShading: true })),
  brick: (hex: string, seed = 1) => once(`brick:${hex}:${seed}`, () => new THREE.MeshStandardMaterial({ map: brickTex(hex, "#241a17", seed), roughness: 0.92 })),
  glassDark: () => once("glassDark", () => new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.08, metalness: 0.6 })),
};

const STYLE: Record<string, FacadeStyle & { tileW: number; tileH: number }> = {
  brickRed: { wall: "#7c3d2f", trim: "#d8cdb8", glass: "#27323c", lit: ["#ffd08a", "#ffb866", "#ffe2b0"], bays: 4, floors: 3, winW: 0.5, winH: 0.62, litShare: 0.42, brick: true, arched: true, tileW: 12, tileH: 10.8 },
  brickBrown: { wall: "#5c3a2a", trim: "#b9a98c", glass: "#222c34", lit: ["#ffd08a", "#ffc070"], bays: 4, floors: 3, winW: 0.52, winH: 0.6, litShare: 0.36, brick: true, tileW: 12, tileH: 10.8 },
  brickCream: { wall: "#b59a78", trim: "#6a4e38", glass: "#2c3640", lit: ["#ffd9a0", "#fff0c8"], bays: 4, floors: 3, winW: 0.5, winH: 0.6, litShare: 0.4, brick: true, tileW: 12, tileH: 10.8 },
  brickDark: { wall: "#33221e", trim: "#8a7a66", glass: "#1c242c", lit: ["#ffc878", "#ff9e58"], bays: 4, floors: 3, winW: 0.5, winH: 0.62, litShare: 0.34, brick: true, arched: true, tileW: 12, tileH: 10.8 },
  concrete: { wall: "#8f8a82", trim: "#6f6b65", glass: "#33485c", lit: ["#ffe6b8", "#cfe4ff", "#fff3d6"], bays: 6, floors: 6, winW: 0.66, winH: 0.56, litShare: 0.3, tileW: 18, tileH: 21 },
  white: { wall: "#d9d5cb", trim: "#aaa69c", glass: "#3a556e", lit: ["#fff0cf", "#d8e9ff"], bays: 6, floors: 6, winW: 0.5, winH: 0.66, litShare: 0.28, tileW: 15, tileH: 21 },
  tan: { wall: "#b79b72", trim: "#8d7450", glass: "#2f4254", lit: ["#ffd9a0", "#ffeed0"], bays: 6, floors: 6, winW: 0.52, winH: 0.6, litShare: 0.34, tileW: 16.8, tileH: 21 },
  glassBlue: { wall: "#16222e", trim: "#0c141c", glass: "#3c6d96", lit: ["#bfe0ff", "#fff2cc", "#9fd0ff"], bays: 8, floors: 6, winW: 0.9, winH: 0.84, litShare: 0.26, curtain: true, tileW: 16, tileH: 21 },
  glassDark: { wall: "#0e1114", trim: "#07090b", glass: "#22303c", lit: ["#ffe2a8", "#c8e2ff", "#39ff14"], bays: 8, floors: 6, winW: 0.9, winH: 0.84, litShare: 0.2, curtain: true, tileW: 16, tileH: 21 },
  glassGold: { wall: "#1c1610", trim: "#0e0b08", glass: "#6a5430", lit: ["#ffd98a", "#fff0c0"], bays: 8, floors: 6, winW: 0.9, winH: 0.84, litShare: 0.3, curtain: true, tileW: 16, tileH: 21 },
  far: { wall: "#1a1c22", trim: "#14161a", glass: "#1d2630", lit: ["#ffd9a0", "#ffe9c0", "#bcd8ff"], bays: 8, floors: 8, winW: 0.6, winH: 0.5, litShare: 0.34, tileW: 24, tileH: 28 },
};

export type StyleKey = keyof typeof STYLE;

export function facade(ctx: BuildCtx, key: string, variant = 0) {
  return once(`facade:${key}:${variant}`, () => {
    const style = STYLE[key]!;
    const { map, glow } = facadeTex(style, 100 + variant * 31 + key.length * 7);
    const mat = new THREE.MeshStandardMaterial({
      map,
      emissiveMap: glow,
      emissive: 0xffffff,
      emissiveIntensity: 0.03,
      roughness: style.curtain ? 0.18 : 0.88,
      metalness: style.curtain ? 0.55 : 0,
    });
    ctx.glow.emissive(mat, key === "far" ? 0.02 : 0.03, key === "far" ? 1.5 : 1.25);
    return { mat, tileW: style.tileW, tileH: style.tileH };
  });
}

export function storefront(ctx: BuildCtx, seed: number, accent: string, dark = false) {
  return once(`store:${seed}:${accent}:${dark}`, () => {
    const { map, glow } = storefrontTex(seed, accent, dark);
    const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 0.35, metalness: 0.1 });
    ctx.glow.emissive(mat, 0.12, 0.95);
    return mat;
  });
}

export function neon(ctx: BuildCtx, text: string, color: string, opts: Parameters<typeof neonTex>[2] = {}) {
  return once(`neon:${text}:${color}:${JSON.stringify(opts)}`, () => {
    const mat = new THREE.MeshBasicMaterial({ map: neonTex(text, color, opts), toneMapped: false });
    ctx.glow.basic(mat, 0.7, 2.1);
    return mat;
  });
}

export function sign(text: string, fg: string, bg: string, opts: Parameters<typeof signTex>[3] = {}) {
  return once(`sign:${text}:${fg}:${bg}:${JSON.stringify(opts)}`, () => new THREE.MeshBasicMaterial({ map: signTex(text, fg, bg, opts) }));
}

/** Additive light pool on the ground. Fades in with the city lights. */
export function poolMat(ctx: BuildCtx, color: number, strength = 0.5) {
  return once(`pool:${color}:${strength}`, () => {
    const mat = new THREE.MeshBasicMaterial({
      map: blobTex(),
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    ctx.glow.fade(mat, 0, strength);
    return mat;
  });
}

export function emissiveMat(ctx: BuildCtx, color: number, lo = 0.2, hi = 2.4) {
  return once(`emis:${color}:${lo}:${hi}`, () => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: lo, roughness: 0.4 });
    ctx.glow.emissive(mat, lo, hi);
    return mat;
  });
}

/**
 * Places prefab parts in a local frame that can face any of the four streets.
 * Local +Z is the front (toward the street), local X runs along the frontage.
 */
export class Frame {
  private c: number;
  private s: number;
  constructor(
    readonly ctx: BuildCtx,
    readonly ox: number,
    readonly oz: number,
    readonly yaw: number,
  ) {
    this.c = Math.cos(yaw);
    this.s = Math.sin(yaw);
  }

  wx(lx: number, lz: number) {
    return this.ox + lx * this.c + lz * this.s;
  }

  wz(lx: number, lz: number) {
    return this.oz - lx * this.s + lz * this.c;
  }

  box(w: number, h: number, d: number, lx: number, y: number, lz: number, mat: THREE.Material, batch: Batch = this.ctx.solid, localYaw = 0) {
    batch.box(w, h, d, this.wx(lx, lz), y, this.wz(lx, lz), mat, this.yaw + localYaw);
  }

  /** Upright quad facing local +Z (plus `localYaw`). */
  wall(w: number, h: number, lx: number, y: number, lz: number, mat: THREE.Material, batch: Batch = this.ctx.solid, localYaw = 0, uw = 1, uh = 1) {
    batch.wall(w, h, this.wx(lx, lz), y, this.wz(lx, lz), mat, this.yaw + localYaw, uw, uh);
  }

  flat(w: number, d: number, lx: number, y: number, lz: number, mat: THREE.Material, batch: Batch = this.ctx.ground, tile = 0) {
    batch.flat(w, d, this.wx(lx, lz), y, this.wz(lx, lz), mat, this.yaw, tile);
  }

  add(geo: THREE.BufferGeometry, mat: THREE.Material, lx: number, y: number, lz: number, batch: Batch = this.ctx.solid, localYaw = 0, pitch = 0, roll = 0) {
    batch.add(geo, mat, this.wx(lx, lz), y, this.wz(lx, lz), this.yaw + localYaw, pitch, roll);
  }

  /** Axis-aligned solid from a local rectangle. Frames only turn in quarter steps. */
  solid(lx0: number, lx1: number, lz0: number, lz1: number) {
    const xs = [this.wx(lx0, lz0), this.wx(lx1, lz1), this.wx(lx0, lz1), this.wx(lx1, lz0)];
    const zs = [this.wz(lx0, lz0), this.wz(lx1, lz1), this.wz(lx0, lz1), this.wz(lx1, lz0)];
    addSolid(this.ctx, Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
  }

  lamp(lx: number, y: number, lz: number, color: number) {
    this.ctx.lamps.push({ x: this.wx(lx, lz), y, z: this.wz(lx, lz), color });
  }
}

export const YAW = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };

/** Street lamp with an arm over the road, a glowing head and a pool on the ground. */
export function streetLamp(ctx: BuildCtx, x: number, z: number, yaw: number, y0 = 0.14) {
  const f = new Frame(ctx, x, z, yaw);
  f.add(new THREE.CylinderGeometry(0.07, 0.11, 6.2, 6), MAT.black(), 0, y0 + 3.1, 0);
  f.box(0.1, 0.1, 1.9, 0, y0 + 6.15, 0.9, MAT.black());
  f.box(0.34, 0.12, 0.7, 0, y0 + 6.06, 1.7, emissiveMat(ctx, 0xffc98a, 0.25, 2.4));
  f.flat(9, 9, 0, 0.03, 2.4, poolMat(ctx, 0xffb46a, 0.42), ctx.flat);
  f.lamp(0, y0 + 5.6, 1.7, 0xffc98a);
}

/** Old-town globe lamp for Beale, the plaza and the river walk. */
export function globeLamp(ctx: BuildCtx, x: number, z: number, y0 = 0.14, color = 0xffd9a0) {
  ctx.solid.cyl(0.06, 0.1, 3.4, x, y0 + 1.7, z, MAT.black(), 6);
  ctx.solid.cyl(0.16, 0.12, 0.16, x, y0 + 3.42, z, MAT.black(), 6);
  ctx.solid.add(new THREE.SphereGeometry(0.24, 8, 6), emissiveMat(ctx, color, 0.3, 2.1), x, y0 + 3.72, z);
  ctx.flat.flat(7, 7, x, y0 + 0.03, z, poolMat(ctx, color, 0.38));
  ctx.lamps.push({ x, y: y0 + 3.6, z, color });
}

export function tree(ctx: BuildCtx, x: number, z: number, scale = 1, y0 = 0, autumn = false) {
  const r = ctx.rand;
  const h = (3.2 + r() * 1.4) * scale;
  ctx.solid.cyl(0.14 * scale, 0.22 * scale, h, x, y0 + h / 2, z, MAT.bark(), 6);
  const blobs = 3 + Math.floor(r() * 2);
  for (let i = 0; i < blobs; i++) {
    const rad = (1.5 + r() * 0.9) * scale;
    const mat = autumn ? MAT.autumn(Math.floor(r() * 3)) : MAT.leaf(Math.floor(r() * 4));
    ctx.solid.add(new THREE.IcosahedronGeometry(rad, 1), mat, x + (r() - 0.5) * 1.6 * scale, y0 + h + rad * 0.45 + (r() - 0.3) * 0.9 * scale, z + (r() - 0.5) * 1.6 * scale, r() * 3);
  }
}

export function bush(ctx: BuildCtx, x: number, z: number, scale = 1, y0 = 0) {
  const r = ctx.rand;
  ctx.solid.add(new THREE.IcosahedronGeometry(0.55 * scale, 1), MAT.leaf(Math.floor(r() * 4)), x, y0 + 0.36 * scale, z, r() * 3);
}

export function bench(ctx: BuildCtx, x: number, z: number, yaw: number, y0 = 0.14) {
  const f = new Frame(ctx, x, z, yaw);
  f.box(1.7, 0.07, 0.5, 0, y0 + 0.46, 0, MAT.wood());
  f.box(1.7, 0.5, 0.07, 0, y0 + 0.78, -0.24, MAT.wood());
  f.box(0.07, 0.46, 0.5, -0.76, y0 + 0.23, 0, MAT.black());
  f.box(0.07, 0.46, 0.5, 0.76, y0 + 0.23, 0, MAT.black());
}

export function trashCan(ctx: BuildCtx, x: number, z: number, y0 = 0.14) {
  ctx.solid.cyl(0.3, 0.26, 0.9, x, y0 + 0.45, z, std(0x23352a, 0.7, 0.3), 8);
}

export function hydrant(ctx: BuildCtx, x: number, z: number, y0 = 0.14) {
  ctx.solid.cyl(0.13, 0.15, 0.62, x, y0 + 0.31, z, std(0xb3261c, 0.6), 8);
  ctx.solid.add(new THREE.SphereGeometry(0.14, 8, 6), std(0xb3261c, 0.6), x, y0 + 0.64, z);
}

/** Green blade street sign on a pole, readable from both streets. */
export function streetSign(ctx: BuildCtx, x: number, z: number, nameX: string, nameZ: string, y0 = 0.14) {
  ctx.solid.cyl(0.04, 0.04, 3.4, x, y0 + 1.7, z, MAT.steel(), 6);
  const a = sign(nameZ.toUpperCase(), "#ffffff", "#0e5a32", { w: 384, h: 72 });
  const b = sign(nameX.toUpperCase(), "#ffffff", "#0e5a32", { w: 384, h: 72 });
  ctx.flat.wall(1.5, 0.28, x, y0 + 3.2, z + 0.02, a, 0);
  ctx.flat.wall(1.5, 0.28, x, y0 + 3.2, z - 0.02, a, Math.PI);
  ctx.flat.wall(1.5, 0.28, x + 0.02, y0 + 2.86, z, b, Math.PI / 2);
  ctx.flat.wall(1.5, 0.28, x - 0.02, y0 + 2.86, z, b, -Math.PI / 2);
}

export function makeCtx(seed: number): BuildCtx {
  return { solid: new Batch(), ground: new Batch(), flat: new Batch(), glow: new Glow(), solids: [], lamps: [], rand: rng(seed) };
}
