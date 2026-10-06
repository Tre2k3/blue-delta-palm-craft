import * as THREE from "three";
import type { Solid } from "../../core/types";
import { brick, concreteSlab, mulch, shingle, siding, trim } from "./materials";
import { mailbox, picketFence } from "./props";
import { crepeMyrtle, matureTree, ornamental, shrub } from "./trees";
import { addGround } from "../ground";

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function gable(width: number, depth: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

function windowUnit(parent: THREE.Object3D, glow: THREE.MeshStandardMaterial[], x: number, y: number, z: number, yaw: number) {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9ec4d4,
    roughness: 0.08,
    metalness: 0.15,
    emissive: 0xffe0b0,
    emissiveIntensity: 0.08,
  });
  glow.push(glass);
  const frameM = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.35, 0.08), frame);
  const glassM = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.12, 0.04), glass);
  glassM.position.z = 0.03;
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.12, 0.05), frame);
  mullion.position.z = 0.05;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.05), frame);
  rail.position.z = 0.05;
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.06, 0.16), frame);
  sill.position.set(0, -0.68, 0.04);
  g.add(frameM, glassM, mullion, rail, sill);
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
}

export type HouseStyle = 0 | 1 | 2;

/** One production bungalow. Style only swaps color, chimney, and driveway. */
export function residence(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  x: number,
  z: number,
  w: number,
  d: number,
  wall: string,
  roofColor: number,
  doorColor: string,
  openDoor: boolean,
  style: HouseStyle = 0,
  hero = false,
) {
  const wallH = 3.05;
  const base = 0.42;
  const foundation = new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 0.9 });
  box(w + 0.55, base, d + 0.55, x, base / 2, z, foundation, parent);
  box(w, wallH, d, x, base + wallH / 2, z, siding(wall), parent);
  box(0.12, wallH, d + 0.08, x - w / 2, base + wallH / 2, z, trim, parent);
  box(0.12, wallH, d + 0.08, x + w / 2, base + wallH / 2, z, trim, parent);

  const roofMat = shingle("#" + roofColor.toString(16).padStart(6, "0"));
  const brickMat = brick();
  const rise = style === 2 ? 1.7 : 1.35;
  const run = d / 2 + 0.65;
  const len = Math.hypot(run, rise);
  const pitch = Math.atan2(rise, run);
  const south = new THREE.Mesh(new THREE.BoxGeometry(w + 1.7, 0.09, len), roofMat);
  south.rotation.x = -pitch;
  south.position.set(x, base + wallH + rise * 0.46, z - run * 0.38);
  south.castShadow = true;
  south.receiveShadow = true;
  parent.add(south);
  const north = new THREE.Mesh(new THREE.BoxGeometry(w + 1.7, 0.09, len), roofMat);
  north.rotation.x = pitch;
  north.position.set(x, base + wallH + rise * 0.46, z + run * 0.38);
  north.castShadow = true;
  parent.add(north);
  const gableEnd = new THREE.Mesh(gable(d + 0.3, 0.1, rise), siding(wall));
  gableEnd.rotation.y = Math.PI / 2;
  gableEnd.position.set(x - w / 2 - 0.02, base + wallH, z);
  parent.add(gableEnd);
  const gableEast = gableEnd.clone();
  gableEast.position.x = x + w / 2 + 0.02;
  parent.add(gableEast);
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.4, metalness: 0.55 });
  box(w + 1.6, 0.08, 0.1, x, base + wallH + 0.06, z - d / 2 - 0.62, metal, parent);
  box(0.08, wallH * 0.92, 0.08, x - w / 2 + 0.15, base + wallH * 0.46, z - d / 2 - 0.2, metal, parent);

  const front = z - d / 2;
  const faceZ = front - 0.08;
  windowUnit(parent, glow, x - w * 0.28, base + 1.75, faceZ, Math.PI);
  windowUnit(parent, glow, x + w * 0.28, base + 1.75, faceZ, Math.PI);
  windowUnit(parent, glow, x - w / 2 - 0.08, base + 1.7, z, -Math.PI / 2);
  const shutter = new THREE.MeshStandardMaterial({ color: style === 1 ? 0x1e3348 : 0x241c18, roughness: 0.7 });
  for (const sx of [-w * 0.28, w * 0.28]) {
    box(0.1, 1.22, 0.05, x + sx - 0.68, base + 1.75, faceZ - 0.04, shutter, parent);
    box(0.1, 1.22, 0.05, x + sx + 0.68, base + 1.75, faceZ - 0.04, shutter, parent);
  }
  box(w + 0.08, 1.05, 0.1, x, base + 0.52, faceZ - 0.06, brickMat, parent);

  const doorMat = new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.65 });
  box(1.15, 2.25, 0.1, x, base + 1.15, faceZ - 0.02, trim, parent);
  box(0.92, 2.05, 0.08, x, base + 1.08, faceZ - 0.1, doorMat, parent);
  box(0.7, 0.04, 0.02, x, base + 1.45, faceZ - 0.16, trim, parent);
  box(0.06, 0.08, 0.06, x + 0.32, base + 1.05, faceZ - 0.16, new THREE.MeshStandardMaterial({ color: 0xe0b33a, metalness: 0.6, roughness: 0.35 }), parent);

  const porchZ = front - 1.35;
  const porchW = style === 1 ? w * 0.72 : w * 0.55;
  const deck = new THREE.MeshStandardMaterial({ color: 0x8a623d, roughness: 0.8 });
  box(porchW, 0.12, 2.4, x, 0.42, porchZ, deck, parent);
  addGround({
    minX: x - porchW / 2,
    maxX: x + porchW / 2,
    minZ: porchZ - 1.2,
    maxZ: porchZ + 1.2,
    y: 0.48,
  });
  box(porchW + 0.3, 0.08, 2.55, x, 2.55, porchZ, roofMat, parent);
  const porchGable = new THREE.Mesh(gable(porchW + 0.5, 0.22, 0.72), roofMat);
  porchGable.position.set(x, 2.58, porchZ - 1.2);
  porchGable.castShadow = true;
  parent.add(porchGable);
  for (const sx of [-porchW * 0.42, porchW * 0.42]) {
    box(0.38, 0.7, 0.38, x + sx, 0.55, porchZ - 1.05, brickMat, parent);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.22, 10), trim);
    col.position.set(x + sx, 1.52, porchZ - 1.05);
    col.castShadow = true;
    parent.add(col);
  }
  box(porchW * 0.9, 0.05, 0.05, x, 0.72, porchZ - 1.05, trim, parent);
  box(porchW * 0.9, 0.05, 0.05, x, 0.42, porchZ - 1.05, trim, parent);
  for (let i = 0; i < 5; i++) {
    box(0.04, 0.28, 0.04, x - porchW * 0.38 + i * (porchW * 0.19), 0.56, porchZ - 1.05, trim, parent);
  }
  box(1.4, 0.1, 0.42, x, 0.16, porchZ - 1.7, concreteSlab(1), parent);
  box(1.2, 0.1, 0.38, x, 0.26, porchZ - 1.28, concreteSlab(2), parent);
  box(1.05, 0.08, 0.34, x, 0.36, porchZ - 0.95, concreteSlab(3), parent);
  addGround({ minX: x - 0.7, maxX: x + 0.7, minZ: porchZ - 1.91, maxZ: porchZ - 1.49, y: 0.21 });
  addGround({ minX: x - 0.6, maxX: x + 0.6, minZ: porchZ - 1.47, maxZ: porchZ - 1.09, y: 0.31 });
  addGround({ minX: x - 0.52, maxX: x + 0.52, minZ: porchZ - 1.12, maxZ: porchZ - 0.78, y: 0.4 });

  const sconce = new THREE.MeshStandardMaterial({ color: 0xffe1a8, emissive: 0xffb45a, emissiveIntensity: 0.35 });
  glow.push(sconce);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), sconce);
  lamp.position.set(x + 0.7, base + 2.15, faceZ - 0.12);
  parent.add(lamp);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.06, 0.7), mulch());
  bed.position.set(x, 0.06, front - 0.45);
  parent.add(bed);
  shrub(x - w * 0.32, front - 0.45, parent, 1);
  shrub(x + w * 0.34, front - 0.4, parent, 0.85);
  shrub(x - w * 0.46, front - 0.2, parent, 0.7);
  shrub(x + w * 0.46, front - 0.22, parent, 0.75);
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    shrub(x + i * (w * 0.15), front - 2.45, parent, i % 2 === 0 ? 0.7 : 0.5);
  }
  const flower = new THREE.MeshStandardMaterial({
    color: style === 1 ? 0xf2e2a0 : style === 2 ? 0xe07a32 : 0xd45078,
    roughness: 0.55,
  });
  for (const sx of [-w * 0.28, w * 0.22, w * 0.4]) {
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), flower);
    bloom.position.set(x + sx, 0.22, front - 0.55);
    parent.add(bloom);
  }
  if (style !== 1) picketFence(x + (style === 0 ? -1 : 1) * w * 0.42, front - 2.15, 2.4, parent);
  if (hero) {
    matureTree(x - 2.4, front - 3.3, parent);
    crepeMyrtle(x + 2.2, front - 3.1, parent);
    const pot = new THREE.MeshStandardMaterial({ color: 0x8a4030, roughness: 0.8 });
    const bloom = new THREE.MeshStandardMaterial({ color: 0xd45078, roughness: 0.55 });
    for (const sx of [-porchW * 0.34, porchW * 0.34]) {
      box(0.26, 0.28, 0.26, x + sx, 0.66, porchZ - 0.15, pot, parent);
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bloom);
      flower.position.set(x + sx, 0.92, porchZ - 0.15);
      parent.add(flower);
    }
    box(0.46, 0.06, 0.42, x + porchW * 0.22, 0.62, porchZ + 0.15, deck, parent);
    box(0.46, 0.38, 0.06, x + porchW * 0.22, 0.86, porchZ + 0.32, trim, parent);
  }
  if (style === 2) ornamental(x + w * 0.15, front - 2.4, parent);

  const walk0 = front - 4.2;
  const walkFar = porchZ - 1.5;
  const walkLen = Math.abs(walk0 - walkFar);
  const walkMid = (walk0 + walkFar) / 2;
  box(1.05, 0.06, walkLen, x, 0.08, walkMid, concreteSlab(4), parent);
  addGround({ minX: x - 0.52, maxX: x + 0.52, minZ: walkMid - walkLen / 2, maxZ: walkMid + walkLen / 2, y: 0.11 });

  if (style === 1) {
    box(2.8, 0.05, 5.6, x + w * 0.55, 0.05, front - 3.2, concreteSlab(6), parent);
  }
  mailbox(x - w * 0.46, front - 2.15, parent, style === 2);

  if (openDoor) {
    solids.push({ minX: x - w / 2, maxX: x - 0.7, minZ: front, maxZ: z + d / 2 });
    solids.push({ minX: x + 0.7, maxX: x + w / 2, minZ: front, maxZ: z + d / 2 });
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: front + 1.15, maxZ: z + d / 2 });
  } else {
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: front, maxZ: z + d / 2 });
  }
}
