import type { CardArt } from "../actors/card";
import { characters } from "./characters";

const V = "?v=6";
const turn = (folder: string): CardArt => ({
  front: `/game-v2/characters/${folder}/front.png${V}`,
  back: `/game-v2/characters/${folder}/back.png${V}`,
  left: `/game-v2/characters/${folder}/left.png${V}`,
  right: `/game-v2/characters/${folder}/right.png${V}`,
});

/**
 * The fit plates are all drawn from the front, so the back view is Benji's own back drawing
 * with the tee repainted in the colour of the piece.
 */
const fit = (folder: string, shirt: string): CardArt => ({
  front: `/game/benji/outfits/${folder}/front.png`,
  back: `tint:${shirt}:/game-v2/characters/benji/back.png${V}`,
  left: `/game/benji/outfits/${folder}/left.png`,
  right: `/game/benji/outfits/${folder}/right.png`,
});

export type OutfitId = "starter" | "tour_white" | "tour_black" | "tour_red" | "sackrow_11" | "blue_901" | "doll" | "nightmare" | "claw";

/**
 * Benji in each fit he actually has four-view art for.
 * Two folders on disk are mislabelled: `tour_white` holds the black tee and `tour_black` the white.
 */
export const OUTFITS: Record<OutfitId, { name: string; art: CardArt; perk: string }> = {
  starter: {
    name: "Starter Green Tee",
    art: { ...turn("benji"), walk: { front: [`/game-v2/characters/benji/walk.png${V}`] } },
    perk: "The original. No perk, all Memphis.",
  },
  tour_white: { name: "Worldwide Tour Tee · White", art: fit("tour_black", "#f2f0ea"), perk: "+10% Respect from everything." },
  tour_black: { name: "Worldwide Tour Tee · Black", art: fit("tour_white", "#1b1b1f"), perk: "+10% SackDollars from deliveries and races." },
  tour_red: { name: "Worldwide Tour Tee · Red", art: fit("tour_red", "#c22a22"), perk: "Nitro refills faster on the strip." },
  sackrow_11: { name: "FRESH Sackrow #11", art: fit("black_sackrow_11", "#1b1b1f"), perk: "Wider green window on your jumper." },
  blue_901: { name: "901 Day Jersey", art: fit("blue_901_day", "#2a5fc2"), perk: "Run faster on foot." },
  doll: { name: "Fun House Overalls", art: fit("hw_doll", "#2f4f8a"), perk: "More tickets from every arcade game." },
  nightmare: { name: "Sackrow After Dark Tee", art: fit("hw_sackrow", "#1b1b1f"), perk: "Longer bite window on the river." },
  claw: { name: "Striped Sweater", art: fit("hw_claw", "#a8261c"), perk: "Bowling ball hooks harder." },
};

export const BENJI_HEIGHT = characters.benji.height;

export const CAST = {
  kBlanco: { name: "K Blanco", art: turn("k-blanco"), height: characters.kBlanco.height, portrait: characters.kBlanco.portrait },
  courtOg: { name: "Court OG", art: turn("court-og"), height: characters.courtOg.height },
  mamaDee: { name: "Mama Dee", art: turn("mama-dee"), height: characters.mamaDee.height },
  uncJ: { name: "Unc J", art: turn("unc-j"), height: characters.uncJ.height },
  nitro: { name: "Nitro", art: turn("nitro"), height: characters.nitro.height },
  strike: { name: "Strike", art: turn("strike"), height: characters.strike.height },
} as const;

export type CastId = keyof typeof CAST;

const ped = (name: string, height: number): { art: CardArt; height: number } => ({
  art: {
    front: `/game-v2/characters/pedestrians/${name}.png${V}`,
    walk: { front: [`/game-v2/characters/pedestrians/${name}-walk.png${V}`] },
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
