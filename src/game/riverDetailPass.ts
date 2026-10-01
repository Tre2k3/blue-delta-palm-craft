import * as THREE from "three";
import { halloweenOn } from "./season";
import { WorldLifePass } from "./worldLifePass";
import type { WorldFrame } from "./world3dCore";

function riverMaterial(width: number, depth: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  const wash = g.createLinearGradient(0, 0, 0, 256);
  if (halloweenOn()) {
    wash.addColorStop(0, "#ffb15a");
    wash.addColorStop(0.08, "#6a3058");
    wash.addColorStop(0.3, "#2a1838");
    wash.addColorStop(0.62, "#140818");
    wash.addColorStop(1, "#07040a");
  } else {
    wash.addColorStop(0, "#d5eee6");
    wash.addColorStop(0.08, "#3e9d98");
    wash.addColorStop(0.28, "#1c6d86");
    wash.addColorStop(0.62, "#0d3e5c");
    wash.addColorStop(1, "#07141f");
  }
  g.fillStyle = wash;
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "rgba(190, 230, 226, 0.35)";
  g.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    g.ellipse(40 + (i * 97) % 480, 70 + (i % 5) * 28, 36 + (i % 4) * 18, 7, 0.2, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = "rgba(236, 246, 242, 0.72)";
  for (let i = 0; i < 48; i++) {
    g.fillRect((i * 23) % 512, 6 + (i % 4) * 3, 16 + (i % 3) * 6, 3);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.repeat.set(Math.max(2, width / 18), 1);
  map.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.42,
    emissive: halloweenOn() ? 0x3a1428 : 0x082433,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
  });
}

function upgradeRiver(scene: THREE.Scene) {
  if (scene.getObjectByName("river-shore-detail")) return;
  const old = scene.getObjectByName("mississippi-water") as THREE.Mesh | undefined;
  if (!old || !(old.geometry instanceof THREE.PlaneGeometry)) return;
  const width = old.geometry.parameters.width;
  const height = old.geometry.parameters.height;
  const next = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), riverMaterial(width, height));
  next.name = "mississippi-water";
  next.position.copy(old.position);
  next.rotation.copy(old.rotation);
  next.position.y = 0.24;
  next.renderOrder = 2;
  next.frustumCulled = false;
  old.parent?.add(next);
  old.removeFromParent();
  old.geometry.dispose();
  const oldMat = old.material as THREE.Material;
  oldMat.dispose();

  const root = new THREE.Group();
  root.name = "river-shore-detail";
  const north = next.position.z - height * 0.5;
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x8d7352, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(next.position.x, 0.05, north - 0.55);
  sand.receiveShadow = true;
  root.add(sand);

  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5, metalness: 0.6 });
  const bulb = new THREE.MeshBasicMaterial({ color: 0xffe3a6 });
  for (let i = 0; i < 12; i++) {
    const x = next.position.x - width * 0.46 + (i / 11) * width * 0.92;
    const z = north - 1.15;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 2.5, 6), dark);
    pole.position.set(x, 1.25, z);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bulb);
    head.position.set(x, 2.52, z);
    root.add(pole, head);
  }

  const reedMat = new THREE.MeshStandardMaterial({ color: halloweenOn() ? 0x6a3a28 : 0x2f5c34, roughness: 0.92 });
  const reedGeo = new THREE.ConeGeometry(0.045, 0.72, 4);
  const count = 48;
  const reeds = new THREE.InstancedMesh(reedGeo, reedMat, count);
  reeds.name = "river-reeds";
  const dummy = new THREE.Object3D();
  const bases: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = next.position.x - width * 0.46 + ((i + 0.4) / count) * width * 0.92;
    const z = north + 0.22 + ((i * 13) % 6) * 0.05;
    const h = 0.75 + (i % 5) * 0.08;
    dummy.position.set(x, 0.22 * h, z);
    dummy.scale.set(1, h, 1);
    dummy.rotation.set(0, 0, ((i % 5) - 2) * 0.06);
    dummy.updateMatrix();
    reeds.setMatrixAt(i, dummy.matrix);
    bases.push(x, z, h);
  }
  reeds.userData.bases = bases;
  root.add(reeds);
  scene.add(root);
}

function tickRiver(scene: THREE.Scene, time: number) {
  const water = scene.getObjectByName("mississippi-water") as THREE.Mesh | undefined;
  const mat = water?.material as THREE.MeshStandardMaterial | undefined;
  if (mat?.map) mat.map.offset.x = (time * 0.015) % 1;
  const reeds = scene.getObjectByName("river-reeds") as THREE.InstancedMesh | undefined;
  const bases = reeds?.userData.bases as number[] | undefined;
  if (reeds && bases) {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < reeds.count; i++) {
      const x = bases[i * 3]!;
      const z = bases[i * 3 + 1]!;
      const h = bases[i * 3 + 2]!;
      dummy.position.set(x, 0.22 * h, z);
      dummy.scale.set(1, h, 1);
      dummy.rotation.set(Math.sin(time * 1.4 + i * 0.7) * 0.1, 0, ((i % 5) - 2) * 0.06);
      dummy.updateMatrix();
      reeds.setMatrixAt(i, dummy.matrix);
    }
    reeds.instanceMatrix.needsUpdate = true;
  }
  scene.getObjectByName("memphis-environment-detail")?.traverse((obj) => {
    const phase = obj.userData.boat as number | undefined;
    const baseY = obj.userData.baseY as number | undefined;
    if (phase == null || baseY == null) return;
    obj.position.y = baseY + Math.sin(time * 0.85 + phase) * 0.055;
    obj.rotation.z = Math.sin(time * 0.6 + phase) * 0.025;
  });
}

type Patched = WorldLifePass & { __riverDetail?: boolean };

export function installRiverDetailPass() {
  const proto = WorldLifePass.prototype as Patched;
  if (proto.__riverDetail) return;
  proto.__riverDetail = true;

  const originalBuild = WorldLifePass.prototype.build;
  WorldLifePass.prototype.build = function riverDetailBuild(this: WorldLifePass) {
    originalBuild.call(this);
    upgradeRiver((this as unknown as { scene: THREE.Scene }).scene);
  };

  const originalPost = WorldLifePass.prototype.postSync;
  WorldLifePass.prototype.postSync = function riverDetailPost(
    this: WorldLifePass,
    frame: WorldFrame,
    cars: THREE.Group[],
    sprites: Map<string, THREE.Object3D>,
  ) {
    originalPost.call(this, frame, cars, sprites);
    tickRiver((this as unknown as { scene: THREE.Scene }).scene, frame.clock);
  };
}
