import * as THREE from "three";
import { tex } from "../gfx/tex";
import { CABINETS, type Cabinet } from "../play/goods";
import { Frame, MAT, YAW, addSolid, emissiveMat, makeCtx, neon, poolMat, sign, std, type BuildCtx } from "./kit";
import { CURB, FUN, KART_TRACK, ROOM, type Rect } from "./map";
import { finish, light, shell, type Room } from "./rooms";

const Y0 = CURB;
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
const hot = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

/** Speed pads, as a share of the way round the lap. */
export const KART_PADS = [0.2, 0.52, 0.8];

// ------------------------------------------------------------------ kart line

const KR = KART_TRACK.halfZ;
const KS = KART_TRACK.halfX - KART_TRACK.halfZ;
/** Lap length along the centreline. */
export const KART_LENGTH = 4 * KS + 2 * Math.PI * KR;

/**
 * Point on the kart oval `s` metres round from the start of the north straight, `off` metres
 * outside the centreline. Runs east, then round to the south side and back.
 */
export function kartAt(s: number, off = 0) {
  const L = KART_LENGTH;
  let t = ((s % L) + L) % L;
  const r = KR + off;
  const { cx, cz } = KART_TRACK;
  if (t < 2 * KS) return { x: cx - KS + t, z: cz - r, heading: Math.PI / 2 };
  t -= 2 * KS;
  if (t < Math.PI * KR) {
    const a = -Math.PI / 2 + t / KR;
    return { x: cx + KS + r * Math.cos(a), z: cz + r * Math.sin(a), heading: Math.atan2(-Math.sin(a), Math.cos(a)) };
  }
  t -= Math.PI * KR;
  if (t < 2 * KS) return { x: cx + KS - t, z: cz + r, heading: -Math.PI / 2 };
  t -= 2 * KS;
  const a = Math.PI / 2 + t / KR;
  return { x: cx - KS + r * Math.cos(a), z: cz + r * Math.sin(a), heading: Math.atan2(-Math.sin(a), Math.cos(a)) };
}

/** Where a point sits against the oval: distance round, distance outside the centreline, outward normal. */
export function kartNearest(x: number, z: number) {
  const lx = x - KART_TRACK.cx;
  const lz = z - KART_TRACK.cz;
  if (Math.abs(lx) <= KS) {
    if (lz < 0) return { s: lx + KS, off: -lz - KR, nx: 0, nz: -1 };
    return { s: 2 * KS + Math.PI * KR + (KS - lx), off: lz - KR, nx: 0, nz: 1 };
  }
  if (lx > KS) {
    const dx = lx - KS;
    const d = Math.hypot(dx, lz) || 1e-4;
    return { s: 2 * KS + (Math.atan2(lz, dx) + Math.PI / 2) * KR, off: d - KR, nx: dx / d, nz: lz / d };
  }
  const dx = lx + KS;
  const d = Math.hypot(dx, lz) || 1e-4;
  let a = Math.atan2(lz, dx);
  if (a < 0) a += Math.PI * 2;
  return { s: 4 * KS + Math.PI * KR + (a - Math.PI / 2) * KR, off: d - KR, nx: dx / d, nz: lz / d };
}

function stadium(r: number) {
  const s = new THREE.Shape();
  s.moveTo(-KS, -r);
  s.lineTo(KS, -r);
  s.absarc(KS, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-KS, r);
  s.absarc(-KS, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}

// ------------------------------------------------------------------ outside

/** The hall on Lamar and the kart oval behind it. */
export function buildFunExterior(ctx: BuildCtx) {
  const W = FUN.maxX - FUN.minX;
  const D = FUN.maxZ - FUN.minZ;
  const H = 9;
  const cx = (FUN.minX + FUN.maxX) / 2;
  const f = new Frame(ctx, cx, FUN.minZ, YAW.north);
  f.box(W, H, D, 0, Y0 + H / 2, -D / 2, std(0x3a1d5c, 0.8));
  f.box(W + 0.5, 0.5, D + 0.5, 0, Y0 + H + 0.25, -D / 2, std(0x1a0c2c, 0.7));

  // Candy-stripe front.
  const cols = [0x6a2c9a, 0x1f9a94, 0xe8a81e, 0xc2307a];
  const n = 14;
  const pw = W / n;
  for (let i = 0; i < n; i++) {
    if (Math.abs(i - (n - 1) / 2) < 1) continue;
    f.box(pw - 0.14, H - 0.5, 0.3, -W / 2 + pw * (i + 0.5), Y0 + (H - 0.5) / 2, 0.1, std(cols[i % 4]!, 0.7));
  }
  const bulb = emissiveMat(ctx, 0xffe08a, 0.9, 3.4);
  for (let x = -W / 2 + 0.6; x < W / 2; x += 1.2) f.box(0.2, 0.2, 0.2, x, Y0 + H + 0.1, 0.3, bulb, ctx.flat);

  // The way in: gold columns, a pink arch, warm glass.
  f.box(pw * 2 + 0.2, 5.2, 0.24, 0, Y0 + 2.6, 0.08, std(0x140a20, 0.6));
  f.box(3.4, 3.3, 0.12, 0, Y0 + 1.65, 0.24, emissiveMat(ctx, 0xffc27a, 0.7, 2.2));
  f.box(0.1, 3.3, 0.16, 0, Y0 + 1.65, 0.28, MAT.gold());
  for (const s of [-1, 1]) {
    f.add(new THREE.CylinderGeometry(0.36, 0.42, 5, 12), std(0xe8a81e, 0.45, 0.3), s * 2.5, Y0 + 2.5, 0.8);
    f.solid(s * 2.5 - 0.4, s * 2.5 + 0.4, 0.4, 1.2);
  }
  f.add(new THREE.TorusGeometry(2.5, 0.36, 10, 22, Math.PI), std(0xc2307a, 0.45), 0, Y0 + 5, 0.8);
  f.wall(2.6, 0.6, 0, Y0 + 3.75, 0.34, sign("COME ON IN", "#ffd23a", "#140a20", { w: 384, h: 96 }), ctx.flat);

  // Marquee.
  f.box(23, 5, 0.5, 0, Y0 + H + 2.3, 0.2, std(0x12081e, 0.6));
  f.wall(22, 4.4, 0, Y0 + H + 2.3, 0.47, neon(ctx, "THE FUN HOUSE", "#ffd23a", { sub: "ARCADE · LASER TAG · GO-KARTS · PIZZA", w: 1024, h: 224 }), ctx.flat);
  for (let x = -11.2; x <= 11.2; x += 0.8) for (const y of [-0.05, 4.65]) f.box(0.16, 0.16, 0.16, x, Y0 + H + y, 0.5, bulb, ctx.flat);
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.95 : 2.2;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  f.add(new THREE.ExtrudeGeometry(star, { depth: 0.4, bevelEnabled: false }), emissiveMat(ctx, 0xffc83a, 0.7, 2.6), 0, Y0 + H + 6.7, 0);

  // Rooftop toys: a joystick and a slice.
  f.box(2.6, 0.9, 2.6, -15, Y0 + H + 0.95, -3, MAT.black());
  f.add(new THREE.CylinderGeometry(0.2, 0.2, 3, 10), MAT.chrome(), -15, Y0 + H + 2.9, -3, ctx.solid, 0, 0.18, 0.1);
  f.add(new THREE.SphereGeometry(0.8, 16, 12), emissiveMat(ctx, 0xff2a2a, 0.5, 1.6), -14.8, Y0 + H + 4.5, -2.7);
  const slice = new THREE.Shape();
  slice.moveTo(0, 0);
  slice.lineTo(1.9, 4.2);
  slice.lineTo(-1.9, 4.2);
  f.add(new THREE.ExtrudeGeometry(slice, { depth: 0.36, bevelEnabled: false }), std(0xf2c14a, 0.7), 15, Y0 + H + 0.6, -1);
  f.box(4, 0.5, 0.5, 15, Y0 + H + 4.9, -0.82, std(0xb8782a, 0.8));
  for (const [px, py] of [
    [0.5, 3.2],
    [-0.7, 3.5],
    [0, 2.1],
  ] as const) {
    f.add(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 14), std(0xb3261c, 0.6), 15 + px, Y0 + H + 0.6 + py, -0.6, ctx.solid, 0, Math.PI / 2);
  }

  // Signs either side of the door, light on the walk.
  f.wall(7.4, 1.5, -11.5, Y0 + 3.3, 0.3, neon(ctx, "ARCADE", "#ff5ad1", { w: 512, h: 112 }), ctx.flat);
  f.wall(7.4, 1.5, 11.5, Y0 + 3.3, 0.3, neon(ctx, "LASER TAG", "#39ff14", { w: 512, h: 112 }), ctx.flat);
  f.flat(12, 8, 0, Y0 + 0.02, 4, poolMat(ctx, 0xffc27a, 0.55), ctx.flat);
  f.flat(9, 6, -11.5, Y0 + 0.02, 3, poolMat(ctx, 0xff5ad1, 0.4), ctx.flat);
  f.flat(9, 6, 11.5, Y0 + 0.02, 3, poolMat(ctx, 0x39ff14, 0.34), ctx.flat);
  f.lamp(0, Y0 + 4.6, 2.4, 0xffc27a);
  f.lamp(-11.5, Y0 + 3.4, 1.6, 0xff5ad1);
  f.lamp(11.5, Y0 + 3.4, 1.6, 0x39ff14);
  f.solid(-W / 2, W / 2, -D, 0.3);

  buildKartTrack(ctx);
}

