import type { CardArt, View } from "../actors/card";
import { characters } from "./characters";

const V = "?v=9";
const turn = (folder: string): CardArt => ({
  front: `/game-v2/characters/${folder}/front.png${V}`,
  back: `/game-v2/characters/${folder}/back.png${V}`,
  left: `/game-v2/characters/${folder}/left.png${V}`,
  right: `/game-v2/characters/${folder}/right.png${V}`,
});

const FITS = "/game-v2/characters/benji-fits";

/** How tall each court drawing stands next to the standing one: the stance, the drive, the jumper from in front, the jumper from behind. */
type Sizes = readonly [number, number, number, number];

/**
 * Someone on the court: the jumper from in front and from behind, the defensive stance, and the
 * drive seen from the side. The stance and the drive are each drawn facing one way and mirrored
 * for the other; `stance` is the way the stance was drawn.
 */
function moves(f: (n: string) => string, size: Sizes, stance: "left" | "right" = "right"): Pick<CardArt, "poses" | "scale"> {
  const drive = f("drive");
  const ready = f("ready");
  const mirrored = `flip:${ready}`;
  return {
    poses: {
      shoot: { front: f("shot-front"), back: f("shot-back") },
      ready: stance === "right" ? { front: ready, right: ready, left: mirrored } : { front: ready, left: ready, right: mirrored },
      drive: { right: drive, left: `flip:${drive}` },
    },
    scale: { [ready]: size[0], [mirrored]: size[0], [drive]: size[1], [`flip:${drive}`]: size[1], [f("shot-front")]: size[2], [f("shot-back")]: size[3] },
  };
}

/** Benji in a fit: all four sides, the four court drawings, and (where it has been drawn) his fist in the air, `cheer` tall. */
function fit(id: string, size: Sizes = [0.92, 0.97, 1.2, 1.2], cheer = 0): CardArt {
  const f = (n: string) => `${FITS}/${id}/${n}.webp`;
  const m = moves(f, size);
  const art: CardArt = { front: f("front"), back: f("back"), left: f("left"), right: f("right"), ...m };
  if (cheer) {
    art.poses = { ...m.poses, cheer: { front: f("cheer-front") } };
    art.scale = { ...m.scale, [f("cheer-front")]: cheer };
  }
  return art;
}

export type OutfitId = "starter" | "tour_white" | "tour_black" | "tour_red" | "fresh_black" | "fresh_blue" | "jersey_224" | "sackrow_11" | "blue_901" | "doll" | "nightmare" | "claw";

const starterCourt = moves((n) => `${FITS}/starter/${n}.webp`, [0.92, 0.97, 1.17, 1.17], "left");

/** How tall each stride stands next to the standing drawing: back a and b, front a and b, side a and b. */
type Strides = readonly [number, number, number, number, number, number];

/**
 * Benji walking in a fit: two strides from behind, from in front and from the side. The side
 * strides are drawn walking left and mirrored for walking right.
 */
function strides(id: string, size: Strides): Pick<CardArt, "walk" | "scale"> {
  const f = (n: string) => `${FITS}/${id}/walk-${n}.webp`;
  const names = ["back-a", "back-b", "front-a", "front-b", "left-a", "left-b"] as const;
  const scale: Record<string, number> = {};
  names.forEach((n, i) => (scale[f(n)] = size[i]!));
  scale[`flip:${f("left-a")}`] = size[4];
  scale[`flip:${f("left-b")}`] = size[5];
  return {
    walk: { back: [f("back-a"), f("back-b")], front: [f("front-a"), f("front-b")], left: [f("left-a"), f("left-b")], right: [`flip:${f("left-a")}`, `flip:${f("left-b")}`] },
    scale,
  };
}

const starterWalk = strides("starter", [1.045, 1.03, 1.0, 0.995, 1.005, 0.97]);

