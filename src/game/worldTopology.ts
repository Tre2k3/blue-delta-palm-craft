import { POIS, STREETS, TILE, WORLD_PX_H, WORLD_PX_W, WORLD_W } from "./data";

export type Rect = { x: number; y: number; w: number; h: number };
export type LaneAxis = "x" | "y";
export type Lane = {
  id: string;
  axis: LaneAxis;
  fixed: number;
  min: number;
  max: number;
  dir: 1 | -1;
  speed: number;
};

const ROAD_HALF = TILE * 0.92;
const LANE_OFFSET = TILE * 0.34;
const SIDEWALK = TILE * 0.28;
const INTERIOR_WALL = TILE * 0.24;

/** South edge of Memphis — Mississippi runs the full width. */
export const RIVER_TILE_Y = 41;

export function riverHole(): Rect {
  const y = RIVER_TILE_Y * TILE;
  return { x: 0, y, w: WORLD_PX_W, h: WORLD_PX_H - y };
}

export type PierDef = { id: number; x: number; w: number };

export const PIERS: PierDef[] = [
  { id: 0, x: 7.2 * TILE, w: 1.35 * TILE },
  { id: 1, x: 21.6 * TILE, w: 1.35 * TILE },
  { id: 2, x: 36.2 * TILE, w: 1.35 * TILE },
  { id: 3, x: 50.4 * TILE, w: 1.35 * TILE },
];

export function pierRects(): Rect[] {
  const r = riverHole();
  const reach = TILE * 2.55;
  return PIERS.map((p) => ({
    x: p.x,
    y: r.y - 22,
    w: p.w,
    h: reach + 22,
  }));
}

