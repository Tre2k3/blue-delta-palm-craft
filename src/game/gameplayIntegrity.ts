import { POIS } from "./data";
import { GameEngine } from "./engine";

const STORE = POIS.find((p) => p.id === "store")!;
type PatchedEngine = GameEngine & { __physicalHqPatched?: boolean };

function insideStore(engine: GameEngine) {
  return engine.px >= STORE.x && engine.px <= STORE.x + STORE.w && engine.py >= STORE.y && engine.py <= STORE.y + STORE.h;
}

const proto = GameEngine.prototype as PatchedEngine;
if (!proto.__physicalHqPatched) {
  proto.__physicalHqPatched = true;

  const originalInteract = GameEngine.prototype.tryInteract;
  GameEngine.prototype.tryInteract = function physicalHqInteract(this: GameEngine) {
    // The HQ is now a real walk-in building. Being close to its exterior is no
    // longer enough to talk to K Blanco or magically open the clothing wall.
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

  // Keep mission QA honest. The old test helper teleported to the sidewalk
  // outside a POI and then interacted through the wall. This helper places the
  // test player inside the physical HQ, near K Blanco, exactly where a real
  // player must walk before the mission conversation can trigger.
  const originalWireQa = GameEngine.prototype.wireQa;
  GameEngine.prototype.wireQa = function physicalHqQa(this: GameEngine) {
    originalWireQa.call(this);
    if (typeof window === "undefined") return;
    const w = window as typeof window & {
      __gameTest?: Record<string, unknown> & { enterHQ?: () => void };
    };
    if (!w.__gameTest) return;
    w.__gameTest.enterHQ = () => {
      if (this.mode === "basketball") this.exitBasketball();
      if (this.mode === "shop") this.closeShop();
      this.mode = "world";
      this.dialogue = null;
      this.dialogueNpcId = null;
      this.cinematic = null;
      this.shopOpen = false;
      this.px = STORE.x + STORE.w * 0.50;
      this.py = STORE.y + STORE.h * 0.70;
      this.vx = 0;
      this.vy = 0;
      this.leftSpawn = true;
      this.updateProximity();
      this.emitHud();
    };
  };
}
