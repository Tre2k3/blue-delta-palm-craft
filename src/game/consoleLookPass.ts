import * as THREE from "three";
import { TILE, WORLD_PX_W } from "./data";
import { WorldLifePass } from "./worldLifePass";
import { World3D } from "./world3d";
import { wx, wz, type WorldFrame } from "./world3dCore";

const INSET = 72;

function buildLawns(scene: THREE.Scene) {
  if (scene.getObjectByName("console-lawns")) return;
  const root = new THREE.Group();
  root.name = "console-lawns";
  const greens = [0x2d6a34, 0x3a7a3c, 0x245832, 0x34743a];
  const xs = [0, 16 * TILE, 34 * TILE, 50 * TILE, WORLD_PX_W];
  const ys = [0, 6 * TILE, 20 * TILE, 34 * TILE, 41 * TILE];
  let n = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i]! + (i === 0 ? 20 : INSET);
      const x1 = xs[i + 1]! - (i === xs.length - 2 ? 20 : INSET);
      const y0 = ys[j]! + (j === 0 ? 20 : INSET);
      const y1 = ys[j + 1]! - INSET;
      if (x1 - x0 < 48 || y1 - y0 < 48) continue;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(wx(x1 - x0), wz(y1 - y0)),
        new THREE.MeshStandardMaterial({ color: greens[n % greens.length]!, roughness: 0.96, metalness: 0 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(wx((x0 + x1) / 2), 0.028, wz((y0 + y1) / 2));
      mesh.receiveShadow = true;
      root.add(mesh);
      n++;
    }
  }
  scene.add(root);
}

function ensureLights(scene: THREE.Scene) {
  if (scene.getObjectByName("console-fill")) return;
  const fill = new THREE.DirectionalLight(0xffe0a8, 0.42);
  fill.name = "console-fill";
  fill.position.set(22, 28, -8);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x8ec4ff, 0.28);
  rim.name = "console-rim";
  rim.position.set(-16, 18, 24);
  scene.add(rim);
}

function ensureArch(scene: THREE.Scene) {
  const existing = scene.getObjectByName("console-gate");
  if (existing) return existing as THREE.Group;
  const arch = new THREE.Group();
  arch.name = "console-gate";
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x141210,
    roughness: 0.48,
    metalness: 0.42,
    emissive: 0xc9a84c,
    emissiveIntensity: 0.4,
  });
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0xf4e27c,
    roughness: 0.32,
    metalness: 0.24,
    emissive: 0xffd56a,
    emissiveIntensity: 0.9,
  });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), postMat);
  left.position.set(-2.4, 1.6, 0);
  const right = left.clone();
  right.position.x = 2.4;
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.18, 0.18), beamMat);
  top.position.y = 3.22;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 2.7),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
  );
  glow.position.y = 1.7;
  arch.add(left, right, top, glow);
  arch.visible = false;
  scene.add(arch);
  return arch;
}

function ensureStreaks(scene: THREE.Scene) {
  const existing = scene.getObjectByName("console-streaks");
  if (existing) return existing as THREE.Group;
  const group = new THREE.Group();
  group.name = "console-streaks";
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.07, 1),
      new THREE.MeshBasicMaterial({
        color: 0xfff6e0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    group.add(mesh);
  }
  group.visible = false;
  scene.add(group);
  return group;
}

function paintRace(scene: THREE.Scene, f: WorldFrame) {
  const arch = ensureArch(scene);
  const next = f.raceGates?.find((gate) => gate.next);
  if (next && f.raceLook?.live) {
    arch.visible = true;
    arch.position.set(wx(next.x), 0, wz(next.y));
    arch.rotation.y = f.yaw;
    const glow = arch.children[3] as THREE.Mesh | undefined;
    const mat = glow?.material as THREE.MeshBasicMaterial | undefined;
    if (mat) mat.opacity = 0.1 + Math.sin(f.clock * 6) * 0.05;
  } else {
    arch.visible = false;
  }

  const streaks = ensureStreaks(scene);
  const live = !!f.raceLook?.live && f.raceLook.phase === "green" && f.raceLook.mph > 18 && !f.indoor;
  streaks.visible = live;
  if (!live || !f.raceLook) return;
  const fx = -Math.sin(f.yaw);
  const fz = -Math.cos(f.yaw);
  const rx = Math.cos(f.yaw);
  const rz = -Math.sin(f.yaw);
  const ox = wx(f.px);
  const oz = wz(f.py);
  const boost = f.raceLook.boosting ? 1 : 0;
  streaks.children.forEach((child, i) => {
    const mesh = child as THREE.Mesh;
    const side = (i % 2 === 0 ? -1 : 1) * (1.2 + (i % 3) * 0.38);
    const back = 1.5 + (i % 6) * 0.58;
    mesh.position.set(ox - fx * back + rx * side, 0.5 + (i % 4) * 0.2, oz - fz * back + rz * side);
    mesh.scale.set(1, 1.15 + f.raceLook!.mph / 42 + boost * 0.8, 1);
    mesh.lookAt(ox, mesh.position.y, oz);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.16 + boost * 0.38;
    mat.color.setHex(boost ? 0xffd56a : 0xfff6e0);
  });
}

export function installConsoleLookPass() {
  const life = WorldLifePass.prototype as WorldLifePass & { __consoleLawns?: boolean };
  if (!life.__consoleLawns) {
    life.__consoleLawns = true;
    const originalBuild = WorldLifePass.prototype.build;
    WorldLifePass.prototype.build = function consoleLawns(this: WorldLifePass) {
      originalBuild.call(this);
      const scene = (this as unknown as { scene: THREE.Scene }).scene;
      buildLawns(scene);
      ensureLights(scene);
    };
  }

  const proto = World3D.prototype as World3D & { __consoleLook?: boolean };
  if (proto.__consoleLook) return;
  proto.__consoleLook = true;
  const originalSync = World3D.prototype.sync;
  World3D.prototype.sync = function consoleSync(this: World3D, frame: WorldFrame) {
    originalSync.call(this, frame);
    ensureLights(this.scene);
    paintRace(this.scene, frame);
  };
}
