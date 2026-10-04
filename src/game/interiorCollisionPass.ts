import { POIS } from "./data";
import { GAME_PIXELS_PER_UNIT } from "./worldScale";
import { GameEngine } from "./engine";
import { circleHitsRect, type Rect } from "./worldTopology";

const APARTMENT = POIS.find((p) => p.id === "apartment")!;
const STORE = POIS.find((p) => p.id === "store")!;
const LANES = POIS.find((p) => p.id === "lanes")!;
type PatchedEngine = GameEngine & {
  __interiorCollisionPatched?: boolean;
  __interiorCollisionOriginal?: GameEngine["collides"];
  __interiorWireOriginal?: GameEngine["wireQa"];
};

function gameRect(cx: number, cy: number, w: number, h: number): Rect {
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

const apartmentCx = APARTMENT.x + APARTMENT.w / 2;
const apartmentCy = APARTMENT.y + APARTMENT.h / 2;
const hqCx = STORE.x + STORE.w / 2;
const hqCy = STORE.y + STORE.h / 2;
const lanesCx = LANES.x + LANES.w / 2;
const lanesCy = LANES.y + LANES.h / 2;

// Visual furniture in world3d.ts is authored in Three.js world units where
// one unit = 16 gameplay pixels. Mirror only meaningful footprints here. The
// dresser was moved to the far east side of the room because its old west-side
// placement physically overlapped Benji's doorway approach and trapped New Game.
const APARTMENT_FURNITURE: Rect[] = [
  gameRect(apartmentCx - 2.55 * GAME_PIXELS_PER_UNIT, apartmentCy - 2.55 * GAME_PIXELS_PER_UNIT, 3.55 * GAME_PIXELS_PER_UNIT, 2.25 * GAME_PIXELS_PER_UNIT), // bed
  gameRect(apartmentCx - 4.25 * GAME_PIXELS_PER_UNIT, apartmentCy - 2.70 * GAME_PIXELS_PER_UNIT, 0.95 * GAME_PIXELS_PER_UNIT, 0.85 * GAME_PIXELS_PER_UNIT), // nightstand
  gameRect(apartmentCx + 2.05 * GAME_PIXELS_PER_UNIT, apartmentCy - 0.15 * GAME_PIXELS_PER_UNIT, 3.05 * GAME_PIXELS_PER_UNIT, 1.18 * GAME_PIXELS_PER_UNIT), // couch
  gameRect(apartmentCx + 1.30 * GAME_PIXELS_PER_UNIT, apartmentCy + 1.35 * GAME_PIXELS_PER_UNIT, 1.80 * GAME_PIXELS_PER_UNIT, 1.02 * GAME_PIXELS_PER_UNIT), // coffee table
  gameRect(apartmentCx + 4.35 * GAME_PIXELS_PER_UNIT, apartmentCy + 2.45 * GAME_PIXELS_PER_UNIT, 1.95 * GAME_PIXELS_PER_UNIT, 0.72 * GAME_PIXELS_PER_UNIT), // dresser
];

const HQ_FURNITURE: Rect[] = [
  loc(0, -5.25, 4.7, 1.15), // checkout counter at the back
  loc(-8.15, 2.4, 0.75, 2.0), // west rack south
  loc(-8.15, -1.6, 0.75, 2.0), // west rack north
  loc(8.15, 2.4, 0.75, 2.0), // east rack south
  loc(8.15, -1.6, 0.75, 2.0), // east rack north
  loc(-3.55, 1.55, 1.75, 1.15), // left front table
  loc(3.55, 1.55, 1.75, 1.15), // right front table
  loc(-3.45, -1.85, 1.75, 1.15), // left rear table
  loc(3.45, -1.85, 1.75, 1.15), // right rear table
  loc(-7.5, 5.8, 1.25, 0.85), // entry vitrine
];

function locL(lx: number, lz: number, w: number, d: number): Rect {
  return gameRect(lanesCx + lx * GAME_PIXELS_PER_UNIT, lanesCy + lz * GAME_PIXELS_PER_UNIT, w * GAME_PIXELS_PER_UNIT, d * GAME_PIXELS_PER_UNIT);
}

const LANES_FURNITURE: Rect[] = [
  locL(6.55, 4.55, 2.35, 1.15), // shoe / snack counter
  locL(-5.35, 6.35, 4.4, 0.72), // west bench
  locL(5.35, 6.35, 4.4, 0.72), // east bench
  locL(-6.2, -5.15, 1.55, 1.7), // pin deck 0
  locL(-2.08, -5.15, 1.55, 1.7),
  locL(2.08, -5.15, 1.55, 1.7),
  locL(6.2, -5.15, 1.55, 1.7),
  locL(-4.14, 1.4, 0.55, 1.1), // ball returns
  locL(0, 1.4, 0.55, 1.1),
  locL(4.14, 1.4, 0.55, 1.1),
];

function loc(lx: number, lz: number, w: number, d: number): Rect {
  return gameRect(hqCx + lx * GAME_PIXELS_PER_UNIT, hqCy + lz * GAME_PIXELS_PER_UNIT, w * GAME_PIXELS_PER_UNIT, d * GAME_PIXELS_PER_UNIT);
}

function inside(p: { x: number; y: number; w: number; h: number }, x: number, y: number, pad = 12) {
  return x >= p.x - pad && x <= p.x + p.w + pad && y >= p.y - pad && y <= p.y + p.h + pad;
}

export function installInteriorCollisionPass() {
  const proto = GameEngine.prototype as PatchedEngine;
  const originalCollides = proto.__interiorCollisionOriginal ?? GameEngine.prototype.collides;
  proto.__interiorCollisionOriginal = originalCollides;
  GameEngine.prototype.collides = function furnitureAwareCollision(this: GameEngine, x: number, y: number, r: number) {
    if (originalCollides.call(this, x, y, r)) return true;
    if (this.mover.air >= 0.62) return false;
    const furniture = inside(APARTMENT, x, y)
      ? APARTMENT_FURNITURE
      : inside(STORE, x, y)
        ? HQ_FURNITURE
        : inside(LANES, x, y)
          ? LANES_FURNITURE
          : null;
    if (!furniture) return false;
    return furniture.some((rect) => circleHitsRect(x, y, r, rect));
  };

  const originalWireQa = proto.__interiorWireOriginal ?? GameEngine.prototype.wireQa;
  proto.__interiorWireOriginal = originalWireQa;
  GameEngine.prototype.wireQa = function furnitureCollisionQa(this: GameEngine) {
    originalWireQa.call(this);
    if (typeof window === "undefined") return;
    const w = window as typeof window & {
      __gameTest?: Record<string, unknown> & { furnitureCollisionProbe?: () => Record<string, boolean> };
    };
    if (!w.__gameTest) return;
    const bed = APARTMENT_FURNITURE[0]!;
    const counter = HQ_FURNITURE[0]!;
    w.__gameTest.furnitureCollisionProbe = () => ({
      bed: this.collides(bed.x + bed.w / 2, bed.y + bed.h / 2, 12),
      hqCounter: this.collides(counter.x + counter.w / 2, counter.y + counter.h / 2, 12),
      apartmentSpawn: this.collides(6 * 48, APARTMENT.y + APARTMENT.h - 72, 14),
      apartmentDoorLane: this.collides(6 * 48, APARTMENT.y + APARTMENT.h - 48, 12),
      apartmentThreshold: this.collides(6 * 48, APARTMENT.y + APARTMENT.h - 16, 12),
      hqDoorLane: this.collides(STORE.x + STORE.w / 2, STORE.y + STORE.h - 48, 12),
    });
  };
}
