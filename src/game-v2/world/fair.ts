import * as THREE from "three";
import { tex } from "../gfx/tex";
import {
  MAT,
  YAW,
  addSolid,
  bench,
  emissiveMat,
  neon,
  sign,
  std,
  tree,
  type BuildCtx,
} from "./kit";
import { CURB, FAIR } from "./map";
import { trough } from "./waterpark";

const Y0 = CURB;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, Y0 + y, z);

/** A ride that runs on a track: the line through it, how long it is, where the chain lift is and where it loads. */
export type Track = {
  curve: THREE.CatmullRomCurve3;
  len: number;
  lift: [number, number];
  station: number;
  car: THREE.Group;
};

export type FairStop = {
  x: number;
  z: number;
  fx: number;
  fz: number;
  act: "watch" | "cheer" | "eat" | "dance" | "serve" | "play";
  lift?: number;
};

/** Put a train's cars on its track, the front one `s` metres round. The train's group stays at the origin. */
const _tp = new THREE.Vector3();
const _tt = new THREE.Vector3();
export function placeTrain(track: Track, s: number, gap = 2.6) {
  track.car.children.forEach((c, i) => {
    const u = ((((s - i * gap) / track.len) % 1) + 1) % 1;
    track.curve.getPointAt(u, _tp);
    track.curve.getTangentAt(u, _tt);
    c.position.copy(_tp);
    c.lookAt(_tp.x + _tt.x, _tp.y + _tt.y, _tp.z + _tt.z);
  });
}

export type Fair = {
  group: THREE.Group;
  pippin: Track;
  flume: Track;
  /** Where a gondola of the wheel is, `a` radians round from the bottom. */
  wheelSeat(a: number, out: THREE.Vector3): THREE.Vector3;
  wheel: THREE.Group;
  /** Where a horse on the carousel is, `a` radians round, and how high it has bobbed. */
  horse(a: number, time: number, out: THREE.Vector3): THREE.Vector3;
  carousel: THREE.Group;
  dropCar: THREE.Group;
  bumperCars: THREE.Group[];
  pigs: THREE.Group[];
  bull: THREE.Group;
  puck: THREE.Mesh;
  /** How fast the wheel and the carousel are turning, as a share of their usual pace; and how far round they are. */
  speed: { wheel: number; carousel: number };
  wheelAngle(): number;
  /** Start the stunt dog show's big routine: faster laps, higher jumps, the clown juggling. */
  showtime(): void;
  /** Where the first horse on the outer ring is right now, in the world. */
  horseAt(out: THREE.Vector3): THREE.Vector3;
  /** Where each thing is started from. */
  spots: Record<string, { x: number; z: number }>;
  stops: FairStop[];
  /** Rides that the player is on are moved by the ride, not by the fair. */
  held: Set<string>;
  update(dt: number, time: number): void;
};

/** A string of bulbs between two posts, lit at night. */
function bulbs(ctx: BuildCtx, a: THREE.Vector3, b: THREE.Vector3, sag: number, colors: number[]) {
  const n = Math.max(4, Math.round(a.distanceTo(b) / 1.4));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag;
    ctx.flat.add(
      new THREE.SphereGeometry(0.12, 6, 4),
      emissiveMat(ctx, colors[i % colors.length]!, 0.6, 3.2),
      x,
      y,
      z,
    );
  }
}

function striped(c1: string, c2: string) {
  return new THREE.MeshStandardMaterial({
    map: tex(64, 32, (g, w, h) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? c1 : c2;
        g.fillRect((i * w) / 8, 0, w / 8 + 1, h);
      }
    }),
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
}

/** A booth: counter, posts, a striped awning, and its name over it. Faces `yaw`. */
function booth(
  ctx: BuildCtx,
  x: number,
  z: number,
  yaw: number,
  name: string,
  color: string,
  c1: string,
  c2: string,
) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const at = (lx: number, lz: number) =>
    [x + lx * cos + lz * sin, z - lx * sin + lz * cos] as const;
  const box = (
    w: number,
    h: number,
    d: number,
    lx: number,
    y: number,
    lz: number,
    mat: THREE.Material,
  ) => {
    const [wx, wz] = at(lx, lz);
    ctx.solid.box(w, h, d, wx, y, wz, mat, yaw);
  };
  box(6, 1.1, 1, 0, Y0 + 0.55, 0.8, std(0xf4f1ea, 0.6));
  box(6, 2.6, 0.2, 0, Y0 + 1.3, -1.4, std(0x3a2a22, 0.8));
  for (const s of [-2.9, 2.9]) {
    box(0.16, 3, 0.16, s, Y0 + 1.5, 1.2, MAT.wood());
    box(0.16, 3, 0.16, s, Y0 + 1.5, -1.3, MAT.wood());
  }
  box(6.6, 0.1, 3.4, 0, Y0 + 3.05, 0, std(0x3a2a22, 0.7));
  const [ax, az] = at(0, 1.6);
  ctx.solid.add(new THREE.PlaneGeometry(6.6, 1.2), striped(c1, c2), ax, Y0 + 2.75, az, yaw, -0.6);
  const [sx, sz] = at(0, 1.25);
  ctx.flat.wall(
    5.6,
    0.9,
    sx,
    Y0 + 3.6,
    sz,
    neon(ctx, name.toUpperCase(), color, { w: 768, h: 128, border: false }),
    yaw,
  );
  const [px0, pz0] = at(-3.2, -1.6);
  const [px1, pz1] = at(3.2, 1.0);
  addSolid(ctx, Math.min(px0, px1), Math.max(px0, px1), Math.min(pz0, pz1), Math.max(pz0, pz1));
  const [fx, fz] = at(0, 2.4);
  const [kx, kz] = at(0, -0.6);
  return { front: { x: fx, z: fz }, keeper: { x: kx, z: kz } };
}

/** A white wooden bent under a coaster: two posts, cross ties and a brace. */
function bent(ctx: BuildCtx, p: THREE.Vector3, side: THREE.Vector3, wood: THREE.Material) {
  const h = p.y - Y0;
  if (h < 0.6) return;
  for (const s of [-1.1, 1.1])
    ctx.solid.box(0.22, h, 0.22, p.x + side.x * s, Y0 + h / 2, p.z + side.z * s, wood);
  for (let y = 2.5; y < h - 0.5; y += 3)
    ctx.solid.box(
      Math.abs(side.x) * 2.4 + 0.18,
      0.16,
      Math.abs(side.z) * 2.4 + 0.18,
      p.x,
      Y0 + y,
      p.z,
      wood,
    );
}

/** The rails, two tubes either side of the line. */
function rails(
  curve: THREE.CatmullRomCurve3,
  half: number,
  steps: number,
  mat: THREE.Material,
  group: THREE.Group,
) {
  const up = new THREE.Vector3(0, 1, 0);
  for (const s of [-half, half]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const p = curve.getPointAt(i / steps);
      const t = curve.getTangentAt(i / steps);
      const side = new THREE.Vector3().crossVectors(t, up).normalize();
      pts.push(p.add(side.multiplyScalar(s)));
    }
    const c = new THREE.CatmullRomCurve3(pts, true);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, steps, 0.07, 5, true), mat);
    group.add(m);
  }
}

/** A coaster car: a tub with two seats, a lap bar, wheels. */
function coasterCar(color: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.7, 2.4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 }),
  );
  body.position.y = 0.5;
  g.add(body);
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.5, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }),
  );
  seat.position.set(0, 0.95, -0.7);
  g.add(seat);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: 0.7, roughness: 0.3 }),
  );
  bar.position.set(0, 1.2, 0.3);
  g.add(bar);
  return g;
}

/**
 * The Mid-South Fair: built once. Static things go in the city's batches; everything that moves
 * (the train on the Pippin, the logs, the wheel, the carousel, the swings, the cups, the drop
 * tower, the bumper cars, the pigs) is its own object in `group`, moved by `update`.
 */
