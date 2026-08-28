import * as THREE from "three";

/** Binary cutout — leftover fringe is discarded, body stays fully opaque. */
export const CUTOUT_ALPHA = 0.5;

export function hardenCutoutTexture(tex: THREE.Texture) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.premultiplyAlpha = false;
  tex.needsUpdate = true;
  return tex;
}

export function cutoutMeshMaterial(map: THREE.Texture | null) {
  return new THREE.MeshBasicMaterial({
    map,
    color: 0xffffff,
    transparent: false,
    alphaTest: map ? CUTOUT_ALPHA : 0,
    alphaToCoverage: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: true,
  });
}

export function cutoutSpriteMaterial(map: THREE.Texture | null) {
  return new THREE.SpriteMaterial({
    map,
    color: 0xffffff,
    transparent: false,
    alphaTest: map ? CUTOUT_ALPHA : 0,
    depthWrite: true,
    depthTest: true,
    toneMapped: false,
    sizeAttenuation: true,
    fog: true,
  });
}

export function billboardLookAt(mesh: THREE.Object3D, camera: THREE.Camera) {
  mesh.quaternion.copy(camera.quaternion);
}
