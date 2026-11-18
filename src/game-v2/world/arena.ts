import * as THREE from "three";
import type { Solid } from "../core/types";
import { tex } from "../gfx/tex";
import { Frame, YAW, makeCtx, std } from "./kit";
import { ROOM } from "./map";
import { finish } from "./rooms";

/** The laser arena's hall: every layout is built inside the same four walls. */
export const ARENA_W = 32;
export const ARENA_D = 22;
export const ARENA_H = 6.4;
/** How high the upstairs is, and how high a step anyone can take without a ramp. */
export const DECK = 2.7;
const STEP = 0.5;
/** How much of somebody a wall has to be level with to stop them: shin to shoulder. */
const SHIN = 0.45;
const SHOULDER = 1.5;

/**
 * Something solid with a top and a bottom. Most stop a body and a beam alike. A floor upstairs
 * stops a beam but nobody walking under it; a rail stops a body but is open to shoot through.
 */
export type Block = Solid & { y0: number; y1: number; body: boolean; beam: boolean };
type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
/** A slope from the floor to the upstairs, rising toward +axis (`up` 1) or -axis (-1). */
type Ramp = Rect & { axis: "x" | "z"; up: 1 | -1 };
/** Somewhere a tagger walks to, how high it is, and which others can be walked to from it in a straight line. */
export type ArenaNode = { x: number; z: number; y: number; links: number[] };

type Box4 = readonly [number, number, number, number];
type P2 = readonly [number, number];
type P3 = readonly [number, number, number];
type Spec = {
  id: string;
  name: string;
  note: string;
  /** Cover on the floor, taller than anyone: middle x, middle z, width, depth. */
  covers: Box4[];
  /** Upstairs floors, ramps up to them, the rails round them, crates on them and the posts under them: x0, x1, z0, z1. */
  decks?: Box4[];
  ramps?: { at: Box4; axis: "x" | "z"; up: 1 | -1 }[];
  rails?: Box4[];
  crates?: P2[];
  pillars?: P2[];
  /** x, z and which floor (0 or 1). */
  nodes: P3[];
  /** The foot of a ramp and the top of it: fx, fz, tx, tz. Everything else is joined up by itself. */
  climbs?: Box4[];
  /** Where the pinks come in, if the usual five spots would put one of them inside something. */
  pinks?: P2[];
};

/** Where everybody starts, in every layout unless it says otherwise: Benji and three greens in one corner, the pinks spread along the far side. */
const START = { x: -4, z: 9, heading: Math.PI };
const GREENS: P2[] = [
  [-9, 9],
  [-13.5, 5.5],
  [-11.6, 7.6],
];
const PINKS: P2[] = [
  [-13, -9],
  [13, -9],
  [0, -9.6],
  [-13, 3],
  [13, 3],
];

/** The same thing turned half way round the middle of the hall, so both sides get a fair floor. */
const turn = {
  box: (b: Box4): Box4 => [-b[1], -b[0], -b[3], -b[2]],
  mid: (b: Box4): Box4 => [-b[0], -b[1], b[2], b[3]],
  pt: <T extends readonly number[]>(p: T): T => [-p[0]!, -p[1]!, ...p.slice(2)] as unknown as T,
};
const both = <T>(list: readonly T[], flip: (v: T) => T): T[] => [...list, ...list.map(flip)];

