import * as THREE from "three";
import { WorldLifePass } from "./worldLifePass";
import type { WorldFrame } from "./world3dCore";
import { bootVehicleWraps } from "./vehicleWraps";
import { bindStreetCar, makeStreetCar, CAR_RIDE, type StreetCarRig } from "./carRig";
import { nightAmount } from "./dayCycle";
import { inCourtPx } from "./worldTopology";

type PatchedLife = WorldLifePass & { __vehicleVisualPatched?: boolean };

function yawForVelocity(vx: number, vy: number) {
  return Math.atan2(-vy, vx);
}

function installRig(group: THREE.Group, index: number): StreetCarRig {
  for (const child of [...group.children]) {
    if (child instanceof THREE.Mesh) child.visible = false;
  }
  const rig = makeStreetCar(index, false);
  group.add(rig.root);
  group.userData.vehicleRig = rig;
  return rig;
}

export function installVehicleVisualPass() {
  const proto = WorldLifePass.prototype as PatchedLife;
  if (proto.__vehicleVisualPatched) return;
  proto.__vehicleVisualPatched = true;
  bootVehicleWraps();

  const originalPostSync = WorldLifePass.prototype.postSync;
  WorldLifePass.prototype.postSync = function vehicleVisualPostSync(
    this: WorldLifePass,
    frame: WorldFrame,
    carGroups: THREE.Group[],
    npcSprites: Map<string, THREE.Mesh>,
  ) {
    originalPostSync.call(this, frame, carGroups, npcSprites);
    const dt = Math.min(frame.dt || 1 / 60, 0.05);
    const ease = 1 - Math.exp(-11 * dt);
    const night = nightAmount(frame.worldHour ?? 13);

    for (let i = 0; i < carGroups.length; i++) {
      const group = carGroups[i];
      const car = frame.cars[i];
      if (!group || !car || !group.visible) continue;
      if (inCourtPx(car.x, car.y)) {
        group.visible = false;
        continue;
      }
      const rig = (group.userData.vehicleRig as StreetCarRig | undefined) ?? installRig(group, i);
      if (rig.pack && !rig.hull.userData.wrapBound) bindStreetCar(rig);
      group.position.y = CAR_RIDE;
      const driven = frame.driving && frame.vehicleKind === "car" && Math.hypot(car.x - frame.px, car.y - frame.py) < 28;
      const speed = Math.hypot(car.vx, car.vy);
      const prevSpeed = typeof group.userData.prevSpeed === "number" ? group.userData.prevSpeed : speed;
      const accel = (speed - prevSpeed) / Math.max(dt, 0.001);
      group.userData.prevSpeed = speed;
      const braking = !!car.braking || accel < -28 || speed < 8;

      if (driven) {
        group.rotation.y = frame.yaw + Math.PI / 2;
        group.userData.gameYaw = group.rotation.y;
        group.visible = frame.cameraView !== "first";
        rig.root.position.y = 0;
        rig.root.rotation.x = 0;
        rig.root.rotation.z = 0;
      } else {
        const target = typeof car.yaw === "number" && Number.isFinite(car.yaw) ? car.yaw : yawForVelocity(car.vx, car.vy);
        const previous = typeof group.userData.gameYaw === "number" ? group.userData.gameYaw : target;
        const delta = Math.atan2(Math.sin(target - previous), Math.cos(target - previous));
        const yaw = previous + delta * (speed < 10 ? Math.min(1, ease * 0.35) : ease);
        group.userData.gameYaw = yaw;
        group.rotation.y = yaw;
        const spin = (speed / 16) * dt / 0.26;
        for (const wheel of rig.wheels) wheel.rotation.z -= spin;
        const bounce = Math.sin(frame.clock * (7.2 + speed * 0.04) + i) * Math.min(speed / 90, 1) * 0.008;
        rig.root.position.y = bounce;
        rig.root.rotation.x = THREE.MathUtils.clamp(-accel * 0.0002, -0.02, 0.025);
        rig.root.rotation.z = THREE.MathUtils.clamp(delta * 0.12, -0.03, 0.03);
      }

      const head = car.parked ? night * 0.35 : 0.22 + night * 2.6;
      for (const mat of rig.headlights) mat.emissiveIntensity = head;
      for (const mat of rig.brakes) mat.emissiveIntensity = braking ? 2.4 : 0.18;
      const turning = !!car.turnTo || (Math.abs((group.userData.gameYaw ?? 0) - (car.yaw ?? 0)) > 0.22 && speed > 16);
      const blinkOn = turning && (frame.clock * 2.2) % 1 > 0.5;
      for (const mat of rig.blinkers) mat.emissiveIntensity = blinkOn ? 1.8 : 0.05;
    }

    const w = window as typeof window & { __SACK_TRAFFIC__?: Record<string, unknown> };
    if (w.__SACK_TRAFFIC__) {
      w.__SACK_TRAFFIC__.vehicle3D = true;
      w.__SACK_TRAFFIC__.vehicleWrapped = true;
      w.__SACK_TRAFFIC__.civilianSkins = carGroups.filter((g) => (g.userData.vehicleRig as StreetCarRig | undefined)?.civilian).length;
      w.__SACK_TRAFFIC__.vehicleRigCount = carGroups.filter((group) => !!group.userData.vehicleRig).length;
    }
  };
}
