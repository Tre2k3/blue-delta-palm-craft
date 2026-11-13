import type { TableId } from "../core/types";

/**
 * The city plan. X runs east, Z runs south, the Mississippi is north.
 * Everything that needs to agree on where a street or a door is reads it from here:
 * the builder, collision, traffic, the race, the minimap.
 */
export const STREETS_X = [-128, -64, 0, 64, 128] as const;
export const STREETS_Z = [-140, -76, -12, 52, 116] as const;
export const STREET_NAMES_X = ["Front St", "Main St", "2nd St", "B.B. King Blvd", "Danny Thomas"] as const;
export const STREET_NAMES_Z = ["Riverside Dr", "Beale St", "Union Ave", "Lamar Ave", "Park Ave"] as const;

/** Asphalt half-width, sidewalk width, curb height. */
export const ROAD_HALF = 5.5;
export const WALK = 3.5;
export const CURB = 0.14;
export const EDGE = ROAD_HALF + WALK;
/** Lane centre offset from the street centreline. Right-hand traffic. */
export const LANE = 2.7;

/** The bank. Water is north of this. */
export const RIVER_Z = -200;
export const FAR_BANK_Z = -332;

/** Where Benji may stand. The river and the pier are handled by their own solids. */
export const WORLD = { minX: -151, maxX: 151, minZ: -230, maxZ: 139 };

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

export function rect(minX: number, maxX: number, minZ: number, maxZ: number): Rect {
  return { minX, maxX, minZ, maxZ };
}

export function inRect(r: Rect, x: number, z: number, pad = 0) {
  return x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad;
}

/** Lot inside the sidewalks of block (col, row). Columns run west to east, rows north to south. */
export function lot(col: number, row: number): Rect {
  return rect(STREETS_X[col]! + EDGE, STREETS_X[col + 1]! - EDGE, STREETS_Z[row]! + EDGE, STREETS_Z[row + 1]! - EDGE);
}

/** Lot plus its ring of sidewalk: the raised slab. */
export function slab(col: number, row: number): Rect {
  return rect(STREETS_X[col]! + ROAD_HALF, STREETS_X[col + 1]! - ROAD_HALF, STREETS_Z[row]! + ROAD_HALF, STREETS_Z[row + 1]! - ROAD_HALF);
}

/** SackReligious boutique on the riverfront plaza. The front faces south, the river is behind it. */
export const HQ = {
  ...rect(-30, -6, -190, -174),
  doorX: -20.4,
  frontZ: -174,
  height: 9.6,
};

export const PLAZA = rect(-40, 34, RIVER_Z, STREETS_Z[0] - ROAD_HALF);

/** 901 Court on the river. Runs north-south so the far hoop sits against the skyline. */
export const COURT = {
  cx: 62,
  cz: -177,
  halfW: 7.6,
  halfL: 14,
  rimY: 3.05,
  /** Rim centre distance in from each baseline. */
  rimIn: 1.6,
};

export const PIER = { x: -84, half: 2.1, z0: RIVER_Z, z1: -227 };
export const BAIT_SHOP = { x: -97, z: -187 };
export const TRUCKS = { x: 104, z: -158 };

/** 901 Bowl. Building in block (3, 2); the lanes are a separate room. */
export const BOWL = { ...rect(79, 113, 3, 31), doorX: 96, frontZ: 31 };
export const ARENA = { cx: 32, cz: 20, r: 19 };

export const HOME = { x: -34, z: 74, w: 11, d: 8.5 };
/** The Fun House takes the whole block: the hall on Lamar, the kart track behind it. */
export const FUN = { ...rect(75, 117, 63, 84), doorX: 96, frontZ: 63 };
export const KART_TRACK = { cx: 96, cz: 96, halfX: 19, halfZ: 8.2, width: 5.2 };

/** Orange Mound Park takes block (0, 3), across Main Street from Benji's house. */
export const PARK = { minX: -119, maxX: -73, minZ: 61, maxZ: 107, cx: -96, cz: 84 };
/** The paved corner with the game tables, north-east of the fountain. */
export const PARK_TERRACE = { minX: -93.5, maxX: -75, minZ: 63, maxZ: 81 };
/** One table per game. The regular has the north seat; Benji walks up from the south. */
export const PARK_TABLES: { id: TableId; name: string; x: number; z: number; seats: 2 | 4; color: string }[] = [
  { id: "chess", name: "Chess", x: -90, z: 68, seats: 2, color: "#f4f1ea" },
  { id: "checkers", name: "Checkers", x: -84, z: 68, seats: 2, color: "#ff5a4a" },
  { id: "connect4", name: "Four in a Row", x: -78, z: 68, seats: 2, color: "#ffd166" },
  { id: "dominoes", name: "Dominoes", x: -90, z: 75.5, seats: 2, color: "#f4f1ea" },
  { id: "spades", name: "Spades", x: -84, z: 75.5, seats: 4, color: "#39ff14" },
  { id: "tictactoe", name: "Tic-Tac-Toe", x: -78, z: 75.5, seats: 2, color: "#5ac8ff" },
];

