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

const carState = new WeakMap<object, { lane: Lane; speed: number }>();
let installPromise: Promise<void> | null = null;

function installPrototypeFixes(GameEngine: any) {
  if (!GameEngine || GameEngine.prototype.__worldSafetyInstalled) return;
  const proto = GameEngine.prototype;
  proto.__worldSafetyInstalled = true;

  proto.collides = function collides(x: number, y: number, r: number) {
    if (x - r < 28 || y - r < 28 || x + r > WORLD_PX_W - 28 || y + r > WORLD_PX_H - 28) return true;
    for (const wall of this.walls ?? []) {
      if (circleHitsRect(x, y, r, wall)) return true;
    }
    for (const box of poiColliders()) {
      if (circleHitsRect(x, y, r, box)) return true;
    }
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
      for (let j = 0; j < cars.length; j++) {
        if (i === j) continue;
        nearest = Math.min(nearest, aheadDistance(c, cars[j]!));
      }
      for (const p of peds) nearest = Math.min(nearest, aheadDistance(c, p));

      const speed = Math.max(1, Math.hypot(c.vx, c.vy));
      const fx = c.vx / speed;
      const fy = c.vy / speed;
      const probeX = c.x + fx * 78;
      const probeY = c.y + fy * 78;
      const blockedByBuilding = poiColliders().some((box) => circleHitsRect(probeX, probeY, 14, box));

      const stopDistance = 44;
      const slowDistance = 150;
      let desired = blockedByBuilding ? 0 : lane.speed;
      if (nearest < stopDistance) desired = 0;
      else if (nearest < slowDistance) desired = Math.min(desired, lane.speed * ((nearest - stopDistance) / (slowDistance - stopDistance)));

      state.speed += (desired - state.speed) * Math.min(1, dt * (desired < state.speed ? 7 : 2.2));
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

      const hitBuilding = poiColliders().some((box) => circleHitsRect(p.x, p.y, 10, box));
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
      if (d > 0.001 && d < 34) {
        p.x += (dx / d) * (34 - d) * 0.16;
        p.y += (dy / d) * (34 - d) * 0.16;
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

function texturedMaterial(tex: THREE.Texture | undefined, roughness = 0.9, color = 0xffffff) {
  const map = tex?.clone();
  if (map) {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({ map, color, roughness, metalness: 0.02 });
}

function installWorldVisualFixes(World3D: any) {
  if (!World3D || World3D.prototype.__worldVisualFixInstalled) return;
  const proto = World3D.prototype;
  proto.__worldVisualFixInstalled = true;

  proto.buildGround = function buildGround() {
    const lot = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_PX_W / 16 + 20, WORLD_PX_H / 16 + 20),
      texturedMaterial(this.mats?.concrete, 0.96, 0x4a4238),
    );
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(WORLD_PX_W / 32, -0.04, WORLD_PX_H / 32);
    lot.receiveShadow = true;
    this.scene.add(lot);

    const roadMat = texturedMaterial(this.mats?.asphalt, 0.96, 0xffffff);
    const walkMat = texturedMaterial(this.mats?.sidewalk, 0.92, 0xffffff);
    const curbMat = texturedMaterial(this.mats?.concrete, 0.88, 0x756b5e);
    const stripeMat = texturedMaterial(this.mats?.stripe, 0.86, 0xffffff);

    for (const r of roadRects()) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(r.w / 16, 0.055, r.h / 16), roadMat);
      road.position.set((r.x + r.w / 2) / 16, 0.02, (r.y + r.h / 2) / 16);
      road.receiveShadow = true;
      this.scene.add(road);
    }

    for (const r of sidewalkRects()) {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(r.w / 16, 0.12, r.h / 16), walkMat);
      walk.position.set((r.x + r.w / 2) / 16, 0.08, (r.y + r.h / 2) / 16);
      walk.receiveShadow = true;
      this.scene.add(walk);
    }

    for (const st of STREETS) {
      const center = st.tile * TILE;
      if (st.axis === "y") {
        for (const y of [center - TILE * 0.98, center + TILE * 0.98]) {
          const curb = new THREE.Mesh(new THREE.BoxGeometry(WORLD_PX_W / 16, 0.15, 0.1), curbMat);
          curb.position.set(WORLD_PX_W / 32, 0.11, y / 16);
          this.scene.add(curb);
        }
        for (let x = TILE; x < WORLD_PX_W; x += TILE * 2.2) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry((TILE * 0.88) / 16, 0.016, 0.055), stripeMat);
          dash.position.set(x / 16, 0.072, center / 16);
          this.scene.add(dash);
        }
      } else {
        for (const x of [center - TILE * 0.98, center + TILE * 0.98]) {
          const curb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, WORLD_PX_H / 16), curbMat);
          curb.position.set(x / 16, 0.11, WORLD_PX_H / 32);
          this.scene.add(curb);
        }
        for (let y = TILE; y < WORLD_PX_H; y += TILE * 2.2) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.016, (TILE * 0.88) / 16), stripeMat);
          dash.position.set(center / 16, 0.072, y / 16);
          this.scene.add(dash);
        }
      }
    }
  };

  let atlas: THREE.Texture | null = null;
  let atlasLoading = false;
  const cropSpecs = [
    [25, 350, 46, 105], [318, 350, 45, 105], [600, 350, 45, 105], [910, 350, 42, 105],
    [30, 680, 44, 110], [318, 680, 45, 110], [905, 680, 43, 110],
  ];

  const applyAtlasToPeds = (world: any) => {
    if (!atlas?.image) return;
    const img = atlas.image as HTMLImageElement;
    const iw = img.width || 1536;
    const ih = img.height || 1024;
    for (let i = 0; i < world.peds.length; i++) {
      const group = world.peds[i] as THREE.Group;
      const sprite = group.children[0] as THREE.Sprite;
      if (!(sprite instanceof THREE.Sprite)) continue;
      const [x, y, w, h] = cropSpecs[i % cropSpecs.length]!;
      const map = atlas.clone();
      map.repeat.set(w / iw, h / ih);
      map.offset.set(x / iw, 1 - (y + h) / ih);
      map.needsUpdate = true;
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.map = map;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }
  };

  proto.ensurePeds = function ensurePeds(n: number) {
    while (this.peds.length < n) {
      const g = new THREE.Group();
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
      sprite.scale.set(0.92, 1.62, 1);
      sprite.position.y = 0.82;
      g.add(sprite);
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.24, 14),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24, depthWrite: false }),
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.01;
      g.add(sh);
      this.scene.add(g);
      this.peds.push(g);
    }
    if (!atlas && !atlasLoading) {
      atlasLoading = true;
      new THREE.TextureLoader().load(
        "/game/characters/07_memphis_street_NPC_character_map.png",
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          atlas = t;
          applyAtlasToPeds(this);
        },
        undefined,
        () => { atlasLoading = false; },
      );
    }
    applyAtlasToPeds(this);
  };

  const originalSync = proto.sync;
  proto.sync = function syncWithCorrectedVehicleHeading(frame: any) {
    originalSync.call(this, frame);
    for (let i = 0; i < this.cars.length; i++) {
      const c = frame.cars[i];
      const g = this.cars[i];
      if (!c || !g) continue;
      if (Math.abs(c.vx) >= Math.abs(c.vy)) g.rotation.y = c.vx >= 0 ? 0 : Math.PI;
      else g.rotation.y = c.vy >= 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    for (const g of this.peds as THREE.Group[]) {
      const first = g.children[0];
      if (first instanceof THREE.Sprite) (first.material as THREE.SpriteMaterial).color.set(0xffffff);
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
