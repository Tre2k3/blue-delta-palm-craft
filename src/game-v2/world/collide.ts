import type { Solid } from "../core/types";
import { clamp } from "../core/util";

/** Push a circle out of every box. Returns true if it touched anything. */
export function pushOut(pos: { x: number; z: number }, radius: number, solids: Solid[]) {
  let touched = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of solids) {
      if (pos.x < s.minX - radius || pos.x > s.maxX + radius || pos.z < s.minZ - radius || pos.z > s.maxZ + radius) continue;
      const px = clamp(pos.x, s.minX, s.maxX);
      const pz = clamp(pos.z, s.minZ, s.maxZ);
      const dx = pos.x - px;
      const dz = pos.z - pz;
      const d = Math.hypot(dx, dz);
      if (d >= radius) continue;
      touched = true;
      if (d < 1e-5) {
        const l = pos.x - s.minX;
        const r = s.maxX - pos.x;
        const b = pos.z - s.minZ;
        const f = s.maxZ - pos.z;
        const m = Math.min(l, r, b, f);
        if (m === l) pos.x = s.minX - radius;
        else if (m === r) pos.x = s.maxX + radius;
        else if (m === b) pos.z = s.minZ - radius;
        else pos.z = s.maxZ + radius;
      } else {
        pos.x = px + (dx / d) * radius;
        pos.z = pz + (dz / d) * radius;
      }
    }
  }
  return touched;
}

/** Push a circle out of another circle. */
export function pushCircle(pos: { x: number; z: number }, radius: number, ox: number, oz: number, other: number) {
  const dx = pos.x - ox;
  const dz = pos.z - oz;
  const d = Math.hypot(dx, dz);
  const min = radius + other;
  if (d >= min || d < 1e-5) return false;
  pos.x = ox + (dx / d) * min;
  pos.z = oz + (dz / d) * min;
  return true;
}

/**
 * How far along the segment from (ax, az) to (bx, bz) you get before a wall. 1 means clear.
 * Thin things (rails, fences) are ignored: the camera may look through them.
 */
export function sight(ax: number, az: number, bx: number, bz: number, solids: Solid[], pad = 0.3) {
  let best = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const s of solids) {
    if (s.maxX - s.minX < 0.7 || s.maxZ - s.minZ < 0.7) continue;
    const minX = s.minX - pad;
    const maxX = s.maxX + pad;
    const minZ = s.minZ - pad;
    const maxZ = s.maxZ + pad;
    let t0 = 0;
    let t1 = best;
    if (Math.abs(dx) < 1e-6) {
      if (ax < minX || ax > maxX) continue;
    } else {
      const a = (minX - ax) / dx;
      const b = (maxX - ax) / dx;
      t0 = Math.max(t0, Math.min(a, b));
      t1 = Math.min(t1, Math.max(a, b));
    }
    if (Math.abs(dz) < 1e-6) {
      if (az < minZ || az > maxZ) continue;
    } else {
      const a = (minZ - az) / dz;
      const b = (maxZ - az) / dz;
      t0 = Math.max(t0, Math.min(a, b));
      t1 = Math.min(t1, Math.max(a, b));
    }
    if (t0 <= t1 && t0 < best) best = t0;
  }
  return best;
}
