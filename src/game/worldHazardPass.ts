import { POIS } from "./data";
import { GameEngine } from "./engine";
import { circleHitsRect, type Rect } from "./worldTopology";

const RIVER = POIS.find((p) => p.id === "river")!;
type PatchedEngine = GameEngine & { __worldHazardsPatched?: boolean };

const WATER_COLLIDER: Rect = {
  x: RIVER.x + 4,
  y: RIVER.y + 8,
  w: RIVER.w - 8,
  h: RIVER.h - 8,
};

export function installWorldHazardPass() {
  const proto = GameEngine.prototype as PatchedEngine;
  if (proto.__worldHazardsPatched) return;
  proto.__worldHazardsPatched = true;

  const originalCollides = GameEngine.prototype.collides;
  GameEngine.prototype.collides = function worldHazardCollision(this: GameEngine, x: number, y: number, r: number) {
    if (originalCollides.call(this, x, y, r)) return true;
    // The riverfront is explorable; the water itself is not a walking surface.
    // Keep the boardwalk clear and stop Benji at the railing/waterline.
    return circleHitsRect(x, y, r, WATER_COLLIDER);
  };

  const originalWireQa = GameEngine.prototype.wireQa;
  GameEngine.prototype.wireQa = function worldHazardQa(this: GameEngine) {
    originalWireQa.call(this);
    if (typeof window === "undefined") return;
    const w = window as typeof window & {
      __gameTest?: Record<string, unknown> & { environmentCollisionProbe?: () => Record<string, boolean> };
    };
    if (!w.__gameTest) return;
    w.__gameTest.environmentCollisionProbe = () => ({
      riverWater: this.collides(RIVER.x + RIVER.w / 2, RIVER.y + RIVER.h / 2, 12),
      riverBoardwalk: this.collides(RIVER.x + RIVER.w / 2, RIVER.y - 18, 12),
    });
  };
}
