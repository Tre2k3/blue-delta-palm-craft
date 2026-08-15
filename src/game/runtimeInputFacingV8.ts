// @ts-nocheck
/**
 * Input Facing V8
 *
 * Illustrated character facing is input-relative, never camera-relative:
 *   A / left  -> LEFT
 *   D / right -> RIGHT
 *   W / up    -> BACK (away from viewer)
 *   S / down  -> FRONT (toward viewer)
 *
 * The authoritative correction now happens directly after updatePlayer(),
 * where raw mx/my are guaranteed to be the exact movement input. A second
 * end-of-update guard handles unusual modes and keyboard/gamepad/touch timing.
 */

function facingFromVector(mx, my, fallback) {
  mx = Number(mx) || 0;
  my = Number(my) || 0;
  const ax = Math.abs(mx), ay = Math.abs(my);
  if (ax <= 0.05 && ay <= 0.05) return fallback;
  if (ax > ay) return mx < 0 ? "left" : "right";
  return my < 0 ? "up" : "down";
}

function facingFromPhysicalKeys(input, fallback) {
  const keys = input?.keys;
  if (!keys) return null;
  const left = keys.has("KeyA") || keys.has("ArrowLeft");
  const right = keys.has("KeyD") || keys.has("ArrowRight");
  const up = keys.has("KeyW") || keys.has("ArrowUp");
  const down = keys.has("KeyS") || keys.has("ArrowDown");
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  if (!x && !y) return null;
  return facingFromVector(x, y, fallback);
}

async function install() {
  const [{ InputManager }, { GameEngine }] = await Promise.all([
    import("./input"),
    import("./engine"),
  ]);

  const ip = InputManager?.prototype;
  if (ip && !ip.__v8FacingPollInstalled) {
    ip.__v8FacingPollInstalled = true;
    const oldPoll = ip.poll;
    ip.poll = function pollWithFacingV8(...args) {
      const act = oldPoll.apply(this, args);
      this.__v8LastActions = act;
      return act;
    };
  }

  const gp = GameEngine?.prototype;
  if (!gp) return;

  if (!gp.__v8FacingPlayerInstalled) {
    gp.__v8FacingPlayerInstalled = true;
    const oldUpdatePlayer = gp.updatePlayer;
    gp.updatePlayer = function updatePlayerFacingV8(dt, mx, my, runHeld) {
      const result = oldUpdatePlayer.call(this, dt, mx, my, runHeld);
      const ax = Math.abs(Number(mx) || 0);
      const ay = Math.abs(Number(my) || 0);
      if (ax > 0.05 || ay > 0.05) {
        const next = facingFromVector(mx, my, this.facing || "down");
        this.facing = next;
        this.dir = next;
      }
      return result;
    };
  }

  if (!gp.__v8FacingFinalInstalled) {
    gp.__v8FacingFinalInstalled = true;
    const oldUpdate = gp.update;
    gp.update = function updateWithFacingV8(dt) {
      const result = oldUpdate.call(this, dt);
      if (this.started && !this.paused && !["shop", "dialogue", "menu"].includes(this.mode)) {
        const act = this.input?.__v8LastActions;
        const keyFacing = facingFromPhysicalKeys(this.input, this.facing || "down");
        const vectorFacing = facingFromVector(act?.mx, act?.my, this.facing || "down");
        const hasVector = Math.abs(Number(act?.mx) || 0) > 0.05 || Math.abs(Number(act?.my) || 0) > 0.05;
        const next = keyFacing ?? (hasVector ? vectorFacing : null);
        if (next) {
          this.facing = next;
          this.dir = next;
        }
        if (typeof window !== "undefined") {
          window.__SACK_INPUT_V8__ = {
            installed: true,
            keyFacing,
            mx: Number(act?.mx) || 0,
            my: Number(act?.my) || 0,
            facing: this.facing,
            mode: this.mode,
          };
        }
      }
      return result;
    };
  }
}

setTimeout(() => {
  install().catch((err) => console.error("Input Facing V8 failed", err));
}, 700);
