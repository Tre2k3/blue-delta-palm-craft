import * as THREE from "three";
import type { Hoop } from "../core/types";
import { tex } from "../gfx/tex";
import { lotSurface } from "./buildings";
import {
  MAT,
  YAW,
  addSolid,
  emissiveMat,
  neon,
  poolMat,
  sign,
  std,
  tree,
  type BuildCtx,
} from "./kit";
import { CURB, HALLE, lot } from "./map";
import { buildHoops, chainMat, graffitiMat } from "./riverfront";

const Y0 = CURB;

export type Halle = {
  /** The north court's hoops and nets: the one a game is played on. */
  hoops: Hoop[];
  nets: THREE.Mesh[];
  /** Every rim and net on both courts, to be added to the scene. */
  meshes: THREE.Mesh[];
  /** Where a game is picked up: the gate of the north court. */
  gate: { x: number; z: number };
  /** Both courts: the shape, the hoops and nets, and the gate at the north end of each. */
  courts: {
    shape: (typeof HALLE.courts)[number];
    hoops: Hoop[];
    nets: THREE.Mesh[];
    gate: { x: number; z: number };
  }[];
  /** Seats on the stand, looking at the field. */
  seats: { x: number; z: number; y: number }[];
  /** Spots round the track where people stretch, walk and watch. */
  trackside: { x: number; z: number; lookX: number; lookZ: number }[];
};

/** A stadium outline (straights along Z) as points, `r` from the middle of each end. */
function stadium(cx: number, cz: number, hs: number, r: number, steps = 28) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (Math.PI * i) / steps;
    pts.push([cx + Math.cos(a) * r, cz - hs + Math.sin(a) * r]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = (Math.PI * i) / steps;
    pts.push([cx + Math.cos(a) * r, cz + hs + Math.sin(a) * r]);
  }
  return pts;
}

/** A flat ring between two stadium outlines, lying on the ground. */
function ringGeo(cx: number, cz: number, hs: number, r0: number, r1: number) {
  const outer = stadium(0, 0, hs, r1);
  const inner = stadium(0, 0, hs, r0);
  // Shape space: x right, y = -z, so it faces up once laid flat.
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
  shape.holes.push(new THREE.Path(inner.reverse().map(([x, z]) => new THREE.Vector2(x, -z))));
  const geo = new THREE.ShapeGeometry(shape, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate(cx, 0, cz);
  return geo;
}

function courtLines() {
  return tex(256, 512, (g, w, h) => {
    g.fillStyle = "#1f5a43";
    g.fillRect(0, 0, w, h);
    // The keys, painted.
    g.fillStyle = "#2b3f86";
    g.fillRect(w / 2 - 44, 0, 88, 104);
    g.fillRect(w / 2 - 44, h - 104, 88, 104);
    g.strokeStyle = "#f4f1ea";
    g.lineWidth = 3;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, h / 2, 30, 0, Math.PI * 2);
    g.stroke();
    for (const end of [0, 1]) {
      const y = end ? h - 104 : 104;
      g.strokeRect(w / 2 - 44, end ? h - 104 : 0, 88, 104);
      g.beginPath();
      g.arc(w / 2, y, 30, 0, Math.PI * 2);
      g.stroke();
      // The three-point line.
      g.beginPath();
      const ry = end ? h - 26 : 26;
      g.arc(w / 2, ry, 112, end ? Math.PI + 0.15 : 0.15, end ? -0.15 : Math.PI - 0.15);
      g.stroke();
    }
  });
}

/**
 * Halle Stadium on Mt. Moriah Road: the six-lane track round the football field, the stand on
 * the west side with the press box, floodlights at the corners, the scoreboard at the south end,
 * and two outdoor courts beside it on the east.
 */