/**
 * What Benji does in the green tee besides walk and shoot: the dunk, reeling a fish in, the
 * bowling release, and his fist in the air. All drawn from behind, where the lens usually is;
 * the cheer from in front too. From in front the dunk is the top of his jumper.
 */
const starterMoves = ((): Required<Pick<CardArt, "poses" | "scale">> => {
  const f = (n: string) => `${FITS}/starter/${n}.webp`;
  return {
    poses: {
      dunk: { back: f("dunk-back"), front: f("shot-front") },
      reel: { back: f("reel-back") },
      bowl: { back: f("bowl-back") },
      cheer: { front: f("cheer-front"), back: f("cheer-back") },
      // Sat on the swing, down the slide and over a putt: drawn from his left, mirrored for his right.
      swing: { left: f("swing"), right: `flip:${f("swing")}` },
      slide: { left: f("slide"), right: `flip:${f("slide")}` },
      putt: { left: f("putt"), right: `flip:${f("putt")}` },
      // With a racket in his hand, from behind his baseline.
      tennis: { back: f("tennis-ready") },
      forehand: { back: f("tennis-fore") },
      backhand: { back: f("tennis-back") },
      serve: { back: f("tennis-serve") },
    },
    scale: {
      [f("dunk-back")]: 1.371,
      [f("reel-back")]: 0.98,
      [f("bowl-back")]: 1.064,
      [f("cheer-back")]: 1.199,
      [f("cheer-front")]: 1.143,
      [f("swing")]: 0.78,
      [`flip:${f("swing")}`]: 0.78,
      [f("slide")]: 0.735,
      [`flip:${f("slide")}`]: 0.735,
      [f("putt")]: 0.968,
      [`flip:${f("putt")}`]: 0.968,
      [f("tennis-ready")]: 0.97,
      [f("tennis-fore")]: 1.008,
      [f("tennis-back")]: 0.997,
      [f("tennis-serve")]: 1.365,
    },
  };
})();

/** Benji in each fit he has art for, what wearing it does, and where it comes from. */
export const OUTFITS: Record<OutfitId, { name: string; art: CardArt; perk: string; from: string }> = {
  starter: {
    name: "Starter Green Tee",
    art: { ...turn("benji"), poses: { ...starterCourt.poses, ...starterMoves.poses }, walk: starterWalk.walk, scale: { ...starterCourt.scale, ...starterWalk.scale, ...starterMoves.scale } },
    perk: "The original. No perk, all Memphis.",
    from: "Yours",
  },
  tour_white: { name: "Worldwide Tour Tee · White", art: fit("tour_white", undefined, 1.105), perk: "+10% Respect from everything.", from: "At the HQ" },
  tour_black: { name: "Worldwide Tour Tee · Black", art: fit("tour_black", undefined, 1.103), perk: "+10% SackDollars from deliveries and races.", from: "At the HQ" },
  tour_red: { name: "Worldwide Tour Tee · Red", art: fit("tour_red"), perk: "Nitro refills faster on the strip.", from: "At the HQ" },
  fresh_black: { name: "FRESH 38127 Jersey · Black", art: fit("fresh_black"), perk: "+15% SackDollars from every game at the court.", from: "At the HQ" },
  sackrow_11: { name: "Sackrow Ballers #11", art: fit("sackrow_11"), perk: "Wider green window on your jumper.", from: "Beat a player to 11 at the court" },
  blue_901: { name: "901 Day Jersey", art: fit("blue_901"), perk: "Run faster on foot.", from: "Win the street race" },
  fresh_blue: { name: "FRESH 38127 Jersey · Blue", art: fit("fresh_blue", [0.91, 0.96, 1.27, 1.28], 1.061), perk: "Coins around town are worth double.", from: "Bank 100 coins around town" },
  jersey_224: { name: "224 Jersey · White", art: fit("jersey_224", undefined, 1.053), perk: "Boost pads hit harder in the go-karts.", from: "Fun House prize" },
  doll: { name: "Fun House Overalls", art: fit("doll", [0.94, 0.98, 1.32, 1.32]), perk: "More tickets from every arcade game.", from: "Fun House prize" },
  nightmare: { name: "Sackrow After Dark Tee", art: fit("nightmare", [0.94, 0.99, 1.29, 1.29]), perk: "Longer bite window on the river.", from: "Fun House prize" },
  claw: { name: "Striped Sweater", art: fit("claw", [0.945, 1.015, 1.28, 1.285]), perk: "Bowling ball hooks harder.", from: "Fun House prize" },
};

