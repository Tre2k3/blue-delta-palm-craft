import * as THREE from "three";
import { keyedTexture } from "./chroma";

export const PEOPLE_URLS = {
  "k-blanco": "/game/people/k-blanco.png",
  supporter: "/game/people/supporter.png",
  fan: "/game/people/fan.png",
  host: "/game/people/host.png",
  local: "/game/people/local.png",
  "court-og": "/game/people/court-og.png",
  dj: "/game/people/dj.png",
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

export const NPC_SPRITE: Record<string, keyof typeof PEOPLE_URLS> = {
  k_blanco: "k-blanco",
  supporter_1: "supporter",
  downtown_fan: "fan",
  culture_host: "host",
  court_coach: "court-og",
  street_npc: "local",
  beale_dj: "dj",
};

export const PED_SKINS: (keyof typeof PEOPLE_URLS)[] = ["supporter", "fan", "host", "local"];
export const CAR_SKINS: (keyof typeof CAR_URLS)[] = ["sedan", "suv", "chevy", "coupe"];

export type CityArt = {
  people: Partial<Record<keyof typeof PEOPLE_URLS, THREE.Texture>>;
  cars: Partial<Record<keyof typeof CAR_URLS, THREE.Texture>>;
  facades: Partial<Record<keyof typeof FACADE_URLS, THREE.Texture>>;
};

function spriteTex(img: HTMLImageElement, keyed: boolean) {
  const src = keyed ? keyedTexture(img) : img;
  const tex = new THREE.Texture(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 8;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

async function loadMap<T extends string>(
  urls: Record<T, string>,
  keyed: boolean,
): Promise<Partial<Record<T, THREE.Texture>>> {
  const out: Partial<Record<T, THREE.Texture>> = {};
  await Promise.all(
    (Object.keys(urls) as T[]).map(async (k) => {
      try {
        out[k] = spriteTex(await loadImage(urls[k]!), keyed);
      } catch {
        /* optional city art */
      }
    }),
  );
  return out;
}

export async function loadCityArt(): Promise<CityArt> {
  const [people, cars, facades] = await Promise.all([
    loadMap(PEOPLE_URLS, true),
    loadMap(CAR_URLS, true),
    loadMap(FACADE_URLS, false),
  ]);
  return { people, cars, facades };
}

export function facadeFor(id: string): keyof typeof FACADE_URLS | null {
  if (id === "store" || id === "downtown") return "hq";
  if (id === "apartment" || id === "neighborhood") return "apartment";
  if (id === "beale" || id === "culture") return "beale";
  return null;
}
