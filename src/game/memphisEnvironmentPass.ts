import * as THREE from "three";
import { POIS, STREETS, TILE } from "./data";
import { WorldLifePass } from "./worldLifePass";
import { wx, wz } from "./world3dCore";
import { applyPolygonOffset } from "./polygonOffset";
import { PIERS, riverHole } from "./worldTopology";

type PatchedLife = WorldLifePass & { __memphisEnvironmentPatched?: boolean };
const RIVER = () => riverHole();

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

function addHydrant(root: THREE.Group, x: number, z: number, color = 0xb82424) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.24 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.72, metalness: 0.35 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.52, 10), mat);
  body.position.y = 0.27;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 7), mat);
  cap.scale.y = 0.65;
  cap.position.y = 0.56;
  g.add(cap);
  for (const dx of [-0.18, 0.18]) {
    const side = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8), dark);
    side.rotation.z = Math.PI / 2;
    side.position.set(dx, 0.36, 0);
    g.add(side);
  }
  g.position.set(x, 0.11, z);
  root.add(g);
}

function addBench(root: THREE.Group, x: number, z: number, rot = 0) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x5d4028, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.58, metalness: 0.55 });
  const g = new THREE.Group();
  g.add(box(1.65, 0.12, 0.42, wood, 0, 0.48, 0));
  g.add(box(1.65, 0.55, 0.10, wood, 0, 0.78, -0.18));
  for (const dx of [-0.62, 0.62]) {
    g.add(box(0.08, 0.48, 0.08, metal, dx, 0.25, -0.10));
    g.add(box(0.08, 0.48, 0.08, metal, dx, 0.25, 0.10));
  }
  g.position.set(x, 0.10, z);
  g.rotation.y = rot;
  root.add(g);
}

function addTrashCan(root: THREE.Group, x: number, z: number) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x252b28, roughness: 0.86, metalness: 0.28 });
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.65, 12), mat);
  can.position.set(x, 0.43, z);
  root.add(can);
}

function addDumpster(root: THREE.Group, x: number, z: number, rot = 0) {
  const green = new THREE.MeshStandardMaterial({ color: 0x285c3b, roughness: 0.82, metalness: 0.18 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171b19, roughness: 0.88 });
  const g = new THREE.Group();
  g.add(box(1.65, 0.86, 0.92, green, 0, 0.49, 0));
  const lid = box(1.72, 0.10, 0.98, dark, 0, 0.98, 0);
  lid.rotation.z = -0.08;
  g.add(lid);
  for (const dx of [-0.62, 0.62]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.08, 8), dark);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(dx, 0.11, 0.42);
    g.add(wheel);
  }
  g.position.set(x, 0.08, z);
  g.rotation.y = rot;
  root.add(g);
}

function addBoat(root: THREE.Group, x: number, z: number, rot: number, color: number) {
  const hull = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.7 });
  const g = new THREE.Group();
  g.add(box(2.4, 0.28, 0.85, hull, 0, 0.18, 0));
  g.add(box(1.1, 0.42, 0.62, dark, -0.2, 0.48, 0));
  const cabin = box(0.55, 0.22, 0.4, hull, 0.7, 0.42, 0);
  g.add(cabin);
  g.position.set(x, 0.12, z);
  g.rotation.y = rot;
  root.add(g);
}

function addPier(root: THREE.Group, px: number, riverY: number, width: number) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a5138, roughness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.88 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x25292b, roughness: 0.44, metalness: 0.64 });
  const cx = wx(px + width / 2);
  const walkZ = wz(riverY) - 0.35;
  const length = wx(TILE * 2.55);
  const pierW = wx(width);
  root.add(box(pierW, 0.12, length, wood, cx, 0.18, walkZ + length / 2));
  for (let i = 0; i < 5; i++) {
    const z = walkZ + 0.35 + i * (length / 5);
    root.add(box(0.09, 0.85, 0.09, dark, cx - pierW / 2 + 0.08, 0.08, z));
    root.add(box(0.09, 0.85, 0.09, dark, cx + pierW / 2 - 0.08, 0.08, z));
  }
  root.add(box(0.06, 0.55, length * 0.92, rail, cx - pierW / 2, 0.62, walkZ + length / 2));
  root.add(box(0.06, 0.55, length * 0.92, rail, cx + pierW / 2, 0.62, walkZ + length / 2));
  addBench(root, cx, walkZ - 0.15, 0);
}