function buildKartTrack(ctx: BuildCtx) {
  const { cx, cz, width } = KART_TRACK;
  const y = Y0 + 0.014;
  const off = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  // Light asphalt with a glow of its own: this is a floodlit track, never a dark one.
  const road = new THREE.MeshStandardMaterial({ color: 0x5a5d66, roughness: 0.82, emissive: 0x30333a, emissiveIntensity: 0.32, ...off });
  const outer = stadium(KR + width / 2);
  outer.holes.push(stadium(KR - width / 2));
  const rg = new THREE.ShapeGeometry(outer, 20);
  rg.rotateX(-Math.PI / 2);
  ctx.ground.add(rg, road, cx, y, cz);
  const ig = new THREE.ShapeGeometry(stadium(KR - width / 2 - 0.35), 20);
  ig.rotateX(-Math.PI / 2);
  const infield = (MAT.grass() as THREE.MeshStandardMaterial).clone();
  Object.assign(infield, off);
  ctx.ground.add(ig, infield, cx, y, cz);

  // Kerbs inside, tyres outside.
  const red = new THREE.MeshStandardMaterial({ color: 0xd9302a, roughness: 0.7, emissive: 0xd9302a, emissiveIntensity: 0.35 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.7, emissive: 0xf4f1ea, emissiveIntensity: 0.4 });
  // Floodlight towers all the way round, bulbs strung over both straights, light on the tarmac.
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.3), toneMapped: false });
  const towers = 12;
  for (let i = 0; i < towers; i++) {
    const p = kartAt((i / towers) * KART_LENGTH + 2, width / 2 + 2.2);
    ctx.solid.cyl(0.1, 0.14, 7.2, p.x, y + 3.6, p.z, MAT.black(), 8);
    ctx.flat.box(1.3, 0.5, 0.3, p.x, y + 7.3, p.z, lampMat, p.heading);
    ctx.lamps.push({ x: p.x, y: y + 6.6, z: p.z, color: 0xfff2d8 });
  }
  for (let i = 0; i < 60; i++) {
    const p = kartAt((i / 60) * KART_LENGTH, 0);
    ctx.flat.add(new THREE.SphereGeometry(0.1, 6, 4), i % 3 === 0 ? lampMat : new THREE.MeshBasicMaterial({ color: i % 3 === 1 ? 0x39ff14 : 0xff5ad1, toneMapped: false }), p.x, y + 5.2 - Math.abs(Math.sin(i * 0.9)) * 0.5, p.z);
  }
  ctx.flat.flat((KS + KR + 7) * 2, (KR + 7) * 2, cx, y + 0.02, cz, poolMat(ctx, 0xfff2d8, 0.42));
  ctx.flat.flat((KS + KR + 7) * 2, (KR + 7) * 2, cx, y + 0.024, cz, new THREE.MeshBasicMaterial({ color: 0xfff2d8, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false }));
  // Speed pads: drive over the arrows.
  const arrow = new THREE.MeshBasicMaterial({
    map: tex(128, 128, (g, w, h) => {
      g.fillStyle = "#06140a";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#39ff14";
      for (const oy of [10, 62]) {
        g.beginPath();
        g.moveTo(w / 2, oy);
        g.lineTo(w - 12, oy + 40);
        g.lineTo(w - 40, oy + 40);
        g.lineTo(w / 2, oy + 22);
        g.lineTo(40, oy + 40);
        g.lineTo(12, oy + 40);
        g.closePath();
        g.fill();
      }
    }),
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  for (const pad of KART_PADS) {
    const p = kartAt(pad * KART_LENGTH, 0);
    ctx.flat.flat(2.6, 2.6, p.x, y + 0.012, p.z, arrow, p.heading + Math.PI);
  }
  const tyre = std(0x141416, 0.9);
  const inner = Math.floor((KART_LENGTH - Math.PI * width) / 0.9);
  for (let i = 0; i < inner; i++) {
    const p = kartAt((i / inner) * KART_LENGTH, -width / 2 - 0.16);
    ctx.solid.box(0.34, 0.07, 0.9 * ((KR - width / 2) / KR) + 0.1, p.x, y + 0.035, p.z, i % 2 ? red : white, p.heading);
  }
  const outerN = Math.floor((KART_LENGTH + Math.PI * width) / 1.05);
  for (let i = 0; i < outerN; i++) {
    const p = kartAt((i / outerN) * KART_LENGTH, width / 2 + 0.4);
    ctx.solid.cyl(0.4, 0.4, 0.5, p.x, y + 0.25, p.z, i % 5 === 0 ? red : i % 5 === 1 ? white : tyre, 10);
  }

  // Start line and gantry on the north straight.
  const check = new THREE.MeshBasicMaterial({
    map: tex(64, 64, (g, w, h) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        g.fillStyle = (i + j) % 2 ? "#111" : "#eee";
        g.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
    }),
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const sx = cx - KS + 3;
  const sz = cz - KR;
  ctx.flat.flat(1.1, width, sx, y + 0.004, sz, check, 0, 1.1);
  for (const s of [-1, 1]) ctx.solid.cyl(0.12, 0.12, 4.4, sx, y + 2.2, sz + s * (width / 2 + 0.25), MAT.black(), 8);
  ctx.solid.box(0.5, 0.9, width + 0.9, sx, y + 4.3, sz, MAT.black());
  ctx.flat.wall(width, 0.76, sx - 0.27, y + 4.3, sz, neon(ctx, "GO-KARTS", "#39ff14", { w: 512, h: 96 }), YAW.west);
  for (const [lx, lz] of [
    [-KS, -KR - 3.4],
    [KS, -KR - 3.4],
    [-KS, KR + 3.2],
    [KS, KR + 3.2],
  ] as const) {
    ctx.solid.cyl(0.1, 0.13, 7, cx + lx, Y0 + 3.5, cz + lz, MAT.black(), 8);
    ctx.solid.box(1.2, 0.4, 0.4, cx + lx, Y0 + 7.1, cz + lz, emissiveMat(ctx, 0xfff0d0, 0.3, 4));
    ctx.lamps.push({ x: cx + lx, y: Y0 + 6.4, z: cz + lz * 0.6, color: 0xfff0d0 });
  }
  ctx.flat.flat(40, 20, cx, y + 0.02, cz, poolMat(ctx, 0xffe6c0, 0.3));

  // Rail to the street; the whole oval is off limits on foot.
  const x0 = cx - KS - KR - width / 2 - 0.9;
  const x1 = cx + KS + KR + width / 2 + 0.9;
  const z1 = cz + KR + width / 2 + 0.75;
  ctx.solid.box(x1 - x0, 0.08, 0.08, cx, Y0 + 1.1, z1, MAT.steel());
  ctx.solid.box(x1 - x0, 0.08, 0.08, cx, Y0 + 0.6, z1, MAT.steel());
  for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 16) ctx.solid.box(0.1, 1.15, 0.1, x, Y0 + 0.57, z1, MAT.steel());
  addSolid(ctx, x0, x1, cz - KR - width / 2 - 0.7, z1);
}

/** Skee-Ball rings, in metres on the board: across from the middle, up from the bottom edge, radius, points. Smallest first. */
export const SKEE_HOLES = [
  { u: -0.29, v0: 1.14, r: 0.055, v: 100 },
  { u: 0.29, v0: 1.14, r: 0.055, v: 100 },
  { u: 0, v0: 1.16, r: 0.065, v: 50 },
  { u: 0, v0: 0.78, r: 0.085, v: 40 },
  { u: 0, v0: 0.72, r: 0.15, v: 30 },
  { u: 0, v0: 0.66, r: 0.22, v: 20 },
  { u: 0, v0: 0.6, r: 0.29, v: 10 },
];

// ------------------------------------------------------------------ the hall

export type FunRoom = Room & {
  cabinets: { id: string; x: number; z: number }[];
  pizza: { x: number; z: number };
  prizes: { x: number; z: number };
  pitEdge: { x: number; z: number };
  trampEdge: { x: number; z: number };
  laserDoor: { x: number; z: number };
  kartDoor: { x: number; z: number };
  /** The Whack-A-Mole table: centre, top surface, hole centres back row first. */
  whack: { x: number; z: number; top: number; holes: { x: number; z: number }[]; stand: { x: number; z: number } };
  /** The hoop-shot machine: where you stand and where the rim rests. */
  popshot: { x: number; z: number; hoop: { x: number; y: number; z: number } };
  /** The pinball table: the playfield mesh the game draws on, and where to stand. */
  pinball: { x: number; y: number; z: number; w: number; l: number; tilt: number; field: THREE.Mesh; stand: { x: number; z: number } };
  /** The Skee-Ball lane: roll surface, ramp and the tilted target board. */
  skee: { x: number; y: number; z0: number; zRamp: number; board: { y: number; z: number; w: number; l: number; tilt: number }; stand: { x: number; z: number } };
  /** Spin-N-Win: the wheel that turns, its wedges in order, and where to stand. */
  wheel: { x: number; y: number; z: number; disc: THREE.Mesh; wedges: number[]; stand: { x: number; z: number } };
  /** Air hockey: the middle of the table top, its half width and half length, and where each player stands. */
  hockey: { x: number; y: number; z: number; hw: number; hl: number; goal: number; stand: { x: number; z: number }; far: { x: number; z: number } };
  /** The midway stall: three tossing games side by side behind one counter. */
  midway: {
    /** Front edge of the counter, and the height of its top. */
    counterZ: number;
    top: number;
    /** The shelf the bottles stand on. */
    bottles: { x: number; y: number; z: number; stand: { x: number; z: number } };
    /** The middle clown's mouth, and how far apart the three are. */
    clowns: { x: number; y: number; z: number; gap: number; stand: { x: number; z: number } };
    /** The bean bag board: its front and back edges, its width, and how far up it the hole is (0..1). */
    bags: { x: number; z0: number; y0: number; z1: number; y1: number; w: number; hole: number; r: number; stand: { x: number; z: number } };
    keeper: { x: number; z: number };
  };
  /** Inside of the ball pit. */
  pit: Rect;
  tramp: { x: number; z: number; r: number; y: number };
};

function screenMat(c: Cabinet, n: number) {
  return new THREE.MeshBasicMaterial({
    toneMapped: false,
    map: tex(
      256,
      192,
      (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#07060c");
        grad.addColorStop(1, c.color);
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.5;
        for (let i = 0; i < 26; i++) {
          g.fillStyle = i % 2 ? c.accent : "#ffffff";
          g.fillRect(((i * 53 + n * 31) % w) | 0, ((i * 37 + n * 17) % h) | 0, 4, 4);
        }
        g.globalAlpha = 1;
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.fillRect(0, h * 0.3, w, h * 0.42);
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = c.accent;
        g.font = `900 ${c.tag.length > 6 ? 34 : 46}px Impact, 'Arial Black', sans-serif`;
        g.fillText(c.tag, w / 2, h * 0.47);
        g.fillStyle = "#ffffff";
        g.font = "700 15px 'Arial Black', sans-serif";
        g.fillText(c.link ? "REAL GAME · PRESS E" : "PRESS E TO PLAY", w / 2, h * 0.64);
        g.fillStyle = "rgba(0,0,0,0.16)";
        for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
      },
      { repeat: false },
    ),
  });
}

/** One big room: cabinets along the back, pizza and prizes east, the pit and trampolines west. */
export function buildFunRoom(): FunRoom {
  const group = new THREE.Group();
  const ctx = makeCtx(909);
  const C = ROOM.fun;
  const W = 40;
  const D = 26;
  const H = 6.2;
  const carpet = new THREE.MeshStandardMaterial({
    map: tex(128, 128, (g, w, h) => {
      g.fillStyle = "#1c0f38";
      g.fillRect(0, 0, w, h);
      const cs = ["#ff5ad1", "#35e0d0", "#ffd23a", "#39ff14", "#ff8a1e"];
      for (let i = 0; i < 46; i++) {
        g.strokeStyle = cs[i % 5]!;
        g.globalAlpha = 0.6;
        g.lineWidth = 2;
        g.beginPath();
        const x = (i * 41) % w;
        const y = (i * 67) % h;
        if (i % 3 === 0) g.arc(x, y, 4 + (i % 4), 0, Math.PI * 2);
        else {
          g.moveTo(x, y);
          g.lineTo(x + 8 - (i % 5) * 3, y + 6);
          g.lineTo(x + 2, y + 12);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    }),
    roughness: 1,
  });
  shell(ctx, C.x, C.z, W, D, H, carpet, std(0x26124a, 0.9), std(0x08060f, 0.95), 3.2);
  const lights: THREE.PointLight[] = [];
  const f = new Frame(ctx, C.x, C.z, YAW.south);
  const pink = hot(2.4, 0.5, 1.9);
  const teal = hot(0.3, 2.2, 2.0);
  const yellow = hot(2.4, 1.9, 0.4);
  const green = hot(0.3, 2.4, 0.2);

  // Arcade row.
  const cabinets: FunRoom["cabinets"] = [];
  const cabZ = -D / 2 + 0.75;
  let whack: FunRoom["whack"] = { x: C.x, z: C.z, top: 0.9, holes: [], stand: { x: C.x, z: C.z } };
  let popshot: FunRoom["popshot"] = { x: C.x, z: C.z, hoop: { x: C.x, y: 2, z: C.z } };
  CABINETS.forEach((c, i) => {
    // The row sits clear of the ball pit on one side and the laser tag door on the other.
    const lx = (i - (CABINETS.length - 1) / 2) * 2.5 + 2;
    if (c.id === "whack") {
      // A real table: felt top, nine holes, a lit back panel.
      const tz = cabZ + 0.5;
      const top = 0.9;
      const trim = std(0xffd23a, 0.5);
      f.box(2, 0.86, 1.3, lx, 0.43, tz, std(0x5a1f7a, 0.6));
      f.box(2.06, 0.06, 1.36, lx, top - 0.03, tz, std(0x1f7a3a, 0.9));
      f.box(2.1, 0.1, 0.08, lx, top + 0.02, tz + 0.68, trim);
      for (const sd of [-1, 1]) f.box(0.08, 0.1, 1.36, lx + sd * 1.03, top + 0.02, tz, trim);
      f.box(2, 1.5, 0.16, lx, 1.65, cabZ - 0.3, std(0x3a1260, 0.6));
      f.wall(1.9, 0.5, lx, 2.05, cabZ - 0.21, neon(ctx, "WHACK-A-MOLE", "#ff5ad1", { w: 640, h: 160 }), ctx.flat);
      f.wall(1.5, 0.3, lx, 1.5, cabZ - 0.21, sign("HIT THE MOLES · WIN TICKETS", "#ffd23a", "#1a0a2e", { w: 512, h: 96 }), ctx.flat);
      const hole = new THREE.MeshBasicMaterial({ color: 0x050505 });
      const holes: { x: number; z: number }[] = [];
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 3; k++) {
          const hx = lx + (k - 1) * 0.58;
          const hz = tz + (r - 1) * 0.38;
          f.add(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 18), hole, hx, top + 0.006, hz, ctx.flat);
          f.add(new THREE.TorusGeometry(0.165, 0.02, 6, 18), trim, hx, top + 0.005, hz, ctx.solid, 0, Math.PI / 2);
          holes.push({ x: C.x + hx, z: C.z + hz });
        }
      }
      f.solid(lx - 1.05, lx + 1.05, cabZ - 0.45, tz + 0.72);
      f.flat(2.4, 1.8, lx, 0.02, tz + 1.6, poolMat(ctx, 0xff5ad1, 0.5), ctx.flat);
      whack = { x: C.x + lx, z: C.z + tz, top, holes, stand: { x: C.x + lx, z: C.z + tz + 1.5 } };
      cabinets.push({ id: c.id, x: C.x + lx, z: C.z + tz + 1.35 });
      return;
    }
    if (c.id === "hoopfever") {
      // Hoop-shot cage: ramp, glass, a rim that slides.
      const back = cabZ - 0.35;
      const steel = MAT.steel();
      f.box(1.3, 0.9, 2, lx, 0.45, back + 1, std(0x7a2a10, 0.6));
      f.add(new THREE.BoxGeometry(1.2, 0.06, 2.05), std(0x1a1a22, 0.6), lx, 1.08, back + 1, ctx.solid, 0, 0.16);
      for (const sd of [-1, 1]) {
        for (const pz of [0.05, 1.95]) f.box(0.06, 2.9, 0.06, lx + sd * 0.62, 1.45, back + pz, steel);
        f.box(0.06, 0.06, 1.96, lx + sd * 0.62, 2.9, back + 1, steel);
        f.wall(1.9, 1.7, lx + sd * 0.62, 2, back + 1, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }), ctx.flat, Math.PI / 2);
      }
      f.box(0.98, 0.64, 0.04, lx, 2.22, back + 0.12, std(0xf4f1ea, 0.3));
      f.box(0.34, 0.26, 0.02, lx, 2.1, back + 0.145, std(0xff5a1e, 0.5));
      f.box(0.28, 0.2, 0.022, lx, 2.1, back + 0.146, std(0xf4f1ea, 0.3));
      f.wall(1.3, 0.42, lx, 2.98, back + 0.1, neon(ctx, "HOOP FEVER", "#ff8a1e", { w: 512, h: 144 }), ctx.flat);
      for (let b = 0; b < 3; b++) f.add(new THREE.SphereGeometry(0.11, 12, 10), std(0xd0642a, 0.7), lx - 0.3 + b * 0.3, 1.06, back + 1.85);
      f.solid(lx - 0.7, lx + 0.7, back - 0.1, back + 2.05);
      f.flat(1.8, 1.8, lx, 0.02, back + 2.9, poolMat(ctx, 0xff8a1e, 0.5), ctx.flat);
      popshot = { x: C.x + lx, z: C.z + back + 2.7, hoop: { x: C.x + lx, y: 1.98, z: C.z + back + 0.42 } };
      cabinets.push({ id: c.id, x: C.x + lx, z: C.z + back + 2.75 });
      return;
    }
    const side = std(new THREE.Color(c.color).multiplyScalar(0.55).getHex(), 0.5);
    f.box(1.1, 2.05, 0.9, lx, 1.02, cabZ, std(0x121018, 0.5));
    for (const s of [-1, 1]) f.box(0.05, 2, 0.88, lx + s * 0.57, 1, cabZ, side);
    f.wall(0.88, 0.66, lx, 1.43, cabZ + 0.46, screenMat(c, i), ctx.flat);
    f.wall(1.04, 0.3, lx, 1.99, cabZ + 0.47, neon(ctx, c.tag, c.color, { w: 256, h: 72 }), ctx.flat);
    f.box(1.1, 0.12, 0.42, lx, 0.96, cabZ + 0.62, std(0x1c1826, 0.4));
    f.add(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), MAT.chrome(), lx - 0.25, 1.1, cabZ + 0.62);
    f.add(new THREE.SphereGeometry(0.05, 10, 8), std(0xd02a2a, 0.3), lx - 0.25, 1.2, cabZ + 0.62);
    for (let b = 0; b < 3; b++) f.add(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), b === 0 ? yellow : b === 1 ? teal : pink, lx + 0.08 + b * 0.14, 1.04, cabZ + 0.62, ctx.flat);
    if (c.link) {
      f.wall(1.06, 0.22, lx, 2.28, cabZ + 0.47, sign("FULL GAME ON ITCH.IO", "#140a20", "#ffd23a", { w: 384, h: 80 }), ctx.flat);
      f.box(1.2, 0.05, 0.05, lx, 2.42, cabZ + 0.46, yellow, ctx.flat);
    }
    f.solid(lx - 0.6, lx + 0.6, cabZ - 0.5, cabZ + 0.84);
    f.flat(1.8, 1.8, lx, 0.02, cabZ + 1.6, poolMat(ctx, new THREE.Color(c.color).getHex(), 0.5), ctx.flat);
    cabinets.push({ id: c.id, x: C.x + lx, z: C.z + cabZ + 1.55 });
  });
  f.wall(15, 1.5, 0, 4.5, -D / 2 + 0.06, neon(ctx, "ARCADE", "#ff5ad1", { sub: "WIN TICKETS · WIN PRIZES", w: 896, h: 144 }), ctx.flat);
  light(group, lights, C.x, 3.2, C.z + cabZ + 2.6, 0xff7ae0, 30, 16);

  // Pizza, east wall north half.
  const ex = W / 2;
  f.box(1.1, 1.1, 6, ex - 2.3, 0.55, -6, std(0x7a1f1f, 0.6));
  f.box(1.3, 0.07, 6.2, ex - 2.3, 1.13, -6, std(0xeeeae2, 0.35));
  f.box(1.2, 2.3, 2.6, ex - 0.7, 1.15, -6, MAT.brick("#7c3d2f", 4));
  f.box(0.1, 0.7, 1.3, ex - 1.32, 1.3, -6, hot(2.6, 1.1, 0.25), ctx.flat);
  // Real pies: crust, sauce, cheese, pepperoni.
  const crust = std(0xd9a352, 0.8);
  const sauce = std(0xb8321e, 0.7);
  const cheese = std(0xf2cf62, 0.6);
  const roni = std(0x9c2418, 0.6);
  const pie = (lx: number, y: number, lz: number, r: number) => {
    f.add(new THREE.CylinderGeometry(r, r, 0.035, 22), crust, lx, y, lz);
    f.add(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.04, 22), sauce, lx, y + 0.002, lz);
    f.add(new THREE.CylinderGeometry(r * 0.84, r * 0.84, 0.045, 22), cheese, lx, y + 0.004, lz);
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + lx;
      const d = k === 0 ? 0 : r * 0.55;
      f.add(new THREE.CylinderGeometry(r * 0.13, r * 0.13, 0.05, 10), roni, lx + Math.cos(a) * d, y + 0.006, lz + Math.sin(a) * d);
    }
  };
  for (const pz of [-8, -6.9, -5.8, -4.2]) pie(ex - 2.3, 1.19, pz, 0.42);
  f.box(0.5, 0.4, 0.5, ex - 2.3, 1.36, -3.4, std(0xeeeae2, 0.8));
  f.box(0.52, 0.03, 0.52, ex - 2.3, 1.57, -3.4, std(0xc8402c, 0.7));
  f.wall(2.6, 1.3, ex - 0.06, 2.4, -3.1, sign("SLICE $6 · PIE $18", "#ffd23a", "#3a0a08", { sub: "NACHOS $8 · SLUSH $4", w: 512, h: 256 }), ctx.flat, YAW.west);
  f.wall(5, 1.5, ex - 0.06, 4.3, -6, neon(ctx, "PIZZA", "#ff3b3b", { sub: "HOT · BY THE SLICE", w: 512, h: 144 }), ctx.flat, YAW.west);
  f.solid(ex - 2.9, ex, -9.2, -2.8);
  light(group, lights, C.x + ex - 4, 3, C.z - 6, 0xffb46a, 22, 12);
  for (const [tx, tz] of [
    [7.5, -3.6],
    [11, 0.4],
    [7.5, 3.6],
  ] as const) {
    f.add(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 18), std(0xc22a22, 0.5), tx, 0.78, tz);
    f.add(new THREE.CylinderGeometry(0.07, 0.3, 0.76, 8), MAT.chrome(), tx, 0.38, tz);
    for (let k = 0; k < 4; k++) f.add(new THREE.CylinderGeometry(0.2, 0.2, 0.46, 10), std(0x35e0d0, 0.6), tx + Math.cos(k * 1.57 + 0.6) * 1.2, 0.23, tz + Math.sin(k * 1.57 + 0.6) * 1.2);
    pie(tx, 0.82, tz, 0.4);
    f.add(new THREE.CylinderGeometry(0.05, 0.04, 0.16, 8), std(0xc8402c, 0.5), tx + 0.55, 0.89, tz - 0.3);
    f.add(new THREE.CylinderGeometry(0.05, 0.04, 0.16, 8), std(0x2a6cff, 0.5), tx - 0.5, 0.89, tz + 0.36);
    f.solid(tx - 0.8, tx + 0.8, tz - 0.8, tz + 0.8);
  }

  // Prize counter, east wall south half.
  f.box(1.1, 1.1, 6, ex - 2.3, 0.55, 6.5, std(0x1f6a66, 0.6));
  f.box(1.3, 0.07, 6.2, ex - 2.3, 1.13, 6.5, emissiveMat(ctx, 0x9fd0ff, 0.5, 0.9));
  const plush = [0xff5ad1, 0xffd23a, 0x39ff14, 0x5ac8ff, 0xff8a1e, 0xb48cff];
  for (let r = 0; r < 3; r++) {
    f.box(0.5, 0.06, 5.8, ex - 0.4, 1.5 + r * 0.9, 6.5, MAT.wood());
    for (let k = 0; k < 8; k++) {
      const m = std(plush[(k + r * 2) % 6]!, 0.9);
      const pz = 3.95 + k * 0.72;
      f.add(new THREE.SphereGeometry(0.2, 10, 8), m, ex - 0.42, 1.76 + r * 0.9, pz);
      f.add(new THREE.SphereGeometry(0.13, 8, 6), m, ex - 0.42, 2.02 + r * 0.9, pz);
    }
  }
  f.wall(5, 1.3, ex - 0.06, 4.75, 6.5, neon(ctx, "PRIZES", "#ffd23a", { w: 512, h: 128 }), ctx.flat, YAW.west);
  f.solid(ex - 2.9, ex, 3.3, 9.7);
  light(group, lights, C.x + ex - 4, 3.2, C.z + 6.5, 0xffe08a, 20, 12);

  // Ball pit, north-west corner.
  const px0 = -W / 2 + 0.2;
  const px1 = -10;
  const pz0 = -D / 2 + 0.2;
  const pz1 = -4.6;
  const pads = [0xff5ad1, 0x35e0d0, 0xffd23a, 0x5ac8ff];
  for (let i = 0; i < 6; i++) f.box(0.5, 0.75, (pz1 - pz0) / 6 - 0.04, px1, 0.375, pz0 + ((pz1 - pz0) / 6) * (i + 0.5), std(pads[i % 4]!, 0.8));
  for (let i = 0; i < 8; i++) f.box((px1 - px0) / 8 - 0.04, 0.75, 0.5, px0 + ((px1 - px0) / 8) * (i + 0.5), 0.375, pz1, std(pads[(i + 1) % 4]!, 0.8));
  f.solid(px1 - 0.25, px1 + 0.25, pz0, pz1 + 0.25);
  f.solid(px0, px1, pz1 - 0.25, pz1 + 0.25);
  f.flat(px1 - px0, pz1 - pz0, (px0 + px1) / 2, 0.02, (pz0 + pz1) / 2, std(0x1a3a8a, 0.9), ctx.ground);
  f.wall(5.4, 1.3, -W / 2 + 0.06, 4.3, (pz0 + pz1) / 2, neon(ctx, "BALL PIT", "#35e0d0", { w: 512, h: 128 }), ctx.flat, YAW.east);
  light(group, lights, C.x - 14.5, 3.4, C.z - 8, 0x7adfff, 24, 13);

  // Trampolines, south-west.
  const tx = -14.5;
  const tz = 5.2;
  const tr = 2.4;
  const ty = 0.62;
  f.add(new THREE.TorusGeometry(tr, 0.2, 10, 30), std(0x2a6cff, 0.7), tx, ty, tz, ctx.solid, 0, Math.PI / 2);
  for (let k = 0; k < 8; k++) f.add(new THREE.CylinderGeometry(0.05, 0.05, ty, 6), MAT.chrome(), tx + Math.cos(k * 0.785) * tr, ty / 2, tz + Math.sin(k * 0.785) * tr);
  for (const [sx, sz] of [
    [-17.9, 1.2],
    [-11.2, 10.2],
  ] as const) {
    f.add(new THREE.TorusGeometry(1.15, 0.14, 8, 20), std(0xff5ad1, 0.7), sx, 0.42, sz, ctx.solid, 0, Math.PI / 2);
    f.add(new THREE.CylinderGeometry(1.05, 1.05, 0.04, 20), MAT.black(), sx, 0.4, sz);
    f.solid(sx - 1.2, sx + 1.2, sz - 1.2, sz + 1.2);
  }
  f.solid(tx - tr - 0.1, tx + tr + 0.1, tz - tr - 0.1, tz + tr + 0.1);
  f.wall(6.6, 1.3, -W / 2 + 0.06, 4.3, tz, neon(ctx, "TRAMPOLINES", "#39ff14", { w: 640, h: 128 }), ctx.flat, YAW.east);

  // Doors: laser tag in the back corner, karts and the exit on the street wall.
  const door = (lx: number, lz: number, yaw: number, text: string, color: string, glow: THREE.Material) => {
    const dz = lz > 0 ? -0.08 : 0.08;
    f.box(2.3, 3.1, 0.12, lx, 1.55, lz + dz, std(0x08060f, 0.5));
    f.box(2.5, 0.08, 0.14, lx, 3.14, lz + dz * 1.4, glow, ctx.flat);
    for (const s of [-1, 1]) f.box(0.08, 3.1, 0.14, lx + s * 1.2, 1.55, lz + dz * 1.4, glow, ctx.flat);
    f.wall(3.8, 0.95, lx, 3.85, lz + dz, neon(ctx, text, color, { w: 512, h: 128 }), ctx.flat, yaw);
  };
  door(14.6, -D / 2, YAW.south, "LASER TAG", "#39ff14", green);
  door(-8.2, D / 2, YAW.north, "GO-KARTS", "#ffd23a", yellow);
  door(0, D / 2, YAW.north, "EXIT", "#ff5ad1", pink);

  // Ceiling: a run of bulbs and a star on the floor.
  for (let i = 0; i < 26; i++) {
    const m = [pink, teal, yellow, green][i % 4]!;
    f.box(0.12, 0.12, 0.12, -W / 2 + 1 + i * 1.5, H - 0.5 - Math.sin((i / 25) * Math.PI) * 0.5, 0.5, m, ctx.flat);
    f.box(0.12, 0.12, 0.12, -W / 2 + 1 + i * 1.5, H - 0.5 - Math.sin((i / 25) * Math.PI) * 0.5, 8, m, ctx.flat);
  }

  // ---- Real machines on the floor, played standing at them.
  const dark = std(0x16121f, 0.5, 0.2);
  const chromeLeg = MAT.chrome();

  // Pinball: a table on four legs with a glass-topped playfield and a lit backbox.
  const pbx = 12.6;
  const pbz = D / 2 - 1.55;
  const PB = { w: 0.88, l: 1.36, tilt: 0.11, y: 1.1 };
  f.box(1.02, 0.3, 1.52, pbx, 0.86, pbz, std(0x3a1260, 0.5));
  for (const sx of [-0.44, 0.44]) for (const sz of [-0.66, 0.66]) f.box(0.06, 0.74, 0.06, pbx + sx, 0.37, pbz + sz, chromeLeg);
  for (const sx of [-0.485, 0.485]) f.box(0.05, 0.28, 1.52, pbx + sx, 1.1, pbz, std(0xe0b33a, 0.4, 0.5));
  f.box(1.02, 0.14, 0.06, pbx, 0.98, pbz - 0.74, std(0xe0b33a, 0.4, 0.5));
  f.box(1.02, 0.86, 0.2, pbx, 1.72, D / 2 - 0.5, dark);
  f.wall(0.94, 0.78, pbx, 1.72, D / 2 - 0.61, neon(ctx, "SACK PINBALL", "#e0b33a", { sub: "3 BALLS", w: 512, h: 424 }), ctx.flat, Math.PI);
  f.solid(pbx - 0.56, pbx + 0.56, pbz - 0.8, D / 2);
  const fieldGeo = new THREE.PlaneGeometry(PB.w, PB.l);
  fieldGeo.rotateX(-Math.PI / 2);
  fieldGeo.rotateY(Math.PI);
  const field = new THREE.Mesh(fieldGeo, new THREE.MeshBasicMaterial({ color: 0x1d0f3a, toneMapped: false }));
  field.position.set(C.x + pbx, PB.y, C.z + pbz);
  field.rotation.x = -PB.tilt;
  group.add(field);
  // A second table beside it, for whoever else is in the room.
  f.box(1.02, 0.3, 1.52, pbx + 1.5, 0.86, pbz, std(0x12305a, 0.5));
  for (const sx of [-0.44, 0.44]) for (const sz of [-0.66, 0.66]) f.box(0.06, 0.74, 0.06, pbx + 1.5 + sx, 0.37, pbz + sz, chromeLeg);
  f.box(0.9, 0.02, 1.4, pbx + 1.5, 1.03, pbz, emissiveMat(ctx, 0x35e0d0, 0.5, 0.9));
  f.box(1.02, 0.86, 0.2, pbx + 1.5, 1.72, D / 2 - 0.5, dark);
  f.wall(0.94, 0.78, pbx + 1.5, 1.72, D / 2 - 0.61, neon(ctx, "BEALE BALL", "#35e0d0", { sub: "PINBALL", w: 512, h: 424 }), ctx.flat, Math.PI);
  f.solid(pbx + 0.94, pbx + 2.06, pbz - 0.8, D / 2);
  f.flat(4.6, 3.2, pbx + 0.75, 0.02, pbz - 1.6, poolMat(ctx, 0xe0b33a, 0.4), ctx.flat);

  // Skee-Ball: two wooden lanes running up to tilted target boards against the wall.
  const SK = { y: 0.86, z0: D / 2 - 4.3, zRamp: D / 2 - 1.75, board: { y: 1.36, z: D / 2 - 1.05, w: 0.9, l: 1.36, tilt: 0.8 } };
  const lane = std(0xb9833e, 0.55);
  const rings = new THREE.MeshBasicMaterial({
    map: tex(288, 432, (g, w, h) => {
      const px = w / SK.board.w;
      g.fillStyle = "#2a1a4a";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#ffd23a";
      g.lineWidth = 8;
      g.strokeRect(4, 4, w - 8, h - 8);
      for (const hole of [...SKEE_HOLES].reverse()) {
        g.fillStyle = hole.v >= 50 ? "#07070c" : "rgba(8,8,14,0.55)";
        g.strokeStyle = hole.v === 100 ? "#ff5ad1" : hole.v === 50 ? "#39ff14" : "#f4f1ea";
        g.lineWidth = 5;
        g.beginPath();
        g.arc(w / 2 + hole.u * px, h - hole.v0 * px, hole.r * px, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `900 22px "Arial Black", Impact, sans-serif`;
      for (const hole of SKEE_HOLES) {
        g.fillStyle = hole.v === 100 ? "#ff5ad1" : hole.v === 50 ? "#39ff14" : "#ffffff";
        g.fillText(String(hole.v), w / 2 + hole.u * px, h - (hole.v0 - (hole.v >= 40 ? 0 : hole.r - 0.04)) * px);
      }
    }),
    toneMapped: false,
  });
  const skx = 7.9;
  for (const [k, sx] of [skx, skx + 1.25].entries()) {
    f.box(0.9, SK.y, SK.zRamp - SK.z0, sx, SK.y / 2, (SK.z0 + SK.zRamp) / 2, std(0x241a3a, 0.6));
    f.box(0.8, 0.03, SK.zRamp - SK.z0, sx, SK.y + 0.015, (SK.z0 + SK.zRamp) / 2, lane);
    for (const sd of [-0.45, 0.45]) f.box(0.05, 0.14, SK.zRamp - SK.z0, sx + sd, SK.y + 0.07, (SK.z0 + SK.zRamp) / 2, std(0xff8a1e, 0.5));
    f.add(new THREE.BoxGeometry(0.8, 0.04, 0.5), lane, sx, SK.y + 0.1, SK.zRamp - 0.18, ctx.solid, 0, -0.42);
    f.box(1, 1.22, D / 2 - SK.zRamp, sx, 0.61, (SK.zRamp + D / 2) / 2, std(0x241a3a, 0.6));
    f.box(1, 0.08, D / 2 - SK.zRamp, sx, 2.84, (SK.zRamp + D / 2) / 2, std(0x241a3a, 0.6));
    f.box(1, 1.66, 0.08, sx, 2.05, D / 2 - 0.3, std(0x1a1230, 0.7));
    const board = new THREE.PlaneGeometry(SK.board.w, SK.board.l);
    board.rotateX(-Math.PI / 2);
    board.rotateY(Math.PI);
    f.add(board, rings, sx, SK.board.y + 0.36, SK.board.z, ctx.flat, 0, -SK.board.tilt);
    for (const sd of [-0.5, 0.5]) f.box(0.05, 1.66, D / 2 - SK.zRamp, sx + sd, 2.05, (SK.zRamp + D / 2) / 2, std(0xff8a1e, 0.5));
    f.wall(0.98, 0.4, sx, 3.1, SK.zRamp - 0.02, neon(ctx, k ? "LANE 2" : "SKEE-BALL", "#ff8a1e", { w: 384, h: 128 }), ctx.flat, Math.PI);
    f.box(1.04, 0.46, 0.06, sx, 3.1, SK.zRamp + 0.02, std(0x1a1230, 0.7));
    f.solid(sx - 0.5, sx + 0.5, SK.z0, D / 2);
  }
  f.flat(3.4, 3, skx + 0.6, 0.02, SK.z0 - 1.4, poolMat(ctx, 0xff8a1e, 0.4), ctx.flat);

  // Spin-N-Win: the big wheel in the middle of the floor, facing the door.
  const WH = { x: -1.5, y: 2.15, z: 1.2, r: 1.3 };
  const wedges = [2, 5, 1, 10, 2, 3, 1, 25, 2, 5, 1, 8, 3, 2, 1, 50];
  const wheelTex = tex(512, 512, (g, w) => {
    const colors = ["#ff5ad1", "#35e0d0", "#ffd23a", "#39ff14", "#b48cff", "#ff8a1e"];
    const n = wedges.length;
    const c = w / 2;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      g.fillStyle = wedges[i] === 50 ? "#f4f1ea" : colors[i % colors.length]!;
      g.beginPath();
      g.moveTo(c, c);
      g.arc(c, c, c - 6, a0, a1);
      g.closePath();
      g.fill();
      g.save();
      g.translate(c + Math.cos((a0 + a1) / 2) * c * 0.72, c + Math.sin((a0 + a1) / 2) * c * 0.72);
      g.rotate((a0 + a1) / 2 + Math.PI / 2);
      g.fillStyle = "#12081f";
      g.font = `900 ${wedges[i]! >= 25 ? 54 : 42}px "Arial Black", Impact, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(String(wedges[i]), 0, 0);
      g.restore();
    }
    g.strokeStyle = "#ffd23a";
    g.lineWidth = 12;
    g.beginPath();
    g.arc(c, c, c - 8, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#ffd23a";
    g.beginPath();
    g.arc(c, c, 34, 0, Math.PI * 2);
    g.fill();
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(WH.r, 48), new THREE.MeshBasicMaterial({ map: wheelTex, toneMapped: false }));
  disc.position.set(C.x + WH.x, WH.y, C.z + WH.z + 0.14);
  group.add(disc);
  f.box(0.5, WH.y + 0.4, 0.22, WH.x, (WH.y + 0.4) / 2, WH.z, dark);
  f.box(2.4, 0.3, 1, WH.x, 0.15, WH.z, std(0x3a1260, 0.5));
  f.add(new THREE.CylinderGeometry(WH.r + 0.09, WH.r + 0.09, 0.2, 40), std(0xc22a22, 0.4, 0.3), WH.x, WH.y, WH.z, ctx.solid, 0, Math.PI / 2);
  f.wall(2.6, 0.6, WH.x, WH.y + WH.r + 0.75, WH.z + 0.13, neon(ctx, "SPIN-N-WIN", "#ff3b3b", { sub: "PULL THE LEVER", w: 640, h: 150 }), ctx.flat);
  f.box(2.7, 0.7, 0.1, WH.x, WH.y + WH.r + 0.75, WH.z + 0.06, dark);
  for (const sx of [-1.25, 1.25]) f.box(0.08, WH.y + WH.r + 1.1, 0.08, WH.x + sx, (WH.y + WH.r + 1.1) / 2, WH.z, chromeLeg);
  f.box(0.1, 0.9, 0.1, WH.x + 1.55, 0.75, WH.z + 0.5, chromeLeg);
  f.solid(WH.x - 1.4, WH.x + 1.7, WH.z - 0.5, WH.z + 0.6);
  f.flat(5, 4.4, WH.x, 0.02, WH.z + 2.4, poolMat(ctx, 0xff3b3b, 0.36), ctx.flat);
  f.flat(9, 9, 1, 0.02, 7, poolMat(ctx, 0xffd23a, 0.3), ctx.flat);
  light(group, lights, C.x + 1, 4.6, C.z + 5, 0xfff0d0, 34, 22);

  // Air hockey: a lit white table with rails, a goal slot at each end and its name hung over it.
  const AH = { x: -6.2, z: -5.4, y: 0.86, hw: 0.6, hl: 1.15, goal: 0.44 };
  f.box(AH.hw * 2 + 0.26, 0.46, AH.hl * 2 + 0.26, AH.x, AH.y - 0.29, AH.z, std(0x10204a, 0.5));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.box(0.1, 0.34, 0.1, AH.x + sx * (AH.hw - 0.02), 0.17, AH.z + sz * (AH.hl - 0.02), chromeLeg);
  f.box(AH.hw * 2, 0.04, AH.hl * 2, AH.x, AH.y - 0.02, AH.z, emissiveMat(ctx, 0xdff3ff, 0.6, 0.85));
  const ice = hot(0.25, 0.75, 2.2);
  const redLine = hot(2.2, 0.3, 0.3);
  f.box(AH.hw * 2, 0.004, 0.022, AH.x, AH.y + 0.003, AH.z, redLine, ctx.flat);
  f.add(new THREE.TorusGeometry(0.2, 0.008, 4, 28), redLine, AH.x, AH.y + 0.004, AH.z, ctx.flat, 0, Math.PI / 2);
  for (const sz of [-1, 1]) {
    f.add(new THREE.TorusGeometry(AH.goal / 2 + 0.06, 0.008, 4, 20, Math.PI), ice, AH.x, AH.y + 0.004, AH.z + sz * AH.hl, ctx.flat, sz > 0 ? Math.PI : 0, Math.PI / 2);
    f.box(AH.hw * 2, 0.004, 0.016, AH.x, AH.y + 0.003, AH.z + sz * AH.hl * 0.45, ice, ctx.flat);
    // The rail at each end is in two pieces, with the goal between them.
    const piece = AH.hw - AH.goal / 2;
    for (const sx of [-1, 1]) f.box(piece, 0.09, 0.07, AH.x + sx * (AH.goal / 2 + piece / 2), AH.y + 0.025, AH.z + sz * (AH.hl + 0.035), std(0xff5ad1, 0.4));
    f.box(AH.goal, 0.02, 0.1, AH.x, AH.y - 0.03, AH.z + sz * (AH.hl + 0.06), sz > 0 ? green : pink, ctx.flat);
  }
  for (const sx of [-1, 1]) f.box(0.07, 0.09, AH.hl * 2 + 0.14, AH.x + sx * (AH.hw + 0.035), AH.y + 0.025, AH.z, std(0xff5ad1, 0.4));
  for (const yaw of [YAW.south, YAW.north]) f.wall(2.2, 0.5, AH.x, 3.1, AH.z, neon(ctx, "AIR HOCKEY", "#35e0d0", { sub: "FIRST TO FIVE", w: 640, h: 144 }), ctx.flat, yaw);
  for (const sx of [-1, 1]) f.box(0.03, H - 3.35, 0.03, AH.x + sx * 1, (H + 3.35) / 2, AH.z, chromeLeg);
  f.solid(AH.x - AH.hw - 0.16, AH.x + AH.hw + 0.16, AH.z - AH.hl - 0.16, AH.z + AH.hl + 0.16);
  f.flat(4.4, 5.4, AH.x, 0.02, AH.z, poolMat(ctx, 0x35e0d0, 0.42), ctx.flat);

  // The midway: one striped stall, three games to throw at behind its counter.
  const MW = { x: 0.6, zc: -5.2, zb: -7.9, w: 6.3, top: 1 };
  const bays = [MW.x - 2.05, MW.x, MW.x + 2.05];
  const stallRed = std(0xc22a22, 0.6);
  const stallWhite = std(0xf1ede2, 0.6);
  const stallDark = std(0x150f29, 0.85);
  f.box(MW.w, MW.top, 0.36, MW.x, MW.top / 2, MW.zc, stallRed);
  for (let i = 0; i < 9; i++) f.box(0.35, MW.top - 0.08, 0.02, MW.x - MW.w / 2 + 0.35 + i * 0.7, MW.top / 2, MW.zc + 0.19, stallWhite);
  f.box(MW.w + 0.12, 0.06, 0.5, MW.x, MW.top + 0.03, MW.zc, stallWhite);
  f.box(MW.w, 3.1, 0.12, MW.x, 1.55, MW.zb, stallDark);
  for (const sx of [-1, 1]) {
    f.box(0.12, 3.1, MW.zc - MW.zb, MW.x + sx * (MW.w / 2), 1.55, (MW.zc + MW.zb) / 2, stallDark);
    f.box(0.12, 3.1, 0.12, MW.x + sx * (MW.w / 2), 1.55, MW.zc + 0.5, stallWhite);
  }
  for (const dx of [-1.025, 1.025]) f.box(0.06, 2.3, MW.zc - MW.zb - 0.5, MW.x + dx, 1.15, (MW.zc + MW.zb) / 2 - 0.2, stallDark);
  f.box(MW.w + 0.3, 0.12, MW.zc - MW.zb + 0.9, MW.x, 3.16, (MW.zc + MW.zb) / 2 + 0.4, stallRed);
  for (let i = 0; i < 12; i++) f.box(MW.w / 12 + 0.02, 0.32, 0.05, MW.x - MW.w / 2 + (MW.w / 12) * (i + 0.5), 2.95, MW.zc + 0.86, i % 2 ? stallWhite : stallRed);
  f.wall(5.2, 0.74, MW.x, 3.66, MW.zc + 0.86, neon(ctx, "THE MIDWAY", "#ffd23a", { sub: "KNOCK IT DOWN · WIN TICKETS", w: 896, h: 128 }), ctx.flat);
  f.box(5.4, 0.86, 0.08, MW.x, 3.66, MW.zc + 0.8, stallDark);
  (["BOTTLE BASH", "CLOWN TOSS", "BAG TOSS"] as const).forEach((name, i) => {
    f.wall(1.7, 0.42, bays[i]!, 2.72, MW.zb + 0.08, neon(ctx, name, ["#35e0d0", "#ff5ad1", "#39ff14"][i]!, { w: 512, h: 128 }), ctx.flat);
  });
  // Prizes strung along the back.
  for (let i = 0; i < 14; i++) f.add(new THREE.SphereGeometry(0.11, 8, 6), std([0xff5ad1, 0xffd23a, 0x39ff14, 0x5ac8ff][i % 4]!, 0.9), MW.x - MW.w / 2 + 0.35 + i * 0.43, 2.38, MW.zb + 0.14);
  f.solid(MW.x - MW.w / 2 - 0.08, MW.x + MW.w / 2 + 0.08, MW.zb - 0.1, MW.zc + 0.26);
  f.flat(7, 3, MW.x, 0.02, MW.zc + 1.5, poolMat(ctx, 0xffd23a, 0.4), ctx.flat);
  // Bottle Bash: a pedestal for the pyramid.
  const shelf = { x: bays[0]!, y: 1.08, z: MW.zb + 0.5 };
  f.box(0.64, shelf.y, 0.4, shelf.x, shelf.y / 2, shelf.z, std(0x3a1260, 0.6));
  f.box(0.7, 0.03, 0.46, shelf.x, shelf.y - 0.015, shelf.z, stallWhite);
  // Clown Toss: three painted faces on the back wall. Their mouths are worked by the game.
  // Every face is painted with its mouth in the same place: a quarter of the picture below its
  // middle, and a little over a quarter of the picture wide.
  const CL = { y: 1.62, z: MW.zb + 0.07, gap: 0.62, size: 0.6, mouth: 0.249 };
  const faces = new THREE.TextureLoader();
  for (let i = -1; i <= 1; i++) {
    const map = faces.load(`/game-v2/places/clowns/clown-${i + 2}.webp`);
    map.colorSpace = THREE.SRGBColorSpace;
    f.wall(CL.size, CL.size, bays[1]! + i * CL.gap, CL.y + CL.size * CL.mouth, CL.z, new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, toneMapped: false }), ctx.flat);
  }
  // Bag Toss: a board leaning away from the thrower, with a hole near the top.
  const BG = { x: bays[2]!, z0: MW.zc - 0.75, y0: 0.22, z1: MW.zb + 0.55, y1: 0.7, w: 0.64, hole: 0.74, r: 0.085 };
  const boardLen = Math.hypot(BG.z1 - BG.z0, BG.y1 - BG.y0);
  const boardTilt = Math.atan2(BG.y1 - BG.y0, BG.z0 - BG.z1);
  f.add(new THREE.BoxGeometry(BG.w, 0.04, boardLen), std(0xe9dcc0, 0.7), BG.x, (BG.y0 + BG.y1) / 2 - 0.02, (BG.z0 + BG.z1) / 2, ctx.solid, 0, boardTilt);
  f.add(new THREE.CylinderGeometry(BG.r, BG.r, 0.012, 20), new THREE.MeshBasicMaterial({ color: 0x040404 }), BG.x, lerpN(BG.y0, BG.y1, BG.hole) + 0.008, lerpN(BG.z0, BG.z1, BG.hole), ctx.flat, 0, boardTilt);
  f.add(new THREE.TorusGeometry(BG.r + 0.012, 0.012, 6, 22), green, BG.x, lerpN(BG.y0, BG.y1, BG.hole) + 0.01, lerpN(BG.z0, BG.z1, BG.hole), ctx.flat, 0, boardTilt + Math.PI / 2);
  f.box(BG.w, BG.y1, 0.06, BG.x, BG.y1 / 2 - 0.03, BG.z1 - 0.02, stallRed);
  finish(ctx, group);
  return {
    id: "fun",
    group,
    bounds: { minX: C.x - W / 2, maxX: C.x + W / 2, minZ: C.z - D / 2, maxZ: C.z + D / 2 },
    solids: ctx.solids,
    floorY: 0,
    spawn: { x: C.x, z: C.z + D / 2 - 1.8, heading: Math.PI },
    exit: { x: C.x, z: C.z + D / 2 - 1 },
    lights,
    ambient: { sky: 0xb49cff, ground: 0x2a1a4a, power: 0.62 },
    boom: 5,
    cabinets,
    pizza: { x: C.x + ex - 3.8, z: C.z - 6 },
    prizes: { x: C.x + ex - 3.8, z: C.z + 6.5 },
    pitEdge: { x: C.x + px1 + 1.1, z: C.z + (pz0 + pz1) / 2 },
    trampEdge: { x: C.x + tx + tr + 1.1, z: C.z + tz },
    laserDoor: { x: C.x + 14.6, z: C.z - D / 2 + 1.3 },
    kartDoor: { x: C.x - 8.2, z: C.z + D / 2 - 1.3 },
    whack,
    popshot,
    pinball: { x: C.x + pbx, y: PB.y, z: C.z + pbz, w: PB.w, l: PB.l, tilt: PB.tilt, field, stand: { x: C.x + pbx, z: C.z + pbz - 1.25 } },
    skee: { x: C.x + skx, y: SK.y, z0: C.z + SK.z0, zRamp: C.z + SK.zRamp, board: { y: SK.board.y + 0.36, z: C.z + SK.board.z, w: SK.board.w, l: SK.board.l, tilt: SK.board.tilt }, stand: { x: C.x + skx, z: C.z + SK.z0 - 0.65 } },
    wheel: { x: C.x + WH.x, y: WH.y, z: C.z + WH.z, disc, wedges, stand: { x: C.x + WH.x, z: C.z + WH.z + 2.7 } },
    hockey: { x: C.x + AH.x, y: AH.y, z: C.z + AH.z, hw: AH.hw, hl: AH.hl, goal: AH.goal, stand: { x: C.x + AH.x, z: C.z + AH.z + AH.hl + 0.75 }, far: { x: C.x + AH.x, z: C.z + AH.z - AH.hl - 0.6 } },
    midway: {
      counterZ: C.z + MW.zc,
      top: MW.top + 0.06,
      bottles: { x: C.x + shelf.x, y: shelf.y, z: C.z + shelf.z, stand: { x: C.x + shelf.x, z: C.z + MW.zc + 0.85 } },
      clowns: { x: C.x + bays[1]!, y: CL.y, z: C.z + CL.z, gap: CL.gap, stand: { x: C.x + bays[1]!, z: C.z + MW.zc + 0.85 } },
      bags: { x: C.x + BG.x, z0: C.z + BG.z0, y0: BG.y0, z1: C.z + BG.z1, y1: BG.y1, w: BG.w, hole: BG.hole, r: BG.r, stand: { x: C.x + BG.x, z: C.z + MW.zc + 0.85 } },
      keeper: { x: C.x + MW.x + MW.w / 2 + 0.75, z: C.z + MW.zc + 0.5 },
    },
    pit: { minX: C.x + px0 + 0.3, maxX: C.x + px1 - 0.55, minZ: C.z + pz0 + 0.3, maxZ: C.z + pz1 - 0.55 },
    tramp: { x: C.x + tx, z: C.z + tz, r: tr, y: ty },
  };
}

// ------------------------------------------------------------------ laser arena

export type LaserRoom = Room & {
  start: { x: number; z: number; heading: number };
  bots: { x: number; z: number }[];
  nodes: { x: number; z: number }[];
};

export function buildLaserRoom(): LaserRoom {
  const group = new THREE.Group();
  const ctx = makeCtx(404);
  const C = ROOM.laser;
  const W = 32;
  const D = 22;
  const H = 5;
  const floor = new THREE.MeshStandardMaterial({
    map: tex(128, 128, (g, w, h) => {
      g.fillStyle = "#07060d";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#3a1d8a";
      g.lineWidth = 3;
      g.strokeRect(0, 0, w, h);
      g.strokeStyle = "rgba(57,255,20,0.35)";
      g.lineWidth = 1;
      g.strokeRect(6, 6, w - 12, h - 12);
    }),
    roughness: 0.35,
    metalness: 0.3,
  });
  shell(ctx, C.x, C.z, W, D, H, floor, std(0x0b0916, 0.8), std(0x040308, 0.95), 2);
  const lights: THREE.PointLight[] = [];
  const f = new Frame(ctx, C.x, C.z, YAW.south);
  const glows = [hot(2.4, 0.5, 1.9), hot(0.3, 2.2, 2.0), hot(0.3, 2.4, 0.2), hot(1.3, 0.6, 2.6)];
  for (const [y, k] of [
    [0.9, 0],
    [3.2, 1],
  ] as const) {
    f.box(W - 0.4, 0.07, 0.05, 0, y, -D / 2 + 0.05, glows[k]!, ctx.flat);
    f.box(W - 0.4, 0.07, 0.05, 0, y, D / 2 - 0.05, glows[k + 2]!, ctx.flat);
    f.box(0.05, 0.07, D - 0.4, -W / 2 + 0.05, y, 0, glows[k + 1]!, ctx.flat);
    f.box(0.05, 0.07, D - 0.4, W / 2 - 0.05, y, 0, glows[k]!, ctx.flat);
  }
  const covers: [number, number, number, number][] = [
    [0, 0, 4.2, 1.2],
    [-7, -4, 1.2, 4],
    [7, 4, 1.2, 4],
    [-7, 5.4, 3.2, 1.2],
    [7, -5.4, 3.2, 1.2],
    [-12, 0, 1.2, 3.2],
    [12, 0, 1.2, 3.2],
    [0, -7, 1.2, 2.6],
    [0, 7, 1.2, 2.6],
  ];
  const body = std(0x16132a, 0.6, 0.2);
  covers.forEach(([lx, lz, w, d], i) => {
    const h = 2;
    const g = glows[i % 4]!;
    f.box(w, h, d, lx, h / 2, lz, body);
    for (const s of [-1, 1]) {
      f.box(w + 0.04, 0.06, 0.06, lx, h, lz + (s * d) / 2, g, ctx.flat);
      f.box(0.06, 0.06, d + 0.04, lx + (s * w) / 2, h, lz, g, ctx.flat);
      f.box(0.06, h, 0.06, lx + (s * w) / 2, h / 2, lz + (s * d) / 2, g, ctx.flat);
      f.box(0.06, h, 0.06, lx + (s * w) / 2, h / 2, lz - (s * d) / 2, g, ctx.flat);
    }
    f.solid(lx - w / 2, lx + w / 2, lz - d / 2, lz + d / 2);
  });
  light(group, lights, C.x - 8, 4, C.z - 3, 0x8a4cff, 46, 24);
  light(group, lights, C.x + 8, 4, C.z + 3, 0x2ae0d0, 46, 24);
  finish(ctx, group);
  const at = (lx: number, lz: number) => ({ x: C.x + lx, z: C.z + lz });
  return {
    id: "laser",
    group,
    bounds: { minX: C.x - W / 2, maxX: C.x + W / 2, minZ: C.z - D / 2, maxZ: C.z + D / 2 },
    solids: ctx.solids,
    floorY: 0,
    spawn: { x: C.x - 4, z: C.z + D / 2 - 2, heading: Math.PI },
    exit: { x: C.x, z: C.z + D / 2 - 1 },
    lights,
    ambient: { sky: 0x5a48c8, ground: 0x0a0618, power: 0.5 },
    boom: 5.4,
    start: { x: C.x - 4, z: C.z + D / 2 - 2, heading: Math.PI },
    bots: [at(-13, -9), at(13, -9), at(0, -9.6), at(-13, 3), at(13, 3)],
    nodes: [at(-14, -8.5), at(-4, -8.5), at(4, -8.5), at(14, -8.5), at(-14, 8.5), at(-4, 8.5), at(4, 8.5), at(14, 8.5), at(-9.6, 0), at(9.6, 0), at(-3.4, -3.4), at(3.4, 3.4), at(-3.4, 3.4), at(3.4, -3.4)],
  };
}
