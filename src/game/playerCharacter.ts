import * as THREE from "three";
import type { LocomotionState } from "./characterController";

function texFromImage(img: HTMLImageElement) {
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  return tex;
}

function faceMat(img?: HTMLImageElement, fallback = 0x1a1a1a) {
  if (!img) {
    return new THREE.MeshStandardMaterial({ color: fallback, roughness: 0.7 });
  }
  return new THREE.MeshStandardMaterial({
    map: texFromImage(img),
    roughness: 0.62,
    metalness: 0.02,
    transparent: true,
    alphaTest: 0.08,
  });
}

export class PlayerCharacter {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private shell: THREE.Mesh;
  private ready = false;

  constructor() {
    this.root.add(this.body);
    const placeholder = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.8 });
    this.shell = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.78, 0.36), [
      placeholder,
      placeholder,
      placeholder,
      placeholder,
      placeholder,
      placeholder,
    ]);
    this.shell.position.y = 0.9;
    this.shell.castShadow = true;
    this.shell.receiveShadow = true;
    this.body.add(this.shell);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
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
    const top = new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.85 });
    const bot = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.9 });
    this.shell.material = [
      faceMat(right, 0x222428),
      faceMat(left, 0x222428),
      top,
      bot,
      faceMat(front, 0x1db954),
      faceMat(back, 0x111214),
    ];
    this.ready = true;
  }

  update(
    _dt: number,
    heading: number,
    speed: number,
    lean: number,
    state: LocomotionState,
    animT: number,
    thirdPerson: boolean,
  ) {
    this.root.visible = thirdPerson;
    this.root.rotation.y = heading + Math.PI;
    this.body.rotation.z = lean;
    this.body.rotation.x = state === "run" ? -0.07 : state === "walk" ? -0.03 : 0;
    const bob =
      state === "idle"
        ? Math.sin(animT * 0.7) * 0.012
        : Math.abs(Math.sin(animT)) * (state === "run" ? 0.05 : 0.028);
    this.body.position.y = bob;
    const stride = Math.min(speed / 268, 1);
    this.shell.scale.set(1, 1 + Math.sin(animT * 2) * 0.012 * stride, 1);
    void this.ready;
  }
}
