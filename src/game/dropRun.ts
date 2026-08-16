import type { LocationId } from "./types";

export type RunGrade = "D" | "C" | "B" | "A" | "S";
export type ShotZone = "close" | "mid" | "deep";
export type DeliveryId = "hood" | "dt" | "culture";

export const GRADE_MUL: Record<RunGrade, number> = {
  D: 1,
  C: 1.1,
  B: 1.25,
  A: 1.5,
  S: 2,
};

export interface DropTier {
  run: number;
  courtTarget: number;
  parSeconds: number;
  perfectHalfWidth: number;
  deliveryOrder: DeliveryId[];
}

export interface DropRunState {
  runIndex: number;
  active: boolean;
  time: number;
  deliveries: number;
  combo: number;
  bestCombo: number;
  mistakes: number;
  ballMakes: number;
  ballPerfects: number;
  ballScore: number;
  points: number;
  grade: RunGrade | null;
  recap: boolean;
  lastPayout: number;
  lastRespect: number;
}

export interface DropRunHud {
  run: number;
  time: number;
  combo: number;
  bestCombo: number;
  points: number;
  courtTarget: number;
  grade: RunGrade | null;
  recap: boolean;
  deliveries: number;
  ballMakes: number;
  ballPerfects: number;
  ballScore: number;
  payout: number;
  respectEarned: number;
  par: number;
  active: boolean;
}

const ROUTES: DeliveryId[][] = [
  ["hood", "dt", "culture"],
  ["dt", "hood", "culture"],
  ["culture", "dt", "hood"],
  ["hood", "culture", "dt"],
];

export function tierFor(runIndex: number): DropTier {
  const run = Math.max(1, Math.floor(runIndex));
  if (run <= 1) {
    return { run: 1, courtTarget: 8, parSeconds: 240, perfectHalfWidth: 0.11, deliveryOrder: ROUTES[0]! };
  }
  if (run === 2) {
    return { run: 2, courtTarget: 12, parSeconds: 200, perfectHalfWidth: 0.095, deliveryOrder: ROUTES[1]! };
  }
  if (run === 3) {
    return { run: 3, courtTarget: 16, parSeconds: 170, perfectHalfWidth: 0.08, deliveryOrder: ROUTES[2]! };
  }
  return {
    run,
    courtTarget: Math.min(24, 16 + (run - 3) * 2),
    parSeconds: Math.max(120, 160 - (run - 3) * 8),
    perfectHalfWidth: Math.max(0.055, 0.078 - (run - 4) * 0.006),
    deliveryOrder: ROUTES[(run - 1) % ROUTES.length]!,
  };
}

export function createRun(runIndex: number): DropRunState {
  return {
    runIndex: Math.max(1, runIndex),
    active: false,
    time: 0,
    deliveries: 0,
    combo: 0,
    bestCombo: 0,
    mistakes: 0,
    ballMakes: 0,
    ballPerfects: 0,
    ballScore: 0,
    points: 0,
    grade: null,
    recap: false,
    lastPayout: 0,
    lastRespect: 0,
  };
}

export function shotZone(dist: number): ShotZone {
  if (dist < 92) return "close";
  if (dist < 158) return "mid";
  return "deep";
}

export function perfectWindow(zone: ShotZone, halfWidth: number): { lo: number; hi: number } {
  const center = zone === "close" ? 0.62 : zone === "mid" ? 0.65 : 0.69;
  const w = zone === "close" ? halfWidth * 1.22 : zone === "deep" ? halfWidth * 0.76 : halfWidth;
  return { lo: center - w, hi: center + w };
}

export function goodWindow(perfect: { lo: number; hi: number }): { lo: number; hi: number } {
  const pad = (perfect.hi - perfect.lo) * 0.85;
  return { lo: Math.max(0.18, perfect.lo - pad), hi: Math.min(0.98, perfect.hi + pad) };
}

export function zoneValue(zone: ShotZone): { pts: number; scoreMul: number } {
  if (zone === "deep") return { pts: 3, scoreMul: 1.4 };
  if (zone === "mid") return { pts: 2, scoreMul: 1.15 };
  return { pts: 2, scoreMul: 1 };
}

export function noteMistake(run: DropRunState): void {
  run.mistakes += 1;
  run.combo = 0;
  run.points = Math.max(0, run.points - 80);
}

export function scoreDelivery(run: DropRunState, interval: number, parSeconds: number): number {
  run.deliveries += 1;
  run.combo += 1;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  const targetGap = parSeconds / 3;
  const fast = interval > 0 && interval < targetGap * 0.72;
  const gained = 420 + (fast ? 160 : 0) + (run.combo - 1) * 90;
  run.points += gained;
  return gained;
}

export function scoreMake(run: DropRunState, perfect: boolean, zone: ShotZone, streak: number): number {
  run.ballMakes += 1;
  if (perfect) run.ballPerfects += 1;
  const z = zoneValue(zone);
  run.ballScore += perfect ? z.pts + 1 : z.pts;
  const gained = Math.round((perfect ? 200 : 90) * z.scoreMul + streak * 25);
  run.points += gained;
  run.combo += 1;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  return gained;
}

export function scoreMiss(run: DropRunState): void {
  run.combo = 0;
}

export function gradeFor(points: number): RunGrade {
  if (points >= 3600) return "S";
  if (points >= 2700) return "A";
  if (points >= 1900) return "B";
  if (points >= 1100) return "C";
  return "D";
}

export function finalizeRun(run: DropRunState, parSeconds: number, basePayout: number, baseRespect: number) {
  const timeFactor = Math.max(-0.12, Math.min(0.45, (parSeconds - run.time) / parSeconds));
  run.points += Math.round(timeFactor * 700);
  run.points = Math.max(0, run.points);
  run.grade = gradeFor(run.points);
  const mul = GRADE_MUL[run.grade];
  run.lastPayout = Math.round(basePayout * (mul - 1));
  run.lastRespect = Math.max(1, Math.round(baseRespect * (mul - 1) + (run.grade === "S" ? 12 : run.grade === "A" ? 6 : 0)));
  run.active = false;
  run.recap = true;
  return { grade: run.grade, bonusDollars: run.lastPayout, bonusRespect: run.lastRespect, mul };
}

export function toHud(run: DropRunState, courtTarget: number, par: number): DropRunHud {
  return {
    run: run.runIndex,
    time: run.time,
    combo: run.combo,
    bestCombo: run.bestCombo,
    points: run.points,
    courtTarget,
    grade: run.grade,
    recap: run.recap,
    deliveries: run.deliveries,
    ballMakes: run.ballMakes,
    ballPerfects: run.ballPerfects,
    ballScore: run.ballScore,
    payout: run.lastPayout,
    respectEarned: run.lastRespect,
    par,
    active: run.active,
  };
}

export function formatRunClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function gradeRank(g: RunGrade): number {
  return { D: 1, C: 2, B: 3, A: 4, S: 5 }[g];
}

export function deliveryTarget(id: DeliveryId): LocationId {
  if (id === "hood") return "neighborhood";
  if (id === "dt") return "downtown";
  return "culture";
}
