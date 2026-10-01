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
  cleared: string[];
  visited: string[];
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
    cleared: [],
    visited: [],
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
    cleared: Array.isArray(o.cleared) ? o.cleared.filter((id) => typeof id === "string") : [],
    visited: Array.isArray(o.visited) ? o.visited.filter((id) => typeof id === "string") : [],
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
  house: `${ART}/haunted-house/exterior.webp`,
  queue: `${ART}/house-queue.webp`,
  corridor: `${ART}/corridor.webp`,
  boss: `${ART}/boss-arena.webp`,
  map: `${ART}/haunted-house/floor-plan.webp`,
};

export const BILLBOARD_FALLBACKS = [HW_ART.billboard, HW_ART.poster, HW_ART.hub, HW_ART.street];

export type HauntKind = "tap" | "timing" | "order" | "steam" | "maze" | "shootout";
export type HauntPads = "candles" | "books" | null;
export type HauntGate = "open" | "letter" | "acted" | "both";

export type HauntExit = {
  x: number;
  dest: string;
  spawn: number;
  back?: boolean;
  label: string;
};

export type HauntRoom = {
  id: string;
  name: string;
  image: string;
  objective: string;
  scare: string;
  action: string;
  verb: string;
  kind: HauntKind;
  gate: HauntGate;
  letter: { x: number; y: number } | null;
  hotspot: { x: number; y: number };
  decoys: { x: number; y: number }[];
  lurk: { x: number; y: number };
  scareImg: string;
  yell: string;
  floorY: number;
  farY: number;
  nearY: number;
  walkMinX: number;
  walkMaxX: number;
  spawnX: number;
  doorX: number;
  view: number;
  tint: "warm" | "hex" | "cool";
  exits: HauntExit[];
  seq: number[];
  pads: HauntPads;
  loot: boolean;
  aspect: string;
  alt: string | null;
};

const SCARE = `${ART}/scares`;
const HOUSE = `${ART}/haunted-house`;
const WIDE = "4 / 3";

function room(partial: HauntRoom): HauntRoom {
  return partial;
}

const walk = { walkMinX: 0.08, walkMaxX: 0.92, view: 0.56 };

