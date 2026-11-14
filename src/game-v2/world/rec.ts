import * as THREE from "three";
import { tex } from "../gfx/tex";
import { MAT, addSolid, bench, bush, emissiveMat, globeLamp, neon, sign, std, trashCan, tree, type BuildCtx } from "./kit";
import { addGround } from "./ground";
import { CURB } from "./map";
import { CORNHOLE, COURTS_LOT, CUP_R, HOLES, PUTT_HUT, PUTT_LOT, TENNIS, TENNIS_FENCE, TENNIS_GATE, feltHeight, playDir, wallsOf, type Hole } from "./rec-map";

const Y0 = CURB;
const FELT = Y0 + 0.022;

let cache: Record<string, THREE.Material> = {};
const once = <T extends THREE.Material>(key: string, make: () => T): T => (cache[key] ??= make()) as T;
export function resetRec() {
  cache = {};
}

/** The rec grounds on Park Avenue: putt-putt behind Benji's house, tennis and cornhole on the next block. */
export function buildRec(ctx: BuildCtx) {
  // Laid out from its own dice, so nothing here moves anything else in the city.
  const world = ctx.rand;
  let seed = 2311;
  ctx.rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  buildPutt(ctx);
  buildCourts(ctx);
  ctx.rand = world;
}

const paving = (ctx: BuildCtx) =>
  once("paving", () => {
    // Its own copy, lifted clear of the grass it lies on.
    const m = MAT.sidewalk(ctx.glow).clone();
    m.polygonOffset = true;
    m.polygonOffsetFactor = -3;
    m.polygonOffsetUnits = -3;
    return ctx.glow.wetSurface(m);
  });
const strip = (ctx: BuildCtx, minX: number, maxX: number, minZ: number, maxZ: number) => ctx.ground.flat(maxX - minX, maxZ - minZ, (minX + maxX) / 2, Y0 + 0.012, (minZ + maxZ) / 2, paving(ctx), 0, 4);

/** A hedge along a line, with a solid behind it so nobody walks through. */
function hedge(ctx: BuildCtx, x0: number, z0: number, x1: number, z1: number) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 1.7));
  for (let i = 0; i <= n; i++) bush(ctx, x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, 1.1, Y0);
  addSolid(ctx, Math.min(x0, x1) - 0.3, Math.max(x0, x1) + 0.3, Math.min(z0, z1) - 0.3, Math.max(z0, z1) + 0.3);
}

// ------------------------------------------------------------------ putt-putt

function buildPutt(ctx: BuildCtx) {
  const L = PUTT_LOT;
  // The walk between the two rows, and the way in from Park Avenue round the hut.
  strip(ctx, L.minX + 1.5, L.maxX - 1.5, 95.35, 96.95);
  strip(ctx, PUTT_HUT.x - 4.4, PUTT_HUT.x - 2.6, 96.95, 106.2);
  strip(ctx, PUTT_HUT.x - 4.4, PUTT_HUT.x + 4.4, 104.2, L.maxZ);

  hut(ctx);
  HOLES.forEach((h, i) => hole(ctx, h, i + 1));

  hedge(ctx, L.minX + 0.8, L.minZ + 1.6, L.minX + 0.8, L.maxZ - 0.8);
  hedge(ctx, L.maxX - 0.8, L.minZ + 1.6, L.maxX - 0.8, L.maxZ - 0.8);
  hedge(ctx, L.minX + 0.8, L.maxZ - 0.8, PUTT_HUT.x - 5.2, L.maxZ - 0.8);
  hedge(ctx, PUTT_HUT.x + 5.2, L.maxZ - 0.8, L.maxX - 0.8, L.maxZ - 0.8);
  for (const [x, z] of [
    [-45.8, 96.15],
    [-27.4, 96.15],
    [-18.2, 96.15],
    [-36.6, 96.15],
    [PUTT_HUT.x - 5.6, 105.4],
    [PUTT_HUT.x + 5.6, 105.4],
  ] as const)
    globeLamp(ctx, x, z + (z < 100 ? 1.25 : 0), Y0, 0xfff0c8);
  bench(ctx, -27.4, 97.5, Math.PI, Y0);
  bench(ctx, -45.8, 94.9, 0, Y0);
  trashCan(ctx, PUTT_HUT.x + 3.6, 103.9, Y0);
}

