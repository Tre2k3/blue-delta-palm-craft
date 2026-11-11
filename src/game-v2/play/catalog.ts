import type { OutfitId } from "../assets/cast";

/**
 * What the HQ sells. Every piece is a real SackReligious product: the in-game price is
 * SackDollars, the real price and link are for the store. Pieces Benji has art for can be worn.
 */
export type Product = {
  id: string;
  name: string;
  /** Real price in US dollars. */
  usd: number;
  /** In-game price in SackDollars. */
  cost: number;
  image: string;
  /** Path on the store, e.g. /product/sr-tour-black. */
  storePath: string;
  sizes: string[];
  wear?: OutfitId;
  blurb: string;
};

const SIZES = ["S", "M", "L", "XL", "2XL"];
const p = (id: string, name: string, usd: number, cost: number, image: string, blurb: string, wear?: OutfitId, sizes = SIZES): Product => ({
  id,
  name,
  usd,
  cost,
  image,
  storePath: `/product/${id}`,
  sizes,
  wear,
  blurb,
});

export const CATALOG: Product[] = [
  p("sr-starter-tee", "Starter Green Tee", 38, 0, "/game/products/sr-starter-tee.webp", "The one Benji wears out the door. Green, white script, built for the block.", "starter"),
  p("sr-tour-black", "Worldwide Tour Tee · Black", 55, 180, "/game/apparel/tour-black-front.webp", "Diamond $ on black. EST. 2020. Klothing Kompany Worldwide.", "tour_black"),
  p("sr-tour-white", "Worldwide Tour Tee · White", 55, 180, "/game/apparel/tour-white-front.webp", "White diamond $ tour tee. Clean enough for Sunday, loud enough for Beale.", "tour_white"),
  p("sr-tour-red", "Worldwide Tour Tee · Red", 55, 180, "/game/apparel/tour-red-front.webp", "Red tour tee. You will be seen from the bleachers.", "tour_red"),
  p("sr-fresh-jersey", "FRESH 38127 Jersey", 120, 320, "/game/products/sr-fresh-jersey.webp", "Court kit. Sackrow on the chest, 38127 on the back.", "sackrow_11"),
  p("sr-black-gold-tee", "Black & Gold Tee", 48, 150, "/game/products/sr-black-gold-tee.webp", "Black cotton, gold script. The boutique's best seller."),
  p("sr-moneybag-hoodie", "Moneybag Hoodie", 92, 260, "/game/products/sr-moneybag-hoodie.webp", "Heavyweight fleece with the moneybag on the back."),
  p("sr-midnight-hoodie", "Midnight Hoodie", 88, 240, "/game/products/sr-midnight-hoodie.webp", "All black. For the river after dark."),
  p("sr-green-sweats", "Green Sweat Set", 110, 280, "/game/products/sr-green-sweats.webp", "Matching set in SackReligious green."),
  p("sr-white-snapback", "White Snapback", 36, 90, "/game/products/sr-white-snapback.webp", "The cap. Green script, flat brim.", undefined, ["OS"]),
  p("sr-moneybag-chain", "Moneybag Chain", 160, 400, "/game/products/sr-moneybag-chain.png", "Gold rope, $ medallion. Heavy.", undefined, ["OS"]),
  p("sr-gold-drop", "Gold Drop Tee", 96, 300, "/game/products/sr-gold-drop.webp", "Limited run. Gold foil on black."),
  p("sr-night-run", "Night Run Set", 140, 360, "/game/products/sr-night-run.webp", "Reflective set for the strip."),
];

export const STORE_HOME = "https://10letters.store/store";

export function productById(id: string) {
  return CATALOG.find((x) => x.id === id) ?? null;
}

/** Every piece owned adds this much to SackDollar payouts. */
export const COLLECTION_BONUS = 0.02;
