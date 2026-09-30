import { halloweenOn } from "./season";

export const HW_LETTERS = 10;

export type HwSave = {
  letters: string[];
  entered: boolean;
  houseComplete: boolean;
  shootoutBest: number;
  shootout: boolean;
  fishing: boolean;
  bowling: boolean;
  race: boolean;
  food: boolean;
  sponsor: boolean;
  badge: boolean;
};

export function emptyHw(): HwSave {
  return {
    letters: [],
    entered: false,
    houseComplete: false,
    shootoutBest: 0,
    shootout: false,
    fishing: false,
    bowling: false,
    race: false,
    food: false,
    sponsor: false,
    badge: false,
  };
}

export function readHw(raw: unknown): HwSave {
  const base = emptyHw();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<HwSave>;
  return {
    letters: Array.isArray(o.letters) ? o.letters.filter((id) => typeof id === "string") : [],
    entered: !!o.entered,
    houseComplete: !!o.houseComplete,
    shootoutBest: typeof o.shootoutBest === "number" ? o.shootoutBest : 0,
    shootout: !!o.shootout,
    fishing: !!o.fishing,
    bowling: !!o.bowling,
    race: !!o.race,
    food: !!o.food,
    sponsor: !!o.sponsor,
    badge: !!o.badge,
  };
}

export type SponsorSlot = {
  id: string;
  placement: "world" | "court" | "food" | "house" | "race" | "fishing" | "bowling";
  name: string;
  logo: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  active: boolean;
  start: string | null;
  end: string | null;
};

