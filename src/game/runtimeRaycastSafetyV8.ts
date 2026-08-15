import * as THREE from "three";

/**
 * Three.js Sprite.raycast requires raycaster.camera. Camera-collision probes in
 * the legacy world foundation are geometry-only and intentionally do not set a
 * sprite camera, so walking near any 2.5D actor could throw inside Sprite.raycast
 * before post-filtering had a chance to exclude that sprite.
 *
 * Sprite billboards are never solid camera blockers in this game. Ignore them
 * for geometry-only raycasters that do not provide a camera, while preserving
 * normal Three.js sprite picking for raycasters that do provide one.
 */
const proto = THREE.Sprite.prototype as THREE.Sprite & {
  __sackRaycastSafetyV8?: boolean;
};

if (!proto.__sackRaycastSafetyV8) {
  proto.__sackRaycastSafetyV8 = true;
  const original = THREE.Sprite.prototype.raycast;
  THREE.Sprite.prototype.raycast = function sackSafeSpriteRaycast(
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[],
  ) {
    if (!raycaster.camera) return;
    return original.call(this, raycaster, intersects);
  };
}