/** Interiors live far from the city so they never show through a wall. */
export const ROOM = {
  hq: { x: 0, z: 1000 },
  home: { x: 200, z: 1000 },
  bowl: { x: 400, z: 1000 },
  fun: { x: 600, z: 1000 },
  laser: { x: 800, z: 1000 },
};

/** Street circuit. Clockwise from the grid on Riverside Drive. */
export const RACE_LOOP: { x: number; z: number }[] = [
  { x: -96, z: -140 },
  { x: 0, z: -140 },
  { x: 100, z: -140 },
  { x: 128, z: -112 },
  { x: 128, z: -76 },
  { x: 128, z: -40 },
  { x: 100, z: -12 },
  { x: 0, z: -12 },
  { x: -100, z: -12 },
  { x: -128, z: -40 },
  { x: -128, z: -76 },
  { x: -128, z: -112 },
];
export const RACE_MEET = { x: -104, z: -151 };

/** `arrive` is where a ride lets Benji out and which way he faces, when the spot itself is not the place to stand. */
export type Poi = { id: string; name: string; x: number; z: number; color: string; arrive?: { x: number; z: number; heading: number } };

export const POIS: Poi[] = [
  { id: "hq", name: "SackReligious HQ", x: HQ.doorX, z: HQ.frontZ + 2, color: "#39ff14", arrive: { x: HQ.doorX, z: HQ.frontZ + 4.5, heading: Math.PI } },
  // Outside the fence at Court OG's table, turned to it: that is where a game is picked up, not out on the floor.
  { id: "court", name: "901 Court", x: COURT.cx, z: COURT.cz, color: "#ff8a3c", arrive: { x: COURT.cx + 4.6, z: COURT.cz + COURT.halfL + 5.5, heading: Math.PI } },
  { id: "pier", name: "Riverside Pier", x: PIER.x, z: -206, color: "#5ac8ff", arrive: { x: PIER.x, z: -203, heading: Math.PI } },
  // The windows are on the river side of the trucks: a ride lets him out in front of them, facing the counters.
  { id: "trucks", name: "Food Trucks", x: TRUCKS.x, z: TRUCKS.z, color: "#ffd166", arrive: { x: TRUCKS.x + 0.2, z: TRUCKS.z - 7, heading: 0 } },
  { id: "bowl", name: "901 Bowl", x: BOWL.doorX, z: BOWL.frontZ + 2, color: "#ff5ad1", arrive: { x: BOWL.doorX, z: BOWL.frontZ + 3.4, heading: Math.PI } },
  // Beside Nitro, turned to him, not on top of him.
  { id: "race", name: "Street Race", x: RACE_MEET.x, z: RACE_MEET.z, color: "#ff3b3b", arrive: { x: RACE_MEET.x + 2.6, z: RACE_MEET.z + 1.2, heading: -Math.PI / 2 - 0.4 } },
  { id: "home", name: "Home", x: HOME.x, z: HOME.z - HOME.d / 2 - 3, color: "#e0b33a" },
  { id: "fun", name: "The Fun House", x: FUN.doorX, z: FUN.frontZ - 2, color: "#b48cff" },
  // Let out on the terrace, facing the tables.
  { id: "park", name: "Orange Mound Park", x: PARK.cx, z: PARK.cz, color: "#7ddc6a", arrive: { x: -84, z: 79.6, heading: Math.PI } },
  // The rec grounds on Park Avenue: let out at the hut, and at the gate between the court and the cornhole boards.
  { id: "putt", name: "Sack Putt", x: -32, z: 96, color: "#39ff14", arrive: { x: -32, z: 105.8, heading: Math.PI } },
  { id: "courts", name: "Park Avenue Courts", x: 32, z: 96, color: "#5ac8ff", arrive: { x: 17.9, z: 104.6, heading: Math.PI } },
];

export function districtAt(x: number, z: number) {
  if (z < RIVER_Z + 1) return "On the River";
  if (z < STREETS_Z[0] - ROAD_HALF) return "Riverfront";
  if (z < STREETS_Z[1] - 20) return "Downtown";
  if (z < STREETS_Z[1] + 20) return "Beale Street";
  if (z < STREETS_Z[2] - ROAD_HALF) return "Downtown";
  if (z < STREETS_Z[3] - ROAD_HALF) return "Midtown";
  void x;
  return "Orange Mound";
}

export function nearestStreet(x: number, z: number) {
  let best = "";
  let bestD = 1e9;
  STREETS_X.forEach((sx, i) => {
    const d = Math.abs(x - sx);
    if (d < bestD) {
      bestD = d;
      best = STREET_NAMES_X[i]!;
    }
  });
  STREETS_Z.forEach((sz, i) => {
    const d = Math.abs(z - sz);
    if (d < bestD) {
      bestD = d;
      best = STREET_NAMES_Z[i]!;
    }
  });
  return best;
}
