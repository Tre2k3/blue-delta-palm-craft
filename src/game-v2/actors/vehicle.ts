import * as THREE from "three";
import { buildCarBody, WHEEL_RADIUS, type CarBody } from "../../game/carBody";
import type { WrapPackName } from "../../game/vehicleWraps";
import type { Solid } from "../core/types";
import { clamp, damp, wrapAngle } from "../core/util";
import { groundHeightAt } from "../world/ground";

export type CarKind = "sedan" | "coupe" | "suv" | "van";

/** The body kit is authored in its own units, nose along +X. These bring it to metres, nose along +Z. */
const SX = 1.95;
const SY = 1.52;
const SZ = 1.9;

export const PAINTS = [0xb9bcc2, 0x1b1d21, 0x7a1f1f, 0x23406a, 0xe9e6de, 0x4a4d52, 0x8a6a2c, 0x2f5a3a, 0x5a2a6a];

/** Livery art is lit a little from within, so the logo still reads on a black car at night. */
function wrapMat(t: THREE.Texture) {
  return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

/** A car you can see: body, turning wheels, lamps. No behaviour. */
export class CarModel {
  readonly group = new THREE.Group();
  readonly body: CarBody;
  readonly length: number;
  readonly width: number;
  private spin = 0;

  /** `wrap` dresses the car in one of the SackReligious liveries: black paint, the logo down each side and on the hood. */
  constructor(
    readonly kind: CarKind,
    color: number,
    wrap: WrapPackName | null = null,
  ) {
    this.body = buildCarBody(kind, { color, pack: wrap });
    if (wrap) {
      const loader = new THREE.TextureLoader();
      const mats = new Map<string, THREE.Material>();
      this.body.hull.traverse((o) => {
        const face = o.userData.wrapFace as string | undefined;
        if (!(o instanceof THREE.Mesh) || !face) return;
        let m = mats.get(face);
        if (!m) {
          const t = loader.load(`/game/wraps/${wrap}/${face}.webp`);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          m = wrapMat(t);
          mats.set(face, m);
        }
        o.material = m;
      });
      if (kind === "coupe") {
        // The mark on the roof, the right way up for the camera that follows the car.
        const geo = new THREE.PlaneGeometry(0.56, 0.31);
        geo.rotateX(-Math.PI / 2);
        geo.rotateY(-Math.PI / 2);
        const uv = geo.attributes.uv!;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.2 + uv.getX(i) * 0.6, 0.25 + uv.getY(i) * 0.51);
        const t = loader.load(`/game/wraps/${wrap}/roof.webp`);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        const mat = wrapMat(t);
        const roof = new THREE.Mesh(geo, mat);
        roof.position.set(-0.265, 0.998, 0);
        this.body.hull.add(roof);
        // And the round mark on the tail, between the lamps: it is what you see most of the time you drive.
        const badge = new THREE.PlaneGeometry(0.2, 0.2);
        badge.rotateY(-Math.PI / 2);
        const buv = badge.attributes.uv!;
        for (let i = 0; i < buv.count; i++) buv.setXY(i, 0.34 + buv.getX(i) * 0.32, 0.27 + buv.getY(i) * 0.5);
        const tail = new THREE.Mesh(badge, mat);
        tail.position.set(-1.196, 0.5, 0);
        this.body.hull.add(tail);
      }
    }
    const inner = this.body.root;
    inner.rotation.y = -Math.PI / 2;
    inner.scale.set(SX, SY, SZ);
    this.group.add(inner);
    this.length = (kind === "van" ? 2.62 : kind === "suv" ? 2.48 : kind === "coupe" ? 2.32 : 2.38) * SX;
    this.width = (kind === "van" ? 1.14 : kind === "suv" ? 1.08 : 1) * SZ;
  }

  place(x: number, y: number, z: number, heading: number) {
    this.group.position.set(x, y, z);
    this.group.rotation.y = heading;
  }

  /** `travel` metres moved this frame along the heading; `steer` front wheel angle. */
  roll(travel: number, steer: number) {
    this.spin -= travel / (WHEEL_RADIUS * SX);
    this.body.wheels.forEach((w, i) => {
      if (w.userData.flipped === undefined) w.userData.flipped = Math.abs(w.rotation.y) > 1;
      const flipped = w.userData.flipped as boolean;
      w.rotation.set(0, (flipped ? Math.PI : 0) + (i < 2 ? -steer : 0), flipped ? -this.spin : this.spin, "YXZ");
    });
  }

  lamps(head: number, brake: number) {
    for (const m of this.body.headlights) m.emissiveIntensity = head;
    for (const m of this.body.brakes) m.emissiveIntensity = brake;
  }

  lean(roll: number, pitch: number) {
    this.body.hull.rotation.set(roll, 0, pitch);
  }
}

/** `slide` lets the handbrake break the tyres loose: the car keeps going the way it was while its nose comes round. */
export type DriveInput = { throttle: number; steer: number; handbrake: boolean; boost: boolean; slide?: boolean };

export type DriveTune = { top: number; accel: number; boostTop: number; grip: number };

export const STREET: DriveTune = { top: 27, accel: 13, boostTop: 27, grip: 7.5 };
export const RACE: DriveTune = { top: 37, accel: 17, boostTop: 47, grip: 8.5 };
export const KART: DriveTune = { top: 17, accel: 14, boostTop: 21, grip: 10 };

/**
 * Arcade car. Velocity and heading are separate, so the tail steps out when you turn hard
 * or pull the handbrake, and comes back when the tyres bite.
 */
