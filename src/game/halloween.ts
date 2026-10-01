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
  house: `${ART}/haunted-house/exterior.webp`,
  queue: `${ART}/house-queue.webp`,
  corridor: `${ART}/corridor.webp`,
  boss: `${ART}/boss-arena.webp`,
  map: `${ART}/haunted-house/floor-plan.webp`,
};

export const BILLBOARD_FALLBACKS = [HW_ART.billboard, HW_ART.poster, HW_ART.hub, HW_ART.street];

export type HauntKind = "tap" | "timing" | "order" | "steam" | "maze" | "shootout";
export type HauntPads = "candles" | "books" | null;

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
  lurk: { x: number; y: number };
  scareImg: string;
  yell: string;
  floorY: number;
  walkMinX: number;
  walkMaxX: number;
  spawnX: number;
  doorX: number;
  seq: number[];
  pads: HauntPads;
  loot: boolean;
  aspect: string;
  alt: string | null;
};

const SCARE = `${ART}/scares`;
const HOUSE = `${ART}/haunted-house`;
const GROUND = { walkMinX: 0.1, walkMaxX: 0.9, spawnX: 0.18, doorX: 0.78 };
const WIDE = "4 / 3";

export const HAUNT_ROOMS: HauntRoom[] = [
  { id: "ticket", name: "Ticket Entry", image: `${HOUSE}/ticket.webp`, objective: "Tickets get checked here. Then you walk in.", scare: "The rope drops.", action: "Keep walking", kind: "tap", letter: null, hotspot: { x: 0.62, y: 0 }, lurk: { x: 0.55, y: 0.42 }, scareImg: `${SCARE}/foyer.webp`, yell: "TICKETS.", floorY: 0.84, ...GROUND, seq: [], pads: null, loot: false, aspect: "3 / 2", alt: null },
  { id: "foyer", name: "Entrance Lobby", image: `${HOUSE}/foyer.webp`, objective: "Walk the checkered floor. The first letter is on it.", scare: "The chandelier flickers.", action: "Keep walking", kind: "tap", letter: { x: 0.36, y: 0 }, hotspot: { x: 0.7, y: 0 }, lurk: { x: 0.58, y: 0.4 }, scareImg: `${SCARE}/foyer.webp`, yell: "TICKETS ARE IN THE BACK.", floorY: 0.86, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: null },
  { id: "stairs", name: "Grand Staircase", image: `${HOUSE}/stairs.webp`, objective: "Stay on the carpet. The landing is already occupied.", scare: "A shadow crosses the landing.", action: "Keep walking", kind: "tap", letter: null, hotspot: { x: 0.6, y: 0 }, lurk: { x: 0.52, y: 0.32 }, scareImg: `${SCARE}/stairs.webp`, yell: "YOU'RE LATE.", floorY: 0.88, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: null },
  { id: "portraits", name: "Portrait Corridor", image: `${HOUSE}/portraits.webp`, objective: "One frame is watching. The letter is down the hall.", scare: "The eyes follow you.", action: "Keep walking", kind: "tap", letter: { x: 0.66, y: 0 }, hotspot: { x: 0.48, y: 0 }, lurk: { x: 0.46, y: 0.34 }, scareImg: `${SCARE}/portraits.webp`, yell: "I SEE YOU.", floorY: 0.86, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: null },
  { id: "toys", name: "Toy Room", image: `${HOUSE}/toys.webp`, objective: "The chest is the scare. The letter is on the rug.", scare: "A doll turns its head.", action: "Keep walking", kind: "tap", letter: { x: 0.34, y: 0 }, hotspot: { x: 0.58, y: 0 }, lurk: { x: 0.56, y: 0.42 }, scareImg: `${SCARE}/toys.webp`, yell: "PLAY WITH ME.", floorY: 0.88, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: null },
  { id: "banquet", name: "Banquet Hall", image: `${HOUSE}/dining.webp`, objective: "Stay in front of the table. Search the near edge.", scare: "A chair scrapes back.", action: "Keep walking", kind: "tap", letter: { x: 0.62, y: 0 }, hotspot: { x: 0.48, y: 0 }, lurk: { x: 0.5, y: 0.38 }, scareImg: `${SCARE}/banquet.webp`, yell: "SIT DOWN.", floorY: 0.9, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: null },
  { id: "seance", name: "Séance Room", image: `${HOUSE}/seance.webp`, objective: "Light the candles 2, then 1, then 3.", scare: "The circle breaks.", action: "Light the candles", kind: "order", letter: { x: 0.32, y: 0 }, hotspot: { x: 0.55, y: 0 }, lurk: { x: 0.54, y: 0.38 }, scareImg: `${SCARE}/seance.webp`, yell: "SHE SAID YOUR NAME.", floorY: 0.88, ...GROUND, seq: [2, 1, 3], pads: "candles", loot: false, aspect: WIDE, alt: null },
  { id: "library", name: "Library", image: `${HOUSE}/library.webp`, objective: "Pull the books 1, then 3, then 2. Letter is by the shelf.", scare: "A book hits the floor.", action: "Pull the books", kind: "order", letter: { x: 0.68, y: 0 }, hotspot: { x: 0.5, y: 0 }, lurk: { x: 0.44, y: 0.36 }, scareImg: `${SCARE}/library.webp`, yell: "QUIET IN THE STACKS.", floorY: 0.82, ...GROUND, seq: [1, 3, 2], pads: "books", loot: false, aspect: "392 / 236", alt: null },
  { id: "passage", name: "Secret Passage", image: `${HOUSE}/passage.webp`, objective: "Keep to the floor. Take the chain if you see it.", scare: "Someone is at the far end.", action: "Keep walking", kind: "tap", letter: null, hotspot: { x: 0.7, y: 0 }, lurk: { x: 0.48, y: 0.34 }, scareImg: `${SCARE}/boiler.webp`, yell: "WRONG HALL.", floorY: 0.84, ...GROUND, seq: [], pads: null, loot: true, aspect: "16 / 9", alt: null },
  { id: "kitchen", name: "Kitchen", image: `${HOUSE}/kitchen.webp`, objective: "Slip the steam, then take the letter.", scare: "The lights drop.", action: "Slip the steam", kind: "timing", letter: { x: 0.7, y: 0 }, hotspot: { x: 0.48, y: 0 }, lurk: { x: 0.42, y: 0.4 }, scareImg: `${SCARE}/kitchen.webp`, yell: "ORDER UP.", floorY: 0.88, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: null },
  { id: "boiler", name: "Boiler Room", image: `${HOUSE}/boiler.webp`, objective: "Hit the valve when the steam drops.", scare: "A pipe blows.", action: "Hit the valve", kind: "steam", letter: { x: 0.68, y: 0 }, hotspot: { x: 0.4, y: 0 }, lurk: { x: 0.5, y: 0.36 }, scareImg: `${SCARE}/boiler.webp`, yell: "IT'S HOT BACK HERE.", floorY: 0.86, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: null },
  { id: "attic", name: "Attic", image: `${HOUSE}/attic.webp`, objective: "On the floor: left, up, right. Letter is in the trunk line.", scare: "A shadow crosses the moon.", action: "Walk left, up, right", kind: "maze", letter: { x: 0.34, y: 0 }, hotspot: { x: 0.58, y: 0 }, lurk: { x: 0.52, y: 0.3 }, scareImg: `${SCARE}/attic.webp`, yell: "FOUND YOU.", floorY: 0.86, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: null },
  { id: "cathedral", name: "Basketball Cathedral", image: `${HOUSE}/cathedral.webp`, objective: "He checks you. Then make 10 on the real hoop.", scare: "The rim goes quiet.", action: "Start the shootout", kind: "shootout", letter: null, hotspot: { x: 0.55, y: 0 }, lurk: { x: 0.48, y: 0.34 }, scareImg: `${SCARE}/cathedral.webp`, yell: "TEN SHOTS. DON'T MISS.", floorY: 0.86, ...GROUND, seq: [], pads: null, loot: false, aspect: WIDE, alt: `${HOUSE}/cathedral-alt.webp` },
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
};

