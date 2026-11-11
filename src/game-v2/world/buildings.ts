import * as THREE from "three";
import { tex } from "../gfx/tex";
import { addGround } from "./ground";
import { MAT, Frame, YAW, addSolid, bush, emissiveMat, facade, globeLamp, neon, poolMat, sign, std, storefront, tree, type BuildCtx } from "./kit";
import { CURB, type Rect } from "./map";

const Y0 = CURB;

function sidingMat(hex: string) {
  const key = `siding:${hex}`;
  const cache = sidingMat as unknown as { c?: Map<string, THREE.MeshStandardMaterial> };
  cache.c ??= new Map();
  let m = cache.c.get(key);
  if (!m) {
    const map = tex(64, 64, (g, w, h) => {
      g.fillStyle = hex;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,0.16)";
      for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1.5);
      g.fillStyle = "rgba(255,255,255,0.08)";
      for (let y = 2; y < h; y += 8) g.fillRect(0, y, w, 1);
    });
    map.repeat.set(1, 1);
    m = new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
    cache.c.set(key, m);
  }
  return m;
}

export type Crown = "flat" | "spire" | "band" | "ring" | "setback" | "pyramid";

/** Downtown tower. Lobby glass at the street, facade above, a crown that reads on the skyline. */
export function tower(ctx: BuildCtx, r: Rect, h: number, style: string, opts: { crown?: Crown; accent?: string; variant?: number; band?: number } = {}) {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  const f = facade(ctx, style, opts.variant ?? 0);
  const lobby = 5.2;
  ctx.solid.walls(w, h - lobby, d, cx, Y0 + lobby, cz, f.mat, f.tileW, f.tileH, ctx.rand());
  const store = storefront(ctx, 40 + (opts.variant ?? 0), opts.accent ?? "#1c1c1f", true);
  const faces: [number, number, number, number][] = [
    [w, cx, r.maxZ, YAW.south],
    [w, cx, r.minZ, YAW.north],
    [d, r.maxX, cz, YAW.east],
    [d, r.minX, cz, YAW.west],
  ];
  for (const [len, x, z, yaw] of faces) ctx.solid.wall(len, lobby, x, Y0 + lobby / 2, z, store, yaw, Math.max(1, Math.round(len / 9)), 1);
  ctx.solid.box(w + 0.5, 0.4, d + 0.5, cx, Y0 + lobby, cz, MAT.darkConcrete());
  ctx.solid.flat(w, d, cx, Y0 + h, cz, MAT.roof());
  ctx.solid.box(w, 1.1, 0.4, cx, Y0 + h + 0.55, r.maxZ - 0.2, MAT.darkConcrete());
  ctx.solid.box(w, 1.1, 0.4, cx, Y0 + h + 0.55, r.minZ + 0.2, MAT.darkConcrete());
  ctx.solid.box(0.4, 1.1, d, r.maxX - 0.2, Y0 + h + 0.55, cz, MAT.darkConcrete());
  ctx.solid.box(0.4, 1.1, d, r.minX + 0.2, Y0 + h + 0.55, cz, MAT.darkConcrete());
  const top = Y0 + h;
  const crown = opts.crown ?? "flat";
  const bandColor = opts.band ?? 0xffc878;
  if (crown === "band") {
    ctx.solid.box(w + 0.3, 1.1, d + 0.3, cx, top - 1.2, cz, emissiveMat(ctx, bandColor, 0.1, 1.5));
  } else if (crown === "spire") {
    ctx.solid.box(w * 0.62, 7, d * 0.62, cx, top + 3.5, cz, f.mat);
    ctx.solid.add(new THREE.ConeGeometry(Math.min(w, d) * 0.46, 16, 4), MAT.darkConcrete(), cx, top + 15, cz, Math.PI / 4);
    ctx.solid.cyl(0.12, 0.12, 12, cx, top + 29, cz, MAT.steel(), 5);
    ctx.solid.add(new THREE.SphereGeometry(0.5, 8, 6), emissiveMat(ctx, 0xff2a1a, 0.6, 3.4), cx, top + 35.2, cz);
    ctx.solid.box(w * 0.64, 0.6, d * 0.64, cx, top + 6.8, cz, emissiveMat(ctx, bandColor, 0.1, 1.5));
  } else if (crown === "ring") {
    ctx.solid.add(new THREE.CylinderGeometry(Math.min(w, d) * 0.42, Math.min(w, d) * 0.42, 5.5, 20, 1, true), std(0xdedad0, 0.6), cx, top + 2.75, cz);
    ctx.solid.add(new THREE.CylinderGeometry(Math.min(w, d) * 0.43, Math.min(w, d) * 0.43, 0.7, 20, 1, true), emissiveMat(ctx, bandColor, 0.1, 1.5), cx, top + 5.1, cz);
  } else if (crown === "setback") {
    ctx.solid.walls(w * 0.7, 10, d * 0.7, cx, top, cz, f.mat, f.tileW, f.tileH, 0.3);
    ctx.solid.flat(w * 0.7, d * 0.7, cx, top + 10, cz, MAT.roof());
    ctx.solid.cyl(0.1, 0.1, 9, cx, top + 14.5, cz, MAT.steel(), 5);
    ctx.solid.add(new THREE.SphereGeometry(0.4, 8, 6), emissiveMat(ctx, 0xff2a1a, 0.6, 3.4), cx, top + 19.2, cz);
  } else if (crown === "pyramid") {
    ctx.solid.add(new THREE.ConeGeometry(Math.min(w, d) * 0.72, 12, 4), emissiveMat(ctx, 0x2a8a4a, 0.08, 0.9), cx, top + 6, cz, Math.PI / 4);
  } else {
    ctx.solid.box(w * 0.3, 2.4, d * 0.25, cx - w * 0.15, top + 1.2, cz + d * 0.1, MAT.darkConcrete());
    ctx.solid.box(w * 0.18, 1.6, d * 0.2, cx + w * 0.22, top + 0.8, cz - d * 0.2, MAT.steel());
  }
  addSolid(ctx, r.minX, r.maxX, r.minZ, r.maxZ);
}

