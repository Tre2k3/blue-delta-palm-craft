import * as THREE from "three";
import { tex } from "../gfx/tex";
import { garage, house, lotSurface, midrise, shopRow, tower } from "./buildings";
import { buildRinkExterior } from "./rink";
import {
  MAT,
  Frame,
  YAW,
  addSolid,
  bench,
  bush,
  emissiveMat,
  globeLamp,
  neon,
  poolMat,
  sign,
  std,
  storefront,
  tree,
  type BuildCtx,
} from "./kit";
import {
  CURB,
  FAIR,
  LANDMARKS,
  RIVER_Z,
  ROAD_HALF,
  STREETS_X,
  STREETS_Z,
  WORLD,
  lot,
  rect,
  type Rect,
} from "./map";

const Y0 = CURB;

/**
 * Downtown Memphis round the blocks the game's own places stand in (those are in `blocks.ts`):
 * Beale Street from 2nd to 4th, FedExForum, the Peabody, AutoZone Park, Court Square, the
 * Lorraine Motel, the Cotton Exchange, the towers up Main, South Main's lofts, the Medical
 * District, the rest of Orange Mound, the Pinch past Poplar, Tom Lee Park and the riverfront north
 * of the court, and Mud Island across the harbour.
 *
 * Every other block is filled by what part of town it is in, from the city's own dice.
 */

/** Blocks built by `blocks.ts`: the four middle columns from the river to 2nd, Handy Park, and Orange Mound's four. */
const DESIGNED = new Set<string>();
for (let c = 2; c <= 4; c++) for (const r of [0, 1, 2, 7]) DESIGNED.add(`${c},${r}`);
DESIGNED.add("3,3");
// Halle Stadium on Mt. Moriah, and Adventure River: each built whole by its own builder.
DESIGNED.add("1,8");
DESIGNED.add("9,8");

export function buildMemphis(ctx: BuildCtx) {
  const special: Record<string, (L: Rect) => void> = {
    "2,3": (L) => bealeRow(ctx, L, "east", BEALE_SOUTH),
    "3,4": (L) => bealeRow(ctx, L, "west", BEALE_NORTH),
    "2,4": (L) => fedex(ctx, L),
    "4,3": (L) => peabody(ctx, L),
    "5,4": (L) => ballpark(ctx, L),
    "7,2": (L) => courtSquare(ctx, L),
    "0,2": (L) => lorraine(ctx, L),
    "5,1": (L) => cottonExchange(ctx, L),
    "8,1": (L) => hundredNorthMain(ctx, L),
    "0,4": (L) => buildRinkExterior(ctx, L),
  };
  for (let c = 0; c < STREETS_X.length - 1; c++) {
    for (let r = 0; r < STREETS_Z.length - 1; r++) {
      const key = `${c},${r}`;
      if (DESIGNED.has(key)) continue;
      const L = lot(c, r);
      if (special[key]) special[key]!(L);
      else filler(ctx, L, c, r);
    }
  }
  beyond(ctx);
  bealeArches(ctx);
  riverfrontReach(ctx);
  mudIsland(ctx);
  southBridge(ctx);
}

// ------------------------------------------------------------------ what part of town

type Zone = "uptown" | "southMain" | "core" | "medical" | "orangeMound";

function zoneOf(c: number, r: number): Zone {
  if (r >= 7) return "orangeMound";
  if (r === 6) return "medical";
  if (c <= 1) return "southMain";
  if (c >= 6 && r <= 2) return "uptown";
  return "core";
}

const BRICK = ["brickRed", "brickBrown", "brickCream", "brickDark"];
const ACCENTS = [0x1f4a2c, 0x7a1f1f, 0x1d2f55, 0x5a3a12, 0x2b2b2e, 0x6a1f4a];

/** An ordinary block, by the part of town it is in. */
function filler(ctx: BuildCtx, L: Rect, c: number, r: number) {
  const zone = zoneOf(c, r);
  if (zone === "orangeMound") return houses(ctx, L, c * 7 + r);
  const rnd = ctx.rand;
  lotSurface(ctx, L, zone === "medical" ? "plaza" : "concrete");
  const mx = (L.minX + L.maxX) / 2;
  const mz = (L.minZ + L.maxZ) / 2;
  const parcels = [
    rect(L.minX, mx - 2, L.minZ, mz - 2),
    rect(mx + 2, L.maxX, L.minZ, mz - 2),
    rect(L.minX, mx - 2, mz + 2, L.maxZ),
    rect(mx + 2, L.maxX, mz + 2, L.maxZ),
  ];
  parcels.forEach((p, i) => {
    const faces: ("north" | "south" | "east" | "west")[] = [];
    if (p.minZ === L.minZ) faces.push("north");
    if (p.maxZ === L.maxZ) faces.push("south");
    if (p.minX === L.minX) faces.push("west");
    if (p.maxX === L.maxX) faces.push("east");
    const roll = rnd();
    const accent = ACCENTS[(c + r + i) % ACCENTS.length]!;
    const variant = (c + r * 3 + i) % 3;
    if (zone === "uptown") {
      if (roll < 0.62)
        tower(
          ctx,
          inset(p, 1.5),
          44 + rnd() * 56,
          ["glassBlue", "glassDark", "concrete", "white", "tan", "glassGold"][(c * 3 + r + i) % 6]!,
          {
            crown: (["flat", "band", "setback", "ring", "flat", "spire"] as const)[
              (c + i * 2 + r) % 6
            ],
            band: [0xffc878, 0xbfe0ff, 0x39ff14][i % 3],
            variant,
          },
        );
      else if (roll < 0.8)
        midrise(ctx, inset(p, 1), 18 + rnd() * 14, BRICK[(c + i) % 4]!, {
          shops: faces,
          accent,
          variant,
        });
      else garage(ctx, inset(p, 1.5), 4 + Math.floor(rnd() * 3));
    } else if (zone === "southMain") {
      if (roll < 0.78)
        midrise(ctx, inset(p, 0.8), 9 + rnd() * 14, BRICK[(c + r + i) % 4]!, {
          shops: faces,
          accent,
          variant,
        });
      else parkingCorner(ctx, p);
    } else if (zone === "medical") {
      if (roll < 0.7)
        midrise(ctx, inset(p, 2), 16 + rnd() * 22, ["white", "concrete", "tan"][(c + i) % 3]!, {
          shops: faces.slice(0, 1),
          accent: 0x1d2f55,
          variant,
        });
      else parkingCorner(ctx, p);
    } else {
      if (roll < 0.22)
        tower(
          ctx,
          inset(p, 2),
          34 + rnd() * 30,
          ["concrete", "glassBlue", "tan", "white"][(c + r + i) % 4]!,
          { crown: (["flat", "band", "setback"] as const)[(c + i) % 3], variant },
        );
      else if (roll < 0.8)
        midrise(ctx, inset(p, 1), 10 + rnd() * 18, BRICK[(c * 2 + r + i) % 4]!, {
          shops: faces,
          accent,
          variant,
        });
      else parkingCorner(ctx, p);
    }
  });
  // A tree or two at the corners.
  for (const [x, z] of [
    [L.minX + 1.5, L.minZ + 1.5],
    [L.maxX - 1.5, L.maxZ - 1.5],
  ] as const) {
    if (rnd() > 0.5) tree(ctx, x, z, 0.9 + rnd() * 0.3, Y0);
  }
}

