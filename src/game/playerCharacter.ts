import * as THREE from "three";
import type { LocomotionState } from "./characterController";

type View = "front" | "back" | "left" | "right";
type CycleKind = "idle" | "walk" | "jump";

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

function walkFrame(animT: number) {
  return ((Math.floor(animT) % 4) + 4) % 4;
}

function jumpFrame(air: number, vz: number) {
  if (vz > 1.4) return 1;
  if (air > 0.55) return 2;
  if (vz < -0.4 && air > 0.12) return 3;
  return 0;
}

/**
 * One Benji card — never a 4-face box.
 * Heading still owns which side of him you see. The card yaws to the camera
 * so you always look at a single full figure, not four photos spinning.
 * Walk / jump frames swap the card map; idle stills stay the approved photos.
 */
export class PlayerCharacter {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private cardA: THREE.Mesh;
  private cardB: THREE.Mesh;
  private shadow: THREE.Mesh;
  private idle: Partial<Record<View, THREE.MeshBasicMaterial>> = {};
  private walk: Partial<Record<View, THREE.MeshBasicMaterial[]>> = {};
  private jump: THREE.MeshBasicMaterial[] = [];
  private ready = false;
  private lastKeyA = "";
  private lastKeyB = "";

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

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.015;
    this.root.add(this.shadow);
  }

  applyApprovedTextures(images: Record<string, HTMLImageElement>) {
    const front = images.frontHi ?? images.front;
    const back = images.backHi ?? images.back;
    const left = images.leftHi ?? images.left;
    const right = images.rightHi ?? images.right;
    if (!front && !back) return;
    this.idle.front = cardMat(front);
    this.idle.back = cardMat(back ?? front);
    this.idle.left = cardMat(left ?? front);
    this.idle.right = cardMat(right ?? front);
    for (const view of VIEWS) {
      const frames: THREE.MeshBasicMaterial[] = [];
      for (let i = 1; i <= 4; i++) {
        const img = images[`walk-${view}-${i}`];
        frames.push(img ? cardMat(img) : this.idle[view]!);
      }
      this.walk[view] = frames;
    }
    this.jump = [];
    for (let i = 1; i <= 4; i++) {
      const img = images[`jump-${i}`];
      this.jump.push(img ? cardMat(img) : this.idle.front!);
    }
    this.ready = true;
    this.lastKeyA = "";
    this.lastKeyB = "";
  }

  private matFor(view: View, kind: CycleKind, frame: number) {
    if (kind === "jump") return this.jump[frame] ?? this.idle[view];
    if (kind === "walk") return this.walk[view]?.[frame] ?? this.idle[view];
    return this.idle[view];
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
    air = 0,
    vz = 0,
  ) {
    this.root.visible = thirdPerson;
    this.root.rotation.y = cameraYaw;

    const jumping = state === "jump" || air > 0.04;
    const kind: CycleKind = jumping ? "jump" : state === "walk" || state === "run" ? "walk" : "idle";
    const frame = kind === "walk" ? walkFrame(animT) : kind === "jump" ? jumpFrame(air, vz) : 0;

    const rel = wrap(heading - cameraYaw);
    const blend = viewBlend(rel);
    if (this.ready) {
      if (kind === "jump") {
        const key = `jump:${frame}`;
        if (key !== this.lastKeyA) {
          const mat = this.matFor("front", "jump", frame);
          if (mat) this.cardA.material = mat;
          this.lastKeyA = key;
        }
        this.lastKeyB = "";
        const matA = this.cardA.material as THREE.MeshBasicMaterial;
        matA.opacity = 1;
        matA.alphaTest = 0.22;
        this.cardB.visible = false;
      } else {
        const keyA = `${blend.a}:${kind}:${frame}`;
        const keyB = `${blend.b}:${kind}:${frame}`;
        if (keyA !== this.lastKeyA) {
          const mat = this.matFor(blend.a, kind, frame);
          if (mat) this.cardA.material = mat;
          this.lastKeyA = keyA;
        }
        if (keyB !== this.lastKeyB) {
          const mat = this.matFor(blend.b, kind, frame);
          if (mat) this.cardB.material = mat;
          this.lastKeyB = keyB;
        }
        const matA = this.cardA.material as THREE.MeshBasicMaterial;
        const matB = this.cardB.material as THREE.MeshBasicMaterial;
        matA.opacity = blend.wa;
        matB.opacity = blend.wb;
        matA.alphaTest = blend.wa > 0.92 ? 0.22 : 0.04;
        matB.alphaTest = blend.wb > 0.92 ? 0.22 : 0.04;
        this.cardB.visible = blend.wb > 0.02 && blend.a !== blend.b;
      }
    }

    this.body.rotation.z = lean * 0.55;
    this.body.rotation.x = state === "run" ? -0.05 : state === "walk" ? -0.02 : jumping ? -0.04 : 0;
    const bob =
      jumping
        ? 0
        : state === "idle"
          ? Math.sin(animT * 0.7) * 0.01
          : Math.abs(Math.sin(animT)) * (state === "run" ? 0.042 : 0.024);
    this.body.position.y = air + bob;

    const stretch = jumping
      ? vz > 0.8
        ? 1.08
        : vz < -1.2
          ? 0.94
          : 1.03
      : 1 + Math.sin(animT * 2) * 0.016 * Math.min(speed / 268, 1);
    const squat = jumping && vz > 0.8 ? 0.94 : jumping && vz < -1.2 ? 1.06 : 1;
    this.cardA.scale.set(squat, stretch, 1);
    this.cardB.scale.set(squat, stretch, 1);

    const lift = Math.min(air / 1.4, 1);
    this.shadow.scale.setScalar(1 - lift * 0.45);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - lift * 0.7);
  }
}
