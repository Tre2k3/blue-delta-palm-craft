import { POIS, STREETS, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";

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

export function roadRects(): Rect[] {
  return STREETS.map((s) =>
    s.axis === "y"
      ? { x: 0, y: s.tile * TILE - ROAD_HALF, w: WORLD_PX_W, h: ROAD_HALF * 2 }
      : { x: s.tile * TILE - ROAD_HALF, y: 0, w: ROAD_HALF * 2, h: WORLD_PX_H },
  );
}

export function sidewalkRects(): Rect[] {
  const out: Rect[] = [];
  for (const s of STREETS) {
    if (s.axis === "y") {
      const cy = s.tile * TILE;
      out.push({ x: 0, y: cy - ROAD_HALF - SIDEWALK, w: WORLD_PX_W, h: SIDEWALK });
      out.push({ x: 0, y: cy + ROAD_HALF, w: WORLD_PX_W, h: SIDEWALK });
    } else {
      const cx = s.tile * TILE;
      out.push({ x: cx - ROAD_HALF - SIDEWALK, y: 0, w: SIDEWALK, h: WORLD_PX_H });
      out.push({ x: cx + ROAD_HALF, y: 0, w: SIDEWALK, h: WORLD_PX_H });
    }
  }
  return out;
}

export function trafficLanes(): Lane[] {
  const lanes: Lane[] = [];
  for (const s of STREETS) {
    const c = s.tile * TILE;
    if (s.axis === "y") {
      lanes.push({ id: `${s.name}:east`, axis: "x", fixed: c - LANE_OFFSET, min: 0, max: WORLD_PX_W, dir: 1, speed: 86 });
      lanes.push({ id: `${s.name}:west`, axis: "x", fixed: c + LANE_OFFSET, min: 0, max: WORLD_PX_W, dir: -1, speed: 80 });
    } else {
      lanes.push({ id: `${s.name}:south`, axis: "y", fixed: c - LANE_OFFSET, min: 0, max: WORLD_PX_H, dir: 1, speed: 82 });
      lanes.push({ id: `${s.name}:north`, axis: "y", fixed: c + LANE_OFFSET, min: 0, max: WORLD_PX_H, dir: -1, speed: 78 });
    }
  }
  return lanes;
}

const NON_SOLID_POIS = new Set(["court", "river", "dropvan", "beale"]);

export function poiColliders(): Rect[] {
  return POIS.filter((p) => !NON_SOLID_POIS.has(p.id)).map((p) => ({
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
  }));
}

export function circleHitsRect(x: number, y: number, r: number, q: Rect) {
  const nx = Math.max(q.x, Math.min(x, q.x + q.w));
  const ny = Math.max(q.y, Math.min(y, q.y + q.h));
  return (x - nx) ** 2 + (y - ny) ** 2 < r ** 2;
}

export function isRoadPoint(x: number, y: number) {
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

export function headingFromVelocity(vx: number, vy: number) {
  return Math.atan2(vx, vy);
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
  return lateral < TILE * 0.72 ? along : Infinity;
}