export function buildFair(ctx: BuildCtx): Fair {
  const F = FAIR;
  const group = new THREE.Group();
  const held = new Set<string>();
  const stops: FairStop[] = [];
  const spots: Record<string, { x: number; z: number }> = {};
  const dirt = std(0x9a7a52, 0.95);
  const grass = MAT.grass();
  const asphalt = std(0x3a3d42, 0.9);

  // ---- The grounds: grass, the midway's blacktop, paths across, a fence all round with the gate.
  ctx.ground.flat(
    F.maxX - F.minX,
    F.maxZ - F.minZ,
    (F.minX + F.maxX) / 2,
    Y0 + 0.004,
    (F.minZ + F.maxZ) / 2,
    grass,
    0,
    8,
  );
  const M = F.midway;
  ctx.ground.flat(
    M.maxX - M.minX,
    M.maxZ - M.minZ,
    (M.minX + M.maxX) / 2,
    Y0 + 0.008,
    (M.minZ + M.maxZ) / 2,
    asphalt,
    0,
    6,
  );
  ctx.ground.flat(F.maxX - F.minX - 6, 10, (F.minX + F.maxX) / 2, Y0 + 0.007, 772, asphalt, 0, 6);
  ctx.ground.flat(F.maxX - 74, 8, (74 + F.maxX) / 2, Y0 + 0.007, 712, asphalt, 0, 6);
  const fence = std(0x2a2d31, 0.6, 0.4);
  const run = (x0: number, z0: number, x1: number, z1: number) => {
    ctx.solid.box(
      Math.abs(x1 - x0) + 0.1,
      2.2,
      Math.abs(z1 - z0) + 0.1,
      (x0 + x1) / 2,
      Y0 + 1.1,
      (z0 + z1) / 2,
      chainLink(),
    );
    ctx.solid.box(
      Math.abs(x1 - x0) + 0.12,
      0.08,
      Math.abs(z1 - z0) + 0.12,
      (x0 + x1) / 2,
      Y0 + 2.2,
      (z0 + z1) / 2,
      fence,
    );
    addSolid(
      ctx,
      Math.min(x0, x1) - 0.06,
      Math.max(x0, x1) + 0.06,
      Math.min(z0, z1) - 0.06,
      Math.max(z0, z1) + 0.06,
    );
  };
  run(F.minX, F.minZ, F.gate.x - 12, F.minZ);
  run(F.gate.x + 12, F.minZ, F.maxX, F.minZ);
  run(F.minX, F.minZ, F.minX, F.maxZ);
  run(F.maxX, F.minZ, F.maxX, F.maxZ);
  run(F.minX, F.maxZ, F.maxX, F.maxZ);

  // The gate: a big arch with the name in lights, ticket booths, flags.
  const G = F.gate;
  const red = std(0xc0262a, 0.6);
  const blue = std(0x2a4ad0, 0.6);
  for (const s of [-11, 11]) {
    ctx.solid.box(1.4, 9, 1.4, G.x + s, Y0 + 4.5, G.z, red);
    ctx.solid.add(new THREE.ConeGeometry(1.2, 2, 4), blue, G.x + s, Y0 + 10, G.z, Math.PI / 4);
    ctx.solid.cyl(0.05, 0.05, 3, G.x + s, Y0 + 12.4, G.z, MAT.steel(), 4);
    ctx.solid.add(
      new THREE.PlaneGeometry(1.6, 0.9),
      std(s < 0 ? 0xffd23a : 0x39ff14, 0.7),
      G.x + s + 0.8,
      Y0 + 13.4,
      G.z,
      0,
    );
    addSolid(ctx, G.x + s - 0.8, G.x + s + 0.8, G.z - 0.8, G.z + 0.8);
  }
  ctx.solid.box(23.4, 3, 1.2, G.x, Y0 + 9.6, G.z, red);
  ctx.flat.wall(
    21,
    2.4,
    G.x,
    Y0 + 9.6,
    G.z - 0.62,
    neon(ctx, "MID-SOUTH FAIR", "#ffd23a", {
      sub: "MEMPHIS · SINCE 1856",
      w: 1024,
      h: 192,
      border: true,
    }),
    YAW.north,
  );
  ctx.flat.wall(
    21,
    2.4,
    G.x,
    Y0 + 9.6,
    G.z + 0.62,
    neon(ctx, "MID-SOUTH FAIR", "#ffd23a", {
      sub: "MEMPHIS · SINCE 1856",
      w: 1024,
      h: 192,
      border: true,
    }),
    YAW.south,
  );
  for (const s of [-16, 16]) {
    ctx.solid.box(4, 3, 3, G.x + s, Y0 + 1.5, G.z + 1, std(0xf4f1ea, 0.6));
    ctx.solid.box(4.6, 0.3, 3.6, G.x + s, Y0 + 3.15, G.z + 1, red);
    ctx.flat.wall(
      3.4,
      0.6,
      G.x + s,
      Y0 + 2.4,
      G.z - 0.52,
      sign("TICKETS", "#ffd23a", "#c0262a", { w: 256, h: 64 }),
      YAW.north,
    );
    addSolid(ctx, G.x + s - 2, G.x + s + 2, G.z - 0.5, G.z + 2.5);
  }
  bulbs(
    ctx,
    V(G.x - 11, 11.2, G.z),
    V(G.x + 11, 11.2, G.z),
    0.2,
    [0xffd23a, 0xff4fd8, 0x5ae0ff, 0x39ff14],
  );
  ctx.lamps.push({ x: G.x, y: Y0 + 8, z: G.z - 3, color: 0xffd23a });

  // String lights down the midway, pole to pole.
  const poles: THREE.Vector3[] = [];
  for (let z = M.minZ + 6; z <= M.maxZ - 4; z += 14) {
    for (const x of [M.minX + 0.5, M.maxX - 0.5]) {
      ctx.solid.cyl(0.1, 0.12, 6, x, Y0 + 3, z, MAT.wood(), 6);
      addSolid(ctx, x - 0.15, x + 0.15, z - 0.15, z + 0.15);
    }
    poles.push(V(M.minX + 0.5, 6, z), V(M.maxX - 0.5, 6, z));
  }
  const cols = [0xffd23a, 0xff4fd8, 0x5ae0ff, 0x39ff14, 0xff7a2a];
  for (let i = 0; i + 1 < poles.length; i += 2) {
    bulbs(ctx, poles[i]!, poles[i + 1]!, 0.6, cols);
    if (i + 3 < poles.length) {
      bulbs(ctx, poles[i]!, poles[i + 3]!, 0.8, cols);
      bulbs(ctx, poles[i + 1]!, poles[i + 2]!, 0.8, cols);
    }
  }
  for (let z = M.minZ + 20; z < M.maxZ; z += 40)
    ctx.lamps.push({ x: (M.minX + M.maxX) / 2, y: Y0 + 5, z, color: 0xffe0a0 });

  // ---- The food row down the west side of the midway, facing it.
  const stripes: [string, string][] = [
    ["#c0262a", "#f4f1ea"],
    ["#2a4ad0", "#f4f1ea"],
    ["#e0b030", "#c0262a"],
    ["#ff7ad8", "#f4f1ea"],
    ["#39c86a", "#f4f1ea"],
    ["#ffd23a", "#f4f1ea"],
  ];
  F.food.forEach((f, i) => {
    const b = booth(
      ctx,
      M.minX - 3,
      f.z,
      YAW.east,
      f.name,
      ["#ffd23a", "#ff7a2a", "#ff4fd8", "#5ae0ff", "#ff3b3b", "#ffe060"][i]!,
      stripes[i]![0],
      stripes[i]![1],
    );
    spots[`food-${f.id}`] = b.front;
    stops.push({ x: b.keeper.x, z: b.keeper.z, fx: b.front.x, fz: b.front.z, act: "serve" });
    stops.push({
      x: b.front.x + 1.2,
      z: b.front.z + 1.6,
      fx: b.keeper.x,
      fz: b.keeper.z,
      act: "watch",
    });
  });
  // Picnic tables behind the food row.
  for (let z = 682; z <= 762; z += 16)
    for (const x of [36, 42]) {
      ctx.solid.box(1, 0.08, 2.4, x, Y0 + 0.78, z, MAT.wood());
      ctx.solid.box(0.32, 0.06, 2.4, x - 0.85, Y0 + 0.45, z, MAT.wood());
      ctx.solid.box(0.32, 0.06, 2.4, x + 0.85, Y0 + 0.45, z, MAT.wood());
      addSolid(ctx, x - 0.5, x + 0.5, z - 1.2, z + 1.2);
      stops.push(
        { x: x - 1.1, z, fx: x, fz: z, act: "eat" },
        { x: x + 1.1, z: z + 0.6, fx: x, fz: z, act: "eat" },
      );
    }

  // ---- Games down the east side: the high striker, balloon darts, ring toss, the duck pond, and the Krystal tent.
  const S = F.striker;
  ctx.solid.box(1.4, 0.4, 1.4, S.x + 2, Y0 + 0.2, S.z, std(0x3a2a22, 0.8));
  ctx.solid.box(0.5, 10, 0.3, S.x + 2.6, Y0 + 5, S.z, std(0xf4f1ea, 0.6));
  for (let i = 0; i < 10; i++)
    ctx.flat.box(
      0.52,
      0.05,
      0.32,
      S.x + 2.6,
      Y0 + 1 + i * 0.9,
      S.z,
      emissiveMat(
        ctx,
        [0x39ff14, 0xffd23a, 0xff7a2a, 0xff3b3b][Math.floor(i / 3)] ?? 0xff3b3b,
        0.4,
        2.4,
      ),
    );
  ctx.solid.cyl(0.45, 0.6, 0.6, S.x + 2.6, Y0 + 10.3, S.z, MAT.gold(), 12);
  ctx.flat.wall(
    4,
    0.8,
    S.x + 2.2,
    Y0 + 3.2,
    S.z - 0.9,
    sign("TEST YOUR STRENGTH", "#ffd23a", "#c0262a", { w: 512, h: 96 }),
    YAW.west,
  );
  addSolid(ctx, S.x + 1.2, S.x + 3, S.z - 0.8, S.z + 0.8);
  spots.striker = { x: S.x - 1, z: S.z };
  const puck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.4), std(0xff3b3b, 0.4));
  puck.position.set(S.x + 2.6, Y0 + 0.8, S.z - 0.2);
  group.add(puck);
  booth(ctx, M.maxX + 3, 700, YAW.west, "Balloon Darts", "#ff4fd8", "#ff4fd8", "#f4f1ea");
  for (let i = 0; i < 18; i++)
    ctx.solid.add(
      new THREE.SphereGeometry(0.22, 8, 6),
      std([0xff3b3b, 0xffd23a, 0x2a8aff, 0x39ff14][i % 4]!, 0.3),
      M.maxX + 3.8,
      Y0 + 1.6 + Math.floor(i / 6) * 0.5,
      698 + (i % 6) * 0.7,
    );
  booth(ctx, M.maxX + 3, 742, YAW.west, "Ring Toss", "#5ae0ff", "#2a4ad0", "#f4f1ea");
  booth(ctx, M.maxX + 3, 758, YAW.west, "Duck Pond", "#ffd23a", "#e0b030", "#f4f1ea");
  // The Krystal tent: the eating contest.
  const K = F.krystal;
  ctx.solid.add(
    new THREE.ConeGeometry(7, 3.4, 4, 1, true),
    striped("#2a4ad0", "#f4f1ea"),
    K.x + 6,
    Y0 + 5,
    K.z,
    Math.PI / 4,
  );
  for (const [dx, dz] of [
    [-4.4, -4.4],
    [4.4, -4.4],
    [-4.4, 4.4],
    [4.4, 4.4],
  ] as const)
    ctx.solid.cyl(0.1, 0.1, 3.4, K.x + 6 + dx, Y0 + 1.7, K.z + dz, MAT.steel(), 6);
  ctx.solid.box(7, 0.9, 1.4, K.x + 6, Y0 + 0.45, K.z, std(0xf4f1ea, 0.5));
  ctx.flat.wall(
    7,
    1.1,
    K.x + 0.9,
    Y0 + 3.8,
    K.z,
    neon(ctx, "KRYSTAL EATING CONTEST", "#5ac8ff", { w: 1024, h: 128, border: false }),
    YAW.west,
  );
  addSolid(ctx, K.x + 2.5, K.x + 9.5, K.z - 0.7, K.z + 0.7);
  spots.krystal = { x: K.x + 0.4, z: K.z };

  // ---- Libertyland: the Liberty Bell at its gate.
  const B = F.bell;
  ctx.solid.box(4, 0.6, 4, B.x, Y0 + 0.3, B.z, std(0xd8d2c4, 0.7));
  ctx.solid.box(0.3, 4, 0.3, B.x - 1.6, Y0 + 2.6, B.z, MAT.darkWood());
  ctx.solid.box(0.3, 4, 0.3, B.x + 1.6, Y0 + 2.6, B.z, MAT.darkWood());
  ctx.solid.box(3.6, 0.4, 0.4, B.x, Y0 + 4.6, B.z, MAT.darkWood());
  const bellPts = [
    [0.05, 0],
    [0.9, 0.05],
    [0.85, 0.3],
    [0.7, 0.9],
    [0.55, 1.5],
    [0.5, 1.7],
    [0.2, 1.85],
    [0.05, 1.9],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  ctx.solid.add(new THREE.LatheGeometry(bellPts, 20), std(0x7a5a2a, 0.4, 0.6), B.x, Y0 + 2.4, B.z);
  ctx.flat.wall(
    5,
    1.1,
    B.x,
    Y0 + 6,
    B.z - 0.2,
    sign("LIBERTYLAND", "#f3e9c8", "#2a4ad0", { sub: "LET FREEDOM RING", w: 640, h: 144 }),
    YAW.north,
  );
  ctx.solid.box(5.4, 1.4, 0.3, B.x, Y0 + 6, B.z, std(0x2a4ad0, 0.6));
  addSolid(ctx, B.x - 2, B.x + 2, B.z - 2, B.z + 2);
  spots.bell = { x: B.x, z: B.z - 3 };

  // ---- The Grand Carousel: a round house, the platform turning under it, horses rising and falling.
  const C = F.carousel;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.solid.cyl(
      0.18,
      0.18,
      5,
      C.x + Math.cos(a) * (C.r + 0.6),
      Y0 + 2.5,
      C.z + Math.sin(a) * (C.r + 0.6),
      MAT.gold(),
      8,
    );
    addSolid(
      ctx,
      C.x + Math.cos(a) * (C.r + 0.6) - 0.25,
      C.x + Math.cos(a) * (C.r + 0.6) + 0.25,
      C.z + Math.sin(a) * (C.r + 0.6) - 0.25,
      C.z + Math.sin(a) * (C.r + 0.6) + 0.25,
    );
  }
  ctx.solid.add(
    new THREE.ConeGeometry(C.r + 2, 3.4, 24),
    striped("#c0262a", "#f4f1ea"),
    C.x,
    Y0 + 6.7,
    C.z,
  );
  ctx.solid.cyl(C.r + 1.2, C.r + 1.2, 0.6, C.x, Y0 + 5.1, C.z, std(0xe0b030, 0.5, 0.3), 24);
  ctx.flat.wall(
    8,
    1,
    C.x,
    Y0 + 5.1,
    C.z - C.r - 1.25,
    neon(ctx, "GRAND CAROUSEL", "#ffd23a", { w: 768, h: 112, border: false }),
    YAW.north,
  );
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.flat.add(
      new THREE.SphereGeometry(0.1, 6, 4),
      emissiveMat(ctx, 0xfff0b0, 0.8, 3),
      C.x + Math.cos(a) * (C.r + 1.25),
      Y0 + 4.85,
      C.z + Math.sin(a) * (C.r + 1.25),
    );
  }
  const carousel = new THREE.Group();
  carousel.position.set(C.x, Y0, C.z);
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(C.r - 0.2, C.r - 0.2, 0.3, 32),
    std(0x6a3a1a, 0.6),
  );
  deck.position.y = 0.15;
  carousel.add(deck);
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 4.6, 16),
    std(0xe0b030, 0.4, 0.4),
  );
  core.position.y = 2.6;
  carousel.add(core);
  const horses: THREE.Object3D[] = [];
  const horseCols = [0xf4f1ea, 0x3a2a22, 0xc9a24a, 0x8a5a3a];
  for (let ring = 0; ring < 2; ring++)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + ring * 0.3;
      const r = ring ? 4.4 : 6.6;
      const h = horseMesh(horseCols[(i + ring) % 4]!);
      h.position.set(Math.cos(a) * r, 1, Math.sin(a) * r);
      h.rotation.y = -a;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 4.4, 6),
        new THREE.MeshStandardMaterial({ color: 0xe0b030, metalness: 0.8, roughness: 0.3 }),
      );
      pole.position.set(Math.cos(a) * r, 2.5, Math.sin(a) * r);
      carousel.add(pole, h);
      horses.push(h);
    }
  group.add(carousel);
  spots.carousel = { x: C.x, z: C.z - C.r - 2.2 };
  stops.push(
    { x: C.x - 4, z: C.z - C.r - 3, fx: C.x, fz: C.z, act: "watch" },
    { x: C.x + 3, z: C.z - C.r - 3.4, fx: C.x, fz: C.z, act: "watch" },
  );

  // ---- The Zippin Pippin: white wooden coaster, out and back along the west side.
  const P = F.pippin;
  const st = P.station;
  const pippinCurve = new THREE.CatmullRomCurve3(
    [
      V(st.x, 2.2, st.z),
      V(st.x - 0.5, 2.6, st.z + 12),
      V(st.x - 1.5, 13, st.z + 30),
      V(st.x - 2, 22, st.z + 46),
      V(st.x - 3, 22.4, st.z + 52),
      V(st.x - 6, 4, st.z + 70),
      V(st.x - 12, 15, st.z + 86),
      V(st.x - 20, 5, st.z + 100),
      V(st.x - 34, 10, st.z + 116),
      V(st.x - 52, 11, st.z + 116),
      V(st.x - 66, 6, st.z + 104),
      V(st.x - 70, 15, st.z + 86),
      V(st.x - 70, 4, st.z + 68),
      V(st.x - 68, 11, st.z + 50),
      V(st.x - 64, 3.4, st.z + 32),
      V(st.x - 56, 6.5, st.z + 16),
      V(st.x - 40, 3.2, st.z + 2),
      V(st.x - 18, 2.4, st.z - 2),
    ],
    true,
    "centripetal",
  );
  const pippinLen = pippinCurve.getLength();
  const wood = std(0xf2efe6, 0.85);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 240; i++) {
    const u = i / 240;
    const p = pippinCurve.getPointAt(u);
    const t = pippinCurve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(t, up).normalize();
    bent(ctx, p.clone().setY(p.y - 0.35), side, wood);
    // The ties under the rails.
    ctx.solid.box(
      Math.abs(side.x) * 1.8 + 0.25,
      0.14,
      Math.abs(side.z) * 1.8 + 0.25,
      p.x,
      p.y - 0.25,
      p.z,
      std(0x6a5a4a, 0.8),
    );
  }
  rails(
    pippinCurve,
    0.65,
    600,
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.8, roughness: 0.35 }),
    group,
  );
  // The station house and the name over it.
  ctx.solid.box(6, 0.4, 16, st.x + 3.6, Y0 + 1.9, st.z + 2, MAT.wood());
  ctx.solid.box(8, 0.3, 18, st.x + 1.6, Y0 + 5.4, st.z + 2, std(0xc0262a, 0.6));
  for (const [dx, dz] of [
    [-2.4, -6.8],
    [5.6, -6.8],
    [-2.4, 10.8],
    [5.6, 10.8],
  ] as const) {
    ctx.solid.box(0.25, 5.4, 0.25, st.x + dx, Y0 + 2.7, st.z + dz, wood);
    addSolid(ctx, st.x + dx - 0.2, st.x + dx + 0.2, st.z + dz - 0.2, st.z + dz + 0.2);
  }
  ctx.solid.box(0.4, 1.9, 16, st.x + 6.4, Y0 + 0.95, st.z + 2, MAT.wood());
  ctx.flat.wall(
    9,
    1.4,
    st.x + 1.6,
    Y0 + 6.4,
    st.z - 7.1,
    neon(ctx, "ZIPPIN PIPPIN", "#ff3b3b", { sub: "SINCE 1923", w: 768, h: 160, border: true }),
    YAW.north,
  );
  addSolid(ctx, P.area.minX, st.x - 2, P.area.minZ, P.area.maxZ);
  spots.pippin = { x: st.x + 7.8, z: st.z + 2 };
  stops.push(
    { x: st.x + 8.6, z: st.z - 2, fx: st.x, fz: st.z + 20, act: "watch" },
    { x: st.x + 9.2, z: st.z + 6, fx: st.x, fz: st.z + 20, act: "cheer" },
  );
  const train = new THREE.Group();
  for (let i = 0; i < 3; i++) train.add(coasterCar([0xc0262a, 0x2a4ad0, 0xe0b030][i]!));
  group.add(train);

  // ---- The log flume at the back of Libertyland.
  const FL = F.flume;
  const fx0 = FL.minX + 4;
  const fz0 = FL.minZ + 6;
  const flumeCurve = new THREE.CatmullRomCurve3(
    [
      V(fx0 + 10, 0.7, fz0),
      V(fx0 + 30, 0.7, fz0),
      V(fx0 + 44, 0.7, fz0 + 10),
      V(fx0 + 48, 4.5, fz0 + 26),
      V(fx0 + 48, 10, fz0 + 44),
      V(fx0 + 44, 10.4, fz0 + 60),
      V(fx0 + 30, 10.2, fz0 + 66),
      V(fx0 + 14, 9.8, fz0 + 66),
      V(fx0 + 4, 1.2, fz0 + 64),
      V(fx0 - 0, 0.7, fz0 + 52),
      V(fx0 + 0, 0.7, fz0 + 30),
      V(fx0 + 2, 0.7, fz0 + 10),
    ],
    true,
    "centripetal",
  );
  const flumeLen = flumeCurve.getLength();
  ctx.solid.add(trough(flumeCurve, 1.4, 260), std(0xc9a24a, 0.6), 0, 0, 0);
  const waterGeo = trough(flumeCurve, 1.1, 260);
  const waterMesh = new THREE.Mesh(
    waterGeo,
    new THREE.MeshStandardMaterial({
      color: 0x4ab8f0,
      emissive: 0x1a6ab0,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  waterMesh.position.y = 0.35;
  group.add(waterMesh);
  for (let i = 0; i < 70; i++) {
    const p = flumeCurve.getPointAt(i / 70);
    if (p.y - Y0 < 1.8) continue;
    ctx.solid.box(0.3, p.y - Y0 - 1.2, 0.3, p.x, Y0 + (p.y - Y0 - 1.2) / 2, p.z, wood);
  }
  // A mountain the drop comes down: rock with trees on it.
  ctx.solid.add(
    new THREE.ConeGeometry(12, 9, 9),
    std(0x6a5a48, 0.95),
    fx0 + 22,
    Y0 + 4.5,
    fz0 + 56,
  );
  for (const [dx, dz] of [
    [16, 52],
    [26, 54],
    [22, 46],
  ] as const)
    tree(ctx, fx0 + dx, fz0 + dz, 0.9, Y0 + 3);
  addSolid(ctx, fx0 + 14, fx0 + 30, fz0 + 48, fz0 + 62);
  ctx.flat.wall(
    8,
    1.2,
    fx0 + 20,
    Y0 + 3,
    fz0 - 3.2,
    neon(ctx, "LOG FLUME", "#5ae0ff", { w: 640, h: 112, border: false }),
    YAW.north,
  );
  spots.flume = { x: fx0 + 16, z: fz0 - 3.4 };
  const logBoat = new THREE.Group();
  const logBody = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 4, 10), std(0x7a4a22, 0.9));
  logBody.rotation.x = Math.PI / 2;
  logBody.position.y = 0.4;
  logBoat.add(logBody);
  const logs = [new THREE.Group(), new THREE.Group()];
  logs[0]!.add(logBoat);
  logs[1]!.add(logBoat.clone());
  for (const l of logs) group.add(l);

  // ---- The Ferris wheel, facing the gate.
  const W = F.ferris;
  const wheel = new THREE.Group();
  wheel.position.set(W.x, Y0 + W.hub, W.z);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(W.r, 0.18, 6, 48),
    new THREE.MeshStandardMaterial({
      color: 0xf4f1ea,
      metalness: 0.4,
      roughness: 0.4,
      emissive: 0xffd23a,
      emissiveIntensity: 0.15,
    }),
  );
  wheel.add(rim);
  const rim2 = rim.clone();
  rim2.position.z = 1.4;
  wheel.add(rim2);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.1, W.r, 0.1), MAT.white());
    spoke.position.set(Math.sin(a) * (W.r / 2), -Math.cos(a) * (W.r / 2), 0.7);
    spoke.rotation.z = a;
    wheel.add(spoke);
  }
  group.add(wheel);
  const legMat = MAT.white();
  for (const s of [-1, 1])
    for (const dz of [-1.4, 2.8]) {
      const leg = new THREE.BoxGeometry(0.4, W.hub + 1, 0.4);
      ctx.solid.add(leg, legMat, W.x + s * 5, Y0 + W.hub / 2, W.z + dz, 0, 0, -s * 0.26);
      addSolid(ctx, W.x + s * 9.5 - 0.4, W.x + s * 9.5 + 0.4, W.z + dz - 0.4, W.z + dz + 0.4);
    }
  const gondolas: THREE.Group[] = [];
  const gCols = [0xc0262a, 0xffd23a, 0x2a4ad0, 0x39c86a, 0xff7ad8, 0xff7a2a];
  for (let i = 0; i < 12; i++) {
    const gnd = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.4), std(gCols[i % 6]!, 0.5));
    cab.position.y = -1;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.6, 4), std(0xf4f1ea, 0.6));
    roof.position.y = -0.1;
    roof.rotation.y = Math.PI / 4;
    gnd.add(cab, roof);
    group.add(gnd);
    gondolas.push(gnd);
  }
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 6, 4),
      emissiveMat(ctx, cols[i % cols.length]!, 0.8, 3.4),
    );
    b.position.set(Math.sin(a) * W.r, -Math.cos(a) * W.r, 0.7);
    wheel.add(b);
  }
  ctx.flat.wall(
    8,
    1,
    W.x,
    Y0 + 1.2,
    W.z - 3.5,
    sign("FERRIS WHEEL", "#ffd23a", "#2a4ad0", { w: 512, h: 96 }),
    YAW.north,
  );
  spots.ferris = { x: W.x, z: W.z - 4.6 };
  stops.push(
    { x: W.x - 3, z: W.z - 5.6, fx: W.x, fz: W.z, act: "watch" },
    { x: W.x + 2.4, z: W.z - 6.2, fx: W.x, fz: W.z, act: "watch" },
  );

  // ---- Bumper cars under their roof.
  const BC = F.bumper;
  const bcx = (BC.minX + BC.maxX) / 2;
  const bcz = (BC.minZ + BC.maxZ) / 2;
  ctx.ground.flat(
    BC.maxX - BC.minX,
    BC.maxZ - BC.minZ,
    bcx,
    Y0 + 0.012,
    bcz,
    std(0x5a5e66, 0.4, 0.6),
  );
  for (const [x0, z0, x1, z1] of [
    [BC.minX, BC.minZ, BC.maxX, BC.minZ],
    [BC.minX, BC.maxZ, BC.maxX, BC.maxZ],
    [BC.minX, BC.minZ, BC.minX, BC.maxZ],
    [BC.maxX, BC.minZ, BC.maxX, BC.maxZ],
  ] as const)
    ctx.solid.box(
      Math.abs(x1 - x0) + 0.3,
      0.6,
      Math.abs(z1 - z0) + 0.3,
      (x0 + x1) / 2,
      Y0 + 0.3,
      (z0 + z1) / 2,
      std(0xffd23a, 0.5),
    );
  for (const [x, z] of [
    [BC.minX, BC.minZ],
    [BC.maxX, BC.minZ],
    [BC.minX, BC.maxZ],
    [BC.maxX, BC.maxZ],
  ] as const) {
    ctx.solid.box(0.4, 6, 0.4, x, Y0 + 3, z, MAT.steel());
    addSolid(ctx, x - 0.3, x + 0.3, z - 0.3, z + 0.3);
  }
  ctx.solid.box(
    BC.maxX - BC.minX + 2,
    0.4,
    BC.maxZ - BC.minZ + 2,
    bcx,
    Y0 + 6.1,
    bcz,
    std(0x1a1a1e, 0.6),
  );
  ctx.flat.box(
    BC.maxX - BC.minX,
    0.12,
    BC.maxZ - BC.minZ,
    bcx,
    Y0 + 5.85,
    bcz,
    emissiveMat(ctx, 0xff4fd8, 0.4, 1.6),
  );
  ctx.flat.wall(
    12,
    1.4,
    bcx,
    Y0 + 6.9,
    BC.minZ - 1.05,
    neon(ctx, "BUMPER CARS", "#39ff14", { w: 768, h: 128, border: false }),
    YAW.north,
  );
  spots.bumper = { x: bcx, z: BC.minZ - 1.6 };
  const bumperCars: THREE.Group[] = [];
  const carCols = [0xc0262a, 0x2a4ad0, 0xffd23a, 0x39c86a, 0xff7ad8, 0xff7a2a, 0x8a5aff];
  for (let i = 0; i < 7; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 2.2), std(carCols[i]!, 0.35, 0.2));
    body.position.y = 0.4;
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.16, 6, 20), std(0x111111, 0.8));
    bumper.rotation.x = Math.PI / 2;
    bumper.scale.set(0.75, 1.05, 1);
    bumper.position.y = 0.3;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5, 4), MAT.steel());
    pole.position.set(0, 3, -0.8);
    car.add(body, bumper, pole);
    car.position.set(bcx - 12 + (i % 4) * 8, Y0, bcz - 6 + Math.floor(i / 4) * 10);
    car.userData = { vx: 0, vz: 0, heading: i, turn: 0 };
    group.add(car);
    bumperCars.push(car);
  }

  // ---- Teacups.
  const T = F.teacups;
  const teacups = new THREE.Group();
  teacups.position.set(T.x, Y0, T.z);
  const tdeck = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.3, 32), std(0xf4f1ea, 0.5));
  tdeck.position.y = 0.15;
  teacups.add(tdeck);
  const cups: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cup = new THREE.Group();
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 0.8, 1.1, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: gCols[i]!, roughness: 0.4, side: THREE.DoubleSide }),
    );
    bowl.position.y = 0.85;
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.08, 6, 12, Math.PI),
      std(gCols[i]!, 0.4),
    );
    handle.position.set(1.25, 0.9, 0);
    handle.rotation.z = -Math.PI / 2;
    cup.add(bowl, handle);
    cup.position.set(Math.cos(a) * (T.r - 2.4), 0, Math.sin(a) * (T.r - 2.4));
    teacups.add(cup);
    cups.push(cup);
  }
  group.add(teacups);
  addSolid(ctx, T.x - T.r, T.x + T.r, T.z - T.r, T.z + T.r);
  ctx.flat.wall(
    6,
    0.9,
    T.x,
    Y0 + 1,
    T.z - T.r - 0.6,
    sign("TEACUPS", "#ff7ad8", "#f4f1ea", { w: 384, h: 96 }),
    YAW.north,
  );

  // ---- The swings: chairs on chains, flying out as the top turns.
  const SW = F.swings;
  ctx.solid.cyl(0.6, 0.8, 12, SW.x, Y0 + 6, SW.z, std(0xe0b030, 0.5, 0.3), 12);
  addSolid(ctx, SW.x - 1, SW.x + 1, SW.z - 1, SW.z + 1);
  const swingTop = new THREE.Group();
  swingTop.position.set(SW.x, Y0 + 11, SW.z);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(SW.r, 2, 24), striped("#2a4ad0", "#ffd23a"));
  canopy.position.y = 1;
  swingTop.add(canopy);
  const chairs: THREE.Group[] = [];
  for (let i = 0; i < 16; i++) {
    const arm = new THREE.Group();
    const a = (i / 16) * Math.PI * 2;
    arm.position.set(Math.cos(a) * (SW.r - 1), 0, Math.sin(a) * (SW.r - 1));
    arm.rotation.y = -a;
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.04, 5, 0.04), MAT.steel());
    chain.position.y = -2.5;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), std(cols[i % 5]!, 0.5));
    seat.position.y = -5;
    arm.add(chain, seat);
    swingTop.add(arm);
    chairs.push(arm);
  }
  group.add(swingTop);

  // ---- The drop tower.
  const D = F.drop;
  ctx.solid.box(1.6, D.h, 1.6, D.x, Y0 + D.h / 2, D.z, std(0xd8262a, 0.5));
  ctx.solid.add(
    new THREE.ConeGeometry(1.6, 3, 4),
    std(0xffd23a, 0.5),
    D.x,
    Y0 + D.h + 1.5,
    D.z,
    Math.PI / 4,
  );
  for (let y = 4; y < D.h; y += 4)
    ctx.flat.box(1.66, 0.12, 1.66, D.x, Y0 + y, D.z, emissiveMat(ctx, cols[(y / 4) % 5]!, 0.6, 3));
  addSolid(ctx, D.x - 2.6, D.x + 2.6, D.z - 2.6, D.z + 2.6);
  const dropCar = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 1, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: 0.4, side: THREE.DoubleSide }),
  );
  dropCar.add(ring);
  dropCar.position.set(D.x, Y0 + 1.2, D.z);
  group.add(dropCar);
  ctx.flat.wall(
    8,
    1.1,
    D.x,
    Y0 + 1.6,
    D.z - 3.2,
    neon(ctx, "FREE FALL", "#ff3b3b", { w: 512, h: 112, border: false }),
    YAW.north,
  );
  spots.drop = { x: D.x - 4, z: D.z - 3.4 };

  // ---- Kiddie rides: a little train round an oval.
  const KR = F.kiddie;
  const kOval = new THREE.CatmullRomCurve3(
    [
      V(KR.x - 8, 0.1, KR.z - 4),
      V(KR.x + 8, 0.1, KR.z - 4),
      V(KR.x + 10, 0.1, KR.z),
      V(KR.x + 8, 0.1, KR.z + 4),
      V(KR.x - 8, 0.1, KR.z + 4),
      V(KR.x - 10, 0.1, KR.z),
    ],
    true,
  );
  ctx.ground.add(new THREE.TubeGeometry(kOval, 60, 0.4, 4, true), std(0x5a4a3a, 0.9), 0, 0, 0);
  const kTrain = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1.4), std(gCols[i]!, 0.5));
    c.position.set(0, 0.6, -i * 1.6);
    kTrain.add(c);
  }
  group.add(kTrain);
  ctx.flat.wall(
    6,
    0.9,
    KR.x,
    Y0 + 1.4,
    KR.z - 5.6,
    sign("KIDDIELAND", "#ffd23a", "#c0262a", { w: 384, h: 96 }),
    YAW.north,
  );
  stops.push(
    { x: KR.x - 3, z: KR.z - 6.4, fx: KR.x, fz: KR.z, act: "cheer" },
    { x: KR.x + 4, z: KR.z - 6.6, fx: KR.x, fz: KR.z, act: "watch" },
  );

  // ---- The pig races: a little oval track with rails, a bench and four pigs.
  const PG = F.pigs;
  ctx.ground.flat(PG.halfX * 2 + 4, PG.halfZ * 2 + 4, PG.x, Y0 + 0.01, PG.z, dirt);
  for (const s of [-1, 1]) {
    ctx.solid.box(
      PG.halfX * 2 + 4,
      0.7,
      0.12,
      PG.x,
      Y0 + 0.35,
      PG.z + s * (PG.halfZ + 2),
      MAT.wood(),
    );
    ctx.solid.box(
      0.12,
      0.7,
      PG.halfZ * 2 + 4,
      PG.x + s * (PG.halfX + 2),
      Y0 + 0.35,
      PG.z,
      MAT.wood(),
    );
  }
  ctx.solid.box(PG.halfX * 2 - 4, 0.5, 2, PG.x, Y0 + 0.25, PG.z, grass);
  ctx.solid.box(PG.halfX * 2, 0.4, 1, PG.x, Y0 + 0.45, PG.z - PG.halfZ - 3.6, MAT.wood());
  ctx.flat.wall(
    10,
    1.2,
    PG.x,
    Y0 + 2.4,
    PG.z + PG.halfZ + 2.2,
    sign("RACING PIGS", "#ff7ad8", "#3a2a22", { sub: "POST TIME EVERY HALF HOUR", w: 640, h: 144 }),
    YAW.north,
  );
  ctx.solid.box(10.4, 1.6, 0.2, PG.x, Y0 + 2.4, PG.z + PG.halfZ + 2.35, MAT.wood());
  spots.pigs = { x: PG.x, z: PG.z - PG.halfZ - 4.6 };
  const pigs: THREE.Group[] = [];
  const pigCols = [0xffb0c0, 0xf0a0b0, 0xe8c0a8, 0x3a2a2a];
  for (let i = 0; i < 4; i++) {
    const pig = pigMesh(pigCols[i]!);
    group.add(pig);
    pigs.push(pig);
  }
  for (let i = 0; i < 6; i++)
    stops.push({
      x: PG.x - 6 + i * 2.4,
      z: PG.z - PG.halfZ - 4.2,
      fx: PG.x - 6 + i * 2.4,
      fz: PG.z,
      act: i % 2 ? "cheer" : "watch",
    });

  // ---- The rodeo arena: dirt, a fence, the chutes, the stand on the north side, a bull in the chute.
  const R = F.rodeo;
  const rcx = (R.minX + R.maxX) / 2;
  const rcz = (R.minZ + R.maxZ) / 2;
  ctx.ground.flat(R.maxX - R.minX, R.maxZ - R.minZ - 8, rcx, Y0 + 0.012, rcz + 4, dirt, 0, 6);
  for (const [x0, z0, x1, z1] of [
    [R.minX, R.minZ + 8, R.maxX, R.minZ + 8],
    [R.minX, R.maxZ, R.maxX, R.maxZ],
    [R.minX, R.minZ + 8, R.minX, R.maxZ],
    [R.maxX, R.minZ + 8, R.maxX, R.maxZ],
  ] as const) {
    for (const y of [0.5, 1.1, 1.7])
      ctx.solid.box(
        Math.abs(x1 - x0) + 0.1,
        0.14,
        Math.abs(z1 - z0) + 0.1,
        (x0 + x1) / 2,
        Y0 + y,
        (z0 + z1) / 2,
        std(0xf4f1ea, 0.7),
      );
    addSolid(
      ctx,
      Math.min(x0, x1) - 0.1,
      Math.max(x0, x1) + 0.1,
      Math.min(z0, z1) - 0.1,
      Math.max(z0, z1) + 0.1,
    );
  }
  for (let i = 0; i < 4; i++) {
    const y = 0.4 + i * 0.5;
    ctx.solid.box(
      R.maxX - R.minX - 8,
      y,
      1.5,
      rcx,
      Y0 + y / 2,
      R.minZ + 1 + i * 1.5,
      std(0x8a8f96, 0.5, 0.5),
    );
  }
  addSolid(ctx, R.minX + 4, R.maxX - 4, R.minZ, R.minZ + 6.5);
  for (let i = 0; i < 4; i++)
    ctx.solid.box(0.14, 2.2, 4, R.maxX - 2 - i * 3, Y0 + 1.1, R.maxZ - 4, MAT.wood());
  ctx.flat.wall(
    14,
    1.6,
    rcx,
    Y0 + 4.4,
    R.minZ - 0.1,
    neon(ctx, "PRCA RODEO", "#ffd23a", { sub: "SINCE 1936", w: 768, h: 160, border: false }),
    YAW.north,
  );
  ctx.solid.box(14.4, 2, 0.3, rcx, Y0 + 4.4, R.minZ + 0.1, std(0x3a2a22, 0.7));
  for (const s of [-1, 1])
    ctx.solid.box(0.3, 3.4, 0.3, rcx + s * 7, Y0 + 1.7, R.minZ + 0.1, std(0x3a2a22, 0.7));
  spots.rodeo = { x: rcx + 12, z: R.minZ - 1.4 };
  for (let i = 0; i < 10; i++)
    stops.push({
      x: R.minX + 8 + i * 5,
      z: R.minZ + 1 + (i % 4) * 1.5,
      fx: R.minX + 8 + i * 5,
      fz: rcz + 6,
      act: i % 3 ? "watch" : "cheer",
      lift: 0.4 + (i % 4) * 0.5,
    });
  const bull = bullMesh();
  bull.position.set(rcx, Y0, rcz + 6);
  group.add(bull);

  // ---- The barns: long red barns with the livestock shows, and the petting zoo in front.
  const BN = F.barns;
  for (let i = 0; i < 2; i++) {
    const x0 = BN.minX + i * 36;
    const bw = 32;
    const bd = BN.maxZ - BN.minZ;
    ctx.solid.box(bw, 5, bd, x0 + bw / 2, Y0 + 2.5, (BN.minZ + BN.maxZ) / 2, std(0xa0261c, 0.8));
    // A low gambrel roof in galvanised metal.
    const roof = new THREE.CylinderGeometry(
      bd / 2 + 0.6,
      bd / 2 + 0.6,
      bw + 1,
      4,
      1,
      false,
      0,
      Math.PI,
    );
    roof.scale(0.4, 1, 1);
    ctx.solid.add(
      roof,
      std(0x9aa1a8, 0.5, 0.4),
      x0 + bw / 2,
      Y0 + 5,
      (BN.minZ + BN.maxZ) / 2,
      0,
      0,
      Math.PI / 2,
    );
    ctx.solid.box(5, 3.6, 0.2, x0 + bw / 2, Y0 + 1.8, BN.minZ - 0.08, std(0x2a1a14, 0.8));
    for (const s of [-1, 1])
      ctx.solid.box(
        0.12,
        3.6,
        0.22,
        x0 + bw / 2 + s * 1.5,
        Y0 + 1.8,
        BN.minZ - 0.12,
        std(0xf4f1ea, 0.7),
      );
    ctx.flat.wall(
      12,
      1.2,
      x0 + bw / 2,
      Y0 + 4.2,
      BN.minZ - 0.14,
      sign(i ? "4-H LIVESTOCK" : "AGRICULTURE BUILDING", "#f3e9c8", "#a0261c", { w: 640, h: 96 }),
      YAW.north,
    );
    addSolid(ctx, x0, x0 + bw, BN.minZ, BN.maxZ);
  }
  // Cows in a pen outside the barns, a horse, and the goats and sheep in the petting zoo.
  for (let i = 0; i < 4; i++) {
    const cow = cowMesh(i % 2 ? 0x3a2a22 : 0xf4f1ea);
    cow.position.set(BN.minX + 34 + i * 4, Y0, BN.minZ - 4);
    cow.rotation.y = i * 0.7;
    group.add(cow);
  }
  ctx.solid.box(18, 1.2, 0.1, BN.minX + 40, Y0 + 0.6, BN.minZ - 7.5, MAT.wood());
  addSolid(ctx, BN.minX + 31, BN.minX + 49, BN.minZ - 7.6, BN.minZ - 7.4);
  const Z = F.zoo;
  for (const [x0, z0, x1, z1] of [
    [Z.minX, Z.minZ, Z.maxX, Z.minZ],
    [Z.minX, Z.maxZ, Z.maxX, Z.maxZ],
    [Z.minX, Z.minZ, Z.minX, Z.maxZ],
    [Z.maxX, Z.minZ, Z.maxX, Z.maxZ],
  ] as const) {
    ctx.solid.box(
      Math.abs(x1 - x0) + 0.1,
      1,
      Math.abs(z1 - z0) + 0.1,
      (x0 + x1) / 2,
      Y0 + 0.5,
      (z0 + z1) / 2,
      MAT.wood(),
    );
    addSolid(
      ctx,
      Math.min(x0, x1) - 0.06,
      Math.max(x0, x1) + 0.06,
      Math.min(z0, z1) - 0.06,
      Math.max(z0, z1) + 0.06,
    );
  }
  ctx.ground.flat(
    Z.maxX - Z.minX,
    Z.maxZ - Z.minZ,
    (Z.minX + Z.maxX) / 2,
    Y0 + 0.014,
    (Z.minZ + Z.maxZ) / 2,
    std(0xc9a870, 0.95),
  );
  const goats: THREE.Group[] = [];
  for (let i = 0; i < 7; i++) {
    const goat = goatMesh(i % 3 ? 0xf4f1ea : 0x8a6a4a);
    goat.position.set(Z.minX + 3 + (i % 4) * 6, Y0, Z.minZ + 3 + Math.floor(i / 4) * 7);
    group.add(goat);
    goats.push(goat);
  }
  ctx.flat.wall(
    8,
    1,
    (Z.minX + Z.maxX) / 2,
    Y0 + 1.6,
    Z.minZ - 0.2,
    sign("PETTING ZOO", "#ffd23a", "#3a6a2a", { w: 512, h: 96 }),
    YAW.north,
  );
  for (let i = 0; i < 5; i++)
    stops.push({
      x: Z.minX + 2 + i * 5,
      z: Z.minZ - 1.2,
      fx: Z.minX + 2 + i * 5,
      fz: Z.minZ + 4,
      act: i % 2 ? "cheer" : "watch",
    });

  // ---- The stage: the Youth Talent Contest and the night's concert, a lawn in front of it.
  const SG = F.stage;
  ctx.solid.box(SG.d, 1.2, SG.w, SG.x, Y0 + 0.6, SG.z, MAT.darkWood());
  addSolid(ctx, SG.x - SG.d / 2, SG.x + SG.d / 2, SG.z - SG.w / 2, SG.z + SG.w / 2);
  for (const dz of [-SG.w / 2, SG.w / 2])
    for (const dx of [-SG.d / 2, SG.d / 2])
      ctx.solid.box(0.3, 8, 0.3, SG.x + dx, Y0 + 4, SG.z + dz, MAT.black());
  ctx.solid.box(SG.d + 0.6, 0.4, SG.w + 0.6, SG.x, Y0 + 8, SG.z, MAT.black());
  ctx.solid.box(0.3, 6.8, SG.w, SG.x + SG.d / 2, Y0 + 4.6, SG.z, std(0x2a1028, 0.9));
  ctx.flat.wall(
    14,
    1.6,
    SG.x + SG.d / 2 - 0.2,
    Y0 + 6.6,
    SG.z,
    neon(ctx, "YOUTH TALENT CONTEST", "#ff4fd8", {
      sub: "SINCE 1953 · TONIGHT",
      w: 1024,
      h: 192,
      border: true,
    }),
    YAW.west,
  );
  for (const s of [-1, 1]) {
    ctx.solid.box(
      1.2,
      2.6,
      1.2,
      SG.x - SG.d / 2 + 0.8,
      Y0 + 2.5,
      SG.z + s * (SG.w / 2 - 1),
      MAT.black(),
    );
    ctx.flat.wall(
      1,
      2,
      SG.x - SG.d / 2 + 0.18,
      Y0 + 2.5,
      SG.z + s * (SG.w / 2 - 1),
      std(0x1f1c1a, 0.9),
      YAW.west,
    );
  }
  for (let i = 0; i < 6; i++)
    ctx.flat.add(
      new THREE.CircleGeometry(0.25, 12),
      emissiveMat(ctx, cols[i % 5]!, 1, 3.4),
      SG.x - SG.d / 2 + 0.3,
      Y0 + 7.7,
      SG.z - 6 + i * 2.4,
      -Math.PI / 2,
    );
  ctx.lamps.push({ x: SG.x - 4, y: Y0 + 6, z: SG.z, color: 0xff7ad8 });
  spots.stage = { x: SG.x - SG.d / 2 - 2.6, z: SG.z };
  for (let i = 0; i < 14; i++)
    stops.push({
      x: SG.x - SG.d / 2 - 6 - (i % 4) * 3,
      z: SG.z - 7 + Math.floor(i / 4) * 4 + (i % 2),
      fx: SG.x,
      fz: SG.z,
      act: i % 3 === 0 ? "cheer" : "dance",
    });

  // ---- The show ring: the stunt dogs over bars and through a hoop, a clown juggling at the rail,
  // the magic and puppet booth, and the boards for the pageant and the night's concert.
  const SR = F.shows;
  ctx.ground.add(
    new THREE.CircleGeometry(SR.r, 32),
    std(0xb08a5a, 1),
    SR.x,
    Y0 + 0.012,
    SR.z,
    0,
    -Math.PI / 2,
  );
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = SR.x + Math.cos(a) * (SR.r + 0.3);
    const z = SR.z + Math.sin(a) * (SR.r + 0.3);
    if (Math.abs(a - Math.PI) < 0.3) continue;
    ctx.solid.box(
      0.1,
      0.9,
      2.2,
      x,
      Y0 + 0.45,
      z,
      i % 2 ? std(0xf4f1ea, 0.6) : std(0x2a6ad0, 0.6),
      -a,
    );
  }
  const hoopAt = { a: 0, x: SR.x + 5, z: SR.z };
  for (const s of [-1, 1])
    ctx.solid.cyl(0.05, 0.05, 1.6, hoopAt.x, Y0 + 0.8, hoopAt.z + s * 0.75, MAT.steel(), 6);
  ctx.solid.add(
    new THREE.TorusGeometry(0.7, 0.07, 6, 24),
    std(0xff3b3b, 0.5),
    hoopAt.x,
    Y0 + 1.5,
    hoopAt.z,
    Math.PI / 2,
  );
  for (const a of [(Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const x = SR.x + Math.cos(a) * 5;
    const z = SR.z + Math.sin(a) * 5;
    const yaw = -a;
    for (const s of [-0.7, 0.7])
      ctx.solid.box(
        0.08,
        0.8,
        0.08,
        x - Math.sin(a) * s,
        Y0 + 0.4,
        z + Math.cos(a) * s,
        std(0xf4f1ea, 0.6),
      );
    ctx.solid.box(0.06, 0.06, 1.5, x, Y0 + 0.7, z, std(0xffd23a, 0.5), yaw);
  }
  // A ramp up and over in the middle.
  ctx.solid.add(
    new THREE.BoxGeometry(1.2, 0.1, 3),
    std(0x39c86a, 0.7),
    SR.x - 1.3,
    Y0 + 0.7,
    SR.z,
    0,
    0,
    0.5,
  );
  ctx.solid.add(
    new THREE.BoxGeometry(1.2, 0.1, 3),
    std(0x39c86a, 0.7),
    SR.x + 1.3,
    Y0 + 0.7,
    SR.z,
    0,
    0,
    -0.5,
  );
  const dogs: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const d = dogMesh([0xc8a070, 0x1a1a1a, 0xf4f1ea][i]!);
    group.add(d);
    dogs.push(d);
  }
  const clown = clownMesh();
  clown.position.set(SR.x - SR.r - 1.6, Y0, SR.z + 3);
  clown.rotation.y = YAW.east;
  group.add(clown);
  const balls: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      std([0xff3b3b, 0xffd23a, 0x2a6ad0][i]!, 0.4),
    );
    group.add(b);
    balls.push(b);
  }
  ctx.flat.wall(
    8,
    1.2,
    SR.x,
    Y0 + 3.2,
    SR.z + SR.r + 1.6,
    neon(ctx, "STUNT DOG SHOW", "#5ae0ff", {
      sub: "EVERY HOUR · FREE",
      w: 768,
      h: 128,
      border: true,
    }),
    YAW.west,
  );
  for (const s of [-3.6, 3.6])
    ctx.solid.box(0.15, 3.8, 0.15, SR.x + s, Y0 + 1.9, SR.z + SR.r + 1.6, MAT.black());
  // The magic and puppet booth: a little striped stage with its curtain.
  const MB = { x: SR.x - 2, z: SR.z - SR.r - 5 };
  ctx.solid.box(4, 1, 2.6, MB.x, Y0 + 0.5, MB.z, MAT.darkWood());
  ctx.solid.box(4.4, 0.3, 3, MB.x, Y0 + 3.6, MB.z, striped("#7a2aa0", "#ffd23a"));
  for (const s of [-1.9, 1.9])
    ctx.solid.box(0.2, 2.6, 0.2, MB.x + s, Y0 + 2.3, MB.z + 1.2, MAT.black());
  ctx.solid.box(4, 2.6, 0.12, MB.x, Y0 + 2.3, MB.z - 1.2, std(0x6a1020, 0.9));
  ctx.flat.wall(
    4.2,
    0.8,
    MB.x,
    Y0 + 4.2,
    MB.z + 1.5,
    sign("MAGIC · CLOWNS · PUPPETS", "#ffd23a", "#4a1a6a", { w: 512, h: 96 }),
    YAW.east,
  );
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), MAT.black());
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 16), MAT.black());
  crown.position.y = 0.18;
  const rabbit = new THREE.Group();
  const rb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), MAT.white());
  rabbit.add(rb);
  for (const s of [-0.05, 0.05]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.02), MAT.white());
    ear.position.set(s, 0.17, 0);
    rabbit.add(ear);
  }
  hat.add(brim, crown, rabbit);
  hat.position.set(MB.x, Y0 + 1.03, MB.z);
  group.add(hat);
  addSolid(ctx, MB.x - 2, MB.x + 2, MB.z - 1.3, MB.z + 1.3);
  spots.dogs = { x: SR.x - SR.r - 1.4, z: SR.z };
  for (let i = 0; i < 10; i++) {
    const a = Math.PI + (i - 4.5) * 0.24;
    const rr = SR.r + 2 + (i % 2) * 1.4;
    stops.push({
      x: SR.x + Math.cos(a) * rr,
      z: SR.z + Math.sin(a) * rr,
      fx: SR.x,
      fz: SR.z,
      act: i % 3 ? "watch" : "cheer",
    });
  }
  for (let i = 0; i < 4; i++)
    stops.push({
      x: MB.x - 1.5 + i,
      z: MB.z + 3.4 + (i % 2),
      fx: MB.x,
      fz: MB.z,
      act: i % 2 ? "cheer" : "watch",
    });
  // Boards at the stage: the pageant and the night's concert.
  ctx.flat.wall(
    9,
    2.4,
    SG.x - SG.d / 2 - 1,
    Y0 + 3.2,
    SG.z - SG.w / 2 - 3,
    neon(ctx, "MISS MID-SOUTH FAIR", "#ff7ad8", {
      sub: "PAGEANT · SATURDAY 7PM",
      w: 768,
      h: 192,
      border: true,
    }),
    YAW.west,
  );
  ctx.flat.wall(
    9,
    2.4,
    SG.x - SG.d / 2 - 1,
    Y0 + 3.2,
    SG.z + SG.w / 2 + 3,
    neon(ctx, "CONCERT TONIGHT", "#ffd23a", {
      sub: "LIVE ON THE MAIN STAGE · 9PM",
      w: 768,
      h: 192,
      border: true,
    }),
    YAW.west,
  );
  for (const dz of [-SG.w / 2 - 3, SG.w / 2 + 3])
    for (const s of [-4, 4])
      ctx.solid.box(0.15, 4.4, 0.15, SG.x - SG.d / 2 - 0.9, Y0 + 2.2, SG.z + dz + s, MAT.black());
  let show = 0;

  // Trees round the edge.
  for (let x = F.minX + 6; x < F.maxX - 3; x += 18)
    if (x < 44 || x > 76) tree(ctx, x, F.minZ + 3, 1.1, Y0);
  for (let z = F.minZ + 10; z < F.maxZ - 4; z += 18) tree(ctx, F.maxX - 2.6, z, 1.1, Y0);
  bench(ctx, M.minX + 2, 790, YAW.east, Y0);
  bench(ctx, M.maxX - 2, 800, YAW.west, Y0);

  // ---- What moves, and how.
  const wheelSeat = (a: number, out: THREE.Vector3) =>
    out.set(W.x + Math.sin(a) * W.r, Y0 + W.hub - Math.cos(a) * W.r - 1.6, W.z + 0.7);
  const horse = (a: number, time: number, out: THREE.Vector3) =>
    out.set(
      C.x + Math.cos(a) * 6.6,
      Y0 + 1 + Math.sin(time * 2.2 + a * 3) * 0.35,
      C.z + Math.sin(a) * 6.6,
    );
  let wheelA = 0;
  const speed = { wheel: 1, carousel: 1 };
  let carA = 0;
  let trainS = 0;
  let trainV = 3;
  const flumeS = [0, flumeLen / 2];
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();

  const pippin: Track = {
    curve: pippinCurve,
    len: pippinLen,
    lift: [0.03, 0.15],
    station: 0,
    car: train,
  };
  const flume: Track = {
    curve: flumeCurve,
    len: flumeLen,
    lift: [0.2, 0.36],
    station: 0,
    car: logs[0]!,
  };

  return {
    group,
    pippin,
    flume,
    wheelSeat,
    wheel,
    horse,
    carousel,
    dropCar,
    bumperCars,
    pigs,
    bull,
    puck,
    speed,
    wheelAngle: () => wheelA,
    showtime: () => {
      show = 12;
    },
    horseAt: (out: THREE.Vector3) => horses[0]!.getWorldPosition(out),
    spots,
    stops,
    held,
    update(dt: number, time: number) {
      // The wheel turns slowly; the gondolas hang level.
      wheelA += dt * 0.12 * speed.wheel;
      wheel.rotation.z = wheelA;
      gondolas.forEach((g, i) =>
        wheelSeat(wheelA + (i / gondolas.length) * Math.PI * 2, g.position).setY(
          g.position.y + 1.6,
        ),
      );
      // The carousel turns and the horses rise and fall.
      carA += dt * 0.35 * speed.carousel;
      carousel.rotation.y = -carA;
      horses.forEach((h, i) => (h.position.y = 1 + Math.sin(time * 2.2 + i * 1.7) * 0.35));
      // The Pippin's train: up the chain, then gravity, round and back.
      if (!held.has("pippin")) {
        const u = (((trainS / pippinLen) % 1) + 1) % 1;
        pippinCurve.getTangentAt(u, _t);
        if (u > pippin.lift[0] && u < pippin.lift[1]) trainV = 3.2;
        else trainV = Math.max(2.5, trainV + (-_t.y * 9.8 - 0.02 * trainV * trainV) * dt);
        trainS += trainV * dt;
        placeTrain(pippin, trainS);
      }
      // Logs on the flume.
      logs.forEach((l, i) => {
        if (i === 0 && held.has("flume")) return;
        flumeS[i] = flumeS[i]! + 3 * dt;
        placeTrain({ ...flume, car: l }, flumeS[i]!);
      });
      // Cups spin on a turning floor; the swings fly out.
      teacups.rotation.y = time * 0.5;
      cups.forEach((c, i) => (c.rotation.y = time * (1.2 + i * 0.2)));
      const spin = 0.9 + Math.sin(time * 0.05) * 0.3;
      swingTop.rotation.y = time * spin;
      chairs.forEach((c) => (c.rotation.z = -0.55 * spin));
      // The drop tower: up slowly, a wait, then down.
      if (!held.has("drop")) {
        const k = (time % 20) / 20;
        dropCar.position.y =
          Y0 +
          1.2 +
          (k < 0.5
            ? (k / 0.5) * (D.h - 4)
            : k < 0.6
              ? D.h - 4
              : Math.max(0, (D.h - 4) * (1 - Math.pow((k - 0.6) / 0.1, 2))));
      }
      // The kiddie train.
      const ku = (time * 0.04) % 1;
      kOval.getPointAt(ku, _p);
      kOval.getTangentAt(ku, _t);
      kTrain.position.copy(_p);
      kTrain.lookAt(_p.x + _t.x, _p.y, _p.z + _t.z);
      // Bumper cars wander when nobody is driving one.
      if (!held.has("bumper")) {
        bumperCars.forEach((c, i) => {
          const d = c.userData as { vx: number; vz: number; heading: number; turn: number };
          d.turn -= dt;
          if (d.turn <= 0) {
            d.heading += (Math.sin(time * 3 + i * 7) > 0 ? 1 : -1) * (0.8 + (i % 3) * 0.4);
            d.turn = 1 + (i % 4) * 0.5;
          }
          c.position.x += Math.sin(d.heading) * 2.6 * dt;
          c.position.z += Math.cos(d.heading) * 2.6 * dt;
          if (c.position.x < BC.minX + 1.5 || c.position.x > BC.maxX - 1.5) d.heading = -d.heading;
          if (c.position.z < BC.minZ + 1.5 || c.position.z > BC.maxZ - 1.5)
            d.heading = Math.PI - d.heading;
          c.position.x = Math.min(BC.maxX - 1.5, Math.max(BC.minX + 1.5, c.position.x));
          c.position.z = Math.min(BC.maxZ - 1.5, Math.max(BC.minZ + 1.5, c.position.z));
          c.rotation.y = d.heading;
        });
      }
      // Pigs trot round their track between races.
      if (!held.has("pigs"))
        pigs.forEach((p, i) => {
          const a = time * (0.5 + i * 0.04) + i * 0.6;
          p.position.set(
            PG.x + Math.cos(a) * PG.halfX,
            Y0,
            PG.z + Math.sin(a) * PG.halfZ * 0.9 + (i - 1.5) * 0.4,
          );
          p.rotation.y = Math.atan2(-Math.sin(a) * PG.halfX, Math.cos(a) * PG.halfZ) + Math.PI;
        });
      // The bull shifts in the arena; goats wander their pen.
      if (!held.has("bull")) bull.rotation.y = Math.sin(time * 0.3) * 0.8;
      goats.forEach((g, i) => {
        g.position.x = Z.minX + 3 + (i % 4) * 6 + Math.sin(time * 0.3 + i) * 1.5;
        g.rotation.y = Math.cos(time * 0.3 + i);
      });
      puck.position.y = held.has("striker") ? puck.position.y : Y0 + 0.8;
      // The dogs lap the ring, over the bars, through the hoop, over the ramp; faster and higher in the big routine.
      show = Math.max(0, show - dt);
      const pace = show > 0 ? 1.1 : 0.55;
      dogs.forEach((d, i) => {
        const a = time * pace + i * 0.9;
        const r = i === 1 && show > 0 ? 1.3 : 5;
        d.position.set(SR.x + Math.cos(a) * r, Y0, SR.z + Math.sin(a) * r);
        d.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI;
        const near = (t: number) =>
          Math.max(0, 1 - Math.abs(Math.atan2(Math.sin(a - t), Math.cos(a - t))) / 0.35);
        const jump =
          r < 2
            ? Math.abs(Math.cos(a)) < 0.5
              ? 0.9 * Math.sin(a) ** 2
              : 0
            : near(0) * (show > 0 ? 1.8 : 1.4) +
              near((Math.PI * 2) / 3) * 1 +
              near((Math.PI * 4) / 3) * 1;
        d.position.y = Y0 + jump;
        d.rotation.x = -(Math.cos(a * 3) * 0.1) * (jump > 0.1 ? 1 : 0);
      });
      // The clown juggles; in the big routine, higher and quicker.
      const jq = show > 0 ? 6 : 4;
      balls.forEach((b, i) => {
        const t = time * jq + (i * Math.PI * 2) / 3;
        b.position.set(
          clown.position.x + 0.4,
          clown.position.y + 2 + Math.abs(Math.sin(t)) * (show > 0 ? 1.4 : 0.8),
          clown.position.z + Math.cos(t) * 0.45,
        );
      });
      clown.rotation.z = Math.sin(time * 2) * 0.05;
      rabbit.position.y = 0.2 + Math.max(0, Math.sin(time * 0.8)) * 0.35;
    },
  };
}