const SHOP_NAMES = [
  ["BLUE NOTE", "#3aa0ff"],
  ["SOUL KITCHEN", "#ff5a36"],
  ["DELTA JUKE", "#ffb400"],
  ["BIG RIVER BBQ", "#ff3b3b"],
  ["LIVE MUSIC", "#39ff14"],
  ["MIDNIGHT BLUES", "#7a6cff"],
  ["MOJO HAND", "#ff4fd8"],
  ["901 RECORDS", "#ffd23a"],
  ["CATFISH & HONEY", "#ff8a1e"],
  ["THE JUKE JOINT", "#35e0d0"],
  ["RIBS & WINGS", "#ff3b3b"],
  ["BLUFF CITY", "#39ff14"],
  ["HOT WINGS", "#ffb400"],
  ["DAIQUIRIS", "#ff4fd8"],
  ["SOUTH MAIN", "#3aa0ff"],
  ["VINYL & VIBES", "#7a6cff"],
] as const;
const BLADES = [
  ["BLUES", "#3aa0ff"],
  ["BBQ", "#ff3b3b"],
  ["LIVE", "#39ff14"],
  ["JUKE", "#ffb400"],
  ["SOUL", "#ff4fd8"],
  ["901", "#39ff14"],
] as const;
const AWNING = [0x7a1f1f, 0x1f4a2c, 0x1d2f55, 0x5a3a12, 0x2b2b2e, 0x6a1f4a];
const SHOP_BRICK = ["brickRed", "brickBrown", "brickCream", "brickDark"];

