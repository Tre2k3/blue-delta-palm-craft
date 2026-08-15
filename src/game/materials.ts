import * as THREE from "three";
import "./runtimeRaycastSafetyV8";
import "./runtimeFixesV2";
import "./runtimeWatchdog";
import "./runtimeGameV8";
import "./runtimeCharacterRendererV8";
import "./runtimeBasketballStabilityV8";
import "./runtimeV8Guard";

export const MAT_URLS = {
  asphalt: "/game/materials/01_asphalt_basecolor.png",
  sidewalk: "/game/materials/02_sidewalk_basecolor.png",
  brick: "/game/materials/03_old_memphis_brick_basecolor.png",
  windows: "/game/materials/04_window_facade_emissive_reference.png",
  roof: "/game/materials/05_rooftop_tar_gravel_basecolor.png",
  court: "/game/materials/06_court_wood_basecolor.png",
  courtLines: "/game/materials/07_court_lines_and_clay_reference.png",
  canopy: "/game/materials/08_tree_canopy_topdown.png",
  carMetal: "/game/materials/09_dark_car_body_metal_basecolor.png",
  hqBrick: "/game/materials/10_hq_beale_dark_brick_accent.png",
  fence: "/game/materials/11_chain_link_fence.png",
  stripe: "/game/materials/12_asphalt_road_stripe.png",
  concrete: "/game/materials/13_polished_warm_concrete.png",
  wood: "/game/materials/14_dark_wood_panel.png",
  shutter: "/game/materials/15_rollup_metal_shutter.png",
  stucco: "/game/materials/16_weathered_stucco.png",
  cinder: "/game/materials/17_green_cinder_block_wall.png",
  storefront: "/game/materials/18_storefront_window_grid.png",
  charcoal: "/game/materials/19_charcoal_metal_surface.png",
  fabric: "/game/materials/20_green_gold_fabric_stripe.png",
} as const;

export type MatKey = keyof typeof MAT_URLS;

const cache = new Map<string, THREE.Texture>();
let maxAniso = 4;

export function setAnisotropy(n: number) {
  maxAniso = n;
}

function prep(tex: THREE.Texture, repeatX: number, repeatY: number) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export async function loadTexture(url: string, rx = 1, ry = 1): Promise<THREE.Texture> {
  const key = `${url}|${rx}|${ry}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const loader = new THREE.TextureLoader();
  const tex = await new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(url, resolve, undefined, () => reject(new Error(`texture ${url}`)));
  });
  prep(tex, rx, ry);
  cache.set(key, tex);
  return tex;
}

export async function loadAllMaterials(
  onProgress?: (done: number, total: number) => void,
): Promise<Record<MatKey, THREE.Texture>> {
  const keys = Object.keys(MAT_URLS) as MatKey[];
  const out = {} as Record<MatKey, THREE.Texture>;
  let done = 0;
  for (const k of keys) {
    try {
      out[k] = await loadTexture(MAT_URLS[k], 1, 1);
    } catch {
      const fb = new THREE.Texture();
      out[k] = fb;
    }
    done += 1;
    onProgress?.(done, keys.length);
  }
  return out;
}

export function std(
  map: THREE.Texture | undefined,
  opts: {
    color?: number;
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    repeat?: [number, number];
    transparent?: boolean;
    opacity?: number;
  } = {},
) {
  const tex = map?.clone();
  if (tex && opts.repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
    tex.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: opts.color ?? 0xffffff,
    roughness: opts.roughness ?? 0.86,
    metalness: opts.metalness ?? 0.04,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}