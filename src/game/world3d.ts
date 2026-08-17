import * as THREE from "three";
import { POIS } from "./data";
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
const APARTMENT = POIS.find((p) => p.id === "apartment")!;

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

function isActuallyVisible(object: THREE.Object3D) {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}

/**
 * Public world renderer for permanent Chapter 1 presentation responsibilities:
 * chase-camera obstruction handling plus the apartment spawn interior.
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
  private apartmentExterior: THREE.Group | null = null;
  private apartmentInterior: THREE.Group | null = null;

  override buildCity(
    walls: { x: number; y: number; w: number; h: number }[],
    trees: { x: number; y: number }[],
  ) {
    super.buildCity(walls, trees);
    this.cameraBlockers = [];
    this.apartmentExterior = null;

    const aptX = wx(APARTMENT.x + APARTMENT.w / 2);
    const aptZ = wz(APARTMENT.y + APARTMENT.h / 2);

    // Find the explicit apartment landmark created by the core renderer. It is
    // a top-level group centered exactly on the apartment POI.
    for (const child of this.scene.children) {
      if (!(child instanceof THREE.Group)) continue;
      if (Math.abs(child.position.x - aptX) > 0.02 || Math.abs(child.position.z - aptZ) > 0.02) continue;
      if (child.children.some((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.BoxGeometry)) {
        this.apartmentExterior = child;
        break;
      }
    }

    // Building bodies are large BoxGeometry meshes. Thin sidewalks, awnings,
    // fences, cars and court pieces deliberately do not qualify.
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!(obj.geometry instanceof THREE.BoxGeometry)) return;
      const p = obj.geometry.parameters as { width?: number; height?: number; depth?: number };
      const width = Number(p.width) || 0;
      const height = Number(p.height) || 0;
      const depth = Number(p.depth) || 0;
      if (width >= 1.25 && height >= 1.7 && depth >= 1.25) this.cameraBlockers.push(obj);
    });

    this.apartmentInterior?.removeFromParent();
    this.apartmentInterior = this.buildApartmentInterior(aptX, aptZ);
    this.apartmentInterior.visible = false;
    this.scene.add(this.apartmentInterior);
  }

  private buildApartmentInterior(cx: number, cz: number) {
    const root = new THREE.Group();
    root.position.set(cx, 0, cz);
    root.name = "benji-apartment-interior";

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x38291f, roughness: 0.86, metalness: 0.02 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.92 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x183d27, roughness: 0.72 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.82 });
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0x1d6f42, roughness: 0.95 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4528, roughness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.5, metalness: 0.35 });

    const width = wx(APARTMENT.w) - 0.35;
    const depth = wz(APARTMENT.h) - 0.35;
    const halfW = width / 2;
    const halfD = depth / 2;
    const wallH = 3.05;
    const wallT = 0.14;

    root.add(box(width, 0.1, depth, floorMat, 0, 0.04, 0));
    root.add(box(width, wallH, wallT, wallMat, 0, wallH / 2, -halfD));
    root.add(box(wallT, wallH, depth, wallMat, -halfW, wallH / 2, 0));
    root.add(box(wallT, wallH, depth, wallMat, halfW, wallH / 2, 0));

    // South wall has a real open doorway so the first action is physically
    // walking out of the apartment into Memphis rather than staring at a wall.
    const doorW = 2.15;
    const southPiece = (width - doorW) / 2;
    root.add(box(southPiece, wallH, wallT, wallMat, -(doorW + southPiece) / 2, wallH / 2, halfD));
    root.add(box(southPiece, wallH, wallT, wallMat, (doorW + southPiece) / 2, wallH / 2, halfD));
    root.add(box(doorW, 0.18, wallT + 0.04, trimMat, 0, 2.55, halfD));

    // Rug / living area.
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x0f5c35, roughness: 1 }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(1.25, 0.105, 0.3);
    root.add(rug);

    // Bed and nightstand.
    root.add(box(3.45, 0.5, 2.15, darkMat, -2.55, 0.3, -2.55));
    root.add(box(3.25, 0.34, 1.95, fabricMat, -2.55, 0.63, -2.55));
    root.add(box(3.25, 0.5, 0.16, trimMat, -2.55, 1.02, -3.5));
    root.add(box(0.85, 0.74, 0.75, woodMat, -4.25, 0.39, -2.7));

    // Couch, coffee table and TV wall.
    root.add(box(2.9, 0.65, 1.08, fabricMat, 2.05, 0.42, -0.15));
    root.add(box(2.9, 0.72, 0.28, trimMat, 2.05, 0.78, -0.62));
    root.add(box(1.65, 0.18, 0.9, woodMat, 1.3, 0.3, 1.35));
    root.add(box(2.05, 1.2, 0.12, darkMat, 2.55, 1.72, -halfD + 0.1));
    root.add(box(1.75, 0.92, 0.06, new THREE.MeshStandardMaterial({ color: 0x0b2217, emissive: 0x082615, emissiveIntensity: 0.45 }), 2.55, 1.72, -halfD + 0.02));

    // SackReligious green/gold wall art.
    root.add(box(2.55, 1.15, 0.08, darkMat, -0.25, 1.85, -halfD + 0.04));
    root.add(box(2.1, 0.12, 0.06, goldMat, -0.25, 2.14, -halfD - 0.01));
    root.add(box(1.5, 0.11, 0.06, fabricMat, -0.25, 1.84, -halfD - 0.01));
    root.add(box(0.9, 0.11, 0.06, goldMat, -0.25, 1.54, -halfD - 0.01));

    // Dresser / shoe boxes near the exit.
    root.add(box(1.8, 0.92, 0.58, woodMat, -3.65, 0.48, 2.65));
    root.add(box(0.72, 0.28, 0.52, darkMat, -3.1, 1.05, 2.65));
    root.add(box(0.72, 0.28, 0.52, trimMat, -3.85, 1.05, 2.65));

    const light = new THREE.PointLight(0xffddb0, 3.1, 17, 1.55);
    light.position.set(0, 2.65, 0.2);
    root.add(light);
    const fill = new THREE.PointLight(0x55cc88, 0.75, 10, 2);
    fill.position.set(-3.2, 1.65, -2.3);
    root.add(fill);

    return root;
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
      .find((candidate) =>
        candidate.distance > 0.3 &&
        candidate.distance < distance - 0.04 &&
        isActuallyVisible(candidate.object),
      );
    return hit?.distance ?? null;
  }

  private isInsideApartment(f: WorldFrame) {
    return f.px >= APARTMENT.x && f.px <= APARTMENT.x + APARTMENT.w && f.py >= APARTMENT.y && f.py <= APARTMENT.y + APARTMENT.h;
  }

  override sync(f: WorldFrame) {
    super.sync(f);

    const inApartment = this.isInsideApartment(f) && f.mode === "world";
    if (this.apartmentExterior) this.apartmentExterior.visible = !inApartment;
    if (this.apartmentInterior) this.apartmentInterior.visible = inApartment;

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
      this.cameraOffset.subVectors(this.cameraDesired, this.cameraTarget);
      let foundClear = false;
      let bestClearance = directHit;
      this.cameraBest.copy(this.cameraDesired);

      for (const angle of CAMERA_ORBITS) {
        this.cameraCandidate.copy(this.cameraOffset).applyAxisAngle(UP, angle).add(this.cameraTarget);
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
        this.cameraDirection.subVectors(this.cameraBest, this.cameraTarget).normalize();
        const safeDistance = Math.max(1.65, bestClearance - 0.28);
        this.camera.position.copy(this.cameraTarget).addScaledVector(this.cameraDirection, safeDistance);
        this.camera.lookAt(this.cameraTarget);
      }
    }

    const actualCameraYaw = Math.atan2(
      this.camera.position.x - this.cameraTarget.x,
      this.camera.position.z - this.cameraTarget.z,
    );
    const yawDelta = Math.atan2(Math.sin(actualCameraYaw - f.yaw), Math.cos(actualCameraYaw - f.yaw));
    if (Math.abs(yawDelta) > 0.001) {
      this.benji.update(0, f.heading, actualCameraYaw, f.moveSpeed, f.lean, f.loco, f.animT, true, f.air, f.vz);
      for (const ped of this.peds) if (ped.visible) ped.rotation.y = actualCameraYaw;
    }

    (window as typeof window & {
      __SACK_CAMERA__?: { blockers: number; occluded: boolean; distance: number; yawDelta: number; apartment: boolean };
    }).__SACK_CAMERA__ = {
      blockers: this.cameraBlockers.length,
      occluded: this.lastCameraOccluded,
      distance: this.camera.position.distanceTo(this.cameraTarget),
      yawDelta,
      apartment: inApartment,
    };
  }
}