/**
 * A run of old storefronts along an east-west street. `face` is the way the fronts look.
 * Each one gets its own brick, awning, neon and a spill of light on the wet street.
 */
export function shopRow(ctx: BuildCtx, x0: number, x1: number, frontZ: number, face: "north" | "south", depth: number, seed: number) {
  const dir = face === "south" ? 1 : -1;
  const r = ctx.rand;
  let x = x0;
  let n = seed;
  while (x < x1 - 4) {
    let u = 8 + Math.floor(r() * 5);
    if (x1 - (x + u) < 7) u = x1 - x;
    const floors = 2 + (r() > 0.45 ? 1 : 0);
    const h = 4.4 + floors * 3.6;
    const cx = x + u / 2;
    const cz = frontZ - dir * (depth / 2);
    const f = new Frame(ctx, cx, frontZ, face === "south" ? YAW.south : YAW.north);
    const brick = facade(ctx, SHOP_BRICK[n % SHOP_BRICK.length]!, n % 3);
    ctx.solid.walls(u, h - 4.2, depth, cx, Y0 + 4.2, cz, brick.mat, brick.tileW, brick.tileH, r());
    ctx.solid.walls(u, 4.2, depth, cx, Y0, cz, MAT.brick("#2a2220", 3), 4, 4);
    const [name, color] = SHOP_NAMES[n % SHOP_NAMES.length]!;
    const awn = AWNING[n % AWNING.length]!;
    f.wall(u - 0.5, 3.7, 0, Y0 + 1.85, 0.05, storefront(ctx, n % 7, `#${awn.toString(16).padStart(6, "0")}`), ctx.solid, 0, 1, 1);
    f.add(new THREE.BoxGeometry(u - 0.8, 0.1, 1.9), std(awn, 0.8), 0, Y0 + 3.75, 0.95, ctx.solid, 0, 0.3);
    f.wall(Math.min(u - 1.4, 6.4), 1.35, 0, Y0 + 5.2, 0.14, neon(ctx, name, color), ctx.flat);
    f.box(u + 0.2, 0.5, 0.6, 0, Y0 + h - 0.1, -0.05, MAT.darkConcrete());
    f.flat(u, depth, 0, Y0 + h, -depth / 2, MAT.roof(), ctx.solid);
    if (r() > 0.4) f.box(1.6, 1, 1.4, (r() - 0.5) * (u - 3), Y0 + h + 0.5, -depth * 0.6, MAT.steel());
    // Light out of the window onto the walk, and the sign smeared down the wet street.
    f.flat(u - 0.6, 4.2, 0, Y0 + 0.02, 2.2, poolMat(ctx, 0xffb066, 0.34), ctx.flat);
    f.flat(Math.min(u, 6), 8, 0, 0.03, 8.2, poolMat(ctx, new THREE.Color(color).getHex(), 0.26), ctx.flat);
    f.lamp(0, Y0 + 4.6, 1.2, new THREE.Color(color).getHex());
    if (n % 2 === 0) {
      const [word, bc] = BLADES[(n >> 1) % BLADES.length]!;
      const mat = neon(ctx, word, bc, { w: 256, h: 128 });
      const bx = u / 2 - 0.9;
      f.box(0.12, 1.25, 2.0, bx, Y0 + 7.2, 1.15, MAT.black());
      f.wall(1.9, 1.15, bx + 0.07, Y0 + 7.2, 1.15, mat, ctx.flat, Math.PI / 2);
      f.wall(1.9, 1.15, bx - 0.07, Y0 + 7.2, 1.15, mat, ctx.flat, -Math.PI / 2);
    }
    x += u;
    n += 1;
  }
  addSolid(ctx, x0, x1, frontZ - dir * depth, frontZ);
}

