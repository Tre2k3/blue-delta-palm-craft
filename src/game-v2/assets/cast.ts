import type { CardArt } from "../actors/card";
import { characters } from "./characters";

const V = "?v=7";
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

/** Benji in a fit: all four sides, and the four court drawings. */
function fit(id: string, size: Sizes = [0.92, 0.97, 1.2, 1.2]): CardArt {
  const f = (n: string) => `${FITS}/${id}/${n}.webp`;
  return { front: f("front"), back: f("back"), left: f("left"), right: f("right"), ...moves(f, size) };
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

/** Benji in each fit he has art for, what wearing it does, and where it comes from. */
export const OUTFITS: Record<OutfitId, { name: string; art: CardArt; perk: string; from: string }> = {
  starter: {
    name: "Starter Green Tee",
    art: { ...turn("benji"), ...starterCourt, walk: starterWalk.walk, scale: { ...starterCourt.scale, ...starterWalk.scale } },
    perk: "The original. No perk, all Memphis.",
    from: "Yours",
  },
  tour_white: { name: "Worldwide Tour Tee · White", art: fit("tour_white"), perk: "+10% Respect from everything.", from: "At the HQ" },
  tour_black: { name: "Worldwide Tour Tee · Black", art: fit("tour_black"), perk: "+10% SackDollars from deliveries and races.", from: "At the HQ" },
  tour_red: { name: "Worldwide Tour Tee · Red", art: fit("tour_red"), perk: "Nitro refills faster on the strip.", from: "At the HQ" },
  fresh_black: { name: "FRESH 38127 Jersey · Black", art: fit("fresh_black"), perk: "+15% SackDollars from every game at the court.", from: "At the HQ" },
  sackrow_11: { name: "Sackrow Ballers #11", art: fit("sackrow_11"), perk: "Wider green window on your jumper.", from: "Beat a player to 11 at the court" },
  blue_901: { name: "901 Day Jersey", art: fit("blue_901"), perk: "Run faster on foot.", from: "Win the street race" },
  fresh_blue: { name: "FRESH 38127 Jersey · Blue", art: fit("fresh_blue", [0.91, 0.96, 1.27, 1.28]), perk: "Coins around town are worth double.", from: "Bank 100 coins around town" },
  jersey_224: { name: "224 Jersey · White", art: fit("jersey_224"), perk: "Boost pads hit harder in the go-karts.", from: "Fun House prize" },
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

/** The people Benji deals with. Every one of them is drawn down to the shoes and stands in the open. */
export const CAST: Record<"kBlanco" | "courtOg" | "mamaDee" | "uncJ" | "nitro" | "strike", { name: string; art: CardArt; height: number; portrait?: string }> = {
  kBlanco: { name: "K Blanco", art: turn("k-blanco"), height: characters.kBlanco.height, portrait: characters.kBlanco.portrait },
  courtOg: { name: "Court OG", art: whole("court-og", { back: 1.006, left: 0.966, right: 0.97 }), height: characters.courtOg.height },
  mamaDee: { name: "Mama Dee", art: turn("mama-dee"), height: characters.mamaDee.height },
  uncJ: { name: "Unc J", art: whole("unc-j"), height: characters.uncJ.height },
  nitro: { name: "Nitro", art: turn("nitro"), height: characters.nitro.height },
  strike: { name: "Strike", art: whole("strike", { back: 1.04, left: 0.98, right: 1.022 }), height: characters.strike.height },
};

export type CastId = keyof typeof CAST;

/** People on the street: drawn from the front and from behind, standing and in stride. */
const ped = (name: string, height: number): { art: CardArt; height: number } => ({
  art: {
    front: `/game-v2/characters/pedestrians/${name}.png${V}`,
    back: `/game-v2/characters/pedestrians/${name}-back.webp?v=2`,
    walk: { front: [`/game-v2/characters/pedestrians/${name}-walk.png${V}`], back: [`/game-v2/characters/pedestrians/${name}-walk-back.webp?v=2`] },
  },
  height,
});

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
  ped("female-02", 1.68),
  ped("male-03", 1.8),
  ped("female-03", 1.66),
  ped("male-04", 1.76),
  ped("female-04", 1.64),
];

/** The four who run the 901 Court, easiest first: a street person, plus the court drawings only they have. */
const baller = (index: number, name: string, size: Sizes): CardArt => ({ ...PEDS[index]!.art, ...moves((n) => `/game-v2/characters/pedestrians/${name}-${n}.webp`, size) });

export const BALLERS: CardArt[] = [
  baller(2, "male-02", [0.79, 0.79, 1.11, 1.12]),
  baller(0, "male-01", [0.76, 0.715, 1.145, 1.15]),
  baller(4, "male-03", [0.8, 0.81, 1.165, 1.18]),
  baller(6, "male-04", [0.825, 0.815, 1.29, 1.29]),
];
