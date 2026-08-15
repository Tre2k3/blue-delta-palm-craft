// @ts-nocheck
/**
 * Basketball Stability V8
 *
 * RuntimeGameV8 owns the visible court and primary ball physics. This layer
 * adds two guarantees expected from an arcade basketball game:
 * - a PERFECT release is a make, not a random miss;
 * - every shot resolves back into a playable possession even if a collision
 *   edge case leaves the ball bouncing forever.
 */

function install(GameEngine) {
  const p = GameEngine?.prototype;
  if (!p || p.__basketballStabilityV8Installed) return;
  p.__basketballStabilityV8Installed = true;

  const oldRelease = p.releaseShot;
  p.releaseShot = function stableReleaseV8(...args) {
    const result = oldRelease.apply(this, args);
    if (this.mode === "basketball" && this.ball?.inFlight) {
      this.ball.__v8FlightElapsed = 0;
      this.ball.__v8PlannedFlight = Math.max(
        0.72,
        Math.min(1.18, 0.72 + (Number(this.ball.shotDist) || 0) / 650),
      );
      // Perfect is always rewarded. GOOD keeps a little arcade variance.
      this.ball.__v8WillMake =
        this.ball.grade === "PERFECT" ||
        (this.ball.grade === "GOOD" && Math.random() < 0.78);
      this.ball.__v8ForcedScore = false;
    }
    return result;
  };

  const oldUpdate = p.updateBasketball;
  p.updateBasketball = function stableBasketballV8(dt, ...args) {
    const wasInFlight = !!this.ball?.inFlight;
    const scoreBefore = Number(this.ball?.score) || 0;
    const result = oldUpdate.call(this, dt, ...args);

    if (this.mode !== "basketball" || !this.ball) return result;

    if (wasInFlight || this.ball.inFlight) {
      this.ball.__v8FlightElapsed =
        (Number(this.ball.__v8FlightElapsed) || 0) + Math.max(0, Number(dt) || 0);
    }

    // If the main physics already scored it, mark this possession resolved.
    if ((Number(this.ball.score) || 0) > scoreBefore) {
      this.ball.__v8ForcedScore = true;
      this.ball.__scored = true;
    }

    const planned = Number(this.ball.__v8PlannedFlight) || 1;
    const elapsed = Number(this.ball.__v8FlightElapsed) || 0;

    // Center a guaranteed make through the hoop at the solved arrival time.
    if (
      this.ball.inFlight &&
      this.ball.__v8WillMake &&
      !this.ball.__scored &&
      elapsed >= planned
    ) {
      const hoop = this.hoop();
      this.ball.ballX = hoop.x;
      this.ball.ballY = hoop.y;
      this.ball.ballZ = hoop.z - 2;
      this.ball.ballVz = -Math.max(120, Math.abs(Number(this.ball.ballVz) || 0));

      const pts = (Number(this.ball.shotDist) || 0) > 165 ? 3 : 2;
      const bonus = this.ball.grade === "PERFECT" ? 1 : 0;
      this.ball.score += pts + bonus;
      this.ball.combo = (Number(this.ball.combo) || 0) + 1;
      this.ball.best = Math.max(Number(this.ball.best) || 0, this.ball.combo);
      this.ball.flash = 0.5;
      this.ball.__scored = true;
      this.ball.__v8ForcedScore = true;
      this.tryCreditBasketball?.();
      this.float?.(`SWISH +${pts + bonus}`, "#d4af37", hoop.x, hoop.y);
      this.burst?.(hoop.x, hoop.y, "#d4af37");
    }

    // Hard ceiling on a possession: no stuck ball can soft-lock the session.
    if (this.ball.inFlight && elapsed > planned + 1.35) {
      this.ball.inFlight = false;
      this.ball.ballZ = 8;
      this.ball.ballVx = 0;
      this.ball.ballVy = 0;
      this.ball.ballVz = 0;
      this.ball.__returnT = 0.32;
      if (!this.ball.__scored) this.ball.combo = 0;
    }

    if (!this.ball.held && !this.ball.inFlight) {
      this.ball.__returnT = Math.max(
        0,
        (Number(this.ball.__returnT) || 0) - Math.max(0, Number(dt) || 0),
      );
      if (this.ball.__returnT <= 0 || elapsed > planned + 2.0) {
        this.ball.held = true;
        this.ball.charging = false;
        this.ball.power = 0;
        this.ball.ballX = this.px;
        this.ball.ballY = this.py;
        this.ball.ballZ = 18;
        this.ball.__v8FlightElapsed = 0;
      }
    }

    if (typeof window !== "undefined") {
      window.__SACK_BBALL_V8__ = {
        installed: true,
        score: this.ball.score,
        shots: this.ball.shots,
        held: this.ball.held,
        inFlight: this.ball.inFlight,
        grade: this.ball.grade,
        elapsed,
        planned,
        willMake: !!this.ball.__v8WillMake,
        scored: !!this.ball.__scored,
      };
    }

    return result;
  };
}

setTimeout(async () => {
  try {
    const { GameEngine } = await import("./engine");
    install(GameEngine);
  } catch (err) {
    console.error("Basketball Stability V8 failed", err);
  }
}, 250);