/** Brick or concrete mid-rise with a shop at the street on the chosen faces. */
export function midrise(
  ctx: BuildCtx,
  r: Rect,
  h: number,
  style: string,
  opts: { shops?: ("north" | "south" | "east" | "west")[]; accent?: number; variant?: number; sign?: { text: string; color: string; face: "north" | "south" | "east" | "west"; y?: number; w?: number } } = {},
) {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  const f = facade(ctx, style, opts.variant ?? 0);
  ctx.solid.walls(w, h, d, cx, Y0, cz, f.mat, f.tileW, f.tileH, ctx.rand());
  ctx.solid.flat(w, d, cx, Y0 + h, cz, MAT.roof());
  ctx.solid.box(w + 0.3, 0.6, d + 0.3, cx, Y0 + h - 0.1, cz, MAT.darkConcrete());
  ctx.solid.box(Math.min(3, w * 0.3), 1.4, Math.min(2.4, d * 0.3), cx + w * 0.18, Y0 + h + 0.7, cz - d * 0.15, MAT.steel());
  const accent = opts.accent ?? 0x2b2b2e;
  const face = (side: "north" | "south" | "east" | "west") => {
    if (side === "south") return { len: w, f: new Frame(ctx, cx, r.maxZ, YAW.south) };
    if (side === "north") return { len: w, f: new Frame(ctx, cx, r.minZ, YAW.north) };
    if (side === "east") return { len: d, f: new Frame(ctx, r.maxX, cz, YAW.east) };
    return { len: d, f: new Frame(ctx, r.minX, cz, YAW.west) };
  };
  for (const side of opts.shops ?? []) {
    const s = face(side);
    const bays = Math.max(1, Math.round(s.len / 9));
    s.f.wall(s.len - 0.4, 3.8, 0, Y0 + 1.9, 0.05, storefront(ctx, (opts.variant ?? 0) + bays, `#${accent.toString(16).padStart(6, "0")}`), ctx.solid, 0, bays, 1);
    s.f.add(new THREE.BoxGeometry(s.len - 0.6, 0.1, 1.6), std(accent, 0.8), 0, Y0 + 3.9, 0.8, ctx.solid, 0, 0.26);
    s.f.flat(s.len - 0.6, 4, 0, Y0 + 0.02, 2.1, poolMat(ctx, 0xffb066, 0.3), ctx.flat);
  }
  if (opts.sign) {
    const s = face(opts.sign.face);
    const sw = opts.sign.w ?? Math.min(s.len - 2, 9);
    s.f.wall(sw, sw * 0.26, 0, Y0 + (opts.sign.y ?? 5.4), 0.16, neon(ctx, opts.sign.text, opts.sign.color), ctx.flat);
    s.f.flat(sw, 8, 0, 0.03, 8, poolMat(ctx, new THREE.Color(opts.sign.color).getHex(), 0.24), ctx.flat);
    s.f.lamp(0, Y0 + 4.8, 1.4, new THREE.Color(opts.sign.color).getHex());
  }
  addSolid(ctx, r.minX, r.maxX, r.minZ, r.maxZ);
}

/** Open-deck parking garage. */
export function garage(ctx: BuildCtx, r: Rect, levels: number) {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  for (let i = 0; i <= levels; i++) {
    const y = Y0 + i * 3.2;
    ctx.solid.box(w, 0.35, d, cx, y + 0.18, cz, MAT.concrete());
    if (i > 0) {
      ctx.solid.box(w + 0.2, 1, 0.25, cx, y + 0.7, r.maxZ, MAT.concrete());
      ctx.solid.box(w + 0.2, 1, 0.25, cx, y + 0.7, r.minZ, MAT.concrete());
      ctx.solid.box(0.25, 1, d, r.maxX, y + 0.7, cz, MAT.concrete());
      ctx.solid.box(0.25, 1, d, r.minX, y + 0.7, cz, MAT.concrete());
    }
  }
  for (const x of [r.minX + 0.4, cx, r.maxX - 0.4]) {
    for (const z of [r.minZ + 0.4, cz, r.maxZ - 0.4]) ctx.solid.box(0.7, levels * 3.2, 0.7, x, Y0 + levels * 1.6, z, MAT.concrete());
  }
  ctx.solid.wall(6, 1.4, cx, Y0 + levels * 3.2 + 1.6, r.maxZ + 0.2, neon(ctx, "PARK", "#3aa0ff", { w: 256, h: 96 }), YAW.south);
  addSolid(ctx, r.minX, r.maxX, r.minZ, r.maxZ);
}