const SPECS: Spec[] = [
  {
    id: "yard",
    name: "The Yard",
    note: "One floor, nine blocks of cover. Where everybody learns.",
    covers: [
      [0, 0, 4.2, 1.2],
      [-7, -4, 1.2, 4],
      [7, 4, 1.2, 4],
      [-7, 5.4, 3.2, 1.2],
      [7, -5.4, 3.2, 1.2],
      [-12, 0, 1.2, 3.2],
      [12, 0, 1.2, 3.2],
      [0, -7, 1.2, 2.6],
      [0, 7, 1.2, 2.6],
    ],
    nodes: [
      [-14, -8.5, 0],
      [-4, -8.5, 0],
      [4, -8.5, 0],
      [14, -8.5, 0],
      [-14, 8.5, 0],
      [-4, 8.5, 0],
      [4, 8.5, 0],
      [14, 8.5, 0],
      [-9.6, 0, 0],
      [9.6, 0, 0],
      [-3.4, -3.4, 0],
      [3.4, 3.4, 0],
      [-3.4, 3.4, 0],
      [3.4, -3.4, 0],
    ],
  },
  {
    id: "catwalk",
    name: "The Catwalk",
    note: "Two floors. A bridge right across the middle with a ramp at each end: hold it and you see everything.",
    covers: both<Box4>(
      [
        [-7, -6.2, 3.2, 1.2],
        [-4, 6, 1.2, 3],
        [-11.5, -6.5, 1.2, 2.6],
        [0, -8, 2.6, 1.2],
      ],
      turn.mid,
    ),
    decks: [[-8.5, 8.5, -1.7, 1.7]],
    ramps: [
      { at: [-13.9, -8.5, -1.7, 1.7], axis: "x", up: 1 },
      { at: [8.5, 13.9, -1.7, 1.7], axis: "x", up: -1 },
    ],
    // Rails down both sides of the bridge, each with a gap to drop through.
    rails: both<Box4>(
      [
        [-8.5, 3, -1.7, -1.58],
        [5, 8.5, -1.7, -1.58],
      ],
      turn.box,
    ),
    crates: both<P2>([[-4, -0.85]], turn.pt),
    pillars: [
      [0, -1.34],
      [0, 1.34],
    ],
    nodes: [
      ...both<P3>(
        [
          [-14.8, -8.5, 0],
          [-9, -8.9, 0],
          [-3.5, -9.4, 0],
          [3.4, -9.4, 0],
          [9, -9, 0],
          [14.2, -6.8, 0],
          [-14.9, -3.7, 0],
          [-10, -3.5, 0],
          [-4.6, -3.3, 0],
          [1.8, -4, 0],
          [9.4, -3.4, 0],
          [14.9, -3.6, 0],
          [-14.95, 0, 0],
        ],
        turn.pt,
      ),
      [-7.7, 0, 1],
      [-4, 0.75, 1],
      [0, 0, 1],
      [4, -0.75, 1],
      [7.7, 0, 1],
    ],
    climbs: [
      [-14.95, 0, -7.7, 0],
      [14.95, 0, 7.7, 0],
    ],
  },
  {
    id: "towers",
    name: "The Towers",
    note: "Two floors. A tower in two corners, a nest in the middle, and bridges between them over everybody's heads.",
    covers: both<Box4>(
      [
        [-6.6, 1.6, 1.2, 3.4],
        [-9.5, 6.4, 3, 1.2],
        [0, 7.9, 1.2, 2.6],
      ],
      turn.mid,
    ),
    pinks: [
      [-13, -9],
      [13, -9],
      [0, -9.9],
      [-11, 3],
      [10.5, 2.6],
    ],
    decks: both<Box4>(
      [
        // The north-west tower, the bridge off it, and the tongue that turns in to the nest.
        [-16, -8.5, -11, -5.5],
        [-8.5, -1.5, -7.1, -5.5],
        [-3.5, -1.5, -5.5, -3],
      ],
      turn.box,
    ).concat([[-3.5, 3.5, -3, 3]]),
    ramps: [
      { at: [-15.7, -12.7, -5.5, -0.1], axis: "z", up: -1 },
      { at: [12.7, 15.7, 0.1, 5.5], axis: "z", up: 1 },
    ],
    rails: both<Box4>(
      [
        [-12.7, -8.5, -5.62, -5.5],
        [-8.62, -8.5, -11, -7.1],
        [-8.5, -6, -7.1, -6.98],
        [-4.5, -1.5, -7.1, -6.98],
        [-8.5, -3.5, -5.62, -5.5],
        [-3.5, -3.38, -5.5, -3],
        [-1.62, -1.5, -6.98, -3],
        [-1.5, 3.5, -3, -2.88],
        [-3.5, -3.38, -3, -0.9],
        [-3.5, -3.38, 0.9, 3],
      ],
      turn.box,
    ),
    crates: both<P2>([[-11.6, -8.2]], turn.pt).concat([[0, 0]]),
    pillars: both<P2>(
      [
        [-3.1, -2.6],
        [-3.1, 2.6],
        [-5.2, -6.3],
        [-8.9, -5.9],
      ],
      turn.pt,
    ),
    nodes: [
      ...both<P3>(
        [
          [-14.8, 8.5, 0],
          [-9.5, 8.6, 0],
          [-4, 9.2, 0],
          [3.6, 9.3, 0],
          [-14.6, 4, 0],
          [-9.6, 3.6, 0],
          [-4.4, 4.6, 0],
          [-11.2, -1.6, 0],
          [-5.8, -1.9, 0],
          [-0.2, -4.6, 0],
          [-10.6, -8.6, 0],
          [-5, -9.2, 0],
          [-14.2, 1, 0],
          // Upstairs: the head of the ramp, round the tower, along the bridge, and into the nest.
          [-14.2, -6.4, 1],
          [-13.6, -9.6, 1],
          [-9.8, -9.5, 1],
          [-9.7, -6.3, 1],
          [-5.2, -6.3, 1],
          [-2.5, -6.3, 1],
          [-2.5, -3.6, 1],
          [-2.3, -1.9, 1],
          [-2.2, 1.9, 1],
        ],
        turn.pt,
      ),
    ],
    climbs: both<Box4>([[-14.2, 1, -14.2, -6.4]], (c) => [-c[0], -c[1], -c[2], -c[3]]),
  },
];

