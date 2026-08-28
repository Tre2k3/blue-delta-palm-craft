import * as THREE from "three";
import { ART_REV, TILE } from "../data";
import type { BuildingRef } from "./signage";

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

function framedPoster(mat: THREE.Material, w: number, h: number) {
  const g = new THREE.Group();
  g.name = "sacks-giving-ad";
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  paper.position.z = 0.05;
  g.add(paper);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.65, roughness: 0.32, emissive: 0x5a4310, emissiveIntensity: 0.45 }),
  );
  g.add(frame);
  return g;
}

function place(scene: THREE.Scene, buildings: BuildingRef[], mat: THREE.Material) {
  const byId = new Map(buildings.map((b) => [b.id, b]));
  let n = 0;
  for (const ad of BUILDING_ADS) {
    const b = byId.get(ad.buildingId);
    if (!b) continue;
    const poster = framedPoster(mat, ad.w, ad.h);
    poster.rotation.y = FACE_YAW[ad.face];
    const lift = ad.lift ?? Math.max(2.4, b.height * 0.55);
    const hx = b.width / 2 + 0.08;
    const hz = b.depth / 2 + 0.08;
    if (ad.face === "south") poster.position.set(0, lift, hz);
    else if (ad.face === "north") poster.position.set(0, lift, -hz);
    else if (ad.face === "east") poster.position.set(hx, lift, 0);
    else poster.position.set(-hx, lift, 0);
    b.group.add(poster);
    n++;
  }
  for (const ad of FREE_ADS) {
    const poster = framedPoster(mat, ad.w, ad.h);
    poster.position.set(wx(ad.x), ad.lift, wz(ad.y));
    poster.rotation.y = ad.yaw;
    scene.add(poster);
    n++;
  }
  (window as typeof window & { __SACK_ADS__?: { n: number; ids: string[] } }).__SACK_ADS__ = {
    n,
    ids: [...byId.keys()],
  };
}

export function mountCityAds(scene: THREE.Scene, buildings: BuildingRef[], tex?: THREE.Texture) {
  const apply = (map: THREE.Texture) => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
    place(scene, buildings, new THREE.MeshBasicMaterial({ map, toneMapped: false, side: THREE.DoubleSide }));
  };
  if (tex) {
    apply(tex);
    return;
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const map = new THREE.Texture(img);
    map.needsUpdate = true;
    apply(map);
  };
  img.src = `/game/ads/sacks-giving.jpg?v=${ART_REV}`;
}