const SIDING = ["#d9cfb8", "#8fa58a", "#9fb7c9", "#d9c06a", "#e8e4dc", "#b5705a", "#c9b29a", "#7f95a8"];
const ROOFS = [0x3a2c26, 0x2c2f33, 0x4a342a, 0x30343a];
const DOORS = [0x7a1f1f, 0x1d3a5a, 0x1f4a2c, 0x2b2b2e, 0xd8a93a];

let windowMat: THREE.MeshStandardMaterial | null = null;
function houseWindow(ctx: BuildCtx) {
  if (!windowMat) {
    windowMat = new THREE.MeshStandardMaterial({ color: 0x5a7486, emissive: 0xffc27a, emissiveIntensity: 0.05, roughness: 0.2, metalness: 0.2 });
    ctx.glow.emissive(windowMat, 0.04, 1.5);
  }
  return windowMat;
}

export function resetBuildings() {
  windowMat = null;
  (sidingMat as unknown as { c?: Map<string, THREE.MeshStandardMaterial> }).c = undefined;
}

function gableGeo(width: number, rise: number) {
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([-width / 2, 0, 0, width / 2, 0, 0, 0, rise, 0]);
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

/**
 * Bungalow with a porch. Origin is the middle of the footprint; `yaw` turns the porch to the street.
 * Returns the spot in front of the door.
 */
export function house(ctx: BuildCtx, x: number, z: number, yaw: number, n: number, opts: { w?: number; d?: number; hero?: boolean } = {}) {
  const w = opts.w ?? 10.5;
  const d = opts.d ?? 8.2;
  const f = new Frame(ctx, x, z, yaw);
  const base = 0.5;
  const wallH = 3.05;
  const wall = sidingMat(SIDING[n % SIDING.length]!);
  const roof = std(ROOFS[n % ROOFS.length]!, 0.9);
  const trim = MAT.white();
  f.box(w + 0.4, base, d + 0.4, 0, Y0 + base / 2, 0, MAT.concrete());
  f.box(w, wallH, d, 0, Y0 + base + wallH / 2, 0, wall);
  const rise = 1.9;
  const run = d / 2 + 0.6;
  const len = Math.hypot(run, rise);
  const pitch = Math.atan2(rise, run);
  const eave = Y0 + base + wallH;
  f.add(new THREE.BoxGeometry(w + 1.2, 0.14, len), roof, 0, eave + rise / 2, run / 2, ctx.solid, 0, pitch);
  f.add(new THREE.BoxGeometry(w + 1.2, 0.14, len), roof, 0, eave + rise / 2, -run / 2, ctx.solid, 0, -pitch);
  const gable = gableGeo(d + 0.2, rise);
  f.add(gable, wall, w / 2, eave, 0, ctx.solid, Math.PI / 2);
  f.add(gable.clone(), wall, -w / 2, eave, 0, ctx.solid, -Math.PI / 2);
  f.box(0.9, 2.2, 0.9, w * 0.28, eave + rise * 0.7, -d * 0.18, MAT.brick("#6a3a2c", 2));
  // Porch across part of the front.
  const pw = w * (n % 3 === 1 ? 0.9 : 0.6);
  const pd = 2.3;
  const front = d / 2;
  f.box(pw, 0.14, pd, 0, Y0 + base - 0.07, front + pd / 2, MAT.wood());
  f.box(pw + 0.4, 0.12, pd + 0.5, 0, Y0 + base + 2.75, front + pd / 2, roof);
  f.box(pw + 0.3, 0.3, 0.14, 0, Y0 + base + 2.55, front + pd, trim);
  const posts = pw > 7 ? [-pw / 2 + 0.2, -pw / 6, pw / 6, pw / 2 - 0.2] : [-pw / 2 + 0.2, pw / 2 - 0.2];
  for (const px of posts) {
    f.box(0.36, 0.8, 0.36, px, Y0 + base + 0.4, front + pd - 0.2, MAT.brick("#6a3a2c", 2));
    f.box(0.16, 1.8, 0.16, px, Y0 + base + 1.7, front + pd - 0.2, trim);
  }
  for (let i = 0; i < 3; i++) f.box(1.5, 0.16, 0.36, 0, Y0 + base - 0.16 * (i + 1) + 0.08, front + pd + 0.18 + i * 0.36, MAT.concrete());
  // Door and windows.
  f.box(1.2, 2.3, 0.1, 0, Y0 + base + 1.15, front + 0.03, trim);
  f.box(0.96, 2.08, 0.1, 0, Y0 + base + 1.06, front + 0.07, std(DOORS[n % DOORS.length]!, 0.6));
  const glass = houseWindow(ctx);
  const win = (lx: number, lz: number, localYaw: number) => {
    f.box(1.5, 1.6, 0.08, lx, Y0 + base + 1.75, lz, trim, ctx.solid, localYaw);
    const ox = Math.sin(localYaw) * 0.05;
    const oz = Math.cos(localYaw) * 0.05;
    f.box(1.26, 1.36, 0.06, lx + ox, Y0 + base + 1.75, lz + oz, glass, ctx.solid, localYaw);
  };
  win(-w * 0.3, front + 0.02, 0);
  win(w * 0.3, front + 0.02, 0);
  win(w / 2 + 0.02, 0, Math.PI / 2);
  win(-w / 2 - 0.02, 0, -Math.PI / 2);
  win(-w * 0.25, -front - 0.02, Math.PI);
  f.add(new THREE.SphereGeometry(0.1, 8, 6), emissiveMat(ctx, 0xffc27a, 0.3, 3), 0.85, Y0 + base + 2.2, front + 0.12);
  f.flat(4, 3.4, 0, Y0 + base + 0.02, front + 1.2, poolMat(ctx, 0xffb46a, 0.3), ctx.flat);
  // Walk to the street and a little planting.
  f.flat(1.3, 4.2, 0, Y0 + 0.01, front + pd + 3.2, MAT.concrete(), ctx.ground);
  const fx = (lx: number, lz: number): [number, number] => [f.wx(lx, lz), f.wz(lx, lz)];
  for (const lx of [-w * 0.36, -w * 0.18, w * 0.2, w * 0.38]) bush(ctx, ...fx(lx, front + pd + 0.5), 0.8 + ctx.rand() * 0.4, Y0);
  if (opts.hero || ctx.rand() > 0.45) tree(ctx, ...fx(w * 0.42 * (n % 2 ? 1 : -1), front + pd + 3.2), 1.1, Y0);
  f.solid(-w / 2, w / 2, -d / 2, d / 2);
  // The porch is a step up. Register it so feet land on the deck.
  const corners = [fx(-pw / 2, front), fx(pw / 2, front + pd)];
  addGround({
    minX: Math.min(corners[0]![0], corners[1]![0]),
    maxX: Math.max(corners[0]![0], corners[1]![0]),
    minZ: Math.min(corners[0]![1], corners[1]![1]),
    maxZ: Math.max(corners[0]![1], corners[1]![1]),
    y: Y0 + base,
  });
  const door = fx(0, front + 0.9);
  const walk = fx(0, front + pd + 2.4);
  return { door: { x: door[0], z: door[1] }, walk: { x: walk[0], z: walk[1] } };
}

/** Painted wall mural. */
export function mural(ctx: BuildCtx, x: number, z: number, yaw: number, w: number, h: number, kind: "love" | "901" | "soul") {
  const map = tex(
    512,
    256,
    (g, W, H) => {
      const grd = g.createLinearGradient(0, 0, W, H);
      if (kind === "love") {
        grd.addColorStop(0, "#f2d24a");
        grd.addColorStop(1, "#e8742c");
      } else if (kind === "901") {
        grd.addColorStop(0, "#0e3b24");
        grd.addColorStop(1, "#0a1a12");
      } else {
        grd.addColorStop(0, "#2a1a4a");
        grd.addColorStop(1, "#b02a5a");
      }
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      g.textAlign = "center";
      g.textBaseline = "middle";
      if (kind === "love") {
        g.fillStyle = "#17110e";
        g.font = '900 150px "Bebas Neue", Impact, sans-serif';
        g.fillText("I", 70, 132);
        g.fillStyle = "#d01f2e";
        g.beginPath();
        g.moveTo(170, 96);
        g.bezierCurveTo(170, 50, 108, 50, 108, 104);
        g.bezierCurveTo(108, 150, 170, 180, 170, 204);
        g.bezierCurveTo(170, 180, 232, 150, 232, 104);
        g.bezierCurveTo(232, 50, 170, 50, 170, 96);
        g.fill();
        g.fillStyle = "#17110e";
        g.font = '900 132px "Bebas Neue", Impact, sans-serif';
        g.fillText("MEMPHIS", 378, 134);
      } else if (kind === "901") {
        g.fillStyle = "#39ff14";
        g.font = '900 210px "Bebas Neue", Impact, sans-serif';
        g.fillText("901", W / 2, 118);
        g.fillStyle = "#e0b33a";
        g.font = '700 40px "Bebas Neue", Impact, sans-serif';
        g.fillText("GRIND · HUSTLE · SACK", W / 2, 222);
      } else {
        g.fillStyle = "#ffd23a";
        g.font = '900 120px "Bebas Neue", Impact, sans-serif';
        g.fillText("SOULSVILLE", W / 2, 100);
        g.fillStyle = "#ffffff";
        g.font = '700 54px "Bebas Neue", Impact, sans-serif';
        g.fillText("HOME OF THE BLUES", W / 2, 196);
      }
    },
    { repeat: false },
  );
  ctx.solid.wall(w, h, x, Y0 + h / 2 + 0.6, z, new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), yaw);
}

