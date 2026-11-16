import type { TableId } from "../core/types";

/**
 * The city plan: downtown Memphis as it lies on the river, drawn half size, and Orange
 * Mound out east.
 *
 * The Mississippi is along the top (-Z), the way it is along the west side of downtown, so the
 * map is real Memphis turned a quarter so the river is up: +X is north, +Z is east, away from
 * the river. The streets that run beside the river (Riverside, Front, Main, 2nd, B.B. King, 4th,
 * Danny Thomas) are the ones at a fixed Z; the cross streets that run from the river inland
 * (Beale, Union, Madison, Poplar and the rest) are the ones at a fixed X, in their real order
 * from south to north.
 *
 * Everything that needs to agree on where a street or a door is reads it from here:
 * the builder, collision, traffic, the race, the minimap.
 */
/**
 * Measured from the US Census Bureau's street lines for Shelby County (TIGER/Line 2023, public
 * domain): each street's distance along the downtown grid, at one game unit to two metres. Three
 * stay where the game's designed blocks need them: Riverside is the riverfront promenade, Beale
 * is about twenty metres north of the real one, and Lamar and Park Avenue are Orange Mound's
 * streets brought in next to downtown.
 */
export const STREETS_X = [-392, -241, -140, -64, 0, 130, 185, 245, 360, 420, 535] as const;
export const STREETS_Z = [-140, -76, -12, 52, 116, 231, 399, 463, 527, 640] as const;
export const STREET_NAMES_X = [
  "Butler Ave",
  "Vance Ave",
  "MLK Ave",
  "Beale St",
  "Peabody Pl",
  "Union Ave",
  "Monroe Ave",
  "Madison Ave",
  "Jefferson Ave",
  "Adams Ave",
  "Poplar Ave",
] as const;
export const STREET_NAMES_Z = [
  "Riverside Dr",
  "Front St",
  "Main St",
  "2nd St",
  "B.B. King Blvd",
  "4th St",
  "Danny Thomas Blvd",
  "Lamar Ave",
  "Park Ave",
  "Mt Moriah Rd",
] as const;
/** Past Danny Thomas the cross streets are Orange Mound's own. */
export const STREET_NAMES_X_EAST = [
  "Hays Rd",
  "Semmes St",
  "Carnes Ave",
  "Spottswood Ave",
  "Saratoga Ave",
  "Marechal Ave",
  "Grand St",
  "Pendleton St",
  "Douglass Ave",
  "Airways Blvd",
  "Kimball Ave",
] as const;
/** Where Orange Mound starts, east of Danny Thomas. */
export const EAST_Z = 429;
/** The neighbourhood blocks were laid out nearer the river first. They moved this far east, to Orange Mound proper. */
export const OM = 411;
/** The first row of blocks that is Orange Mound (between Lamar and Park Ave and on). */
export const OM_ROW = 7;
/** Which street a cross street is called where it is. */
export const crossName = (i: number, z: number) =>
  z > EAST_Z ? STREET_NAMES_X_EAST[i]! : STREET_NAMES_X[i]!;

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
export const WORLD = { minX: -418, maxX: 600, minZ: -230, maxZ: 852 };

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

export function rect(minX: number, maxX: number, minZ: number, maxZ: number): Rect {
  return { minX, maxX, minZ, maxZ };
}

export function inRect(r: Rect, x: number, z: number, pad = 0) {
  return x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad;
}

/** Lot inside the sidewalks of block (col, row). Columns run west to east, rows north to south. */
export function lot(col: number, row: number): Rect {
  return rect(
    STREETS_X[col]! + EDGE,
    STREETS_X[col + 1]! - EDGE,
    STREETS_Z[row]! + EDGE,
    STREETS_Z[row + 1]! - EDGE,
  );
}