/** Empty slots. No fake businesses. Artwork fills them until a real buy is active. */
export const SPONSOR_SLOTS: SponsorSlot[] = [
  { id: "sponsor_billboard_01", placement: "world", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_billboard_02", placement: "world", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_billboard_03", placement: "world", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_court_01", placement: "court", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_court_02", placement: "court", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_foodtruck_01", placement: "food", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_hauntedhouse_01", placement: "house", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_race_01", placement: "race", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_fishing_01", placement: "fishing", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
  { id: "sponsor_bowling_01", placement: "bowling", name: "", logo: null, videoUrl: null, linkUrl: null, active: false, start: null, end: null },
];

export function activeSponsor(id: string) {
  const slot = SPONSOR_SLOTS.find((s) => s.id === id);
  if (!slot?.active || !slot.logo) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (slot.start && today < slot.start) return null;
  if (slot.end && today > slot.end) return null;
  return slot;
}

export function sponsorArt(id: string, fallback: string) {
  return activeSponsor(id)?.logo ?? fallback;
}

export function presentedBy(id: string) {
  const slot = activeSponsor(id);
  return slot?.name ? `Presented by ${slot.name}` : null;
}

const ART = "/game/halloween";

export const HW_ART = {
  street: `${ART}/world-street.webp`,
  court: `${ART}/court.webp`,
  streetball: `${ART}/streetball.webp`,
  poster: `${ART}/poster.webp`,
  billboard: `${ART}/billboard.webp`,
  hub: `${ART}/hub.webp`,
  house: `${ART}/house-exterior.webp`,
  queue: `${ART}/house-queue.webp`,
  corridor: `${ART}/corridor.webp`,
  boss: `${ART}/boss-arena.webp`,
};

export const BILLBOARD_FALLBACKS = [HW_ART.billboard, HW_ART.poster, HW_ART.hub, HW_ART.street];

export type HauntKind = "tap" | "timing" | "order" | "steam" | "maze" | "shootout";

export type HauntRoom = {
  id: string;
  name: string;
  image: string;
  objective: string;
  scare: string;
  action: string;
  kind: HauntKind;
  letter: { x: number; y: number } | null;
  hotspot: { x: number; y: number };
};

export const HAUNT_ROOMS: HauntRoom[] = [
  { id: "foyer", name: "Entrance Lobby", image: `${ART}/room-foyer.webp`, objective: "The first letter is off the rug. Ring the bell.", scare: "The chandelier swings on its own.", action: "Ring the bell", kind: "tap", letter: { x: 0.24, y: 0.62 }, hotspot: { x: 0.72, y: 0.58 } },
  { id: "stairs", name: "Grand Staircase", image: `${ART}/room-stairs.webp`, objective: "Letter on the banister. Step the creaking board.", scare: "Something answers from the landing.", action: "Step the creak", kind: "tap", letter: { x: 0.32, y: 0.46 }, hotspot: { x: 0.66, y: 0.52 } },
  { id: "portraits", name: "Portrait Hall", image: `${ART}/room-portraits.webp`, objective: "A letter sits behind the cracked frame.", scare: "The portraits turn with you.", action: "Look closer", kind: "tap", letter: { x: 0.78, y: 0.4 }, hotspot: { x: 0.4, y: 0.48 } },
  { id: "toys", name: "Toy Room", image: `${ART}/room-toys.webp`, objective: "Wind the jack. The letter is in the box.", scare: "The toy sits up.", action: "Wind the jack", kind: "tap", letter: { x: 0.26, y: 0.64 }, hotspot: { x: 0.68, y: 0.6 } },
  { id: "banquet", name: "Banquet Hall", image: `${ART}/room-banquet.webp`, objective: "Lift the cloth. The letter is under the table.", scare: "The chairs scrape back.", action: "Lift the cloth", kind: "tap", letter: { x: 0.56, y: 0.7 }, hotspot: { x: 0.3, y: 0.52 } },
  { id: "kitchen", name: "Kitchen", image: `${ART}/room-kitchen.webp`, objective: "Slip the steam, then take the letter off the rack.", scare: "The steam bites.", action: "Slip the steam", kind: "timing", letter: { x: 0.8, y: 0.5 }, hotspot: { x: 0.46, y: 0.62 } },
  { id: "seance", name: "Séance Room", image: `${ART}/room-seance.webp`, objective: "Light the candles 2, then 1, then 3.", scare: "The table rejects the order.", action: "Light the candles", kind: "order", letter: { x: 0.22, y: 0.6 }, hotspot: { x: 0.55, y: 0.52 } },
  { id: "boiler", name: "Boiler Room", image: `${ART}/room-boiler.webp`, objective: "Hit the valve when the steam drops.", scare: "The pipe bursts.", action: "Hit the valve", kind: "steam", letter: { x: 0.74, y: 0.42 }, hotspot: { x: 0.38, y: 0.64 } },
  { id: "attic", name: "Attic", image: `${ART}/room-attic.webp`, objective: "Walk the path: left, up, right. Letter is in the trunk.", scare: "You turned into the cobwebs.", action: "Walk left, up, right", kind: "maze", letter: { x: 0.3, y: 0.38 }, hotspot: { x: 0.62, y: 0.48 } },
  { id: "cathedral", name: "Basketball Cathedral", image: `${ART}/room-cathedral.webp`, objective: "10 Letters Shootout. Make 10 on the real hoop.", scare: "The rim goes quiet.", action: "Start the shootout", kind: "shootout", letter: null, hotspot: { x: 0.5, y: 0.66 } },
];

export type HauntLive = {
  room: number;
  x: number;
  y: number;
  acted: boolean;
  puzzleStep: number;
  scare: string | null;
  note: string | null;
  lastDir: string | null;
};

export function enterHauntLive(): HauntLive {
  return { room: 0, x: 0.5, y: 0.84, acted: false, puzzleStep: 0, scare: null, note: null, lastDir: null };
}

const NEAR = 0.085;

function near(x: number, y: number, p: { x: number; y: number }) {
  return Math.hypot(x - p.x, y - p.y) < NEAR;
}

export type HauntEvent = "letter" | "acted" | "next" | "shootout" | "scare" | null;

export function tickHaunt(live: HauntLive, dt: number, mx: number, my: number, use: boolean, clock: number, letters: string[]): { live: HauntLive; event: HauntEvent } {
  const room = HAUNT_ROOMS[live.room] ?? HAUNT_ROOMS[0]!;
  const next = { ...live };
  next.x = Math.min(0.94, Math.max(0.06, next.x + mx * 0.42 * dt));
  next.y = Math.min(0.92, Math.max(0.1, next.y + my * 0.42 * dt));
  let event: HauntEvent = null;
  const got = !room.letter || letters.includes(room.id);

  if (room.kind === "timing") {
    const bar = (Math.sin(clock * 2.6) + 1) / 2;
    next.note = bar > 0.78 ? "NOW — slip the steam" : "Wait for the green";
  } else if (room.kind === "steam") {
    const clear = clock % 2.4 < 1.15;
    next.note = clear ? "Valve is clear" : "STEAM — hold";
  } else if (room.kind === "order" && !next.acted) {
    next.note = `Candles: light ${[2, 1, 3][next.puzzleStep] ?? 2} next`;
  } else if (room.kind === "maze" && !next.acted) {
    const need = (["left", "up", "right"] as const)[next.puzzleStep] ?? "left";
    next.note = `Path ${next.puzzleStep + 1}/3 · go ${need}`;
    let dir: string | null = null;
    if (mx < -0.55) dir = "left";
    else if (mx > 0.55) dir = "right";
    else if (my < -0.55) dir = "up";
    else if (my > 0.55) dir = "down";
    if (dir && dir !== next.lastDir) {
      next.lastDir = dir;
      if (dir === need) {
        next.puzzleStep += 1;
        if (next.puzzleStep >= 3) {
          next.acted = true;
          next.note = "Path clear.";
          event = "acted";
        }
      } else {
        next.puzzleStep = 0;
        next.scare = room.scare;
        event = "scare";
      }
    } else if (!dir) next.lastDir = null;
  } else if (next.acted) next.note = got ? "Door's open." : "Grab the letter.";
  else next.note = room.action;

  if (use && room.letter && !got && near(next.x, next.y, room.letter)) {
    event = "letter";
    next.scare = null;
  } else if (use && !next.acted && near(next.x, next.y, room.hotspot)) {
    if (room.kind === "shootout") event = "shootout";
    else if (room.kind === "timing") {
      const bar = (Math.sin(clock * 2.6) + 1) / 2;
      if (bar > 0.78) {
        next.acted = true;
        event = "acted";
      } else {
        next.scare = room.scare;
        event = "scare";
      }
    } else if (room.kind === "steam") {
      const clear = clock % 2.4 < 1.15;
      if (clear) {
        next.acted = true;
        event = "acted";
      } else {
        next.scare = room.scare;
        event = "scare";
      }
    } else if (room.kind === "tap") {
      next.acted = true;
      next.scare = room.scare;
      event = "acted";
    }
  } else if (use && next.room < HAUNT_ROOMS.length - 1 && got && next.acted && near(next.x, next.y, { x: 0.5, y: 0.16 })) {
    next.room += 1;
    next.x = 0.5;
    next.y = 0.84;
    next.acted = false;
    next.puzzleStep = 0;
    next.scare = null;
    next.lastDir = null;
    event = "next";
  }
  return { live: next, event };
}

export function hauntOrderPress(live: HauntLive, n: number): { live: HauntLive; event: HauntEvent } {
  const room = HAUNT_ROOMS[live.room];
  if (!room || room.kind !== "order" || live.acted) return { live, event: null };
  const seq = [2, 1, 3];
  const next = { ...live, scare: null as string | null };
  if (n === seq[next.puzzleStep]) {
    next.puzzleStep += 1;
    if (next.puzzleStep >= 3) {
      next.acted = true;
      next.note = "The circle holds.";
      return { live: next, event: "acted" };
    }
    next.note = `Candles: light ${seq[next.puzzleStep]} next`;
    return { live: next, event: null };
  }
  next.puzzleStep = 0;
  next.scare = room.scare;
  next.note = "Start over. 2, then 1, then 3.";
  return { live: next, event: "scare" };
}

export const HW_NPC = [
  "Memphis different after dark.",
  "You going in that haunted house?",
  "Make that shot.",
  "I heard something moving upstairs.",
  "Food truck line worth it though.",
  "Fog sitting on the river again.",
  "Orange lights, green trim. That's the drop.",
  "Don't rush the release. The rim is awake.",
];

export function halloweenNpcLine(seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i) * (i + 3)) % HW_NPC.length;
  return HW_NPC[n] ?? HW_NPC[0]!;
}

