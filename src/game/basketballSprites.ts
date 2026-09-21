import type { ApparelId } from "./types";
import { outfitPlatesFor } from "./outfitSprites";

export type BasketballSpritePack = {
  ready: string;
  drive: string;
  shotFront: string;
  shotBack: string;
};

/**
 * Visual audit of benji_individualized_basketball_outfits.zip
 *
 * five UNIQUE action sheets:
 *   tour_red, tour_white, tour_black, jersey_black_fresh, jersey_white_224
 *
 * black_sackrow_11 and blue_901_day use the 901 Day pose pack
 * (ready / drive / shot-front / shot-back). Empty hands — ball is a
 * separate Three.js mesh.
 */
export const BASKETBALL_SPRITES: Partial<Record<ApparelId, BasketballSpritePack>> = {
  starter_tee: {
    ready: "/game/benji/basketball/starter_tee/ready.png",
    drive: "/game/benji/basketball/starter_tee/drive.png",
    shotFront: "/game/benji/basketball/starter_tee/shot-front.png",
    shotBack: "/game/benji/basketball/starter_tee/shot-back.png",
  },
  tour_red: {
    ready: "/game/benji/basketball/tour_red/ready.png",
    drive: "/game/benji/basketball/tour_red/drive.png",
    shotFront: "/game/benji/basketball/tour_red/shot-front.png",
    shotBack: "/game/benji/basketball/tour_red/shot-back.png",
  },
  tour_white: {
    ready: "/game/benji/basketball/tour_white/ready.png",
    drive: "/game/benji/basketball/tour_white/drive.png",
    shotFront: "/game/benji/basketball/tour_white/shot-front.png",
    shotBack: "/game/benji/basketball/tour_white/shot-back.png",
  },
  tour_black: {
    ready: "/game/benji/basketball/tour_black/ready.png",
    drive: "/game/benji/basketball/tour_black/drive.png",
    shotFront: "/game/benji/basketball/tour_black/shot-front.png",
    shotBack: "/game/benji/basketball/tour_black/shot-back.png",
  },
  jersey_black_fresh: {
    ready: "/game/benji/basketball/jersey_black_fresh/ready.png",
    drive: "/game/benji/basketball/jersey_black_fresh/drive.png",
    shotFront: "/game/benji/basketball/jersey_black_fresh/shot-front.png",
    shotBack: "/game/benji/basketball/jersey_black_fresh/shot-back.png",
  },
  jersey_white_224: {
    ready: "/game/benji/basketball/jersey_white_224/ready.png",
    drive: "/game/benji/basketball/jersey_white_224/drive.png",
    shotFront: "/game/benji/basketball/jersey_white_224/shot-front.png",
    shotBack: "/game/benji/basketball/jersey_white_224/shot-back.png",
  },
  black_sackrow_11: {
    ready: "/game/benji/basketball/black_sackrow_11/ready.png",
    drive: "/game/benji/basketball/black_sackrow_11/drive.png",
    shotFront: "/game/benji/basketball/black_sackrow_11/shot-front.png",
    shotBack: "/game/benji/basketball/black_sackrow_11/shot-back.png",
  },
  blue_901_day: {
    ready: "/game/benji/basketball/blue_901_day/ready.png",
    drive: "/game/benji/basketball/blue_901_day/drive.png",
    shotFront: "/game/benji/basketball/blue_901_day/shot-front.png",
    shotBack: "/game/benji/basketball/blue_901_day/shot-back.png",
  },
};

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