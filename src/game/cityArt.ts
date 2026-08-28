import * as THREE from "three";
import { ART_REV } from "./data";
import { keyedTexture, cleanSprite } from "./chroma";
import { hardenCutoutTexture } from "./cutout";

export const PEOPLE_URLS = {
  "k-blanco": "/game/people/k-blanco-front.png",
  supporter: "/game/people/supporter.png",
  fan: "/game/people/fan.png",
  host: "/game/people/host.png",
  local: "/game/people/local.png",
  "court-og": "/game/people/court-og.png",
  dj: "/game/people/dj.png",
  baller: "/game/people/baller-1.png",
  walker0: "/game/people/walker-00.png",
  walker1: "/game/people/walker-01.png",
  walker2: "/game/people/walker-02.png",
  walker3: "/game/people/walker-03.png",
  walker4: "/game/people/walker-04.png",
  walker5: "/game/people/walker-05.png",
  walker6: "/game/people/walker-06.png",
  walker7: "/game/people/walker-07.png",
} as const;

export const CAR_URLS = {
  sedan: "/game/cars/sedan.png",
  suv: "/game/cars/suv.png",
  chevy: "/game/cars/chevy.png",
  coupe: "/game/cars/coupe.png",
  van: "/game/cars/van.png",
} as const;

export const FACADE_URLS = {
  hq: "/game/facades/hq.jpg",
  apartment: "/game/facades/apartment.jpg",
  beale: "/game/facades/beale.jpg",
  court: "/game/facades/court-floor.jpg",
} as const;

export const STORE_URLS = {
  main: "/game/store/main-floor.jpg",
  checkout: "/game/store/checkout.jpg",
  entry: "/game/store/entry.jpg",
  exit: "/game/store/exit.jpg",
  merch: "/game/store/merch-wall.jpg",
  featured: "/game/store/featured.jpg",
  counter: "/game/store/counter.jpg",
  welcome: "/game/store/welcome.jpg",
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
  velis: "/game/food/velis-wings.png",
  brothers: "/game/food/brothers-wingz.png",
  catch: "/game/food/901-catch.png",
} as const;

export const AD_URLS = {
  "sacks-giving": "/game/ads/sacks-giving.jpg",
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
    ? cleanSprite(src)
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
        const src = k === "court" ? cropCourtFloor(img) : img;
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
  return null;
}
