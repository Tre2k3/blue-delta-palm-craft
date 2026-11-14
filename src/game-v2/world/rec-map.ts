/**
 * The rec grounds on Park Avenue, in numbers: the putt-putt course behind Benji's house, and the
 * tennis court and cornhole lawn on the next block east. What is built and what is played both
 * read from here, so a wall the ball bounces off is always the wall that is drawn.
 */

/** The two lawns: the Park Avenue half of each of the two middle neighbourhood blocks. */
export const PUTT_LOT = { minX: -55, maxX: -9, minZ: 85.6, maxZ: 107 };
export const COURTS_LOT = { minX: 9, maxX: 55, minZ: 85.6, maxZ: 107 };

// ------------------------------------------------------------------ putt-putt

/** A wall, end to end: x0, z0, x1, z1. */
export type Seg = [number, number, number, number];
/** A box on the lawn: minX, minZ, maxX, maxZ. */
export type Box = [number, number, number, number];

export type Hole = {
  name: string;
  par: number;
  /** One line said at the tee. */
  tip: string;
  /** Where the hole's own (0, 0) is in the world. */
  at: [number, number];
  /** The felt, as a closed outline. Its edges are kerbs. */
  outline: [number, number][];
  tee: [number, number];
  cup: [number, number];
  /** Walls standing on the felt. */
  walls?: Seg[];
  /** Round posts: x, z, radius. */
  posts?: [number, number, number][];
  /** Sand: the ball dies in it. */
  sand?: Box[];
  /** A ramp along z: flat at 0 on the tee's side of `z0`, climbing to `h` at `z1`, flat at `h` beyond. */
  ramp?: { z0: number; z1: number; h: number };
  /** A gate in a wall that a turning wheel shuts: the gap's two ends, how many paddles, and radians a second. */
  wheel?: { gap: Seg; paddles: number; speed: number };
  /** What stands on it, for whoever builds it. */
  theme: "plain" | "dogleg" | "bumpers" | "pyramid" | "bridge" | "wheel" | "hill" | "sand" | "bag";
};

const box = (minX: number, minZ: number, maxX: number, maxZ: number): [number, number][] => [
  [minX, minZ],
  [maxX, minZ],
  [maxX, maxZ],
  [minX, maxZ],
];
/** A block standing on the felt, as four walls. */
const block = (x: number, z: number, w: number, d: number): Seg[] => [
  [x - w / 2, z - d / 2, x + w / 2, z - d / 2],
  [x + w / 2, z - d / 2, x + w / 2, z + d / 2],
  [x + w / 2, z + d / 2, x - w / 2, z + d / 2],
  [x - w / 2, z + d / 2, x - w / 2, z - d / 2],
];

const COLS = [-50.4, -41.2, -32, -22.8, -13.6] as const;
const NORTH = 90.6;
const SOUTH = 101.6;

/** The same hole played the other way: everything north of its middle goes south. */
function turned(h: Hole): Hole {
  const seg = ([x0, z0, x1, z1]: Seg): Seg => [x0, -z0, x1, -z1];
  return {
    ...h,
    outline: h.outline.map(([x, z]) => [x, -z] as [number, number]),
    tee: [h.tee[0], -h.tee[1]],
    cup: [h.cup[0], -h.cup[1]],
    walls: h.walls?.map(seg),
    posts: h.posts?.map(([x, z, r]) => [x, -z, r] as [number, number, number]),
    sand: h.sand?.map(([x0, z0, x1, z1]) => [x0, -z1, x1, -z0] as Box),
    ramp: h.ramp && { z0: -h.ramp.z0, z1: -h.ramp.z1, h: h.ramp.h },
    wheel: h.wheel && { ...h.wheel, gap: seg(h.wheel.gap) },
  };
}

/**
 * Nine holes: one to five along the back fence going east, six to nine coming back along Park
 * Avenue. Every tee is on the walk between the two rows, so the back row is played north and the
 * front row south. The holes are written with the tee at the south end; the front row is turned.
 */
