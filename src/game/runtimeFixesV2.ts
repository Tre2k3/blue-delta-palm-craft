/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import { NPCS, STREETS, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";
import {
  aheadDistance,
  circleHitsRect,
  laneVelocity,
  nearestLane,
  poiColliders,
  roadRects,
  sidewalkRects,
  type Lane,
} from "./worldTopology";

type Car = { x: number; y: number; vx: number; vy: number; w: number; color: string };
type Ped = { x: number; y: number; vx: number; vy: number; color: string; t: number };
type PedRig = THREE.Group & {
  userData: {
    leftArm?: THREE.Object3D;
    rightArm?: THREE.Object3D;
    leftLeg?: THREE.Object3D;
    rightLeg?: THREE.Object3D;
    [key: string]: unknown;
  };
};

const carState = new WeakMap<object, { lane: Lane; speed: number }>();
let installPromise: Promise<void> | null = null;

function installPrototypeFixes(GameEngine: any) {
  if (!GameEngine || GameEngine.prototype.__worldSafetyInstalledV2) return;
  const proto = GameEngine.prototype;
  proto.__worldSafetyInstalledV2 = true;

  proto.collides = function collides(x: number, y: number, r: number) {
    if (x - r < 28 || y - r < 28 || x + r > WORLD_PX_W - 28 || y + r > WORLD_PX_H - 28) return true;
    for (const wall of this.walls ?? []) if (circleHitsRect(x, y, r, wall)) return true;
    for (const box of poiColliders()) if (circleHitsRect(x, y, r, box)) return true;
    return false;
  };

  proto.updateTraffic = function updateTraffic(dt: number) {
    const cars: Car[] = this.cars ?? [];
    const peds: Ped[] = this.peds ?? [];
    const player = { x: this.px, y: this.py };
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i]!;
      let state = carState.get(c);
      if (!state) {
        const axis = Math.abs(c.vx) >= Math.abs(c.vy) ? "x" : "y";
        const lane = nearestLane(c.x, c.y, axis);
        state = { lane, speed: Math.max(42, Math.hypot(c.vx, c.vy) || lane.speed) };
        carState.set(c, state);
      }
      const lane = state.lane;
      if (lane.axis === "x") c.y += (lane.fixed - c.y) * Math.min(1, dt * 8);
      else c.x += (lane.fixed - c.x) * Math.min(1, dt * 8);
      let nearest = aheadDistance(c, player);
      for (let j = 0; j < cars.length; j++) if (i !== j) nearest = Math.min(nearest, aheadDistance(c, cars[j]!));
      for (const p of peds) nearest = Math.min(nearest, aheadDistance(c, p));
      const speed = Math.max(1, Math.hypot(c.vx, c.vy));
      const fx = c.vx / speed;
      const fy = c.vy / speed;
      const blockedByBuilding = poiColliders().some((box) => circleHitsRect(c.x + fx * 88, c.y + fy * 88, 14, box));
      const stopDistance = 52;
      const slowDistance = 170;
      let desired = blockedByBuilding ? 0 : lane.speed;
      if (nearest < stopDistance) desired = 0;
      else if (nearest < slowDistance) desired = Math.min(desired, lane.speed * ((nearest - stopDistance) / (slowDistance - stopDistance)));
      state.speed += (desired - state.speed) * Math.min(1, dt * (desired < state.speed ? 8 : 2));
      const vv = laneVelocity(lane, state.speed / Math.max(1, lane.speed));
      c.vx = vv.vx;
      c.vy = vv.vy;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (lane.axis === "x") {
        if (lane.dir > 0 && c.x > lane.max + 64) c.x = lane.min - 64;
        if (lane.dir < 0 && c.x < lane.min - 64) c.x = lane.max + 64;
      } else {
        if (lane.dir > 0 && c.y > lane.max + 64) c.y = lane.min - 64;
        if (lane.dir < 0 && c.y < lane.min - 64) c.y = lane.max + 64;
      }
    }
  };

  proto.updatePeds = function updatePeds(dt: number) {
    const peds: Ped[] = this.peds ?? [];
    for (const p of peds) {
      p.t += dt;
      const ox = p.x;
      const oy = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const hitBuilding = poiColliders().some((box) => circleHitsRect(p.x, p.y, 12, box));
      if (hitBuilding || p.x < 48 || p.x > WORLD_PX_W - 48) {
        p.x = ox;
        p.vx *= -1;
      }
      if (hitBuilding || p.y < 48 || p.y > WORLD_PX_H - 48) {
        p.y = oy;
        p.vy *= -1;
      }
      const dx = p.x - this.px;
      const dy = p.y - this.py;
      const d = Math.hypot(dx, dy);
      if (d > 0.001 && d < 38) {
        p.x += (dx / d) * (38 - d) * 0.2;
        p.y += (dy / d) * (38 - d) * 0.2;
      }
    }
    for (const n of this.npcLive ?? []) {
      const def = NPCS.find((x) => x.id === n.id);
      if (!def?.wander) continue;
      n.t += dt;
      n.x = n.ox + Math.sin(n.t * 0.35) * 28;
      n.y = n.oy + Math.cos(n.t * 0.28) * 18;
    }
  };
}

