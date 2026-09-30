import type { FishingHud, FishingPhase } from "./types";
import { TILE, WORLD_PX_H, WORLD_PX_W } from "./data";
import { RIVER_TILE_Y } from "./worldTopology";
import { halloweenOn } from "./season";

export type FishId = "bluegill" | "crappie" | "catfish" | "bass" | "gar" | "sackfish" | "ghostcat" | "pumpkinbass" | "midnightcarp" | "memphis_monster";

export type FishKind = {
  id: FishId;
  name: string;
  minLb: number;
  maxLb: number;
  weight: number;
  minCash: number;
  maxCash: number;
  respect: number;
  legendary?: boolean;
};

export const FISH: FishKind[] = [
  { id: "bluegill", name: "Bluegill", minLb: 0.4, maxLb: 1.4, weight: 34, minCash: 8, maxCash: 14, respect: 0 },
  { id: "crappie", name: "White Crappie", minLb: 0.6, maxLb: 2.1, weight: 26, minCash: 10, maxCash: 18, respect: 0 },
  { id: "catfish", name: "Channel Cat", minLb: 2.4, maxLb: 8.5, weight: 18, minCash: 22, maxCash: 40, respect: 1 },
  { id: "bass", name: "Largemouth Bass", minLb: 2.0, maxLb: 7.2, weight: 14, minCash: 28, maxCash: 48, respect: 1 },
  { id: "gar", name: "Alligator Gar", minLb: 12, maxLb: 28, weight: 6, minCash: 64, maxCash: 96, respect: 2 },
  { id: "sackfish", name: "901 Sack Fish", minLb: 9, maxLb: 16, weight: 2, minCash: 120, maxCash: 160, respect: 4, legendary: true },
  { id: "ghostcat", name: "Ghost Catfish", minLb: 3, maxLb: 9, weight: 0, minCash: 36, maxCash: 64, respect: 2 },
  { id: "pumpkinbass", name: "Pumpkin Bass", minLb: 2.2, maxLb: 6.4, weight: 0, minCash: 32, maxCash: 54, respect: 1 },
  { id: "midnightcarp", name: "Midnight Carp", minLb: 4, maxLb: 11, weight: 0, minCash: 40, maxCash: 70, respect: 2 },
  { id: "memphis_monster", name: "Memphis Monster Fish", minLb: 18, maxLb: 36, weight: 0, minCash: 140, maxCash: 200, respect: 5, legendary: true },
];

export type FishingState = {
  active: boolean;
  phase: FishingPhase;
  power: number;
  wait: number;
  window: number;
  tension: number;
  progress: number;
  pull: number;
  fish: FishKind | null;
  weightLb: number;
  payout: number;
  bobX: number;
  bobY: number;
  caught: number;
  bestLb: number;
  result: string | null;
  legendary: boolean;
};

export function idleFishing(): FishingState {
  return {
    active: false,
    phase: "idle",
    power: 0,
    wait: 0,
    window: 0,
    tension: 0.4,
    progress: 0,
    pull: 0,
    fish: null,
    weightLb: 0,
    payout: 0,
    bobX: 0,
    bobY: 0,
    caught: 0,
    bestLb: 0,
    result: null,
    legendary: false,
  };
}

