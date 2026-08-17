import { POIS } from "./data";
import { GameEngine } from "./engine";

const STORE = POIS.find((p) => p.id === "store")!;
type PatchedEngine = GameEngine & { __physicalHqPatched?: boolean };

function insideStore(engine: GameEngine) {
  return engine.px >= STORE.x && engine.px <= STORE.x + STORE.w && engine.py >= STORE.y && engine.py <= STORE.y + STORE.h;
}

function placeInsideHQ(engine: GameEngine, xRatio: number, yRatio: number) {
  if (engine.mode === "basketball") engine.exitBasketball();
  if (engine.mode === "shop") engine.closeShop();
  engine.mode = "world";
  engine.dialogue = null;
  engine.dialogueNpcId = null;
  engine.cinematic = null;
  engine.shopOpen = false;
  engine.px = STORE.x + STORE.w * xRatio;
  engine.py = STORE.y + STORE.h * yRatio;
  engine.vx = 0;
  engine.vy = 0;
  engine.leftSpawn = true;
  engine.updateProximity();
  engine.emitHud();
}

const proto = GameEngine.prototype as PatchedEngine;
if (!proto.__physicalHqPatched) {
  proto.__physicalHqPatched = true;

  const originalInteract = GameEngine.prototype.tryInteract;
  GameEngine.prototype.tryInteract = function physicalHqInteract(this: GameEngine) {
    if (this.nearPoi === "store" && !this.nearNpc) {
      if (!insideStore(this)) {
        this.showToast("Walk through the $ackReligious HQ doors.", 2.1);
        return;
      }
      const step = this.mission.steps[this.mission.activeStep];
      if (step && !step.done && step.target === "store" && (step.kind === "talk" || step.kind === "return")) {
        this.showToast("Find K Blanco inside HQ.", 1.9);
        return;
      }
    }
    originalInteract.call(this);
  };

  const originalWireQa = GameEngine.prototype.wireQa;
  GameEngine.prototype.wireQa = function physicalHqQa(this: GameEngine) {
    originalWireQa.call(this);
    if (typeof window === "undefined") return;
    const w = window as typeof window & {
      __gameTest?: Record<string, unknown> & {
        enterHQ?: () => void;
        enterHQShop?: () => void;
      };
    };
    if (!w.__gameTest) return;
    w.__gameTest.enterHQ = () => placeInsideHQ(this, 0.50, 0.70);
    w.__gameTest.enterHQShop = () => placeInsideHQ(this, 0.84, 0.72);
  };
}
