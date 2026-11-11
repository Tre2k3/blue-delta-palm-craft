import type { CardArt } from "../actors/card";
import { characters } from "./characters";

const V = "?v=6";
const turn = (folder: string): CardArt => ({
  front: `/game-v2/characters/${folder}/front.png${V}`,
  back: `/game-v2/characters/${folder}/back.png${V}`,
  left: `/game-v2/characters/${folder}/left.png${V}`,
  right: `/game-v2/characters/${folder}/right.png${V}`,
});

const FITS = "/game-v2/characters/benji-fits";

/**
 * Benji on the court in a fit: the jumper from in front and from behind, the defensive stance,
 * and the drive with the ball, seen from the side. `shot` is how much taller the arms-up drawing
 * is than the standing one.
 */
function court(id: string, shot = 1.2): Pick<CardArt, "poses" | "scale"> {
  const f = (n: string) => `${FITS}/${id}/${n}.webp`;
  const drive = f("drive");
  const ready = f("ready");
  return {
    poses: {
      shoot: { front: f("shot-front"), back: f("shot-back") },
      ready: { front: ready, left: ready, right: `flip:${ready}` },
      drive: { right: drive, left: `flip:${drive}` },
    },
    scale: { [f("shot-front")]: shot, [f("shot-back")]: shot, [ready]: 0.92, [`flip:${ready}`]: 0.92, [drive]: 0.97, [`flip:${drive}`]: 0.97 },
  };
}

/** A fit with all four sides drawn. `hoops` false for the ones with no court drawings. */
function fit(id: string, hoops = true): CardArt {
  const f = (n: string) => `${FITS}/${id}/${n}.webp`;
  return { front: f("front"), back: f("back"), left: f("left"), right: f("right"), ...(hoops ? court(id) : {}) };
}

export type OutfitId = "starter" | "tour_white" | "tour_black" | "tour_red" | "fresh_black" | "fresh_blue" | "jersey_224" | "sackrow_11" | "blue_901" | "doll" | "nightmare" | "claw";

const starterCourt = court("starter", 1.17);

/** Benji in each fit he has art for, what wearing it does, and where it comes from. */
export const OUTFITS: Record<OutfitId, { name: string; art: CardArt; perk: string; from: string }> = {
  starter: {
    name: "Starter Green Tee",
    art: { ...turn("benji"), ...starterCourt, walk: { front: [`/game-v2/characters/benji/walk.png${V}`] } },
    perk: "The original. No perk, all Memphis.",
    from: "Yours",
  },
  tour_white: { name: "Worldwide Tour Tee · White", art: fit("tour_white"), perk: "+10% Respect from everything.", from: "At the HQ" },
  tour_black: { name: "Worldwide Tour Tee · Black", art: fit("tour_black"), perk: "+10% SackDollars from deliveries and races.", from: "At the HQ" },
  tour_red: { name: "Worldwide Tour Tee · Red", art: fit("tour_red"), perk: "Nitro refills faster on the strip.", from: "At the HQ" },
  fresh_black: { name: "FRESH 38127 Jersey · Black", art: fit("fresh_black"), perk: "+15% SackDollars from every game at the court.", from: "At the HQ" },
  sackrow_11: { name: "Sackrow Ballers #11", art: fit("sackrow_11"), perk: "Wider green window on your jumper.", from: "Beat a player to 11 at the court" },
  blue_901: { name: "901 Day Jersey", art: fit("blue_901"), perk: "Run faster on foot.", from: "Win the street race" },
  fresh_blue: { name: "FRESH 38127 Jersey · Blue", art: fit("fresh_blue", false), perk: "Coins around town are worth double.", from: "Bank 100 coins around town" },
  jersey_224: { name: "224 Jersey · White", art: fit("jersey_224"), perk: "Boost pads hit harder in the go-karts.", from: "Fun House prize" },
  doll: { name: "Fun House Overalls", art: fit("doll", false), perk: "More tickets from every arcade game.", from: "Fun House prize" },
  nightmare: { name: "Sackrow After Dark Tee", art: fit("nightmare", false), perk: "Longer bite window on the river.", from: "Fun House prize" },
  claw: { name: "Striped Sweater", art: fit("claw", false), perk: "Bowling ball hooks harder.", from: "Fun House prize" },
};

export const BENJI_HEIGHT = characters.benji.height;

const file = (folder: string, name: string) => `/game-v2/characters/${folder}/${name}.png${V}`;

/**
 * `cut` is the share of the body a character's drawings leave off at the bottom. Court OG,
 * Unc J and Strike were drawn down to the shin, so their cards are lifted by that much and
 * each of them works from behind a counter: nobody stands in the pavement.
 *
 * Two sets of files are also not what their names say. Strike's "front" is her back and her
 * "back" is her front. Unc J's "right" is his back, his "left" is a second front, and his
 * "back" is a damaged cut-out that is not used.
 */
export const CAST: Record<"kBlanco" | "courtOg" | "mamaDee" | "uncJ" | "nitro" | "strike", { name: string; art: CardArt; height: number; cut: number; portrait?: string }> = {
  kBlanco: { name: "K Blanco", art: turn("k-blanco"), height: characters.kBlanco.height, cut: 0, portrait: characters.kBlanco.portrait },
  courtOg: { name: "Court OG", art: turn("court-og"), height: characters.courtOg.height, cut: 0.13 },
  mamaDee: { name: "Mama Dee", art: turn("mama-dee"), height: characters.mamaDee.height, cut: 0 },
  uncJ: { name: "Unc J", art: { front: file("unc-j", "front"), back: file("unc-j", "right") }, height: characters.uncJ.height, cut: 0.11 },
  nitro: { name: "Nitro", art: turn("nitro"), height: characters.nitro.height, cut: 0 },
  strike: { name: "Strike", art: { front: "/game-v2/characters/strike/back.webp", back: "/game-v2/characters/strike/front.webp", left: "/game-v2/characters/strike/left.webp", right: "/game-v2/characters/strike/right.webp" }, height: characters.strike.height, cut: 0.14 },
};

export type CastId = keyof typeof CAST;

/**
 * People on the street were only ever drawn from the front. Their back views are made from those
 * drawings (hair over the face, a plain back to the jacket), so nobody walks away face first.
 */
const ped = (name: string, height: number): { art: CardArt; height: number } => ({
  art: {
    front: `/game-v2/characters/pedestrians/${name}.png${V}`,
    back: `/game-v2/characters/pedestrians/${name}-back.webp`,
    walk: { front: [`/game-v2/characters/pedestrians/${name}-walk.png${V}`], back: [`/game-v2/characters/pedestrians/${name}-walk-back.webp`] },
  },
  height,
});

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