const DRAWN: Hole[] = [
  {
    name: "First Tee",
    par: 2,
    tip: "Straight at it. Left and right to aim, hold for power.",
    at: [COLS[0], NORTH],
    outline: box(-1.3, -4, 1.3, 4),
    tee: [0, 3.3],
    cup: [0, -3.2],
    theme: "plain",
  },
  {
    name: "The Dogleg",
    par: 2,
    tip: "Bank it off the slanted wall and it turns the corner for you.",
    at: [COLS[1] - 1.2, NORTH],
    outline: [
      [-1.3, -4],
      [3.9, -4],
      [3.9, -1.4],
      [1.3, -1.4],
      [1.3, 4],
      [-1.3, 4],
    ],
    tee: [0, 3.3],
    cup: [3.1, -2.7],
    walls: [[-1.3, -2.1, 0.6, -4]],
    theme: "dogleg",
  },
  {
    name: "Beale Bumpers",
    par: 3,
    tip: "The posts kick. Find the lane between them.",
    at: [COLS[2], NORTH],
    outline: box(-1.9, -4, 1.9, 4),
    tee: [0, 3.3],
    cup: [0, -3.3],
    posts: [
      [0, 1, 0.26],
      [-0.98, -0.6, 0.26],
      [0.98, -0.6, 0.26],
      [0, -2, 0.22],
    ],
    theme: "bumpers",
  },
  {
    name: "The Pyramid",
    par: 3,
    tip: "No way through it. Go round, off a side wall.",
    at: [COLS[3], NORTH],
    outline: box(-2.2, -4, 2.2, 4),
    tee: [0, 3.3],
    cup: [0, -3.2],
    walls: [
      [0, -1.75, 1.15, -0.6],
      [1.15, -0.6, 0, 0.55],
      [0, 0.55, -1.15, -0.6],
      [-1.15, -0.6, 0, -1.75],
    ],
    theme: "pyramid",
  },
  {
    name: "The M Bridge",
    par: 2,
    tip: "Three ways under the bridge. The middle one is the widest.",
    at: [COLS[4], NORTH],
    outline: box(-1.6, -4, 1.6, 4),
    tee: [0, 3.3],
    cup: [0.85, -3.2],
    walls: [...block(-0.62, -0.4, 0.34, 0.7), ...block(0.62, -0.4, 0.34, 0.7)],
    theme: "bridge",
  },
  {
    name: "The Paddle Wheel",
    par: 3,
    tip: "Wait for a paddle to clear the gate, then go.",
    at: [COLS[4], SOUTH],
    outline: box(-1.5, -4, 1.5, 4),
    tee: [0, 3.3],
    cup: [0, -3.2],
    walls: [
      [-1.5, -0.8, -0.46, -0.8],
      [0.46, -0.8, 1.5, -0.8],
    ],
    wheel: { gap: [-0.46, -0.8, 0.46, -0.8], paddles: 4, speed: 1.15 },
    theme: "wheel",
  },
  {
    name: "The Hill",
    par: 3,
    tip: "Too soft and it rolls back to you. Get it over the top.",
    at: [COLS[3], SOUTH],
    outline: box(-1.4, -4, 1.4, 4),
    tee: [0, 3.3],
    cup: [0, -3.1],
    ramp: { z0: 1.1, z1: -1.5, h: 0.5 },
    theme: "hill",
  },
  {
    name: "Sand Bar",
    par: 3,
    tip: "Round the two walls. Stay out of the sand.",
    at: [COLS[1], SOUTH],
    outline: box(-2, -4, 2, 4),
    tee: [1.2, 3.3],
    cup: [-1.1, -3.2],
    walls: [
      [-2, 1.3, 0.55, 1.3],
      [2, -0.8, -0.55, -0.8],
    ],
    sand: [
      [-2, -0.6, -0.5, 1.1],
      [0.5, -2.7, 2, -1],
    ],
    theme: "sand",
  },
  {
    name: "The Money Bag",
    par: 2,
    tip: "Down the funnel and into the bag. One putt gets the fireworks.",
    at: [COLS[0], SOUTH],
    outline: box(-1.6, -4, 1.6, 4),
    tee: [0, 3.3],
    cup: [0, -3.15],
    walls: [
      [-1.6, -0.9, -0.36, -2.3],
      [1.6, -0.9, 0.36, -2.3],
    ],
    theme: "bag",
  },
];

