import { POIS, TILE } from "./data";
import { GameEngine } from "./engine";

const APARTMENT = POIS.find((p) => p.id === "apartment")!;
const STORE = POIS.find((p) => p.id === "store")!;
type PatchedEngine = GameEngine & { __physicalHqPatched?: boolean };

function insideStore(engine: GameEngine) {
  return engine.px >= STORE.x && engine.px <= STORE.x + STORE.w && engine.py >= STORE.y && engine.py <= STORE.y + STORE.h;
}

function insideApartmentDoorZone(engine: GameEngine, pad = 8) {
  return engine.px >= APARTMENT.x - pad &&
    engine.px <= APARTMENT.x + APARTMENT.w + pad &&
    engine.py >= APARTMENT.y - pad &&
    engine.py <= APARTMENT.y + APARTMENT.h + pad;
}

function placeInsideApartment(engine: GameEngine) {
  // The old spawn sat exactly on the apartment's south collider at y=528.
  // Starting on a wall made the opening look like a facade and could trap the
  // controller at frame zero. Put Benji visibly inside, centered on the real
  // doorway approach, so the first playable action is actually walking out.
  engine.px = 6 * TILE;
  engine.py = APARTMENT.y + APARTMENT.h - 72;
  engine.vx = 0;
  engine.vy = 0;
  engine.leftSpawn = false;
  engine.updateProximity();
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

export function installGameplayIntegrity() {
  const proto = GameEngine.prototype as PatchedEngine;
  if (proto.__physicalHqPatched) return;
  proto.__physicalHqPatched = true;

  const originalResetProgress = GameEngine.prototype.resetProgress;
  GameEngine.prototype.resetProgress = function physicalApartmentReset(this: GameEngine, emit = true) {
    originalResetProgress.call(this, false);
    placeInsideApartment(this);
    if (emit) this.emitHud();
  };

  const originalStart = GameEngine.prototype.start;
  GameEngine.prototype.start = function physicalApartmentStart(this: GameEngine, fresh = false) {
    originalStart.call(this, fresh);
    // Position is not persisted in the current save schema, so every session
    // already respawns at home. Make that home spawn a legitimate interior.
    placeInsideApartment(this);
    this.emitHud();
  };

  // The legacy objective waited until Benji was another 50px beyond the
  // apartment footprint. With a real doorway/interior that felt broken: the
  // player had visibly left home but the HUD still said "Leave the apartment".
  const originalCheckMissionAuto = GameEngine.prototype.checkMissionAuto;
  GameEngine.prototype.checkMissionAuto = function physicalApartmentExit(this: GameEngine) {
    const step = this.mission.steps[this.mission.activeStep];
    if (step?.id === "wake" && !step.done && this.leftSpawn && !insideApartmentDoorZone(this)) {
      this.completeStep("wake");
      this.showToast("Memphis is open. Head to $ackReligious HQ.");
    }
    originalCheckMissionAuto.call(this);
  };

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
        collisionProbe?: () => Record<string, unknown>;
      };
    };
    if (!w.__gameTest) return;
    w.__gameTest.enterHQ = () => placeInsideHQ(this, 0.50, 0.70);
    w.__gameTest.enterHQShop = () => placeInsideHQ(this, 0.84, 0.72);
    w.__gameTest.collisionProbe = () => ({
      px: this.px,
      py: this.py,
      south4: this.collides(this.px, this.py + 4, 14),
      south16: this.collides(this.px, this.py + 16, 14),
      east4: this.collides(this.px + 4, this.py, 14),
      started: this.started,
      paused: this.paused,
      cinematic: this.cinematic?.kind ?? null,
      nearPoi: this.nearPoi,
    });
  };
}
