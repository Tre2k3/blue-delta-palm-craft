import * as THREE from "three";
import type { TableId } from "../core/types";
import { tex } from "../gfx/tex";
import { lotSurface } from "./buildings";
import { MAT, YAW, addSolid, bench, bush, emissiveMat, globeLamp, poolMat, sign, std, trashCan, tree, type BuildCtx } from "./kit";
import { CURB, PARK, PARK_TABLES, PARK_TERRACE } from "./map";

const Y0 = CURB;
/** Random draws the bungalows that stood on this block used to take. They are spent again so the rest of the city falls exactly where it did. */
const OLD_DRAWS = 257;

/**
 * Orange Mound Park: lawns, two paths crossing at a fountain, a terrace of game tables under
 * string lights, a playground, a gazebo and picnic tables.
 */
export function buildPark(ctx: BuildCtx) {
  const world = ctx.rand;
  // The park is laid out from its own dice, so a change here never moves a tree across town.
  let seed = 1907;
  ctx.rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const P = PARK;
  lotSurface(ctx, P, "grass");
  const paving = pave(ctx);
  const stone = std(0xb9b2a4, 0.85);
  const strip = (minX: number, maxX: number, minZ: number, maxZ: number) => ctx.ground.flat(maxX - minX, maxZ - minZ, (minX + maxX) / 2, Y0 + 0.012, (minZ + maxZ) / 2, paving, 0, 6);

  // Two paths crossing at the fountain, stopped short of its ring so nothing lies on top of anything.
  const RING = 7;
  strip(P.cx - 1.4, P.cx + 1.4, P.minZ, P.cz - RING + 0.4);
  strip(P.cx - 1.4, P.cx + 1.4, P.cz + RING - 0.4, P.maxZ);
  strip(P.minX, P.cx - RING + 0.4, P.cz - 1.4, P.cz + 1.4);
  strip(P.cx + RING - 0.4, P.maxX, P.cz - 1.4, P.cz + 1.4);
  const ring = new THREE.CircleGeometry(RING, 36);
  ring.rotateX(-Math.PI / 2);
  const ruv = ring.attributes.uv!;
  for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) * ((RING * 2) / 6), ruv.getY(i) * ((RING * 2) / 6));
  ctx.ground.add(ring, paving, P.cx, Y0 + 0.012, P.cz);

  fountain(ctx, P.cx, P.cz, stone);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    bench(ctx, P.cx + Math.sin(a) * 5.7, P.cz + Math.cos(a) * 5.7, a + Math.PI, Y0);
    globeLamp(ctx, P.cx + Math.sin(a + 0.42) * 6.5, P.cz + Math.cos(a + 0.42) * 6.5, Y0);
  }

  // Ways in: an arch on Lamar and on Main, lamps on the other two.
  arch(ctx, P.cx, P.minZ + 0.7, YAW.north);
  arch(ctx, P.maxX - 0.7, P.cz, YAW.east);
  for (const [x, z] of [
    [P.cx - 2.2, P.maxZ - 1],
    [P.cx + 2.2, P.maxZ - 1],
    [P.minX + 1, P.cz - 2.2],
    [P.minX + 1, P.cz + 2.2],
  ] as const)
    globeLamp(ctx, x, z, Y0);

  terrace(ctx, paving, stone);
  playground(ctx);
  gazebo(ctx, -108, 71.5);
  picnic(ctx, -86, 93.5, 0.3);
  picnic(ctx, -79.5, 100, -0.5);
  trashCan(ctx, -93.4, 87, Y0);
  trashCan(ctx, -98.6, 81, Y0);
  bench(ctx, P.cx - 2.3, 68, Math.PI / 2, Y0);
  bench(ctx, P.cx + 2.3, 99, -Math.PI / 2, Y0);
  bench(ctx, -108, P.cz + 2.3, Math.PI, Y0);
  bench(ctx, -83, P.cz + 2.3, Math.PI, Y0);

  // Shade. Clear of the paths, the terrace and anything a kid climbs on.
  for (const [x, z, s] of [
    [-116, 64, 1.5],
    [-101, 64.5, 1.3],
    [-116.5, 79, 1.4],
    [-100.5, 78.5, 1.2],
    [-116, 89.5, 1.3],
    [-116.5, 104, 1.5],
    [-100.5, 104.5, 1.4],
    [-100, 89.5, 1.1],
    [-91.5, 104, 1.4],
    [-76, 104.5, 1.5],
    [-75.5, 90, 1.3],
    [-84.5, 99.5, 1.2],
    [-91, 89.5, 1.1],
  ] as const)
    tree(ctx, x, z, s, Y0, false);

  // A hedge along every edge, open at the four ways in.
  const gap = (v: number, mid: number) => Math.abs(v - mid) < 3.2;
  for (let x = P.minX + 0.8; x <= P.maxX - 0.6; x += 1.9) {
    if (!gap(x, P.cx)) {
      bush(ctx, x, P.minZ + 0.8, 1.15, Y0);
      bush(ctx, x, P.maxZ - 0.8, 1.15, Y0);
    }
  }
  for (let z = P.minZ + 2.6; z <= P.maxZ - 2.4; z += 1.9) {
    if (!gap(z, P.cz)) {
      bush(ctx, P.minX + 0.8, z, 1.15, Y0);
      bush(ctx, P.maxX - 0.8, z, 1.15, Y0);
    }
  }

  ctx.rand = world;
  for (let i = 0; i < OLD_DRAWS; i++) world();
}

