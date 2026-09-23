import type { ApparelId } from "./types";
import type { View } from "./outfitLook";

export type OutfitPlatePack = Record<View, string>;

const plates = (folder: string): OutfitPlatePack => ({
  front: `/game/benji/outfits/${folder}/front.png`,
  back: `/game/benji/outfits/${folder}/back.png`,
  left: `/game/benji/outfits/${folder}/left.png`,
  right: `/game/benji/outfits/${folder}/right.png`,
});

/**
 * Pre-dressed Benji plates. Do not run these through dressBenji or a global black key.
 *
 * Folder names do not all match their art (audited frame by frame):
 * - outfits/tour_white holds the BLACK tour tee, outfits/tour_black the WHITE one.
 * - jersey_white_224, jersey_black_fresh and jersey_blue_fresh have no walk art: each folder is one
 *   image copied to all four views (a crouch, a white-tee crouch, a head-to-thigh close-up).
 *   They borrow the nearest real four-view plates until proper plates are delivered:
 *   black Fresh → black_sackrow_11 (its back reads "FRESH 11"), blue Fresh → blue_901_day,
 *   white 224 → the white tour tee.
 */
export const OUTFIT_PLATES: Partial<Record<ApparelId, OutfitPlatePack>> = {
  tour_white: plates("tour_black"),
  tour_black: plates("tour_white"),
  tour_red: plates("tour_red"),
  jersey_white_224: plates("tour_black"),
  jersey_blue_fresh: plates("blue_901_day"),
  jersey_black_fresh: plates("black_sackrow_11"),
  black_sackrow_11: plates("black_sackrow_11"),
  blue_901_day: plates("blue_901_day"),
};

export function outfitPlatesFor(id: ApparelId | string | null | undefined): OutfitPlatePack | null {
  if (!id) return null;
  return OUTFIT_PLATES[id as ApparelId] ?? null;
}

export function outfitImageKey(id: ApparelId, view: View) {
  return `fit-${id}-${view}`;
}
