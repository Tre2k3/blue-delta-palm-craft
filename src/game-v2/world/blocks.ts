import * as THREE from "three";
import { paintMat, tex } from "../gfx/tex";
import { garage, house, lotSurface, midrise, mural, shopRow, tower } from "./buildings";
import { MAT, Frame, YAW, addSolid, bench, bush, emissiveMat, facade, globeLamp, neon, poolMat, sign, std, storefront, tree, type BuildCtx } from "./kit";
import { ARENA, BOWL, CURB, HOME, lot, rect, STREETS_X } from "./map";
import { blockText } from "./riverfront";
import { buildFunExterior } from "./funhouse";

const Y0 = CURB;

export type BlockAnchors = {
  homeDoor: { x: number; z: number };
  homeWalk: { x: number; z: number };
  bowlDoor: { x: number; z: number };
  stage: { x: number; z: number };
  diner: { x: number; z: number };
};

/** Every block between Riverside Drive and Park Avenue. Designed, not rolled. */
export function buildBlocks(ctx: BuildCtx): BlockAnchors {
  downtown(ctx);
  const stage = bealeSouth(ctx);
  const mid = midtown(ctx);
  const home = neighborhood(ctx);
  edges(ctx);
  return { ...home, ...mid, stage };
}

/** Row 0: the towers, with the north side of Beale along their feet. */
function downtown(ctx: BuildCtx) {
  for (let c = 0; c < 4; c++) {
    const L = lot(c, 0);
    lotSurface(ctx, L, "concrete");
    shopRow(ctx, L.minX, L.maxX, L.maxZ, "south", 12, c * 5);
  }
  tower(ctx, rect(-119, -97, -131, -103), 52, "tan", { crown: "band", band: 0xffc878, variant: 0, accent: "#3a2a1a" });
  ctx.flat.wall(12, 2.6, -108, Y0 + 54.6, -103 + 0.2, neon(ctx, "THE GRAND", "#ffb400", { w: 512, h: 112, border: false, board: "#120e0a" }), YAW.south);
  tower(ctx, rect(-93, -73, -131, -107), 74, "glassBlue", { crown: "flat", variant: 1 });
  tower(ctx, rect(-55, -31, -131, -105), 112, "glassDark", { crown: "spire", band: 0x39ff14, variant: 0 });
  tower(ctx, rect(-27, -9, -131, -109), 60, "concrete", { crown: "setback", variant: 1 });
  tower(ctx, rect(9, 33, -131, -105), 88, "white", { crown: "ring", band: 0xffe2b0, variant: 0 });
  tower(ctx, rect(37, 55, -131, -111), 54, "glassGold", { crown: "band", band: 0xffb400, variant: 1 });
  tower(ctx, rect(73, 95, -131, -107), 68, "concrete", { crown: "band", band: 0xbfe0ff, variant: 2 });
  garage(ctx, rect(99, 119, -131, -103), 5);
}