/** The hut where putters are handed out: a counter under a striped awning and the course's name in lights. */
function hut(ctx: BuildCtx) {
  const { x, z } = PUTT_HUT;
  const wall = std(0xf2ead6, 0.8);
  const green = std(0x1d6b3a, 0.6);
  ctx.solid.box(3.6, 2.5, 2.2, x, Y0 + 1.25, z, wall);
  ctx.solid.box(4.1, 0.16, 2.8, x, Y0 + 2.58, z, green);
  // Counter and the dark of the window behind it.
  ctx.solid.box(3.2, 0.1, 0.5, x, Y0 + 1.02, z + 1.3, MAT.wood());
  ctx.flat.wall(3, 1.1, x, Y0 + 1.7, z + 1.105, std(0x15120f, 0.9));
  // Awning: green and cream stripes.
  const awning = once("awning", () => new THREE.MeshStandardMaterial({ map: tex(64, 8, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "#f2ead6" : "#1d6b3a";
      g.fillRect((i * w) / 8, 0, w / 8, h);
    }
  }), roughness: 0.8, side: THREE.DoubleSide }));
  ctx.solid.add(new THREE.PlaneGeometry(3.8, 1.1), awning, x, Y0 + 2.28, z + 1.55, 0, -1.05);
  ctx.flat.wall(3.9, 0.78, x, Y0 + 3.1, z + 0.2, neon(ctx, "SACK PUTT", "#39ff14", { sub: "9 HOLES · PAR 23", w: 768, h: 160 }));
  ctx.solid.box(4, 0.86, 0.1, x, Y0 + 3.1, z + 0.13, MAT.black());
  // A rack of putters and a bucket of balls on the counter.
  for (let i = 0; i < 4; i++) ctx.solid.cyl(0.012, 0.012, 0.9, x - 1.2 + i * 0.14, Y0 + 1.5, z + 1.2, MAT.chrome(), 5);
  ctx.solid.cyl(0.13, 0.1, 0.2, x + 1, Y0 + 1.17, z + 1.3, std(0xe0b33a, 0.5, 0.4), 10);
  addSolid(ctx, x - 1.9, x + 1.9, z - 1.2, z + 1.6);
}

const feltMat = () => once("felt", () => {
  const m = new THREE.MeshStandardMaterial({ color: 0x1f9150, roughness: 0.95 });
  m.polygonOffset = true;
  m.polygonOffsetFactor = -2;
  m.polygonOffsetUnits = -2;
  return m;
});
const POST_COLORS = [0xff5ad1, 0x35e0d0, 0xffd23a, 0x39ff14];