export const HAUNT_ROOMS: HauntRoom[] = [
  room({
    id: "ticket", name: "Ticket Entry", image: `${HOUSE}/ticket.webp`,
    objective: "Walk to the gate.", scare: "The rope drops.", action: "Inspect the booth", verb: "Inspect",
    kind: "tap", gate: "open", letter: null,
    hotspot: { x: 0.46, y: 0.8 }, decoys: [], lurk: { x: 0.62, y: 0.78 },
    scareImg: `${SCARE}/foyer.webp`, yell: "TICKETS.",
    floorY: 0.84, farY: 0.76, nearY: 0.9, spawnX: 0.16, doorX: 0.84,
    ...walk, tint: "warm",
    exits: [{ x: 0.86, dest: "foyer", spawn: 0.14, label: "Enter" }],
    seq: [], pads: null, loot: false, aspect: "3 / 2", alt: null,
  }),
  room({
    id: "foyer", name: "Entrance Lobby", image: `${HOUSE}/foyer.webp`,
    objective: "Pick up the letter.", scare: "The chandelier flickers.", action: "Inspect the portrait", verb: "Inspect",
    kind: "tap", gate: "letter", letter: { x: 0.4, y: 0.84 },
    hotspot: { x: 0.62, y: 0.8 }, decoys: [], lurk: { x: 0.55, y: 0.78 },
    scareImg: `${SCARE}/foyer.webp`, yell: "WELCOME IN.",
    floorY: 0.86, farY: 0.78, nearY: 0.9, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "warm",
    exits: [
      { x: 0.12, dest: "ticket", spawn: 0.78, back: true, label: "Back" },
      { x: 0.88, dest: "stairs", spawn: 0.16, label: "Enter" },
    ],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "stairs", name: "Grand Staircase", image: `${HOUSE}/stairs.webp`,
    objective: "Check the landing.", scare: "A shadow crosses the landing.", action: "Check the landing", verb: "Follow",
    kind: "tap", gate: "acted", letter: null,
    hotspot: { x: 0.58, y: 0.84 }, decoys: [], lurk: { x: 0.48, y: 0.8 },
    scareImg: `${SCARE}/stairs.webp`, yell: "YOU'RE LATE.",
    floorY: 0.88, farY: 0.8, nearY: 0.92, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "warm",
    exits: [
      { x: 0.12, dest: "foyer", spawn: 0.8, back: true, label: "Back" },
      { x: 0.88, dest: "portraits", spawn: 0.14, label: "Enter" },
    ],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "portraits", name: "Portrait Corridor", image: `${HOUSE}/portraits.webp`,
    objective: "Inspect the portrait that changed.", scare: "The eyes follow you.", action: "Inspect the frame", verb: "Inspect",
    kind: "tap", gate: "both", letter: { x: 0.62, y: 0.84 },
    hotspot: { x: 0.48, y: 0.8 }, decoys: [{ x: 0.3, y: 0.8 }, { x: 0.72, y: 0.8 }], lurk: { x: 0.5, y: 0.78 },
    scareImg: `${SCARE}/portraits.webp`, yell: "WRONG FRAME.",
    floorY: 0.86, farY: 0.78, nearY: 0.9, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "warm",
    exits: [
      { x: 0.1, dest: "stairs", spawn: 0.8, back: true, label: "Back" },
      { x: 0.22, dest: "toys", spawn: 0.16, label: "Toys" },
      { x: 0.9, dest: "banquet", spawn: 0.16, label: "Dining" },
    ],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "toys", name: "Toy Room", image: `${HOUSE}/toys.webp`,
    objective: "Open the chest.", scare: "A doll turns its head.", action: "Open the chest", verb: "Open",
    kind: "tap", gate: "both", letter: { x: 0.34, y: 0.86 },
    hotspot: { x: 0.58, y: 0.84 }, decoys: [{ x: 0.28, y: 0.84 }], lurk: { x: 0.5, y: 0.82 },
    scareImg: `${SCARE}/toys.webp`, yell: "NOT THAT ONE.",
    floorY: 0.88, farY: 0.8, nearY: 0.92, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "warm",
    exits: [
      { x: 0.1, dest: "portraits", spawn: 0.28, back: true, label: "Back" },
      { x: 0.88, dest: "seance", spawn: 0.16, label: "Enter" },
    ],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "banquet", name: "Banquet Hall", image: `${HOUSE}/dining.webp`,
    objective: "Search the table.", scare: "A chair scrapes back.", action: "Search the table", verb: "Search",
    kind: "tap", gate: "both", letter: { x: 0.66, y: 0.88 },
    hotspot: { x: 0.48, y: 0.86 }, decoys: [], lurk: { x: 0.55, y: 0.84 },
    scareImg: `${SCARE}/banquet.webp`, yell: "SIT DOWN.",
    floorY: 0.9, farY: 0.82, nearY: 0.94, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "warm",
    exits: [
      { x: 0.1, dest: "portraits", spawn: 0.82, back: true, label: "Back" },
      { x: 0.88, dest: "seance", spawn: 0.82, label: "Enter" },
    ],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "seance", name: "Séance Room", image: `${HOUSE}/seance.webp`,
    objective: "Light the candles. 2, then 1, then 3.", scare: "The circle breaks.", action: "Light the candles", verb: "Light",
    kind: "order", gate: "both", letter: { x: 0.34, y: 0.86 },
    hotspot: { x: 0.55, y: 0.84 }, decoys: [], lurk: { x: 0.5, y: 0.82 },
    scareImg: `${SCARE}/seance.webp`, yell: "SHE SAID YOUR NAME.",
    floorY: 0.88, farY: 0.8, nearY: 0.92, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "hex",
    exits: [
      { x: 0.1, dest: "toys", spawn: 0.8, back: true, label: "Back" },
      { x: 0.88, dest: "library", spawn: 0.16, label: "Enter" },
    ],
    seq: [2, 1, 3], pads: "candles", loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "library", name: "Library", image: `${HOUSE}/library.webp`,
    objective: "Pull the books. I, then III, then II.", scare: "A book hits the floor.", action: "Pull the books", verb: "Pull",
    kind: "order", gate: "both", letter: { x: 0.68, y: 0.8 },
    hotspot: { x: 0.46, y: 0.78 }, decoys: [], lurk: { x: 0.4, y: 0.76 },
    scareImg: `${SCARE}/library.webp`, yell: "WRONG BOOK.",
    floorY: 0.82, farY: 0.74, nearY: 0.88, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "warm",
    exits: [
      { x: 0.1, dest: "seance", spawn: 0.8, back: true, label: "Back" },
      { x: 0.88, dest: "passage", spawn: 0.16, label: "Enter" },
    ],
    seq: [1, 3, 2], pads: "books", loot: false, aspect: "392 / 236", alt: null,
  }),
  room({
    id: "passage", name: "Secret Passage", image: `${HOUSE}/passage.webp`,
    objective: "Reach the far latch.", scare: "Someone is at the far end.", action: "Throw the latch", verb: "Use",
    kind: "tap", gate: "acted", letter: null,
    hotspot: { x: 0.62, y: 0.82 }, decoys: [], lurk: { x: 0.48, y: 0.8 },
    scareImg: `${SCARE}/boiler.webp`, yell: "KEEP MOVING.",
    floorY: 0.84, farY: 0.76, nearY: 0.9, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "hex",
    exits: [
      { x: 0.1, dest: "library", spawn: 0.8, back: true, label: "Back" },
      { x: 0.28, dest: "kitchen", spawn: 0.16, label: "Kitchen" },
      { x: 0.9, dest: "boiler", spawn: 0.16, label: "Boiler" },
    ],
    seq: [], pads: null, loot: true, aspect: "16 / 9", alt: null,
  }),
  room({
    id: "kitchen", name: "Kitchen", image: `${HOUSE}/kitchen.webp`,
    objective: "Slip the steam, then take the letter.", scare: "The lights drop.", action: "Slip the steam", verb: "Slip",
    kind: "timing", gate: "both", letter: { x: 0.7, y: 0.86 },
    hotspot: { x: 0.46, y: 0.84 }, decoys: [], lurk: { x: 0.38, y: 0.82 },
    scareImg: `${SCARE}/kitchen.webp`, yell: "NOT YET.",
    floorY: 0.88, farY: 0.8, nearY: 0.92, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "warm",
    exits: [
      { x: 0.1, dest: "passage", spawn: 0.34, back: true, label: "Back" },
      { x: 0.88, dest: "attic", spawn: 0.18, label: "Enter" },
    ],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "boiler", name: "Boiler Room", image: `${HOUSE}/boiler.webp`,
    objective: "Turn the valve when the steam drops.", scare: "A pipe blows.", action: "Turn the valve", verb: "Turn",
    kind: "steam", gate: "both", letter: { x: 0.68, y: 0.84 },
    hotspot: { x: 0.42, y: 0.82 }, decoys: [], lurk: { x: 0.55, y: 0.8 },
    scareImg: `${SCARE}/boiler.webp`, yell: "TOO HOT.",
    floorY: 0.86, farY: 0.78, nearY: 0.9, spawnX: 0.16, doorX: 0.86,
    ...walk, tint: "hex",
    exits: [
      { x: 0.1, dest: "passage", spawn: 0.82, back: true, label: "Back" },
      { x: 0.88, dest: "attic", spawn: 0.78, label: "Enter" },
    ],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "attic", name: "Attic", image: `${HOUSE}/attic.webp`,
    objective: "Search the trunk.", scare: "A shadow crosses the moon.", action: "Search the trunk", verb: "Search",
    kind: "tap", gate: "both", letter: { x: 0.36, y: 0.84 },
    hotspot: { x: 0.58, y: 0.82 }, decoys: [{ x: 0.24, y: 0.82 }], lurk: { x: 0.5, y: 0.8 },
    scareImg: `${SCARE}/attic.webp`, yell: "EMPTY.",
    floorY: 0.86, farY: 0.78, nearY: 0.9, spawnX: 0.18, doorX: 0.86,
    ...walk, tint: "cool",
    exits: [
      { x: 0.1, dest: "kitchen", spawn: 0.8, back: true, label: "Back" },
      { x: 0.88, dest: "cathedral", spawn: 0.16, label: "Enter" },
    ],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: null,
  }),
  room({
    id: "cathedral", name: "Basketball Cathedral", image: `${HOUSE}/cathedral.webp`,
    objective: "Make 10 on the real hoop.", scare: "The rim goes quiet.", action: "Start the shootout", verb: "Play",
    kind: "shootout", gate: "acted", letter: null,
    hotspot: { x: 0.55, y: 0.82 }, decoys: [], lurk: { x: 0.42, y: 0.8 },
    scareImg: `${SCARE}/cathedral.webp`, yell: "TEN SHOTS.",
    floorY: 0.86, farY: 0.78, nearY: 0.9, spawnX: 0.18, doorX: 0.5,
    ...walk, tint: "cool",
    exits: [{ x: 0.1, dest: "attic", spawn: 0.8, back: true, label: "Back" }],
    seq: [], pads: null, loot: false, aspect: WIDE, alt: `${HOUSE}/cathedral-alt.webp`,
  }),
];
export const HAUNT_HALL_Y = 0.82;
export const HAUNT_BODY = 0.34;
export const BENJI_FEET: Record<string, { foot: number; crown: number }> = {
  hw_doll: { foot: 701 / 780, crown: 139 / 780 },
  hw_sackrow: { foot: 671 / 780, crown: 26 / 780 },
  hw_claw: { foot: 763 / 780, crown: 16 / 780 },
};