export const BENJI_HEIGHT = characters.benji.height;

/** Someone drawn whole, head to shoes, from four sides. `size` is how tall a side stands next to the front. */
const whole = (folder: string, size: { back?: number; left?: number; right?: number } = {}): CardArt => {
  const f = (n: string) => `/game-v2/characters/${folder}/full-${n}.webp`;
  return { front: f("front"), back: f("back"), left: f("left"), right: f("right"), scale: { [f("back")]: size.back ?? 1, [f("left")]: size.left ?? 1, [f("right")]: size.right ?? 1 } };
};

/** Adds the drawing of someone mid-sentence, seen from in front: `size` is how tall it stands next to the standing one. */
const talks = (art: CardArt, folder: string, size = 1): CardArt => {
  const talk = `/game-v2/characters/${folder}/talk.webp`;
  return { ...art, poses: { ...art.poses, talk: { front: talk } }, scale: { ...art.scale, [talk]: size } };
};

/** The people Benji deals with. Every one of them is drawn down to the shoes and stands in the open. */
export const CAST: Record<"kBlanco" | "courtOg" | "mamaDee" | "uncJ" | "nitro" | "strike", { name: string; art: CardArt; height: number; portrait?: string }> = {
  kBlanco: { name: "K Blanco", art: talks(turn("k-blanco"), "k-blanco"), height: characters.kBlanco.height, portrait: characters.kBlanco.portrait },
  courtOg: { name: "Court OG", art: talks(whole("court-og", { back: 1.006, left: 0.966, right: 0.97 }), "court-og"), height: characters.courtOg.height },
  mamaDee: { name: "Mama Dee", art: talks(turn("mama-dee"), "mama-dee"), height: characters.mamaDee.height },
  uncJ: { name: "Unc J", art: talks(whole("unc-j"), "unc-j", 1.04), height: characters.uncJ.height },
  nitro: { name: "Nitro", art: talks(turn("nitro"), "nitro", 1.05), height: characters.nitro.height },
  strike: { name: "Strike", art: talks(whole("strike", { back: 1.04, left: 0.98, right: 1.022 }), "strike"), height: characters.strike.height },
};

export type CastId = keyof typeof CAST;

/** How tall someone sat on a stool is next to them standing, and each one's back and side drawing next to the front one. */
const SAT = 0.7;
const SIT: Record<string, [number, number]> = {
  "male-01": [0.979, 0.995],
  "female-01": [0.95, 0.97],
  "male-02": [0.968, 0.989],
  "female-02": [0.957, 0.965],
  "male-03": [0.973, 0.952],
  "female-03": [0.949, 0.971],
  "male-04": [0.942, 0.99],
  "female-04": [0.97, 0.989],
};

/**
 * People on the street: drawn from the front and from behind, standing, in two strides, and
 * jumping with both hands up. `cheer` is how tall the jump stands next to the standing drawing.
 */
