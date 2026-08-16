import * as THREE from "three";
import type { LocomotionState } from "./characterController";

type View = "front" | "back" | "left" | "right";

const TAU = Math.PI * 2;
const VIEWS: View[] = ["back", "left", "front", "right"];

function wrap(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function texFromImage(img: HTMLImageElement) {
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.premultiplyAlpha = false;
  return tex;
}

function cardMat(img?: HTMLImageElement) {
  if (!img) {
    return new THREE.MeshBasicMaterial({ color: 0x1a1c1e, transparent: true, opacity: 0 });
  }
  return new THREE.MeshBasicMaterial({
    map: texFromImage(img),
    transparent: true,
    alphaTest: 0.22,
    depthWrite: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Hold a view through most of its 90° sector; blend only near the seams. */
function viewBlend(rel: number): { a: View; b: View; wa: number; wb: number } {
  const ang = ((rel % TAU) + TAU) % TAU;
  const sector = ang / (Math.PI / 2);
  const i0 = Math.floor(sector) % 4;
  const t = sector - Math.floor(sector);
  const edge = 0.18;
  if (t < edge) {
    const u = t / edge;
    return { a: VIEWS[(i0 + 3) % 4]!, b: VIEWS[i0]!, wa: 1 - u, wb: u };
  }
  if (t > 1 - edge) {
    const u = (t - (1 - edge)) / edge;
    return { a: VIEWS[i0]!, b: VIEWS[(i0 + 1) % 4]!, wa: 1 - u, wb: u };
  }
  return { a: VIEWS[i0]!, b: VIEWS[i0]!, wa: 1, wb: 0 };
}

/**
 * One Benji card — never a 4-face box.
 * Heading still owns which side of him you see. The card yaws to the camera
 * so you always look at a single full figure, not four photos spinning.
 */
export class PlayerCharacter {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private cardA: THREE.Mesh;
  private cardB: THREE.Mesh;
  private mats: Partial<Record<View, THREE.MeshBasicMaterial>> = {};
  private ready = false;
  private lastA: View | null = null;
  private lastB: View | null = null;

  constructor() {
    this.root.add(this.body);
    const geo = new THREE.PlaneGeometry(1.05, 1.78);
    const blank = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this.cardA = new THREE.Mesh(geo, blank);
    this.cardB = new THREE.Mesh(geo, blank.clone());
    this.cardA.position.y = 0.9;
    this.cardB.position.y = 0.9;
    this.cardB.position.z = -0.004;
    this.cardA.castShadow = false;
    this.body.add(this.cardA);
    this.body.add(this.cardB);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    this.root.add(shadow);
  }

  applyApprovedTextures(images: Record<string, HTMLImageElement>) {
    const front = images.frontHi ?? images.front;
    const back = images.backHi ?? images.back;
    const left = images.leftHi ?? images.left;
    const right = images.rightHi ?? images.right;
    if (!front && !back) return;
    this.mats.front = cardMat(front);
    this.mats.back = cardMat(back ?? front);
    this.mats.left = cardMat(left ?? front);
    this.mats.right = cardMat(right ?? front);
    this.ready = true;
    this.lastA = null;
    this.lastB = null;
  }

  update(
    _dt: number,
    heading: number,
    cameraYaw: number,
    speed: number,
    lean: number,
    state: LocomotionState,
    animT: number,
    thirdPerson: boolean,
  ) {
    this.root.visible = thirdPerson;
    this.root.rotation.y = cameraYaw;

    const rel = wrap(heading - cameraYaw);
    const blend = viewBlend(rel);
    if (this.ready) {
      if (blend.a !== this.lastA) {
        const mat = this.mats[blend.a];
        if (mat) this.cardA.material = mat;
        this.lastA = blend.a;
      }
      if (blend.b !== this.lastB) {
        const mat = this.mats[blend.b];
        if (mat) this.cardB.material = mat;
        this.lastB = blend.b;
      }
      const matA = this.cardA.material as THREE.MeshBasicMaterial;
      const matB = this.cardB.material as THREE.MeshBasicMaterial;
      matA.opacity = blend.wa;
      matB.opacity = blend.wb;
      matA.alphaTest = blend.wa > 0.92 ? 0.22 : 0.04;
      matB.alphaTest = blend.wb > 0.92 ? 0.22 : 0.04;
      this.cardB.visible = blend.wb > 0.02 && blend.a !== blend.b;
    }

    this.body.rotation.z = lean * 0.55;
    this.body.rotation.x = state === "run" ? -0.05 : state === "walk" ? -0.02 : 0;
    const bob =
      state === "idle"
        ? Math.sin(animT * 0.7) * 0.01
        : Math.abs(Math.sin(animT)) * (state === "run" ? 0.042 : 0.024);
    this.body.position.y = bob;
    const stride = Math.min(speed / 268, 1);
    const squash = 1 + Math.sin(animT * 2) * 0.016 * stride;
    this.cardA.scale.set(1, squash, 1);
    this.cardB.scale.set(1, squash, 1);
  }
}