/** Row 1: south side of Beale, the lofts behind it, the park and the smokehouse. */
function bealeSouth(ctx: BuildCtx) {
  for (const c of [0, 1, 3]) {
    const L = lot(c, 1);
    lotSurface(ctx, L, "concrete");
    shopRow(ctx, L.minX, L.maxX, L.minZ, "north", 12, 20 + c * 5);
  }
  midrise(ctx, rect(-119, -99, -51, -21), 22, "brickRed", { shops: ["west", "south"], accent: 0x1f4a2c, variant: 0 });
  midrise(ctx, rect(-95, -73, -51, -25), 30, "brickCream", { shops: ["south", "east"], accent: 0x5a3a12, variant: 1, sign: { text: "SOUTH MAIN LOFTS", color: "#ffd23a", face: "east", y: 6 } });

  // The Memphian: old movie palace on Union.
  const theater = rect(-55, -25, -51, -21);
  midrise(ctx, theater, 20, "brickDark", { variant: 2 });
  const tf = new Frame(ctx, -40, -21, YAW.south);
  tf.box(16, 1.8, 3.4, 0, Y0 + 5, 1.7, MAT.black());
  const marquee = neon(ctx, "THE MEMPHIAN", "#ffb400", { sub: "LIVE TONIGHT · BLUES REVUE", w: 768, h: 192 });
  tf.wall(15.6, 1.7, 0, Y0 + 5, 3.42, marquee, ctx.flat);
  tf.wall(3.3, 1.7, 8.02, Y0 + 5, 1.7, neon(ctx, "TONIGHT", "#ff3b3b", { w: 256, h: 128 }), ctx.flat, Math.PI / 2);
  tf.wall(3.3, 1.7, -8.02, Y0 + 5, 1.7, neon(ctx, "TONIGHT", "#ff3b3b", { w: 256, h: 128 }), ctx.flat, -Math.PI / 2);
  tf.box(15, 0.12, 3.2, 0, Y0 + 4.05, 1.7, emissiveMat(ctx, 0xffd9a0, 0.5, 3));
  tf.wall(12, 3.8, 0, Y0 + 1.9, 0.06, storefront(ctx, 5, "#17110e", true), ctx.solid, 0, 2, 1);
  tf.flat(16, 9, 0, Y0 + 0.02, 4, poolMat(ctx, 0xffb46a, 0.5), ctx.flat);
  tf.flat(14, 9, 0, 0.03, 10, poolMat(ctx, 0xffb400, 0.3), ctx.flat);
  tf.lamp(0, Y0 + 3.6, 3, 0xffc878);
  // Vertical blade above the marquee.
  tf.box(1.6, 9, 0.5, 0, Y0 + 13, 0.9, MAT.black());
  const vert = tex(96, 512, (g, w, h) => {
    g.fillStyle = "#0b0b0d";
    g.fillRect(0, 0, w, h);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = '900 62px "Bebas Neue", Impact, sans-serif';
    g.shadowColor = "#ff3b3b";
    g.shadowBlur = 16;
    g.fillStyle = "#ffd8d0";
    [..."MEMPHIAN"].forEach((ch, i) => g.fillText(ch, w / 2, 40 + i * 62));
  }, { repeat: false });
  const vertMat = new THREE.MeshBasicMaterial({ map: vert, toneMapped: false });
  ctx.glow.basic(vertMat, 0.7, 2.1);
  tf.wall(1.5, 8.8, 0, Y0 + 13, 1.16, vertMat, ctx.flat);
  midrise(ctx, rect(-21, -9, -51, -21), 26, "concrete", { shops: ["east", "south"], accent: 0x1d2f55, variant: 1 });

  // Handy Park: open square on Beale with a stage.
  const P = lot(2, 1);
  lotSurface(ctx, P, "plaza");
  const sx = (P.minX + P.maxX) / 2;
  const sz = P.maxZ - 6;
  ctx.solid.box(16, 1, 8, sx, Y0 + 0.5, sz, MAT.darkWood());
  for (const px of [-7.6, 7.6]) for (const pz of [-3.6, 3.6]) ctx.solid.cyl(0.14, 0.14, 5.6, sx + px, Y0 + 3.8, sz + pz, MAT.black(), 6);
  ctx.solid.add(new THREE.BoxGeometry(17, 0.2, 9), MAT.black(), sx, Y0 + 6.7, sz, 0, -0.1);
  ctx.solid.wall(15.4, 4.6, sx, Y0 + 3.6, sz + 3.7, MAT.brick("#33221e", 4), YAW.north, 4, 1.2);
  ctx.flat.wall(10, 2.2, sx, Y0 + 4.6, sz + 3.6, neon(ctx, "LIVE ON BEALE", "#ff4fd8", { sub: "HOME OF THE BLUES", w: 768, h: 192 }), YAW.north);
  ctx.flat.flat(18, 12, sx, Y0 + 1.02, sz - 1, poolMat(ctx, 0xff7ae0, 0.4));
  ctx.lamps.push({ x: sx, y: Y0 + 5, z: sz - 2, color: 0xff7ae0 });
  addSolid(ctx, sx - 8, sx + 8, sz - 4, sz + 4);
  // Statue of the horn player in the middle of the square.
  const mx = sx;
  const mz = P.minZ + 16;
  ctx.solid.box(2.4, 1.4, 2.4, mx, Y0 + 0.7, mz, MAT.concrete());
  ctx.solid.cyl(0.32, 0.4, 1.9, mx, Y0 + 2.35, mz, std(0x4a5a4a, 0.5, 0.7), 8);
  ctx.solid.add(new THREE.SphereGeometry(0.34, 10, 8), std(0x4a5a4a, 0.5, 0.7), mx, Y0 + 3.6, mz);
  ctx.solid.add(new THREE.ConeGeometry(0.22, 1.1, 8), std(0x9a7a3a, 0.35, 0.9), mx + 0.2, Y0 + 3.3, mz - 0.7, 0, Math.PI / 2.2);
  addSolid(ctx, mx - 1.2, mx + 1.2, mz - 1.2, mz + 1.2);
  for (const [tx, tz] of [
    [P.minX + 5, P.minZ + 6],
    [P.maxX - 5, P.minZ + 6],
    [P.minX + 5, P.minZ + 24],
    [P.maxX - 5, P.minZ + 24],
  ] as const) {
    tree(ctx, tx, tz, 1.2, Y0);
    bench(ctx, tx + (tx < sx ? 3 : -3), tz, tx < sx ? YAW.east : YAW.west, Y0);
  }
  for (const [lx, lz] of [
    [P.minX + 2, P.minZ + 2],
    [P.maxX - 2, P.minZ + 2],
    [P.minX + 2, P.minZ + 15],
    [P.maxX - 2, P.minZ + 15],
    [P.minX + 2, P.maxZ - 12],
    [P.maxX - 2, P.maxZ - 12],
  ] as const) globeLamp(ctx, lx, lz, Y0);
  // Arch over the Beale side.
  const arch = MAT.black();
  for (const s of [-1, 1]) ctx.solid.cyl(0.18, 0.2, 5.6, sx + s * 8, Y0 + 2.8, P.minZ + 0.6, arch, 8);
  ctx.solid.box(16.6, 0.3, 0.3, sx, Y0 + 5.6, P.minZ + 0.6, arch);
  ctx.flat.wall(12, 1.5, sx, Y0 + 6.5, P.minZ + 0.6, neon(ctx, "BEALE STREET", "#39ff14", { w: 768, h: 112, border: false }), YAW.north);
  ctx.flat.wall(12, 1.5, sx, Y0 + 6.5, P.minZ + 0.58, neon(ctx, "BEALE STREET", "#39ff14", { w: 768, h: 112, border: false }), YAW.south);

  // Smokehouse and its mural on Union.
  const bbq = rect(73, 101, -51, -21);
  midrise(ctx, bbq, 11, "brickBrown", { shops: ["south"], accent: 0x7a1f1f, variant: 2, sign: { text: "CHARCOAL ALLEY BBQ", color: "#ff3b3b", face: "south", y: 7.4, w: 14 } });
  ctx.solid.cyl(0.6, 0.7, 6, 78, Y0 + 14, -46, MAT.brick("#5c3a2a", 3), 8);
  ctx.solid.add(new THREE.SphereGeometry(0.5, 8, 6), emissiveMat(ctx, 0xff5a1e, 0.6, 3), 78, Y0 + 17.1, -46);
  midrise(ctx, rect(105, 119, -51, -21), 17, "brickRed", { shops: ["east"], accent: 0x2b2b2e, variant: 0 });
  mural(ctx, 112, -21 + 0.08, YAW.south, 13, 6.5, "soul");
  return { x: sx, z: sz - 6 };
}

