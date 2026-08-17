import * as THREE from "three";
import { WorldLifePass } from "./worldLifePass";
import type { WorldFrame } from "./world3dCore";

type PatchedLife = WorldLifePass & { __vehicleVisualPatched?: boolean };
type VehicleRig = {
  root: THREE.Group;
  brakeLeft: THREE.MeshStandardMaterial;
  brakeRight: THREE.MeshStandardMaterial;
};

const CAR_COLORS = [0x274b73, 0x151515, 0xd8d6cf, 0x873737, 0x5a4a31, 0x174d33, 0x50555c, 0x6b345f];

function makeWheel() {
  const tire = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.96 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x969696, roughness: 0.4, metalness: 0.66 });
  const root = new THREE.Group();
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.17, 12), tire);
  wheel.rotation.x = Math.PI / 2;
  root.add(wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.178, 10), rim);
  hub.rotation.x = Math.PI / 2;
  root.add(hub);
  return root;
}

function makeVehicleRig(index: number): VehicleRig {
  const root = new THREE.Group();
  root.name = "world-life-3d-vehicle";
  const paint = new THREE.MeshStandardMaterial({
    color: CAR_COLORS[index % CAR_COLORS.length],
    roughness: 0.38,
    metalness: 0.48,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.72, metalness: 0.18 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x172934, roughness: 0.16, metalness: 0.22 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb7b7b7, roughness: 0.3, metalness: 0.72 });
  const headlight = new THREE.MeshStandardMaterial({ color: 0xf0e8c9, emissive: 0xffdf9a, emissiveIntensity: 0.85, roughness: 0.28 });
  const brakeLeft = new THREE.MeshStandardMaterial({ color: 0x4a0a0a, emissive: 0xff2020, emissiveIntensity: 0.3, roughness: 0.34 });
  const brakeRight = brakeLeft.clone();

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.46, 0.98), paint);
  body.position.y = 0.45;
  body.castShadow = true;
  root.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.9), paint);
  hood.position.set(0.87, 0.70, 0);
  root.add(hood);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.17, 0.9), paint);
  trunk.position.set(-0.93, 0.69, 0);
  root.add(trunk);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.43, 0.84), glass);
  cabin.position.set(-0.08, 0.82, 0);
  root.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.09, 0.76), paint);
  roof.position.set(-0.12, 1.055, 0);
  root.add(roof);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.84), chrome);
  frontBumper.position.set(1.17, 0.37, 0);
  root.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.x = -1.17;
  root.add(rearBumper);

  for (const z of [-0.34, 0.34]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.17, 0.22), headlight);
    lamp.position.set(1.225, 0.53, z);
    root.add(lamp);
  }
  for (const [z, mat] of [[-0.34, brakeLeft], [0.34, brakeRight]] as const) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.17, 0.22), mat);
    lamp.position.set(-1.225, 0.53, z);
    root.add(lamp);
  }

  for (const [x, z] of [[0.70, 0.50], [0.70, -0.50], [-0.70, 0.50], [-0.70, -0.50]] as const) {
    const wheel = makeWheel();
    wheel.position.set(x, 0.25, z);
    root.add(wheel);
  }

  // Slight model variation keeps a lane of cars from reading as clones.
  if (index % 3 === 1) root.scale.set(1.08, 0.93, 1.0);
  if (index % 3 === 2) root.scale.set(0.95, 1.07, 0.96);
  return { root, brakeLeft, brakeRight };
}

function installRig(group: THREE.Group, index: number): VehicleRig {
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    const material = child.material;
    if (material instanceof THREE.MeshBasicMaterial && material.map) child.visible = false;
  }
  const rig = makeVehicleRig(index);
  group.add(rig.root);
  group.userData.vehicleRig = rig;
  return rig;
}

function yawForVelocity(vx: number, vy: number) {
  // Vehicle body is modeled with local +X as its nose. Game Y maps to world Z.
  return Math.atan2(-vy, vx);
}

export function installVehicleVisualPass() {
  const proto = WorldLifePass.prototype as PatchedLife;
  if (proto.__vehicleVisualPatched) return;
  proto.__vehicleVisualPatched = true;

  const originalPostSync = WorldLifePass.prototype.postSync;
  WorldLifePass.prototype.postSync = function vehicleVisualPostSync(
    this: WorldLifePass,
    frame: WorldFrame,
    carGroups: THREE.Group[],
    npcSprites: Map<string, THREE.Sprite>,
  ) {
    originalPostSync.call(this, frame, carGroups, npcSprites);
    const dt = Math.min(frame.dt || 1 / 60, 0.05);
    const ease = 1 - Math.exp(-11 * dt);

    for (let i = 0; i < carGroups.length; i++) {
      const group = carGroups[i];
      const car = frame.cars[i];
      if (!group || !car || !group.visible) continue;
      const rig = (group.userData.vehicleRig as VehicleRig | undefined) ?? installRig(group, i);
      const target = yawForVelocity(car.vx, car.vy);
      const previous = typeof group.userData.gameYaw === "number" ? group.userData.gameYaw : target;
      const delta = Math.atan2(Math.sin(target - previous), Math.cos(target - previous));
      const yaw = previous + delta * ease;
      group.userData.gameYaw = yaw;
      group.rotation.y = yaw;

      const speed = Math.hypot(car.vx, car.vy);
      const braking = speed < 24;
      rig.brakeLeft.emissiveIntensity = braking ? 3.2 : 0.28;
      rig.brakeRight.emissiveIntensity = braking ? 3.2 : 0.28;
      rig.root.rotation.z = Math.sin(frame.clock * 6.8 + i * 0.7) * Math.min(speed / 90, 1) * 0.004;
    }

    const w = window as typeof window & { __SACK_TRAFFIC__?: Record<string, unknown> };
    if (w.__SACK_TRAFFIC__) {
      w.__SACK_TRAFFIC__.vehicle3D = true;
      w.__SACK_TRAFFIC__.vehicleRigCount = carGroups.filter((group) => !!group.userData.vehicleRig).length;
    }
  };
}
