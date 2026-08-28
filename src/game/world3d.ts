import * as THREE from "three";
import { POIS } from "./data";
import { WorldLifePass } from "./worldLifePass";
import { S, World3D as World3DCore, wx, wz, type WorldFrame } from "./world3dCore";
import { applyPolygonOffset } from "./polygonOffset";
import { poiBuildingRect } from "./worldTopology";
import { cutoutMeshMaterial } from "./cutout";

export { S, wx, wz };
export type { WorldFrame };

const CAMERA_ORBITS = [0.38, -0.38, 0.72, -0.72, 1.02, -1.02] as const;
const UP = new THREE.Vector3(0, 1, 0);
const APARTMENT = POIS.find((p) => p.id === "apartment")!;
const STORE = POIS.find((p) => p.id === "store")!;

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
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

function inside(f: WorldFrame, p: { x: number; y: number; w: number; h: number }) {
  return f.px >= p.x && f.px <= p.x + p.w && f.py >= p.y && f.py <= p.y + p.h;
}

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
  private hqExterior: THREE.Group | null = null;
  private hqInterior: THREE.Group | null = null;
  private worldLife = new WorldLifePass(this.scene);

  override buildCity(walls: { x: number; y: number; w: number; h: number }[], trees: { x: number; y: number }[]) {
    super.buildCity(walls, trees);
    this.cameraBlockers = [];
    this.apartmentExterior = this.findLandmark(APARTMENT);
    this.hqExterior = this.findLandmark(STORE);

    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !(obj.geometry instanceof THREE.BoxGeometry)) return;
      const p = obj.geometry.parameters as { width?: number; height?: number; depth?: number };
      const width = Number(p.width) || 0;
      const height = Number(p.height) || 0;
      const depth = Number(p.depth) || 0;
      if (width >= 1.25 && height >= 1.7 && depth >= 1.25) this.cameraBlockers.push(obj);
    });

    this.apartmentInterior?.removeFromParent();
    try {
      this.apartmentInterior = this.buildApartmentInterior(wx(APARTMENT.x + APARTMENT.w / 2), wz(APARTMENT.y + APARTMENT.h / 2));
      this.apartmentInterior.visible = false;
      this.scene.add(this.apartmentInterior);
    } catch (err) {
      console.warn("[sack] apartment interior failed", err);
      this.apartmentInterior = null;
    }

    this.hqInterior?.removeFromParent();
    try {
      this.hqInterior = this.buildHQInterior(wx(STORE.x + STORE.w / 2), wz(STORE.y + STORE.h / 2));
      this.hqInterior.visible = false;
      this.scene.add(this.hqInterior);
    } catch (err) {
      console.warn("[sack] HQ interior failed", err);
      this.hqInterior = null;
    }

    try {
      this.worldLife.build();
    } catch (err) {
      console.warn("[sack] world life failed", err);
    }
  }

  private findLandmark(poi: { id?: string; x: number; y: number; w: number; h: number }) {
    const br = poi.id ? poiBuildingRect({ id: poi.id, x: poi.x, y: poi.y, w: poi.w, h: poi.h }) : poi;
    const cx = wx(br.x + br.w / 2);
    const cz = wz(br.y + br.h / 2);
    for (const child of this.scene.children) {
      if (!(child instanceof THREE.Group)) continue;
      if (poi.id && child.userData.poiId === poi.id) return child;
      if (Math.abs(child.position.x - cx) > 0.08 || Math.abs(child.position.z - cz) > 0.08) continue;
      if (child.children.some((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.BoxGeometry)) return child;
    }
    return null;
  }

  private addSouthDoor(root: THREE.Group, width: number, halfD: number, wallH: number, wallT: number, wallMat: THREE.Material, trimMat: THREE.Material, doorX: number, doorW: number) {
    const halfW = width / 2;
    const doorL = doorX - doorW / 2;
    const doorR = doorX + doorW / 2;
    const leftW = Math.max(0, doorL + halfW);
    const rightW = Math.max(0, halfW - doorR);
    if (leftW > 0.01) root.add(box(leftW, wallH, wallT, wallMat, -halfW + leftW / 2, wallH / 2, halfD));
    if (rightW > 0.01) root.add(box(rightW, wallH, wallT, wallMat, doorR + rightW / 2, wallH / 2, halfD));
    root.add(box(doorW, 0.18, wallT + 0.04, trimMat, doorX, 2.55, halfD));
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
    this.addSouthDoor(root, width, halfD, wallH, wallT, wallMat, trimMat, wx(6 * 48 - (APARTMENT.x + APARTMENT.w / 2)), wx(48 * 1.3));
    root.add(box(4.0, 0.03, 2.8, new THREE.MeshStandardMaterial({ color: 0x0f5c35, roughness: 1 }), 1.25, 0.11, 0.3));
    root.add(box(3.45, 0.5, 2.15, darkMat, -2.55, 0.3, -2.55));
    root.add(box(3.25, 0.34, 1.95, fabricMat, -2.55, 0.63, -2.55));
    root.add(box(3.25, 0.5, 0.16, trimMat, -2.55, 1.02, -3.5));
    root.add(box(0.85, 0.74, 0.75, woodMat, -4.25, 0.39, -2.7));
    root.add(box(2.9, 0.65, 1.08, fabricMat, 2.05, 0.42, -0.15));
    root.add(box(2.9, 0.72, 0.28, trimMat, 2.05, 0.78, -0.62));
    root.add(box(1.65, 0.18, 0.9, woodMat, 1.3, 0.3, 1.35));
    root.add(box(2.05, 1.2, 0.12, darkMat, 2.55, 1.72, -halfD + 0.1));
    root.add(box(1.75, 0.92, 0.06, new THREE.MeshStandardMaterial({ color: 0x0b2217, emissive: 0x082615, emissiveIntensity: 0.45 }), 2.55, 1.72, -halfD + 0.02));
    root.add(box(2.55, 1.15, 0.08, darkMat, -0.25, 1.85, -halfD + 0.04));
    root.add(box(2.1, 0.12, 0.06, goldMat, -0.25, 2.14, -halfD - 0.01));
    root.add(box(1.5, 0.11, 0.06, fabricMat, -0.25, 1.84, -halfD - 0.01));
    root.add(box(0.9, 0.11, 0.06, goldMat, -0.25, 1.54, -halfD - 0.01));
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

  private photoMat(tex: THREE.Texture | undefined, fallback: number) {
    if (!tex) {
      return applyPolygonOffset(
        new THREE.MeshStandardMaterial({ color: fallback, roughness: 0.72 }),
        "decal",
      );
    }
    return applyPolygonOffset(
      new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.62,
        metalness: 0.02,
        emissive: new THREE.Color(0x404040),
        emissiveMap: tex,
        emissiveIntensity: 0.45,
        depthWrite: true,
      }),
      "decal",
    );
  }

  private photoWall(w: number, h: number, tex: THREE.Texture | undefined, fallback: number) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.photoMat(tex, fallback));
    return mesh;
  }

  private buildHQInterior(cx: number, cz: number) {
    const root = new THREE.Group();
    root.position.set(cx, 0, cz);
    root.name = "sackreligious-hq-interior";
    const store = this.art.store;
    const black = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.62, metalness: 0.12 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd6aa2d, roughness: 0.38, metalness: 0.46 });
    const green = new THREE.MeshStandardMaterial({ color: 0x0d7a42, roughness: 0.55, metalness: 0.08 });
    const wallPaint = new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.88 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.78 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x8aa4b8, roughness: 0.12, metalness: 0.55, transparent: true, opacity: 0.35 });
    const width = wx(STORE.w) - 0.2;
    const depth = wz(STORE.h) - 0.2;
    const halfW = width / 2;
    const halfD = depth / 2;
    const wallH = 3.35;
    const wallT = 0.12;

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.48, metalness: 0.16 });
    root.add(box(width, 0.12, depth, floorMat, 0, 0.06, 0));
    root.add(box(2.35, 0.04, depth * 0.78, gold, 0, 0.14, 0.35));
    root.add(box(2.05, 0.03, depth * 0.76, new THREE.MeshStandardMaterial({ color: 0x1a1610, roughness: 0.55 }), 0, 0.165, 0.35));

    root.add(box(width, 0.08, depth, black, 0, wallH + 0.04, 0));
    root.add(box(width, wallH, wallT, wallPaint, 0, wallH / 2, -halfD));
    root.add(box(wallT, wallH, depth, wallPaint, -halfW, wallH / 2, 0));
    root.add(box(wallT, wallH, depth, wallPaint, halfW, wallH / 2, 0));
    this.addSouthDoor(root, width, halfD, wallH, wallT, wallPaint, green, 0, wx(48 * 1.7));

    const left = this.photoWall(depth - 0.5, wallH - 0.2, store.merch, 0x111111);
    left.rotation.y = Math.PI / 2;
    left.position.set(-halfW + 0.14, wallH / 2, 0);
    root.add(left);
    const right = this.photoWall(depth - 0.5, wallH - 0.2, store.featured, 0x111111);
    right.rotation.y = -Math.PI / 2;
    right.position.set(halfW - 0.14, wallH / 2, 0);
    root.add(right);
    const southL = this.photoWall(halfW - 1.15, wallH - 0.25, store.entry, 0x111111);
    southL.rotation.y = Math.PI;
    southL.position.set(-halfW / 2 - 0.45, wallH / 2, halfD - 0.14);
    root.add(southL);
    const southR = this.photoWall(halfW - 1.15, wallH - 0.25, store.welcome, 0x111111);
    southR.rotation.y = Math.PI;
    southR.position.set(halfW / 2 + 0.45, wallH / 2, halfD - 0.14);
    root.add(southR);

    root.add(box(4.4, 0.14, 0.1, gold, 0, 2.92, -halfD + 0.1));
    root.add(box(3.2, 0.08, 0.08, green, 0, 2.72, -halfD + 0.1));

    // Solid black checkout — no store photo on the face.
    const counterZ = -halfD + 2.15;
    const matte = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.82, metalness: 0.08 });
    root.add(box(4.7, 1.12, 1.12, matte, 0, 0.56, counterZ));
    root.add(box(4.82, 0.05, 1.2, gold, 0, 1.14, counterZ));
    root.add(box(4.7, 0.9, 0.06, matte, 0, 0.58, counterZ + 0.56));
    root.add(box(2.4, 0.06, 0.05, gold, 0, 0.78, counterZ + 0.59));
    root.add(box(0.55, 0.42, 0.42, green, 1.6, 1.42, counterZ));

    const addTable = (x: number, z: number, tex: THREE.Texture | undefined) => {
      root.add(box(1.65, 0.72, 1.05, wood, x, 0.38, z));
      root.add(box(1.55, 0.05, 0.95, gold, x, 0.78, z));
      root.add(box(1.4, 0.03, 0.82, this.photoMat(tex, 0x0d7a42), x, 0.82, z));
    };
    addTable(-3.55, 1.55, store.featured);
    addTable(3.55, 1.55, store.merch);
    addTable(-3.45, -1.85, store.counter);
    addTable(3.45, -1.85, store.featured);

    const addRack = (x: number, z: number, rotY: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      g.add(box(0.08, 2.05, 0.08, black, -0.85, 1.05, 0));
      g.add(box(0.08, 2.05, 0.08, black, 0.85, 1.05, 0));
      g.add(box(1.85, 0.05, 0.05, gold, 0, 1.85, 0));
      g.add(box(1.7, 1.35, 0.12, green, 0, 1.05, 0.02));
      const art = this.photoWall(1.55, 1.2, store.merch, 0x0d7a42);
      art.position.set(0, 1.08, 0.1);
      g.add(art);
      root.add(g);
    };
    addRack(-halfW + 0.7, 2.4, Math.PI / 2);
    addRack(-halfW + 0.7, -1.6, Math.PI / 2);
    addRack(halfW - 0.7, 2.4, -Math.PI / 2);
    addRack(halfW - 0.7, -1.6, -Math.PI / 2);

    root.add(box(1.15, 0.95, 0.7, black, -halfW + 1.4, 0.5, halfD - 1.6));
    root.add(box(0.9, 0.08, 0.55, gold, -halfW + 1.4, 1.02, halfD - 1.6));
    const vitrine = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.7, 0.62), glass);
    vitrine.position.set(-halfW + 1.4, 1.42, halfD - 1.6);
    root.add(vitrine);

    const key = new THREE.PointLight(0xffe4b0, 7.4, 22, 1.15);
    key.position.set(0, 2.95, 0.4);
    root.add(key);
    const backLight = new THREE.PointLight(0xffd27a, 3.6, 12, 1.4);
    backLight.position.set(0, 2.6, -halfD + 1.6);
    root.add(backLight);
    const greenFill = new THREE.PointLight(0x3ee08a, 2.2, 14, 1.5);
    greenFill.position.set(-halfW + 1.6, 2.1, 0.2);
    root.add(greenFill);
    const goldFill = new THREE.PointLight(0xffc84a, 2.2, 14, 1.5);
    goldFill.position.set(halfW - 1.6, 2.1, 0.2);
    root.add(goldFill);
    const doorFill = new THREE.PointLight(0xf2efe4, 2.8, 10, 1.6);
    doorFill.position.set(0, 2.3, halfD - 1.2);
    root.add(doorFill);

    const kTex = this.art.people["k-blanco"];
    if (kTex) {
      const kMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 2.28), cutoutMeshMaterial(kTex));
      kMesh.name = "k-blanco-desk";
      kMesh.position.set(0.06, 1.22, counterZ - 0.28);
      kMesh.scale.set(1.08, 1.08, 1);
      kMesh.renderOrder = 2;
      root.add(kMesh);
    }
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
    const hit = this.cameraRay.intersectObjects(this.cameraBlockers, false).find((candidate) => candidate.distance > 0.3 && candidate.distance < distance - 0.04 && isActuallyVisible(candidate.object));
    return hit?.distance ?? null;
  }

  override sync(f: WorldFrame) {
    this.worldLife.preSync(f);
    super.sync(f);
    this.worldLife.postSync(f, this.cars, this.npcSprites);
    const inApartment = inside(f, APARTMENT) && f.mode === "world";
    const inHQ = inside(f, STORE) && (f.mode === "world" || f.mode === "dialogue" || f.mode === "shop");
    const kVisible = inHQ
      && f.px > STORE.x + 28 && f.px < STORE.x + STORE.w - 28
      && f.py > STORE.y + 36 && f.py < STORE.y + STORE.h - 70;
    if (this.apartmentExterior) this.apartmentExterior.visible = !inApartment;
    if (this.apartmentInterior) this.apartmentInterior.visible = inApartment;
    if (this.hqExterior) this.hqExterior.visible = !inHQ;
    if (this.hqInterior) this.hqInterior.visible = inHQ;
    const kSprite = this.npcSprites.get("k_blanco");
    if (kSprite) kSprite.visible = false;
    const kDesk = this.hqInterior?.getObjectByName("k-blanco-desk");
    if (kDesk) kDesk.visible = kVisible;
    if (f.cameraView !== "third" || f.driving) {
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
        this.camera.position.copy(this.cameraTarget).addScaledVector(this.cameraDirection, Math.max(1.65, bestClearance - 0.28));
        this.camera.lookAt(this.cameraTarget);
      }
    }
    const actualCameraYaw = Math.atan2(this.camera.position.x - this.cameraTarget.x, this.camera.position.z - this.cameraTarget.z);
    const yawDelta = Math.atan2(Math.sin(actualCameraYaw - f.yaw), Math.cos(actualCameraYaw - f.yaw));
    if (Math.abs(yawDelta) > 0.001 && !f.driving) {
      this.benji.update(0, f.heading, actualCameraYaw, f.moveSpeed, f.lean, f.loco, f.animT, true, f.air, f.vz, !!f.jooking, !!f.dribbling, !!f.ballCharging, !!f.releasing, !!f.listening, 0, f.celebrate ?? 0, !!f.talking, !!f.interacting, !!f.rebounding);
    }
    (window as typeof window & { __SACK_CAMERA__?: { blockers: number; occluded: boolean; distance: number; yawDelta: number; apartment: boolean; hq: boolean } }).__SACK_CAMERA__ = {
      blockers: this.cameraBlockers.length,
      occluded: this.lastCameraOccluded,
      distance: this.camera.position.distanceTo(this.cameraTarget),
      yawDelta,
      apartment: inApartment,
      hq: inHQ,
    };
  }
}
