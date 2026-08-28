import { TILE } from "./data";
import { carBlocked, inCourtPx, nearestAsphalt } from "./worldTopology";

export const RACE_LAPS = 3;
export const RACE_HIT = 118;
export const RIVAL_NAME = "Cam";
export const CRUISE_SPEED = 455;
export const NITRO_SPEED = 655;
export const SLOW_SPEED = 228;

export type ArrowDir = "left" | "right" | "up";

export type RaceCheckpoint = { x: number; y: number; name: string };

/**
 * Clockwise east-side 901 loop. Stays on Front / Union / Highland / Poplar.
 * Never uses 3rd × Poplar (that intersection is inside 901 Court).
 */
export const RACE_CHECKPOINTS: RaceCheckpoint[] = [
  { x: 34 * TILE, y: 20 * TILE, name: "Beale & Front" },
  { x: 34 * TILE, y: 6 * TILE, name: "Union & Front" },
  { x: 50 * TILE, y: 6 * TILE, name: "Union & Highland" },
  { x: 50 * TILE, y: 20 * TILE, name: "Beale & Highland" },
  { x: 50 * TILE, y: 34 * TILE, name: "Poplar & Highland" },
  { x: 34 * TILE, y: 34 * TILE, name: "Poplar & Front" },
];

export function isRaceBlocked(x: number, y: number) {
  return inCourtPx(x, y) || carBlocked(x, y, 14);
}

function nudgeOffSolids(x: number, y: number) {
  if (!isRaceBlocked(x, y)) return { x, y };
  const safe = nearestAsphalt(x, y);
  return { x: safe.x, y: safe.y };
}

function sampleSegment(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 36));
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    out.push(nudgeOffSolids(a.x + dx * t, a.y + dy * t));
  }
  return out;
}

export const RACE_PATH: { x: number; y: number }[] = (() => {
  const pts: { x: number; y: number }[] = [nudgeOffSolids(RACE_CHECKPOINTS[0]!.x, RACE_CHECKPOINTS[0]!.y)];
  for (let i = 0; i < RACE_CHECKPOINTS.length; i++) {
    const a = RACE_CHECKPOINTS[i]!;
    const b = RACE_CHECKPOINTS[(i + 1) % RACE_CHECKPOINTS.length]!;
    pts.push(...sampleSegment(a, b));
  }
  return pts;
})();

export type RacePhase = "idle" | "countdown" | "green" | "finish";

export type RacerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  yaw: number;
  next: number;
  lap: number;
  finished: boolean;
  finishT: number;
  pathI: number;
};

export type RaceCue = {
  dir: ArrowDir;
  t: number;
  status: "live" | "hit" | "miss";
  flash: number;
};

export type RaceState = {
  active: boolean;
  phase: RacePhase;
  countdown: number;
  time: number;
  player: RacerState;
  rival: RacerState;
  place: 1 | 2;
  winner: "player" | "rival" | null;
  recap: boolean;
  payout: number;
  respect: number;
  bestTime: number;
  wrongWay: number;
  cruise: number;
  combo: number;
  cue: RaceCue | null;
  turnArmed: boolean;
  boostArmed: boolean;
  boostT: number;
  slowT: number;
};

export type RaceHud = {
  active: boolean;
  phase: RacePhase;
  countdown: number;
  time: number;
  lap: number;
  laps: number;
  place: 1 | 2;
  nextName: string;
  rivalLap: number;
  rivalName: string;
  recap: boolean;
  winner: "player" | "rival" | null;
  payout: number;
  respect: number;
  bestTime: number;
  gap: number;
  speed: number;
  playerX: number;
  playerY: number;
  rivalX: number;
  rivalY: number;
  nextX: number;
  nextY: number;
  cue: { dir: ArrowDir; status: RaceCue["status"]; flash: number } | null;
  combo: number;
  boosting: boolean;
  slowed: boolean;
};