export function benjiStand(outfit: string) {
  if (outfit.includes("hw_sackrow")) return BENJI_FEET.hw_sackrow!;
  if (outfit.includes("hw_claw")) return BENJI_FEET.hw_claw!;
  return BENJI_FEET.hw_doll!;
}

export type HauntLive = {
  room: number;
  x: number;
  y: number;
  acted: boolean;
  popped: boolean;
  puzzleStep: number;
  scare: string | null;
  note: string | null;
  lastDir: string | null;
  scareT: number;
  scareImg: string | null;
  scareLine: string | null;
  lineT: number;
  hall: number;
  halling: boolean;
  hallHit: boolean;
  looted: boolean;
  from: string;
  pendingSpawn: number;
  pendingDest: number;
};

function midY(room: HauntRoom) {
  return (room.farY + room.nearY) / 2;
}

export function enterHauntLive(cleared: string[] = []): HauntLive {
  const room = HAUNT_ROOMS[0]!;
  return {
    room: 0, x: room.spawnX, y: midY(room), acted: cleared.includes(room.id), popped: false, puzzleStep: 0,
    scare: null, note: null, lastDir: null,
    scareT: 0, scareImg: null, scareLine: null, lineT: 0, hall: 0, halling: false, hallHit: false,
    looted: false, from: "", pendingSpawn: room.spawnX, pendingDest: 0,
  };
}