function hole(ctx: BuildCtx, h: Hole, n: number) {
  const [ox, oz] = h.at;
  const felt = feltMat();
  const kerb = std(0xf4f1ea, 0.7);
  const brick = std(0x9a3b2c, 0.85);

  if (h.ramp) {
    // Three pieces: the low end, the slope and the top. The kerbs are tall enough for all of it.
    const xs = h.outline.map((p) => p[0]);
    const zs = h.outline.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const w = maxX - minX;
    const cx = ox + (minX + maxX) / 2;
    const r = h.ramp;
    // `up` is the way it climbs: -1 toward the back fence, +1 toward Park Avenue.
    const up = Math.sign(r.z1 - r.z0);
    const low = up < 0 ? maxZ : minZ;
    const high = up < 0 ? minZ : maxZ;
    ctx.ground.flat(w, Math.abs(low - r.z0), cx, FELT, oz + (low + r.z0) / 2, felt);
    const run = Math.abs(r.z0 - r.z1);
    const len = Math.hypot(run, r.h);
    const slope = new THREE.BoxGeometry(w, 0.04, len);
    ctx.solid.add(slope, felt, cx, FELT + r.h / 2 - 0.02, oz + (r.z0 + r.z1) / 2, 0, -up * Math.atan2(r.h, run));
    ctx.solid.box(w, r.h, Math.abs(high - r.z1), cx, Y0 + r.h / 2 + 0.02, oz + (r.z1 + high) / 2, felt);
    // The top is ground to stand on.
    addGround({ minX: ox + minX, maxX: ox + maxX, minZ: oz + Math.min(r.z1, high), maxZ: oz + Math.max(r.z1, high), y: Y0 + r.h });
    // Earth under the slope so it is not a floating sheet from the side.
    ctx.solid.box(w, r.h * 0.5, run * 0.5, cx, Y0 + r.h * 0.25, oz + r.z1 - up * run * 0.25, std(0x17703e, 0.95));
  } else {
    const shape = new THREE.Shape();
    h.outline.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    ctx.ground.add(g, felt, ox, FELT, oz);
  }
  for (const [x0, z0, x1, z1] of h.sand ?? []) ctx.ground.flat(x1 - x0, z1 - z0, ox + (x0 + x1) / 2, FELT + 0.006, oz + (z0 + z1) / 2, sandMat());

  // Kerbs round the felt, brick for what stands on it. The pyramid hides its own four walls.
  const edge = h.outline.length;
  wallsOf(h).forEach(([x0, z0, x1, z1], i) => {
    if (h.theme === "pyramid" && i >= edge) return;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const top = Math.max(feltHeight(h, z0), feltHeight(h, z1)) + 0.15;
    const inner = i >= edge;
    ctx.solid.box(len + 0.1, inner ? 0.2 : top, 0.1, ox + (x0 + x1) / 2, Y0 + (inner ? 0.1 : top / 2) + (inner ? feltHeight(h, (z0 + z1) / 2) : 0), oz + (z0 + z1) / 2, inner ? brick : kerb, Math.atan2(-(z1 - z0), x1 - x0));
  });
  (h.posts ?? []).forEach(([x, z, r], i) => {
    ctx.solid.cyl(r, r, 0.42, ox + x, Y0 + 0.21, oz + z, emissiveMat(ctx, POST_COLORS[i % 4]!, 0.5, 2.4), 16);
    ctx.solid.cyl(r + 0.03, r + 0.03, 0.05, ox + x, Y0 + 0.45, oz + z, MAT.chrome(), 16);
  });

  // Tee mat, the cup, and a flag with the hole's number.
  const cy = feltHeight(h, h.cup[1]);
  ctx.ground.flat(0.5, 0.3, ox + h.tee[0], FELT + 0.004, oz + h.tee[1], std(0x14171a, 0.9));
  const disc = new THREE.CircleGeometry(CUP_R, 20);
  disc.rotateX(-Math.PI / 2);
  ctx.flat.add(disc, once("cup", () => new THREE.MeshBasicMaterial({ color: 0x050505 })), ox + h.cup[0], FELT + cy + (h.ramp ? 0.03 : 0.008), oz + h.cup[1]);
  const way = playDir(h);
  const fx = ox + h.cup[0] + 0.02;
  const fz = oz + h.cup[1] + way * 0.16;
  ctx.solid.cyl(0.012, 0.012, 1.5, fx, Y0 + cy + 0.75, fz, MAT.white(), 5);
  const flag = sign(String(n), "#ffffff", "#d8322a", { w: 96, h: 64 });
  ctx.flat.wall(0.36, 0.24, fx + 0.19, Y0 + cy + 1.36, fz, flag);
  ctx.flat.wall(0.36, 0.24, fx + 0.19, Y0 + cy + 1.36, fz, flag, Math.PI);
  // Its name and par on a post beside the tee.
  const side = Math.max(...h.outline.map((p) => p[0])) + 0.5;
  const px = ox + (h.tee[0] > 0.5 ? side : Math.min(...h.outline.map((p) => p[0])) - 0.5);
  const pz = oz + h.tee[1] - way * 0.2;
  ctx.solid.cyl(0.03, 0.03, 1, px, Y0 + 0.5, pz, MAT.black(), 5);
  const board = sign(`${n}  ${h.name.toUpperCase()}`, "#f3e9c8", "#14331f", { sub: `PAR ${h.par}`, w: 512, h: 160 });
  ctx.flat.wall(1.1, 0.36, px, Y0 + 1.1, pz + 0.03, board);
  ctx.flat.wall(1.1, 0.36, px, Y0 + 1.1, pz - 0.03, board, Math.PI);

  dress(ctx, h, ox, oz);
}

const sandMat = () => once("sand", () => {
  const m = new THREE.MeshStandardMaterial({ color: 0xe3cf9a, roughness: 1 });
  m.polygonOffset = true;
  m.polygonOffsetFactor = -3;
  m.polygonOffsetUnits = -3;
  return m;
});

