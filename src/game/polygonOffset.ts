import type { DirectionalLight, Material, PerspectiveCamera } from "three";

/**
 * GL polygon offset: offset = factor * DZ + r * units
 * Negative pulls toward the camera so a decal wins against its host.
 *
 * contact  — first decal on a surface (facade, wrap, court lines)
 * decal    — posters / photos sitting on walls
 * overlay  — signs, stripes, stacked labels
 * float    — always-on-top UI-in-world
 */
export const OFFSET = {
  contact: { factor: -1, units: -1 },
  decal: { factor: -2, units: -2 },
  overlay: { factor: -3, units: -4 },
  float: { factor: -4, units: -8 },
} as const;

export type OffsetLayer = keyof typeof OFFSET;

export function applyPolygonOffset<T extends Material>(mat: T, layer: OffsetLayer = "decal"): T {
  const { factor, units } = OFFSET[layer];
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = factor;
  mat.polygonOffsetUnits = units;
  return mat;
}

/** Keep near/far tight so the depth buffer has precision where we actually look. */
export function configureCameraDepth(
  camera: PerspectiveCamera,
  opts: { firstPerson: boolean; indoor: boolean; driving?: boolean },
) {
  if (opts.firstPerson) {
    camera.near = opts.indoor ? 0.16 : 0.2;
    camera.far = opts.indoor ? 40 : 200;
  } else {
    camera.near = opts.indoor ? 0.22 : opts.driving ? 0.55 : 0.45;
    camera.far = opts.indoor ? 36 : 240;
  }
}

/** Shadow acne (surface fighting its own shadow) — normalBias over a huge bias. */
export function preventShadowAcne(light: DirectionalLight) {
  light.shadow.bias = -0.00035;
  light.shadow.normalBias = 0.04;
}
