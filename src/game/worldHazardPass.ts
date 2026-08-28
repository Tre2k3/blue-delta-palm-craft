import { POIS } from "./data";
import { GameEngine } from "./engine";
import { inDeepWater, onRiverfront, riverHole } from "./worldTopology";

const RIVER = POIS.find((p) => p.id === "river")!;
type PatchedEngine = GameEngine & { __worldHazardsPatched?: boolean };

export function installWorldHazardPass() {
  const proto = GameEngine.prototype as PatchedEngine;
  if (proto.__worldHazardsPatched) return;
  proto.__worldHazardsPatched = true;

  const originalCollides = GameEngine.prototype.collides;
  GameEngine.prototype.collides = function worldHazardCollision(this: GameEngine, x: number, y: number, r: number) {
    if (originalCollides.call(this, x, y, r)) return true;
    return inDeepWater(x, y, r);
  };

  const originalWireQa = GameEngine.prototype.wireQa;
  GameEngine.prototype.wireQa = function worldHazardQa(this: GameEngine) {
    originalWireQa.call(this);
    if (typeof window === "undefined") return;
    const w = window as typeof window & {
      __gameTest?: Record<string, unknown> & { environmentCollisionProbe?: () => Record<string, boolean> };
    };
    if (!w.__gameTest) return;
    const hole = riverHole();
    w.__gameTest.environmentCollisionProbe = () => ({
      riverWater: this.collides(RIVER.x + RIVER.w / 2, RIVER.y + RIVER.h / 2, 12),
      riverBoardwalk: this.collides(RIVER.x + RIVER.w / 2, RIVER.y - 18, 12),
      riverfront: onRiverfront(RIVER.x + RIVER.w / 2, hole.y - 18),
    });
  };
}
