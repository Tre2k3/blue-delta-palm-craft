/* eslint-disable @typescript-eslint/no-explicit-any */
import { POIS } from "./data";

const S = 1 / 16;

type RuntimeErrorRecord = {
  scope: string;
  message: string;
  stack?: string;
  at: number;
};

declare global {
  interface Window {
    __SACK_RUNTIME_ERRORS__?: RuntimeErrorRecord[];
  }
}

function record(scope: string, error: unknown) {
  const e = error instanceof Error ? error : new Error(String(error));
  const item: RuntimeErrorRecord = {
    scope,
    message: e.message,
    stack: e.stack,
    at: Date.now(),
  };
  window.__SACK_RUNTIME_ERRORS__ ??= [];
  window.__SACK_RUNTIME_ERRORS__.push(item);
  if (window.__SACK_RUNTIME_ERRORS__.length > 20) window.__SACK_RUNTIME_ERRORS__.shift();
  console.error(`[SackReligious runtime:${scope}]`, e);
}

function installEngineWatchdog(GameEngine: any) {
  const proto = GameEngine?.prototype;
  if (!proto || proto.__sackWatchdogInstalled) return;
  proto.__sackWatchdogInstalled = true;

  const originalStart = proto.start;
  proto.start = function startWithSafeSpawn(fresh = false) {
    originalStart.call(this, fresh);

    // The legacy spawn sits on the apartment wall. Move Benji just outside the
    // doorway so the opening camera cannot begin inside solid geometry.
    const step = this.mission?.steps?.[this.mission?.activeStep];
    if (step?.id === "wake") {
      const apt = POIS.find((p) => p.id === "apartment");
      if (apt) {
        this.px = apt.x + apt.w / 2;
        this.py = apt.y + apt.h + 38;
        this.vx = 0;
        this.vy = 0;
        this.leftSpawn = false;
      }
    }

    // The chapter card should feel like a title beat, never like a lock screen.
    if (this.cinematic?.kind === "briefing") this.cinematic.duration = Math.min(this.cinematic.duration ?? 3.4, 1.85);

    window.setTimeout(() => {
      if (!this.started || this.cinematic?.kind !== "briefing") return;
      this.cinematic = null;
      this.letterbox = 0;
      this.showToast?.("Drop Day is live. Find K Blanco at HQ.", 2.4);
      this.emitHud?.();
    }, 2800);

    this.updateProximity?.();
    this.emitHud?.();
  };

  // The old loop stopped forever when a single rendering/runtime enhancement
  // threw once. This loop always schedules the next frame and isolates update
  // and draw failures, so a cosmetic subsystem cannot soft-lock the mission.
  proto.startLoop = function resilientStartLoop() {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    let updateErrors = 0;
    let drawErrors = 0;

    const frame = (t: number) => {
      if (!this.running) return;
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
      dt = Math.min(Math.max(dt, 0), 0.1);

      try {
        this.update(dt);
        updateErrors = 0;
      } catch (error) {
        updateErrors += 1;
        if (updateErrors <= 4) record("update", error);
        // Never let the chapter card remain permanently active after an error.
        if (this.cinematic?.kind === "briefing") {
          this.cinematic.t = Math.max(this.cinematic.t ?? 0, this.cinematic.duration ?? 0);
          this.cinematic = null;
          this.letterbox = 0;
          this.emitHud?.();
        }
      }

      try {
        this.draw();
        drawErrors = 0;
      } catch (error) {
        drawErrors += 1;
        if (drawErrors <= 4) record("draw", error);
      }

      this.hudAcc += dt;
      if (this.hudAcc > 0.08) {
        this.hudAcc = 0;
        this.emitHud?.();
      }

      if (this.running) this.raf = requestAnimationFrame(frame);
    };

    this.raf = requestAnimationFrame(frame);
  };
}

function installWorldWatchdog(World3D: any) {
  const proto = World3D?.prototype;
  if (!proto || proto.__sackWorldWatchdogInstalled) return;
  proto.__sackWorldWatchdogInstalled = true;

  const originalSync = proto.sync;
  proto.sync = function safeSync(frame: any) {
    try {
      return originalSync.call(this, frame);
    } catch (error) {
      record("world3d.sync", error);

      // Last-resort visible state. Keep Benji and the camera usable instead of
      // returning a black frame while the problematic visual is diagnosed.
      const x = (frame?.px ?? 0) * S;
      const z = (frame?.py ?? 0) * S;
      try {
        this.player?.position?.set(x, 0, z);
        if (this.sprite) this.sprite.visible = frame?.cameraView !== "first";

        const yaw = Number(frame?.yaw ?? 0);
        const fwdX = -Math.sin(yaw);
        const fwdZ = -Math.cos(yaw);
        this.camera?.position?.set(x - fwdX * 4.8, 2.45, z - fwdZ * 4.8);
        this.camera?.lookAt?.(x, 1.2, z);
        if (this.camera) {
          this.camera.fov = 62;
          this.camera.updateProjectionMatrix?.();
        }
        this.sun?.target?.position?.set(x, 0, z);
      } catch (fallbackError) {
        record("world3d.fallback", fallbackError);
      }
      return undefined;
    }
  };
}

Promise.all([import("./engine"), import("./world3d")])
  .then(([{ GameEngine }, { World3D }]) => {
    installEngineWatchdog(GameEngine);
    installWorldWatchdog(World3D);
  })
  .catch((error) => record("watchdog-install", error));