/** What makes each hole itself. */
function dress(ctx: BuildCtx, h: Hole, ox: number, oz0: number) {
  const gold = MAT.gold();
  // The holes are written as if played north. One played south has everything the other side of its middle.
  const way = playDir(h);
  const oz = oz0;
  const at = (z: number) => oz0 + -way * z;
  if (h.theme === "pyramid") {
    // Glass and steel, like the one across the river, with a lit tip.
    const body = new THREE.ConeGeometry(1.15, 1.35, 4);
    ctx.solid.add(body, std(0x5f6f82, 0.25, 0.75), ox, Y0 + 0.675, at(-0.6));
    ctx.solid.add(new THREE.ConeGeometry(0.2, 0.24, 4), emissiveMat(ctx, 0xbfe0ff, 0.6, 2.6), ox, Y0 + 1.36, at(-0.6));
  } else if (h.theme === "bridge") {
    // Two arches side by side over the lane: the M.
    const blue = emissiveMat(ctx, 0x5ac8ff, 0.5, 2.6);
    for (const side of [-1, 1]) {
      const arch = new THREE.TorusGeometry(0.8, 0.045, 6, 20, Math.PI);
      ctx.solid.add(arch, blue, ox + side * 0.8, Y0 + 0.5, at(-0.4));
    }
    ctx.solid.box(3.4, 0.07, 0.5, ox, Y0 + 0.5, at(-0.4), std(0x2a2d31, 0.5, 0.6));
    for (const x of [-0.62, 0.62]) ctx.solid.box(0.34, 0.5, 0.7, ox + x, Y0 + 0.25, at(-0.4), std(0x8c8983, 0.9));
    for (const x of [-1.66, 1.66]) ctx.solid.box(0.12, 0.5, 0.7, ox + x, Y0 + 0.25, at(-0.4), std(0x8c8983, 0.9));
  } else if (h.theme === "wheel") {
    // The frame the paddle wheel turns in. The wheel itself is put up by the game, so it can turn.
    const red = std(0xb5262a, 0.6);
    for (const x of [-0.62, 0.62]) {
      ctx.solid.box(0.12, 1.5, 0.12, ox + x, Y0 + 0.75, at(-0.8), red);
      ctx.solid.box(0.3, 0.12, 0.3, ox + x, Y0 + 0.06, at(-0.8), MAT.black());
    }
    ctx.solid.box(1.5, 0.1, 0.16, ox, Y0 + 1.5, at(-0.8), red);
  } else if (h.theme === "bag") {
    // The sack itself, beside the cup, with the sign on the side the putt comes from.
    const bx = ox - 2.45;
    const bz = at(-3.3);
    const body = new THREE.SphereGeometry(0.62, 16, 12);
    body.scale(1, 1.05, 0.92);
    ctx.solid.add(body, gold, bx, Y0 + 0.62, bz);
    ctx.solid.cyl(0.17, 0.28, 0.3, bx, Y0 + 1.33, bz, gold, 12);
    ctx.solid.add(new THREE.TorusGeometry(0.23, 0.035, 6, 16), MAT.wood(), bx, Y0 + 1.2, bz, 0, Math.PI / 2);
    ctx.flat.wall(0.6, 0.6, bx, Y0 + 0.66, bz - way * 0.585, neon(ctx, "$", "#39ff14", { w: 128, h: 128, border: false }), way > 0 ? Math.PI : 0);
    addSolid(ctx, bx - 0.5, bx + 0.5, bz - 0.5, bz + 0.5);
  } else if (h.theme === "dogleg") {
    // An arrow on the corner wall says where the hole went.
    const arrow = neon(ctx, "→", "#ffd23a", { w: 128, h: 128, border: false });
    ctx.flat.wall(0.7, 0.7, ox + 0.2, Y0 + 0.95, oz - 4.3, arrow);
    ctx.solid.box(0.9, 0.9, 0.08, ox + 0.2, Y0 + 0.95, oz - 4.36, MAT.black());
    ctx.solid.cyl(0.04, 0.04, 0.6, ox + 0.2, Y0 + 0.3, oz - 4.36, MAT.black(), 5);
  }
}

// ------------------------------------------------------------------ tennis and cornhole