function inset(r: Rect, by: number): Rect {
  return rect(r.minX + by, r.maxX - by, r.minZ + by, r.maxZ - by);
}

/** A surface lot: stripes and a lamp. */
function parkingCorner(ctx: BuildCtx, p: Rect) {
  lotSurface(ctx, p, "parking");
  globeLamp(ctx, (p.minX + p.maxX) / 2, (p.minZ + p.maxZ) / 2, Y0, 0xfff0d0);
  addSolid(
    ctx,
    (p.minX + p.maxX) / 2 - 0.2,
    (p.minX + p.maxX) / 2 + 0.2,
    (p.minZ + p.maxZ) / 2 - 0.2,
    (p.minZ + p.maxZ) / 2 + 0.2,
  );
}

/** Bungalows on both streets: Orange Mound past the four blocks Benji knows. */
function houses(ctx: BuildCtx, L: Rect, seed: number) {
  lotSurface(ctx, L, "grass");
  const xs = [L.minX + 8, (L.minX + L.maxX) / 2, L.maxX - 8];
  let n = seed * 6;
  for (const x of xs) house(ctx, x, L.minZ + 9.6, YAW.north, n++);
  for (const x of xs) house(ctx, x, L.maxZ - 9.6, YAW.south, n++);
  const mid = (L.minZ + L.maxZ) / 2;
  ctx.solid.box(L.maxX - L.minX - 2, 1.5, 0.1, (L.minX + L.maxX) / 2, Y0 + 0.75, mid, MAT.wood());
  addSolid(ctx, L.minX + 1, L.maxX - 1, mid - 0.1, mid + 0.1);
  for (let x = L.minX + 3; x < L.maxX - 2; x += 8)
    if (ctx.rand() > 0.4)
      tree(ctx, x + ctx.rand() * 3, mid - 2 + ctx.rand() * 4, 1.1 + ctx.rand() * 0.4, Y0);
}

/** Past the last streets: lofts south of Butler, the Pinch north of Poplar, houses east of Park Avenue. */
function beyond(ctx: BuildCtx) {
  const south = STREETS_X[0] - ROAD_HALF - 3.5;
  const north = STREETS_X[STREETS_X.length - 1]! + ROAD_HALF + 3.5;
  for (let r = 0; r < STREETS_Z.length - 1; r++) {
    const a = STREETS_Z[r]! + ROAD_HALF + 3.5;
    const b = STREETS_Z[r + 1]! - ROAD_HALF - 3.5;
    const om = r >= 7;
    // South edge: a wall of old brick facing Butler.
    midrise(ctx, rect(south - 22, south, a, b), om ? 6 : 10 + ctx.rand() * 10, BRICK[r % 4]!, {
      shops: om ? [] : ["east"],
      accent: ACCENTS[r % 6],
      variant: r % 3,
    });
    // The Pinch: low brick and a few lots between Poplar and the Pyramid.
    const P = rect(north, WORLD.maxX + 12, a, b);
    if (om) houses(ctx, P, 90 + r);
    else {
      lotSurface(ctx, P, "concrete");
      const mid = (P.minX + P.maxX) / 2;
      midrise(ctx, rect(P.minX, mid - 3, a, b), 8 + ctx.rand() * 8, BRICK[(r + 1) % 4]!, {
        shops: ["west"],
        accent: ACCENTS[(r + 2) % 6],
        variant: (r + 1) % 3,
        sign:
          r === 1
            ? { text: "THE PINCH", color: "#ffb400", face: "west", y: 6.4, w: 12 }
            : undefined,
      });
      midrise(ctx, rect(mid + 3, P.maxX, a, b), 6 + ctx.rand() * 10, BRICK[(r + 2) % 4]!, {
        variant: r % 3,
      });
    }
  }
  // East of Park Avenue: a row of houses facing it.
  let k = 200;
  const z = STREETS_Z[STREETS_Z.length - 1]! + ROAD_HALF + 3.5 + 10;
  for (let x = WORLD.minX + 10; x <= WORLD.maxX - 6; x += 15.5) {
    if (STREETS_X.some((sx) => Math.abs(x - sx) < 13)) continue;
    // The Fairgrounds have that stretch.
    if (x > FAIR.minX - 9 && x < FAIR.maxX + 9) {
      k++;
      continue;
    }
    house(ctx, x, z, YAW.north, k++);
  }
}