let paveMat: THREE.Material | null = null;
function pave(ctx: BuildCtx) {
  if (!paveMat) {
    const m = MAT.plaza(ctx.glow).clone();
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -2;
    paveMat = ctx.glow.wetSurface(m as THREE.MeshStandardMaterial);
  }
  return paveMat;
}

export function resetPark() {
  paveMat = null;
}

function fountain(ctx: BuildCtx, x: number, z: number, stone: THREE.Material) {
  const water = std(0x2f8fb0, 0.12, 0.3);
  ctx.solid.cyl(3, 3.15, 0.55, x, Y0 + 0.275, z, stone, 24);
  ctx.solid.cyl(2.72, 2.72, 0.04, x, Y0 + 0.56, z, water, 24);
  ctx.solid.cyl(0.34, 0.5, 1.5, x, Y0 + 1.3, z, stone, 10);
  ctx.solid.cyl(1.25, 0.45, 0.32, x, Y0 + 2.2, z, stone, 16);
  ctx.solid.cyl(1.1, 1.1, 0.04, x, Y0 + 2.37, z, water, 16);
  ctx.solid.cyl(0.1, 0.2, 0.7, x, Y0 + 2.72, z, stone, 8);
  ctx.solid.add(new THREE.SphereGeometry(0.2, 10, 8), emissiveMat(ctx, 0x9fe4ff, 0.35, 1.9), x, Y0 + 3.14, z);
  // The sheet of water coming off the bowl.
  const fall = new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide });
  ctx.flat.add(new THREE.CylinderGeometry(1.22, 1.55, 1.8, 18, 1, true), fall, x, Y0 + 1.46, z);
  ctx.flat.flat(13, 13, x, Y0 + 0.03, z, poolMat(ctx, 0x7fd6ff, 0.34));
  ctx.lamps.push({ x, y: Y0 + 2.6, z, color: 0x9fd8ff });
  addSolid(ctx, x - 2.9, x + 2.9, z - 2.9, z + 2.9);
}

/** Two posts and a beam with the park's name on both faces. `yaw` is the way out. */
function arch(ctx: BuildCtx, x: number, z: number, yaw: number) {
  const iron = MAT.black();
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (const side of [-1, 1]) {
    const px = x + side * 2.9 * c;
    const pz = z - side * 2.9 * s;
    ctx.solid.box(0.28, 3.5, 0.28, px, Y0 + 1.75, pz, iron);
    ctx.solid.add(new THREE.SphereGeometry(0.2, 8, 6), emissiveMat(ctx, 0xffd9a0, 0.3, 2.1), px, Y0 + 3.68, pz);
    addSolid(ctx, px - 0.2, px + 0.2, pz - 0.2, pz + 0.2);
  }
  ctx.solid.box(6.2, 0.72, 0.2, x, Y0 + 3.3, z, iron, yaw);
  const board = sign("ORANGE MOUND PARK", "#f3e9c8", "#1d3b24", { w: 1024, h: 104 });
  ctx.flat.wall(5.9, 0.6, x + s * 0.11, Y0 + 3.3, z + c * 0.11, board, yaw);
  ctx.flat.wall(5.9, 0.6, x - s * 0.11, Y0 + 3.3, z - c * 0.11, board, yaw + Math.PI);
}

