import * as THREE from "three";

/**
 * Alpha cutout for the 2.5D cast.
 *
 * The threshold is deliberately below 0.5. A high binary threshold plus nearest
 * filtering gives the hard staircase silhouette that reads as a sloppy cut-out;
 * a lower threshold combined with alphaToCoverage lets MSAA resolve the edge, so
 * Benji keeps a crisp outline without the jagged steps.
 */
export const CUTOUT_ALPHA = 0.3;

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
export function hardenCutoutTexture(tex: THREE.Texture, maxAnisotropy = 8) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = maxAnisotropy;
  tex.premultiplyAlpha = false;
  // Atlas cells sit edge to edge; clamping stops a frame sampling its neighbour.
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
    // The renderer is created with antialias: true, so coverage-based alpha
    // gets resolved by MSAA and the silhouette stops stair-stepping.
    alphaToCoverage: true,
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
