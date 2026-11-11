export type GroundPad = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Top of the walkable surface. */
  y: number;
};

const pads: GroundPad[] = [];

/** Just enough to keep soles off the surface. Not a hover. */
export const GROUND_EPSILON = 0.03;

export function clearGround() {
  pads.length = 0;
}

export function addGround(pad: GroundPad) {
  pads.push(pad);
}

/** Highest surface under the point. Open ground is 0. */
export function groundHeightAt(x: number, z: number) {
  let y = 0;
  for (const pad of pads) {
    if (x < pad.minX || x > pad.maxX || z < pad.minZ || z > pad.maxZ) continue;
    if (pad.y > y) y = pad.y;
  }
  return y;
}

/**
 * Highest surface under a foot-sized footprint.
 * Keeps a sole from dropping through a slab joint or a curb edge.
 */
export function standHeight(x: number, z: number) {
  const r = 0.18;
  return Math.max(
    groundHeightAt(x, z),
    groundHeightAt(x - r, z),
    groundHeightAt(x + r, z),
    groundHeightAt(x, z - r),
    groundHeightAt(x, z + r),
  );
}