function chainLink() {
  return new THREE.MeshStandardMaterial({
    map: tex(32, 32, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = "rgba(170,176,184,0.9)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, h);
      g.moveTo(w, 0);
      g.lineTo(0, h);
      g.stroke();
    }),
    transparent: true,
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.5,
    metalness: 0.6,
  });
}

/** A carved horse: body, neck, head, legs, a saddle. */
function horseMesh(color: number) {
  const g = new THREE.Group();
  const m = std(color, 0.5);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.4), m);
  g.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.35), m);
  neck.position.set(0, 0.45, 0.65);
  neck.rotation.x = -0.5;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.55), m);
  head.position.set(0, 0.8, 0.95);
  g.add(head);
  for (const [x, z] of [
    [-0.18, -0.5],
    [0.18, -0.5],
    [-0.18, 0.5],
    [0.18, 0.5],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), m);
    leg.position.set(x, -0.5, z);
    leg.rotation.x = z > 0 ? -0.6 : 0.6;
    g.add(leg);
  }
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.5), std(0xc0262a, 0.5));
  saddle.position.y = 0.32;
  g.add(saddle);
  return g;
}

function pigMesh(color: number) {
  const g = new THREE.Group();
  const m = std(color, 0.6);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), m);
  body.scale.set(0.8, 0.75, 1.2);
  body.position.y = 0.42;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), m);
  head.position.set(0, 0.5, 0.5);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8), std(0xff8aa0, 0.6));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.47, 0.74);
  g.add(body, head, snout);
  for (const [x, z] of [
    [-0.18, -0.25],
    [0.18, -0.25],
    [-0.18, 0.25],
    [0.18, 0.25],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 6), m);
    leg.position.set(x, 0.13, z);
    g.add(leg);
  }
  return g;
}