function buildCourts(ctx: BuildCtx) {
  const L = COURTS_LOT;
  const T = TENNIS;
  const { minX: x0, maxX: x1, minZ: z0, maxZ: z1 } = TENNIS_FENCE;
  const lenX = x1 - x0;
  const lenZ = z1 - z0;

  // The court: blue inside the lines, green outside, painted to scale.
  const PX = 32;
  const cw = Math.round(lenX * PX);
  const ch = Math.round(lenZ * PX);
  const courtTex = tex(
    cw,
    ch,
    (g) => {
      g.fillStyle = "#2f7d52";
      g.fillRect(0, 0, cw, ch);
      const mx = (T.cx - x0) * PX;
      const mz = ch / 2;
      const doubles = T.wide + T.alley;
      g.fillStyle = "#2a5ea8";
      g.fillRect(mx - T.half * PX, mz - doubles * PX, T.half * 2 * PX, doubles * 2 * PX);
      g.strokeStyle = "#f6f4ee";
      g.lineWidth = 3;
      g.strokeRect(mx - T.half * PX, mz - doubles * PX, T.half * 2 * PX, doubles * 2 * PX);
      const line = (ax: number, az: number, bx: number, bz: number) => {
        g.beginPath();
        g.moveTo(mx + ax * PX, mz + az * PX);
        g.lineTo(mx + bx * PX, mz + bz * PX);
        g.stroke();
      };
      line(-T.half, -T.wide, T.half, -T.wide);
      line(-T.half, T.wide, T.half, T.wide);
      line(-T.service, -T.wide, -T.service, T.wide);
      line(T.service, -T.wide, T.service, T.wide);
      line(-T.service, 0, T.service, 0);
      line(-T.half, 0, -T.half + 0.3, 0);
      line(T.half, 0, T.half - 0.3, 0);
      // The brand, small, behind each baseline.
      g.fillStyle = "rgba(246,244,238,0.5)";
      g.font = "900 34px Impact, 'Arial Black', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (const s of [-1, 1]) {
        g.save();
        g.translate(mx + s * (T.half + (s < 0 ? T.backWest * 0.72 : T.backEast * 0.55)) * PX, mz);
        g.rotate((s * Math.PI) / 2);
        g.fillText("$ACKRELIGIOUS", 0, 0);
        g.restore();
      }
    },
    { repeat: false, aniso: 8 },
  );
  const court = new THREE.MeshStandardMaterial({ map: courtTex, roughness: 0.82 });
  court.polygonOffset = true;
  court.polygonOffsetFactor = -2;
  court.polygonOffsetUnits = -2;
  ctx.ground.flat(lenX, lenZ, (x0 + x1) / 2, Y0 + 0.02, T.cz, court);

  // The net: two posts, the mesh and a white tape along the top.
  const netTex = tex(
    64,
    64,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = "rgba(20,20,22,0.9)";
      g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        g.beginPath();
        g.moveTo((i * w) / 4, 0);
        g.lineTo((i * w) / 4, h);
        g.moveTo(0, (i * h) / 4);
        g.lineTo(w, (i * h) / 4);
        g.stroke();
      }
    },
    { aniso: 4 },
  );
  const netW = (T.wide + T.alley + 0.9) * 2;
  netTex.repeat.set(netW * 3, T.net * 3);
  const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 });
  ctx.flat.wall(netW, T.net, T.cx, Y0 + T.net / 2 + 0.02, T.cz, netMat, Math.PI / 2);
  ctx.solid.box(0.05, 0.06, netW, T.cx, Y0 + T.net + 0.02, T.cz, MAT.white());
  for (const s of [-1, 1]) ctx.solid.cyl(0.05, 0.05, T.net + 0.14, T.cx, Y0 + (T.net + 0.14) / 2, T.cz + (s * netW) / 2, MAT.black(), 8);

  // Chain link all the way round, with a gate at the south-west corner.
  const link = tex(
    32,
    32,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = "rgba(170,176,184,0.95)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, h);
      g.moveTo(w, 0);
      g.lineTo(0, h);
      g.stroke();
    },
    { aniso: 4 },
  );
  const FH = 3.2;
  const fence = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const t = link.clone();
    t.needsUpdate = true;
    t.repeat.set(len * 2.2, FH * 2.2);
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, alphaTest: 0.35 });
    ctx.flat.wall(len, FH, (ax + bx) / 2, Y0 + FH / 2, (az + bz) / 2, m, Math.atan2(bx - ax, bz - az) + Math.PI / 2);
    ctx.solid.box(len, 0.05, 0.05, (ax + bx) / 2, Y0 + FH, (az + bz) / 2, MAT.steel(), Math.atan2(-(bz - az), bx - ax));
    const posts = Math.max(1, Math.round(len / 4));
    for (let i = 0; i <= posts; i++) ctx.solid.cyl(0.04, 0.04, FH, ax + ((bx - ax) * i) / posts, Y0 + FH / 2, az + ((bz - az) * i) / posts, MAT.steel(), 6);
    addSolid(ctx, Math.min(ax, bx) - 0.08, Math.max(ax, bx) + 0.08, Math.min(az, bz) - 0.08, Math.max(az, bz) + 0.08);
  };
  fence(x0, z0, x1, z0);
  fence(x1, z0, x1, z1);
  fence(x0, z1, x1, z1);
  fence(x0, z0, x0, z1);
  // The gate: a green frame in the west fence, where Benji signs up.
  const gz = TENNIS_GATE.z - 1.6;
  const green = std(0x1d6b3a, 0.6);
  for (const dz of [-0.75, 0.75]) ctx.solid.box(0.1, 2.3, 0.1, x0 - 0.04, Y0 + 1.15, gz + dz, green);
  ctx.solid.box(0.1, 0.1, 1.6, x0 - 0.04, Y0 + 2.3, gz, green);

  // Four light towers.
  for (const [lx, lz] of [
    [x0 + 0.6, z0 + 0.6],
    [x1 - 0.6, z0 + 0.6],
    [x0 + 0.6, z1 - 0.6],
    [x1 - 0.6, z1 - 0.6],
  ] as const) {
    ctx.solid.cyl(0.09, 0.14, 8.5, lx, Y0 + 4.25, lz, MAT.steel(), 8);
    const inward = Math.atan2(T.cx - lx, T.cz - lz);
    ctx.solid.box(1.5, 0.5, 0.2, lx + Math.sin(inward) * 0.2, Y0 + 8.5, lz + Math.cos(inward) * 0.2, MAT.black(), inward);
    ctx.solid.box(1.3, 0.34, 0.06, lx + Math.sin(inward) * 0.32, Y0 + 8.5, lz + Math.cos(inward) * 0.32, emissiveMat(ctx, 0xfff4d6, 0.25, 3), inward);
    ctx.lamps.push({ x: lx, y: Y0 + 8.4, z: lz, color: 0xfff4d6 });
  }
  // The umpire's chair, a bench each side, and the name over the gate side.
  const ux = T.cx;
  const uz = T.cz + T.wide + T.alley + 1.5;
  for (const [dx, dz] of [
    [-0.35, -0.3],
    [0.35, -0.3],
    [-0.35, 0.3],
    [0.35, 0.3],
  ] as const)
    ctx.solid.cyl(0.03, 0.03, 1.7, ux + dx, Y0 + 0.85, uz + dz, MAT.white(), 5);
  ctx.solid.box(0.8, 0.06, 0.7, ux, Y0 + 1.7, uz, green);
  ctx.solid.box(0.8, 0.7, 0.06, ux, Y0 + 2.05, uz + 0.34, green);
  bench(ctx, T.cx - 4, uz + 0.2, Math.PI, Y0);
  bench(ctx, T.cx + 4, uz + 0.2, Math.PI, Y0);
  const name = neon(ctx, "PARK AVENUE COURTS", "#39ff14", { w: 1024, h: 128 });
  ctx.flat.wall(8, 1, T.cx, Y0 + FH + 0.75, z1 + 0.06, name);
  ctx.solid.box(8.2, 1.1, 0.08, T.cx, Y0 + FH + 0.75, z1, MAT.black());
  for (const dx of [-3.8, 3.8]) ctx.solid.cyl(0.05, 0.05, 1.3, T.cx + dx, Y0 + FH + 0.5, z1, MAT.steel(), 6);

  cornhole(ctx);

  // The way in from Park Avenue, hedges on the street side, and shade.
  strip(ctx, 16.6, 19.4, 99.4, L.maxZ);
  strip(ctx, 11.2, 16.6, 103.6, 105.4);
  hedge(ctx, L.minX + 0.8, L.minZ + 1.6, L.minX + 0.8, L.maxZ - 0.8);
  hedge(ctx, L.minX + 0.8, L.maxZ - 0.8, 15.6, L.maxZ - 0.8);
  hedge(ctx, 20.4, L.maxZ - 0.8, L.maxX - 0.8, L.maxZ - 0.8);
  hedge(ctx, L.maxX - 0.8, L.minZ + 1.6, L.maxX - 0.8, L.maxZ - 0.8);
  globeLamp(ctx, 17.4, 98.6, Y0, 0xfff0c8);
  globeLamp(ctx, 11, 97.4, Y0, 0xfff0c8);
  globeLamp(ctx, 17.4, 89.4, Y0, 0xfff0c8);
  tree(ctx, 11.2, 87.6, 1.2, Y0, false);
  tree(ctx, 18.6, 86.9, 1, Y0, false);
  trashCan(ctx, 16.2, 105.9, Y0);
}

