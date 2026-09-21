/** 901 Lanes — 10-frame bowling with hook + pocket skill. */

export type BowlPhase = "setup" | "charging" | "rolling" | "pins" | "mark" | "over";

export type BowlFrame = { rolls: number[] };

export type BowlingState = {
  active: boolean;
  phase: BowlPhase;
  frame: number;
  shot: number;
  frames: BowlFrame[];
  standing: boolean[];
  knocked: boolean[];
  power: number;
  hook: number;
  progress: number;
  pinT: number;
  markT: number;
  lastMark: string | null;
  lastKnocked: number;
  lane: number;
  turkey: number;
  total: number;
  payout: number;
  flash: number;
  ballX: number;
  gutter: boolean;
  seed: number;
};

export type BowlHud = {
  active: boolean;
  phase: BowlPhase;
  frame: number;
  shot: number;
  power: number;
  hook: number;
  pinsLeft: number;
  lastMark: string | null;
  lastKnocked: number;
  total: number;
  turkey: number;
  payout: number;
  lane: number;
  prompt: string;
  frames: { mark: string; score: number | null }[];
  over: boolean;
};

export const LANE_COUNT = 4;
export const LANE_XS = [-6.2, -2.08, 2.08, 6.2] as const;
export const APPROACH_Z = 4.15;
export const PIN_Z = -5.05;

const PIN_HOME: { x: number; z: number }[] = [
  { x: 0, z: 0.58 },
  { x: -0.19, z: 0.22 },
  { x: 0.19, z: 0.22 },
  { x: -0.38, z: -0.14 },
  { x: 0, z: -0.14 },
  { x: 0.38, z: -0.14 },
  { x: -0.57, z: -0.5 },
  { x: -0.19, z: -0.5 },
  { x: 0.19, z: -0.5 },
  { x: 0.57, z: -0.5 },
];

export function pinHome(i: number) {
  return PIN_HOME[i] ?? PIN_HOME[0]!;
}

export function idleBowl(): BowlingState {
  return {
    active: false,
    phase: "setup",
    frame: 0,
    shot: 0,
    frames: Array.from({ length: 10 }, () => ({ rolls: [] })),
    standing: Array(10).fill(true),
    knocked: Array(10).fill(false),
    power: 0,
    hook: 0.18,
    progress: 0,
    pinT: 0,
    markT: 0,
    lastMark: null,
    lastKnocked: 0,
    lane: 1,
    turkey: 0,
    total: 0,
    payout: 0,
    flash: 0,
    ballX: 0,
    gutter: false,
    seed: 1,
  };
}

