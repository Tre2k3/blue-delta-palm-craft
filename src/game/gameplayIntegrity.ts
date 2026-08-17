import { POIS, SAVE_KEY, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";
import { GameEngine } from "./engine";

const APARTMENT = POIS.find((p) => p.id === "apartment")!;
const STORE = POIS.find((p) => p.id === "store")!;
type PatchedEngine = GameEngine & { __physicalHqPatched?: boolean };
type SavedPosition = { x: number; y: number; yaw: number };
type AutoSaveState = { elapsed: number; x: number; y: number };

const loadedPositions = new WeakMap<GameEngine, SavedPosition>();
const autoSaveState = new WeakMap<GameEngine, AutoSaveState>();

function insideStore(engine: GameEngine) {
  return engine.px >= STORE.x && engine.px <= STORE.x + STORE.w && engine.py >= STORE.y && engine.py <= STORE.y + STORE.h;
}

function insideApartmentDoorZone(engine: GameEngine, pad = 8) {
  return engine.px >= APARTMENT.x - pad &&
    engine.px <= APARTMENT.x + APARTMENT.w + pad &&
    engine.py >= APARTMENT.y - pad &&
    engine.py <= APARTMENT.y + APARTMENT.h + pad;
}

function safeWorldPosition(value: unknown): SavedPosition | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<SavedPosition>;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.yaw)) return null;
  const x = Number(p.x);
  const y = Number(p.y);
  const yaw = Number(p.yaw);
  if (x < 62 || y < 62 || x > WORLD_PX_W - 62 || y > WORLD_PX_H - 62) return null;
  return { x, y, yaw };
}

function placePosition(engine: GameEngine, p: SavedPosition) {
  engine.px = p.x;
  engine.py = p.y;
  engine.yaw = p.yaw;
  engine.vx = 0;
  engine.vy = 0;
  engine.mover.reset(engine.mover.heading);
  engine.updateProximity();
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

  const originalLoadSave = GameEngine.prototype.loadSave;
  GameEngine.prototype.loadSave = function loadSaveWithPosition(this: GameEngine) {
    originalLoadSave.call(this);
    if (!this.hasSave) return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const position = safeWorldPosition(parsed?.position);
      if (position) loadedPositions.set(this, position);
    } catch {
      // A malformed optional position must never invalidate the normal save.
    }
  };

  const originalSave = GameEngine.prototype.save;
  GameEngine.prototype.save = function saveWithPosition(this: GameEngine) {
    originalSave.call(this);
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.position = {
        x: Math.round(this.px * 100) / 100,
        y: Math.round(this.py * 100) / 100,
        yaw: Math.round(this.yaw * 10000) / 10000,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
      loadedPositions.set(this, parsed.position);
    } catch {
      // Position persistence is additive; core mission/economy save already ran.
    }
  };

  const originalResetProgress = GameEngine.prototype.resetProgress;
  GameEngine.prototype.resetProgress = function physicalApartmentReset(this: GameEngine, emit = true) {
    originalResetProgress.call(this, false);
    loadedPositions.delete(this);
    autoSaveState.delete(this);
    placeInsideApartment(this);
    if (emit) this.emitHud();
  };

  const originalStart = GameEngine.prototype.start;
  GameEngine.prototype.start = function physicalApartmentStart(this: GameEngine, fresh = false) {
    originalStart.call(this, fresh);
    const resumed = !fresh ? loadedPositions.get(this) : null;
    if (resumed) {
      placePosition(this, resumed);
      this.leftSpawn = true;
      this.showToast("Welcome back to Memphis.", 1.5);
    } else {
      placeInsideApartment(this);
    }
    autoSaveState.set(this, { elapsed: 0, x: this.px, y: this.py });
    this.emitHud();
  };

  // Lightweight autosave prevents a long walk/delivery route from being lost
  // just because the player closed the tab between explicit mission rewards.
  // It only writes in free-roam world mode and only after meaningful movement.
  const originalUpdate = GameEngine.prototype.update;
  GameEngine.prototype.update = function autoSavingUpdate(this: GameEngine, dt: number) {
    originalUpdate.call(this, dt);
    if (!this.started || this.paused || this.mode !== "world" || this.cinematic) return;
    let state = autoSaveState.get(this);
    if (!state) {
      state = { elapsed: 0, x: this.px, y: this.py };
      autoSaveState.set(this, state);
    }
    state.elapsed += Math.min(Math.max(dt, 0), 0.1);
    if (state.elapsed < 12) return;
    state.elapsed = 0;
    if (Math.hypot(this.px - state.x, this.py - state.y) < 24) return;
    state.x = this.px;
    state.y = this.py;
    this.save();
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
