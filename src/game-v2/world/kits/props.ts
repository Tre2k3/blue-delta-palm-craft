import * as THREE from "three";
import { trim } from "./materials";

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const black = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.55, metalness: 0.2 });
const red = new THREE.MeshStandardMaterial({ color: 0xb43322, roughness: 0.5 });
const silver = new THREE.MeshStandardMaterial({ color: 0xc5c8ce, roughness: 0.35, metalness: 0.7 });

export function mailbox(x: number, z: number, parent: THREE.Object3D, blue = false) {
  const boxMat = new THREE.MeshStandardMaterial({ color: blue ? 0x1f4d8a : 0xb43322, roughness: 0.5 });
  mesh(new THREE.BoxGeometry(0.08, 1.05, 0.08), black, x, 0.52, z, parent);
  mesh(new THREE.BoxGeometry(0.42, 0.28, 0.28), boxMat, x, 1.05, z, parent);
  mesh(new THREE.BoxGeometry(0.46, 0.06, 0.32), black, x, 1.2, z, parent);
  const flag = mesh(new THREE.BoxGeometry(0.04, 0.16, 0.1), red, x + 0.24, 1.12, z, parent);
  flag.castShadow = false;
}

export function hydrant(x: number, z: number, parent: THREE.Object3D) {
  mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.55, 10), red, x, 0.32, z, parent);
  mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), silver, x, 0.62, z, parent);
  mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), silver, x, 0.4, z, parent);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), black, x, 0.7, z, parent);
}

export function trashBin(x: number, z: number, parent: THREE.Object3D) {
  const body = new THREE.MeshStandardMaterial({ color: 0x2f4a38, roughness: 0.62, metalness: 0.08 });
  mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.86, 14), body, x, 0.46, z, parent);
  mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.07, 14), black, x, 0.9, z, parent);
  mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 12, Math.PI), silver, x, 0.72, z + 0.3, parent);
}

export function streetlight(x: number, z: number, parent: THREE.Object3D, lights: THREE.PointLight[]) {
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.3, 8), black, x, 2.15, z, parent);
  mesh(new THREE.BoxGeometry(0.72, 0.08, 0.28), black, x, 4.25, z, parent);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe7c2, emissive: 0xffb45a, emissiveIntensity: 0.25 });
  mesh(new THREE.BoxGeometry(0.46, 0.08, 0.18), bulbMat, x, 4.16, z, parent);
  const light = new THREE.PointLight(0xffc27a, 0, 14, 2);
  light.position.set(x, 4.1, z);
  parent.add(light);
  lights.push(light);
}

export function picketFence(x: number, z: number, len: number, parent: THREE.Object3D) {
  const wood = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.75 });
  const posts = Math.max(2, Math.round(len / 1.2));
  for (let i = 0; i < posts; i++) {
    const px = x - len / 2 + (i / (posts - 1)) * len;
    mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), wood, px, 0.42, z, parent);
  }
  mesh(new THREE.BoxGeometry(len, 0.05, 0.04), wood, x, 0.62, z, parent);
  mesh(new THREE.BoxGeometry(len, 0.05, 0.04), wood, x, 0.28, z, parent);
}

export function bench(x: number, z: number, yaw: number, parent: THREE.Object3D) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.42), wood);
  seat.position.y = 0.46;
  g.add(seat);
  for (const sx of [-0.68, 0.68]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.36), black);
    leg.position.set(sx, 0.23, 0);
    g.add(leg);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.36, 0.06), wood);
  back.position.set(0, 0.72, -0.18);
  g.add(back);
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  parent.add(g);
}

export function utilityPole(x: number, z: number, parent: THREE.Object3D) {
  mesh(new THREE.CylinderGeometry(0.08, 0.11, 6.4, 6), new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.9 }), x, 3.2, z, parent);
  mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), trim, x, 6.15, z, parent);
}

export function planter(x: number, z: number, parent: THREE.Object3D) {
  mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.55, 12), black, x, 0.3, z, parent);
  mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.9 }), x, 0.62, z, parent);
}