export function enterHauntLive(): HauntLive {
  const room = HAUNT_ROOMS[0]!;
  return {
    room: 0, x: room.spawnX, y: room.floorY, acted: false, popped: false, puzzleStep: 0,
    scare: null, note: "Feet on the floor. Keep walking.", lastDir: null,
    scareT: 0, scareImg: null, scareLine: null, lineT: 0, hall: 0, halling: false, hallHit: false,
    looted: false,
  };
}

const NEAR = 0.09;
const POP = 0.12;

function nearX(x: number, target: number, r = NEAR) {
  return Math.abs(x - target) < r;
}

export function hauntPrompt(room: HauntRoom, live: HauntLive, got: boolean) {
  if (live.halling || live.scareT > 0) return null;
  if (room.letter && !got && nearX(live.x, room.letter.x)) return "Pick up";
  if (live.popped && live.acted && got && live.room < HAUNT_ROOMS.length - 1 && live.x >= room.doorX) return "Go through";
  if (!live.acted && nearX(live.x, room.hotspot.x)) {
    if (room.kind === "timing") return "Slip steam";
    if (room.kind === "steam") return "Hit valve";
  }
  if (room.loot && !live.looted && nearX(live.x, room.hotspot.x)) return "Take chain";
  return null;
}

export type HauntEvent = "letter" | "acted" | "next" | "shootout" | "scare" | "pop" | "hall" | "loot" | null;

function beginPop(next: HauntLive, img: string, line: string, hold = 2.1): HauntEvent {
  next.scareT = hold;
  next.scareImg = img;
  next.scareLine = line;
  next.lineT = hold + 0.55;
  return "pop";
}