// ------------------------------------------------------------------ Beale Street

/** The clubs on Beale between 2nd and 4th, as they read along the street. */
const BEALE_SOUTH: [string, string][] = [
  ["B.B. KING'S BLUES CLUB", "#ffd23a"],
  ["RUM BOOGIE CAFE", "#ff3b3b"],
  ["A. SCHWAB", "#f3e9c8"],
  ["BLUES HALL", "#3aa0ff"],
];
const BEALE_NORTH: [string, string][] = [
  ["KING'S PALACE CAFE", "#ff4fd8"],
  ["SILKY O'SULLIVAN'S", "#39ff14"],
  ["JERRY LEE LEWIS'", "#ffb400"],
  ["NEW DAISY THEATRE", "#ff5a36"],
];

/** A block of Beale: old brick fronts shoulder to shoulder, each with its neon over the walk. */
function bealeRow(ctx: BuildCtx, L: Rect, face: "east" | "west", names: [string, string][]) {
  lotSurface(ctx, L, "concrete");
  const depth = 16;
  const x0 = face === "east" ? L.maxX - depth : L.minX;
  const x1 = face === "east" ? L.maxX : L.minX + depth;
  const span = L.maxZ - L.minZ;
  const each = span / names.length;
  names.forEach(([text, color], i) => {
    const a = L.minZ + i * each + (i ? 0.3 : 0);
    const b = L.minZ + (i + 1) * each - (i < names.length - 1 ? 0.3 : 0);
    midrise(
      ctx,
      rect(x0, x1, a, b),
      9 + ((i * 7) % 5),
      BRICK[(i + (face === "east" ? 0 : 2)) % 4]!,
      {
        shops: [face],
        accent: ACCENTS[i % 6],
        variant: i % 3,
        sign: { text, color, face, y: 5.6, w: Math.min(b - a - 1.4, 10) },
      },
    );
    // A blade sign out over the walk on every other front.
    if (i % 2 === 0) {
      const f = new Frame(
        ctx,
        face === "east" ? x1 : x0,
        (a + b) / 2,
        face === "east" ? YAW.east : YAW.west,
      );
      const word = ["BLUES", "LIVE", "BBQ", "SOUL"][i % 4]!;
      const mat = neon(ctx, word, color, { w: 256, h: 128 });
      const at = (b - a) / 2 - 1;
      f.box(0.12, 1.25, 2, at, Y0 + 7.4, 1.15, MAT.black());
      f.wall(1.9, 1.15, at + 0.07, Y0 + 7.4, 1.15, mat, ctx.flat, Math.PI / 2);
      f.wall(1.9, 1.15, at - 0.07, Y0 + 7.4, 1.15, mat, ctx.flat, -Math.PI / 2);
    }
  });
  // Behind the fronts: a lot and a low back building.
  midrise(
    ctx,
    rect(
      face === "east" ? L.minX : L.minX + depth + 4,
      face === "east" ? L.maxX - depth - 4 : L.maxX,
      L.minZ + 4,
      L.maxZ - 4,
    ),
    7,
    "brickDark",
    { variant: 1 },
  );
}

/** The neon arches that span Beale at 2nd and at 4th, and its globe lamps, so the street reads as Beale from either end. */
function bealeArches(ctx: BuildCtx) {
  const x = STREETS_X[3];
  for (const z of [STREETS_Z[3] + ROAD_HALF + 4.6, STREETS_Z[5] - ROAD_HALF - 4.6]) {
    for (const s of [-1, 1]) {
      ctx.solid.cyl(0.2, 0.24, 7.4, x + s * (ROAD_HALF + 1.4), Y0 + 3.7, z, MAT.black(), 8);
      addSolid(
        ctx,
        x + s * (ROAD_HALF + 1.4) - 0.3,
        x + s * (ROAD_HALF + 1.4) + 0.3,
        z - 0.3,
        z + 0.3,
      );
    }
    ctx.solid.box(ROAD_HALF * 2 + 3.4, 0.4, 0.4, x, Y0 + 7.4, z, MAT.black());
    const board = neon(ctx, "BEALE STREET", "#39ff14", {
      sub: "HOME OF THE BLUES",
      w: 768,
      h: 160,
      border: false,
    });
    ctx.flat.wall(10, 2, x, Y0 + 8.6, z + 0.05, board, YAW.south);
    ctx.flat.wall(10, 2, x, Y0 + 8.6, z - 0.05, board, YAW.north);
    ctx.lamps.push({ x, y: Y0 + 8, z, color: 0x39ff14 });
  }
  for (let z = STREETS_Z[3] + 14; z < STREETS_Z[5] - 8; z += 13) {
    if (Math.abs(z - STREETS_Z[4]) < 12) continue;
    globeLamp(ctx, x - ROAD_HALF - 1.2, z, Y0, 0xffd08a);
    globeLamp(ctx, x + ROAD_HALF + 1.2, z, Y0, 0xffd08a);
  }
}

// ------------------------------------------------------------------ landmarks