function surfaceMaterial(tex: THREE.Texture | undefined, repeatX: number, repeatY: number, roughness = 0.9, color = 0xffffff) {
  const map = tex?.clone();
  if (map) {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY));
    map.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({ map, color, roughness, metalness: 0.02 });
}

function makeStreetPerson(index: number): PedRig {
  const skinTones = [0x6f3f28, 0x8c5235, 0xa86b48, 0x593524, 0x7b4932, 0x9d6546, 0x4e2f22];
  const shirts = [0x1b6b3a, 0x171717, 0x243b5a, 0x81492c, 0x59406f, 0x4f5a31, 0x8a6b28];
  const pants = [0x22262c, 0x1c2330, 0x39434d, 0x2a2928, 0x243445, 0x303438, 0x2e3439];
  const shoes = [0xe8e4db, 0x151515, 0xc9b072, 0xededed, 0x151515, 0xddd8ce, 0x111111];
  const skin = new THREE.MeshStandardMaterial({ color: skinTones[index % skinTones.length], roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color: shirts[index % shirts.length], roughness: 0.72 });
  const pant = new THREE.MeshStandardMaterial({ color: pants[index % pants.length], roughness: 0.8 });
  const shoe = new THREE.MeshStandardMaterial({ color: shoes[index % shoes.length], roughness: 0.65 });
  const hair = new THREE.MeshStandardMaterial({ color: index % 5 === 2 ? 0x4b2e1f : 0x151311, roughness: 0.92 });
  const g = new THREE.Group() as PedRig;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.48, 4, 8), shirt);
  torso.position.y = 0.94; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skin);
  head.position.y = 1.48; head.castShadow = true; g.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.185, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), hair);
  hairCap.position.y = 1.55; hairCap.castShadow = true; g.add(hairCap);
  const makeLimb = (mat: THREE.Material, radius: number, length: number) => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, length, 7), mat);
    mesh.position.y = -length / 2; mesh.castShadow = true; pivot.add(mesh); return pivot;
  };
  const leftArm = makeLimb(skin, 0.055, 0.48); leftArm.position.set(-0.24, 1.15, 0); leftArm.rotation.z = 0.12; g.add(leftArm);
  const rightArm = makeLimb(skin, 0.055, 0.48); rightArm.position.set(0.24, 1.15, 0); rightArm.rotation.z = -0.12; g.add(rightArm);
  const leftLeg = makeLimb(pant, 0.075, 0.55); leftLeg.position.set(-0.1, 0.7, 0); g.add(leftLeg);
  const rightLeg = makeLimb(pant, 0.075, 0.55); rightLeg.position.set(0.1, 0.7, 0); g.add(rightLeg);
  for (const x of [-0.1, 0.1]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.28), shoe);
    s.position.set(x, 0.1, 0.05); s.castShadow = true; g.add(s);
  }
  if (index % 3 === 1) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.33, 0.12), new THREE.MeshStandardMaterial({ color: 0x1b1a18, roughness: 0.7 }));
    bag.position.set(0.23, 0.82, -0.14); g.add(bag);
  }
  if (index % 4 === 0) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 12), new THREE.MeshStandardMaterial({ color: 0xe7e3d9, roughness: 0.6 }));
    cap.position.y = 1.65; g.add(cap);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.27, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; g.add(shadow);
  g.userData.leftArm = leftArm; g.userData.rightArm = rightArm; g.userData.leftLeg = leftLeg; g.userData.rightLeg = rightLeg;
  return g;
}

