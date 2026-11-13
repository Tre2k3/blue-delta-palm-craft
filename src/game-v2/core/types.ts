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

export type Overlay = null | "pause" | "map" | "shop" | "wardrobe" | "arcade" | "prizes" | "food" | "results" | "video" | "court" | "photo" | "garage" | "table" | "album" | "online";

export type Catch = { name: string; lb: number; pay: number; rarity: string; color: string; img?: string };

/** A picture held up for a few seconds: a postcard just collected, a new name just earned. */
export type Reveal = { img: string; kicker: string; title: string; sub: string; round: boolean };

/** Everything he has collected: the postcards, the fish book and the names Memphis has given him. */
export type AlbumHud = {
  postcards: { id: string; name: string; hint: string; img: string; got: boolean }[];
  fish: { id: string; name: string; rarity: string; color: string; img: string; best: number }[];
  ranks: { name: string; at: number; badge: string; got: boolean }[];
};

/** A friend in the crew: who they are, how good the line to them is, and where in Memphis they have got to. */
export type CrewFriend = { id: string; name: string; link: "connecting" | "connected" | "failed"; rtt: number | null; x: number; z: number; street: boolean; where: string; doing: string };

/** Playing with friends: the crew he is in, if any, and everybody else in it. */
export type CrewHud = {
  code: string | null;
  name: string;
  /** No crew; in one with nobody linked yet; or with at least one friend on the line. */
  status: "off" | "waiting" | "linked";
  /** The crew line itself answered. */
  ready: boolean;
  error: string;
  /** The link that drops whoever opens it into this crew. */
  invite: string;
  /** A crew he will join as soon as the day starts: he came in on a friend's link. */
  waiting: string;
  friends: CrewFriend[];
  max: number;
};

/** A friend asking for a game at a table. */
export type TableInvite = { from: string; name: string; id: TableId; game: string; left: number };

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
  /** Where the car was left. */
  car: { x: number; z: number; heading: number };
  /** The car he drives, and the ones he has paid for. */
  ride: string;
  rides: string[];
  /** Today's drop: the day it was last looked at, whether that day's is done, the run of days, and the last day one was done. */
  daily: { day: string; done: boolean; streak: number; last: string };
  bounty: number;
  played: number;
  /** How many times the thing the current step counts has happened. */
  count: number;
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
  /** Benji came out on top: the card comes up under confetti. */
  win?: boolean;
};

export type HoopsKind = "shootout" | "practice" | "versus";
export type HoopsHud = {
  phase: "run" | "over";
  score: number;
  left: number;
  shots: number;
  made: number;
  streak: number;
  best: number;
  call: string;
  fire: boolean;
  range: string;
  kind: HoopsKind;
  /** The other player in a game to eleven. */
  rival: { name: string; score: number; to: number; yours: boolean; clock: number } | null;
};
export type BowlHud = { phase: "position" | "aim" | "power" | "roll" | "settle" | "done"; frame: number; ball: number; marks: string[][]; totals: (number | null)[]; total: number; call: string; best: number; standing: boolean[] };
export type FishHud = { phase: "ready" | "charge" | "flying" | "wait" | "bite" | "reel" | "landed" | "lost"; bait: number; distance: number; fish: Catch | null; call: string; cooler: number; value: number; running: boolean };
export type RaceHud = { phase: "count" | "go" | "finish"; count: number; lap: number; laps: number; place: number; racers: number; time: number; best: number; call: string; wrongWay: boolean; kart: boolean };
export type LaserHud = { phase: "count" | "go" | "over"; count: number; left: number; score: number; tags: number; hit: boolean; call: string; vest: number; level: number; down: boolean; us: number; them: number; power: string };
export type BounceHud = { left: number; best: number; combo: number; score: number; call: string };
export type PitHud = { left: number; found: number; total: number; call: string };
export type WhackHud = { left: number; score: number; hits: number; call: string };
/** A machine on the arcade floor: its name, a row of numbers (label, value, colour), and what it is shouting. */
export type MachineHud = { name: string; stats: [string, string, string?][]; call: string; meter: boolean; act: string };