const ped = (name: string, height: number, cheer = 1.12): { art: CardArt; height: number } => {
  const f = (n: string) => `/game-v2/characters/pedestrians/${name}${n}`;
  const [back, side] = SIT[name]!;
  return {
    art: {
      front: f(`.png${V}`),
      back: f("-back.webp?v=2"),
      walk: { front: [f(`-walk.png${V}`), f("-walk-b.webp")], back: [f("-walk-back.webp?v=2"), f("-walk-back-b.webp")] },
      poses: {
        cheer: { front: f("-cheer-front.webp"), back: f("-cheer-back.webp") },
        // Sat on a park stool, which is part of the drawing.
        sit: { front: f("-sit-front.webp"), back: f("-sit-back.webp"), left: f("-sit-side.webp"), right: `flip:${f("-sit-side.webp")}` },
      },
      scale: {
        [f("-cheer-front.webp")]: cheer,
        [f("-cheer-back.webp")]: cheer,
        [f("-sit-front.webp")]: SAT,
        [f("-sit-back.webp")]: SAT * back,
        [f("-sit-side.webp")]: SAT * side,
        [`flip:${f("-sit-side.webp")}`]: SAT * side,
      },
    },
    height,
  };
};

/**
 * Street people drawn later: standing and mid-stride, from in front and from behind. The other
 * stride is the same drawing mirrored. `sizes` is how tall the back, the stride and the stride
 * from behind stand next to the standing drawing.
 */
const walker = (name: string, height: number, sizes: [number, number, number]): { art: CardArt; height: number } => {
  const f = (n: string) => `/game-v2/characters/pedestrians/${name}${n}.webp`;
  return {
    art: {
      front: f(""),
      back: f("-back"),
      walk: { front: [f("-walk"), `flip:${f("-walk")}`], back: [f("-walk-back"), `flip:${f("-walk-back")}`] },
      scale: { [f("-back")]: sizes[0], [f("-walk")]: sizes[1], [`flip:${f("-walk")}`]: sizes[1], [f("-walk-back")]: sizes[2], [`flip:${f("-walk-back")}`]: sizes[2] },
    },
    height,
  };
};

/** Someone who works a window: standing easy, and holding the order out, from in front and from behind. */
const crew = (id: string, height: number): { art: CardArt; height: number } => {
  const f = (n: string) => `/game-v2/characters/vendors/${id}/${n}.webp`;
  return { art: { front: f("front"), back: f("back"), poses: { serve: { front: f("serve-front"), back: f("serve-back") } } }, height };
};

/** The crews of the three trucks: Veli at Veli's Wings, the two brothers at Wingz N Things, and the cook at 901 Catch Kitchen. */
export const VENDORS = {
  veli: crew("veli", 1.62),
  brotherRed: crew("brother-red", 1.56),
  brotherBlue: crew("brother-blue", 1.7),
  catch: crew("catch", 1.74),
};

export const PEDS = [
  ped("male-01", 1.78),
  ped("female-01", 1.72),
  ped("male-02", 1.7),
  ped("female-02", 1.68, 1.15),
  ped("male-03", 1.8),
  ped("female-03", 1.66, 1.06),
  ped("male-04", 1.76, 1.08),
  ped("female-04", 1.64),
  // The second eight: a church elder, a delivery man, a runner, a bluesman, a boy with a ball, a nurse, a big man and a teenager.
  walker("female-05", 1.6, [0.981, 1.0, 0.992]),
  walker("male-05", 1.86, [0.994, 0.989, 1.0]),
  walker("female-06", 1.7, [0.995, 0.992, 0.998]),
  walker("male-06", 1.74, [0.992, 1.0, 1.005]),
  walker("male-07", 1.36, [1.0, 1.016, 1.019]),
  walker("female-07", 1.66, [1.006, 1.003, 1.008]),
  walker("male-08", 1.8, [0.995, 1.003, 1.0]),
  walker("male-09", 1.64, [0.997, 1.006, 1.008]),
];

/** The first eight are the ones with a seated drawing: whoever holds a park table is one of them. */
export const SITTERS = PEDS.slice(0, 8);

/**
 * The same eight in a laser tag vest with a blaster in both hands: aiming at the lens, from
 * behind, running side on, and tagged out with the vest dark. Three wear green with Benji, five
 * wear pink. Sizes are the aiming, back and side drawings next to the tagged-out one.
 */
