// @ts-nocheck
/**
 * Basketball Stability V8
 *
 * Adds production guarantees around the primary V8 ball physics:
 * - PERFECT releases score reliably;
 * - no possession can remain stuck in-flight indefinitely;
 * - recovery uses real elapsed time as a safety clock, so a throttled browser
 *   or low-FPS mobile device still resolves a shot promptly even though the
 *   simulation clamps frame delta.
 */

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function forceScore(engine) {
  if (!engine.ball?.inFlight || engine.ball.__scored || !engine.ball.__v8WillMake) return;
  const hoop = engine.hoop();
  engine.ball.ballX = hoop.x;
  engine.ball.ballY = hoop.y;
  engine.ball.ballZ = hoop.z - 2;
  engine.ball.ballVz = -Math.max(120, Math.abs(Number(engine.ball.ballVz) || 0));
  const pts = (Number(engine.ball.shotDist) || 0) > 165 ? 3 : 2;
  const bonus = engine.ball.grade === "PERFECT" ? 1 : 0;
  engine.ball.score += pts + bonus;
  engine.ball.combo = (Number(engine.ball.combo) || 0) + 1;
  engine.ball.best = Math.max(Number(engine.ball.best) || 0, engine.ball.combo);
  engine.ball.flash = 0.5;
  engine.ball.__scored = true;
  engine.ball.__v8ForcedScore = true;
  engine.tryCreditBasketball?.();
  engine.float?.(`SWISH +${pts + bonus}`, "#d4af37", hoop.x, hoop.y);
  engine.burst?.(hoop.x, hoop.y, "#d4af37");
}

function giveBack(engine) {
  engine.ball.inFlight = false;
  engine.ball.held = true;
  engine.ball.charging = false;
  engine.ball.power = 0;
  engine.ball.ballX = engine.px;
  engine.ball.ballY = engine.py;
  engine.ball.ballZ = 18;
  engine.ball.ballVx = 0;
  engine.ball.ballVy = 0;
  engine.ball.ballVz = 0;
  engine.ball.__returnT = 0;
  engine.ball.__v8FlightElapsed = 0;
  engine.ball.__v8ReleaseReal = 0;
}

function install(GameEngine) {
  const p = GameEngine?.prototype;
  if (!p || p.__basketballStabilityV8Installed) return;
  p.__basketballStabilityV8Installed = true;

  const oldRelease = p.releaseShot;
  p.releaseShot = function stableReleaseV8(...args) {
    const result = oldRelease.apply(this, args);
    if (this.mode === "basketball" && this.ball?.inFlight) {
      this.ball.__v8FlightElapsed = 0;
      this.ball.__v8ReleaseReal = nowMs();
      this.ball.__v8PlannedFlight = Math.max(
        0.72,
        Math.min(1.18, 0.72 + (Number(this.ball.shotDist) || 0) / 650),
      );
      this.ball.__v8WillMake =
        this.ball.grade === "PERFECT" ||
        (this.ball.grade === "GOOD" && Math.random() < 0.78);
      this.ball.__v8ForcedScore = false;
      this.ball.__scored = false;
    }
    return result;
  };

  const oldUpdate = p.updateBasketball;
  p.updateBasketball = function stableBasketballV8(dt, ...args) {
    const scoreBefore = Number(this.ball?.score) || 0;
    const result = oldUpdate.call(this, dt, ...args);
    if (this.mode !== "basketball" || !this.ball) return result;

    if (this.ball.inFlight) {
      this.ball.__v8FlightElapsed =
        (Number(this.ball.__v8FlightElapsed) || 0) + Math.max(0, Number(dt) || 0);
    }

    if ((Number(this.ball.score) || 0) > scoreBefore) {
      this.ball.__v8ForcedScore = true;
      this.ball.__scored = true;
    }

    const planned = Number(this.ball.__v8PlannedFlight) || 1;
    const elapsed = Number(this.ball.__v8FlightElapsed) || 0;
    const realElapsed = this.ball.__v8ReleaseReal
      ? Math.max(0, (nowMs() - Number(this.ball.__v8ReleaseReal)) / 1000)
      : 0;

    // The normal simulation gets first chance to make the basket. If a slow
    // device has not advanced enough simulation time after ~1.35 seconds of
    // actual play, resolve the guaranteed make anyway instead of appearing
    // frozen to the player.
    if (
      this.ball.inFlight &&
      this.ball.__v8WillMake &&
      !this.ball.__scored &&
      (elapsed >= planned || realElapsed >= Math.max(1.35, planned + 0.18))
    ) {
      forceScore(this);
    }

    // Let the swish remain visible briefly, then restore possession. On a miss,
    // use a slightly longer ceiling so the bounce is still readable.
    if (this.ball.inFlight && this.ball.__scored && realElapsed >= 1.85) {
      this.ball.inFlight = false;
      this.ball.__returnT = 0.22;
    } else if (
      this.ball.inFlight &&
      !this.ball.__scored &&
      (elapsed > planned + 1.35 || realElapsed >= 2.7)
    ) {
      this.ball.inFlight = false;
      this.ball.ballZ = 8;
      this.ball.ballVx = 0;
      this.ball.ballVy = 0;
      this.ball.ballVz = 0;
      this.ball.__returnT = 0.28;
      this.ball.combo = 0;
    }

    if (!this.ball.held && !this.ball.inFlight) {
      this.ball.__returnT = Math.max(
        0,
        (Number(this.ball.__returnT) || 0) - Math.max(0, Number(dt) || 0),
      );
      if (
        this.ball.__returnT <= 0 ||
        (realElapsed > 2.25 && this.ball.__scored) ||
        realElapsed > 3.25
      ) {
        giveBack(this);
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
        realElapsed,
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