function makeTrafficVehicle(world: any, index: number) {
  const g = new THREE.Group();
  const variant = index % 4;
  const dims = [
    { length: 2.15, width: 0.9, height: 0.48, cabin: 0.82, y: 0.44 },
    { length: 2.35, width: 0.98, height: 0.62, cabin: 1.0, y: 0.52 },
    { length: 2.6, width: 1.0, height: 0.82, cabin: 1.45, y: 0.6 },
    { length: 2.35, width: 0.94, height: 0.42, cabin: 0.72, y: 0.4 },
  ][variant]!;
  const body = new THREE.Mesh(new THREE.BoxGeometry(dims.length, dims.height, dims.width), surfaceMaterial(world.mats?.carMetal, 1.4, 1, 0.34, 0xffffff));
  body.position.y = dims.y; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(dims.cabin, dims.height * 0.72, dims.width * 0.86), new THREE.MeshStandardMaterial({ color: 0x17222b, roughness: 0.16, metalness: 0.32 }));
  cabin.position.set(variant === 2 ? -0.2 : -0.12, dims.y + dims.height * 0.55, 0); cabin.castShadow = true; g.add(cabin);
  if (variant === 2) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(dims.length + 0.02, 0.13, dims.width + 0.015), new THREE.MeshStandardMaterial({ color: 0x166534, emissive: 0x0f3d24, emissiveIntensity: 0.25, roughness: 0.55 }));
    stripe.position.y = dims.y + 0.12; g.add(stripe);
  }
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: variant === 3 ? 0xb08a38 : 0x6b7075, metalness: 0.72, roughness: 0.3 });
  const axle = dims.length * 0.34;
  for (const x of [-axle, axle]) for (const z of [-dims.width * 0.5, dims.width * 0.5]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.16, 16), tireMat);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(x, 0.25, z); wheel.castShadow = true; g.add(wheel);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.17, 14), rimMat);
    rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.25, z); g.add(rim);
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff0c7, emissive: 0xffd86b, emissiveIntensity: 1 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3328, emissive: 0xb1110c, emissiveIntensity: 0.8 });
  for (const z of [-dims.width * 0.3, dims.width * 0.3]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.15), headMat); h.position.set(dims.length / 2 + 0.02, dims.y, z); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.13), tailMat); t.position.set(-dims.length / 2 - 0.02, dims.y, z); g.add(t);
  }
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.72, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.27, depthWrite: false }));
  sh.scale.x = 1.6; sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; g.add(sh);
  return g;
}