/** Lot plus its ring of sidewalk: the raised slab. */
export function slab(col: number, row: number): Rect {
  return rect(
    STREETS_X[col]! + ROAD_HALF,
    STREETS_X[col + 1]! - ROAD_HALF,
    STREETS_Z[row]! + ROAD_HALF,
    STREETS_Z[row + 1]! - ROAD_HALF,
  );
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

export const HOME = { x: -34, z: 74 + OM, w: 11, d: 8.5 };
/** The Fun House takes the whole block: the hall on Lamar, the kart track behind it. */
export const FUN = { ...rect(75, 117, 63 + OM, 84 + OM), doorX: 96, frontZ: 63 + OM };
export const KART_TRACK = { cx: 96, cz: 96 + OM, halfX: 19, halfZ: 8.2, width: 5.2 };

/** Orange Mound Park, between Lamar and Park Avenue, a block from Benji's house. */
export const PARK = { minX: -119, maxX: -73, minZ: 61 + OM, maxZ: 107 + OM, cx: -96, cz: 84 + OM };
/**
 * The playground in the park's south-west corner. The swing Benji rides hangs from `top` on
 * chains `len` long and swings north and south; the slide's chute runs south off the deck.
 * What is built and what is played both read these.
 */
export const SWING = { x: -112.95, z: 93 + OM, top: 2.72, len: 2.08 };
export const SLIDE = {
  x: -105.5,
  z: 97.5 + OM,
  deck: 1.6,
  top: { z: 0.614, y: 1.578 },
  foot: { z: 3.586, y: 0.142 },
};
/** The paved corner with the game tables, north-east of the fountain. */
export const PARK_TERRACE = { minX: -93.5, maxX: -75, minZ: 63 + OM, maxZ: 81 + OM };
/** One table per game. The regular has the north seat; Benji walks up from the south. */
export const PARK_TABLES: {
  id: TableId;
  name: string;
  x: number;
  z: number;
  seats: 2 | 4;
  color: string;
}[] = [
  { id: "chess", name: "Chess", x: -90, z: 68 + OM, seats: 2, color: "#f4f1ea" },
  { id: "checkers", name: "Checkers", x: -84, z: 68 + OM, seats: 2, color: "#ff5a4a" },
  { id: "connect4", name: "Four in a Row", x: -78, z: 68 + OM, seats: 2, color: "#ffd166" },
  { id: "dominoes", name: "Dominoes", x: -90, z: 75.5 + OM, seats: 2, color: "#f4f1ea" },
  { id: "spades", name: "Spades", x: -84, z: 75.5 + OM, seats: 4, color: "#39ff14" },
  { id: "tictactoe", name: "Tic-Tac-Toe", x: -78, z: 75.5 + OM, seats: 2, color: "#5ac8ff" },
];

/** Interiors live far from the city so they never show through a wall. */
export const ROOM = {
  hq: { x: 0, z: 1000 },
  home: { x: 200, z: 1000 },
  bowl: { x: 400, z: 1000 },
  fun: { x: 600, z: 1000 },
  laser: { x: 800, z: 1000 },
  club: { x: 1000, z: 1000 },
  rink: { x: 1200, z: 1000 },
};

/** Street circuit. Clockwise from the grid on Riverside Drive. */
export const RACE_LOOP: { x: number; z: number }[] = [
  { x: -112, z: -140 },
  { x: 0, z: -140 },
  { x: 157, z: -140 },
  { x: 185, z: -112 },
  { x: 185, z: -76 },
  { x: 185, z: -40 },
  { x: 157, z: -12 },
  { x: 0, z: -12 },
  { x: -112, z: -12 },
  { x: -140, z: -40 },
  { x: -140, z: -76 },
  { x: -140, z: -112 },
];
export const RACE_MEET = { x: -104, z: -151 };

/** `arrive` is where a ride lets Benji out and which way he faces, when the spot itself is not the place to stand. */
/** The Memphian's doors on Main Street, a block up from the Orpheum: the front of the old picture house faces Main. */
export const MEMPHIAN = { x: -40, z: -21 };
/** W.C. Handy Park, on Beale between 2nd and B.B. King. */
export const HANDY = { col: 3, row: 3 };
/** The stage in Handy Park: the middle of its boards, how big they are and how high. It faces 2nd Street, up the square. */
export const BEALE_STAGE = { x: -32, z: 101, w: 16, d: 8, top: CURB + 1 };

/**
 * The cypher in Handy Park: a sheet of lino taped down inside the Beale Street arch, a speaker,
 * and whoever is jookin on it. `r` is how far the lino reaches from its middle.
 */
export const CYPHER = { x: -41.5, z: 72.5, r: 2.7 };

/**
 * Memphis landmarks, each in its real block: FedExForum south of Beale between B.B. King and
 * 4th; the Peabody on Union between 2nd and B.B. King; AutoZone Park on Union between B.B. King
 * and 4th; the Orpheum on the corner of Main and Beale; the Lorraine Motel, now the National
 * Civil Rights Museum, by Mulberry and Butler; Court Square between Madison and Jefferson; the
 * Cotton Exchange on Front; the Pyramid on the river at the north end; Tom Lee Park on the river
 * south of Beale; Mud Island across the harbour. Middles of the buildings, on the ground.
 */
export const LANDMARKS = {
  fedex: { x: -102, z: 173 },
  peabody: { x: 105, z: 84 },
  ballpark: { x: 157, z: 173 },
  orpheum: { x: -84, z: -36 },
  lorraine: { x: -372, z: 8 },
  courtSquare: { x: 302, z: 20 },
  cotton: { x: 157, z: -44 },
  /** Past the north end of the walkable riverfront, on the water north of the I-40 bridge. */
  pyramid: { x: 710, z: -178, base: 92, height: 60 },
  tomLee: { x: -270, z: -176 },
  /** Across the Wolf River Harbor, from about Adams up to the bridge. */
  mudIsland: { minX: 360, maxX: 610, minZ: -272, maxZ: -228 },
} as const;

/**
 * Out on Mt. Moriah Road: Halle Stadium, its track round the football field, and the outdoor
 * courts beside it. The courts are full size, like the 901 Court; the north one is where a game
 * is played.
 */
export const HALLE = {
  track: { cx: -203, cz: 583.5, halfStraight: 21, radius: 23, lanes: 6, laneW: 1.22 },
  stand: rect(-232, -227.5, 552, 615),
  courts: [
    { cx: -164, cz: 560, halfW: 7.6, halfL: 14, rimY: 3.05, rimIn: 1.6 },
    { cx: -164, cz: 607, halfW: 7.6, halfL: 14, rimY: 3.05, rimIn: 1.6 },
  ],
} as const;
export const MORIAH_COURT = HALLE.courts[0];

/**
 * The Crystal Palace, the roller rink on South Third where South Memphis meets Whitehaven
 * (1981 to 2017). The hall faces Third Street with its sign up on the roof; the lot is beside it.
 */
export const RINK = { ...rect(-372, -318, 130, 166), doorX: -345, frontZ: 130, height: 8.5 };

/**
 * Adventure River, the water park out by I-40 (1985 to 1998): the wave pool, the lazy river round
 * the beach, and the slide tower with Geronimo. The water stands half a metre deep over the pool floors.
 */
export const WATERPARK = {
  lot: rect(429, 526, 536, 631),
  gate: { x: 477.5, z: 538 },
  wave: rect(436, 474, 548, 596),
  river: { cx: 500, cz: 582, halfX: 18, halfZ: 30, width: 5 },
  tower: { x: 443, z: 618, top: 16 },
  pool: rect(454, 478, 602, 628),
  waterY: 0.5,
};

/**
 * The Mid-South Fair on the old Fairgrounds, past Mt. Moriah Road: the gate and the midway down
 * the middle, Libertyland on the west side (the Zippin Pippin, the Grand Carousel, the log
 * flume, the Liberty Bell), the big rides on the east (the Ferris wheel, bumper cars, teacups,
 * the swings, the drop tower), and at the back the rodeo arena, the barns and the stage.
 */
export const FAIR = {
  ...rect(-130, 250, 656, 832),
  gate: { x: 60, z: 657 },
  midway: rect(50, 70, 660, 830),
  bell: { x: 26, z: 672 },
  carousel: { x: 4, z: 694, r: 9 },
  pippin: { station: { x: -48, z: 706 }, area: rect(-128, -40, 698, 828) },
  flume: rect(-32, 34, 752, 828),
  ferris: { x: 112, z: 702, r: 16, hub: 19 },
  bumper: rect(132, 172, 668, 700),
  teacups: { x: 198, z: 686, r: 8 },
  swings: { x: 230, z: 692, r: 9 },
  drop: { x: 232, z: 734, h: 40 },
  kiddie: { x: 100, z: 742 },
  stage: { x: 224, z: 768, w: 16, d: 9 },
  pigs: { x: 132, z: 756, halfX: 11, halfZ: 5.5 },
  rodeo: rect(92, 162, 782, 828),
  barns: rect(176, 246, 802, 828),
  zoo: rect(176, 202, 784, 798),
  food: [
    { id: "turkey", name: "Smoked Turkey Legs", price: 6, z: 682 },
    { id: "pronto", name: "Pronto Pups", price: 4, z: 698 },
    { id: "funnel", name: "Funnel Cakes", price: 5, z: 714 },
    { id: "cotton", name: "Cotton Candy", price: 3, z: 730 },
    { id: "apple", name: "Candied Apples", price: 3, z: 746 },
    { id: "lemon", name: "Fresh-Squeezed Lemonade", price: 3, z: 762 },
  ],
  striker: { x: 78, z: 684 },
  /** The show ring: the stunt dogs, with the clowns and the magic and puppet booth beside it. */
  shows: { x: 182, z: 730, r: 8 },
  krystal: { x: 80, z: 722 },
} as const;

/** Beale Street Landing, at the foot of Beale on the river, with a riverboat tied up beside it. */
export const LANDING = { x: -54, z0: RIVER_Z, z1: -222, w: 18, boat: { x: -38, z: -238, len: 44 } };
/** The Big River Crossing: the walk and bike path on the Harahan Bridge, just north of the I-55 bridge. */
export const CROSSING = { x: WORLD.minX - 34 };

export type Poi = {
  id: string;
  name: string;
  x: number;
  z: number;
  color: string;
  arrive?: { x: number; z: number; heading: number };
};

export const POIS: Poi[] = [
  {
    id: "hq",
    name: "SackReligious HQ",
    x: HQ.doorX,
    z: HQ.frontZ + 2,
    color: "#39ff14",
    arrive: { x: HQ.doorX, z: HQ.frontZ + 4.5, heading: Math.PI },
  },
  // Outside the fence at Court OG's table, turned to it: that is where a game is picked up, not out on the floor.
  {
    id: "court",
    name: "901 Court",
    x: COURT.cx,
    z: COURT.cz,
    color: "#ff8a3c",
    arrive: { x: COURT.cx + 4.6, z: COURT.cz + COURT.halfL + 5.5, heading: Math.PI },
  },
  {
    id: "pier",
    name: "Riverside Pier",
    x: PIER.x,
    z: -206,
    color: "#5ac8ff",
    arrive: { x: PIER.x, z: -203, heading: Math.PI },
  },
  // The windows are on the river side of the trucks: a ride lets him out in front of them, facing the counters.
  {
    id: "trucks",
    name: "Food Trucks",
    x: TRUCKS.x,
    z: TRUCKS.z,
    color: "#ffd166",
    arrive: { x: TRUCKS.x + 0.2, z: TRUCKS.z - 7, heading: 0 },
  },
  {
    id: "bowl",
    name: "901 Bowl",
    x: BOWL.doorX,
    z: BOWL.frontZ + 2,
    color: "#ff5ad1",
    arrive: { x: BOWL.doorX, z: BOWL.frontZ + 3.4, heading: Math.PI },
  },
  // Beside Nitro, turned to him, not on top of him.
  {
    id: "race",
    name: "Street Race",
    x: RACE_MEET.x,
    z: RACE_MEET.z,
    color: "#ff3b3b",
    arrive: { x: RACE_MEET.x + 2.6, z: RACE_MEET.z + 1.2, heading: -Math.PI / 2 - 0.4 },
  },
  { id: "home", name: "Home", x: HOME.x, z: HOME.z - HOME.d / 2 - 3, color: "#e0b33a" },
  { id: "fun", name: "The Fun House", x: FUN.doorX, z: FUN.frontZ - 2, color: "#b48cff" },
  // Let out on the terrace, facing the tables.
  {
    id: "park",
    name: "Orange Mound Park",
    x: PARK.cx,
    z: PARK.cz,
    color: "#7ddc6a",
    arrive: { x: -84, z: 79.6 + OM, heading: Math.PI },
  },
  // The rec grounds on Park Avenue: let out at the hut, and at the gate between the court and the cornhole boards.
  {
    id: "putt",
    name: "Sack Putt",
    x: -32,
    z: 96 + OM,
    color: "#39ff14",
    arrive: { x: -32, z: 105.8 + OM, heading: Math.PI },
  },
  {
    id: "courts",
    name: "Park Avenue Courts",
    x: 32,
    z: 96 + OM,
    color: "#5ac8ff",
    arrive: { x: 17.9, z: 104.6 + OM, heading: Math.PI },
  },
  {
    id: "cornhole",
    name: "Cornhole Lawn",
    x: 14,
    z: 97.5 + OM,
    color: "#f3e9c8",
    arrive: { x: 14.6, z: 104.4 + OM, heading: Math.PI },
  },
  // The old picture house on Main, and the stage in Handy Park on Beale: live music at both.
  {
    id: "memphian",
    name: "The Memphian Blues Club",
    x: MEMPHIAN.x,
    z: MEMPHIAN.z + 2,
    color: "#ffb400",
    arrive: { x: MEMPHIAN.x, z: MEMPHIAN.z + 2.5, heading: Math.PI },
  },
  {
    id: "bealestage",
    name: "Live on Beale",
    x: BEALE_STAGE.x,
    z: BEALE_STAGE.z - 8,
    color: "#ff4fd8",
    arrive: { x: BEALE_STAGE.x, z: BEALE_STAGE.z - 12, heading: 0 },
  },
  // Memphis itself: places to see, on the map and a ride away.
  {
    id: "fedex",
    name: "FedExForum",
    x: LANDMARKS.fedex.x,
    z: LANDMARKS.fedex.z,
    color: "#5a8cff",
    arrive: { x: STREETS_X[3] - ROAD_HALF - 1.8, z: LANDMARKS.fedex.z, heading: -Math.PI / 2 },
  },
  {
    id: "pyramid",
    name: "The Pyramid",
    x: LANDMARKS.pyramid.x,
    z: LANDMARKS.pyramid.z,
    color: "#bfe0ff",
    arrive: { x: WORLD.maxX - 6, z: LANDMARKS.pyramid.z, heading: Math.PI / 2 },
  },
  {
    id: "museum",
    name: "Civil Rights Museum",
    x: LANDMARKS.lorraine.x,
    z: LANDMARKS.lorraine.z,
    color: "#e8d9b0",
    arrive: { x: LANDMARKS.lorraine.x, z: LANDMARKS.lorraine.z - 14, heading: 0 },
  },
  {
    id: "ballpark",
    name: "AutoZone Park",
    x: LANDMARKS.ballpark.x,
    z: LANDMARKS.ballpark.z,
    color: "#ff8a3c",
    arrive: {
      x: STREETS_X[5] + ROAD_HALF + 1.8,
      z: LANDMARKS.ballpark.z,
      heading: -Math.PI / 2 + Math.PI,
    },
  },
  {
    id: "tomlee",
    name: "Tom Lee Park",
    x: LANDMARKS.tomLee.x,
    z: LANDMARKS.tomLee.z,
    color: "#7ddc6a",
  },
  // Let out on the open side of the ring, turned to the dancers.
  {
    id: "cypher",
    name: "Jookin Cypher",
    x: CYPHER.x,
    z: CYPHER.z,
    color: "#ff3b3b",
    arrive: { x: CYPHER.x + 0.6, z: CYPHER.z + 6.2, heading: Math.PI },
  },
  // Out past downtown and along the river: the places added with the real map.
  {
    id: "halle",
    name: "Halle Stadium",
    x: HALLE.track.cx,
    z: HALLE.track.cz,
    color: "#f2c230",
    arrive: {
      x: HALLE.courts[0].cx,
      z: HALLE.courts[0].cz - HALLE.courts[0].halfL - 4.2,
      heading: 0,
    },
  },
  {
    id: "rink",
    name: "Crystal Palace",
    x: RINK.doorX,
    z: RINK.frontZ - 2,
    color: "#5ae0ff",
    arrive: { x: RINK.doorX, z: RINK.frontZ - 4.2, heading: 0 },
  },
  {
    id: "waterpark",
    name: "Adventure River",
    x: WATERPARK.gate.x,
    z: WATERPARK.gate.z,
    color: "#2a8aff",
    arrive: { x: WATERPARK.gate.x, z: WATERPARK.lot.minZ - 2.4, heading: 0 },
  },
  {
    id: "landing",
    name: "Beale Street Landing",
    x: LANDING.x,
    z: -186,
    color: "#5ac8ff",
    arrive: { x: LANDING.x + 10, z: -176, heading: Math.PI },
  },
  {
    id: "crossing",
    name: "Big River Crossing",
    x: CROSSING.x,
    z: RIVER_Z - 30,
    color: "#ff4fd8",
    arrive: { x: WORLD.minX + 6, z: -190, heading: -Math.PI / 2 },
  },
  {
    id: "playground",
    name: "Swings and Slide",
    x: -109,
    z: 96 + OM,
    color: "#ff8a5c",
    arrive: { x: -109.5, z: 90.4 + OM, heading: 0 },
  },
];

export function districtAt(x: number, z: number) {
  if (z < RIVER_Z + 1) return "On the River";
  if (inRect(WATERPARK.lot, x, z, 2)) return "Adventure River";
  if (inRect(FAIR, x, z, 1)) return x < 40 ? "Libertyland" : "Mid-South Fair";
  if (z > STREETS_Z[8] + ROAD_HALF && x < STREETS_X[3]) return "Mt. Moriah";
  if (x < STREETS_X[1] && z > STREETS_Z[3] && z < STREETS_Z[6]) return "South Memphis";
  if (z < STREETS_Z[0] - ROAD_HALF)
    return x < -100 ? "Tom Lee Park" : x > 400 ? "The Pyramid" : "Riverfront";
  if (z > EAST_Z) return "Orange Mound";
  if (z > STREETS_Z[5] + ROAD_HALF) return "Medical District";
  if (Math.abs(x - STREETS_X[3]) < 22 && z > STREETS_Z[2] && z < STREETS_Z[5] + 12)
    return "Beale Street";
  if (x < STREETS_X[3] - 22) return "South Main";
  if (x > STREETS_X[7]) return "Uptown";
  return "Downtown";
}

export function nearestStreet(x: number, z: number) {
  let best = "";
  let bestD = 1e9;
  STREETS_X.forEach((sx, i) => {
    const d = Math.abs(x - sx);
    if (d < bestD) {
      bestD = d;
      best = crossName(i, z);
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
