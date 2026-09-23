import * as THREE from "three";
import { applyPolygonOffset, type OffsetLayer } from "./polygonOffset";

export const MAT_URLS = {
  asphalt: "/game/materials/01_asphalt_basecolor.webp",
  sidewalk: "/game/materials/02_sidewalk_basecolor.webp",
  brick: "/game/materials/03_old_memphis_brick_basecolor.webp",
  windows: "/game/materials/04_window_facade_emissive_reference.webp",
  roof: "/game/materials/05_rooftop_tar_gravel_basecolor.webp",
  court: "/game/materials/06_court_wood_basecolor.webp",
  courtLines: "/game/materials/07_court_lines_and_clay_reference.webp",
  canopy: "/game/materials/08_tree_canopy_topdown.webp",
  carMetal: "/game/materials/09_dark_car_body_metal_basecolor.webp",
  hqBrick: "/game/materials/10_hq_beale_dark_brick_accent.webp",
  fence: "/game/materials/11_chain_link_fence.webp",
  stripe: "/game/materials/12_asphalt_road_stripe.webp",
  concrete: "/game/materials/13_polished_warm_concrete.webp",
  wood: "/game/materials/14_dark_wood_panel.webp",
  shutter: "/game/materials/15_rollup_metal_shutter.webp",
  stucco: "/game/materials/16_weathered_stucco.webp",
  cinder: "/game/materials/17_green_cinder_block_wall.webp",
  storefront: "/game/materials/18_storefront_window_grid.webp",
  charcoal: "/game/materials/19_charcoal_metal_surface.webp",
  fabric: "/game/materials/20_green_gold_fabric_stripe.webp",
} as const;

export type MatKey = keyof typeof MAT_URLS;

const cache = new Map<string, THREE.Texture>();
let maxAniso = 4;

/** Applies to textures prepared after this call. Re-uploading live ground plates mid-game stalls weak GPUs. */
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

export function disposeMaterialCache() {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}

/** Repeat-1 clone of a ground texture, for meshes whose UVs are already in world metres (see worldPlanarUv). */
export function groundTexture(base: THREE.Texture) {
  const tex = base.clone();
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

const planarDone = new WeakSet<THREE.BufferGeometry>();

/**
 * Rewrite a flat mesh's UVs from world X/Z so one texture tile covers `metres` everywhere.
 * Fixes smear on long thin strips that share one material but not one shape.
 */
export function worldPlanarUv(mesh: THREE.Mesh, metres: number) {
  if (planarDone.has(mesh.geometry)) mesh.geometry = mesh.geometry.clone();
  const geo = mesh.geometry;
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  if (!pos || !uv) return;
  mesh.updateWorldMatrix(true, false);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    uv.setXY(i, v.x / metres, v.z / metres);
  }
  uv.needsUpdate = true;
  planarDone.add(geo);
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
    offset?: OffsetLayer;
  } = {},
) {
  const tex = map?.clone();
  if (tex && opts.repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
    tex.needsUpdate = true;
  }
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    color: opts.color ?? 0xffffff,
    roughness: opts.roughness ?? 0.86,
    metalness: opts.metalness ?? 0.04,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
  if (opts.offset) applyPolygonOffset(mat, opts.offset);
  return mat;
}