function guitarSign(ctx: BuildCtx) {
  const map = tex(
    256,
    512,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.lineWidth = 9;
      g.strokeStyle = "#ffd23a";
      g.shadowColor = "#ffb400";
      g.shadowBlur = 20;
      g.beginPath();
      g.ellipse(w / 2, h * 0.76, 82, 96, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.ellipse(w / 2, h * 0.54, 56, 60, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(w / 2, h * 0.72, 22, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = "#ffffff";
      g.shadowColor = "#ff3b3b";
      g.strokeRect(w / 2 - 13, 40, 26, h * 0.42);
      g.strokeRect(w / 2 - 24, 10, 48, 44);
    },
    { repeat: false },
  );
  const mat = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.04, toneMapped: false, side: THREE.DoubleSide });
  ctx.glow.basic(mat, 0.75, 2.2);
  return mat;
}

function pinGeo(scale: number) {
  const pts: THREE.Vector2[] = [];
  const profile: [number, number][] = [
    [0.0, 0.0],
    [0.5, 0.0],
    [0.62, 0.12],
    [0.66, 0.3],
    [0.56, 0.5],
    [0.34, 0.66],
    [0.26, 0.74],
    [0.33, 0.85],
    [0.3, 0.94],
    [0.16, 1.0],
    [0.0, 1.0],
  ];
  for (const [r, y] of profile) pts.push(new THREE.Vector2(r * scale * 0.5, y * scale * 1.9));
  return new THREE.LatheGeometry(pts, 14);
}

