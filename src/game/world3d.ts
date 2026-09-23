import * as THREE from "three";
import { POIS } from "./data";
import { WorldLifePass } from "./worldLifePass";
import { S, World3D as World3DCore, wx, wz, type WorldFrame } from "./world3dCore";
import { applyPolygonOffset } from "./polygonOffset";
import { poiBuildingRect } from "./worldTopology";
import { APPROACH_Z, LANE_XS, PIN_Z, pinHome } from "./bowling";
import { CUTOUT_ALPHA } from "./cutout";

export { S, wx, wz };
export type { WorldFrame };

const CAMERA_ORBITS = [0.38, -0.38, 0.72, -0.72, 1.02, -1.02] as const;
const UP = new THREE.Vector3(0, 1, 0);
const APARTMENT = POIS.find((p) => p.id === "apartment")!;
const STORE = POIS.find((p) => p.id === "store")!;
const LANES = POIS.find((p) => p.id === "lanes")!;

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
  private lanesExterior: THREE.Group | null = null;
  private lanesInterior: THREE.Group | null = null;
  private bowlCamPos = new THREE.Vector3();
  private bowlCamLook = new THREE.Vector3();
  private bowlBallWorld = new THREE.Vector3();
  private bowlPinWorld = new THREE.Vector3();
  private bowlShot = false;
  private worldLife = new WorldLifePass(this.scene);

  override buildCity(walls: { x: number; y: number; w: number; h: number }[], trees: { x: number; y: number }[]) {
    super.buildCity(walls, trees);
    this.cameraBlockers = [];
    this.apartmentExterior = this.findLandmark(APARTMENT);
    this.hqExterior = this.findLandmark(STORE);
    this.lanesExterior = this.findLandmark(LANES);

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

    if (this.lanesExterior) {
      try {
        this.dressLanesExterior(this.lanesExterior);
      } catch (err) {
        console.warn("[sack] lanes neon failed", err);
      }
    }
    this.lanesInterior?.removeFromParent();
    try {
      this.lanesInterior = this.buildBowlingInterior(wx(LANES.x + LANES.w / 2), wz(LANES.y + LANES.h / 2));
      this.lanesInterior.visible = false;
      this.scene.add(this.lanesInterior);
    } catch (err) {
      console.warn("[sack] lanes interior failed", err);
      this.lanesInterior = null;
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
    const light = new THREE.PointLight(0xffe4c0, 6.4, 20, 1.25);
    light.position.set(0, 2.65, 0.2);
    root.add(light);
    const fill = new THREE.PointLight(0xc8dce8, 2.4, 14, 1.6);
    fill.position.set(-3.2, 1.85, -2.3);
    root.add(fill);
    const windowFill = new THREE.PointLight(0xfff1d0, 2.1, 12, 1.7);
    windowFill.position.set(2.4, 2.1, 2.4);
    root.add(windowFill);
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
    const wallPaint = new THREE.MeshStandardMaterial({ color: 0x2c261e, roughness: 0.88 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.78 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x8aa4b8, roughness: 0.12, metalness: 0.55, transparent: true, opacity: 0.35 });
    const width = wx(STORE.w) - 0.2;
    const depth = wz(STORE.h) - 0.2;
    const halfW = width / 2;
    const halfD = depth / 2;
    const wallH = 3.35;
    const wallT = 0.12;

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3c2f24, roughness: 0.48, metalness: 0.16 });
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

    // Hollow checkout — thin front + top so K can stand close, adult-scale.
    const counterZ = -halfD + 3.15;
    const deskH = 0.72;
    const deskD = 0.52;
    const matte = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.82, metalness: 0.08 });
    root.add(box(3.4, deskH, 0.09, matte, 0, deskH / 2, counterZ + deskD / 2));
    root.add(box(3.52, 0.045, 0.5, gold, 0, deskH + 0.02, counterZ + 0.04));
    root.add(box(3.4, 0.04, 0.46, matte, 0, deskH - 0.02, counterZ + 0.02));
    root.add(box(1.5, 0.03, 0.03, gold, 0, 0.5, counterZ + deskD / 2 + 0.03));
    const register = new THREE.Group();
    register.position.set(1.2, deskH + 0.02, counterZ + deskD / 2 - 0.08);
    register.add(box(0.3, 0.18, 0.22, matte, 0, 0.09, 0));
    register.add(box(0.24, 0.025, 0.16, gold, 0, 0.2, 0));
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xc9a84c, emissiveIntensity: 0.55, roughness: 0.35 }),
    );
    screen.position.set(0, 0.3, 0.03);
    register.add(screen);
    root.add(register);

    const addTable = (x: number, z: number, tex: THREE.Texture | undefined) => {
      root.add(box(1.65, 0.72, 1.05, wood, x, 0.38, z));
      root.add(box(1.55, 0.05, 0.95, gold, x, 0.78, z));
      root.add(box(1.4, 0.03, 0.82, this.photoMat(tex, 0x1a1612), x, 0.82, z));
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
      g.add(box(1.7, 1.35, 0.12, black, 0, 1.05, 0.02));
      const art = this.photoWall(1.55, 1.2, store.merch, 0x1a1612);
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

    const key = new THREE.PointLight(0xffe8c4, 10.5, 24, 1.05);
    key.position.set(0, 2.95, 0.4);
    root.add(key);
    const backLight = new THREE.PointLight(0xffd89a, 5.2, 14, 1.25);
    backLight.position.set(0, 2.6, -halfD + 1.6);
    root.add(backLight);
    const greenFill = new THREE.PointLight(0x7ee0a8, 3.1, 16, 1.35);
    greenFill.position.set(-halfW + 1.6, 2.1, 0.2);
    root.add(greenFill);
    const goldFill = new THREE.PointLight(0xffd56a, 3.1, 16, 1.35);
    goldFill.position.set(halfW - 1.6, 2.1, 0.2);
    root.add(goldFill);
    const doorFill = new THREE.PointLight(0xf7f2e6, 4.2, 12, 1.4);
    doorFill.position.set(0, 2.3, halfD - 1.2);
    root.add(doorFill);

    const kTex = this.art.people["k-blanco"];
    if (kTex) {
      // Benji's card is 1.78m. K stands further back so we oversize her or she reads as a kid.
      const kH = 2.22;
      const img = kTex.image as { width?: number; height?: number } | undefined;
      const kW = kH * ((img?.width ?? 400) / (img?.height ?? 760));
      const riser = 0.06;
      // Flat true-colour card like Benji and the street NPCs. A lit material under the gold point
      // lights turned her skin orange.
      const kMat = new THREE.MeshBasicMaterial({
        map: kTex,
        color: 0xffffff,
        alphaTest: CUTOUT_ALPHA,
        transparent: false,
        depthWrite: true,
        side: THREE.FrontSide,
        toneMapped: false,
      });
      const kMesh = new THREE.Mesh(new THREE.PlaneGeometry(kW, kH), kMat);
      kMesh.name = "k-blanco-desk";
      kMesh.position.set(0, riser + kH / 2, counterZ + 0.06);
      kMesh.renderOrder = 2;
      root.add(kMesh);
      const faceLight = new THREE.PointLight(0xffe4c4, 1.45, 2.8, 1.55);
      faceLight.position.set(0.04, deskH + 0.7, counterZ + deskD / 2 + 0.18);
      root.add(faceLight);
    }
    return root;
  }

  private neonMat(color: number, intensity = 1.35) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 0.28,
      metalness: 0.18,
    });
  }

  private dressLanesExterior(root: THREE.Group) {
    const bw = wx(LANES.w);
    const bd = wz(LANES.h);
    const neon = this.neonMat(0xff2bd6, 1.55);
    const gold = this.neonMat(0xd4af37, 1.2);
    const green = this.neonMat(0x39ff14, 1.1);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.72, 0.55, 0.12), neon);
    sign.position.set(0, 4.15, bd / 2 + 0.12);
    root.add(sign);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.78, 0.08, 0.08), gold);
    bar.position.set(0, 3.8, bd / 2 + 0.14);
    root.add(bar);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#120814";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = "#ff2bd6";
    ctx.font = "800 118px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("901 LANES", 512, 118);
    ctx.fillStyle = "#d4af37";
    ctx.font = "700 36px ui-sans-serif, system-ui";
    ctx.fillText("OPEN · NEXT TO 901 COURT", 512, 200);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(bw * 0.7, 0.48),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    );
    face.position.set(0, 4.15, bd / 2 + 0.19);
    root.add(face);
    const pin = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.45 }),
    );
    pin.position.set(-bw * 0.28, 6.05, bd / 2 + 0.08);
    pin.scale.set(1.35, 1.45, 1.35);
    root.add(pin);
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: 0xc41e3a, roughness: 0.4 }),
    );
    stripe.position.y = -0.12;
    pin.add(stripe);
    const pin2 = pin.clone();
    pin2.position.x = bw * 0.28;
    root.add(pin2);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.9, 0.1, 0.55), green);
    lip.position.set(0, 2.55, bd / 2 + 0.32);
    root.add(lip);
  }

  private buildBowlingInterior(cx: number, cz: number) {
    const root = new THREE.Group();
    root.position.set(cx, 0, cz);
    root.name = "901-lanes-interior";
    const width = wx(LANES.w) - 0.22;
    const depth = wz(LANES.h) - 0.22;
    const halfW = width / 2;
    const halfD = depth / 2;
    const wallH = 3.45;
    const wallT = 0.12;
    const wood = new THREE.MeshStandardMaterial({ color: 0xb8894a, roughness: 0.48, metalness: 0.06 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.62 });
    const carpet = new THREE.MeshStandardMaterial({ color: 0x2a1233, roughness: 0.92 });
    const wallPaint = new THREE.MeshStandardMaterial({ color: 0x1a1022, roughness: 0.88 });
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.25 });
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xf7f1e6, roughness: 0.42 });
    const pinStripe = new THREE.MeshStandardMaterial({ color: 0xc41e3a, roughness: 0.45 });
    const black = new THREE.MeshStandardMaterial({ color: 0x141014, roughness: 0.7 });
    const gold = this.neonMat(0xd4af37, 0.85);
    const neon = this.neonMat(0xff2bd6, 1.45);
    const lime = this.neonMat(0x39ff14, 1.05);

    root.add(box(width, 0.1, depth, carpet, 0, 0.04, 0));
    root.add(box(width, 0.06, depth, black, 0, wallH + 0.02, 0));
    root.add(box(width, wallH, wallT, wallPaint, 0, wallH / 2, -halfD));
    root.add(box(wallT, wallH, depth, wallPaint, -halfW, wallH / 2, 0));
    root.add(box(wallT, wallH, depth, wallPaint, halfW, wallH / 2, 0));
    this.addSouthDoor(root, width, halfD, wallH, wallT, wallPaint, neon, 0, wx(48 * 1.85));

    const boardCanvas = document.createElement("canvas");
    boardCanvas.width = 1024;
    boardCanvas.height = 160;
    const bctx = boardCanvas.getContext("2d")!;
    bctx.fillStyle = "#0d0b0a";
    bctx.fillRect(0, 0, 1024, 160);
    bctx.fillStyle = "#ff2bd6";
    bctx.font = "800 72px ui-sans-serif, system-ui";
    bctx.textAlign = "center";
    bctx.fillText("901 LANES", 512, 70);
    bctx.fillStyle = "#d4af37";
    bctx.font = "700 28px ui-sans-serif, system-ui";
    bctx.fillText("TEN DOWN. CITY UP.", 512, 122);
    const btex = new THREE.CanvasTexture(boardCanvas);
    btex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(8.4, 1.15),
      new THREE.MeshStandardMaterial({
        map: btex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: btex,
        emissiveIntensity: 0.55,
        roughness: 0.55,
      }),
    );
    board.position.set(0, 2.85, -halfD + 0.08);
    root.add(board);
    root.add(box(8.8, 0.08, 0.08, gold, 0, 3.48, -halfD + 0.08));

    const pins: THREE.Mesh[] = [];
    const pinHomes: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < LANE_XS.length; i++) {
      const lx = LANE_XS[i]!;
      root.add(box(1.18, 0.08, 9.4, wood, lx, 0.11, -0.45));
      root.add(box(0.22, 0.07, 9.4, gutterMat, lx - 0.72, 0.06, -0.45));
      root.add(box(0.22, 0.07, 9.4, gutterMat, lx + 0.72, 0.06, -0.45));
      root.add(box(0.08, 0.02, 9.4, gold, lx, 0.155, -0.45));
      root.add(box(1.35, 0.12, 0.18, black, lx, 0.16, PIN_Z - 0.85));
      root.add(box(1.4, 1.15, 0.08, black, lx, 0.72, PIN_Z - 1.05));
      const retX = lx + (i % 2 === 0 ? 1.05 : -1.05);
      root.add(box(0.42, 0.55, 1.05, black, retX, 0.32, 1.35));
      root.add(box(0.38, 0.04, 0.9, gold, retX, 0.62, 1.35));
      for (let p = 0; p < 10; p++) {
        const home = pinHome(p);
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.078, 0.38, 8), pinMat);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 10), pinStripe);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.04;
        pin.add(ring);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), pinMat);
        head.position.y = 0.2;
        pin.add(head);
        pin.position.set(lx + home.x, 0.32, PIN_Z + home.z);
        pin.castShadow = true;
        root.add(pin);
        pins.push(pin);
        pinHomes.push({ x: pin.position.x, y: pin.position.y, z: pin.position.z });
      }
    }

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 12),
      new THREE.MeshStandardMaterial({
        color: 0x5b21b6,
        roughness: 0.28,
        metalness: 0.35,
        emissive: 0x2e1065,
        emissiveIntensity: 0.35,
      }),
    );
    ball.visible = false;
    ball.castShadow = true;
    root.add(ball);

    root.add(box(2.2, 0.92, 1.05, darkWood, 6.55, 0.5, 4.55));
    root.add(box(2.05, 0.06, 0.95, gold, 6.55, 0.98, 4.55));
    root.add(box(0.7, 0.55, 0.55, black, 7.15, 1.28, 4.55));
    root.add(box(4.2, 0.42, 0.7, darkWood, -5.35, 0.28, 6.35));
    root.add(box(4.2, 0.42, 0.7, darkWood, 5.35, 0.28, 6.35));
    root.add(box(4.0, 0.08, 0.18, neon, -5.35, 0.52, 6.35));
    root.add(box(4.0, 0.08, 0.18, lime, 5.35, 0.52, 6.35));
    root.add(box(0.28, 0.12, 0.7, neon, 5.85, 1.08, 4.55));
    root.add(box(0.28, 0.12, 0.7, gold, 6.2, 1.08, 4.55));

    const key = new THREE.PointLight(0xff7ad9, 7.2, 22, 1.15);
    key.position.set(0, 2.85, 0.4);
    key.name = "lanes-key";
    root.add(key);
    const pinLight = new THREE.PointLight(0xffd56a, 4.8, 14, 1.3);
    pinLight.position.set(0, 2.4, PIN_Z);
    root.add(pinLight);
    const doorFill = new THREE.PointLight(0xf7f2e6, 3.4, 12, 1.4);
    doorFill.position.set(0, 2.2, halfD - 1.4);
    root.add(doorFill);
    const limeFill = new THREE.PointLight(0x7ee0a8, 2.4, 12, 1.5);
    limeFill.position.set(-5.2, 2.1, 2.2);
    root.add(limeFill);

    root.userData.pins = pins;
    root.userData.pinHomes = pinHomes;
    root.userData.ball = ball;
    root.userData.key = key;
    return root;
  }

  private syncBowling(f: WorldFrame) {
    const root = this.lanesInterior;
    if (!root) {
      this.bowlShot = false;
      return;
    }
    const pins = root.userData.pins as THREE.Mesh[] | undefined;
    const homes = root.userData.pinHomes as { x: number; y: number; z: number }[] | undefined;
    const ball = root.userData.ball as THREE.Mesh | undefined;
    const key = root.userData.key as THREE.PointLight | undefined;
    const data = f.bowling;
    const flash = data?.flash ?? 0;
    if (key) key.intensity = 7.2 + flash * 10;
    if (!data?.active) {
      this.bowlShot = false;
      if (ball) ball.visible = false;
      if (pins && homes) {
        for (let i = 0; i < pins.length; i++) {
          const p = pins[i]!;
          const h = homes[i]!;
          p.visible = true;
          p.position.set(h.x, h.y, h.z);
          p.rotation.set(0, 0, 0);
        }
      }
      return;
    }
    const lane = Math.max(0, Math.min(LANE_XS.length - 1, data.lane | 0));
    const lx = LANE_XS[lane]!;
    if (ball) {
      const rolling = data.phase === "rolling" || data.phase === "pins";
      ball.visible = rolling || data.phase === "charging";
      const t = data.phase === "charging" ? 0 : data.progress;
      const z = APPROACH_Z + (PIN_Z - APPROACH_Z) * t;
      const y = data.phase === "charging" ? 0.28 : 0.22 + Math.sin(t * Math.PI) * 0.04;
      ball.position.set(lx + data.ballX, y, z);
      ball.rotation.x = t * 14;
      if (data.gutter && t > 0.2) ball.position.y = 0.12;
    }
    this.frameBowlShot(f, root, ball, lx);
    if (pins && homes) {
      const start = lane * 10;
      for (let i = 0; i < pins.length; i++) {
        const p = pins[i]!;
        const h = homes[i]!;
        const local = i - start;
        const onLane = local >= 0 && local < 10;
        if (!onLane) {
          p.position.set(h.x, h.y, h.z);
          p.rotation.set(0, 0, 0);
          p.visible = true;
          continue;
        }
        const standing = data.standing[local] ?? true;
        const hit = data.knocked[local] ?? false;
        if (data.phase === "pins" && hit) {
          const u = Math.min(1, data.pinT);
          const dir = local % 2 === 0 ? 1 : -1;
          p.position.set(h.x + dir * u * 0.55, h.y + 0.12 * Math.sin(u * Math.PI), h.z - u * 0.45);
          p.rotation.set(u * 1.6 * dir, u * 2.2, u * 1.1);
          p.visible = true;
        } else if (!standing) {
          p.position.set(h.x + 0.4, 0.1, h.z - 0.35);
          p.rotation.set(1.45, 0.8, 0.4);
          p.visible = true;
        } else {
          p.position.set(h.x, h.y, h.z);
          p.rotation.set(0, 0, 0);
          p.visible = true;
        }
      }
    }
  }

  private frameBowlShot(f: WorldFrame, root: THREE.Group, ball: THREE.Mesh | undefined, lx: number) {
    const data = f.bowling;
    this.bowlShot = false;
    if (!data || f.cameraView === "first") return;
    if (data.phase !== "rolling" && data.phase !== "pins" && data.phase !== "mark") return;
    root.updateMatrixWorld(true);
    const t = data.phase === "rolling" ? data.progress : 1;
    if (ball) ball.getWorldPosition(this.bowlBallWorld);
    else this.bowlBallWorld.set(root.position.x + lx + data.ballX, 0.28, root.position.z + APPROACH_Z + (PIN_Z - APPROACH_Z) * t);
    this.bowlPinWorld.set(lx + data.ballX * 0.15, 0.48, PIN_Z);
    this.bowlPinWorld.applyMatrix4(root.matrixWorld);
    const impact = data.phase === "pins" ? 1 : Math.max(0, (t - 0.38) / 0.62);
    this.bowlCamLook.copy(this.bowlBallWorld).lerp(this.bowlPinWorld, impact);
    this.bowlCamLook.y = 0.38 + impact * 0.22;
    const side = lx >= 0 ? -1.15 : 1.15;
    const localX = lx + side * (1.85 + impact * 0.55);
    const localY = 1.22 + impact * 0.42;
    const localZ = data.phase === "pins"
      ? PIN_Z + 1.42
      : APPROACH_Z + (PIN_Z - APPROACH_Z) * Math.max(0.18, t - 0.12) + 1.65 - impact * 0.55;
    this.bowlCamPos.set(localX, localY, localZ).applyMatrix4(root.matrixWorld);
    const snap = data.phase === "rolling" && t < 0.16 ? 0.22 : 0.28;
    this.camera.position.lerp(this.bowlCamPos, snap);
    this.camera.lookAt(this.bowlCamLook);
    this.camera.fov = data.phase === "pins" ? 50 : 55;
    this.camera.updateProjectionMatrix();
    this.bowlShot = true;
  }

