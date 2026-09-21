import type { ApparelId } from "./types";
import type { View } from "./outfitLook";

export type OutfitPlatePack = Record<View, string>;

/** Pre-dressed Benji plates. Do not run these through dressBenji or a global black key. */
export const OUTFIT_PLATES: Partial<Record<ApparelId, OutfitPlatePack>> = {
  tour_white: {
    front: "/game/benji/outfits/tour_white/front.png",
    back: "/game/benji/outfits/tour_white/back.png",
    left: "/game/benji/outfits/tour_white/left.png",
    right: "/game/benji/outfits/tour_white/right.png",
  },
  tour_black: {
    front: "/game/benji/outfits/tour_black/front.png",
    back: "/game/benji/outfits/tour_black/back.png",
    left: "/game/benji/outfits/tour_black/left.png",
    right: "/game/benji/outfits/tour_black/right.png",
  },
  tour_red: {
    front: "/game/benji/outfits/tour_red/front.png",
    back: "/game/benji/outfits/tour_red/back.png",
    left: "/game/benji/outfits/tour_red/left.png",
    right: "/game/benji/outfits/tour_red/right.png",
  },
  jersey_white_224: {
    front: "/game/benji/outfits/jersey_white_224/front.png",
    back: "/game/benji/outfits/jersey_white_224/back.png",
    left: "/game/benji/outfits/jersey_white_224/left.png",
    right: "/game/benji/outfits/jersey_white_224/right.png",
  },
  jersey_blue_fresh: {
    front: "/game/benji/outfits/jersey_blue_fresh/front.png",
    back: "/game/benji/outfits/jersey_blue_fresh/back.png",
    left: "/game/benji/outfits/jersey_blue_fresh/left.png",
    right: "/game/benji/outfits/jersey_blue_fresh/right.png",
  },
  jersey_black_fresh: {
    front: "/game/benji/outfits/jersey_black_fresh/front.png",
    back: "/game/benji/outfits/jersey_black_fresh/back.png",
    left: "/game/benji/outfits/jersey_black_fresh/left.png",
    right: "/game/benji/outfits/jersey_black_fresh/right.png",
  },
  black_sackrow_11: {
    front: "/game/benji/outfits/black_sackrow_11/front.png",
    back: "/game/benji/outfits/black_sackrow_11/back.png",
    left: "/game/benji/outfits/black_sackrow_11/left.png",
    right: "/game/benji/outfits/black_sackrow_11/right.png",
  },
  blue_901_day: {
    front: "/game/benji/outfits/blue_901_day/front.png",
    back: "/game/benji/outfits/blue_901_day/back.png",
    left: "/game/benji/outfits/blue_901_day/left.png",
    right: "/game/benji/outfits/blue_901_day/right.png",
  },
};

export function outfitPlatesFor(id: ApparelId | string | null | undefined): OutfitPlatePack | null {
  if (!id) return null;
  return OUTFIT_PLATES[id as ApparelId] ?? null;
}

export function outfitImageKey(id: ApparelId, view: View) {
  return `fit-${id}-${view}`;
}