function cowMesh(color: number) {
  const g = new THREE.Group();
  const m = std(color, 0.7);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2), m);
  body.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.7), m);
  head.position.set(0, 1.5, 1.2);
  g.add(body, head);
  for (const [x, z] of [
    [-0.32, -0.75],
    [0.32, -0.75],
    [-0.32, 0.75],
    [0.32, 0.75],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), m);
    leg.position.set(x, 0.4, z);
    g.add(leg);
  }
  return g;
}

function goatMesh(color: number) {
  const g = cowMesh(color);
  g.scale.setScalar(0.5);
  return g;
}

/** A rodeo bull: black, broad in the shoulder, horns. */
export function bullMesh() {
  const g = new THREE.Group();
  const m = std(0x1a1414, 0.7);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.4), m);
  body.position.y = 1.3;
  const hump = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.9), m);
  hump.position.set(0, 2, 0.6);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.8), m);
  head.position.set(0, 1.5, 1.5);
  g.add(body, hump, head);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 6), std(0xe8e0c8, 0.5));
    horn.position.set(s * 0.45, 1.95, 1.5);
    horn.rotation.z = -s * 1.1;
    g.add(horn);
  }
  for (const [x, z] of [
    [-0.4, -0.9],
    [0.4, -0.9],
    [-0.4, 0.9],
    [0.4, 0.9],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), m);
    leg.position.set(x, 0.4, z);
    g.add(leg);
  }
  return g;
}