function buildEnvironment(scene: THREE.Scene) {
  scene.getObjectByName("memphis-environment-detail")?.removeFromParent();
  const root = new THREE.Group();
  root.name = "memphis-environment-detail";

  const river = RIVER();
  const riverCx = wx(river.x + river.w / 2);
  const riverCz = wz(river.y + river.h / 2);
  const riverW = wx(river.w);
  const riverD = wz(river.h);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x173d5c,
    roughness: 0.22,
    metalness: 0.28,
    emissive: 0x071c2d,
    emissiveIntensity: 0.5,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(riverW, riverD), waterMat);
  water.name = "mississippi-water";
  water.rotation.x = -Math.PI / 2;
  water.position.set(riverCx, 0.16, riverCz);
  water.receiveShadow = true;
  root.add(water);

  const foamMat = applyPolygonOffset(
    new THREE.MeshBasicMaterial({ color: 0x8ec5df, transparent: true, opacity: 0.22, depthWrite: false }),
    "overlay",
  );
  for (let i = 0; i < 18; i++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(riverW * (0.08 + (i % 4) * 0.04), 0.04), foamMat.clone());
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(
      riverCx - riverW * 0.46 + (i * 0.051) * riverW,
      0.175,
      riverCz - riverD * 0.42 + (i % 5) * riverD * 0.16,
    );
    root.add(strip);
  }

  const boardwalk = new THREE.MeshStandardMaterial({ color: 0x5d4936, roughness: 0.94 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x25292b, roughness: 0.44, metalness: 0.64 });
  const walkZ = wz(river.y) - 0.55;
  root.add(box(riverW + 1.2, 0.14, 1.55, boardwalk, riverCx, 0.14, walkZ));
  root.add(box(riverW + 0.6, 0.08, 0.08, rail, riverCx, 1.02, walkZ + 0.62));
  for (let x = riverCx - riverW / 2; x <= riverCx + riverW / 2; x += 1.55) {
    root.add(box(0.07, 1.0, 0.07, rail, x, 0.55, walkZ + 0.62));
  }
  for (let i = 0; i < 8; i++) {
    addBench(root, riverCx - riverW * 0.42 + i * (riverW * 0.11), walkZ - 0.22, 0);
    if (i % 2 === 0) addTrashCan(root, riverCx - riverW * 0.38 + i * (riverW * 0.11), walkZ - 0.28);
  }

  for (const pier of PIERS) addPier(root, pier.x, river.y, pier.w);

  addBoat(root, riverCx - 18, riverCz + 2.4, 0.2, 0xcfc8bf);
  addBoat(root, riverCx + 8, riverCz + 4.1, -0.4, 0x1e3a5f);
  addBoat(root, riverCx + 22, riverCz + 1.6, 0.55, 0x7f1d1d);

  const xStreets = STREETS.filter((s) => s.axis === "x");
  const yStreets = STREETS.filter((s) => s.axis === "y");
  for (let i = 0; i < Math.min(xStreets.length, yStreets.length) * 2; i++) {
    const xs = xStreets[i % xStreets.length]!;
    const ys = yStreets[(i * 2 + 1) % yStreets.length]!;
    const x = wx(xs.tile * TILE + (i % 2 === 0 ? 42 : -42));
    const z = wz(ys.tile * TILE + (i % 3 === 0 ? 43 : -43));
    addHydrant(root, x, z, i % 3 === 0 ? 0xd0a128 : 0xb82424);
    addTrashCan(root, x + 0.62, z + 0.18);
  }

  const hq = POIS.find((p) => p.id === "store")!;
  addDumpster(root, wx(hq.x + hq.w - 20), wz(hq.y - 14), Math.PI / 2);
  const culture = POIS.find((p) => p.id === "culture")!;
  addDumpster(root, wx(culture.x + culture.w + 18), wz(culture.y + 22), 0);

  const beale = POIS.find((p) => p.id === "beale")!;
  addBench(root, wx(beale.x + 70), wz(beale.y + beale.h + 16), Math.PI);
  addBench(root, wx(beale.x + beale.w - 70), wz(beale.y + beale.h + 16), Math.PI);

  scene.add(root);
}

export function installMemphisEnvironmentPass() {
  const proto = WorldLifePass.prototype as PatchedLife;
  if (proto.__memphisEnvironmentPatched) return;
  proto.__memphisEnvironmentPatched = true;

  const originalBuild = WorldLifePass.prototype.build;
  WorldLifePass.prototype.build = function environmentBuild(this: WorldLifePass) {
    originalBuild.call(this);
    const scene = (this as unknown as { scene: THREE.Scene }).scene;
    buildEnvironment(scene);
    const w = window as typeof window & { __SACK_ENVIRONMENT__?: Record<string, unknown> };
    w.__SACK_ENVIRONMENT__ = {
      river: true,
      riverRailing: true,
      curbProps: true,
      streetFurniture: true,
      piers: true,
    };
  };
}