/** Row 2: diner and gas, the studio corner, the arena, the bowl. */
function midtown(ctx: BuildCtx) {
  // Diner and gas station.
  const D = lot(0, 2);
  lotSurface(ctx, D, "parking");
  const diner = rect(-119, -95, -3, 12);
  const dcx = (diner.minX + diner.maxX) / 2;
  const dcz = (diner.minZ + diner.maxZ) / 2;
  ctx.solid.box(24, 4.4, 15, dcx, Y0 + 2.2, dcz, MAT.chrome());
  ctx.solid.box(24.6, 0.5, 15.6, dcx, Y0 + 4.6, dcz, std(0xb3261c, 0.5, 0.3));
  ctx.solid.box(24.3, 0.5, 15.3, dcx, Y0 + 0.9, dcz, std(0xb3261c, 0.5, 0.3));
  const dwin = storefront(ctx, 3, "#b3261c");
  ctx.solid.wall(23, 2.6, dcx, Y0 + 2.6, diner.minZ - 0.04, dwin, YAW.north, 3, 0.72);
  ctx.solid.wall(14, 2.6, diner.maxX + 0.04, Y0 + 2.6, dcz, dwin, YAW.east, 2, 0.72);
  ctx.flat.wall(12, 2.2, dcx, Y0 + 6.4, diner.minZ + 1, neon(ctx, "901 DINER", "#ff3b3b", { sub: "OPEN ALL NIGHT", w: 640, h: 144 }), YAW.north);
  ctx.solid.box(12.4, 2.5, 0.3, dcx, Y0 + 6.4, diner.minZ + 1.2, MAT.black());
  ctx.flat.flat(24, 8, dcx, Y0 + 0.02, diner.minZ - 3, poolMat(ctx, 0xff6a5a, 0.4));
  ctx.lamps.push({ x: dcx, y: Y0 + 4, z: diner.minZ - 2, color: 0xff6a5a });
  addSolid(ctx, diner.minX, diner.maxX, diner.minZ, diner.maxZ);
  // Canopy and pumps.
  const gx = -88;
  const gz = 30;
  ctx.solid.box(16, 0.7, 10, gx, Y0 + 5.2, gz, MAT.white());
  ctx.solid.box(16.2, 0.24, 10.2, gx, Y0 + 5.0, gz, std(0x1f4a2c, 0.5));
  ctx.solid.box(15, 0.08, 9, gx, Y0 + 4.82, gz, emissiveMat(ctx, 0xfff4e0, 0.4, 3));
  for (const px of [-6.5, 6.5]) for (const pz of [-3.6, 3.6]) ctx.solid.box(0.4, 4.9, 0.4, gx + px, Y0 + 2.45, gz + pz, MAT.white());
  for (const px of [-3.6, 3.6]) {
    ctx.solid.box(0.8, 0.2, 3.4, gx + px, Y0 + 0.1, gz, MAT.concrete());
    for (const pz of [-0.9, 0.9]) {
      ctx.solid.box(0.6, 1.5, 0.5, gx + px, Y0 + 0.95, gz + pz, std(0x1f4a2c, 0.5, 0.2));
      ctx.solid.box(0.5, 0.4, 0.06, gx + px, Y0 + 1.4, gz + pz + 0.26, emissiveMat(ctx, 0xbfe0ff, 0.5, 2.4));
    }
    addSolid(ctx, gx + px - 0.5, gx + px + 0.5, gz - 1.8, gz + 1.8);
  }
  ctx.flat.flat(18, 13, gx, Y0 + 0.02, gz, poolMat(ctx, 0xfff4e0, 0.5));
  ctx.lamps.push({ x: gx, y: Y0 + 4.4, z: gz, color: 0xfff4e0 });
  midrise(ctx, rect(-119, -105, 27, 43), 4.6, "brickCream", { shops: ["east"], accent: 0x1f4a2c, variant: 0, sign: { text: "GAS & GO", color: "#39ff14", face: "east", y: 4.4, w: 8 } });

  // Soul Studio, the record shop and the mural building.
  const S = lot(1, 2);
  lotSurface(ctx, S, "grass");
  midrise(ctx, rect(-55, -37, -3, 15), 9, "brickRed", { shops: ["north", "west"], accent: 0x2b2b2e, variant: 1, sign: { text: "SOUL STUDIO", color: "#ffd23a", face: "north", y: 6.2, w: 12 } });
  const guitar = guitarSign(ctx);
  ctx.flat.wall(4.4, 8.8, -54.2, Y0 + 13, -2.2, guitar, YAW.north);
  ctx.solid.cyl(0.12, 0.12, 5, -54.2, Y0 + 11.4, -2, MAT.black(), 6);
  midrise(ctx, rect(-33, -9, -3, 11), 8, "brickCream", { shops: ["north", "east"], accent: 0x6a1f4a, variant: 2, sign: { text: "901 RECORDS", color: "#ff4fd8", face: "north", y: 5.6, w: 12 } });
  const mb = rect(-55, -27, 27, 43);
  midrise(ctx, mb, 12, "brickBrown", { variant: 0 });
  mural(ctx, -41, mb.maxZ + 0.08, YAW.south, 24, 8, "love");
  mural(ctx, mb.minX - 0.08, 35, YAW.west, 13, 7, "901");
  for (const [tx, tz] of [
    [-20, 22],
    [-14, 34],
    [-46, 21],
    [-32, 19],
  ] as const) tree(ctx, tx, tz, 1.3, Y0);
  bench(ctx, -18, 28, YAW.west, Y0);
  globeLamp(ctx, -24, 24, Y0);
  for (let i = 0; i < 8; i++) bush(ctx, -23 + ctx.rand() * 12, 16 + ctx.rand() * 24, 1, Y0);

  // 901 Arena.
  const A = lot(2, 2);
  lotSurface(ctx, A, "plaza");
  const af = facade(ctx, "glassBlue", 2);
  const drum = new THREE.CylinderGeometry(ARENA.r, ARENA.r, 20, 40, 1, true);
  const uv = drum.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((Math.PI * 2 * ARENA.r) / af.tileW), uv.getY(i) * (20 / af.tileH));
  ctx.solid.add(drum, af.mat, ARENA.cx, Y0 + 10, ARENA.cz);
  const dome = new THREE.SphereGeometry(ARENA.r + 0.6, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.28, 1);
  ctx.solid.add(dome, std(0xcfd4da, 0.4, 0.5), ARENA.cx, Y0 + 20, ARENA.cz);
  ctx.solid.add(new THREE.CylinderGeometry(ARENA.r + 0.3, ARENA.r + 0.3, 1.4, 40, 1, true), emissiveMat(ctx, 0x3aa0ff, 0.15, 2.6), ARENA.cx, Y0 + 19.4, ARENA.cz);
  ctx.solid.add(new THREE.CylinderGeometry(ARENA.r + 0.4, ARENA.r + 0.4, 4.6, 40, 1, true), storefront(ctx, 6, "#0c1218", true), ARENA.cx, Y0 + 2.3, ARENA.cz);
  ctx.flat.wall(16, 3.4, ARENA.cx, Y0 + 9, ARENA.cz - ARENA.r - 0.5, neon(ctx, "901 ARENA", "#3aa0ff", { sub: "GRIND CITY", w: 768, h: 192 }), YAW.north);
  ctx.flat.wall(16, 3.4, ARENA.cx, Y0 + 9, ARENA.cz + ARENA.r + 0.5, neon(ctx, "901 ARENA", "#3aa0ff", { sub: "GRIND CITY", w: 768, h: 192 }), YAW.south);
  ctx.flat.flat(46, 46, ARENA.cx, Y0 + 0.02, ARENA.cz, poolMat(ctx, 0x6ab8ff, 0.3));
  const k = ARENA.r * 0.72;
  addSolid(ctx, ARENA.cx - ARENA.r, ARENA.cx + ARENA.r, ARENA.cz - k * 0.72, ARENA.cz + k * 0.72);
  addSolid(ctx, ARENA.cx - k * 0.72, ARENA.cx + k * 0.72, ARENA.cz - ARENA.r, ARENA.cz + ARENA.r);
  addSolid(ctx, ARENA.cx - k, ARENA.cx + k, ARENA.cz - k, ARENA.cz + k);
  for (const [lx, lz] of [
    [A.minX + 2, A.minZ + 2],
    [A.maxX - 2, A.minZ + 2],
    [A.minX + 2, A.maxZ - 2],
    [A.maxX - 2, A.maxZ - 2],
  ] as const) globeLamp(ctx, lx, lz, Y0, 0xbfe0ff);

  // 901 Bowl.
  const B = lot(3, 2);
  lotSurface(ctx, B, "parking");
  const bw = BOWL.maxX - BOWL.minX;
  const bd = BOWL.maxZ - BOWL.minZ;
  const bcx = (BOWL.minX + BOWL.maxX) / 2;
  const bcz = (BOWL.minZ + BOWL.maxZ) / 2;
  const stucco = std(0xe9e2d2, 0.9);
  ctx.solid.box(bw, 7.4, bd, bcx, Y0 + 3.7, bcz, stucco);
  ctx.solid.flat(bw, bd, bcx, Y0 + 7.42, bcz, MAT.roof());
  ctx.solid.box(bw + 0.4, 0.9, bd + 0.4, bcx, Y0 + 6.6, bcz, std(0x1aa7a0, 0.6));
  ctx.solid.box(bw + 0.3, 0.5, bd + 0.3, bcx, Y0 + 5.6, bcz, std(0xe0457f, 0.6));
  const bf = new Frame(ctx, bcx, BOWL.frontZ, YAW.south);
  bf.wall(9, 3.6, 0, Y0 + 1.8, 0.06, storefront(ctx, 2, "#1aa7a0"), ctx.solid, 0, 1, 1);
  bf.box(11, 0.3, 3.4, 0, Y0 + 4, 1.7, std(0xe0457f, 0.6));
  bf.box(10.4, 0.1, 3, 0, Y0 + 3.82, 1.7, emissiveMat(ctx, 0xffe2c0, 0.5, 3));
  for (const s of [-1, 1]) bf.box(0.3, 3.9, 0.3, s * 5.2, Y0 + 1.95, 3.1, std(0x1aa7a0, 0.6));
  bf.flat(12, 9, 0, Y0 + 0.02, 4.4, poolMat(ctx, 0xff8ac0, 0.46), ctx.flat);
  bf.lamp(0, Y0 + 3.4, 3, 0xff8ac0);
  // Roof sign: block lettering and a giant pin.
  const lit = new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.5, emissive: 0xff5ad1, emissiveIntensity: 0.1 });
  ctx.glow.emissive(lit, 0.1, 1.5);
  ctx.solid.box(26, 0.3, 0.6, bcx - 2, Y0 + 7.7, BOWL.frontZ - 1.2, MAT.black());
  blockText(ctx, "901 BOWL", bcx - 2, Y0 + 8, BOWL.frontZ - 1.2, YAW.south, 0.46, lit, 0.5);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.35, emissive: 0xfff0d8, emissiveIntensity: 0.06 });
  ctx.glow.emissive(pinMat, 0.06, 0.9);
  ctx.solid.add(pinGeo(4.2), pinMat, BOWL.maxX - 4, Y0 + 7.4, BOWL.frontZ - 3);
  ctx.solid.add(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 14, 1, true), std(0xc8261c, 0.5), BOWL.maxX - 4, Y0 + 13.4, BOWL.frontZ - 3);
  ctx.solid.add(new THREE.SphereGeometry(1.5, 16, 12), std(0x16161a, 0.25, 0.6), BOWL.maxX - 8.4, Y0 + 8.9, BOWL.frontZ - 3);
  addSolid(ctx, BOWL.minX, BOWL.maxX, BOWL.minZ, BOWL.maxZ);
  const stripe = paintMat(0xe8e6de, 0.7);
  for (let x = B.minX + 4; x <= B.maxX - 3; x += 3) {
    if (Math.abs(x - bcx) < 6) continue;
    ctx.flat.flat(0.12, 5.2, x, Y0 + 0.012, B.maxZ - 3.2, stripe);
  }
  return { bowlDoor: { x: BOWL.doorX, z: BOWL.frontZ + 1.2 }, diner: { x: dcx, z: diner.minZ - 2 } };
}