export function buildHalle(ctx: BuildCtx): Halle {
  const L = lot(1, 8);
  lotSurface(ctx, L, "grass");
  const { cx, cz, halfStraight: hs, radius: R, lanes, laneW } = HALLE.track;
  const r0 = R - lanes * laneW;

  // The track: red rubber, white lane lines, and a kerb round the inside.
  const rubber = std(0xa4372a, 0.95);
  ctx.ground.add(ringGeo(cx, cz, hs, r0, R), rubber, 0, Y0 + 0.012, 0);
  const white = new THREE.MeshBasicMaterial({ color: 0xf4f1ea });
  for (let i = 0; i <= lanes; i++) {
    const r = r0 + i * laneW;
    ctx.ground.add(ringGeo(cx, cz, hs, r - 0.04, r + 0.04), white, 0, Y0 + 0.02, 0);
  }
  ctx.ground.add(ringGeo(cx, cz, hs, r0 - 0.35, r0), std(0xe8e4dc, 0.7), 0, Y0 + 0.03, 0);
  // The start and finish line across the home straight, and the lane numbers' blocks.
  ctx.ground.flat(
    lanes * laneW,
    0.3,
    cx - r0 - (lanes * laneW) / 2,
    Y0 + 0.024,
    cz + hs - 2,
    white,
  );

  // The field: football lines, the end zones, the goalposts.
  const fieldW = r0 * 1.62;
  const fieldL = hs * 2 + r0 * 0.9;
  ctx.ground.flat(fieldW, fieldL, cx, Y0 + 0.006, cz, std(0x2f7a3a, 0.95));
  for (let i = 0; i <= 10; i++) {
    const z = cz - fieldL / 2 + fieldL * 0.1 + (fieldL * 0.8 * i) / 10;
    ctx.ground.flat(fieldW, 0.18, cx, Y0 + 0.012, z, white);
  }
  for (const end of [-1, 1]) {
    ctx.ground.flat(
      fieldW,
      fieldL * 0.1,
      cx,
      Y0 + 0.01,
      cz + end * fieldL * 0.45,
      std(0x1d3f7a, 0.9),
    );
    const gz = cz + end * (fieldL / 2 + 1);
    const gold = std(0xf2c230, 0.4, 0.3);
    ctx.solid.cyl(0.12, 0.12, 3, cx, Y0 + 1.5, gz, gold, 8);
    ctx.solid.box(5.6, 0.18, 0.18, cx, Y0 + 3, gz, gold);
    ctx.solid.cyl(0.08, 0.08, 6, cx - 2.8, Y0 + 6, gz, gold, 6);
    ctx.solid.cyl(0.08, 0.08, 6, cx + 2.8, Y0 + 6, gz, gold, 6);
    addSolid(ctx, cx - 0.2, cx + 0.2, gz - 0.2, gz + 0.2);
  }
  ctx.flat.flat(
    6,
    6,
    cx,
    Y0 + 0.016,
    cz,
    new THREE.MeshBasicMaterial({ map: neonCrest(), transparent: true, toneMapped: false }),
  );

  // The stand on the west side: concrete steps with benches, the press box on top.
  const S = HALLE.stand;
  const seats: { x: number; z: number; y: number }[] = [];
  const rows = 6;
  const step = (S.maxX - S.minX) / rows;
  const concrete = MAT.concrete();
  const plank = std(0x8a8f96, 0.5, 0.6);
  for (let i = 0; i < rows; i++) {
    const x0 = S.maxX - (i + 1) * step;
    const h = 0.45 * (i + 1);
    ctx.solid.box(
      step,
      h,
      S.maxZ - S.minZ,
      x0 + step / 2,
      Y0 + h / 2,
      (S.minZ + S.maxZ) / 2,
      concrete,
    );
    ctx.solid.box(
      step * 0.5,
      0.08,
      S.maxZ - S.minZ - 0.6,
      x0 + step * 0.6,
      Y0 + h + 0.25,
      (S.minZ + S.maxZ) / 2,
      plank,
    );
    if (i < 3)
      for (let z = S.minZ + 3; z < S.maxZ - 2; z += 4.5)
        seats.push({ x: x0 + step * 0.6, z, y: h });
  }
  addSolid(ctx, S.minX, S.maxX, S.minZ, S.maxZ);
  const boxH = 3.2;
  const top = Y0 + rows * 0.45;
  ctx.solid.box(
    S.maxX - S.minX + 0.6,
    boxH,
    22,
    (S.minX + S.maxX) / 2,
    top + boxH / 2,
    cz,
    std(0x2a2f36, 0.6, 0.2),
  );
  ctx.solid.box(
    0.1,
    1.2,
    20,
    S.maxX + 0.32,
    top + 1.9,
    cz,
    new THREE.MeshStandardMaterial({
      color: 0x223040,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x4a6a90,
      emissiveIntensity: 0.3,
    }),
  );
  ctx.flat.wall(
    16,
    1.5,
    S.maxX + 0.36,
    top + boxH + 0.9,
    cz,
    neon(ctx, "HALLE STADIUM", "#ffd23a", { w: 768, h: 128 }),
    YAW.east,
  );
  ctx.solid.box(0.3, 1.7, 16.6, S.maxX + 0.2, top + boxH + 0.9, cz, MAT.black());

  // The scoreboard at the south end, facing the field.
  const sbz = L.maxZ - 1;
  const board = tex(512, 256, (g, w, h) => {
    g.fillStyle = "#0b0d10";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffd23a";
    g.font = '900 46px "Bebas Neue", Impact, sans-serif';
    g.textAlign = "center";
    g.fillText("HALLE STADIUM", w / 2, 52);
    g.font = '900 30px "Bebas Neue", Impact, sans-serif';
    g.fillStyle = "#f4f1ea";
    g.fillText("HOME", w * 0.25, 106);
    g.fillText("GUEST", w * 0.75, 106);
    g.fillStyle = "#ff3b3b";
    g.font = '900 90px "Bebas Neue", Impact, sans-serif';
    g.fillText("21", w * 0.25, 196);
    g.fillText("14", w * 0.75, 196);
    g.fillStyle = "#39ff14";
    g.font = '900 34px "Bebas Neue", Impact, sans-serif';
    g.fillText("4TH  2:00", w / 2, 160);
  });
  const sbMat = new THREE.MeshBasicMaterial({ map: board, toneMapped: false });
  ctx.solid.box(12.6, 6.6, 0.5, cx, Y0 + 8.6, sbz, MAT.black());
  ctx.flat.wall(12, 6, cx, Y0 + 8.6, sbz - 0.27, sbMat, YAW.north);
  for (const side of [-4.5, 4.5]) {
    ctx.solid.cyl(0.18, 0.2, 5.3, cx + side, Y0 + 2.65, sbz, MAT.steel(), 8);
    addSolid(ctx, cx + side - 0.3, cx + side + 0.3, sbz - 0.3, sbz + 0.3);
  }

  // The gate on Mt. Moriah's side of Park Avenue: the arch with the name.
  const gz = L.minZ + 0.6;
  ctx.solid.box(0.6, 5, 0.6, cx - 6, Y0 + 2.5, gz, std(0x7a1f1f, 0.8));
  ctx.solid.box(0.6, 5, 0.6, cx + 6, Y0 + 2.5, gz, std(0x7a1f1f, 0.8));
  ctx.solid.box(13.2, 1.4, 0.5, cx, Y0 + 5.4, gz, std(0x7a1f1f, 0.8));
  ctx.flat.wall(
    12,
    1.2,
    cx,
    Y0 + 5.4,
    gz - 0.27,
    sign("HALLE STADIUM", "#f3e9c8", "#7a1f1f", { sub: "MT. MORIAH ROAD", w: 768, h: 128 }),
    YAW.north,
  );
  addSolid(ctx, cx - 6.3, cx - 5.7, gz - 0.3, gz + 0.3);
  addSolid(ctx, cx + 5.7, cx + 6.3, gz - 0.3, gz + 0.3);

  // Floodlights on four tall poles.
  const poleMat = MAT.steel();
  const lamp = emissiveMat(ctx, 0xfff4dc, 0.2, 3.2);
  for (const [px, pz] of [
    [S.minX + 1, L.minZ + 3],
    [S.minX + 1, L.maxZ - 3],
    [cx + R + 3.5, L.minZ + 3],
    [cx + R + 3.5, L.maxZ - 3],
  ] as const) {
    ctx.solid.cyl(0.25, 0.32, 20, px, Y0 + 10, pz, poleMat, 8);
    const face = px < cx ? YAW.east : YAW.west;
    ctx.solid.box(3.4, 2.2, 0.4, px, Y0 + 20.6, pz, MAT.black(), face);
    ctx.solid.box(3.1, 1.9, 0.1, px + (px < cx ? 0.24 : -0.24), Y0 + 20.6, pz, lamp, face);
    ctx.lamps.push({ x: px, y: Y0 + 19, z: pz, color: 0xfff4dc });
    addSolid(ctx, px - 0.4, px + 0.4, pz - 0.4, pz + 0.4);
  }
  ctx.flat.flat(R * 2.4, hs * 2 + R * 2.2, cx, Y0 + 0.03, cz, poolMat(ctx, 0xfff0d0, 0.18));

  // ---- The courts beside the track.
  const surface = new THREE.MeshStandardMaterial({
    map: courtLines(),
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const chain = chainMat();
  const post = MAT.steel();
  const meshes: THREE.Mesh[] = [];
  let first: { hoops: Hoop[]; nets: THREE.Mesh[] } | null = null;
  const courts: Halle["courts"] = [];
  HALLE.courts.forEach((c, k) => {
    ctx.ground.flat(
      (c.halfW + 1.6) * 2,
      (c.halfL + 1.6) * 2,
      c.cx,
      Y0 + 0.004,
      c.cz,
      std(0x2a2d31, 0.85),
    );
    ctx.ground.flat(c.halfW * 2, c.halfL * 2, c.cx, Y0 + 0.008, c.cz, surface);
    const built = buildHoops(ctx, c, "HALLE", "MT. MORIAH");
    meshes.push(...built.nets, ...built.rims);
    if (!first) first = { hoops: built.hoops, nets: built.nets };
    courts.push({
      shape: c,
      hoops: built.hoops,
      nets: built.nets,
      gate: { x: c.cx, z: c.cz - c.halfL - 2.6 },
    });
    // The fence, open on the west side to the track and with a gate on the north end.
    const x0 = c.cx - c.halfW - 1.6;
    const x1 = c.cx + c.halfW + 1.6;
    const z0 = c.cz - c.halfL - 1.6;
    const z1 = c.cz + c.halfL + 1.6;
    const fence = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const yaw = Math.abs(bx - ax) > 0.1 ? 0 : Math.PI / 2;
      ctx.solid.wall(
        len,
        3,
        (ax + bx) / 2,
        Y0 + 1.5,
        (az + bz) / 2,
        chain,
        yaw,
        len / 0.5,
        3 / 0.5,
      );
      ctx.solid.box(
        Math.abs(bx - ax) + 0.08,
        0.08,
        Math.abs(bz - az) + 0.08,
        (ax + bx) / 2,
        Y0 + 3,
        (az + bz) / 2,
        post,
      );
      addSolid(
        ctx,
        Math.min(ax, bx) - 0.08,
        Math.max(ax, bx) + 0.08,
        Math.min(az, bz) - 0.08,
        Math.max(az, bz) + 0.08,
      );
    };
    fence(x1, z0, x1, z1);
    if (k === 0) {
      fence(x0, z0, c.cx - 2.2, z0);
      fence(c.cx + 2.2, z0, x1, z0);
    } else fence(x0, z1, x1, z1);
    // A painted board on the east fence of each court.
    ctx.solid.box(0.08, 2.7, 10.2, x1 - 0.14, Y0 + 1.5, c.cz, MAT.wood());
    ctx.solid.wall(
      10,
      2.6,
      x1 - 0.2,
      Y0 + 1.5,
      c.cz,
      graffitiMat(
        ctx,
        k ? ["HICKORY", "HILL"] : ["MT MORIAH"],
        k ? ["#5ac8ff", "#2a6ad0"] : ["#ffd23a", "#d08a1a"],
        "#101010",
      ),
      YAW.west,
    );
  });

  // Trees along Mt. Moriah and round the edge.
  for (let z = L.minZ + 4; z < L.maxZ - 2; z += 9)
    tree(ctx, L.minX + 1.5, z, 1 + ctx.rand() * 0.3, Y0);
  for (let x = L.minX + 6; x < L.maxX - 3; x += 11)
    tree(ctx, x, L.maxZ - 1.2, 1 + ctx.rand() * 0.3, Y0);

  const trackside: Halle["trackside"] = [];
  for (const dz of [-14, -4, 6, 16])
    trackside.push({ x: cx - R - 1.4, z: cz + dz, lookX: cx, lookZ: cz + dz });
  for (const dz of [-10, 10])
    trackside.push({ x: cx + R + 1.6, z: cz + dz, lookX: cx, lookZ: cz + dz });

  const north = HALLE.courts[0];
  return {
    hoops: first!.hoops,
    nets: first!.nets,
    meshes,
    gate: { x: north.cx, z: north.cz - north.halfL - 2.6 },
    courts,
    seats,
    trackside,
  };
}

/** The crest in the middle of the field. */
function neonCrest() {
  return tex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(122,31,31,0.85)";
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffd23a";
    g.font = '900 64px "Bebas Neue", Impact, sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("HALLE", w / 2, h / 2);
  });
}