export function startBowl(lane: number): BowlingState {
  const s = idleBowl();
  s.active = true;
  s.phase = "setup";
  s.lane = Math.max(0, Math.min(LANE_COUNT - 1, lane | 0));
  s.seed = (Date.now() % 997) + 3;
  return s;
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Pocket is a slight right hook. Skill window is generous but greedy speed/hook gutters. */
export function resolvePins(power: number, hook: number, standing: boolean[], seed: number): boolean[] {
  const knocked = standing.map(() => false);
  const absH = Math.abs(hook);
  const gutter = absH > 0.86 || (power < 0.14 && absH > 0.42);
  if (gutter) return knocked;

  const pocket = 0.26;
  const hookErr = hook - pocket;
  const powErr = power - 0.7;
  const quality =
    (1 - Math.min(1, Math.abs(hookErr) / 0.62)) * 0.56 + (1 - Math.min(1, Math.abs(powErr) / 0.42)) * 0.44;
  const side = hookErr < 0 ? -1 : 1;
  const light = power < 0.38;

  const chance = (i: number, base: number) => hash(seed * 17.3 + i * 9.1 + power * 5) < base;

  const head = standing[0] && quality > 0.28 && chance(0, 0.55 + quality * 0.5);
  if (standing[0] && (head || quality > 0.5)) knocked[0] = true;

  const pocketHit = quality > 0.62 && Math.abs(hookErr) < 0.22 && power > 0.48 && power < 0.9;
  if (pocketHit) {
    for (let i = 0; i < 10; i++) {
      if (!standing[i]) continue;
      knocked[i] = chance(i + 40, 0.82 + quality * 0.2);
    }
    if (quality > 0.8) for (let i = 0; i < 10; i++) if (standing[i]) knocked[i] = true;
    return knocked;
  }

  const order = side < 0 ? [1, 3, 6, 4, 7, 2, 8, 5, 9, 0] : [2, 5, 9, 8, 3, 1, 6, 4, 7, 0];
  let carry = quality;
  for (const i of order) {
    if (!standing[i] || knocked[i]) continue;
    const rowBonus = i === 0 ? 0.12 : i < 3 ? 0.04 : i < 6 ? 0 : -0.08;
    const hit = carry + rowBonus - Math.abs(hookErr) * 0.35;
    if (chance(i, Math.max(0.08, Math.min(0.96, hit)))) {
      knocked[i] = true;
      carry *= light ? 0.55 : 0.78;
    } else {
      carry *= 0.62;
    }
  }
  if (quality > 0.74 && standing.every((up, i) => !up || knocked[i] || i > 5)) {
    for (let i = 0; i < 10; i++) if (standing[i] && chance(i + 80, 0.7)) knocked[i] = true;
  }
  return knocked;
}

function knockedCount(standing: boolean[], knocked: boolean[]) {
  let n = 0;
  for (let i = 0; i < 10; i++) if (standing[i] && knocked[i]) n++;
  return n;
}

function applyKnock(standing: boolean[], knocked: boolean[]) {
  return standing.map((up, i) => up && !knocked[i]);
}

export function scoreFrames(frames: BowlFrame[]): (number | null)[] {
  const flat: number[] = [];
  for (const f of frames) for (const r of f.rolls) flat.push(r);
  const out: (number | null)[] = Array(10).fill(null);
  let total = 0;
  let idx = 0;
  for (let f = 0; f < 10; f++) {
    const rolls = frames[f]?.rolls ?? [];
    if (f < 9) {
      if (rolls[0] === 10) {
        if (flat.length > idx + 2) {
          total += 10 + (flat[idx + 1] ?? 0) + (flat[idx + 2] ?? 0);
          out[f] = total;
        }
        idx += 1;
      } else if ((rolls[0] ?? 0) + (rolls[1] ?? 0) === 10 && rolls.length >= 2) {
        if (flat.length > idx + 2) {
          total += 10 + (flat[idx + 2] ?? 0);
          out[f] = total;
        }
        idx += 2;
      } else if (rolls.length >= 2) {
        total += (rolls[0] ?? 0) + (rolls[1] ?? 0);
        out[f] = total;
        idx += 2;
      } else break;
    } else {
      if (rolls.length < 2) break;
      if (rolls[0] === 10 || (rolls[0] ?? 0) + (rolls[1] ?? 0) === 10) {
        if (rolls.length < 3) break;
        total += (rolls[0] ?? 0) + (rolls[1] ?? 0) + (rolls[2] ?? 0);
      } else {
        total += (rolls[0] ?? 0) + (rolls[1] ?? 0);
      }
      out[f] = total;
    }
  }
  return out;
}

function markOf(rolls: number[], standingLeft: number, gutter: boolean) {
  if (gutter && (rolls[rolls.length - 1] ?? 0) === 0 && standingLeft === 10) return "GUTTER";
  if (rolls[0] === 10) return "STRIKE";
  if (rolls.length >= 2 && rolls[0] + rolls[1] === 10) return "SPARE";
  if (standingLeft >= 2 && standingLeft <= 4 && rolls.length === 1) return "SPLIT";
  return "OPEN";
}

function frameLabel(rolls: number[]) {
  if (!rolls.length) return "";
  if (rolls[0] === 10) return "X";
  const a = rolls[0] === 0 ? "-" : String(rolls[0]);
  if (rolls.length === 1) return a;
  if (rolls[0] + rolls[1] === 10) return `${a} /`;
  const b = rolls[1] === 0 ? "-" : String(rolls[1]);
  if (rolls.length === 2) return `${a} ${b}`;
  const c = rolls[2] === 10 ? "X" : rolls[2] === 0 ? "-" : String(rolls[2]);
  if (rolls[0] === 10 && rolls[1] === 10) return `X X ${c}`;
  if (rolls[0] === 10) return `X ${rolls[1] === 0 ? "-" : rolls[1]} ${c}`;
  return `${a} / ${c}`;
}

export function laneApproachGame(cx: number, cy: number, lane: number) {
  const lx = LANE_XS[lane] ?? 0;
  return { x: cx + lx * 16, y: cy + APPROACH_Z * 16 };
}

export function nearestLane(px: number, py: number, cx: number, cy: number) {
  let best = 1;
  let bestD = Infinity;
  for (let i = 0; i < LANE_COUNT; i++) {
    const a = laneApproachGame(cx, cy, i);
    const d = Math.hypot(px - a.x, py - a.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function beginCharge(s: BowlingState): BowlingState {
  if (!s.active || s.phase !== "setup") return s;
  return { ...s, phase: "charging", power: 0.04, flash: 0 };
}

export function releaseRoll(s: BowlingState): BowlingState {
  if (!s.active || s.phase !== "charging") return s;
  const gutter = Math.abs(s.hook) > 0.86 || (s.power < 0.14 && Math.abs(s.hook) > 0.42);
  return {
    ...s,
    phase: "rolling",
    progress: 0,
    gutter,
    ballX: s.hook * 0.72,
    seed: s.seed + 1 + ((s.power * 90) | 0),
  };
}

export function tickBowl(s: BowlingState, dt: number, lookX: number): BowlingState {
  if (!s.active) return s;
  const next = { ...s, flash: Math.max(0, s.flash - dt * 1.6) };
  if (next.phase === "charging") {
    next.power = Math.min(1, next.power + dt * 0.72);
    next.hook = Math.max(-1, Math.min(1, next.hook + lookX * dt * 1.65));
    return next;
  }
  if (next.phase === "rolling") {
    const spd = 0.72 + next.power * 0.85;
    next.progress = Math.min(1, next.progress + dt * spd);
    const curve = next.hook * 0.55 * next.progress * next.progress;
    next.ballX = curve + (next.gutter ? Math.sign(next.hook || 1) * 0.7 * next.progress : 0);
    if (next.progress >= 1) {
      const knocked = resolvePins(next.power, next.hook, next.standing, next.seed);
      const pins = knockedCount(next.standing, knocked);
      next.knocked = knocked;
      next.lastKnocked = pins;
      next.phase = "pins";
      next.pinT = 0;
      next.gutter = next.gutter || pins === 0;
    }
    return next;
  }
  if (next.phase === "pins") {
    next.pinT = Math.min(1, next.pinT + dt * 1.35);
    if (next.pinT >= 1) return settleShot(next);
    return next;
  }
  if (next.phase === "mark") {
    next.markT = Math.max(0, next.markT - dt);
    if (next.markT <= 0) {
      if (gameOver(next)) {
        next.phase = "over";
        next.payout = payoutFor(next);
      } else {
        next.phase = "setup";
        next.power = 0;
        next.progress = 0;
      }
    }
    return next;
  }
  return next;
}

function gameOver(s: BowlingState) {
  if (s.frame < 9) return false;
  const rolls = s.frames[9]?.rolls ?? [];
  if (rolls.length < 2) return false;
  if (rolls[0] === 10 || rolls[0] + (rolls[1] ?? 0) === 10) return rolls.length >= 3;
  return true;
}

function settleShot(s: BowlingState): BowlingState {
  const frames = s.frames.map((f) => ({ rolls: [...f.rolls] }));
  const fr = frames[s.frame] ?? { rolls: [] };
  fr.rolls = [...fr.rolls, s.lastKnocked];
  frames[s.frame] = fr;
  const standing = applyKnock(s.standing, s.knocked);
  const left = standing.filter(Boolean).length;
  const mark = markOf(fr.rolls, left, s.gutter);
  let turkey = s.turkey;
  if (mark === "STRIKE") turkey += 1;
  else turkey = 0;
  const scores = scoreFrames(frames);
  const total = [...scores].reverse().find((n) => n != null) ?? 0;
  const tenth = s.frame === 9;
  const strike = fr.rolls[0] === 10;
  const spare = fr.rolls.length >= 2 && fr.rolls[0] + fr.rolls[1] === 10 && fr.rolls[0] !== 10;
  let frame = s.frame;
  let shot = s.shot + 1;
  let resetPins = false;
  if (!tenth) {
    if (strike || shot >= 2) {
      frame += 1;
      shot = 0;
      resetPins = true;
    }
  } else if (strike || spare) {
    resetPins = true;
    shot = fr.rolls.length;
  }

  return {
    ...s,
    frames,
    standing: resetPins ? Array(10).fill(true) : standing,
    knocked: Array(10).fill(false),
    phase: "mark",
    markT: mark === "STRIKE" ? 1.15 : mark === "SPARE" ? 0.95 : 0.7,
    lastMark: mark,
    turkey,
    total,
    frame,
    shot,
    flash: mark === "STRIKE" ? 1 : mark === "SPARE" ? 0.55 : 0.15,
    progress: 1,
  };
}

export function payoutFor(s: BowlingState) {
  const rolled = s.frames.some((f) => f.rolls.length);
  if (!rolled) return 0;
  let strikes = 0;
  for (const f of s.frames) if (f.rolls[0] === 10) strikes++;
  const turkeyBonus = s.turkey >= 3 ? 40 : 0;
  return Math.max(10, s.total + strikes * 8 + turkeyBonus + (s.total >= 200 ? 80 : s.total >= 150 ? 30 : 0));
}

export function bowlHud(s: BowlingState, tap: boolean): BowlHud {
  const scores = scoreFrames(s.frames);
  const hold = tap ? "HOLD BOWL" : "Hold Space / F";
  let prompt = `${hold} · hook with look`;
  if (s.phase === "charging") prompt = "Release in the pocket · hook with look";
  if (s.phase === "rolling") prompt = s.progress > 0.7 ? "Pins…" : "Watch the pocket";
  if (s.phase === "pins") prompt = s.gutter ? "Gutter." : `${s.lastKnocked} down`;
  if (s.phase === "mark") {
    if (s.lastMark === "STRIKE") prompt = s.turkey >= 3 ? "TURKEY" : "STRIKE";
    else if (s.lastMark === "SPARE") prompt = "SPARE";
    else if (s.lastMark === "GUTTER") prompt = "Gutter ball";
    else prompt = s.lastMark ?? "Open";
  }
  if (s.phase === "over") prompt = tap ? "TAP · bowl again" : "E · bowl again · walk out to cash";
  return {
    active: s.active,
    phase: s.phase,
    frame: Math.min(10, s.frame + 1),
    shot: s.shot + 1,
    power: s.power,
    hook: s.hook,
    pinsLeft: s.standing.filter(Boolean).length,
    lastMark: s.lastMark,
    lastKnocked: s.lastKnocked,
    total: s.total,
    turkey: s.turkey,
    payout: s.phase === "over" ? s.payout : payoutFor(s),
    lane: s.lane + 1,
    prompt,
    frames: s.frames.map((f, i) => ({ mark: frameLabel(f.rolls), score: scores[i] ?? null })),
    over: s.phase === "over",
  };
}