/**
 * Is there anything in the way of walking straight from one point to another? `pad` is how much
 * room the walker needs each side. Unlike the lens's line of sight this counts thin things too:
 * a rail or one step of a ramp stops a body as surely as a wall.
 */
function barred(ax: number, az: number, bx: number, bz: number, solids: Solid[], pad: number) {
  const dx = bx - ax;
  const dz = bz - az;
  for (const s of solids) {
    let t0 = 0;
    let t1 = 1;
    if (Math.abs(dx) < 1e-9) {
      if (ax < s.minX - pad || ax > s.maxX + pad) continue;
    } else {
      const a = (s.minX - pad - ax) / dx;
      const c = (s.maxX + pad - ax) / dx;
      t0 = Math.max(t0, Math.min(a, c));
      t1 = Math.min(t1, Math.max(a, c));
      if (t0 > t1) continue;
    }
    if (Math.abs(dz) < 1e-9) {
      if (az < s.minZ - pad || az > s.maxZ + pad) continue;
    } else {
      const a = (s.minZ - pad - az) / dz;
      const c = (s.maxZ + pad - az) / dz;
      t0 = Math.max(t0, Math.min(a, c));
      t1 = Math.min(t1, Math.max(a, c));
      if (t0 > t1) continue;
    }
    return true;
  }
  return false;
}

const hot = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

/**
 * One way of laying the hall out: what stands in it, where the floors are, and how anybody gets
 * about. It answers the three things a match keeps asking: what am I standing on, what is in
 * my way, and can a beam get from here to there.
 */
export class Arena {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly storeys: number;
  readonly group = new THREE.Group();
  /**
   * The floor plan, for the card at the door: cover, upstairs floors and ramps as x0, x1, z0, z1
   * measured from the middle of the hall.
   */
  readonly plan: { covers: number[][]; decks: number[][]; ramps: number[][] };
  /** Where Benji comes in, where his three come in, and where the pinks do. */
  readonly start: { x: number; z: number; heading: number };
  readonly greens: { x: number; z: number }[];
  readonly pinks: { x: number; z: number }[];
  readonly blocks: Block[] = [];
  readonly nodes: ArenaNode[] = [];
  /** Which of the nodes are upstairs. */
  readonly upper: number[];
  /** The floor plan a single-storey game would use: whatever stands on the ground. */
  readonly solids: Solid[];
  private decks: Rect[] = [];
  private ramps: Ramp[] = [];
  private low: Solid[];
  private high: Solid[];
  private ways = new Map<number, Int16Array>();

