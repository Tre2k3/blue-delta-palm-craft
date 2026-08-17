import * as THREE from "three";
import {
  S,
  World3D as World3DCore,
  wx,
  wz,
  type WorldFrame,
} from "./world3dCore";

export { S, wx, wz };
export type { WorldFrame };

/**
 * Public world renderer with third-person camera obstruction handling.
 *
 * The renderer core stays focused on scene construction and camera feel. This
 * facade adds one permanent responsibility: large solid building meshes cannot
 * sit between Benji and the chase camera. It uses the actual built geometry,
 * so the camera follows the same city the player sees rather than a second set
 * of guessed collision rectangles.
 */
export class World3D extends World3DCore {
  private cameraBlockers: THREE.Mesh[] = [];
  private cameraRay = new THREE.Raycaster();
  private cameraTarget = new THREE.Vector3();
  private cameraDirection = new THREE.Vector3();
  private cameraSafe = new THREE.Vector3();
  private lastCameraOccluded = false;

  override buildCity(
    walls: { x: number; y: number; w: number; h: number }[],
    trees: { x: number; y: number }[],
  ) {
    super.buildCity(walls, trees);
    this.cameraBlockers = [];

    // Building bodies are large BoxGeometry meshes. Thin sidewalks, awnings,
    // fences, cars and court pieces deliberately do not qualify, preventing
    // the chase camera from constantly pumping in and out around small props.
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!(obj.geometry instanceof THREE.BoxGeometry)) return;
      const p = obj.geometry.parameters as { width?: number; height?: number; depth?: number };
      const width = Number(p.width) || 0;
      const height = Number(p.height) || 0;
      const depth = Number(p.depth) || 0;
      if (width >= 1.25 && height >= 1.7 && depth >= 1.25) {
        this.cameraBlockers.push(obj);
      }
    });
  }

  override sync(f: WorldFrame) {
    super.sync(f);
    if (f.cameraView !== "third") {
      this.lastCameraOccluded = false;
      return;
    }

    const air = f.air ?? 0;
    this.cameraTarget.set(wx(f.px), 1.2 + air * 0.55, wz(f.py));
    this.cameraDirection.subVectors(this.camera.position, this.cameraTarget);
    const desiredDistance = this.cameraDirection.length();
    if (desiredDistance < 0.3) return;

    this.cameraDirection.multiplyScalar(1 / desiredDistance);
    this.cameraRay.set(this.cameraTarget, this.cameraDirection);
    this.cameraRay.near = 0.22;
    this.cameraRay.far = desiredDistance;
    this.scene.updateMatrixWorld(true);

    const hits = this.cameraRay.intersectObjects(this.cameraBlockers, false);
    const hit = hits.find((candidate) => candidate.distance > 0.28 && candidate.distance < desiredDistance - 0.04);
    if (hit) {
      const safeDistance = Math.max(0.9, hit.distance - 0.32);
      this.cameraSafe.copy(this.cameraTarget).addScaledVector(this.cameraDirection, safeDistance);
      this.camera.position.copy(this.cameraSafe);
      this.camera.lookAt(this.cameraTarget);
      this.lastCameraOccluded = true;
    } else {
      this.lastCameraOccluded = false;
    }

    // Tiny read-only diagnostic used by manual/automated QA. It is not a
    // gameplay dependency and makes camera regressions inspectable in preview.
    (window as typeof window & {
      __SACK_CAMERA__?: { blockers: number; occluded: boolean; distance: number };
    }).__SACK_CAMERA__ = {
      blockers: this.cameraBlockers.length,
      occluded: this.lastCameraOccluded,
      distance: this.camera.position.distanceTo(this.cameraTarget),
    };
  }
}