/** The game tables: a paved corner under strings of bulbs. */
function terrace(ctx: BuildCtx, paving: THREE.Material, stone: THREE.Material) {
  const T = PARK_TERRACE;
  const cx = (T.minX + T.maxX) / 2;
  const cz = (T.minZ + T.maxZ) / 2;
  ctx.ground.flat(T.maxX - T.minX, T.maxZ - T.minZ, cx, Y0 + 0.012, cz, paving, 0, 6);
  // Short walks from the two paths.
  ctx.ground.flat(2.4, PARK.cz - 1.4 - T.maxZ, -84, Y0 + 0.012, (T.maxZ + PARK.cz - 1.4) / 2, paving, 0, 6);
  ctx.ground.flat(T.minX - (PARK.cx + 1.4), 2.4, (T.minX + PARK.cx + 1.4) / 2, Y0 + 0.012, 71.75, paving, 0, 6);

  // Strings of bulbs from pole to pole.
  const bulb = emissiveMat(ctx, 0xffd08a, 0.5, 2.6);
  const poles = [
    [T.minX + 0.6, T.minZ + 0.6],
    [T.maxX - 0.6, T.minZ + 0.6],
    [T.maxX - 0.6, T.maxZ - 0.6],
    [T.minX + 0.6, T.maxZ - 0.6],
  ] as const;
  const wire = std(0x15171a, 0.6);
  for (const [x, z] of poles) {
    ctx.solid.cyl(0.06, 0.09, 4.2, x, Y0 + 2.1, z, MAT.black(), 6);
    addSolid(ctx, x - 0.12, x + 0.12, z - 0.12, z + 0.12);
  }
  const runs: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [0, 2],
    [1, 3],
  ];
  for (const [a, b] of runs) {
    const [ax, az] = poles[a]!;
    const [bx, bz] = poles[b]!;
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.round(len / 1.5);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      // The string hangs lowest in the middle.
      const y = Y0 + 4.1 - Math.sin(t * Math.PI) * 0.55;
      ctx.solid.add(new THREE.SphereGeometry(0.075, 6, 4), bulb, ax + (bx - ax) * t, y, az + (bz - az) * t);
    }
    ctx.solid.add(new THREE.BoxGeometry(0.02, 0.02, len), wire, (ax + bx) / 2, Y0 + 3.86, (az + bz) / 2, Math.atan2(bx - ax, bz - az));
  }
  ctx.flat.flat(20, 20, cx, Y0 + 0.03, cz, poolMat(ctx, 0xffc98a, 0.3));
  ctx.lamps.push({ x: cx, y: Y0 + 3.8, z: cz, color: 0xffd08a });

  const board = sign("GAME TABLES", "#1d3b24", "#f3e9c8", { sub: "PULL UP A SEAT", w: 512, h: 128 });
  ctx.solid.box(0.1, 2.3, 0.1, T.maxX - 1.4, Y0 + 1.15, T.maxZ - 0.9, MAT.black());
  ctx.flat.wall(2.6, 0.65, T.maxX - 1.4, Y0 + 2.2, T.maxZ - 0.84, board, YAW.south);
  ctx.flat.wall(2.6, 0.65, T.maxX - 1.4, Y0 + 2.2, T.maxZ - 0.96, board, YAW.north);

  for (const t of PARK_TABLES) table(ctx, t.id, t.name, t.color, t.x, t.z, t.seats, stone);
}

