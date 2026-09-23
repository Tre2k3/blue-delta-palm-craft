import type { ApparelId } from "./types";
import { outfitPlatesFor } from "./outfitSprites";

export type BasketballSpritePack = {
  ready: string;
  drive: string;
  shotFront: string;
  shotBack: string;
};

const pose = (folder: string, name: string) => `/game/benji/basketball/${folder}/${name}.png`;

const pack = (folder: string, shots = folder): BasketballSpritePack => ({
  ready: pose(folder, "ready"),
  drive: pose(folder, "drive"),
  shotFront: pose(shots, "shot-front"),
  shotBack: pose(shots, "shot-back"),
});

/**
 * Empty-hand hoop poses (the ball is a separate Three.js mesh). Folders audited frame by frame:
 * - basketball/jersey_black_fresh holds the white tour tee; basketball/tour_white holds the white
 *   224 jersey; basketball/jersey_white_224 holds the black Fresh tank.
 * - tour_red, tour_black and the black Fresh tank have headless shot-front / shot-back plates
 *   (an old dark-flood key ate the head). Black tops borrow black_sackrow_11's shots; the red tee
 *   holds its own ready pose through the shot rather than showing a headless Benji.
 */
export const BASKETBALL_SPRITES: Partial<Record<ApparelId, BasketballSpritePack>> = {
  starter_tee: pack("starter_tee"),
  tour_red: {
    ...pack("tour_red"),
    shotFront: pose("tour_red", "ready"),
    shotBack: pose("tour_red", "ready"),
  },
  tour_white: pack("jersey_black_fresh"),
  tour_black: pack("tour_black", "black_sackrow_11"),
  jersey_black_fresh: pack("jersey_white_224", "black_sackrow_11"),
  jersey_white_224: pack("tour_white"),
  jersey_blue_fresh: pack("blue_901_day"),
  black_sackrow_11: pack("black_sackrow_11"),
  blue_901_day: pack("blue_901_day"),
};

/** Blue Fresh borrows the 901 Day pose pack until its own is delivered. */
export const BASKETBALL_PACK_PENDING: ApparelId[] = ["jersey_blue_fresh"];

export function basketballImageKey(id: ApparelId, pose: keyof BasketballSpritePack) {
  return `bb-${id}-${pose}`;
}

export function basketballPackFor(id: ApparelId | string | null | undefined): BasketballSpritePack | null {
  if (!id) return null;
  const known = BASKETBALL_SPRITES[id as ApparelId];
  if (known) return known;
  const plates = outfitPlatesFor(id);
  if (plates?.front) {
    return {
      ready: plates.front,
      drive: plates.front,
      shotFront: plates.front,
      shotBack: plates.back || plates.front,
    };
  }
  return BASKETBALL_SPRITES.starter_tee ?? null;
}