const NEAR_X = 0.075;
const NEAR_Y = 0.09;

export function hauntClose(x: number, y: number, tx: number, ty: number) {
  const dx = (x - tx) / NEAR_X;
  const dy = (y - ty) / NEAR_Y;
  return dx * dx + dy * dy < 1;
}

export function hauntDoorOpen(room: HauntRoom, acted: boolean, got: boolean, cleared: string[]) {
  if (room.gate === "open" || cleared.includes(room.id)) return true;
  if (room.gate === "letter") return got;
  if (room.gate === "acted") return acted;
  return acted && got;
}

export function hauntPrompt(room: HauntRoom, live: HauntLive, got: boolean, cleared: string[] = []) {
  if (live.halling || live.scareT > 0.2) return null;
  if (room.letter && !got && hauntClose(live.x, live.y, room.letter.x, room.letter.y)) return "Collect";
  if (room.loot && !live.looted && hauntClose(live.x, live.y, room.hotspot.x, room.hotspot.y)) return "Take";
  if (!live.acted && hauntClose(live.x, live.y, room.hotspot.x, room.hotspot.y)) {
    if (room.kind === "order") return null;
    if (room.kind === "shootout") return "Play";
    return room.verb;
  }
  if (room.kind === "shootout" && live.acted && hauntClose(live.x, live.y, room.hotspot.x, room.hotspot.y)) return "Play";
  const open = hauntDoorOpen(room, live.acted, got, cleared);
  for (const exit of room.exits) {
    if (!hauntClose(live.x, live.y, exit.x, room.nearY)) continue;
    if (exit.back || open) return exit.label;
  }
  return null;
}

