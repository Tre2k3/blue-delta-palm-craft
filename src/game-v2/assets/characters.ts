/**
 * Runtime character registry for the production rebuild.
 * Every path is a transparent cutout under public/game-v2/characters/.
 * Named cast is cut from the Character Bible photographs
 * (SackReligious_Character_Bible_AI_Reference_Pack). Not the old
 * illustrated public/game people.
 *
 * Direction contract: A = screen-left, D = screen-right, W = back, S = front.
 * Benji screen-left is benji_three_quarter_CANONICAL (faces left).
 * Benji screen-right is benji_left_CANONICAL (the file faces right).
 *
 * Pedestrians are illustrated in the same family as the named cast.
 * They are not photographs and they are not the old game cutouts.
 * Each has a standing frame and one stride frame. The root is the sole.
 */
export type Facing = "front" | "back" | "left" | "right";

export type Cutout = {
  src: string;
  pxW: number;
  pxH: number;
  /** Transparent rows under the sole. 0 means the shoe touches the PNG bottom. */
  footPad: number;
};

export type CharacterAsset = {
  id: string;
  height: number;
  views: { front: Cutout; walk?: Cutout } & Partial<Record<Facing, Cutout>>;
  portrait?: string;
  /** Production-pack file this runtime art was cut from, when one exists. */
  bible?: string;
};

const cut = (src: string, pxW: number, pxH: number, footPad = 0): Cutout => ({
  src: `${src}?v=6`,
  pxW,
  pxH,
  footPad,
});

const turnaround = (
  folder: string,
  front: [number, number],
  back: [number, number],
  left: [number, number],
  right: [number, number],
) => ({
  front: cut(`/game-v2/characters/${folder}/front.png`, front[0], front[1]),
  back: cut(`/game-v2/characters/${folder}/back.png`, back[0], back[1]),
  left: cut(`/game-v2/characters/${folder}/left.png`, left[0], left[1]),
  right: cut(`/game-v2/characters/${folder}/right.png`, right[0], right[1]),
});

export const characters = {
  benji: {
    id: "benji",
    height: 1.68,
    // Canonical identity PNGs. Screen-left is the three-quarter file;
    // the file named "left" actually faces screen-right.
    views: {
      front: cut("/game-v2/characters/benji/front.png", 200, 535, 1),
      back: cut("/game-v2/characters/benji/back.png", 197, 515, 1),
      left: cut("/game-v2/characters/benji/left.png", 216, 530, 1),
      right: cut("/game-v2/characters/benji/right.png", 227, 538, 1),
      walk: cut("/game-v2/characters/benji/walk.png", 672, 1649, 0),
    },
    bible: "01_Benji/00_Canonical_Identity/",
  },
  kBlanco: {
    id: "k-blanco",
    height: 1.94,
    views: turnaround("k-blanco", [170, 514], [175, 474], [108, 568], [123, 568]),
    portrait: "/game-v2/characters/k-blanco/portrait.png",
    bible: "02_Core_NPCs/01_K_Blanco_CANONICAL/k_blanco_CANONICAL_reference.png",
  },
  courtOg: {
    id: "court-og",
    height: 2.04,
    views: turnaround("court-og", [321, 612], [294, 612], [275, 612], [269, 640]),
    bible: "02_Core_NPCs/02_Court_OG/court_og_reference_sheet.png",
  },
  mamaDee: {
    id: "mama-dee",
    height: 1.84,
    views: turnaround("mama-dee", [270, 760], [265, 762], [268, 761], [227, 760]),
    bible: "02_Core_NPCs/03_Mama_Dee/mama_dee_reference_sheet.png",
  },
  uncJ: {
    id: "unc-j",
    height: 1.9,
    views: turnaround("unc-j", [280, 631], [280, 710], [306, 633], [298, 625]),
    bible: "02_Core_NPCs/04_Unc_J/unc_j_reference_sheet.png",
  },
  nitro: {
    id: "nitro",
    height: 1.86,
    views: turnaround("nitro", [292, 748], [271, 745], [270, 752], [252, 750]),
    bible: "02_Core_NPCs/05_Nitro/nitro_reference_sheet.png",
  },
  strike: {
    id: "strike",
    height: 1.8,
    views: turnaround("strike", [259, 669], [283, 626], [263, 631], [234, 619]),
    bible: "02_Core_NPCs/06_Strike/strike_reference_sheet.png",
  },
  pedestrian: {
    male01: { id: "ped-male-01", height: 1.78, views: { front: cut("/game-v2/characters/pedestrians/male-01.png", 613, 1603), walk: cut("/game-v2/characters/pedestrians/male-01-walk.png", 658, 1564) } },
    female01: { id: "ped-female-01", height: 1.72, views: { front: cut("/game-v2/characters/pedestrians/female-01.png", 492, 1606), walk: cut("/game-v2/characters/pedestrians/female-01-walk.png", 595, 1557) } },
    male02: { id: "ped-male-02", height: 1.7, views: { front: cut("/game-v2/characters/pedestrians/male-02.png", 645, 1664), walk: cut("/game-v2/characters/pedestrians/male-02-walk.png", 698, 1615) } },
    female02: { id: "ped-female-02", height: 1.68, views: { front: cut("/game-v2/characters/pedestrians/female-02.png", 552, 1605), walk: cut("/game-v2/characters/pedestrians/female-02-walk.png", 632, 1576) } },
    male03: { id: "ped-male-03", height: 1.8, views: { front: cut("/game-v2/characters/pedestrians/male-03.png", 647, 1601), walk: cut("/game-v2/characters/pedestrians/male-03-walk.png", 657, 1591) } },
    female03: { id: "ped-female-03", height: 1.66, views: { front: cut("/game-v2/characters/pedestrians/female-03.png", 516, 1639), walk: cut("/game-v2/characters/pedestrians/female-03-walk.png", 540, 1641) } },
    male04: { id: "ped-male-04", height: 1.76, views: { front: cut("/game-v2/characters/pedestrians/male-04.png", 578, 1601), walk: cut("/game-v2/characters/pedestrians/male-04-walk.png", 558, 1576) } },
    female04: { id: "ped-female-04", height: 1.64, views: { front: cut("/game-v2/characters/pedestrians/female-04.png", 594, 1628), walk: cut("/game-v2/characters/pedestrians/female-04-walk.png", 659, 1596) } },
  },
} as const satisfies Record<string, CharacterAsset | Record<string, CharacterAsset>>;

export type Spawnable = CharacterAsset;

export function frameSize(asset: { height: number; views: { front: Cutout } & Partial<Record<Facing, Cutout>> }, facing: Facing = "front") {
  const view = asset.views[facing] ?? asset.views.front;
  const h = asset.height;
  const w = h * (view.pxW / view.pxH);
  return { w, h, src: view.src, footPad: view.footPad, pxH: view.pxH };
}