  constructor(spec: Spec, seed: number) {
    const C = ROOM.laser;
    this.id = spec.id;
    this.name = spec.name;
    this.note = spec.note;
    this.storeys = spec.decks?.length ? 2 : 1;
    this.plan = {
      covers: spec.covers.map(([x, z, w, d]) => [x - w / 2, x + w / 2, z - d / 2, z + d / 2]),
      decks: (spec.decks ?? []).map((d) => [...d]),
      ramps: (spec.ramps ?? []).map((r) => [...r.at]),
    };
    this.start = { x: C.x + START.x, z: C.z + START.z, heading: START.heading };
    this.greens = GREENS.map(([x, z]) => ({ x: C.x + x, z: C.z + z }));
    this.pinks = (spec.pinks ?? PINKS).map(([x, z]) => ({ x: C.x + x, z: C.z + z }));
    const rect = (b: Box4): Rect => ({ minX: C.x + b[0], maxX: C.x + b[1], minZ: C.z + b[2], maxZ: C.z + b[3] });
    const block = (r: Rect, y0: number, y1: number, body = true, beam = true) => this.blocks.push({ ...r, y0, y1, body, beam });
    const W = ARENA_W / 2;
    const D = ARENA_D / 2;
    // The four walls.
    block(rect([-W - 1, W + 1, -D - 1, -D]), 0, ARENA_H);
    block(rect([-W - 1, W + 1, D, D + 1]), 0, ARENA_H);
    block(rect([-W - 1, -W, -D, D]), 0, ARENA_H);
    block(rect([W, W + 1, -D, D]), 0, ARENA_H);
    for (const [x, z, w, d] of spec.covers) block(rect([x - w / 2, x + w / 2, z - d / 2, z + d / 2]), 0, 2);
    for (const d of spec.decks ?? []) {
      const r = rect(d);
      this.decks.push(r);
      // The floor of it stops a beam and nothing else: people walk under.
      block(r, DECK - 0.16, DECK, false);
    }
    for (const rp of spec.ramps ?? []) {
      const r = rect(rp.at);
      this.ramps.push({ ...r, axis: rp.axis, up: rp.up });
      // Under the slope it is solid, in steps that never stand above it.
      const len = rp.axis === "x" ? r.maxX - r.minX : r.maxZ - r.minZ;
      const n = Math.max(2, Math.round(len / 0.6));
      for (let i = 0; i < n; i++) {
        const lo = i / n;
        const hi = (i + 1) / n;
        const top = DECK * (rp.up > 0 ? lo : 1 - hi) - 0.02;
        if (top < 0.06) continue;
        const a = rp.axis === "x" ? r.minX + len * lo : r.minZ + len * lo;
        const b = rp.axis === "x" ? r.minX + len * hi : r.minZ + len * hi;
        block(rp.axis === "x" ? { minX: a, maxX: b, minZ: r.minZ, maxZ: r.maxZ } : { minX: r.minX, maxX: r.maxX, minZ: a, maxZ: b }, 0, top);
      }
    }
    for (const r of spec.rails ?? []) block(rect(r), DECK, DECK + 0.92, true, false);
    for (const [x, z] of spec.crates ?? []) block(rect([x - 0.5, x + 0.5, z - 0.5, z + 0.5]), DECK, DECK + 1.15);
    for (const [x, z] of spec.pillars ?? []) block(rect([x - 0.36, x + 0.36, z - 0.36, z + 0.36]), 0, DECK - 0.16);
    this.low = this.at(0);
    this.high = this.at(DECK);
    this.solids = this.low;

    // Where taggers walk: every pair on the same floor with a clear straight line between them, and the ramps.
    for (const [x, z, floor] of spec.nodes) this.nodes.push({ x: C.x + x, z: C.z + z, y: floor ? DECK : 0, links: [] });
    const join = (i: number, j: number) => {
      if (i === j || this.nodes[i]!.links.includes(j)) return;
      this.nodes[i]!.links.push(j);
      this.nodes[j]!.links.push(i);
    };
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i]!;
        const b = this.nodes[j]!;
        const far = Math.hypot(a.x - b.x, a.z - b.z);
        if (a.y !== b.y || far > 11.5) continue;
        if (barred(a.x, a.z, b.x, b.z, a.y ? this.high : this.low, 0.42)) continue;
        // Upstairs the whole way has to be floor.
        let floor = true;
        if (a.y) for (let s = 0; s <= far && floor; s += 0.35) floor = this.surface(a.x + ((b.x - a.x) * s) / far, a.z + ((b.z - a.z) * s) / far, DECK) > DECK - 0.01;
        if (floor) join(i, j);
      }
    }
    for (const [fx, fz, tx, tz] of spec.climbs ?? []) join(this.near(C.x + fx, C.z + fz, 0), this.near(C.x + tx, C.z + tz, DECK));
    this.upper = this.nodes.map((n, i) => (n.y > 1 ? i : -1)).filter((i) => i >= 0);

    this.draw(spec, seed);
  }

  /** Everything at this height that stops a body. */
  private at(y: number): Solid[] {
    return this.blocks.filter((b) => b.body && b.y1 > y + SHIN && b.y0 < y + SHOULDER);
  }

  /** What is in the way of somebody whose feet are at `y`. */
  solidsAt(y: number): Solid[] {
    return y < 0.05 ? this.low : Math.abs(y - DECK) < 0.05 ? this.high : this.at(y);
  }

  /** The floor under a point, for somebody whose feet are at `y`: the highest one they could be standing on or step up to. */
  surface(x: number, z: number, y: number) {
    let best = 0;
    const reach = y + STEP;
    if (DECK <= reach) for (const d of this.decks) if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) return DECK;
    for (const r of this.ramps) {
      if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
      const t = r.axis === "x" ? (x - r.minX) / (r.maxX - r.minX) : (z - r.minZ) / (r.maxZ - r.minZ);
      const h = DECK * (r.up > 0 ? t : 1 - t);
      if (h <= reach && h > best) best = h;
    }
    return best;
  }

  /**
   * How far a beam gets, measured along the floor, from a point, along a heading (`hx`, `hz`, a
   * unit) rising `rise` for every metre. Walls, cover, floors, the roof and the ground all stop it.
   */
  beam(ox: number, oy: number, oz: number, hx: number, hz: number, rise: number, reach: number) {
    let far = reach;
    if (rise < -1e-5) far = Math.min(far, oy / -rise);
    else if (rise > 1e-5) far = Math.min(far, (ARENA_H - 0.1 - oy) / rise);
    for (const b of this.blocks) {
      if (!b.beam) continue;
      let t0 = 0;
      let t1 = far;
      if (Math.abs(hx) < 1e-9) {
        if (ox < b.minX || ox > b.maxX) continue;
      } else {
        const a = (b.minX - ox) / hx;
        const c = (b.maxX - ox) / hx;
        t0 = Math.max(t0, Math.min(a, c));
        t1 = Math.min(t1, Math.max(a, c));
        if (t0 > t1) continue;
      }
      if (Math.abs(hz) < 1e-9) {
        if (oz < b.minZ || oz > b.maxZ) continue;
      } else {
        const a = (b.minZ - oz) / hz;
        const c = (b.maxZ - oz) / hz;
        t0 = Math.max(t0, Math.min(a, c));
        t1 = Math.min(t1, Math.max(a, c));
        if (t0 > t1) continue;
      }
      if (Math.abs(rise) < 1e-9) {
        if (oy < b.y0 || oy > b.y1) continue;
      } else {
        const a = (b.y0 - oy) / rise;
        const c = (b.y1 - oy) / rise;
        t0 = Math.max(t0, Math.min(a, c));
        t1 = Math.min(t1, Math.max(a, c));
        if (t0 > t1) continue;
      }
      // Starting inside something (stood against it) does not count as hitting it.
      if (t0 <= 1e-6) continue;
      far = t0;
    }
    return far;
  }

  /** Can a beam get from one point to another? */
  clear(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    const dx = bx - ax;
    const dz = bz - az;
    const far = Math.hypot(dx, dz);
    if (far < 0.05) return true;
    return this.beam(ax, ay, az, dx / far, dz / far, (by - ay) / far, far) >= far - 0.04;
  }

  /**
   * The node nearest a point, on whatever floor `y` is nearest. With `walk`, the nearest that can
   * be walked straight to from there, if any can: for somebody who has to get back onto the paths.
   */
  near(x: number, z: number, y: number, walk = false): number {
    let best = -1;
    let bestD = 1e9;
    const solids = walk ? this.solidsAt(y) : null;
    this.nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - x, n.z - z) + Math.abs(n.y - y) * 6;
      if (d >= bestD) return;
      if (solids && (Math.abs(n.y - y) > 0.6 || barred(x, z, n.x, n.z, solids, 0.38))) return;
      bestD = d;
      best = i;
    });
    return best >= 0 ? best : walk ? this.near(x, z, y) : 0;
  }

  /** The next node to walk to on the shortest way from one node to another: up a ramp if that is where it leads. */
  step(from: number, to: number) {
    if (from === to) return from;
    let next = this.ways.get(to);
    if (!next) {
      // Out from where they are going, noting for every node which neighbour is one nearer.
      next = new Int16Array(this.nodes.length).fill(-1);
      next[to] = to;
      const todo = [to];
      for (let k = 0; k < todo.length; k++) {
        const at = todo[k]!;
        for (const j of this.nodes[at]!.links) {
          if (next[j] !== -1) continue;
          next[j] = at;
          todo.push(j);
        }
      }
      this.ways.set(to, next);
    }
    const hop = next[from]!;
    return hop >= 0 ? hop : from;
  }

  /** Can every node be walked to from every other? Checked by the tests, so a layout cannot strand anybody. */
  get joined() {
    const seen = new Set([0]);
    const todo = [0];
    while (todo.length) {
      for (const j of this.nodes[todo.pop()!]!.links) {
        if (seen.has(j)) continue;
        seen.add(j);
        todo.push(j);
      }
    }
    return seen.size === this.nodes.length;
  }

  // ---------------------------------------------------------------- what it looks like

  private draw(spec: Spec, seed: number) {
    const C = ROOM.laser;
    const ctx = makeCtx(seed);
    const f = new Frame(ctx, C.x, C.z, YAW.south);
    const glows = [hot(2.4, 0.5, 1.9), hot(0.3, 2.2, 2.0), hot(0.3, 2.4, 0.2), hot(1.3, 0.6, 2.6)];
    const body = std(0x16132a, 0.6, 0.2);
    const dark = std(0x0c0a18, 0.7, 0.2);
    /** A box with every edge of its top, and its four corners, picked out in light. */
    const lit = (x: number, z: number, w: number, d: number, y0: number, h: number, g: THREE.Material, mat: THREE.Material = body, posts = true) => {
      f.box(w, h, d, x, y0 + h / 2, z, mat);
      for (const s of [-1, 1]) {
        f.box(w + 0.04, 0.06, 0.06, x, y0 + h, z + (s * d) / 2, g, ctx.flat);
        f.box(0.06, 0.06, d + 0.04, x + (s * w) / 2, y0 + h, z, g, ctx.flat);
        if (!posts) continue;
        f.box(0.06, h, 0.06, x + (s * w) / 2, y0 + h / 2, z + (s * d) / 2, g, ctx.flat);
        f.box(0.06, h, 0.06, x + (s * w) / 2, y0 + h / 2, z - (s * d) / 2, g, ctx.flat);
      }
    };
    spec.covers.forEach(([x, z, w, d], i) => lit(x, z, w, d, 0, 2, glows[i % 4]!));
    const grate = new THREE.MeshStandardMaterial({
      map: tex(128, 128, (g, w, h) => {
        g.fillStyle = "#0d0b1c";
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "#2c2466";
        g.lineWidth = 2;
        for (let i = 0; i <= w; i += 16) {
          g.beginPath();
          g.moveTo(i, 0);
          g.lineTo(i, h);
          g.moveTo(0, i);
          g.lineTo(w, i);
          g.stroke();
        }
        g.strokeStyle = "rgba(42,224,208,0.5)";
        g.lineWidth = 3;
        g.strokeRect(1.5, 1.5, w - 3, h - 3);
      }),
      roughness: 0.4,
      metalness: 0.4,
    });
    (spec.decks ?? []).forEach(([x0, x1, z0, z1], i) => {
      const w = x1 - x0;
      const d = z1 - z0;
      f.box(w, 0.16, d, (x0 + x1) / 2, DECK - 0.08, (z0 + z1) / 2, dark);
      f.flat(w, d, (x0 + x1) / 2, DECK + 0.004, (z0 + z1) / 2, grate, ctx.ground, 2);
      // Its edge glows, so it reads from the floor as a floor and not a shadow.
      const g = glows[(i + 1) % 4]!;
      for (const s of [-1, 1]) {
        f.box(w, 0.05, 0.05, (x0 + x1) / 2, DECK - 0.16, s > 0 ? z1 : z0, g, ctx.flat);
        f.box(0.05, 0.05, d, s > 0 ? x1 : x0, DECK - 0.16, (z0 + z1) / 2, g, ctx.flat);
      }
    });
    for (const rp of spec.ramps ?? []) {
      const [x0, x1, z0, z1] = rp.at;
      const len = rp.axis === "x" ? x1 - x0 : z1 - z0;
      const wide = rp.axis === "x" ? z1 - z0 : x1 - x0;
      const slope = Math.hypot(len, DECK);
      const tilt = Math.atan2(DECK, len) * rp.up;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      // The slope itself, with a line of light down each side and bars across it to climb by.
      const slab = rp.axis === "x" ? new THREE.BoxGeometry(slope, 0.12, wide) : new THREE.BoxGeometry(wide, 0.12, slope);
      const pitch = rp.axis === "z" ? -tilt : 0;
      const roll = rp.axis === "x" ? tilt : 0;
      f.add(slab, dark, cx, DECK / 2 - 0.06, cz, ctx.solid, 0, pitch, roll);
      for (const s of [-1, 1]) {
        const edge = rp.axis === "x" ? new THREE.BoxGeometry(slope, 0.07, 0.07) : new THREE.BoxGeometry(0.07, 0.07, slope);
        f.add(edge, glows[2]!, rp.axis === "x" ? cx : cx + (s * wide) / 2, DECK / 2 + 0.03, rp.axis === "x" ? cz + (s * wide) / 2 : cz, ctx.flat, 0, pitch, roll);
      }
      const bars = Math.round(len / 0.9);
      for (let i = 1; i < bars; i++) {
        const t = i / bars;
        const h = DECK * (rp.up > 0 ? t : 1 - t) + 0.02;
        if (rp.axis === "x") f.box(0.07, 0.03, wide - 0.2, x0 + len * t, h, cz, glows[1]!, ctx.flat);
        else f.box(wide - 0.2, 0.03, 0.07, cx, h, z0 + len * t, glows[1]!, ctx.flat);
      }
    }
    // What holds the slopes up: the same steps that stop anybody walking in under them.
    const C0 = ROOM.laser;
    for (const b of this.blocks) {
      const ramp = b.body && b.y0 === 0 && b.y1 < DECK - 0.1 && b.y1 !== 2 && this.ramps.some((r) => b.minX >= r.minX - 0.01 && b.maxX <= r.maxX + 0.01 && b.minZ >= r.minZ - 0.01 && b.maxZ <= r.maxZ + 0.01);
      if (ramp) f.box(b.maxX - b.minX, b.y1, b.maxZ - b.minZ, (b.minX + b.maxX) / 2 - C0.x, b.y1 / 2 - 0.05, (b.minZ + b.maxZ) / 2 - C0.z, body);
    }
    // Rails sit just under his eye when he is upstairs, so their light is a thin dim line and not a bar across the view.
    const dim = [hot(0.9, 0.2, 0.7), hot(0.12, 0.8, 0.75), hot(0.12, 0.85, 0.1), hot(0.5, 0.25, 0.95)];
    // Open railings: a bar along the top, another half way, and a post every stride. They keep
    // people from walking off and hide nobody.
    (spec.rails ?? []).forEach(([x0, x1, z0, z1], i) => {
      const w = x1 - x0;
      const d = z1 - z0;
      const along = w > d;
      const len = along ? w : d;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      for (const y of [0.9, 0.46]) f.box(along ? w : 0.06, 0.05, along ? 0.06 : d, cx, DECK + y, cz, dark);
      f.box(along ? w : 0.03, 0.03, along ? 0.03 : d, cx, DECK + 0.935, cz, dim[(i + 3) % 4]!, ctx.flat);
      const posts = Math.max(2, Math.round(len / 1.4) + 1);
      for (let k = 0; k < posts; k++) {
        const t = posts === 1 ? 0 : k / (posts - 1) - 0.5;
        f.box(0.06, 0.92, 0.06, along ? cx + t * (len - 0.06) : cx, DECK + 0.46, along ? cz : cz + t * (len - 0.06), dark);
      }
    });
    (spec.crates ?? []).forEach(([x, z], i) => lit(x, z, 1, 1, DECK, 1.15, glows[i % 4]!));
    for (const [x, z] of spec.pillars ?? []) {
      f.box(0.72, DECK - 0.16, 0.72, x, (DECK - 0.16) / 2, z, dark);
      f.box(0.76, 0.06, 0.76, x, 0.9, z, glows[3]!, ctx.flat);
    }
    finish(ctx, this.group);
  }
}

/** Every layout of the hall, built once. The first is the one a new player gets. */
export function buildArenas() {
  return SPECS.map((s, i) => new Arena(s, 404 + i * 7));
}
