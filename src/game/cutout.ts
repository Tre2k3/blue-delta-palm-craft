import * as THREE from "three";

/**
 * Alpha cutout for the 2.5D cast.
 * Keep this low so dark irises and glossy eye highlights don't get discarded.
 */
export const CUTOUT_ALPHA = 0.12;

/**
 * Texture setup for cast/prop atlases.
 *
 * Previously this forced NearestFilter on both min and mag and disabled
 * mipmaps. That was aimed at the dark fringe you get when a non-premultiplied
 * RGBA atlas is filtered — transparent pixels are usually black, so blending
 * pulls black into the silhouette. Killing filtering hides the fringe but costs
 * you a blocky edge up close and heavy shimmer at distance, because a minified
 * sprite with no mipmaps aliases badly as the camera moves.
 *
 * The correct fix for the fringe is to dilate atlas colour outward into the
 * transparent region at asset-build time. With that in place, normal filtering
 * is safe and looks far better at every distance.
 */
export function hardenCutoutTexture(tex: THREE.Texture, maxAnisotropy = 4) {
  tex.colorSpace = THREE.SRGBColorSpace;
  // Linear, no mipmaps. Mips average across atlas/cell edges and pull in the
  // neighbouring frame (ghost eyes, grey slabs in hair). Smooth mag filter
  // keeps the silhouette; ClampToEdge stops wrap bleed.
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = Math.min(maxAnisotropy, 4);
  tex.premultiplyAlpha = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
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
    toneMapped: true,
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
    toneMapped: true,
    sizeAttenuation: true,
    fog: true,
  });
}

export function billboardLookAt(mesh: THREE.Object3D, camera: THREE.Camera) {
  mesh.quaternion.copy(camera.quaternion);
}
