/* eslint-disable @typescript-eslint/no-explicit-any */
import { NPCS, WORLD_PX_H, WORLD_PX_W } from "./data";
import {
  aheadDistance,
  circleHitsRect,
  laneVelocity,
  nearestLane,
  poiColliders,
  type Lane,
} from "./worldTopology";

type Car = { x: number; y: number; vx: number; vy: number; w: number; color: string };
type Ped = { x: number; y: number; vx: number; vy: number; color: string; t: number };

const carState = new WeakMap<object, { lane: Lane; speed: number }>();
let installPromise: Promise<void> | null = null;

function installPrototypeFixes(GameEngine: any) {
  if (!GameEngine || GameEngine.prototype.__worldSafetyInstalled) return;
  const proto = GameEngine.prototype;
  proto.__worldSafetyInstalled = true;

  proto.collides = function collides(x: number, y: number, r: number) {
    if (x - r < 28 || y - r < 28 || x + r > WORLD_PX_W - 28 || y + r > WORLD_PX_H - 28) return true;
    for (const wall of this.walls ?? []) {
      if (circleHitsRect(x, y, r, wall)) return true;
    }
    for (const box of poiColliders()) {
      if (circleHitsRect(x, y, r, box)) return true;
    }
    return false;
  };

  proto.updateTraffic = function updateTraffic(dt: number) {
    const cars: Car[] = this.cars ?? [];
    const peds: Ped[] = this.peds ?? [];
    const player = { x: this.px, y: this.py };

    for (let i = 0; i < cars.length; i++) {
      const c = cars[i]!;
      let state = carState.get(c);
      if (!state) {
        const axis = Math.abs(c.vx) >= Math.abs(c.vy) ? "x" : "y";
        const lane = nearestLane(c.x, c.y, axis);
        state = { lane, speed: Math.max(42, Math.hypot(c.vx, c.vy) || lane.speed) };
        carState.set(c, state);
      }

      const lane = state.lane;
      if (lane.axis === "x") c.y += (lane.fixed - c.y) * Math.min(1, dt * 8);
      else c.x += (lane.fixed - c.x) * Math.min(1, dt * 8);

      let nearest = aheadDistance(c, player);
      for (let j = 0; j < cars.length; j++) {
        if (i === j) continue;
        nearest = Math.min(nearest, aheadDistance(c, cars[j]!));
      }
      for (const p of peds) nearest = Math.min(nearest, aheadDistance(c, p));

      const stopDistance = 44;
      const slowDistance = 150;
      let desired = lane.speed;
      if (nearest < stopDistance) desired = 0;
      else if (nearest < slowDistance) desired = lane.speed * ((nearest - stopDistance) / (slowDistance - stopDistance));

      state.speed += (desired - state.speed) * Math.min(1, dt * (desired < state.speed ? 7 : 2.2));
      const vv = laneVelocity(lane, state.speed / Math.max(1, lane.speed));
      c.vx = vv.vx;
      c.vy = vv.vy;
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      if (lane.axis === "x") {
        if (lane.dir > 0 && c.x > lane.max + 64) c.x = lane.min - 64;
        if (lane.dir < 0 && c.x < lane.min - 64) c.x = lane.max + 64;
      } else {
        if (lane.dir > 0 && c.y > lane.max + 64) c.y = lane.min - 64;
        if (lane.dir < 0 && c.y < lane.min - 64) c.y = lane.max + 64;
      }
    }
  };

  proto.updatePeds = function updatePeds(dt: number) {
    const peds: Ped[] = this.peds ?? [];
    for (const p of peds) {
      p.t += dt;
      const ox = p.x;
      const oy = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const hitBuilding = poiColliders().some((box) => circleHitsRect(p.x, p.y, 10, box));
      if (hitBuilding || p.x < 48 || p.x > WORLD_PX_W - 48) {
        p.x = ox;
        p.vx *= -1;
      }
      if (hitBuilding || p.y < 48 || p.y > WORLD_PX_H - 48) {
        p.y = oy;
        p.vy *= -1;
      }

      const dx = p.x - this.px;
      const dy = p.y - this.py;
      const d = Math.hypot(dx, dy);
      if (d > 0.001 && d < 34) {
        p.x += (dx / d) * (34 - d) * 0.16;
        p.y += (dy / d) * (34 - d) * 0.16;
      }
    }

    for (const n of this.npcLive ?? []) {
      const def = NPCS.find((x) => x.id === n.id);
      if (!def?.wander) continue;
      n.t += dt;
      n.x = n.ox + Math.sin(n.t * 0.35) * 28;
      n.y = n.oy + Math.cos(n.t * 0.28) * 18;
    }
  };
}

export function ensureWorldRuntimeFixes() {
  if (installPromise) return installPromise;
  installPromise = import("./engine")
    .then(({ GameEngine }) => installPrototypeFixes(GameEngine))
    .catch((err) => console.error("Unable to install world runtime fixes", err));
  return installPromise;
}

void ensureWorldRuntimeFixes();