function installWorldVisualFixes(World3D: any) {
  if (!World3D || World3D.prototype.__worldVisualFixInstalledV2) return;
  const proto = World3D.prototype;
  proto.__worldVisualFixInstalledV2 = true;

  proto.buildGround = function buildGround() {
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_PX_W / 16 + 20, WORLD_PX_H / 16 + 20), surfaceMaterial(this.mats?.concrete, 34, 26, 0.96, 0x615548));
    lot.rotation.x = -Math.PI / 2; lot.position.set(WORLD_PX_W / 32, -0.05, WORLD_PX_H / 32); lot.receiveShadow = true; this.scene.add(lot);
    for (const r of roadRects()) {
      const rw = r.w / 16, rd = r.h / 16;
      const road = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.045, rd), surfaceMaterial(this.mats?.asphalt, rw / 2.8, rd / 2.8, 0.96, 0xbdb8b1));
      road.position.set((r.x + r.w / 2) / 16, 0.012, (r.y + r.h / 2) / 16); road.receiveShadow = true; this.scene.add(road);
    }
    for (const r of sidewalkRects()) {
      const rw = r.w / 16, rd = r.h / 16;
      const walk = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.11, rd), surfaceMaterial(this.mats?.sidewalk, rw / 2.2, rd / 2.2, 0.92, 0xe0d8cb));
      walk.position.set((r.x + r.w / 2) / 16, 0.075, (r.y + r.h / 2) / 16); walk.receiveShadow = true; this.scene.add(walk);
    }
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x8d8273, roughness: 0.91 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xd3c186, roughness: 0.87 });
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xded8ce, roughness: 0.9 });
    for (const st of STREETS) {
      const center = st.tile * TILE;
      if (st.axis === "y") {
        for (const y of [center - TILE * 0.98, center + TILE * 0.98]) {
          const curb = new THREE.Mesh(new THREE.BoxGeometry(WORLD_PX_W / 16, 0.14, 0.1), curbMat); curb.position.set(WORLD_PX_W / 32, 0.105, y / 16); this.scene.add(curb);
        }
        for (let x = TILE; x < WORLD_PX_W; x += TILE * 2.15) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry((TILE * 0.78) / 16, 0.012, 0.055), lineMat); dash.position.set(x / 16, 0.052, center / 16); this.scene.add(dash);
        }
      } else {
        for (const x of [center - TILE * 0.98, center + TILE * 0.98]) {
          const curb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, WORLD_PX_H / 16), curbMat); curb.position.set(x / 16, 0.105, WORLD_PX_H / 32); this.scene.add(curb);
        }
        for (let y = TILE; y < WORLD_PX_H; y += TILE * 2.15) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, (TILE * 0.78) / 16), lineMat); dash.position.set(center / 16, 0.052, y / 16); this.scene.add(dash);
        }
      }
    }
    const horizontal = STREETS.filter((s) => s.axis === "y");
    const vertical = STREETS.filter((s) => s.axis === "x");
    for (const h of horizontal) for (const v of vertical) {
      const cx = (v.tile * TILE) / 16, cz = (h.tile * TILE) / 16;
      for (let i = -3; i <= 3; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.013, 0.085), crossMat); bar.position.set(cx + i * 0.48, 0.053, cz + 1.12); this.scene.add(bar);
      }
    }
  };

  proto.ensurePeds = function ensurePeds(n: number) {
    while (this.peds.length < n) {
      const g = makeStreetPerson(this.peds.length); this.scene.add(g); this.peds.push(g);
    }
  };

  proto.ensureCars = function ensureCars(n: number) {
    while (this.cars.length < n) {
      const g = makeTrafficVehicle(this, this.cars.length); this.scene.add(g); this.cars.push(g);
    }
  };

  const originalSync = proto.sync;
  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const desiredCam = new THREE.Vector3();

  proto.sync = function syncWithWorldFixes(frame: any) {
    originalSync.call(this, frame);
    for (let i = 0; i < this.cars.length; i++) {
      const c = frame.cars[i];
      const g = this.cars[i] as THREE.Group;
      if (!c || !g) continue;
      const speed = Math.hypot(c.vx, c.vy);
      if (speed > 0.01) g.rotation.y = Math.atan2(-c.vy, c.vx);
      const body = g.children[0] as THREE.Mesh;
      const mat = body?.material as THREE.MeshStandardMaterial | undefined;
      if (mat?.color) mat.color.set(c.color);
    }
    for (let i = 0; i < this.peds.length; i++) {
      const p = frame.peds[i];
      const g = this.peds[i] as PedRig;
      if (!p || !g) continue;
      const phase = Math.sin((p.t ?? frame.clock) * 7.5 + i * 0.7) * 0.45;
      if (g.userData.leftArm) g.userData.leftArm.rotation.x = phase;
      if (g.userData.rightArm) g.userData.rightArm.rotation.x = -phase;
      if (g.userData.leftLeg) g.userData.leftLeg.rotation.x = -phase * 0.75;
      if (g.userData.rightLeg) g.userData.rightLeg.rotation.x = phase * 0.75;
      const vx = p.vx ?? 0, vy = p.vy ?? 0;
      if (Math.hypot(vx, vy) > 0.05) g.rotation.y = Math.atan2(-vy, vx) - Math.PI / 2;
    }
    if (frame.cameraView === "third" && frame.mode !== "basketball") {
      origin.set(this.player.position.x, 1.25, this.player.position.z);
      desiredCam.copy(this.camera.position);
      dir.copy(desiredCam).sub(origin);
      const distance = dir.length();
      if (distance > 1.3) {
        dir.normalize(); raycaster.set(origin, dir); raycaster.far = distance;
        const hits = raycaster.intersectObjects(this.scene.children, true).filter((hit: THREE.Intersection) => {
          const obj = hit.object;
          let node: THREE.Object3D | null = obj;
          while (node) {
            if (node === this.player) return false;
            if (this.cars.includes(node as THREE.Group)) return false;
            if (this.peds.includes(node as THREE.Group)) return false;
            node = node.parent;
          }
          return obj.visible && !(obj instanceof THREE.Sprite) && hit.distance > 0.35;
        });
        const first = hits[0];
        if (first && first.distance < distance - 0.2) {
          const safe = Math.max(0.85, first.distance - 0.25);
          this.camera.position.copy(origin).addScaledVector(dir, safe);
          this.camera.lookAt(this.player.position.x, 1.2, this.player.position.z);
        }
      }
    }
  };
}

export function ensureWorldRuntimeFixes() {
  if (installPromise) return installPromise;
  installPromise = Promise.all([import("./engine"), import("./world3d")])
    .then(([{ GameEngine }, { World3D }]) => {
      installPrototypeFixes(GameEngine);
      installWorldVisualFixes(World3D);
    })
    .catch((err) => console.error("Unable to install world runtime fixes", err));
  return installPromise;
}

void ensureWorldRuntimeFixes();