function table(ctx: BuildCtx, id: TableId, name: string, color: string, x: number, z: number, seats: 2 | 4, stone: THREE.Material) {
  ctx.solid.cyl(0.17, 0.26, 0.72, x, Y0 + 0.36, z, stone, 8);
  ctx.solid.box(1.2, 0.08, 1.2, x, Y0 + 0.76, z, stone);
  ctx.solid.flat(1.04, 1.04, x, Y0 + 0.803, z, top(id));
  addSolid(ctx, x - 0.55, x + 0.55, z - 0.55, z + 0.55);
  const around: [number, number][] = seats === 4 ? [[0, -1], [0, 1], [-1, 0], [1, 0]] : [[0, -1], [0, 1]];
  for (const [dx, dz] of around) ctx.solid.cyl(0.22, 0.2, 0.46, x + dx * 1.02, Y0 + 0.23, z + dz * 1.02, stone, 10);
  // What is on the table says which game it is from across the lawn.
  const y = Y0 + 0.806;
  const dark = std(0x17130f, 0.5);
  const light = std(0xf1ead8, 0.5);
  const red = std(0xc62f25, 0.5);
  if (id === "chess") {
    for (let i = 0; i < 8; i++) {
      const px = x - 0.455 + i * 0.13;
      const tall = i === 3 || i === 4 ? 0.17 : i === 0 || i === 7 ? 0.11 : 0.13;
      ctx.solid.cyl(0.026, 0.04, tall, px, y + tall / 2, z - 0.455, dark, 6);
      ctx.solid.cyl(0.022, 0.034, 0.08, px, y + 0.04, z - 0.325, dark, 6);
      ctx.solid.cyl(0.026, 0.04, tall, px, y + tall / 2, z + 0.455, light, 6);
      ctx.solid.cyl(0.022, 0.034, 0.08, px, y + 0.04, z + 0.325, light, 6);
    }
  } else if (id === "checkers") {
    for (let r = 0; r < 8; r++) {
      if (r === 3 || r === 4) continue;
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) continue;
        ctx.solid.cyl(0.048, 0.048, 0.026, x - 0.455 + c * 0.13, y + 0.013, z - 0.455 + r * 0.13, r < 3 ? dark : red, 10);
      }
    }
  } else if (id === "connect4") {
    // The rack stands on edge across the table.
    ctx.solid.box(0.92, 0.66, 0.07, x, y + 0.37, z, std(0x1f4fc4, 0.4));
    ctx.solid.box(0.14, 0.05, 0.3, x - 0.42, y + 0.025, z, std(0x1f4fc4, 0.4));
    ctx.solid.box(0.14, 0.05, 0.3, x + 0.42, y + 0.025, z, std(0x1f4fc4, 0.4));
    ctx.flat.wall(0.88, 0.62, x, y + 0.37, z + 0.037, rack(), YAW.south);
    ctx.flat.wall(0.88, 0.62, x, y + 0.37, z - 0.037, rack(), YAW.north);
  } else if (id === "dominoes") {
    const line: [number, number, number][] = [
      [-0.3, 0, 0],
      [-0.19, 0, 0],
      [-0.08, 0, 0],
      [0.03, 0, 0],
      [0.115, -0.055, 1],
      [0.115, -0.165, 1],
      [0.2, -0.22, 0],
      [0.31, -0.22, 0],
    ];
    for (const [dx, dz, turn] of line) ctx.solid.box(0.1, 0.014, 0.05, x + dx, y + 0.007, z + dz, light, turn ? Math.PI / 2 : 0);
    for (let i = 0; i < 6; i++) {
      ctx.solid.box(0.05, 0.1, 0.014, x - 0.2 + i * 0.065, y + 0.05, z + 0.42, light);
      ctx.solid.box(0.05, 0.1, 0.014, x - 0.2 + i * 0.065, y + 0.05, z - 0.42, light);
    }
  } else if (id === "spades") {
    ctx.solid.box(0.075, 0.03, 0.105, x, y + 0.015, z, std(0x17336e, 0.5));
    for (const [dx, dz] of around) {
      for (let i = -2; i <= 2; i++) {
        const along = dz !== 0 ? [i * 0.05, 0] : [0, i * 0.05];
        ctx.solid.box(0.07, 0.004, 0.1, x + dx * 0.36 + along[0]!, y + 0.004 + (i + 2) * 0.002, z + dz * 0.36 + along[1]!, light, (dz !== 0 ? 0 : Math.PI / 2) + i * 0.12);
      }
    }
  }

  // Its name on a short post at the corner, read from either side.
  const px = x - 0.86;
  const pz = z + 0.86;
  ctx.solid.box(0.05, 1.5, 0.05, px, Y0 + 0.75, pz, MAT.black());
  const plate = sign(name.toUpperCase(), color, "#12161a", { w: 384, h: 96 });
  ctx.flat.wall(0.96, 0.24, px, Y0 + 1.56, pz + 0.03, plate, YAW.south);
  ctx.flat.wall(0.96, 0.24, px, Y0 + 1.56, pz - 0.03, plate, YAW.north);
}

