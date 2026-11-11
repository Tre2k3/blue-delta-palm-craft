import type { OutfitId } from "../assets/cast";

export type Facing = "front" | "back" | "left" | "right";

export type Place = "street" | "home" | "hq" | "bowl" | "fun" | "laser";

export type Solid = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** A basket. `dir` points from the rim to the glass along Z. */
export type Hoop = {
  x: number;
  y: number;
  z: number;
  dir: 1 | -1;
  boardZ: number;
  boardHalfW: number;
  boardMinY: number;
  boardMaxY: number;
  rimR: number;
};

export type Anchor = { x: number; z: number };

export type Mode = "title" | "walk" | "drive" | "race" | "hoops" | "bowl" | "fish" | "kart" | "laser" | "bounce" | "pit" | "whack";

export type Overlay = null | "pause" | "map" | "shop" | "wardrobe" | "arcade" | "prizes" | "food" | "results";

export type Catch = { name: string; lb: number; pay: number; rarity: string; color: string };

export type Save = {
  v: 4;
  dollars: number;
  respect: number;
  tickets: number;
  /** Product ids bought at the HQ. */
  owned: string[];
  outfits: OutfitId[];
  wearing: OutfitId;
  /** Index into the story. */
  step: number;
  flags: Record<string, boolean>;
  best: Record<string, number>;
  bait: number;
  cooler: Catch[];
  x: number;
  z: number;
  heading: number;
  /** Where the coupe was left. */
  car: { x: number; z: number; heading: number };
  bounty: number;
  played: number;
};

export type MissionCard = { chapter: string; index: number; total: number; title: string; detail: string };

export type Dialogue = { who: string; text: string; portrait: string | null };

export type Results = {
  title: string;
  sub: string;
  rows: [string, string][];
  pay: number;
  respect: number;
  tickets: number;
  record: boolean;
  /** Label of the replay button, or null when there is nothing to replay. */
  again: string | null;
};

export type HoopsHud = { phase: "run" | "over"; score: number; left: number; shots: number; made: number; streak: number; best: number; call: string; fire: boolean; range: string };
export type BowlHud = { phase: "position" | "aim" | "power" | "roll" | "settle" | "done"; frame: number; ball: number; marks: string[][]; totals: (number | null)[]; total: number; call: string; best: number; standing: boolean[] };
export type FishHud = { phase: "ready" | "charge" | "flying" | "wait" | "bite" | "reel" | "landed" | "lost"; bait: number; distance: number; fish: Catch | null; call: string; cooler: number; value: number };
export type RaceHud = { phase: "count" | "go" | "finish"; count: number; lap: number; laps: number; place: number; racers: number; time: number; best: number; call: string; wrongWay: boolean; kart: boolean };
export type LaserHud = { phase: "count" | "go" | "over"; count: number; left: number; score: number; tags: number; hit: boolean; call: string };
export type BounceHud = { left: number; best: number; combo: number; score: number; call: string };
export type PitHud = { left: number; found: number; total: number; call: string };
export type WhackHud = { left: number; score: number; hits: number; call: string };

export type HudState = {
  mode: Mode;
  overlay: Overlay;
  place: Place;
  dollars: number;
  respect: number;
  tickets: number;
  district: string;
  street: string;
  phase: "golden" | "night" | "day";
  mission: MissionCard | null;
  prompt: string;
  /** Key hints for the mode, "key label" pairs. */
  hints: [string, string][];
  dialogue: Dialogue | null;
  toast: string;
  buff: string;
  wearing: OutfitId;
  outfits: OutfitId[];
  owned: string[];
  bait: number;
  cooler: Catch[];
  best: Record<string, number>;
  target: { id: string; x: number; z: number } | null;
  car: { x: number; z: number };
  hoops: HoopsHud | null;
  bowl: BowlHud | null;
  fish: FishHud | null;
  race: RaceHud | null;
  laser: LaserHud | null;
  bounce: BounceHud | null;
  pit: PitHud | null;
  whack: WhackHud | null;
  driving: boolean;
  results: Results | null;
  /** Product the shop opens on. */
  shopFocus: string | null;
  cabinet: string | null;
  foodAt: "trucks" | "pizza";
  settings: { quality: "low" | "medium" | "high"; music: boolean; sfx: boolean; clock: boolean };
  hasSave: boolean;
  storyDone: boolean;
  touch: boolean;
  /** A gamepad is in use: show its buttons in the hints. */
  pad: boolean;
};

/** Numbers the HUD reads every frame without waiting for a state push. */
export type Live = {
  /** 0..1 fill of the active meter. */
  meter: number;
  /** Green window on the meter. */
  sweetLo: number;
  sweetHi: number;
  /** Aim needle, -1..1. */
  aim: number;
  tension: number;
  speed: number;
  nitro: number;
  /** Black fade between places, 0..1. */
  fade: number;
  /** Objective marker in screen space, 0..1 each way. */
  markX: number;
  markY: number;
  markOn: boolean;
  markDist: number;
  x: number;
  z: number;
  heading: number;
  camYaw: number;
};
