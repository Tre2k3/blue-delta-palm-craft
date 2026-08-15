// @ts-nocheck
/**
 * Input Facing V8
 *
 * Camera-relative world movement is useful for navigation, but the illustrated
 * Benji sprites must follow the player's literal directional input:
 * A=LEFT, D=RIGHT, W=BACK, S=FRONT. This layer records InputManager.poll()
 * and reapplies that visual-facing contract after the complete engine update,
 * so no older movement calculation can cross-wire left/right afterward.
 */

function facingFrom(actions, fallback) {
  const mx = Number(actions?.mx) || 0;
  const my = Number(actions?.my) || 0;
  const ax = Math.abs(mx), ay = Math.abs(my);
  if (ax <= 0.05 && ay <= 0.05) return fallback;
  if (ax > ay) return mx < 0 ? "left" : "right";
  return my < 0 ? "up" : "down";
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
  if (gp && !gp.__v8FacingFinalInstalled) {
    gp.__v8FacingFinalInstalled = true;
    const oldUpdate = gp.update;
    gp.update = function updateWithFacingV8(dt) {
      const result = oldUpdate.call(this, dt);
      if (this.started && !this.paused && !["shop", "dialogue", "menu"].includes(this.mode)) {
        const act = this.input?.__v8LastActions;
        const next = facingFrom(act, this.facing || "down");
        const mx = Number(act?.mx) || 0;
        const my = Number(act?.my) || 0;
        if (Math.abs(mx) > 0.05 || Math.abs(my) > 0.05) {
          this.facing = next;
          this.dir = next;
        }
        if (typeof window !== "undefined") {
          window.__SACK_INPUT_V8__ = {
            installed: true,
            mx,
            my,
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