export class Driver {
  x = 0;
  z = 0;
  y = 0;
  heading = 0;
  vx = 0;
  vz = 0;
  steer = 0;
  /** Sideways slip in m/s, for skid sound and smoke. */
  slip = 0;
  /** Speed lost in the last wall or car hit this frame. */
  hit = 0;
  radius = 1.25;

  get speed() {
    return Math.hypot(this.vx, this.vz);
  }

  get forward() {
    return this.vx * Math.sin(this.heading) + this.vz * Math.cos(this.heading);
  }

  reset(x: number, z: number, heading: number) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.vx = 0;
    this.vz = 0;
    this.steer = 0;
    this.slip = 0;
  }

  step(dt: number, input: DriveInput, tune: DriveTune, solids: Solid[], floorY: number | null = null) {
    this.hit = 0;
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    let fwd = this.vx * fx + this.vz * fz;
    let lat = this.vx * fz - this.vz * fx;

    const top = input.boost ? tune.boostTop : tune.top;
    if (input.throttle > 0) {
      const room = clamp(1 - fwd / top, 0, 1);
      fwd += tune.accel * (input.boost ? 1.5 : 1) * input.throttle * (0.35 + 0.65 * room) * dt;
      if (fwd > top) fwd -= (fwd - top) * damp(1.6, dt);
    } else if (input.throttle < 0) {
      if (fwd > 0.5) fwd -= 26 * dt;
      else fwd += tune.accel * 0.6 * input.throttle * dt;
      fwd = Math.max(fwd, -9);
    } else {
      fwd -= fwd * damp(0.55, dt);
      if (Math.abs(fwd) < 0.15) fwd = 0;
    }
    // With the power on, a slide scrubs speed slowly enough to be held round a corner.
    if (input.handbrake) fwd -= fwd * damp(input.slide && input.throttle > 0 ? 0.5 : 1.1, dt);

    // Steering authority falls with speed; none at a standstill.
    this.steer += (input.steer - this.steer) * damp(9, dt);
    const speed = Math.abs(fwd);
    const authority = clamp(speed / 5, 0, 1) * (2.5 - 1.5 * clamp(speed / tune.boostTop, 0, 1)) * (input.handbrake ? 1.35 : 1);
    this.heading = wrapAngle(this.heading - this.steer * authority * Math.sign(fwd || 1) * dt);

    const nfx = Math.sin(this.heading);
    const nfz = Math.cos(this.heading);
    if (input.slide && input.handbrake) {
      // A handbrake slide: what the car was doing is carried over as it was, and read again
      // against the way the nose now points. The part of it that is sideways is the drift.
      const wx = fx * fwd + fz * lat;
      const wz = fz * fwd - fx * lat;
      fwd = wx * nfx + wz * nfz;
      lat = wx * nfz - wz * nfx;
    }
    const grip = input.handbrake ? 1.6 : tune.grip;
    lat -= lat * damp(grip, dt);
    this.slip = Math.abs(lat);

    this.vx = nfx * fwd + nfz * lat;
    this.vz = nfz * fwd - nfx * lat;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.collide(solids);
    const ground = floorY ?? Math.max(groundHeightAt(this.x + nfx * 1.3, this.z + nfz * 1.3), groundHeightAt(this.x - nfx * 1.3, this.z - nfz * 1.3));
    this.y += (ground - this.y) * damp(14, dt);
  }

  /** Two circles, nose and tail, pushed out of every box. Lost speed is reported as `hit`. */
  private collide(solids: Solid[]) {
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    for (const off of [1.15, -1.15]) {
      let cx = this.x + fx * off;
      let cz = this.z + fz * off;
      for (const s of solids) {
        const px = clamp(cx, s.minX, s.maxX);
        const pz = clamp(cz, s.minZ, s.maxZ);
        let dx = cx - px;
        let dz = cz - pz;
        let d = Math.hypot(dx, dz);
        if (d >= this.radius) continue;
        if (d < 1e-4) {
          // Centre is inside the box: leave by the nearest face.
          const l = cx - s.minX;
          const r = s.maxX - cx;
          const b = cz - s.minZ;
          const f = s.maxZ - cz;
          const m = Math.min(l, r, b, f);
          dx = m === l ? -1 : m === r ? 1 : 0;
          dz = m === b ? -1 : m === f ? 1 : 0;
          d = -m;
        } else {
          dx /= d;
          dz /= d;
        }
        const push = this.radius - d;
        cx += dx * push;
        cz += dz * push;
        this.x += dx * push;
        this.z += dz * push;
        const into = this.vx * dx + this.vz * dz;
        if (into < 0) {
          this.vx -= dx * into * 1.25;
          this.vz -= dz * into * 1.25;
          this.hit = Math.max(this.hit, -into);
          const keep = 1 - Math.min(0.35, -into * 0.012);
          this.vx *= keep;
          this.vz *= keep;
        }
      }
    }
  }

  /** Circle bump against another car or a person. Returns the closing speed. */
  bump(ox: number, oz: number, radius: number) {
    const dx = this.x - ox;
    const dz = this.z - oz;
    const d = Math.hypot(dx, dz);
    const min = this.radius + radius;
    if (d >= min || d < 1e-4) return 0;
    const nx = dx / d;
    const nz = dz / d;
    this.x += nx * (min - d);
    this.z += nz * (min - d);
    const into = this.vx * nx + this.vz * nz;
    if (into < 0) {
      this.vx -= nx * into * 1.4;
      this.vz -= nz * into * 1.4;
      this.vx *= 0.82;
      this.vz *= 0.82;
      return -into;
    }
    return 0;
  }
}
