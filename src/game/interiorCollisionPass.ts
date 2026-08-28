import { POIS } from "./data";
import { GameEngine } from "./engine";
import { circleHitsRect, type Rect } from "./worldTopology";

const APARTMENT = POIS.find((p) => p.id === "apartment")!;
const STORE = POIS.find((p) => p.id === "store")!;
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

// Visual furniture in world3d.ts is authored in Three.js world units where
// one unit = 16 gameplay pixels. Mirror only meaningful footprints here. The
// dresser was moved to the far east side of the room because its old west-side
// placement physically overlapped Benji's doorway approach and trapped New Game.
const APARTMENT_FURNITURE: Rect[] = [
  gameRect(apartmentCx - 2.55 * 16, apartmentCy - 2.55 * 16, 3.55 * 16, 2.25 * 16), // bed
  gameRect(apartmentCx - 4.25 * 16, apartmentCy - 2.70 * 16, 0.95 * 16, 0.85 * 16), // nightstand
  gameRect(apartmentCx + 2.05 * 16, apartmentCy - 0.15 * 16, 3.05 * 16, 1.18 * 16), // couch
  gameRect(apartmentCx + 1.30 * 16, apartmentCy + 1.35 * 16, 1.80 * 16, 1.02 * 16), // coffee table
  gameRect(apartmentCx + 4.35 * 16, apartmentCy + 2.45 * 16, 1.95 * 16, 0.72 * 16), // dresser
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

function loc(lx: number, lz: number, w: number, d: number): Rect {
  return gameRect(hqCx + lx * 16, hqCy + lz * 16, w * 16, d * 16);
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
    const furniture = inside(APARTMENT, x, y) ? APARTMENT_FURNITURE : inside(STORE, x, y) ? HQ_FURNITURE : null;
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