const tops = new Map<TableId, THREE.Material>();
/** The picture let into each table top. */
function top(id: TableId) {
  let m = tops.get(id);
  if (m) return m;
  const t = tex(
    256,
    256,
    (g, w) => {
      const cell = w / 8;
      if (id === "chess" || id === "checkers") {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            g.fillStyle = (r + c) % 2 ? (id === "chess" ? "#3d2b1f" : "#1c1c1c") : id === "chess" ? "#e8dcc0" : "#b8322a";
            g.fillRect(c * cell, r * cell, cell, cell);
          }
        }
      } else if (id === "tictactoe") {
        g.fillStyle = "#e9e2d0";
        g.fillRect(0, 0, w, w);
        g.strokeStyle = "#1c2b3a";
        g.lineWidth = 9;
        g.lineCap = "round";
        for (const k of [1 / 3, 2 / 3]) {
          g.beginPath();
          g.moveTo(w * k, 22);
          g.lineTo(w * k, w - 22);
          g.moveTo(22, w * k);
          g.lineTo(w - 22, w * k);
          g.stroke();
        }
        const mark = (c: number, r: number, o: boolean) => {
          const cx = (c + 0.5) * (w / 3);
          const cy = (r + 0.5) * (w / 3);
          g.strokeStyle = o ? "#c62f25" : "#1f6fd0";
          g.lineWidth = 11;
          g.beginPath();
          if (o) g.arc(cx, cy, 24, 0, Math.PI * 2);
          else {
            g.moveTo(cx - 22, cy - 22);
            g.lineTo(cx + 22, cy + 22);
            g.moveTo(cx + 22, cy - 22);
            g.lineTo(cx - 22, cy + 22);
          }
          g.stroke();
        };
        mark(1, 1, false);
        mark(0, 0, true);
        mark(2, 1, false);
        mark(0, 2, true);
      } else {
        // Felt, with a stitched line round it.
        g.fillStyle = id === "spades" ? "#1c5a34" : id === "dominoes" ? "#234a66" : "#3a3f48";
        g.fillRect(0, 0, w, w);
        g.strokeStyle = "rgba(255,255,255,0.28)";
        g.lineWidth = 3;
        g.setLineDash([9, 7]);
        g.strokeRect(14, 14, w - 28, w - 28);
      }
    },
    { repeat: false },
  );
  m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  tops.set(id, m);
  return m;
}

let rackMat: THREE.Material | null = null;
/** The face of the four-in-a-row rack: holes, with a game half played. */
function rack() {
  if (rackMat) return rackMat;
  const fill = ["......", ".....r", "....ry", "...yry", "....yr", ".....y", "......"];
  const t = tex(
    280,
    200,
    (g, w, h) => {
      g.fillStyle = "#1f4fc4";
      g.fillRect(0, 0, w, h);
      for (let c = 0; c < 7; c++) {
        for (let r = 0; r < 6; r++) {
          const v = fill[c]![r]!;
          g.fillStyle = v === "r" ? "#e2382c" : v === "y" ? "#f6cf3a" : "#0d1d4a";
          g.beginPath();
          g.arc(20 + c * 40, 18 + r * 33, 13, 0, Math.PI * 2);
          g.fill();
        }
      }
    },
    { repeat: false },
  );
  rackMat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  return rackMat;
}

export function resetParkArt() {
  tops.clear();
  rackMat = null;
}