/** Two boards on the lawn, a bench to watch from and a board that says what the game is to. */
function cornhole(ctx: BuildCtx) {
  const C = CORNHOLE;
  const deck = once(
    "cornhole",
    () =>
      new THREE.MeshStandardMaterial({
        map: tex(
          128,
          256,
          (g, w, h) => {
            g.fillStyle = "#f1e6cb";
            g.fillRect(0, 0, w, h);
            g.fillStyle = "#1d6b3a";
            g.beginPath();
            g.moveTo(0, h);
            g.lineTo(w / 2, h * 0.42);
            g.lineTo(w, h);
            g.fill();
            g.fillStyle = "#d8a93a";
            g.beginPath();
            g.moveTo(w * 0.2, h);
            g.lineTo(w / 2, h * 0.6);
            g.lineTo(w * 0.8, h);
            g.fill();
            g.strokeStyle = "#1d6b3a";
            g.lineWidth = 6;
            g.strokeRect(3, 3, w - 6, h - 6);
          },
          { repeat: false },
        ),
        roughness: 0.55,
      }),
  );
  const tilt = Math.atan2(C.rear - C.front, C.len);
  const top = (C.front + C.rear) / 2;
  const hole = once("cornhole-hole", () => new THREE.MeshBasicMaterial({ color: 0x050505 }));
  // `dir` is the way the board climbs: north for the one thrown at, south for the one thrown from.
  for (const [frontZ, dir] of [
    [C.farZ, -1],
    [C.nearZ, 1],
  ] as const) {
    const mid = frontZ + (dir * C.len) / 2;
    const slab = new THREE.BoxGeometry(C.wide, 0.03, C.len);
    // The texture's top is the back of the board.
    ctx.solid.add(slab, deck, C.x, Y0 + top, mid, dir < 0 ? 0 : Math.PI, tilt);
    const rim = new THREE.CircleGeometry(C.holeR, 20);
    rim.rotateX(-Math.PI / 2);
    const hz = frontZ + dir * C.holeV;
    ctx.flat.add(rim, hole, C.x, Y0 + C.front + ((C.rear - C.front) * C.holeV) / C.len + 0.022, hz, dir < 0 ? 0 : Math.PI, tilt);
    for (const s of [-1, 1]) ctx.solid.box(0.04, C.rear - 0.02, 0.04, C.x + s * (C.wide / 2 - 0.04), Y0 + (C.rear - 0.02) / 2, frontZ + dir * (C.len - 0.05), MAT.wood());
    ctx.solid.box(C.wide, C.front, 0.03, C.x, Y0 + C.front / 2, frontZ + dir * 0.015, MAT.wood());
  }
  bench(ctx, C.x - 3.2, (C.farZ + C.nearZ) / 2, Math.PI / 2, Y0);
  const board = sign("CORNHOLE", "#f3e9c8", "#14331f", { sub: "FIRST TO 21", w: 512, h: 192 });
  ctx.solid.cyl(0.035, 0.035, 1.5, C.x + 2.6, Y0 + 0.75, C.nearZ + 1.2, MAT.black(), 5);
  ctx.flat.wall(1.2, 0.45, C.x + 2.6, Y0 + 1.5, C.nearZ + 1.23, board);
  ctx.flat.wall(1.2, 0.45, C.x + 2.6, Y0 + 1.5, C.nearZ + 1.17, board, Math.PI);
  // A string of bulbs down the lane, pole to pole.
  const bulb = emissiveMat(ctx, 0xffe2a8, 0.4, 2.6);
  for (const z of [C.farZ - 2.4, C.nearZ + 2.6]) ctx.solid.cyl(0.04, 0.05, 3.1, C.x + 1.9, Y0 + 1.55, z, MAT.black(), 6);
  const z0 = C.farZ - 2.4;
  const z1 = C.nearZ + 2.6;
  for (let i = 1; i < 12; i++) {
    const k = i / 12;
    ctx.solid.add(new THREE.SphereGeometry(0.06, 6, 5), bulb, C.x + 1.9, Y0 + 3.05 - Math.sin(k * Math.PI) * 0.45, z0 + (z1 - z0) * k);
  }
}
