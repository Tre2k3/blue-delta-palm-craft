import type { ApparelId } from "./types";

export type View = "front" | "back" | "left" | "right";

export type OutfitLook = {
  id: ApparelId;
  /** Recolor the hoodie / tee / jersey fabric. Null keeps the source green. */
  shirt: [number, number, number] | null;
  /** Recolor shorts / sweats. Null keeps source shorts. */
  shorts: [number, number, number] | null;
  /** Recolor the cap. Null keeps the white/green lid. */
  cap: [number, number, number] | null;
  /** Keep the gold chain pixels and boost them. */
  chain: boolean;
  /** Replace the chest graphic so it matches the IRL product. */
  graphic: "none" | "starter" | "classic" | "moneybag" | "midnight" | "jersey" | "chain" | "worldwide";
  hoodie: boolean;
  lightShirt?: boolean;
  stampFront?: string;
  stampBack?: string;
  overlay?: string;
  thumb: { src: string; crop: [number, number, number, number] };
};

/** Each virtual fit is a full look that matches its catalog product. */
export const OUTFIT_LOOKS: Record<ApparelId, OutfitLook> = {
  starter_tee: {
    id: "starter_tee",
    shirt: null,
    shorts: null,
    cap: null,
    chain: true,
    graphic: "starter",
    hoodie: true,
    thumb: { src: "/game/featured-products.png", crop: [1 / 3, 0, 1 / 3, 1 / 3] },
  },
  classic_green: {
    id: "classic_green",
    shirt: [18, 18, 18],
    shorts: null,
    cap: [245, 245, 245],
    chain: true,
    graphic: "classic",
    hoodie: false,
    thumb: { src: "/game/featured-products.png", crop: [0, 0, 1 / 3, 1 / 3] },
  },
  moneybag_hoodie: {
    id: "moneybag_hoodie",
    shirt: [16, 92, 42],
    shorts: [12, 12, 12],
    cap: [245, 245, 245],
    chain: true,
    graphic: "moneybag",
    hoodie: true,
    thumb: { src: "/game/featured-products.png", crop: [0, 0, 1 / 3, 1 / 3] },
  },
  black_hoodie: {
    id: "black_hoodie",
    shirt: [14, 14, 16],
    shorts: [10, 10, 10],
    cap: [20, 20, 20],
    chain: false,
    graphic: "midnight",
    hoodie: true,
    thumb: { src: "/game/featured-products.png", crop: [0, 0, 1 / 3, 1 / 3] },
  },
  fresh_jersey: {
    id: "fresh_jersey",
    shirt: [12, 110, 102],
    shorts: [8, 24, 32],
    cap: [245, 245, 245],
    chain: false,
    graphic: "jersey",
    hoodie: false,
    thumb: { src: "/game/k-blanco-jerseys.png", crop: [0.18, 0.08, 0.28, 0.55] },
  },
  white_cap: {
    id: "white_cap",
    shirt: [22, 140, 72],
    shorts: null,
    cap: [252, 252, 252],
    chain: true,
    graphic: "starter",
    hoodie: true,
    thumb: { src: "/game/featured-products.png", crop: [2 / 3, 0, 1 / 3, 1 / 3] },
  },
  gold_chain: {
    id: "gold_chain",
    shirt: [14, 16, 16],
    shorts: [12, 12, 12],
    cap: [245, 245, 245],
    chain: true,
    graphic: "chain",
    hoodie: true,
    thumb: { src: "/game/sack-icon.png", crop: [0, 0, 1, 1] },
  },
  green_sweats: {
    id: "green_sweats",
    shirt: [20, 150, 70],
    shorts: [18, 130, 58],
    cap: [245, 245, 245],
    chain: true,
    graphic: "moneybag",
    hoodie: true,
    thumb: { src: "/game/featured-products.png", crop: [1 / 3, 1 / 3, 1 / 3, 1 / 3] },
  },
  gold_drop: {
    id: "gold_drop",
    shirt: [201, 168, 76],
    shorts: [18, 18, 16],
    cap: [245, 230, 180],
    chain: true,
    graphic: "classic",
    hoodie: true,
    thumb: { src: "/game/sack-icon.png", crop: [0, 0, 1, 1] },
  },
  night_run: {
    id: "night_run",
    shirt: [10, 12, 10],
    shorts: [8, 10, 8],
    cap: [20, 20, 20],
    chain: true,
    graphic: "midnight",
    hoodie: true,
    thumb: { src: "/game/logo-wall.png", crop: [0, 0, 1, 1] },
  },
  kollab_jersey: {
    id: "kollab_jersey",
    shirt: [201, 168, 76],
    shorts: [12, 12, 14],
    cap: [245, 230, 180],
    chain: true,
    graphic: "jersey",
    hoodie: false,
    thumb: { src: "/game/k-blanco-jerseys.png", crop: [0.52, 0.08, 0.28, 0.55] },
  },
  tour_black: {
    id: "tour_black",
    shirt: [14, 14, 16],
    shorts: [10, 10, 12],
    cap: [245, 245, 245],
    chain: true,
    graphic: "worldwide",
    hoodie: false,
    stampFront: "tour-black-front",
    stampBack: "tour-black-back",
    overlay: "tour-black",
    thumb: { src: "/game/apparel/tour-black-front.png", crop: [0, 0, 1, 1] },
  },
  tour_white: {
    id: "tour_white",
    shirt: [236, 236, 238],
    shorts: [18, 18, 20],
    cap: [245, 245, 245],
    chain: true,
    graphic: "worldwide",
    hoodie: false,
    lightShirt: true,
    stampFront: "tour-white-front",
    stampBack: "tour-white-back",
    overlay: "tour-white",
    thumb: { src: "/game/apparel/tour-white-front.png", crop: [0, 0, 1, 1] },
  },
  tour_red: {
    id: "tour_red",
    shirt: [176, 22, 36],
    shorts: [18, 12, 14],
    cap: [245, 245, 245],
    chain: true,
    graphic: "worldwide",
    hoodie: false,
    stampFront: "tour-red-front",
    stampBack: "tour-red-back",
    overlay: "tour-red",
    thumb: { src: "/game/apparel/tour-red-front.png", crop: [0, 0, 1, 1] },
  },
};

export function lookFor(id: ApparelId | string | null | undefined): OutfitLook {
  if (id && id in OUTFIT_LOOKS) return OUTFIT_LOOKS[id as ApparelId];
  return OUTFIT_LOOKS.starter_tee;
}

export function overlayKey(look: OutfitLook, view: View) {
  if (!look.overlay) return undefined;
  return `overlay-${look.overlay}-${view}`;
}

export function stampFor(look: OutfitLook, view: View) {
  return view === "back" ? look.stampBack : look.stampFront;
}