export type HudState = {
  mode: Mode;
  overlay: Overlay;
  place: Place;
  dollars: number;
  respect: number;
  /** What Memphis calls him, and the Respect the next name comes at (null at the top). */
  rank: { name: string; index: number; next: number | null; badge: string };
  tickets: number;
  district: string;
  street: string;
  phase: "golden" | "night" | "day";
  /** Rain is on its way or coming down. */
  rain: boolean;
  /** The car he drives and the ones he owns, by id. */
  ride: string;
  rides: string[];
  /** Today's drop. */
  daily: { title: string; detail: string; done: boolean; streak: number; pay: number };
  /** Postcards collected, and the next one to go and get. */
  postcards: { got: number; total: number; next: string };
  /** The park table Benji is sat at, or null. */
  table: TableHud | null;
  crew: CrewHud;
  /** A friend is asking for a game. */
  invite: TableInvite | null;
  mission: MissionCard | null;
  prompt: string;
  /** Key hints for the mode, "key label" pairs. */
  hints: [string, string][];
  dialogue: Dialogue | null;
  toast: string;
  reveal: Reveal | null;
  /** Photo mode: whether this fit has a pose to strike, and whether he is holding it. */
  pose: { can: boolean; on: boolean };
  /** Filled while the album is open. */
  album: AlbumHud | null;
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
  machine: MachineHud | null;
  driving: boolean;
  results: Results | null;
  /** Product the shop opens on. */
  shopFocus: string | null;
  cabinet: string | null;
  foodAt: "catch" | "velis" | "brothers" | "pizza";
  settings: { quality: "low" | "medium" | "high"; auto: boolean; music: boolean; sfx: boolean; clock: boolean; buzz: boolean };
  /** A shot the player only watches: the opening. The rest of the screen clears for its title card. */
  cinema: { title: string; sub: string } | null;
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
  /** Points in the drift he is holding right now, 0 when he is not in one. */
  drift: number;
  nitro: number;
  /** Black fade between places, 0..1. */
  fade: number;
  /** Laser tag radar: `radarN` blips, three numbers each (across, ahead, kind), in units of its radius. */
  radar: number[];
  radarN: number;
  /** Street race: metres to the next boost gate (negative once past it), 999 when there is none coming. */
  cue: number;
  /** Street race: metres to the next bend, -1 when it is a long way off. */
  turn: number;
  /** Objective marker in screen space, 0..1 each way. */
  markX: number;
  markY: number;
  markOn: boolean;
  markDist: number;
  x: number;
  z: number;
  heading: number;
  camYaw: number;
  /** Goes up by one each time there is something to throw confetti for; `partyLevel` says how much. */
  party: number;
  partyLevel: number;
};

/** The games played at the tables in the park. */
export type TableId = "chess" | "checkers" | "dominoes" | "spades" | "connect4" | "tictactoe";

/** What the table screen shows. `view` is the game's own picture of itself. */
export type TableHud = {
  id: TableId;
  name: string;
  rivals: string[];
  line: string;
  how: string[];
  /** `wait`: a friend has been asked and has not answered yet. */
  stage: "pick" | "wait" | "play" | "done";
  level: number;
  levels: { name: string; pay: number }[];
  /** Two people sharing the device. */
  two: boolean;
  canTwo: boolean;
  /** The next move is a person's. */
  mine: boolean;
  turn: number;
  view: unknown;
  result: { text: string; won: boolean | null; pay: number } | null;
  wins: number;
  /** Friends on the line who could be asked for a game here. */
  friends: { id: string; name: string }[];
  /** He is in a crew at all. */
  crewed: boolean;
  /** A game against a friend on another device: who, which side is his, and where the rematch stands. */
  online: { name: string; seat: number; gone: boolean; again: boolean; theirs: boolean } | null;
};