function rng(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const RIVER_Y = RIVER_TILE_Y * TILE;

export type WaterSpot = "shallows" | "channel" | "dropoff";

export function waterSpot(y: number): WaterSpot {
  const depth = (y - RIVER_Y) / Math.max(40, WORLD_PX_H - RIVER_Y);
  if (depth < 0.28) return "shallows";
  if (depth < 0.62) return "channel";
  return "dropoff";
}

function spotName(spot: WaterSpot) {
  if (spot === "shallows") return "shallows";
  if (spot === "channel") return "channel";
  return "drop-off";
}

function pickFish(caught: number, roll: number, spot: WaterSpot): FishKind {
  const table: Record<WaterSpot, Partial<Record<FishId, number>>> = {
    shallows: { bluegill: 42, crappie: 30, bass: 16, catfish: 10, gar: 2 },
    channel: { bluegill: 8, crappie: 16, catfish: 28, bass: 28, gar: 14, sackfish: 6 },
    dropoff: { crappie: 4, catfish: 14, bass: 12, gar: 42, sackfish: 28 },
  };
  const boosted = FISH.map((f) => {
    let w = table[spot][f.id] ?? 0;
    if (halloweenOn()) {
      if (f.id === "pumpkinbass" && spot === "shallows") w += 14;
      if (f.id === "ghostcat" && spot !== "dropoff") w += 8;
      if (f.id === "midnightcarp" && spot === "channel") w += 10;
      if (f.id === "memphis_monster" && spot === "dropoff") w += 5;
    }
    if (f.id === "sackfish") w += Math.min(8, caught * 0.35);
    if (f.id === "gar" && spot !== "shallows") w += Math.min(6, caught * 0.2);
    return { f, w };
  });
  const total = boosted.reduce((s, x) => s + x.w, 0) || 1;
  let t = roll * total;
  for (const row of boosted) {
    t -= row.w;
    if (t <= 0) return row.f;
  }
  return FISH[0]!;
}

export function beginFishing(s: FishingState, px: number, py: number): FishingState {
  return {
    ...s,
    active: true,
    phase: "cast",
    power: 0.08,
    wait: 0,
    window: 0,
    tension: 0.4,
    progress: 0,
    pull: 0,
    fish: null,
    weightLb: 0,
    payout: 0,
    bobX: px,
    bobY: py + 70,
    result: null,
    legendary: false,
  };
}

export function cancelFishing(s: FishingState): FishingState {
  return { ...s, active: false, phase: "idle", power: 0, fish: null, result: null };
}

export type FishEvent = "splash" | "nibble" | "strike" | "catch" | "fail" | "snap" | null;

function hookFish(next: FishingState, clock: number): FishingState {
  const spot = waterSpot(next.bobY);
  const fish = pickFish(next.caught, rng(clock * 9.4 + next.caught * 3.1), spot);
  const span = fish.maxLb - fish.minLb;
  next.fish = fish;
  next.weightLb = Math.round((fish.minLb + rng(clock * 5.2) * span) * 10) / 10;
  next.payout = Math.round(fish.minCash + rng(clock * 2.8) * (fish.maxCash - fish.minCash));
  next.legendary = !!fish.legendary;
  next.phase = "reel";
  next.tension = 0.38;
  next.progress = 0.08;
  next.pull = 0.7 + (fish.legendary ? 0.55 : fish.id === "gar" ? 0.4 : 0.15) + (spot === "dropoff" ? 0.18 : 0);
  next.window = 0;
  return next;
}

export function tickFishing(
  s: FishingState,
  dt: number,
  hold: boolean,
  pressed: boolean,
  released: boolean,
  clock: number,
  px: number,
): { next: FishingState; event: FishEvent } {
  if (!s.active) return { next: s, event: null };
  let event: FishEvent = null;
  const next = { ...s };

  if (next.phase === "cast") {
    if (hold) next.power = Math.min(1, next.power + dt * 0.72);
    if (released) {
      const shore = RIVER_Y + 28;
      const far = WORLD_PX_H - 48;
      next.bobX = Math.max(48, Math.min(WORLD_PX_W - 48, px + (rng(clock * 1.7) - 0.5) * 90));
      next.bobY = shore + next.power * (far - shore);
      next.phase = "wait";
      next.wait = 1.15 + (waterSpot(next.bobY) === "dropoff" ? 1.35 : waterSpot(next.bobY) === "channel" ? 0.45 : 0) + rng(clock * 3.1) * 2.2;
      next.power = 0;
      event = "splash";
    }
    return { next, event };
  }

  if (next.phase === "wait") {
    next.wait -= dt;
    next.bobX += Math.sin(clock * 1.4) * 4 * dt;
    if (next.wait <= 0) {
      next.phase = "nibble";
      next.window = 0.55 + rng(clock * 8.2) * 0.25;
      event = "nibble";
    }
    return { next, event };
  }

  if (next.phase === "nibble") {
    next.window -= dt;
    next.bobX += Math.sin(clock * 18) * 10 * dt;
    if (pressed) {
      event = "strike";
      return { next: hookFish(next, clock), event };
    }
    if (next.window <= 0) {
      next.phase = "strike";
      next.window = 0.78;
      event = "strike";
    }
    return { next, event };
  }

  if (next.phase === "strike") {
    next.window -= dt;
    if (pressed) {
      event = "strike";
      return { next: hookFish(next, clock), event };
    }
    if (next.window <= 0) {
      next.phase = "fail";
      next.result = "He spit it.";
      next.window = 1.6;
      event = "fail";
    }
    return { next, event };
  }

  if (next.phase === "reel") {
    const fight = next.pull * (0.5 + Math.sin(clock * (2.1 + next.pull)) * 0.5);
    const sweet = next.tension > 0.18 && next.tension < 0.8;
    if (hold) {
      next.tension = Math.min(1.15, next.tension + dt * (0.16 + fight * 0.22));
      next.progress = Math.min(1, next.progress + dt * (sweet ? 0.4 : 0.16));
    } else {
      next.tension = Math.max(0.06, next.tension - dt * 0.34);
      next.progress = Math.max(0, next.progress - dt * 0.025);
    }
    next.tension += Math.sin(clock * 3.4) * 0.28 * dt * next.pull;
    if (next.tension >= 1) {
      next.phase = "fail";
      next.result = "Line snapped.";
      next.window = 1.7;
      next.fish = null;
      event = "snap";
      return { next, event };
    }
    if (next.progress >= 1 && next.fish) {
      next.phase = "catch";
      next.caught += 1;
      next.bestLb = Math.max(next.bestLb, next.weightLb);
      next.result = next.fish.name;
      next.window = 3.4;
      event = "catch";
    }
    return { next, event };
  }

  if (next.phase === "catch" || next.phase === "fail") {
    next.window -= dt;
    if (pressed || next.window <= 0) {
      if (next.phase === "catch") {
        return { next: beginFishing({ ...next, active: true, fish: null, result: null }, px, next.bobY - 70), event: null };
      }
      next.active = false;
      next.phase = "idle";
      next.result = null;
    }
    return { next, event };
  }

  return { next, event };
}

export function fishingPrompt(s: FishingState, tap: boolean): string {
  const spot = spotName(waterSpot(s.bobY));
  if (!s.active) return tap ? "TAP · fish the Mississippi" : "E · fish the Mississippi";
  if (s.phase === "cast") {
    const aim = s.power < 0.34 ? "shallows" : s.power < 0.7 ? "channel" : "drop-off";
    return tap ? `Hold CAST · ${aim}` : `Hold Space · ${aim}`;
  }
  if (s.phase === "wait") return `${spot} · wait on it…`;
  if (s.phase === "nibble") return `${spot} · nibble…`;
  if (s.phase === "strike") return tap ? "TAP · SET THE HOOK" : "Space · SET THE HOOK";
  if (s.phase === "reel") return tap ? "Hold CAST · ease off in red" : "Hold Space to reel · ease off in red";
  if (s.phase === "catch") return s.fish ? `${s.fish.name} · ${s.weightLb} lb · ${spot}` : "Got one";
  if (s.phase === "fail") return s.result ?? "Got away";
  return "Fish";
}

export function fishingHud(s: FishingState, tap: boolean): FishingHud {
  return {
    active: s.active,
    phase: s.phase,
    power: s.power,
    tension: s.tension,
    progress: s.progress,
    prompt: fishingPrompt(s, tap),
    fishName: s.fish?.name ?? s.result,
    weight: s.weightLb > 0 && s.phase === "catch" ? `${s.weightLb} lb` : null,
    payout: s.phase === "catch" ? s.payout : 0,
    caught: s.caught,
    legendary: s.legendary && s.phase === "catch",
  };
}