export const SEASON_FISH = new Set(["ghostcat", "pumpkinbass", "midnightcarp", "memphis_monster"]);

export type HwChecklist = { id: string; label: string; done: boolean };

export function masterChecklist(hw: HwSave): HwChecklist[] {
  return [
    { id: "enter", label: "Enter the haunted house", done: hw.entered },
    { id: "letters", label: `Find all ${HW_LETTERS} letters`, done: hw.letters.length >= HW_LETTERS },
    { id: "shoot", label: "Finish the haunted shootout", done: hw.shootout },
    { id: "fish", label: "Catch a seasonal fish", done: hw.fishing },
    { id: "bowl", label: "Bowl a strike", done: hw.bowling },
    { id: "race", label: "Finish the Halloween race", done: hw.race },
    { id: "food", label: "Try the After Dark menu", done: hw.food },
    { id: "sponsor", label: "Visit a sponsor slot", done: hw.sponsor },
  ];
}

export function masterReady(hw: HwSave) {
  return masterChecklist(hw).every((row) => row.done);
}

export type WorldEventKind = "bats" | "blackout" | "fog" | "pumpkin" | "ghost" | "midnight";

export const WORLD_EVENTS: { kind: WorldEventKind; text: string }[] = [
  { kind: "bats", text: "BAT SWARM" },
  { kind: "blackout", text: "BLACKOUT" },
  { kind: "fog", text: "FOG WAVE" },
  { kind: "pumpkin", text: "PUMPKIN DROP · walk into it" },
  { kind: "ghost", text: "GHOST CAR" },
  { kind: "midnight", text: "MIDNIGHT BONUS" },
];

export function seasonalFoodOn() {
  return halloweenOn();
}