export function idleRace(bestTime = 0): RaceState {
  return {
    active: false,
    phase: "idle",
    countdown: 0,
    time: 0,
    player: emptyRacer(),
    rival: emptyRacer(),
    place: 1,
    winner: null,
    recap: false,
    payout: 0,
    respect: 0,
    bestTime,
    wrongWay: 0,
    cruise: CRUISE_SPEED,
    combo: 0,
    cue: null,
    turnArmed: false,
    boostArmed: false,
    boostT: 0,
    slowT: 0,
  };
}

function emptyRacer(): RacerState {
  return { x: 0, y: 0, vx: 0, vy: 0, yaw: 0, next: 1, lap: 0, finished: false, finishT: 0, pathI: 0 };
}

function nearestPathIndex(x: number, y: number) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < RACE_PATH.length; i++) {
    const p = RACE_PATH[i]!;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function gridStart() {
  const s = RACE_CHECKPOINTS[0]!;
  return {
    player: { x: s.x + 20, y: s.y + 86, yaw: 0 },
    rival: { x: s.x - 18, y: s.y + 36, yaw: 0 },
  };
}

export function beginRace(bestTime = 0): RaceState {
  const g = gridStart();
  const player: RacerState = {
    ...emptyRacer(),
    x: g.player.x,
    y: g.player.y,
    yaw: g.player.yaw,
    next: 1,
    pathI: nearestPathIndex(g.player.x, g.player.y),
  };
  const rival: RacerState = {
    ...emptyRacer(),
    x: g.rival.x,
    y: g.rival.y,
    yaw: g.rival.yaw,
    next: 1,
    pathI: nearestPathIndex(g.rival.x, g.rival.y),
  };
  return {
    active: true,
    phase: "countdown",
    countdown: 3.2,
    time: 0,
    player,
    rival,
    place: 1,
    winner: null,
    recap: false,
    payout: 0,
    respect: 0,
    bestTime,
    wrongWay: 0,
    cruise: CRUISE_SPEED,
    combo: 0,
    cue: null,
    turnArmed: false,
    boostArmed: false,
    boostT: 0,
    slowT: 0,
  };
}

export function progressOf(r: RacerState) {
  const n = RACE_CHECKPOINTS.length;
  const goal = RACE_CHECKPOINTS[r.next]!;
  const dist = Math.hypot(goal.x - r.x, goal.y - r.y);
  const frac = 1 - Math.min(1, dist / 900);
  const passed = r.next === 0 ? n : r.next;
  return r.lap * n + (passed - 1) + frac;
}

export function hitCheckpoint(r: RacerState) {
  const goal = RACE_CHECKPOINTS[r.next]!;
  if (Math.hypot(goal.x - r.x, goal.y - r.y) > RACE_HIT) return false;
  if (r.next === 0) r.lap += 1;
  r.next = (r.next + 1) % RACE_CHECKPOINTS.length;
  if (r.lap >= RACE_LAPS) {
    r.finished = true;
    return true;
  }
  return true;
}

function pathTarget(r: RacerState, lateral: number) {
  const n = RACE_PATH.length;
  const wp = RACE_PATH[r.pathI % n]!;
  const nxt = RACE_PATH[(r.pathI + 1) % n]!;
  const dx = nxt.x - wp.x;
  const dy = nxt.y - wp.y;
  const mag = Math.hypot(dx, dy) || 1;
  return {
    x: wp.x + (-dy / mag) * lateral,
    y: wp.y + (dx / mag) * lateral,
  };
}

function advancePath(r: RacerState) {
  const n = RACE_PATH.length;
  r.pathI = (r.pathI + 1) % n;
}

/** Follow the asphalt polyline — one street at a time, around buildings. */
export function tickAutoDrive(r: RacerState, dt: number, spd: number, lateral = 0) {
  if (r.finished) {
    r.vx *= Math.max(0, 1 - dt * 3);
    r.vy *= Math.max(0, 1 - dt * 3);
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    return false;
  }
  let goal = pathTarget(r, lateral);
  if (isRaceBlocked(goal.x, goal.y)) goal = pathTarget(r, 0);
  if (isRaceBlocked(goal.x, goal.y)) {
    const n = RACE_PATH.length;
    goal = RACE_PATH[r.pathI % n]!;
  }
  const dx = goal.x - r.x;
  const dy = goal.y - r.y;
  const dist = Math.hypot(dx, dy);
  const passed = dist < 52 || (dist < 96 && dx * r.vx + dy * r.vy < 0);
  if (passed) {
    advancePath(r);
    if (hitCheckpoint(r)) {
      snapRacer(r);
      return true;
    }
  }
  const mag = dist < 1 ? 1 : dist;
  const wx = dx / mag;
  const wy = dy / mag;
  r.vx += (wx * spd - r.vx) * Math.min(1, dt * 8.2);
  r.vy += (wy * spd - r.vy) * Math.min(1, dt * 8.2);
  r.x += r.vx * dt;
  r.y += r.vy * dt;
  snapRacer(r);
  if (Math.hypot(r.vx, r.vy) > 8) r.yaw = Math.atan2(-r.vx, -r.vy);
  if (hitCheckpoint(r)) return true;
  return false;
}

function snapRacer(r: RacerState) {
  if (!isRaceBlocked(r.x, r.y)) return;
  const safe = nudgeOffSolids(r.x, r.y);
  r.x = safe.x;
  r.y = safe.y;
}

export function tickRival(r: RacerState, dt: number, playerProgress: number, playerBoosting = false) {
  const gap = playerProgress - progressOf(r);
  let spd = 408;
  if (gap > 0.12) spd = 428 + Math.min(1.1, gap) * 42;
  else if (gap < -0.1) spd = 448 + Math.min(1.6, -gap) * (playerBoosting ? 18 : 64);
  else spd = 418;
  return tickAutoDrive(r, dt, spd, -10);
}

export function upcomingTurn(r: RacerState): ArrowDir {
  const n = RACE_CHECKPOINTS.length;
  const i = r.next;
  const prev = RACE_CHECKPOINTS[(i - 1 + n) % n]!;
  const cur = RACE_CHECKPOINTS[i]!;
  const nxt = RACE_CHECKPOINTS[(i + 1) % n]!;
  const ix = cur.x - prev.x;
  const iy = cur.y - prev.y;
  const ox = nxt.x - cur.x;
  const oy = nxt.y - cur.y;
  const cross = ix * oy - iy * ox;
  if (Math.abs(cross) < 80) return "up";
  return cross > 0 ? "right" : "left";
}

export function tickRaceCues(state: RaceState, dt: number, tap: ArrowDir | null) {
  if (state.boostT > 0) state.boostT = Math.max(0, state.boostT - dt);
  if (state.slowT > 0) state.slowT = Math.max(0, state.slowT - dt);

  if (state.cue) {
    state.cue.flash = Math.max(0, state.cue.flash - dt);
    if (state.cue.status === "live") {
      state.cue.t -= dt;
      if (tap) {
        if (tap === state.cue.dir) {
          state.cue.status = "hit";
          state.cue.flash = 0.55;
          state.combo += 1;
          state.boostT = 1.65 + Math.min(0.7, state.combo * 0.1);
          state.slowT = 0;
          state.cruise = NITRO_SPEED + Math.min(80, state.combo * 16);
        } else {
          state.cue.status = "miss";
          state.cue.flash = 0.55;
          state.combo = 0;
          state.boostT = 0;
          state.slowT = 1.55;
          state.cruise = SLOW_SPEED;
        }
      } else if (state.cue.t <= 0) {
        state.cue.status = "miss";
        state.cue.flash = 0.55;
        state.combo = 0;
        state.boostT = 0;
        state.slowT = 1.45;
        state.cruise = SLOW_SPEED;
      }
    } else if (state.cue.flash <= 0) {
      state.cue = null;
    }
  }

  if (state.boostT > 0) {
    state.cruise = Math.max(state.cruise, NITRO_SPEED + Math.min(80, state.combo * 16));
  } else if (state.slowT > 0) {
    state.cruise = SLOW_SPEED;
  } else {
    state.cruise += (CRUISE_SPEED - state.cruise) * Math.min(1, dt * 1.15);
  }

  const goal = RACE_CHECKPOINTS[state.player.next]!;
  const dist = Math.hypot(goal.x - state.player.x, goal.y - state.player.y);
  const live = state.cue?.status === "live";
  if (!live) {
    const turn = upcomingTurn(state.player);
    if (dist < 430 && dist > 110 && !state.turnArmed) {
      state.cue = { dir: turn, t: 1.05, status: "live", flash: 0 };
      state.turnArmed = true;
    } else if (dist > 520 && dist < 860 && !state.boostArmed) {
      state.cue = { dir: "up", t: 0.88, status: "live", flash: 0 };
      state.boostArmed = true;
    }
  }
}

export function armNextSegment(state: RaceState) {
  state.turnArmed = false;
  state.boostArmed = false;
}

export function playerWrongWay(r: RacerState, vx: number, vy: number) {
  const goal = RACE_CHECKPOINTS[r.next]!;
  const dx = goal.x - r.x;
  const dy = goal.y - r.y;
  const mag = Math.hypot(vx, vy);
  if (mag < 40) return false;
  const aim = (dx * vx + dy * vy) / (Math.hypot(dx, dy) * mag + 0.001);
  return aim < -0.15;
}

export function settleRace(state: RaceState) {
  const playerWon = state.player.finished && (!state.rival.finished || state.player.finishT <= state.rival.finishT);
  state.winner = playerWon ? "player" : "rival";
  state.place = playerWon ? 1 : 2;
  state.payout = playerWon ? 140 : 28;
  state.respect = playerWon ? 10 : 2;
  if (playerWon && (state.bestTime <= 0 || state.time < state.bestTime)) state.bestTime = state.time;
  state.phase = "finish";
  state.recap = true;
  state.active = true;
  state.cue = null;
  state.boostT = 0;
  state.slowT = 0;
}

export function toRaceHud(state: RaceState): RaceHud | null {
  if (!state.active && !state.recap) return null;
  const next = RACE_CHECKPOINTS[state.player.next]!;
  return {
    active: state.active,
    phase: state.phase,
    countdown: state.countdown,
    time: state.time,
    lap: Math.min(RACE_LAPS, state.player.lap + 1),
    laps: RACE_LAPS,
    place: state.place,
    nextName: next.name,
    rivalLap: Math.min(RACE_LAPS, state.rival.lap + 1),
    rivalName: RIVAL_NAME,
    recap: state.recap,
    winner: state.winner,
    payout: state.payout,
    respect: state.respect,
    bestTime: state.bestTime,
    gap: progressOf(state.rival) - progressOf(state.player),
    speed: Math.hypot(state.player.vx, state.player.vy),
    playerX: state.player.x,
    playerY: state.player.y,
    rivalX: state.rival.x,
    rivalY: state.rival.y,
    nextX: next.x,
    nextY: next.y,
    cue: state.cue ? { dir: state.cue.dir, status: state.cue.status, flash: state.cue.flash } : null,
    combo: state.combo,
    boosting: state.boostT > 0,
    slowed: state.slowT > 0,
  };
}

export function formatRaceClock(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function formatGap(g: number) {
  if (Math.abs(g) < 0.08) return "SIDE BY SIDE";
  return g > 0 ? `CAM +${g.toFixed(1)}` : `YOU +${(-g).toFixed(1)}`;
}

export function formatMph(pxPerSec: number) {
  return Math.max(0, Math.round(pxPerSec * 0.14));
}

export function arrowGlyph(dir: ArrowDir) {
  return dir === "left" ? "←" : dir === "right" ? "→" : "↑";
}