const tagger = (name: string, team: 0 | 1, sizes: [number, number, number]): { name: string; team: 0 | 1; art: CardArt; height: number } => {
  const f = (n: string) => `/game-v2/characters/pedestrians/${name}-tag-${n}.webp`;
  const height = PEDS.find((p) => p.art.front.includes(`/${name}.`))!.height;
  return {
    name,
    team,
    art: {
      front: f("front"),
      back: f("back"),
      left: f("side"),
      right: `flip:${f("side")}`,
      poses: { out: { front: f("out") } },
      scale: { [f("front")]: sizes[0], [f("back")]: sizes[1], [f("side")]: sizes[2], [`flip:${f("side")}`]: sizes[2], [f("out")]: 0.99 },
    },
    height,
  };
};
export const TAGGERS = [
  tagger("male-01", 0, [0.984, 0.982, 0.959]),
  tagger("male-02", 0, [0.985, 0.97, 0.957]),
  tagger("female-02", 0, [0.982, 0.982, 0.954]),
  tagger("male-03", 1, [0.981, 0.985, 0.965]),
  tagger("female-01", 1, [0.984, 0.974, 0.918]),
  tagger("female-03", 1, [0.967, 0.962, 0.956]),
  tagger("male-04", 1, [0.998, 0.988, 0.943]),
  tagger("female-04", 1, [0.97, 0.97, 0.926]),
];

/** Coach Renee on the tennis court: the purple tracksuit, with a racket, seen from across the net. */
export const COACH = ((): { art: CardArt; height: number } => {
  const base = PEDS[7]!;
  const f = (n: string) => `/game-v2/characters/pedestrians/female-04-tennis-${n}.webp`;
  return {
    art: {
      ...base.art,
      poses: { ...base.art.poses, tennis: { front: f("ready") }, forehand: { front: f("fore") }, backhand: { front: f("back") }, serve: { front: f("serve") } },
      scale: { ...base.art.scale, [f("ready")]: 0.94, [f("fore")]: 0.945, [f("back")]: 0.943, [f("serve")]: 1.226 },
    },
    height: base.height,
  };
})();

/** The house band: each player in two drawings that alternate with the beat, and how tall each stands in metres. */
export const BAND = (
  [
    ["guitar", 1.71, 1.63],
    ["singer", 1.86, 1.73],
    ["drums", 1.67, 1.49],
    ["bass", 1.95, 1.95],
    ["sax", 1.75, 1.61],
    ["keys", 1.58, 1.62],
  ] as const
).map(([id, a, b]) => ({ id, frames: [`/game-v2/characters/band/${id}-a.webp`, `/game-v2/characters/band/${id}-b.webp`] as [string, string], heights: [a, b] as [number, number] }));

/** The four who run the 901 Court, easiest first: a street person, plus the court drawings only they have. */
const baller = (index: number, name: string, size: Sizes, run = 0.96, dunk = 1.02): CardArt => {
  const f = (n: string) => `/game-v2/characters/pedestrians/${name}-${n}.webp`;
  const base = PEDS[index]!.art;
  const m = moves(f, size);
  const side = m.poses!.drive as Partial<Record<View, string>>;
  return {
    ...base,
    poses: {
      ...base.poses,
      ...m.poses,
      // The drive was only drawn from the side; running at the lens and away from it are their own drawings.
      drive: { ...side, front: f("run-front"), back: f("run-back") },
      dunk: { back: f("dunk-back"), front: f("shot-front") },
    },
    scale: { ...base.scale, ...m.scale, [f("run-front")]: run, [f("run-back")]: run, [f("dunk-back")]: dunk },
  };
};

export const BALLERS: CardArt[] = [
  baller(2, "male-02", [0.79, 0.79, 1.11, 1.12]),
  baller(0, "male-01", [0.76, 0.715, 1.145, 1.15], 0.96, 1.12),
  baller(4, "male-03", [0.8, 0.81, 1.165, 1.18], 0.96, 1.12),
  baller(6, "male-04", [0.825, 0.815, 1.29, 1.29]),
];
