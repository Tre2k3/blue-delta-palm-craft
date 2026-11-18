import { OUTFIT_PLATES, outfitImageKey } from "./outfitSprites";
import { BASKETBALL_SPRITES, basketballImageKey } from "./basketballSprites";
import type { ApparelId } from "./types";

export type AssetEntry = { id: string; runtimeKey: string; path: string };
export type AssetLoadStatus = "loaded" | "missing";

/** Core boot catalog. Existing per-family maps remain authoritative. */
export function bootAssetCatalog(): AssetEntry[] {
  const bootImages: Record<string, string> = {
    front: "/game/benji-front-norm.webp",
    back: "/game/benji-back-norm.webp",
    left: "/game/benji-left-norm.webp",
    right: "/game/benji-right-norm.webp",
    frontHi: "/game/benji-front.webp",
    backHi: "/game/benji-back.webp",
    leftHi: "/game/benji-left.webp",
    rightHi: "/game/benji-right.webp",
    threeQ: "/game/benji-three-quarter.webp",
    icon: "/game/sack-icon.png",
    k: "/game/k-blanco-portrait.webp",
    featured: "/game/featured-products.webp",
    "walk-front-1": "/game/benji/walk-front-1.webp",
    "walk-front-2": "/game/benji/walk-front-2.webp",
    "walk-front-3": "/game/benji/walk-front-3.webp",
    "walk-front-4": "/game/benji/walk-front-4.webp",
    "walk-back-1": "/game/benji/walk-back-1.webp",
    "walk-back-2": "/game/benji/walk-back-2.webp",
    "walk-back-3": "/game/benji/walk-back-3.webp",
    "walk-back-4": "/game/benji/walk-back-4.webp",
    "walk-left-1": "/game/benji/walk-left-1.webp",
    "walk-left-2": "/game/benji/walk-left-2.webp",
    "walk-left-3": "/game/benji/walk-left-3.webp",
    "walk-left-4": "/game/benji/walk-left-4.webp",
    "walk-right-1": "/game/benji/walk-right-1.webp",
    "walk-right-2": "/game/benji/walk-right-2.webp",
    "walk-right-3": "/game/benji/walk-right-3.webp",
    "walk-right-4": "/game/benji/walk-right-4.webp",
    "jump-1": "/game/benji/jump-1.webp",
    "jump-2": "/game/benji/jump-2.webp",
    "jump-3": "/game/benji/jump-3.webp",
    "jump-4": "/game/benji/jump-4.webp",
    "dribble-1": "/game/benji/dribble-1.webp",
    "dribble-2": "/game/benji/dribble-2.webp",
    "dribble-3": "/game/benji/dribble-3.webp",
    "dribble-4": "/game/benji/dribble-4.webp",
    "gather-1": "/game/benji/gather-1.webp",
    "gather-2": "/game/benji/gather-2.webp",
    "release-1": "/game/benji/release-1.webp",
    "release-2": "/game/benji/release-2.webp",
    "rebound-1": "/game/benji/rebound-1.webp",
    "rebound-2": "/game/benji/rebound-2.webp",
    "celebrate-1": "/game/benji/celebrate-1.webp",
    "celebrate-2": "/game/benji/celebrate-2.webp",
    "talk-1": "/game/benji/talk-1.webp",
    "interact-1": "/game/benji/interact-1.webp",
    "phone-1": "/game/benji/phone-1.webp",
    "tour-black-front": "/game/apparel/stamps/tour-black-print.webp",
    "tour-black-back": "/game/apparel/stamps/tour-black-tour.webp",
    "tour-white-front": "/game/apparel/stamps/tour-white-print.png",
    "tour-white-back": "/game/apparel/stamps/tour-white-tour.webp",
    "tour-red-front": "/game/apparel/stamps/tour-red-print.webp",
    "tour-red-back": "/game/apparel/stamps/tour-red-tour.webp",
  };
  for (const [id, pack] of Object.entries(OUTFIT_PLATES)) {
    for (const view of ["front", "back", "left", "right"] as const) {
      bootImages[outfitImageKey(id as ApparelId, view)] = pack[view];
    }
  }
  for (const [id, pack] of Object.entries(BASKETBALL_SPRITES)) {
    bootImages[basketballImageKey(id as ApparelId, "ready")] = pack.ready;
    bootImages[basketballImageKey(id as ApparelId, "drive")] = pack.drive;
    bootImages[basketballImageKey(id as ApparelId, "shotFront")] = pack.shotFront;
    bootImages[basketballImageKey(id as ApparelId, "shotBack")] = pack.shotBack;
  }
  return Object.entries(bootImages).map(([runtimeKey, path]) => ({
    id: runtimeKey === "k" ? "character.k_blanco.portrait"
      : runtimeKey.startsWith("bb-") ? `outfit.basketball.${runtimeKey}`
      : runtimeKey.startsWith("fit-") ? `outfit.${runtimeKey}`
      : path.includes("/apparel/") ? `outfit.print.${runtimeKey}`
      : path.includes("benji") ? `character.benji.${runtimeKey}`
      : `ui.${runtimeKey}`,
    runtimeKey,
    path,
  }));
}
