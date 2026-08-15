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
      const probeX = c.x + fx * 82;
      const probeY = c.y + fy * 82;
      const blockedByBuilding = poiColliders().some((box) => circleHitsRect(probeX, probeY, 13, box));

      const stopDistance = 46;
      const slowDistance = 158;
      let desired = blockedByBuilding ? 0 : lane.speed;
      if (nearest < stopDistance) desired = 0;
      else if (nearest < slowDistance) {
        desired = Math.min(desired, lane.speed * ((nearest - stopDistance) / (slowDistance - stopDistance)));
      }

      state.speed += (desired - state.speed) * Math.min(1, dt * (desired < state.speed ? 7.5 : 2.2));
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
        p.x += (dx / d) * (34 - d) * 0.18;
        p.y += (dy / d) * (34 - d) * 0.18;
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

function surfaceMaterial(
  tex: THREE.Texture | undefined,
  repeatX: number,
  repeatY: number,
  roughness = 0.9,
  color = 0xffffff,
) {
  const map = tex?.clone();
  if (map) {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY));
    map.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({ map, color, roughness, metalness: 0.02 });
}

function cleanCharacterCrop(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 192;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, sx, sy, sw, sh, 6, 4, 116, 184);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  const cornerIndexes = [
    0,
    (canvas.width - 1) * 4,
    ((canvas.height - 1) * canvas.width) * 4,
    ((canvas.height - 1) * canvas.width + canvas.width - 1) * 4,
  ];
  let br = 0, bg = 0, bb = 0;
  for (const idx of cornerIndexes) {
    br += data[idx];
    bg += data[idx + 1];
    bb += data[idx + 2];
  }
  br /= 4; bg /= 4; bb /= 4;

  const solid = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < canvas.width * canvas.height; i++) {
    const j = i * 4;
    const dr = data[j] - br;
    const dg = data[j + 1] - bg;
    const db = data[j + 2] - bb;
    const d = Math.sqrt(dr * dr + dg * dg + db * db);
    if (d < 46 || data[j + 3] < 12) {
      data[j + 3] = 0;
    } else {
      solid[i] = 1;
    }
  }

  // Keep the largest connected foreground island. This removes labels/captions
  // from the design sheet and leaves the character itself.
  const seen = new Uint8Array(solid.length);
  let best: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < solid.length; start++) {
    if (!solid[start] || seen[start]) continue;
    const comp: number[] = [];
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const idx = stack.pop()!;
      comp.push(idx);
      const x = idx % canvas.width;
      const y = Math.floor(idx / canvas.width);
      const neighbors = [idx - 1, idx + 1, idx - canvas.width, idx + canvas.width];
      for (const next of neighbors) {
        if (next < 0 || next >= solid.length || seen[next] || !solid[next]) continue;
        const nx = next % canvas.width;
        const ny = Math.floor(next / canvas.width);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }
    if (comp.length > best.length) best = comp;
  }

  if (best.length > 24) {
    const keep = new Uint8Array(solid.length);
    for (const idx of best) keep[idx] = 1;
    for (let i = 0; i < keep.length; i++) if (!keep[i]) data[i * 4 + 3] = 0;
  }

  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function installWorldVisualFixes(World3D: any) {
  if (!World3D || World3D.prototype.__worldVisualFixInstalled) return;
  const proto = World3D.prototype;
  proto.__worldVisualFixInstalled = true;

  proto.buildGround = function buildGround() {
    // City lots are concrete/packed ground. Asphalt exists only where streets do.
    const lot = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_PX_W / 16 + 20, WORLD_PX_H / 16 + 20),
      surfaceMaterial(this.mats?.concrete, 34, 26, 0.96, 0x5b5044),
    );
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(WORLD_PX_W / 32, -0.05, WORLD_PX_H / 32);
    lot.receiveShadow = true;
    this.scene.add(lot);

    for (const r of roadRects()) {
      const rw = r.w / 16;
      const rd = r.h / 16;
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(rw, 0.045, rd),
        surfaceMaterial(this.mats?.asphalt, rw / 2.6, rd / 2.6, 0.95, 0xddd8d0),
      );
      road.position.set((r.x + r.w / 2) / 16, 0.012, (r.y + r.h / 2) / 16);
      road.receiveShadow = true;
      this.scene.add(road);
    }

    for (const r of sidewalkRects()) {
      const rw = r.w / 16;
      const rd = r.h / 16;
      const walk = new THREE.Mesh(
        new THREE.BoxGeometry(rw, 0.11, rd),
        surfaceMaterial(this.mats?.sidewalk, rw / 2.1, rd / 2.1, 0.91, 0xe4ddd2),
      );
      walk.position.set((r.x + r.w / 2) / 16, 0.075, (r.y + r.h / 2) / 16);
      walk.receiveShadow = true;
      this.scene.add(walk);
    }

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x8e8374, roughness: 0.9 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xd5c594, roughness: 0.86 });
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xdfd9ce, roughness: 0.9 });

    for (const st of STREETS) {
      const center = st.tile * TILE;
      if (st.axis === "y") {
        for (const y of [center - TILE * 0.98, center + TILE * 0.98]) {
          const curb = new THREE.Mesh(new THREE.BoxGeometry(WORLD_PX_W / 16, 0.14, 0.1), curbMat);
          curb.position.set(WORLD_PX_W / 32, 0.105, y / 16);
          this.scene.add(curb);
        }
        for (let x = TILE; x < WORLD_PX_W; x += TILE * 2.15) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry((TILE * 0.78) / 16, 0.012, 0.055), lineMat);
          dash.position.set(x / 16, 0.052, center / 16);
          this.scene.add(dash);
        }
      } else {
        for (const x of [center - TILE * 0.98, center + TILE * 0.98]) {
          const curb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, WORLD_PX_H / 16), curbMat);
          curb.position.set(x / 16, 0.105, WORLD_PX_H / 32);
          this.scene.add(curb);
        }
        for (let y = TILE; y < WORLD_PX_H; y += TILE * 2.15) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, (TILE * 0.78) / 16), lineMat);
          dash.position.set(center / 16, 0.052, y / 16);
          this.scene.add(dash);
        }
      }
    }

    const horizontal = STREETS.filter((s) => s.axis === "y");
    const vertical = STREETS.filter((s) => s.axis === "x");
    for (const h of horizontal) for (const v of vertical) {
      const cx = (v.tile * TILE) / 16;
      const cz = (h.tile * TILE) / 16;
      for (let i = -3; i <= 3; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.013, 0.085), crossMat);
        bar.position.set(cx + i * 0.48, 0.053, cz + 1.12);
        this.scene.add(bar);
      }
    }
  };

  let atlas: THREE.Texture | null = null;
  let atlasLoading = false;
  const cropSpecs = [
    [25, 350, 46, 105],
    [318, 350, 45, 105],
    [600, 350, 45, 105],
    [910, 350, 42, 105],
    [30, 680, 44, 110],
    [318, 680, 45, 110],
    [905, 680, 43, 110],
  ];

  const applyAtlasToPeds = (world: any) => {
    if (!atlas?.image) return;
    for (let i = 0; i < world.peds.length; i++) {
      const group = world.peds[i] as THREE.Group;
      const sprite = group.children[0] as THREE.Sprite;
      if (!(sprite instanceof THREE.Sprite)) continue;
      const [x, y, w, h] = cropSpecs[i % cropSpecs.length]!;
      const map = cleanCharacterCrop(atlas.image as CanvasImageSource, x, y, w, h);
      const mat = sprite.material as THREE.SpriteMaterial;
      if (mat.map && mat.map !== map) mat.map.dispose();
      mat.map = map;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }
  };

  proto.ensurePeds = function ensurePeds(n: number) {
    while (this.peds.length < n) {
      const g = new THREE.Group();
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, depthWrite: false }),
      );
      sprite.scale.set(0.9, 1.58, 1);
      sprite.position.y = 0.8;
      g.add(sprite);
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.23, 14),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
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
          atlasLoading = false;
          applyAtlasToPeds(this);
        },
        undefined,
        () => { atlasLoading = false; },
      );
    } else if (atlas) {
      const missing = (this.peds as THREE.Group[]).some((g) => {
        const first = g.children[0];
        return first instanceof THREE.Sprite && !(first.material as THREE.SpriteMaterial).map;
      });
      if (missing) applyAtlasToPeds(this);
    }
  };

  const originalSync = proto.sync;
  proto.sync = function syncWithCorrectedVehicleHeading(frame: any) {
    originalSync.call(this, frame);

    // Current car geometry is built with local +X as its nose/forward axis.
    // Rotate that +X axis into the actual velocity vector.
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