function advanceRoom(next: HauntLive) {
  next.room = Math.min(HAUNT_ROOMS.length - 1, next.room + 1);
  const room = HAUNT_ROOMS[next.room]!;
  next.halling = false;
  next.hall = 0;
  next.hallHit = false;
  next.x = room.spawnX;
  next.y = room.floorY;
  next.acted = false;
  next.popped = false;
  next.puzzleStep = 0;
  next.scareT = 0;
  next.scareImg = null;
  next.scareLine = null;
  next.lineT = 0;
  next.lastDir = null;
  next.scare = null;
  next.looted = false;
  next.note = "Feet on the floor. Keep walking.";
}

export function tickHaunt(live: HauntLive, dt: number, mx: number, my: number, use: boolean, clock: number, letters: string[]): { live: HauntLive; event: HauntEvent } {
  const room = HAUNT_ROOMS[live.room] ?? HAUNT_ROOMS[0]!;
  const next = { ...live };
  let event: HauntEvent = null;
  if (next.scareT > 0) next.scareT = Math.max(0, next.scareT - dt);
  if (next.lineT > 0) next.lineT = Math.max(0, next.lineT - dt);
  if (next.lineT <= 0) next.scareLine = null;

  if (next.halling) {
    next.hall = Math.max(0, next.hall - dt);
    next.y = room.floorY;
    next.note = null;
    if (next.hall <= 0) {
      advanceRoom(next);
      event = "next";
    }
    return { live: next, event };
  }

  const locked = live.scareT > 0.04;
  if (!locked) {
    const along = mx - my;
    next.x = Math.min(room.walkMaxX, Math.max(room.walkMinX, next.x + along * 0.62 * dt));
    next.y = room.floorY;
  }
  const got = !room.letter || letters.includes(room.id);

  if (room.kind === "timing" && !next.acted) {
    const bar = (Math.sin(clock * 2.6) + 1) / 2;
    next.note = bar > 0.78 ? "NOW — slip the steam" : "Wait for the green";
  } else if (room.kind === "steam" && !next.acted) {
    const clear = clock % 2.4 < 1.15;
    next.note = clear ? "Valve is clear" : "STEAM — hold";
  } else if (room.kind === "order" && !next.acted) {
    const seq = room.seq.length ? room.seq : [2, 1, 3];
    const label = room.pads === "books" ? "Books" : "Candles";
    next.note = `${label}: ${seq[next.puzzleStep] ?? seq[0]} next`;
  } else if (room.kind === "maze" && !next.acted) {
    const need = (["left", "up", "right"] as const)[next.puzzleStep] ?? "left";
    next.note = `Path ${next.puzzleStep + 1}/3 · go ${need}`;
    if (!locked) {
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
          event = beginPop(next, room.scareImg, room.yell, 0.5);
        }
      } else if (!dir) next.lastDir = null;
    }
  } else if (next.popped && next.acted) next.note = got ? "Door is on the right. Walk through." : "Grab the orange letter.";
  else if (!next.popped) next.note = room.kind === "shootout" ? "Walk the floor. He checks you first." : "Feet on the floor. Keep walking.";
  else next.note = room.action;

  if (!locked && !next.popped && nearX(next.x, room.lurk.x, POP)) {
    next.popped = true;
    if (room.kind === "tap") next.acted = true;
    return { live: next, event: beginPop(next, room.scareImg, room.yell) };
  }
  if (next.scareT > live.scareT) return { live: next, event: event ?? "pop" };
  if (locked) return { live: next, event };

  if (use && room.kind === "shootout" && next.popped) {
    return { live: next, event: "shootout" };
  }

  if (use && room.letter && !got && nearX(next.x, room.letter.x)) {
    event = "letter";
    next.scare = null;
  } else if (use && room.loot && !next.looted && nearX(next.x, room.hotspot.x)) {
    next.looted = true;
    event = "loot";
  } else if (use && !next.acted && room.kind !== "shootout" && nearX(next.x, room.hotspot.x)) {
    if (room.kind === "timing") {
      const bar = (Math.sin(clock * 2.6) + 1) / 2;
      if (bar > 0.78) {
        next.acted = true;
        event = "acted";
      } else {
        next.scare = room.scare;
        event = beginPop(next, room.scareImg, "NOT YET.", 0.55);
      }
    } else if (room.kind === "steam") {
      const clear = clock % 2.4 < 1.15;
      if (clear) {
        next.acted = true;
        event = "acted";
      } else {
        next.scare = room.scare;
        event = beginPop(next, room.scareImg, "TOO HOT.", 0.55);
      }
    } else if (room.kind === "tap") {
      next.acted = true;
      next.popped = true;
      event = beginPop(next, room.scareImg, room.yell);
    }
  } else if (use && next.room < HAUNT_ROOMS.length - 1 && got && next.acted && next.popped && next.x >= room.doorX) {
    next.halling = true;
    next.hall = 0.7;
    next.hallHit = false;
    next.note = null;
    event = "hall";
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
