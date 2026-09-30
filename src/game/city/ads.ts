import * as THREE from "three";
import { ART_REV, TILE } from "../data";
import type { BuildingRef } from "./signage";
import { BILLBOARD_FALLBACKS, sponsorArt } from "../halloween";
import { halloweenOn } from "../season";

const S = 1 / 16;
function wx(x: number) {
  return x * S;
}
function wz(y: number) {
  return y * S;
}

const FACE_YAW = {
  south: 0,
  north: Math.PI,
  east: Math.PI / 2,
  west: -Math.PI / 2,
} as const;

type Face = keyof typeof FACE_YAW;

export const BUILDING_ADS: { buildingId: string; face: Face; w: number; h: number; lift?: number }[] = [
  { buildingId: "store", face: "south", w: 5.6, h: 3.3, lift: 8.35 },
  { buildingId: "store", face: "east", w: 4.4, h: 2.7, lift: 8.1 },
  { buildingId: "beale", face: "south", w: 4.8, h: 3.0, lift: 6.6 },
  { buildingId: "downtown", face: "south", w: 5.2, h: 3.2, lift: 8.6 },
  { buildingId: "neighborhood", face: "south", w: 4.2, h: 2.6, lift: 6.4 },
  { buildingId: "culture", face: "south", w: 4.0, h: 2.5, lift: 6.2 },
  { buildingId: "apartment", face: "south", w: 3.2, h: 2.2, lift: 5.6 },
];

export const FREE_ADS: { x: number; y: number; yaw: number; w: number; h: number; lift: number }[] = [
  { x: 31.9 * TILE, y: 13.15 * TILE, yaw: 0, w: 4.6, h: 6.4, lift: 3.35 },
  { x: 15.9 * TILE, y: 36.4 * TILE, yaw: 0, w: 4.8, h: 6.6, lift: 3.4 },
  { x: 15.0 * TILE, y: 28.45 * TILE, yaw: 0, w: 5.2, h: 7.2, lift: 4.0 },
  { x: 22.8 * TILE, y: 22.2 * TILE, yaw: 0, w: 4.4, h: 6.2, lift: 3.25 },
  { x: 48.9 * TILE, y: 14.25 * TILE, yaw: 0, w: 4.2, h: 5.8, lift: 3.15 },
  { x: 50.9 * TILE, y: 34.25 * TILE, yaw: 0, w: 4.3, h: 6.0, lift: 3.2 },
  { x: 26.8 * TILE, y: 40.2 * TILE, yaw: 0, w: 4.0, h: 5.6, lift: 3.05 },
  { x: 26.4 * TILE, y: 38.2 * TILE, yaw: 0, w: 4.0, h: 5.6, lift: 3.05 },
  { x: 47.4 * TILE, y: 17.6 * TILE, yaw: 0, w: 4.1, h: 5.7, lift: 3.1 },
];

const NEUTRAL = "/game/ads/901-emblem.webp";
const texCache = new Map<string, THREE.Texture>();

function textureFor(url: string) {
  const cached = texCache.get(url);
  if (cached) return cached;
  const map = new THREE.Texture();
  map.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    map.image = img;
    map.needsUpdate = true;
  };
  img.src = `${url}${url.includes("?") ? "&" : "?"}v=${ART_REV}`;
  texCache.set(url, map);
  return map;
}

function slotUrl(index: number) {
  const id = `sponsor_billboard_${String(index + 1).padStart(2, "0")}`;
  const fallback = halloweenOn() ? BILLBOARD_FALLBACKS[index % BILLBOARD_FALLBACKS.length]! : NEUTRAL;
  return sponsorArt(id, fallback);
}

function framedPoster(url: string, w: number, h: number, name: string) {
  const g = new THREE.Group();
  g.name = name;
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: textureFor(url), color: 0xfff4e8, toneMapped: false, side: THREE.DoubleSide }),
  );
  paper.position.z = 0.05;
  paper.name = name;
  g.add(paper);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08),
    new THREE.MeshStandardMaterial({
      color: halloweenOn() ? 0xe07a1a : 0xd4af37,
      metalness: 0.55,
      roughness: 0.35,
      emissive: halloweenOn() ? 0x6a2208 : 0x5a4310,
      emissiveIntensity: 0.45,
    }),
  );
  g.add(frame);
  return g;
}

function place(scene: THREE.Scene, buildings: BuildingRef[]) {
  const byId = new Map(buildings.map((b) => [b.id, b]));
  let n = 0;
  const ids: string[] = [];
  for (const ad of BUILDING_ADS) {
    const b = byId.get(ad.buildingId);
    if (!b) continue;
    const id = `sponsor_billboard_${String(n + 1).padStart(2, "0")}`;
    const poster = framedPoster(slotUrl(n), ad.w, ad.h, id);
    poster.rotation.y = FACE_YAW[ad.face];
    const lift = ad.lift ?? Math.max(2.4, b.height * 0.55);
    const hx = b.width / 2 + 0.08;
    const hz = b.depth / 2 + 0.08;
    if (ad.face === "south") poster.position.set(0, lift, hz);
    else if (ad.face === "north") poster.position.set(0, lift, -hz);
    else if (ad.face === "east") poster.position.set(hx, lift, 0);
    else poster.position.set(-hx, lift, 0);
    b.group.add(poster);
    ids.push(id);
    n++;
  }
  for (const ad of FREE_ADS) {
    const id = `sponsor_billboard_${String(n + 1).padStart(2, "0")}`;
    const poster = framedPoster(slotUrl(n), ad.w, ad.h, id);
    poster.position.set(wx(ad.x), ad.lift, wz(ad.y));
    poster.rotation.y = ad.yaw;
    scene.add(poster);
    ids.push(id);
    n++;
  }
  (window as typeof window & { __SACK_ADS__?: { n: number; ids: string[] } }).__SACK_ADS__ = { n, ids };
}

/** Sponsor slots. The old Sacks Giving / 901 Ballers / luxury boards are not mounted. */
export function mountCityAds(scene: THREE.Scene, buildings: BuildingRef[], _legacy?: THREE.Texture) {
  void _legacy;
  place(scene, buildings);
}