/** Flat lot surface inside the sidewalks. */
export function lotSurface(ctx: BuildCtx, r: Rect, kind: "parking" | "grass" | "plaza" | "concrete") {
  const mat = lotMat(ctx, kind);
  ctx.ground.flat(r.maxX - r.minX, r.maxZ - r.minZ, (r.minX + r.maxX) / 2, Y0 + 0.004, (r.minZ + r.maxZ) / 2, mat, 0, kind === "grass" ? 5 : kind === "plaza" ? 6 : 8);
}

const lotMats = new Map<string, THREE.Material>();
function lotMat(ctx: BuildCtx, kind: "parking" | "grass" | "plaza" | "concrete") {
  let m = lotMats.get(kind);
  if (!m) {
    const src = kind === "parking" ? MAT.asphalt(ctx.glow) : kind === "grass" ? MAT.grass() : kind === "plaza" ? MAT.plaza(ctx.glow) : MAT.concrete();
    m = src.clone();
    m.polygonOffset = true;
    m.polygonOffsetFactor = -1;
    m.polygonOffsetUnits = -1;
    if (kind === "parking" || kind === "plaza") ctx.glow.wetSurface(m as THREE.MeshStandardMaterial);
    lotMats.set(kind, m);
  }
  return m;
}

export function resetLots() {
  lotMats.clear();
}

export { globeLamp, sign };