/** A stunt dog: a short body, a head with ears, a tail that sticks up. */
function dogMesh(color: number) {
  const g = new THREE.Group();
  const m = std(color, 0.7);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.7), m);
  body.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.3), m);
  head.position.set(0, 0.68, 0.42);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.14), std(0x1a1a1a, 0.6));
  nose.position.set(0, 0.62, 0.62);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), m);
  tail.position.set(0, 0.65, -0.38);
  tail.rotation.x = -0.5;
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.1), std(0xff3b3b, 0.6));
  scarf.position.set(0, 0.56, 0.32);
  g.add(body, head, nose, tail, scarf);
  for (const s of [-0.1, 0.1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), m);
    ear.position.set(s, 0.85, 0.38);
    g.add(ear);
  }
  for (const [x, z] of [
    [-0.1, -0.25],
    [0.1, -0.25],
    [-0.1, 0.25],
    [0.1, 0.25],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.07), m);
    leg.position.set(x, 0.16, z);
    g.add(leg);
  }
  return g;
}

/** A clown: baggy spotted suit, big shoes, a white face, a red nose and a rainbow of hair. */
function clownMesh() {
  const g = new THREE.Group();
  const suit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.42, 1.1, 10),
    new THREE.MeshStandardMaterial({
      roughness: 0.8,
      map: tex(64, 64, (c, w, h) => {
        c.fillStyle = "#ffd23a";
        c.fillRect(0, 0, w, h);
        const dots = ["#ff3b3b", "#2a6ad0", "#39c86a"];
        for (let i = 0; i < 12; i++) {
          c.fillStyle = dots[i % 3]!;
          c.beginPath();
          c.arc((i * 23) % w, (i * 37) % h, 5, 0, Math.PI * 2);
          c.fill();
        }
      }),
    }),
  );
  suit.position.y = 1.05;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.1, 12), MAT.white());
  collar.position.y = 1.62;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), MAT.white());
  face.position.y = 1.86;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std(0xff2020, 0.3));
  nose.position.set(0, 1.86, 0.22);
  g.add(suit, collar, face, nose);
  const hair = [0xff3b3b, 0xff8a1e, 0x39c86a, 0x2a6ad0];
  hair.forEach((c, i) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), std(c, 0.8));
    puff.position.set((i - 1.5) * 0.15, 1.98 - Math.abs(i - 1.5) * 0.05, -0.06);
    g.add(puff);
  });
  const hatC = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), std(0x2a6ad0, 0.6));
  hatC.position.y = 2.18;
  g.add(hatC);
  for (const s of [-0.13, 0.13]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.5), std(0xff3b3b, 0.5));
    shoe.position.set(s, 0.06, 0.1);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), std(0x2a6ad0, 0.8));
    leg.position.set(s, 0.36, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), std(0xffd23a, 0.8));
    arm.position.set(s * 2.6, 1.3, 0.12);
    arm.rotation.x = -0.9;
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), MAT.white());
    glove.position.set(s * 2.6, 1.45, 0.38);
    g.add(shoe, leg, arm, glove);
  }
  return g;
}