/** Swings, a slide and a sandbox in the south-west corner. */
function playground(ctx: BuildCtx) {
  const red = std(0xc8372b, 0.5, 0.2);
  const blue = std(0x2a62c9, 0.5, 0.2);
  const yellow = std(0xe8b730, 0.5, 0.2);
  const steel = MAT.steel();
  // Wood chips under all of it.
  ctx.ground.flat(17, 15, -109.5, Y0 + 0.012, 96.5, chips(), 0, 0);

  // Swings: two frames, a bar across, two seats.
  const sx = -112;
  const sz = 93;
  for (const side of [-1, 1]) {
    for (const lean of [-1, 1]) ctx.solid.add(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 6), red, sx + side * 2, Y0 + 1.38, sz + lean * 0.55, 0, -lean * 0.38);
    addSolid(ctx, sx + side * 2 - 0.15, sx + side * 2 + 0.15, sz - 1.1, sz + 1.1);
  }
  ctx.solid.add(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6), red, sx, Y0 + 2.72, sz, 0, 0, Math.PI / 2);
  for (const dx of [-0.95, 0.95]) {
    ctx.solid.box(0.02, 2.05, 0.02, sx + dx - 0.2, Y0 + 1.68, sz, steel);
    ctx.solid.box(0.02, 2.05, 0.02, sx + dx + 0.2, Y0 + 1.68, sz, steel);
    ctx.solid.box(0.5, 0.04, 0.2, sx + dx, Y0 + 0.64, sz, MAT.black());
  }

  // Slide: a deck on four legs, a ladder up the north side and the chute down the south.
  const lx = -105.5;
  const lz = 97.5;
  for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]] as const) ctx.solid.box(0.1, 2.5, 0.1, lx + dx, Y0 + 1.25, lz + dz, blue);
  ctx.solid.box(1.4, 0.1, 1.4, lx, Y0 + 1.55, lz, yellow);
  ctx.solid.box(1.4, 0.08, 0.08, lx, Y0 + 2.5, lz - 0.6, blue);
  for (let i = 0; i < 5; i++) ctx.solid.box(0.7, 0.05, 0.08, lx, Y0 + 0.28 + i * 0.28, lz - 0.74 - (4 - i) * 0.07, steel);
  ctx.solid.add(new THREE.BoxGeometry(0.8, 0.07, 3.3), yellow, lx, Y0 + 0.86, lz + 2.1, 0, 0.45);
  for (const dx of [-0.42, 0.42]) ctx.solid.add(new THREE.BoxGeometry(0.05, 0.24, 3.3), red, lx + dx, Y0 + 0.96, lz + 2.1, 0, 0.45);
  addSolid(ctx, lx - 0.75, lx + 0.75, lz - 1.1, lz + 3.6);

  // Sandbox.
  const bx = -113;
  const bz = 101.5;
  ctx.ground.flat(3.6, 3.6, bx, Y0 + 0.02, bz, std(0xd9c48f, 1));
  for (const [w, d, dx, dz] of [
    [4, 0.2, 0, -1.9],
    [4, 0.2, 0, 1.9],
    [0.2, 4, -1.9, 0],
    [0.2, 4, 1.9, 0],
  ] as const)
    ctx.solid.box(w, 0.26, d, bx + dx, Y0 + 0.13, bz + dz, MAT.wood());
  ctx.solid.add(new THREE.SphereGeometry(0.22, 10, 8), red, bx + 0.7, Y0 + 0.24, bz - 0.5);
  ctx.solid.cyl(0.16, 0.12, 0.22, bx - 0.6, Y0 + 0.13, bz + 0.5, blue, 8);
  globeLamp(ctx, -101.5, 92, Y0);
}

let chipMat: THREE.Material | null = null;
function chips() {
  if (!chipMat) chipMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  return chipMat;
}

/** A bandstand on the north-west lawn. */
function gazebo(ctx: BuildCtx, x: number, z: number) {
  const white = std(0xf1ede4, 0.8);
  const roof = std(0x2c4a36, 0.85);
  ctx.solid.cyl(3.1, 3.2, 0.34, x, Y0 + 0.17, z, white, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = x + Math.sin(a) * 2.85;
    const pz = z + Math.cos(a) * 2.85;
    ctx.solid.box(0.14, 2.7, 0.14, px, Y0 + 1.69, pz, white);
    // A rail between the posts, left open on the side that faces the fountain.
    if (i !== 1 && i !== 2) {
      const b = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
      const qx = x + Math.sin(b) * 2.85;
      const qz = z + Math.cos(b) * 2.85;
      ctx.solid.box(0.06, 0.08, Math.hypot(qx - px, qz - pz), (px + qx) / 2, Y0 + 1.2, (pz + qz) / 2, white, Math.atan2(qx - px, qz - pz));
    }
  }
  ctx.solid.add(new THREE.ConeGeometry(3.7, 1.7, 8), roof, x, Y0 + 3.9, z, Math.PI / 8);
  ctx.solid.add(new THREE.SphereGeometry(0.18, 8, 6), MAT.gold(), x, Y0 + 4.85, z);
  ctx.solid.add(new THREE.SphereGeometry(0.2, 8, 6), emissiveMat(ctx, 0xffd9a0, 0.3, 2.1), x, Y0 + 2.9, z);
  ctx.flat.flat(9, 9, x, Y0 + 0.36, z, poolMat(ctx, 0xffc98a, 0.3));
  ctx.lamps.push({ x, y: Y0 + 2.8, z, color: 0xffd9a0 });
  addSolid(ctx, x - 2.4, x + 2.4, z - 2.4, z + 2.4);
}

function picnic(ctx: BuildCtx, x: number, z: number, yaw: number) {
  const wood = MAT.wood();
  ctx.solid.box(1.9, 0.07, 0.8, x, Y0 + 0.76, z, wood, yaw);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (const side of [-1, 1]) {
    ctx.solid.box(1.9, 0.06, 0.3, x + side * 0.72 * s, Y0 + 0.45, z + side * 0.72 * c, wood, yaw);
    ctx.solid.box(0.08, 0.76, 1.5, x + side * 0.75 * c, Y0 + 0.38, z - side * 0.75 * s, MAT.black(), yaw);
  }
  addSolid(ctx, x - 1, x + 1, z - 1, z + 1);
}
