import * as THREE from "three";
import { STREETS, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";
import { isRoadPoint } from "./worldTopology";
import { WorldLifePass } from "./worldLifePass";

const ROAD_HALF = TILE * 0.92;
const SIDEWALK = TILE * 0.28;
type PatchedLife = WorldLifePass & { __streetSanitationPatched?: boolean };

function isStreetLight(group: THREE.Group) {
  let hasTallPole = false;
  let hasHighLamp = false;
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    if (child.geometry instanceof THREE.CylinderGeometry) {
      const height = Number((child.geometry.parameters as { height?: number }).height) || 0;
      if (height >= 3.0 && height <= 3.8) hasTallPole = true;
    }
    if (child.geometry instanceof THREE.SphereGeometry && child.position.y >= 2.8) hasHighLamp = true;
  }
  return hasTallPole && hasHighLamp;
}

function isTree(group: THREE.Group) {
  return group.children.some((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.IcosahedronGeometry);
}

function nearestStreet(x: number, y: number) {
  let result: { axis: "x" | "y"; center: number; distance: number } | null = null;
  for (const street of STREETS) {
    const center = street.tile * TILE;
    const distance = street.axis === "y" ? Math.abs(y - center) : Math.abs(x - center);
    if (!result || distance < result.distance) result = { axis: street.axis, center, distance };
  }
  return result;
}

function moveOffRoad(group: THREE.Group, extra: number) {
  let x = group.position.x * 16;
  let y = group.position.z * 16;
  const street = nearestStreet(x, y);
  if (!street) return false;
  const sideSeed = street.axis === "y" ? Math.floor(x / TILE) : Math.floor(y / TILE);
  const side = sideSeed % 2 === 0 ? 1 : -1;
  const offset = ROAD_HALF + SIDEWALK * 0.68 + extra;
  if (street.axis === "y") y = street.center + side * offset;
  else x = street.center + side * offset;
  x = Math.max(36, Math.min(WORLD_PX_W - 36, x));
  y = Math.max(36, Math.min(WORLD_PX_H - 36, y));
  group.position.x = x / 16;
  group.position.z = y / 16;
  return true;
}

function sanitize(scene: THREE.Scene) {
  let streetLightsRelocated = 0;
  let treesRelocated = 0;
  for (const child of scene.children) {
    if (!(child instanceof THREE.Group)) continue;
    const x = child.position.x * 16;
    const y = child.position.z * 16;
    if (isStreetLight(child)) {
      const street = nearestStreet(x, y);
      if (street && street.distance <= ROAD_HALF + 6 && moveOffRoad(child, 2)) streetLightsRelocated++;
      continue;
    }
    if (isTree(child) && isRoadPoint(x, y) && moveOffRoad(child, 10)) treesRelocated++;
  }
  return { streetLightsRelocated, treesRelocated };
}

export function installStreetSanitationPass() {
  const proto = WorldLifePass.prototype as PatchedLife;
  if (proto.__streetSanitationPatched) return;
  proto.__streetSanitationPatched = true;
  const originalBuild = WorldLifePass.prototype.build;
  WorldLifePass.prototype.build = function sanitizedWorldBuild(this: WorldLifePass) {
    originalBuild.call(this);
    const scene = (this as unknown as { scene: THREE.Scene }).scene;
    const result = sanitize(scene);
    const w = window as typeof window & { __SACK_ENVIRONMENT__?: Record<string, unknown> };
    w.__SACK_ENVIRONMENT__ = {
      ...(w.__SACK_ENVIRONMENT__ ?? {}),
      streetLightsRelocated: result.streetLightsRelocated,
      treesRelocated: result.treesRelocated,
      clearDrivingLanes: true,
    };
  };
}
