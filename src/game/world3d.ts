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

const CAMERA_ORBITS = [0.38, -0.38, 0.72, -0.72, 1.02, -1.02] as const;
const UP = new THREE.Vector3(0, 1, 0);

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
  private cameraDesired = new THREE.Vector3();
  private cameraOffset = new THREE.Vector3();
  private cameraCandidate = new THREE.Vector3();
  private cameraBest = new THREE.Vector3();
  private cameraDirection = new THREE.Vector3();
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

  private blockerDistance(position: THREE.Vector3) {
    this.cameraDirection.subVectors(position, this.cameraTarget);
    const distance = this.cameraDirection.length();
    if (distance < 0.25) return null;
    this.cameraDirection.multiplyScalar(1 / distance);
    this.cameraRay.set(this.cameraTarget, this.cameraDirection);
    this.cameraRay.near = 0.28;
    this.cameraRay.far = distance - 0.04;
    const hit = this.cameraRay
      .intersectObjects(this.cameraBlockers, false)
      .find((candidate) => candidate.distance > 0.3 && candidate.distance < distance - 0.04);
    return hit?.distance ?? null;
  }

  override sync(f: WorldFrame) {
    super.sync(f);
    if (f.cameraView !== "third") {
      this.lastCameraOccluded = false;
      return;
    }

    const air = f.air ?? 0;
    this.cameraTarget.set(wx(f.px), 1.2 + air * 0.55, wz(f.py));
    this.cameraDesired.copy(this.camera.position);
    this.scene.updateMatrixWorld(true);

    const directHit = this.blockerDistance(this.cameraDesired);
    this.lastCameraOccluded = directHit !== null;

    if (directHit !== null) {
      // First try to keep the exact chase distance and simply orbit around the
      // obstruction. This preserves Benji's readable full-body framing instead
      // of collapsing the camera to arm's length and viewing the 2.5D actor
      // almost edge-on.
      this.cameraOffset.subVectors(this.cameraDesired, this.cameraTarget);
      let foundClear = false;
      let bestClearance = directHit;
      this.cameraBest.copy(this.cameraDesired);

      for (const angle of CAMERA_ORBITS) {
        this.cameraCandidate
          .copy(this.cameraOffset)
          .applyAxisAngle(UP, angle)
          .add(this.cameraTarget);
        const hit = this.blockerDistance(this.cameraCandidate);
        if (hit === null) {
          this.cameraBest.copy(this.cameraCandidate);
          foundClear = true;
          break;
        }
        if (hit > bestClearance) {
          bestClearance = hit;
          this.cameraBest.copy(this.cameraCandidate);
        }
      }

      // A small rise often clears awnings / building corners while retaining
      // the same yaw. Test it after horizontal orbits, not before, so ordinary
      // street traversal does not become a top-down camera.
      if (!foundClear) {
        this.cameraCandidate.copy(this.cameraDesired);
        this.cameraCandidate.y += 1.15;
        const raisedHit = this.blockerDistance(this.cameraCandidate);
        if (raisedHit === null) {
          this.cameraBest.copy(this.cameraCandidate);
          foundClear = true;
        } else if (raisedHit > bestClearance) {
          bestClearance = raisedHit;
          this.cameraBest.copy(this.cameraCandidate);
        }
      }

      if (foundClear) {
        this.camera.position.copy(this.cameraBest);
        this.camera.lookAt(this.cameraTarget);
      } else if (bestClearance > 1.85) {
        // Only dolly inward when there is enough room to preserve a readable
        // character shot. Very near hits are ignored rather than crushing the
        // camera into Benji, which was the source of the flattened/vanishing
        // sprite seen in QA at the 901 Court.
        this.cameraDirection.subVectors(this.cameraBest, this.cameraTarget).normalize();
        const safeDistance = Math.max(1.65, bestClearance - 0.28);
        this.camera.position.copy(this.cameraTarget).addScaledVector(this.cameraDirection, safeDistance);
        this.camera.lookAt(this.cameraTarget);
      }
    }

    (window as typeof window & {
      __SACK_CAMERA__?: { blockers: number; occluded: boolean; distance: number };
    }).__SACK_CAMERA__ = {
      blockers: this.cameraBlockers.length,
      occluded: this.lastCameraOccluded,
      distance: this.camera.position.distanceTo(this.cameraTarget),
    };
  }
}
