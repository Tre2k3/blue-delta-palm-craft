import * as THREE from "three";
import { ART_REV } from "./data";
import { keyedTexture, preparePeoplePlate } from "./chroma";
import { hardenCutoutTexture } from "./cutout";

export const PEOPLE_URLS = {
  "k-blanco": "/game/people/k-blanco-front.webp",
  supporter: "/game/people/supporter.webp",
  fan: "/game/people/fan.webp",
  host: "/game/people/host.webp",
  local: "/game/people/local.webp",
  "court-og": "/game/people/court-og.webp",
  dj: "/game/people/dj.webp",
  baller: "/game/people/baller-1.webp",
  walker0: "/game/people/walker-00.webp",
  walker1: "/game/people/walker-01.webp",
  walker2: "/game/people/walker-02.webp",
  walker3: "/game/people/walker-03.webp",
  walker4: "/game/people/walker-04.webp",
  walker5: "/game/people/walker-05.webp",
  walker6: "/game/people/walker-06.webp",
  walker7: "/game/people/walker-07.webp",
} as const;

export const CAR_URLS = {
  sedan: "/game/cars/sedan.webp",
  suv: "/game/cars/suv.webp",
  chevy: "/game/cars/chevy.webp",
  coupe: "/game/cars/coupe.webp",
  van: "/game/cars/van.webp",
} as const;

export const FACADE_URLS = {
  hq: "/game/facades/hq.webp",
  apartment: "/game/facades/apartment.webp",
  beale: "/game/facades/beale.webp",
  court: "/game/facades/court-901-day.webp",
  courtSackrow: "/game/facades/court-floor.webp",
} as const;

export const STORE_URLS = {
  main: "/game/store/main-floor.webp",
  checkout: "/game/store/checkout.webp",
  entry: "/game/store/entry.webp",
  exit: "/game/store/exit.webp",
  merch: "/game/store/merch-wall.webp",
  featured: "/game/store/featured.webp",
  counter: "/game/store/counter.webp",
  welcome: "/game/store/welcome.webp",
} as const;

export const NPC_SPRITE: Record<string, keyof typeof PEOPLE_URLS> = {
  k_blanco: "k-blanco",
  supporter_1: "supporter",
  downtown_fan: "fan",
  culture_host: "host",
  court_coach: "court-og",
  street_npc: "local",
  beale_dj: "dj",
  photog: "baller",
  cam: "walker3",
  lane_clerk: "local",
  rcm_chauffeur: "host",
};

export const PED_SKINS: (keyof typeof PEOPLE_URLS)[] = [
  "walker0",
  "walker1",
  "walker2",
  "walker3",
  "walker4",
  "walker5",
  "walker6",
  "walker7",
];
export const CAR_SKINS: (keyof typeof CAR_URLS)[] = ["sedan", "suv", "chevy", "coupe"];
export const FOOD_URLS = {
  velis: "/game/food/velis-wings.webp",
  brothers: "/game/food/brothers-wingz.webp",
  catch: "/game/food/901-catch.png",
} as const;

export const AD_URLS = {
  "sacks-giving": "/game/ads/sacks-giving.webp",
  "901-ballers": "/game/ads/901-ballers.webp",
  "901-emblem": "/game/ads/901-emblem.webp",
  "901-luxury": "/game/ads/901-luxury.webp",
  "rcm-worx": "/game/ads/rcm-worx.png",
} as const;

export type CityArt = {
  people: Partial<Record<keyof typeof PEOPLE_URLS, THREE.Texture>>;
  cars: Partial<Record<keyof typeof CAR_URLS, THREE.Texture>>;
  facades: Partial<Record<keyof typeof FACADE_URLS, THREE.Texture>>;
  store: Partial<Record<keyof typeof STORE_URLS, THREE.Texture>>;
  food: Partial<Record<keyof typeof FOOD_URLS, THREE.Texture>>;
  ads: Partial<Record<keyof typeof AD_URLS, THREE.Texture>>;
};

function spriteTex(src: HTMLImageElement | HTMLCanvasElement, keyed: boolean, cutout = false) {
  const prepared = cutout
    ? preparePeoplePlate(src)
    : keyed && src instanceof HTMLImageElement
      ? keyedTexture(src)
      : src;
  const tex = new THREE.Texture(prepared);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (cutout) hardenCutoutTexture(tex);
  else {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.anisotropy = 8;
  }
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.premultiplyAlpha = false;
  tex.needsUpdate = true;
  return tex;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = `${src}?v=${ART_REV}`;
  });
}

function cropCourtFloor(img: HTMLImageElement) {
  // Sackrow Ballers court already has its gold chain frame. Only trim studio black.
  const canvas = document.createElement("canvas");
  const cutX = Math.round(img.width * 0.015);
  const cutY = Math.round(img.height * 0.02);
  canvas.width = Math.max(32, img.width - cutX * 2);
  canvas.height = Math.max(32, img.height - cutY * 2);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, cutX, cutY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function loadMap<T extends string>(
  urls: Record<T, string>,
  keyed: boolean,
  cutout = false,
): Promise<Partial<Record<T, THREE.Texture>>> {
  const out: Partial<Record<T, THREE.Texture>> = {};
  await Promise.all(
    (Object.keys(urls) as T[]).map(async (k) => {
      try {
        const img = await loadImage(urls[k]!);
        const src = k === "court" || k === "courtSackrow" ? cropCourtFloor(img) : img;
        out[k] = spriteTex(src, keyed, cutout);
      } catch {
        /* optional city art */
      }
    }),
  );
  return out;
}

async function loadPeople(): Promise<Partial<Record<keyof typeof PEOPLE_URLS, THREE.Texture>>> {
  return loadMap(PEOPLE_URLS, false, true);
}

export async function loadCityArt(): Promise<CityArt> {
  const [people, cars, facades, store, food, ads] = await Promise.all([
    loadPeople(),
    loadMap(CAR_URLS, true),
    loadMap(FACADE_URLS, false),
    loadMap(STORE_URLS, false),
    loadMap(FOOD_URLS, false),
    loadMap(AD_URLS, false),
  ]);
  return { people, cars, facades, store, food, ads };
}

export function facadeFor(id: string): keyof typeof FACADE_URLS | null {
  if (id === "store" || id === "downtown") return "hq";
  if (id === "apartment" || id === "neighborhood") return "apartment";
  if (id === "beale" || id === "culture") return "beale";
  if (id === "lanes") return "hq";
  return null;
}