/** Row 3: Orange Mound. Bungalows on both streets, Benji's place, the church, the corner store. */
function neighborhood(ctx: BuildCtx) {
  let homeDoor = { x: HOME.x, z: HOME.z };
  let homeWalk = { x: HOME.x, z: HOME.z };
  let n = 0;
  for (let c = 0; c < 4; c++) {
    const L = lot(c, 3);
    if (c === 3) {
      // The Fun House has the whole block: hall on Lamar, karts behind.
      lotSurface(ctx, L, "concrete");
      buildFunExterior(ctx);
      continue;
    }
    lotSurface(ctx, L, "grass");
    const xs = [L.minX + 8, (L.minX + L.maxX) / 2, L.maxX - 8];
    // Park Avenue side.
    for (const x of xs) house(ctx, x, 97.4, YAW.south, n++);
    // Back fences and yard trees.
    for (let x = L.minX + 3; x < L.maxX - 2; x += 7) {
      if (ctx.rand() > 0.35) tree(ctx, x + ctx.rand() * 3, 83 + ctx.rand() * 3, 1.1 + ctx.rand() * 0.4, Y0, c === 1);
    }
    ctx.solid.box(L.maxX - L.minX - 2, 1.5, 0.1, (L.minX + L.maxX) / 2, Y0 + 0.75, 84.5, MAT.wood());
    addSolid(ctx, L.minX + 1, L.maxX - 1, 84.4, 84.6);
    if (c === 0) for (const x of xs) house(ctx, x, 70.6, YAW.north, n++);
    if (c === 1) {
      house(ctx, xs[0]!, 70.6, YAW.north, n++);
      const h = house(ctx, HOME.x, HOME.z, YAW.north, 4, { w: HOME.w, d: HOME.d, hero: true });
      homeDoor = h.door;
      homeWalk = h.walk;
      house(ctx, xs[2]!, 70.6, YAW.north, n++);
      // Driveway beside the house, where the coupe lives.
      ctx.ground.flat(4, 12, HOME.x + 8.6, Y0 + 0.008, 67, lotDrive());
    }
    if (c === 2) {
      midrise(ctx, rect(9, 25, 61, 75), 5, "brickCream", { shops: ["north", "west"], accent: 0x7a1f1f, variant: 2, sign: { text: "LAMAR MART", color: "#ff8a1e", face: "north", y: 4.6, w: 10 } });
      church(ctx, 42, 72);
    }
  }
  return { homeDoor, homeWalk };
}