/** FedExForum, south of Beale between B.B. King and 4th: the big box with the glass corner on Beale. */
function fedex(ctx: BuildCtx, L: Rect) {
  lotSurface(ctx, L, "plaza");
  const r = inset(L, 2);
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  const h = 24;
  const shell = std(0x8c939c, 0.55, 0.35);
  ctx.solid.box(w, h, d, cx, Y0 + h / 2, cz, shell);
  ctx.solid.box(w + 1, 1.4, d + 1, cx, Y0 + h, cz, std(0x2a2d33, 0.5, 0.4));
  // The arena's skin: a dark glass band round the concourse, a lit strip under it, and steel fins up every face.
  const band = std(0x1c232c, 0.25, 0.6);
  ctx.solid.box(w + 0.3, 5, d + 0.3, cx, Y0 + 13, cz, band);
  ctx.solid.box(w + 0.35, 0.35, d + 0.35, cx, Y0 + 10.3, cz, emissiveMat(ctx, 0xffb070, 0.4, 2));
  ctx.solid.box(w + 0.3, 1.2, d + 0.3, cx, Y0 + 0.6, cz, std(0x3a3e45, 0.7, 0.2));
  const fin = std(0x5b626c, 0.4, 0.5);
  for (let x = r.minX + 2; x < r.maxX - 1; x += 4) {
    ctx.solid.box(0.5, h - 5, 0.6, x, Y0 + 4 + (h - 5) / 2, r.minZ - 0.2, fin);
    ctx.solid.box(0.5, h - 5, 0.6, x, Y0 + 4 + (h - 5) / 2, r.maxZ + 0.2, fin);
  }
  for (let z = r.minZ + 2; z < r.maxZ - 1; z += 4) {
    ctx.solid.box(0.6, h - 5, 0.5, r.minX - 0.2, Y0 + 4 + (h - 5) / 2, z, fin);
    ctx.solid.box(0.6, h - 5, 0.5, r.maxX + 0.2, Y0 + 4 + (h - 5) / 2, z, fin);
  }
  // Glass atrium on the Beale corner, lit from inside.
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1a2634,
    roughness: 0.2,
    metalness: 0.45,
    emissive: 0x3a6aa8,
    emissiveIntensity: 0.3,
  });
  ctx.glow.emissive(glass, 0.2, 1.4);
  ctx.solid.box(14, h - 2, 14, r.maxX - 6, Y0 + (h - 2) / 2, r.minZ + 6, glass);
  // Its frame: mullions up and transoms across the two faces that show.
  const mull = MAT.black();
  for (let k = 0; k <= 7; k++) {
    ctx.solid.box(0.25, h - 2, 0.25, r.maxX + 1.05, Y0 + (h - 2) / 2, r.minZ - 1 + k * 2, mull);
    ctx.solid.box(0.25, h - 2, 0.25, r.maxX - 13 + k * 2, Y0 + (h - 2) / 2, r.minZ - 1.05, mull);
  }
  for (let y = Y0 + 3; y < Y0 + h - 2; y += 3) {
    ctx.solid.box(0.2, 0.22, 14.2, r.maxX + 1.05, y, r.minZ + 6, mull);
    ctx.solid.box(14.2, 0.22, 0.2, r.maxX - 6, y, r.minZ - 1.05, mull);
  }
  ctx.solid.box(w - 4, 4, 0.4, cx, Y0 + 2, r.maxZ + 0.25, storefront(ctx, 11, "#1d2f55", true));
  // Its name on the Beale side and on the B.B. King side, and a band of light round the top.
  const name = neon(ctx, "FEDEXFORUM", "#ff7a1a", {
    sub: "BEALE STREET",
    w: 768,
    h: 160,
    border: false,
  });
  ctx.flat.wall(20, 4, r.maxX + 1.3, Y0 + h - 5, cz, name, YAW.east);
  ctx.flat.wall(20, 4, cx, Y0 + h - 5, r.minZ - 1.3, name, YAW.north);
  ctx.solid.box(w + 0.4, 0.8, d + 0.4, cx, Y0 + h - 1.6, cz, emissiveMat(ctx, 0x5a8cff, 0.15, 2));
  ctx.flat.flat(30, 14, r.maxX + 6, Y0 + 0.02, cz, poolMat(ctx, 0x5a8cff, 0.35));
  ctx.lamps.push({ x: r.maxX + 3, y: Y0 + 6, z: cz, color: 0x5a8cff });
  addSolid(ctx, r.minX, r.maxX, r.minZ, r.maxZ);
}

/** The Peabody, on Union between 2nd and B.B. King: the brick hotel with its name lit on the roof. */
function peabody(ctx: BuildCtx, L: Rect) {
  lotSurface(ctx, L, "concrete");
  const tall = rect(L.maxX - 26, L.maxX - 1, L.minZ + 3, L.maxZ - 3);
  midrise(ctx, tall, 44, "brickCream", { shops: ["east"], accent: 0x7a1f1f, variant: 0 });
  midrise(ctx, rect(L.minX + 1, tall.minX - 3, L.minZ + 6, L.maxZ - 6), 16, "brickCream", {
    shops: ["north", "south"],
    accent: 0x7a1f1f,
    variant: 1,
  });
  // Marquee over the Union Avenue doors.
  const f = new Frame(ctx, tall.maxX, (tall.minZ + tall.maxZ) / 2, YAW.east);
  f.box(16, 0.6, 3.4, 0, Y0 + 4.4, 1.7, MAT.black());
  f.wall(
    14,
    1.2,
    0,
    Y0 + 5.1,
    3.42,
    neon(ctx, "THE PEABODY", "#ffd23a", { w: 640, h: 112 }),
    ctx.flat,
  );
  f.box(15, 0.12, 3.2, 0, Y0 + 4.05, 1.7, emissiveMat(ctx, 0xffe2b0, 0.5, 3));
  f.flat(16, 8, 0, Y0 + 0.02, 4, poolMat(ctx, 0xffc46a, 0.45), ctx.flat);
  f.lamp(0, Y0 + 3.6, 3, 0xffd08a);
  // The red name on the roof, read from both ways along Union.
  const roof = neon(ctx, "THE PEABODY", "#ff3b3b", { w: 768, h: 160, border: false });
  const top = Y0 + 44;
  ctx.solid.box(0.4, 4.2, 18, tall.maxX - 4, top + 2.1, (tall.minZ + tall.maxZ) / 2, MAT.black());
  ctx.flat.wall(17, 3.6, tall.maxX - 3.78, top + 2.2, (tall.minZ + tall.maxZ) / 2, roof, YAW.east);
  ctx.flat.wall(17, 3.6, tall.maxX - 4.22, top + 2.2, (tall.minZ + tall.maxZ) / 2, roof, YAW.west);
}