export const HOLES: Hole[] = DRAWN.map((h, i) => (i >= 5 ? turned(h) : h));

export const PUTT_PAR = HOLES.reduce((n, h) => n + h.par, 0);
export const BALL_R = 0.045;
export const CUP_R = 0.11;
/** Where Benji signs up, and where he is left when he is done. */
export const PUTT_HUT = { x: COLS[2], z: SOUTH + 0.6 };
export const PUTT_STAND = { x: COLS[2], z: SOUTH + 3.4 };

/** How high the felt is at a point of a hole, in the hole's own coordinates. */
export function feltHeight(h: Hole, z: number) {
  const r = h.ramp;
  if (!r) return 0;
  return r.h * Math.min(1, Math.max(0, (z - r.z0) / (r.z1 - r.z0)));
}

/** Is this point on the slope itself, where a ball cannot lie still? */
export function onSlope(h: Hole, z: number) {
  const r = h.ramp;
  return !!r && z > Math.min(r.z0, r.z1) && z < Math.max(r.z0, r.z1);
}

/** Which way a hole is played: +1 toward Park Avenue, -1 toward the back fence. */
export const playDir = (h: Hole) => (h.cup[1] > h.tee[1] ? 1 : -1);

/** Every wall of a hole: its kerbs, then whatever stands on the felt. */
export function wallsOf(h: Hole): Seg[] {
  const out: Seg[] = [];
  const o = h.outline;
  for (let i = 0; i < o.length; i++) {
    const a = o[i]!;
    const b = o[(i + 1) % o.length]!;
    out.push([a[0], a[1], b[0], b[1]]);
  }
  if (h.walls) out.push(...h.walls);
  return out;
}

// ------------------------------------------------------------------ tennis

/**
 * A singles court laid east to west. Benji has the west end and looks east, so across the court is
 * z and down it is x. `half` is the net to a baseline, `wide` the middle to a singles side line.
 */
export const TENNIS = {
  cx: 38.1,
  cz: 96,
  half: 11.885,
  wide: 4.115,
  /** Net to a service line. */
  service: 6.4,
  net: 0.95,
  /** The fence: how far past Benji's baseline (room for the lens behind him), the far baseline, and the side lines. */
  backWest: 6.4,
  backEast: 3.6,
  side: 3.3,
  /** Side line to the doubles line, painted but not played. */
  alley: 1.37,
};
/** The fence, as a box. */
export const TENNIS_FENCE = {
  minX: TENNIS.cx - TENNIS.half - TENNIS.backWest,
  maxX: TENNIS.cx + TENNIS.half + TENNIS.backEast,
  minZ: TENNIS.cz - TENNIS.wide - TENNIS.alley - TENNIS.side,
  maxZ: TENNIS.cz + TENNIS.wide + TENNIS.alley + TENNIS.side,
};
export const TENNIS_GATE = { x: TENNIS_FENCE.minX - 1.2, z: TENNIS.cz + 6.2 };

// ------------------------------------------------------------------ cornhole

/**
 * Two boards 27 feet apart, front edge to front edge, on the lawn west of the court. Throws go
 * north from the south board to the north one. `v` on a board runs from its front edge to its back.
 */
export const CORNHOLE = {
  x: 14,
  /** Front edge of the board that is thrown at, and of the one thrown from. */
  farZ: 93.4,
  nearZ: 101.6,
  len: 1.22,
  wide: 0.61,
  front: 0.08,
  rear: 0.3,
  /** The hole: how far up the board from its front edge, and its radius. */
  holeV: 0.99,
  holeR: 0.076,
};
export const CORNHOLE_STAND = { x: CORNHOLE.x - 0.75, z: CORNHOLE.nearZ + 0.15 };

/** Height of the board's top at `v` along it. */
export const boardY = (v: number) => CORNHOLE.front + ((CORNHOLE.rear - CORNHOLE.front) * v) / CORNHOLE.len;