let drive: THREE.Material | null = null;
function lotDrive() {
  if (!drive) {
    drive = new THREE.MeshStandardMaterial({ color: 0x8c8983, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  return drive;
}

export function resetBlocks() {
  drive = null;
}

function church(ctx: BuildCtx, x: number, z: number) {
  const white = std(0xf1ede4, 0.85);
  const roof = std(0x30343a, 0.9);
  const f = new Frame(ctx, x, z, YAW.north);
  f.box(11, 6, 17, 0, Y0 + 3, 0, white);
  const run = 5.9;
  const rise = 3.6;
  const len = Math.hypot(run, rise);
  const pitch = Math.atan2(rise, run);
  f.add(new THREE.BoxGeometry(len, 0.16, 17.8), roof, run / 2, Y0 + 6 + rise / 2, 0, ctx.solid, 0, 0, -pitch);
  f.add(new THREE.BoxGeometry(len, 0.16, 17.8), roof, -run / 2, Y0 + 6 + rise / 2, 0, ctx.solid, 0, 0, pitch);
  f.box(3.4, 10, 3.4, 0, Y0 + 5, 9.6, white);
  f.add(new THREE.ConeGeometry(2.5, 6, 4), roof, 0, Y0 + 13, 9.6, ctx.solid, Math.PI / 4);
  f.box(0.16, 1.6, 0.16, 0, Y0 + 16.6, 9.6, MAT.gold());
  f.box(0.9, 0.16, 0.16, 0, Y0 + 16.9, 9.6, MAT.gold());
  f.box(1.6, 2.6, 0.12, 0, Y0 + 1.3, 11.34, std(0x5a2a1c, 0.6));
  const glass = emissiveMat(ctx, 0xffb45a, 0.25, 2.2);
  for (const lz of [-5, -1, 3]) {
    f.box(0.1, 2.8, 1.1, 5.52, Y0 + 3.4, lz, glass);
    f.box(0.1, 2.8, 1.1, -5.52, Y0 + 3.4, lz, glass);
  }
  f.box(1.2, 1.2, 0.1, 0, Y0 + 7.4, 11.34, glass);
  f.wall(4.4, 1, 0, Y0 + 4.4, 11.36, sign("NEW HOPE", "#17110e", "#f1ede4", { sub: "ALL ARE WELCOME", w: 384, h: 96 }), ctx.flat);
  f.flat(6, 6, 0, Y0 + 0.02, 14, poolMat(ctx, 0xffb46a, 0.32), ctx.flat);
  f.solid(-5.5, 5.5, -8.5, 11.3);
}

/** What stands past the last streets: a wall of buildings west and east, houses to the south. */
function edges(ctx: BuildCtx) {
  const west = STREETS_X[0] - 9;
  const east = STREETS_X[4] + 9;
  const styles = ["brickBrown", "brickRed", "concrete", "brickCream", "tan"];
  let n = 0;
  for (let row = 0; row < 4; row++) {
    const L = lot(0, row);
    const mid = (L.minZ + L.maxZ) / 2;
    for (const [a, b] of [
      [L.minZ, mid - 1],
      [mid + 1, L.maxZ],
    ] as const) {
      const hW = row === 3 ? 6 + ctx.rand() * 4 : 12 + ctx.rand() * 16;
      midrise(ctx, rect(west - 26, west, a, b), hW, styles[n++ % styles.length]!, { shops: ["east"], accent: [0x1f4a2c, 0x7a1f1f, 0x1d2f55][n % 3]!, variant: n % 3 });
      const hE = row === 3 ? 6 + ctx.rand() * 4 : 12 + ctx.rand() * 16;
      midrise(ctx, rect(east, east + 26, a, b), hE, styles[n++ % styles.length]!, { shops: ["west"], accent: [0x5a3a12, 0x2b2b2e, 0x6a1f4a][n % 3]!, variant: n % 3 });
    }
  }
  let k = 20;
  for (let x = -148; x <= 148; x += 15.5) {
    if (STREETS_X.some((sx) => Math.abs(x - sx) < 13)) continue;
    house(ctx, x, 132, YAW.north, k++);
  }
}