/**
   * Race camera sweeps low and pushes in on nitro, so it can land inside a building at a corner.
   * Lift it over the roofline first; if that is still blocked, pull it in toward the car.
   */
  private keepRaceCameraClear(f: WorldFrame) {
    this.cameraTarget.set(wx(f.px), 0.9, wz(f.py));
    this.scene.updateMatrixWorld(true);
    const hit = this.raceBlockerDistance(this.camera.position);
    if (hit === null) return false;
    this.cameraDesired.copy(this.camera.position);
    for (const lift of [1.8, 3.6, 5.4]) {
      this.cameraCandidate.copy(this.cameraDesired);
      this.cameraCandidate.y += lift;
      if (this.raceBlockerDistance(this.cameraCandidate) === null) {
        this.camera.position.copy(this.cameraCandidate);
        this.camera.lookAt(this.cameraTarget);
        return true;
      }
    }
    this.cameraDirection.subVectors(this.cameraDesired, this.cameraTarget).normalize();
    this.camera.position.copy(this.cameraTarget).addScaledVector(this.cameraDirection, Math.max(2.2, hit - 0.4));
    this.camera.position.y = Math.max(this.camera.position.y, 3.2);
    this.camera.lookAt(this.cameraTarget);
    return true;
  }

  /**
   * Every static building-sized mesh, gathered once. cameraBlockers only knows plain box buildings,
   * which misses landmark shells and most of the race loop.
   */
  private raceBlockers: THREE.Object3D[] | null = null;

  private collectRaceBlockers() {
    const found: THREE.Object3D[] = [];
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const skip = new Set<THREE.Object3D>([...this.cars, this.player]);
    this.scene.updateMatrixWorld(true);
    const walk = (obj: THREE.Object3D) => {
      if (skip.has(obj) || obj instanceof THREE.Sprite) return;
      if (obj instanceof THREE.Mesh && obj.visible) {
        box.setFromObject(obj).getSize(size);
        // Walls and facade planes count too: tall, and wide in at least one direction.
        if (size.y >= 1.7 && Math.max(size.x, size.z) >= 1.2) found.push(obj);
      }
      for (const child of obj.children) walk(child);
    };
    walk(this.scene);
    return found;
  }

  private raceBlockerDistance(position: THREE.Vector3) {
    this.raceBlockers ??= this.collectRaceBlockers();
    this.cameraDirection.subVectors(position, this.cameraTarget);
    const distance = this.cameraDirection.length();
    if (distance < 0.25) return null;
    this.cameraDirection.multiplyScalar(1 / distance);
    this.cameraRay.set(this.cameraTarget, this.cameraDirection);
    this.cameraRay.near = 0.28;
    this.cameraRay.far = distance - 0.04;
    const hit = this.cameraRay
      .intersectObjects(this.raceBlockers, false)
      .find((c) => c.distance > 0.3 && c.distance < distance - 0.04 && isActuallyVisible(c.object));
    if (hit) return hit.distance;
    // Single-sided facades only answer rays from their front, so look back from the camera too.
    this.cameraRay.set(position, this.cameraDirection.negate());
    const back = this.cameraRay
      .intersectObjects(this.raceBlockers, false)
      .find((c) => c.distance > 0.04 && c.distance < distance - 0.3 && isActuallyVisible(c.object));
    return back ? distance - back.distance : null;
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
    const inLanes = inside(f, LANES) && (f.mode === "world" || f.mode === "dialogue" || !!f.bowling?.active);
    if (this.apartmentExterior) this.apartmentExterior.visible = !inApartment;
    if (this.apartmentInterior) this.apartmentInterior.visible = inApartment;
    if (this.hqExterior) this.hqExterior.visible = !inHQ;
    if (this.hqInterior) this.hqInterior.visible = inHQ;
    if (this.lanesExterior) this.lanesExterior.visible = !inLanes;
    if (this.lanesInterior) this.lanesInterior.visible = inLanes;
    if (inLanes) this.syncBowling(f);
    const kSprite = this.npcSprites.get("k_blanco");
    if (kSprite) kSprite.visible = false;
    const clerk = this.npcSprites.get("lane_clerk");
    if (clerk) clerk.visible = inLanes;
    const kDesk = this.hqInterior?.getObjectByName("k-blanco-desk");
    if (kDesk) kDesk.visible = inHQ;
    if (f.raceCam && f.cameraView === "third" && f.driving) {
      this.lastCameraOccluded = this.keepRaceCameraClear(f);
      return;
    }
    if (f.cameraView !== "third" || f.driving || this.bowlShot) {
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
      const hoopin = f.mode === "basketball" || !!f.ball.active;
      this.benji.update(
        0,
        f.heading,
        actualCameraYaw,
        f.moveSpeed,
        f.lean,
        f.loco,
        f.animT,
        true,
        f.air,
        f.vz,
        !!f.jooking,
        !!f.dribbling,
        !!f.ballCharging,
        !!f.releasing,
        !!f.listening,
        0,
        f.celebrate ?? 0,
        !!f.talking,
        !!f.interacting,
        !!f.rebounding,
        !!f.ball.held,
        hoopin,
      );
    }
    if (f.cameraView === "third" && !f.driving) this.benji.alignToCamera(this.camera);
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