/** AutoZone Park, on Union between B.B. King and 4th: a ballpark, its diamond, stands and light towers. */
function ballpark(ctx: BuildCtx, L: Rect) {
  lotSurface(ctx, L, "plaza");
  const r = inset(L, 1);
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  const grass = new THREE.MeshStandardMaterial({ color: 0x2f6a2a, roughness: 0.9 });
  const dirt = new THREE.MeshStandardMaterial({
    color: 0x8a5a36,
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  ctx.ground.flat(r.maxX - r.minX - 8, r.maxZ - r.minZ - 8, cx, Y0 + 0.01, cz, grass);
  // Home plate in the south-west corner, the diamond turned toward centre field.
  const hx = r.minX + 10;
  const hz = r.maxZ - 10;
  ctx.flat.add(
    new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2),
    dirt,
    hx + 5,
    Y0 + 0.03,
    hz - 5,
    Math.PI / 4,
  );
  ctx.flat.add(
    new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x3a7a32,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
    hx + 5,
    Y0 + 0.04,
    hz - 5,
    Math.PI / 4,
  );
  // Stands along the two baselines, stepping up and back.
  const seat = std(0x1d3f7a, 0.6);
  for (let i = 0; i < 5; i++) {
    ctx.solid.box(
      r.maxX - r.minX - 4,
      1 + i * 1.1,
      2,
      cx,
      Y0 + (1 + i * 1.1) / 2,
      r.maxZ - 1 - i * 2,
      i % 2 ? seat : std(0x2c3a52, 0.6),
    );
    ctx.solid.box(
      2,
      1 + i * 1.1,
      r.maxZ - r.minZ - 4,
      r.minX + 1 + i * 2,
      Y0 + (1 + i * 1.1) / 2,
      cz,
      i % 2 ? seat : std(0x2c3a52, 0.6),
    );
  }
  // Outfield wall and scoreboard.
  ctx.solid.box(0.6, 3, r.maxZ - r.minZ, r.maxX - 0.3, Y0 + 1.5, cz, std(0x1f4a2c, 0.7));
  ctx.solid.box(r.maxX - r.minX, 3, 0.6, cx, Y0 + 1.5, r.minZ + 0.3, std(0x1f4a2c, 0.7));
  const board = neon(ctx, "AUTOZONE PARK", "#ff8a1e", {
    sub: "HOME OF THE REDBIRDS",
    w: 768,
    h: 192,
  });
  ctx.solid.box(0.6, 7, 16, r.maxX + 0.2, Y0 + 9, r.minZ + 12, MAT.black());
  ctx.flat.wall(15, 6, r.maxX + 0.55, Y0 + 9, r.minZ + 12, board, YAW.east);
  ctx.flat.wall(15, 6, r.maxX - 0.15, Y0 + 9, r.minZ + 12, board, YAW.west);
  // Light towers at the corners.
  const lamp = emissiveMat(ctx, 0xf4f7ff, 0.2, 3.4);
  for (const [x, z] of [
    [r.minX + 1, r.minZ + 1],
    [r.maxX - 1, r.minZ + 1],
    [r.minX + 1, r.maxZ - 1],
    [r.maxX - 1, r.maxZ - 1],
  ] as const) {
    ctx.solid.cyl(0.4, 0.55, 26, x, Y0 + 13, z, MAT.steel(), 8);
    ctx.solid.box(4, 2.4, 1, x, Y0 + 26.6, z, lamp);
  }
  ctx.lamps.push({ x: cx, y: Y0 + 20, z: cz, color: 0xf4f7ff });
  addSolid(ctx, r.minX, r.maxX, r.minZ, r.maxZ);
}

/** Court Square, between Madison and Jefferson off Main: lawns, crossing paths, the fountain, a gazebo. */
function courtSquare(ctx: BuildCtx, L: Rect) {
  lotSurface(ctx, L, "grass");
  const cx = (L.minX + L.maxX) / 2;
  const cz = (L.minZ + L.maxZ) / 2;
  const paving = MAT.plaza(ctx.glow);
  ctx.ground.flat(3, L.maxZ - L.minZ, cx, Y0 + 0.012, cz, paving, 0, 6);
  ctx.ground.flat(L.maxX - L.minX, 3, cx, Y0 + 0.012, cz, paving, 0, 6);
  // The fountain with the figure on top.
  const stone = std(0xd8d2c4, 0.7);
  ctx.solid.cyl(4, 4.2, 0.7, cx, Y0 + 0.35, cz, stone, 24);
  ctx.solid.cyl(
    3.7,
    3.7,
    0.05,
    cx,
    Y0 + 0.66,
    cz,
    new THREE.MeshStandardMaterial({ color: 0x2a4a5a, roughness: 0.1, metalness: 0.5 }),
    24,
  );
  ctx.solid.cyl(0.5, 0.8, 2.6, cx, Y0 + 1.6, cz, stone, 10);
  ctx.solid.cyl(1.4, 0.6, 0.4, cx, Y0 + 2.9, cz, stone, 14);
  ctx.solid.cyl(0.22, 0.3, 1.6, cx, Y0 + 3.9, cz, std(0x4a5a4a, 0.5, 0.7), 8);
  ctx.solid.add(new THREE.SphereGeometry(0.26, 8, 6), std(0x4a5a4a, 0.5, 0.7), cx, Y0 + 4.9, cz);
  addSolid(ctx, cx - 4.1, cx + 4.1, cz - 4.1, cz + 4.1);
  // Gazebo in the north half.
  const gx = cx + 12;
  const gz = cz - 10;
  const white = std(0xf1ede4, 0.8);
  ctx.solid.cyl(3.4, 3.4, 0.5, gx, Y0 + 0.25, gz, white, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.solid.box(0.18, 3, 0.18, gx + Math.sin(a) * 3.1, Y0 + 2, gz + Math.cos(a) * 3.1, white);
  }
  ctx.solid.add(new THREE.ConeGeometry(3.8, 2.4, 8), std(0x2f4a3a, 0.8), gx, Y0 + 4.7, gz);
  addSolid(ctx, gx - 0.4, gx + 0.4, gz - 0.4, gz + 0.4);
  for (const [x, z] of [
    [L.minX + 6, L.minZ + 6],
    [L.maxX - 6, L.minZ + 6],
    [L.minX + 6, L.maxZ - 6],
    [L.maxX - 6, L.maxZ - 6],
    [L.minX + 6, cz + 9],
    [L.maxX - 6, cz - 9],
    [cx - 10, L.minZ + 4],
    [cx + 10, L.maxZ - 4],
  ] as const)
    tree(ctx, x, z, 1.4, Y0);
  for (const [x, z, yaw] of [
    [cx - 6, cz + 3, YAW.south],
    [cx + 6, cz - 3, YAW.north],
    [cx - 3, cz - 6, YAW.west],
    [cx + 3, cz + 6, YAW.east],
  ] as const)
    bench(ctx, x, z, yaw, Y0);
  for (const [x, z] of [
    [cx - 2.6, L.minZ + 2],
    [cx + 2.6, L.maxZ - 2],
    [L.minX + 2, cz - 2.6],
    [L.maxX - 2, cz + 2.6],
  ] as const)
    globeLamp(ctx, x, z, Y0);
  const board = sign("COURT SQUARE", "#f3e9c8", "#1d3b24", { sub: "EST. 1819", w: 512, h: 128 });
  ctx.flat.wall(3.2, 0.8, cx + 2.4, Y0 + 1.6, L.minZ + 0.6, board, YAW.north);
}

/**
 * The Lorraine Motel, by Mulberry and Butler: now the National Civil Rights Museum. The motel as it
 * stands, two storeys of turquoise doors round its lot, the tall sign, the wreath on the balcony,
 * and the museum's plaque.
 */
function lorraine(ctx: BuildCtx, L: Rect) {
  lotSurface(ctx, L, "parking");
  const cx = LANDMARKS.lorraine.x;
  const back = L.maxZ - 2;
  const frontZ = back - 12;
  const wall = std(0xece6d6, 0.85);
  const door = std(0x2fa6a0, 0.55);
  const rail = std(0xf4f1ea, 0.6);
  // The main wing facing the lot, two storeys with a walkway and railing along the top floor.
  const w = 34;
  ctx.solid.box(w, 7, 12, cx, Y0 + 3.5, back - 6, wall);
  ctx.solid.box(w + 1, 0.3, 13, cx, Y0 + 7.15, back - 6, std(0x6a6a66, 0.9));
  ctx.solid.box(w, 0.25, 2, cx, Y0 + 3.6, frontZ - 1, rail);
  ctx.solid.box(w, 0.8, 0.08, cx, Y0 + 4.2, frontZ - 1.95, rail);
  for (let i = 0; i < 10; i++) {
    const x = cx - w / 2 + 1.8 + i * 3.4;
    ctx.solid.box(1.1, 2.2, 0.1, x, Y0 + 1.1, frontZ - 0.04, door);
    ctx.solid.box(1.1, 2.2, 0.1, x, Y0 + 4.85, frontZ - 0.04, door);
  }
  for (let i = 0; i <= 8; i++)
    ctx.solid.box(
      0.18,
      3.6,
      0.18,
      cx - w / 2 + 0.5 + i * ((w - 1) / 8),
      Y0 + 1.8,
      frontZ - 1.9,
      rail,
    );
  // A wreath on the balcony outside the second-floor room near the middle.
  ctx.solid.add(
    new THREE.TorusGeometry(0.42, 0.12, 6, 18),
    std(0xf4f4f0, 0.6),
    cx + 1.6,
    Y0 + 4.5,
    frontZ - 2.02,
  );
  // The tall sign by the lot entrance.
  const sx = cx - w / 2 - 3;
  const sz = frontZ - 8;
  ctx.solid.cyl(0.25, 0.3, 9, sx, Y0 + 4.5, sz, std(0xc8c2b4, 0.6), 8);
  const face = tex(
    160,
    512,
    (g, ww, hh) => {
      g.fillStyle = "#f4efe0";
      g.fillRect(0, 0, ww, hh);
      g.fillStyle = "#c0262a";
      g.fillRect(8, 8, ww - 16, hh * 0.62);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = '900 54px "Bebas Neue", Impact, sans-serif';
      g.fillStyle = "#ffd23a";
      [..."LORRAINE"].forEach((ch, i) => g.fillText(ch, ww / 2, 34 + i * 37));
      g.fillStyle = "#1f6a3a";
      g.fillRect(8, hh * 0.66, ww - 16, hh * 0.3);
      g.font = '900 46px "Bebas Neue", Impact, sans-serif';
      g.fillStyle = "#f4efe0";
      g.fillText("MOTEL", ww / 2, hh * 0.81);
    },
    { repeat: false },
  );
  const fm = new THREE.MeshStandardMaterial({
    map: face,
    roughness: 0.6,
    emissive: 0xffffff,
    emissiveMap: face,
    emissiveIntensity: 0.1,
  });
  ctx.glow.emissive(fm, 0.1, 0.9);
  ctx.solid.box(2.4, 6.4, 0.4, sx, Y0 + 9.6, sz, MAT.black());
  ctx.flat.wall(2.3, 6.2, sx, Y0 + 9.6, sz - 0.22, fm, YAW.north);
  ctx.flat.wall(2.3, 6.2, sx, Y0 + 9.6, sz + 0.22, fm, YAW.south);
  addSolid(ctx, sx - 0.4, sx + 0.4, sz - 0.4, sz + 0.4);
  // The museum's plaque on a low wall at the front of the lot.
  ctx.solid.box(10, 1.2, 0.6, cx, Y0 + 0.6, L.minZ + 4, std(0x8a8478, 0.8));
  const plaque = sign("NATIONAL CIVIL RIGHTS MUSEUM", "#f3e9c8", "#2a2420", {
    sub: "AT THE LORRAINE MOTEL",
    w: 768,
    h: 128,
  });
  ctx.flat.wall(9.4, 1, cx, Y0 + 0.7, L.minZ + 3.68, plaque, YAW.north);
  addSolid(ctx, cx - 5, cx + 5, L.minZ + 3.7, L.minZ + 4.3);
  // Two old cars parked below the balcony.
  for (const [dx, color] of [
    [-3, 0xe8e2cf],
    [4.4, 0x6a8ab0],
  ] as const) {
    ctx.solid.box(2, 1, 5, cx + dx, Y0 + 0.7, frontZ - 5, std(color, 0.4, 0.4));
    ctx.solid.box(1.8, 0.7, 2.6, cx + dx, Y0 + 1.5, frontZ - 5.2, std(0x223040, 0.2, 0.6));
    addSolid(ctx, cx + dx - 1, cx + dx + 1, frontZ - 7.5, frontZ - 2.5);
  }
  addSolid(ctx, cx - w / 2, cx + w / 2, frontZ - 2, back);
}

/** The Cotton Exchange on Front Street: where the world's cotton was priced. */
function cottonExchange(ctx: BuildCtx, L: Rect) {
  lotSurface(ctx, L, "concrete");
  midrise(ctx, rect(L.minX + 1, L.maxX - 18, L.minZ + 1, L.maxZ - 8), 30, "brickCream", {
    shops: ["north", "west"],
    accent: 0x5a3a12,
    variant: 0,
    sign: { text: "COTTON EXCHANGE", color: "#f3e9c8", face: "north", y: 6, w: 14 },
  });
  shopRow(ctx, L.maxX - 16, L.maxX, L.minZ, "north", 12, 3);
  midrise(ctx, rect(L.maxX - 16, L.maxX, L.minZ + 16, L.maxZ - 1), 14, "brickRed", {
    shops: ["east", "south"],
    accent: 0x1f4a2c,
    variant: 2,
  });
}

/** 100 North Main, by Adams: the tallest in town, the round crown on top. */
function hundredNorthMain(ctx: BuildCtx, L: Rect) {
  lotSurface(ctx, L, "plaza");
  tower(ctx, rect(L.maxX - 24, L.maxX - 2, L.maxZ - 22, L.maxZ - 2), 128, "white", {
    crown: "ring",
    band: 0xbfe0ff,
    variant: 1,
  });
  tower(ctx, rect(L.minX + 2, L.minX + 20, L.minZ + 2, L.minZ + 22), 72, "glassDark", {
    crown: "band",
    band: 0x39ff14,
    variant: 0,
  });
  garage(ctx, rect(L.minX + 2, L.maxX - 28, L.maxZ - 18, L.maxZ - 2), 4);
  for (const x of [L.minX + 26, L.minX + 32]) tree(ctx, x, L.minZ + 6, 1.2, Y0);
}

// ------------------------------------------------------------------ the river

/** The riverfront past the HQ's stretch: Tom Lee Park to the south, lawns and trees to the north. */
function riverfrontReach(ctx: BuildCtx) {
  const edge = STREETS_Z[0] - ROAD_HALF - 3.5;
  // Tom Lee Park: the long lawn south of Beale, with the monument to Tom Lee.
  const t = LANDMARKS.tomLee;
  const stone = std(0xd8d2c4, 0.7);
  ctx.solid.box(3, 1.2, 3, t.x, Y0 + 0.6, t.z, stone);
  ctx.solid.box(1.6, 9, 1.6, t.x, Y0 + 5.7, t.z, stone);
  ctx.solid.add(new THREE.ConeGeometry(1.1, 2, 4), stone, t.x, Y0 + 11.2, t.z, Math.PI / 4);
  addSolid(ctx, t.x - 1.6, t.x + 1.6, t.z - 1.6, t.z + 1.6);
  const plate = sign("TOM LEE PARK", "#f3e9c8", "#1d3b24", {
    sub: "ON THE MISSISSIPPI",
    w: 512,
    h: 128,
  });
  ctx.flat.wall(3, 0.75, t.x, Y0 + 0.8, t.z + 1.52, plate, YAW.south);
  // The new park keeps one row of shade along Riverside and the walk by the water; what is
  // between is the new Tom Lee (see riverside.ts). The dice are thrown as before, so the rest of
  // the city is where it was.
  for (let x = WORLD.minX + 8; x <= -150; x += 14) {
    const jx = ctx.rand() * 4;
    ctx.rand();
    tree(ctx, x + jx, edge - 1.6, 1.3 + ctx.rand() * 0.4, Y0);
    if (ctx.rand() > 0.5) ctx.rand();
  }
  for (let x = WORLD.minX + 14; x <= -150; x += 32) bench(ctx, x, RIVER_Z + 3.2, YAW.north, Y0);
  // North of the court: lawns, trees and benches up to the end of the walk.
  for (let x = 160; x <= WORLD.maxX - 6; x += 14) {
    tree(ctx, x + ctx.rand() * 4, edge - 6 - ctx.rand() * 8, 1.2 + ctx.rand() * 0.4, Y0);
  }
  for (let x = 170; x <= WORLD.maxX - 10; x += 34) bench(ctx, x, RIVER_Z + 4.6, YAW.north, Y0);
  // The monorail out to Mud Island, on its tall legs over the harbour.
  const mx = 420;
  const m = LANDMARKS.mudIsland;
  const legs = std(0xc8c2b4, 0.6);
  for (let z = RIVER_Z + 18; z >= m.minZ + 10; z -= 15) {
    ctx.solid.box(1, 18, 1, mx, 9, z, legs);
    if (z > RIVER_Z) addSolid(ctx, mx - 0.6, mx + 0.6, z - 0.6, z + 0.6);
  }
  ctx.solid.box(
    2.2,
    2.4,
    RIVER_Z + 18 - (m.minZ + 10) + 4,
    mx,
    19.2,
    (RIVER_Z + 18 + m.minZ + 10) / 2,
    std(0x8c939c, 0.4, 0.4),
  );
  ctx.solid.box(3, 3.2, 9, mx, 16.8, RIVER_Z + 6, std(0xc0262a, 0.5, 0.2));
}

/** Mud Island, across the Wolf River Harbor: a green tongue of land with its trees and its amphitheatre. Scenery only. */
function mudIsland(ctx: BuildCtx) {
  const m = LANDMARKS.mudIsland;
  const green = new THREE.MeshStandardMaterial({ color: 0x2c4a2a, roughness: 0.95 });
  ctx.ground.flat(
    m.maxX - m.minX,
    m.maxZ - m.minZ,
    (m.minX + m.maxX) / 2,
    0.4,
    (m.minZ + m.maxZ) / 2,
    green,
  );
  ctx.solid.box(m.maxX - m.minX, 1.4, 0.6, (m.minX + m.maxX) / 2, -0.3, m.maxZ, std(0x5a5450, 0.9));
  ctx.solid.box(m.maxX - m.minX, 1.4, 0.6, (m.minX + m.maxX) / 2, -0.3, m.minZ, std(0x5a5450, 0.9));
  for (let x = m.minX + 6; x <= m.maxX - 6; x += 10) {
    tree(
      ctx,
      x + ctx.rand() * 4,
      m.minZ + 6 + ctx.rand() * (m.maxZ - m.minZ - 12),
      1.3 + ctx.rand() * 0.5,
      0.4,
    );
  }
  // The amphitheatre's shell, facing the city.
  ctx.solid.add(
    new THREE.SphereGeometry(9, 16, 8, 0, Math.PI, 0, Math.PI / 2),
    std(0xf1ede4, 0.6),
    m.minX + 70,
    0.4,
    (m.minZ + m.maxZ) / 2,
    Math.PI,
  );
  const board = sign("MUD ISLAND", "#f3e9c8", "#1d3b24", { sub: "RIVER PARK", w: 512, h: 128 });
  ctx.flat.wall(8, 2, m.minX + 30, 4, m.maxZ + 0.4, board, YAW.south);
  ctx.solid.box(8.4, 2.4, 0.3, m.minX + 30, 4, m.maxZ + 0.2, MAT.black());
  ctx.solid.box(0.3, 4, 0.3, m.minX + 30, 2, m.maxZ + 0.2, MAT.black());
}

/** The I-55 bridge to the south, past Tom Lee Park: a steel truss on its piers. Scenery only. */
function southBridge(ctx: BuildCtx) {
  const x = WORLD.minX - 60;
  const steel = std(0x4a4e54, 0.6, 0.4);
  const z0 = RIVER_Z - 2;
  const z1 = -340;
  const len = z0 - z1;
  ctx.solid.box(14, 1.4, len + 40, x, 12, (z0 + z1) / 2 - 10, steel);
  for (const side of [-6.4, 6.4]) {
    ctx.solid.box(0.8, 0.8, len, x + side, 22, (z0 + z1) / 2, steel);
    for (let i = 0; i <= 12; i++) {
      const z = z0 - (len / 12) * i;
      ctx.solid.box(0.5, 10, 0.5, x + side, 17, z, steel);
      if (i < 12)
        ctx.solid.add(
          new THREE.BoxGeometry(0.4, 14, 0.4),
          steel,
          x + side,
          17,
          z - len / 24,
          0,
          Math.atan2(len / 12, 10) * (i % 2 ? 1 : -1),
        );
    }
  }
  for (const z of [z0 - len * 0.33, z0 - len * 0.66])
    ctx.solid.box(10, 14, 5, x, 4.6, z, std(0x5a5a58, 0.9));
  const lit = emissiveMat(ctx, 0xffc27a, 0.2, 2.6);
  for (let i = 0; i <= 10; i++) ctx.solid.box(0.4, 0.4, 0.4, x - 7, 13.4, z0 - (len / 10) * i, lit);
}

void bush;
void storefront;