export type HauntEvent = "letter" | "acted" | "next" | "shootout" | "scare" | "pop" | "hall" | "loot" | null;

function beginPop(next: HauntLive, img: string, line: string, hold = 1.35): HauntEvent {
  next.scareT = hold;
  next.scareImg = img;
  next.scareLine = line;
  next.lineT = 1.1;
  return "pop";
}

function arrive(next: HauntLive, index: number, spawnX: number, fromId: string, cleared: string[]) {
  const room = HAUNT_ROOMS[index] ?? HAUNT_ROOMS[0]!;
  next.room = index;
  next.halling = false;
  next.hall = 0;
  next.hallHit = false;
  next.x = spawnX;
  next.y = midY(room);
  next.acted = cleared.includes(room.id);
  next.popped = false;
  next.puzzleStep = 0;
  next.scareT = 0;
  next.scareImg = null;
  next.scareLine = null;
  next.lineT = 0;
  next.lastDir = null;
  next.scare = null;
  next.note = null;
  next.looted = false;
  next.from = fromId;
}

export function tickHaunt(live: HauntLive, dt: number, mx: number, my: number, use: boolean, clock: number, letters: string[], cleared: string[] = []): { live: HauntLive; event: HauntEvent } {
  const room = HAUNT_ROOMS[live.room] ?? HAUNT_ROOMS[0]!;
  const next = { ...live };
  let event: HauntEvent = null;
  if (next.scareT > 0) next.scareT = Math.max(0, next.scareT - dt);
  if (next.lineT > 0) next.lineT = Math.max(0, next.lineT - dt);
  if (next.lineT <= 0) next.scareLine = null;

  if (next.halling) {
    next.hall = Math.max(0, next.hall - dt);
    next.note = null;
    if (next.hall <= 0) {
      arrive(next, next.pendingDest, next.pendingSpawn, room.id, cleared);
      event = "next";
    }
    return { live: next, event };
  }

  next.x = Math.min(room.walkMaxX, Math.max(room.walkMinX, next.x + mx * 0.46 * dt));
  next.y = Math.min(room.nearY, Math.max(room.farY, next.y + my * 0.18 * dt));
  const got = !room.letter || letters.includes(room.id);
  const open = hauntDoorOpen(room, next.acted, got, cleared);

  if (room.kind === "timing" && !next.acted) {
    const bar = (Math.sin(clock * 2.6) + 1) / 2;
    next.note = bar > 0.78 ? "Steam's down" : null;
  } else if (room.kind === "steam" && !next.acted) {
    const clear = clock % 2.4 < 1.15;
    next.note = clear ? "Valve's clear" : null;
  } else if (room.kind === "order" && !next.acted) {
    const seq = room.seq.length ? room.seq : [2, 1, 3];
    next.note = room.pads === "books" ? `Book ${["I", "II", "III"][(seq[next.puzzleStep] ?? 1) - 1]}` : `Candle ${seq[next.puzzleStep] ?? seq[0]}`;
  } else next.note = null;

  if (!next.popped && hauntClose(next.x, next.y, room.lurk.x, room.lurk.y)) {
    next.popped = true;
    return { live: next, event: beginPop(next, room.scareImg, room.yell, 1.2) };
  }

  if (use && room.kind === "shootout" && hauntClose(next.x, next.y, room.hotspot.x, room.hotspot.y)) {
    next.acted = true;
    return { live: next, event: "shootout" };
  }

  if (use && room.letter && !got && hauntClose(next.x, next.y, room.letter.x, room.letter.y)) {
    event = "letter";
  } else if (use && room.loot && !next.looted && hauntClose(next.x, next.y, room.hotspot.x, room.hotspot.y)) {
    next.looted = true;
    event = "loot";
  } else if (use && !next.acted && room.kind !== "shootout" && room.kind !== "order" && hauntClose(next.x, next.y, room.hotspot.x, room.hotspot.y)) {
    if (room.kind === "timing") {
      const bar = (Math.sin(clock * 2.6) + 1) / 2;
      if (bar > 0.78) {
        next.acted = true;
        event = "acted";
      } else event = beginPop(next, room.scareImg, "NOT YET.", 0.7);
    } else if (room.kind === "steam") {
      const clear = clock % 2.4 < 1.15;
      if (clear) {
        next.acted = true;
        event = "acted";
      } else event = beginPop(next, room.scareImg, "TOO HOT.", 0.7);
    } else if (room.kind === "tap") {
      next.acted = true;
      event = "acted";
    }
  } else if (use) {
    const decoy = room.decoys.find((d) => hauntClose(next.x, next.y, d.x, d.y));
    if (decoy) event = beginPop(next, room.scareImg, room.yell, 0.8);
    else {
      const exit = room.exits.find((e) => hauntClose(next.x, next.y, e.x, room.nearY) && (e.back || open));
      if (exit) {
        const dest = HAUNT_ROOMS.findIndex((r) => r.id === exit.dest);
        if (dest >= 0) {
          next.pendingDest = dest;
          next.pendingSpawn = exit.spawn;
          next.halling = true;
          next.hall = 0.62;
          next.note = null;
          event = "hall";
        }
      }
    }
  }
  return { live: next, event };
}

export function hauntOrderPress(live: HauntLive, n: number): { live: HauntLive; event: HauntEvent } {
  const room = HAUNT_ROOMS[live.room];
  if (!room || room.kind !== "order" || live.acted) return { live, event: null };
  const seq = room.seq.length ? room.seq : [2, 1, 3];
  const next = { ...live, scare: null as string | null };
  if (n === seq[next.puzzleStep]) {
    next.puzzleStep += 1;
    if (next.puzzleStep >= seq.length) {
      next.acted = true;
      next.note = room.pads === "books" ? "The shelf gives." : "The circle holds.";
      return { live: next, event: "acted" };
    }
    const label = room.pads === "books" ? "Books" : "Candles";
    next.note = `${label}: ${seq[next.puzzleStep]} next`;
    return { live: next, event: null };
  }
  next.puzzleStep = 0;
  next.scare = room.scare;
  next.note = room.pads === "books" ? "Start over. 1, then 3, then 2." : "Start over. 2, then 1, then 3.";
  beginPop(next, room.scareImg, room.yell, 0.62);
  return { live: next, event: "pop" };
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