export function inRiverPx(x: number, y: number) {
  const r = riverHole();
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function onPier(x: number, y: number) {
  return pierRects().some((p) => x >= p.x - 8 && x <= p.x + p.w + 8 && y >= p.y && y <= p.y + p.h);
}

/** Boardwalk just north of the water, or standing on a pier. */
export function onRiverfront(x: number, y: number) {
  const r = riverHole();
  if (y > r.y - 64 && y < r.y + 14 && x > 24 && x < WORLD_PX_W - 24) return true;
  return onPier(x, y);
}

export function inDeepWater(x: number, y: number, rad = 12) {
  const r = riverHole();
  const water: Rect = { x: r.x, y: r.y + 8, w: r.w, h: r.h - 8 };
  if (!circleHitsRect(x, y, rad, water)) return false;
  if (onPier(x, y)) return false;
  return true;
}

export function roadRects(): Rect[] {
  const riverY = riverHole().y;
  return STREETS.map((s) =>
    s.axis === "y"
      ? { x: 0, y: s.tile * TILE - ROAD_HALF, w: WORLD_PX_W, h: ROAD_HALF * 2 }
      : { x: s.tile * TILE - ROAD_HALF, y: 0, w: ROAD_HALF * 2, h: Math.max(40, riverY - ROAD_HALF) },
  );
}

export function sidewalkRects(): Rect[] {
  const out: Rect[] = [];
  const riverY = riverHole().y;
  for (const s of STREETS) {
    if (s.axis === "y") {
      const cy = s.tile * TILE;
      out.push({ x: 0, y: cy - ROAD_HALF - SIDEWALK, w: WORLD_PX_W, h: SIDEWALK });
      out.push({ x: 0, y: cy + ROAD_HALF, w: WORLD_PX_W, h: SIDEWALK });
    } else {
      const cx = s.tile * TILE;
      const h = Math.max(40, riverY - ROAD_HALF);
      out.push({ x: cx - ROAD_HALF - SIDEWALK, y: 0, w: SIDEWALK, h });
      out.push({ x: cx + ROAD_HALF, y: 0, w: SIDEWALK, h });
    }
  }
  return out;
}

export function courtHole(): Rect {
  const c = POIS.find((p) => p.id === "court")!;
  const pad = 56;
  return { x: c.x - pad, y: c.y - pad, w: c.w + pad * 2, h: c.h + pad * 2 };
}

export function inCourtPx(x: number, y: number) {
  const c = courtHole();
  return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
}

export function punchHole(r: Rect, c: Rect): Rect[] {
  const hits = r.x < c.x + c.w && r.x + r.w > c.x && r.y < c.y + c.h && r.y + r.h > c.y;
  if (!hits) return [r];
  const out: Rect[] = [];
  if (r.x < c.x) out.push({ x: r.x, y: r.y, w: Math.min(r.w, c.x - r.x), h: r.h });
  const rx2 = r.x + r.w;
  const cx2 = c.x + c.w;
  if (rx2 > cx2) {
    const x = Math.max(r.x, cx2);
    out.push({ x, y: r.y, w: rx2 - x, h: r.h });
  }
  const mx = Math.max(r.x, c.x);
  const mw = Math.min(rx2, cx2) - mx;
  if (mw > 2) {
    if (r.y < c.y) out.push({ x: mx, y: r.y, w: mw, h: Math.min(r.h, c.y - r.y) });
    const ry2 = r.y + r.h;
    const cy2 = c.y + c.h;
    if (ry2 > cy2) {
      const y = Math.max(r.y, cy2);
      out.push({ x: mx, y, w: mw, h: ry2 - y });
    }
  }
  return out.filter((q) => q.w > 2 && q.h > 2);
}

export function punchHoles(r: Rect, holes: Rect[]): Rect[] {
  let parts = [r];
  for (const hole of holes) {
    parts = parts.flatMap((p) => punchHole(p, hole));
  }
  return parts.filter((q) => q.w > 6 && q.h > 6);
}

/** Cut Sackrow court out of a street/sidewalk strip so Poplar/3rd never bury the floor. */
export function punchCourt(r: Rect): Rect[] {
  return punchHole(r, courtHole());
}

const ROAD_PUNCH_SKIP = new Set(["court", "river", "dropvan", "strip", "alley"]);

export function roadBlockers(): Rect[] {
  const holes: Rect[] = [courtHole(), riverHole()];
  for (const p of POIS) {
    if (ROAD_PUNCH_SKIP.has(p.id)) continue;
    holes.push({ x: p.x - 16, y: p.y - 16, w: p.w + 32, h: p.h + 32 });
  }
  return holes;
}

export function punchRoads(r: Rect): Rect[] {
  return punchHoles(r, roadBlockers());
}

/** Filler buildings sit in the blocks BETWEEN streets — never on the asphalt. */
export function cityBlockBuildings(): Rect[] {
  const xCuts = [0, ...STREETS.filter((s) => s.axis === "x").map((s) => s.tile).sort((a, b) => a - b), WORLD_W];
  const yCuts = [0, ...STREETS.filter((s) => s.axis === "y").map((s) => s.tile).sort((a, b) => a - b), RIVER_TILE_Y];
  const INSET = 1.85;
  const out: Rect[] = [];
  for (let i = 0; i < xCuts.length - 1; i++) {
    for (let j = 0; j < yCuts.length - 1; j++) {
      const x0 = (xCuts[i]! + INSET) * TILE;
      const x1 = (xCuts[i + 1]! - INSET) * TILE;
      const y0 = (yCuts[j]! + INSET) * TILE;
      const y1 = (yCuts[j + 1]! - INSET) * TILE;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 96 || h < 72) continue;
      let blocked = false;
      for (const p of POIS) {
        if (p.id === "river" || p.id === "dropvan" || p.id === "strip") continue;
        const pad = p.id === "court" ? 48 : 28;
        if (x0 < p.x + p.w + pad && x0 + w > p.x - pad && y0 < p.y + p.h + pad && y0 + h > p.y - pad) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      const bh = Math.min(h, 128 + ((i * 13 + j * 7) % 36));
      if (w > 300) {
        const gap = 32;
        const bw = (w - gap) / 2;
        out.push({ x: x0, y: y0, w: bw, h: bh });
        out.push({ x: x0 + bw + gap, y: y0 + ((i + j) % 2) * 10, w: bw, h: Math.min(h, bh + 12) });
      } else {
        out.push({ x: x0, y: y0, w, h: bh });
      }
    }
  }
  return out;
}

export function trafficLanes(): Lane[] {
  const lanes: Lane[] = [];
  const riverY = riverHole().y - ROAD_HALF - 8;
  for (const s of STREETS) {
    const c = s.tile * TILE;
    if (s.axis === "y") {
      lanes.push({ id: `${s.name}:east`, axis: "x", fixed: c - LANE_OFFSET, min: 0, max: WORLD_PX_W, dir: 1, speed: 86 });
      lanes.push({ id: `${s.name}:west`, axis: "x", fixed: c + LANE_OFFSET, min: 0, max: WORLD_PX_W, dir: -1, speed: 80 });
    } else {
      lanes.push({ id: `${s.name}:south`, axis: "y", fixed: c - LANE_OFFSET, min: 0, max: riverY, dir: 1, speed: 82 });
      lanes.push({ id: `${s.name}:north`, axis: "y", fixed: c + LANE_OFFSET, min: 0, max: riverY, dir: -1, speed: 78 });
    }
  }
  return lanes;
}

const MESH_SKIP = new Set(["court", "river", "dropvan", "strip", "alley", "foodtruck", "velis", "brothers", "welcome", "listenpost", "billboard"]);
const ROAD_CLEAR = TILE * 1.7;

function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function blockInteriorNear(cx: number, cy: number, w: number, h: number): Rect | null {
  const xCuts = [0, ...STREETS.filter((s) => s.axis === "x").map((s) => s.tile).sort((a, b) => a - b), WORLD_W];
  const yCuts = [0, ...STREETS.filter((s) => s.axis === "y").map((s) => s.tile).sort((a, b) => a - b), RIVER_TILE_Y];
  const INSET = 1.7;
  for (let i = 0; i < xCuts.length - 1; i++) {
    for (let j = 0; j < yCuts.length - 1; j++) {
      const gx0 = xCuts[i]! * TILE;
      const gx1 = xCuts[i + 1]! * TILE;
      const gy0 = yCuts[j]! * TILE;
      const gy1 = yCuts[j + 1]! * TILE;
      if (cx < gx0 || cx > gx1 || cy < gy0 || cy > gy1) continue;
      const bx0 = gx0 + INSET * TILE;
      const bx1 = gx1 - INSET * TILE;
      const by0 = gy0 + INSET * TILE;
      const by1 = gy1 - INSET * TILE;
      const bw = Math.min(w, Math.max(80, bx1 - bx0));
      const bh = Math.min(h, Math.max(70, by1 - by0));
      if (bx1 - bx0 < 80 || by1 - by0 < 70) return null;
      const x = Math.min(Math.max(cx - bw / 2, bx0), bx1 - bw);
      const y = Math.min(Math.max(cy - bh / 2, by0), by1 - bh);
      return { x, y, w: bw, h: bh };
    }
  }
  return null;
}

/** 3D landmark box — always in a city block, never on asphalt or the court. */
export function poiBuildingRect(p: { id: string; x: number; y: number; w: number; h: number }): Rect {
  if (MESH_SKIP.has(p.id)) return { x: p.x, y: p.y, w: p.w, h: p.h };
  const pad = ROAD_CLEAR - ROAD_HALF;
  const keepOff = roadRects().map((r) => ({
    x: r.x - pad,
    y: r.y - pad,
    w: r.w + pad * 2,
    h: r.h + pad * 2,
  }));
  let x0 = p.x;
  let y0 = p.y;
  let x1 = p.x + p.w;
  let y1 = p.y + p.h;
  for (let n = 0; n < 8; n++) {
    let hit = false;
    for (const g of keepOff) {
      if (x0 >= g.x + g.w || x1 <= g.x || y0 >= g.y + g.h || y1 <= g.y) continue;
      hit = true;
      const rcx = g.x + g.w / 2;
      const rcy = g.y + g.h / 2;
      const pcx = (x0 + x1) / 2;
      const pcy = (y0 + y1) / 2;
      if (g.w >= g.h) {
        if (pcy <= rcy) y1 = Math.min(y1, g.y);
        else y0 = Math.max(y0, g.y + g.h);
      } else if (pcx <= rcx) x1 = Math.min(x1, g.x);
      else x0 = Math.max(x0, g.x + g.w);
    }
    if (!hit) break;
  }
  if (x1 - x0 < TILE * 1.7 || y1 - y0 < TILE * 1.5) {
    return blockInteriorNear(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h) ?? { x: p.x, y: p.y, w: p.w, h: p.h };
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function subtractRange(ranges: { min: number; max: number }[], cut0: number, cut1: number) {
  const out: { min: number; max: number }[] = [];
  for (const r of ranges) {
    if (cut1 <= r.min || cut0 >= r.max) {
      out.push(r);
      continue;
    }
    if (cut0 > r.min) out.push({ min: r.min, max: Math.min(r.max, cut0) });
    if (cut1 < r.max) out.push({ min: Math.max(r.min, cut1), max: r.max });
  }
  return out.filter((r) => r.max - r.min > TILE * 1.8);
}

let cachedDriveBlockers: Rect[] | null = null;

export function driveBlockers(): Rect[] {
  if (cachedDriveBlockers) return cachedDriveBlockers;
  const out: Rect[] = [{ x: courtHole().x - 28, y: courtHole().y - 28, w: courtHole().w + 56, h: courtHole().h + 56 }, riverHole()];
  for (const p of POIS) {
    if (p.id === "river" || p.id === "dropvan" || p.id === "strip" || p.id === "alley") continue;
    if (p.id === "court" || p.id === "foodtruck" || p.id === "velis" || p.id === "brothers") continue;
    if (p.id === "welcome" || p.id === "listenpost" || p.id === "billboard") continue;
    out.push(poiBuildingRect(p));
  }
  out.push(...cityBlockBuildings());
  cachedDriveBlockers = out;
  return out;
}

export function carBlocked(x: number, y: number, rad = 16) {
  if (inCourtPx(x, y) || inDeepWater(x, y, rad)) return true;
  for (const b of driveBlockers()) {
    if (circleHitsRect(x, y, rad, b)) return true;
  }
  return false;
}

export function clipLane(lane: Lane): { min: number; max: number }[] {
  const rad = TILE * 0.55;
  let ranges = [{ min: lane.min, max: lane.max }];
  for (const b of driveBlockers()) {
    if (lane.axis === "x") {
      if (b.y + b.h < lane.fixed - rad || b.y > lane.fixed + rad) continue;
      ranges = subtractRange(ranges, b.x - rad, b.x + b.w + rad);
    } else {
      if (b.x + b.w < lane.fixed - rad || b.x > lane.fixed + rad) continue;
      ranges = subtractRange(ranges, b.y - rad, b.y + b.h + rad);
    }
  }
  return ranges;
}

export function clippedTrafficLanes(): Lane[] {
  const out: Lane[] = [];
  for (const lane of trafficLanes()) {
    const parts = clipLane(lane);
    if (!parts.length) continue;
    parts.forEach((part, i) => {
      out.push({
        ...lane,
        id: parts.length === 1 ? lane.id : `${lane.id}~${i}`,
        min: part.min,
        max: part.max,
      });
    });
  }
  return out;
}

export function nearestAsphalt(x: number, y: number) {
  const lanes = clippedTrafficLanes();
  let best = { x, y, d: Infinity, laneId: lanes[0]?.id ?? "" };
  for (const lane of lanes) {
    let px = x;
    let py = y;
    if (lane.axis === "x") {
      py = lane.fixed;
      px = Math.min(lane.max, Math.max(lane.min, x));
    } else {
      px = lane.fixed;
      py = Math.min(lane.max, Math.max(lane.min, y));
    }
    const d = Math.hypot(px - x, py - y);
    if (d < best.d) best = { x: px, y: py, d, laneId: lane.id };
  }
  return best;
}

export function oppositeLaneId(id: string) {
  const base = id.split("~")[0] ?? id;
  if (base.endsWith(":east")) return base.replace(":east", ":west");
  if (base.endsWith(":west")) return base.replace(":west", ":east");
  if (base.endsWith(":south")) return base.replace(":south", ":north");
  if (base.endsWith(":north")) return base.replace(":north", ":south");
  return null;
}

// Enterable buildings are traversable volumes with explicit wall strips below;
// world zones stay non-solid as before.
const NON_SOLID_POIS = new Set(["apartment", "store", "court", "river", "dropvan", "beale", "foodtruck", "velis", "brothers", "alley", "strip", "welcome", "listenpost", "billboard"]);

function shellWithSouthDoor(p: { x: number; y: number; w: number; h: number }, doorCenterX: number, doorWidth: number): Rect[] {
  const t = INTERIOR_WALL;
  const doorL = Math.max(p.x + t, doorCenterX - doorWidth / 2);
  const doorR = Math.min(p.x + p.w - t, doorCenterX + doorWidth / 2);
  const out: Rect[] = [
    { x: p.x, y: p.y, w: p.w, h: t },
    { x: p.x, y: p.y, w: t, h: p.h },
    { x: p.x + p.w - t, y: p.y, w: t, h: p.h },
  ];
  if (doorL > p.x) out.push({ x: p.x, y: p.y + p.h - t, w: doorL - p.x, h: t });
  if (doorR < p.x + p.w) out.push({ x: doorR, y: p.y + p.h - t, w: p.x + p.w - doorR, h: t });
  return out;
}

export function poiColliders(): Rect[] {
  const out = POIS.filter((p) => !NON_SOLID_POIS.has(p.id)).map((p) => ({
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
  }));

  const apartment = POIS.find((p) => p.id === "apartment");
  if (apartment) out.push(...shellWithSouthDoor(apartment, 6 * TILE, TILE * 1.3));

  const store = POIS.find((p) => p.id === "store");
  if (store) {
    const center = store.x + store.w / 2;
    out.push(...shellWithSouthDoor(store, center, TILE * 1.7));
  }

  for (const id of ["foodtruck", "velis", "brothers"] as const) {
    const p = POIS.find((x) => x.id === id);
    if (!p) continue;
    const padX = 10;
    out.push({
      x: p.x + padX,
      y: p.y + p.h * 0.32,
      w: p.w - padX * 2,
      h: p.h * 0.62,
    });
  }
  return out;
}

export function circleHitsRect(x: number, y: number, r: number, q: Rect) {
  const nx = Math.max(q.x, Math.min(x, q.x + q.w));
  const ny = Math.max(q.y, Math.min(y, q.y + q.h));
  return (x - nx) ** 2 + (y - ny) ** 2 < r ** 2;
}

export function isRoadPoint(x: number, y: number) {
  if (inRiverPx(x, y) || inCourtPx(x, y)) return false;
  return roadRects().some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

export function nearestLane(x: number, y: number, preferredAxis?: LaneAxis) {
  const lanes = trafficLanes();
  let best = lanes[0]!;
  let bestD = Infinity;
  for (const lane of lanes) {
    if (preferredAxis && lane.axis !== preferredAxis) continue;
    const d = lane.axis === "x" ? Math.abs(y - lane.fixed) : Math.abs(x - lane.fixed);
    if (d < bestD) {
      bestD = d;
      best = lane;
    }
  }
  return best;
}

export function laneVelocity(lane: Lane, speedScale = 1) {
  const v = lane.speed * lane.dir * speedScale;
  return lane.axis === "x" ? { vx: v, vy: 0 } : { vx: 0, vy: v };
}

export function intersections(): { ix: number; iy: number }[] {
  const xs = STREETS.filter((s) => s.axis === "x").map((s) => s.tile * TILE);
  const ys = STREETS.filter((s) => s.axis === "y").map((s) => s.tile * TILE);
  const out: { ix: number; iy: number }[] = [];
  for (const ix of xs) {
    for (const iy of ys) {
      if (inCourtPx(ix, iy) || inRiverPx(ix, iy)) continue;
      out.push({ ix, iy });
    }
  }
  return out;
}

export type SignalState = "red" | "yellow" | "green";

const SIGNAL_CYCLE = 13.4;
const GREEN_HOLD = 5.2;
const YELLOW_HOLD = 0.8;
const ALL_RED = 0.7;

export function signalOffset(ix: number, iy: number) {
  return (((ix / TILE) * 0.37 + (iy / TILE) * 0.19) % SIGNAL_CYCLE + SIGNAL_CYCLE) % SIGNAL_CYCLE;
}

/** Shared light phasing so engine cars and 3D heads stay in lockstep. */
export function signalState(clock: number, axis: LaneAxis, ix: number, iy: number): SignalState {
  const p = (clock + signalOffset(ix, iy)) % SIGNAL_CYCLE;
  if (axis === "x") {
    if (p < GREEN_HOLD) return "green";
    if (p < GREEN_HOLD + YELLOW_HOLD) return "yellow";
    return "red";
  }
  const yStart = GREEN_HOLD + YELLOW_HOLD + ALL_RED;
  if (p < yStart) return "red";
  if (p < yStart + GREEN_HOLD) return "green";
  if (p < yStart + GREEN_HOLD + YELLOW_HOLD) return "yellow";
  return "red";
}

/** Distance from the intersection center back to the painted stop line. */
export const STOP_LINE = TILE * 0.92;

export function approachingCross(lane: Lane, along: number) {
  const crosses = STREETS.filter((s) => (lane.axis === "x" ? s.axis === "x" : s.axis === "y")).map((s) => s.tile * TILE);
  let best: number | null = null;
  let bestDelta = Infinity;
  for (const center of crosses) {
    const delta = (center - along) * lane.dir;
    if (delta < -14 || delta > 110) continue;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = center;
    }
  }
  if (best === null) return null;
  const ix = lane.axis === "x" ? best : nearestFixed(lane.fixed, "x");
  const iy = lane.axis === "x" ? nearestFixed(lane.fixed, "y") : best;
  return { center: best, delta: bestDelta, ix, iy };
}

function nearestFixed(value: number, streetAxis: "x" | "y") {
  const values = STREETS.filter((s) => s.axis === streetAxis).map((s) => s.tile * TILE);
  let best = values[0] ?? value;
  let bestD = Math.abs(value - best);
  for (const v of values) {
    const d = Math.abs(value - v);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function destinationLane(from: Lane, center: number, turn: "left" | "right", lanes = clippedTrafficLanes()) {
  const axis: LaneAxis = from.axis === "x" ? "y" : "x";
  const desiredDir: 1 | -1 =
    from.axis === "x"
      ? turn === "left"
        ? ((-from.dir) as 1 | -1)
        : from.dir
      : turn === "left"
        ? from.dir
        : ((-from.dir) as 1 | -1);
  const candidates = lanes.filter(
    (lane) => lane.axis === axis && lane.dir === desiredDir && Math.abs(lane.fixed - center) < TILE * 0.62,
  );
  return candidates.sort((a, b) => Math.abs(a.fixed - center) - Math.abs(b.fixed - center))[0] ?? null;
}

export function aheadDistance(
  a: { x: number; y: number; vx: number; vy: number },
  b: { x: number; y: number },
) {
  const speed = Math.hypot(a.vx, a.vy);
  if (speed < 0.001) return Infinity;
  const fx = a.vx / speed;
  const fy = a.vy / speed;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const along = dx * fx + dy * fy;
  if (along <= 0) return Infinity;
  const lateral = Math.abs(dx * -fy + dy * fx);
  return lateral < TILE * 0.38 ? along : Infinity;
}
