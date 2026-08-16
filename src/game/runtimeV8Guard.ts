// @ts-nocheck
import "./runtimeWardrobeV8";
import "./runtimeVisualPolishV8";
import "./runtimeResponsiveCharactersV8";
/**
 * V8 guard/diagnostics.
 * Does not own gameplay. It only exposes the live engine for automated QA and
 * makes failures observable instead of silently leaving the game stuck.
 */

function install(GameEngine) {
  const p = GameEngine?.prototype;
  if (!p || p.__v8GuardInstalled) return;
  p.__v8GuardInstalled = true;

  const oldDraw = p.draw;
  p.draw = function v8GuardDraw(...args) {
    if (typeof window !== "undefined") {
      window.__SACK_V8_ENGINE__ = this;
      window.__SACK_V8_GUARD__ = {
        installed: true,
        mode: this.mode,
        interior: this.__v8Interior ?? null,
        facing: this.facing,
        started: this.started,
        playerVisible: !!this.world3d?.sprite?.visible,
        player: { x: this.px, y: this.py },
        basketball: {
          score: this.ball?.score ?? 0,
          shots: this.ball?.shots ?? 0,
          held: !!this.ball?.held,
          inFlight: !!this.ball?.inFlight,
          charging: !!this.ball?.charging,
          power: this.ball?.power ?? 0,
        },
      };
    }
    return oldDraw.apply(this, args);
  };
}

setTimeout(async () => {
  try {
    const { GameEngine } = await import("./engine");
    install(GameEngine);
    if (typeof window !== "undefined") {
      window.__SACK_V8_GUARD_BOOT__ = { installed: true };
    }
  } catch (err) {
    console.error("V8 guard failed", err);
    if (typeof window !== "undefined") {
      window.__SACK_V8_GUARD_BOOT__ = { installed: false, error: String(err) };
    }
  }
}, 350);
