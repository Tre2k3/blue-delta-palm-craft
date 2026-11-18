import { POIS, TILE } from "./data";
import { gamePixels, worldUnits } from "./worldScale";

/** One physical contract for HQ rendering, collision and interaction anchors. */
export const HQ_POI = POIS.find((p) => p.id === "store")!;
export const HQ_ROOM = {
  width: worldUnits(HQ_POI.w) - 0.2,
  depth: worldUnits(HQ_POI.h) - 0.2,
  wallHeight: 3.35,
  floorHeight: 0.12,
};
export const HQ_FRONT_DOOR = { x: HQ_POI.x + HQ_POI.w / 2, y: HQ_POI.y + HQ_POI.h, width: TILE * 1.7 };
export const HQ_COUNTER = { x: 0, z: -HQ_ROOM.depth / 2 + 3.15, width: 3.52, depth: 0.52 };
export const HQ_K_BLANCO = { x: -1.15, z: HQ_COUNTER.z + 0.06 };
export const HQ_TABLES = [
  { x: -3.55, z: 1.55 }, { x: 3.55, z: 1.55 },
  { x: -3.45, z: -1.85 }, { x: 3.45, z: -1.85 },
];
export const HQ_RACKS = [
  { x: -HQ_ROOM.width / 2 + 0.7, z: 2.4 }, { x: -HQ_ROOM.width / 2 + 0.7, z: -1.6 },
  { x: HQ_ROOM.width / 2 - 0.7, z: 2.4 }, { x: HQ_ROOM.width / 2 - 0.7, z: -1.6 },
];
export const HQ_VITRINE = { x: -HQ_ROOM.width / 2 + 1.4, z: HQ_ROOM.depth / 2 - 1.6, width: 1.15, depth: 0.7 };
export const HQ_SHOWROOM = { x: 4.85, z: 4.65 };
export function hqPoint(x: number, z: number) {
  return { x: HQ_POI.x + HQ_POI.w / 2 + gamePixels(x), y: HQ_POI.y + HQ_POI.h / 2 + gamePixels(z) };
}
export const HQ_ANCHORS = {
  kBlanco: hqPoint(HQ_K_BLANCO.x, HQ_K_BLANCO.z),
  showroom: hqPoint(HQ_SHOWROOM.x, HQ_SHOWROOM.z),
};
export function insideHQ(x: number, y: number) {
  return x >= HQ_POI.x && x <= HQ_POI.x + HQ_POI.w && y >= HQ_POI.y && y <= HQ_POI.y + HQ_POI.h;
}
export function atHqShowroom(x: number, y: number) {
  return insideHQ(x, y) && Math.hypot(x - HQ_ANCHORS.showroom.x, y - HQ_ANCHORS.showroom.y) <= 32;
}
function footprint(p: { x: number; z: number; width: number; depth: number }) {
  const center = hqPoint(p.x, p.z);
  return { x: center.x - gamePixels(p.width) / 2, y: center.y - gamePixels(p.depth) / 2, w: gamePixels(p.width), h: gamePixels(p.depth) };
}
export const HQ_FURNITURE = [
  footprint(HQ_COUNTER),
  ...HQ_TABLES.map((p) => footprint({ ...p, width: 1.65, depth: 1.05 })),
  ...HQ_RACKS.map((p) => footprint({ ...p, width: 0.75, depth: 2 })),
  footprint(HQ_VITRINE),
];
