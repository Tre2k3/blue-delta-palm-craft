import * as THREE from "three";
import { POIS, STREETS, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";
import { laneVelocity, trafficLanes, type Lane } from "./worldTopology";
import { wx, wz, type WorldFrame } from "./world3dCore";

type LiveCar = WorldFrame["cars"][number] & { laneId?: string };
type LivePed = WorldFrame["peds"][number] & { vx?: number; vy?: number };
type TrafficMemory = { turnCount: number; cooldownUntil: number };
type PedMemory = {
  nextDecision: number;
  pauseUntil: number;
  resumeVx: number;
  resumeVy: number;
  pauseCount: number;
};
type SignalState = "red" | "yellow" | "green";
type SignalVisual = {
  axis: "x" | "y";
  ix: number;
  iy: number;
  red: THREE.MeshStandardMaterial;
  yellow: THREE.MeshStandardMaterial;
  green: THREE.MeshStandardMaterial;
};

const COURT = POIS.find((p) => p.id === "court")!;
const VERTICAL_STREET_CENTERS = STREETS.filter((s) => s.axis === "x").map((s) => s.tile * TILE);
const HORIZONTAL_STREET_CENTERS = STREETS.filter((s) => s.axis === "y").map((s) => s.tile * TILE);

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

function pseudo(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function nearest(value: number, values: number[]) {
  let best = values[0] ?? value;
  let bestD = Math.abs(value - best);
  for (const candidate of values) {
    const d = Math.abs(value - candidate);
    if (d < bestD) {
      bestD = d;
      best = candidate;
    }
  }
  return best;
}

function lerpAngle(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

/**
 * World-life layer for the Memphis map.
 *
 * The gameplay engine remains authoritative for collision and movement. This
 * director makes that simulation read like a city: authored road surfaces,
 * signals, crosswalks, route-aware traffic, varied pedestrians, parked cars,
 * landmark wayfinding and a populated Sackrow court.
 */
export class WorldLifePass {
  private scene: THREE.Scene;
  private root: THREE.Group | null = null;
  private lanes = trafficLanes();
  private laneMap = new Map(this.lanes.map((lane) => [lane.id, lane]));
  private trafficMemory = new WeakMap<object, TrafficMemory>();
  private pedMemory = new WeakMap<object, PedMemory>();
  private signals: SignalVisual[] = [];
  private totalTurns = 0;
  private pedestrianPauses = 0;
  private courtCrowd: THREE.Group | null = null;
  private markerCount = 0;
  private parkedCars = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build() {
    this.root?.removeFromParent();
    this.root = new THREE.Group();
    this.root.name = "memphis-world-life";
    this.signals = [];
    this.markerCount = 0;
    this.parkedCars = 0;

    this.buildRoadSurfaces(this.root);
    this.buildIntersections(this.root);
    this.buildLandmarkMarkers(this.root);
    this.buildParkedCars(this.root);
    this.buildCourtGameDay(this.root);
    this.buildBealeNeon(this.root);
    this.scene.add(this.root);
  }

  private buildRoadSurfaces(root: THREE.Group) {
    const road = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.98, metalness: 0.01 });
    const curb = new THREE.MeshStandardMaterial({ color: 0x76736d, roughness: 0.94 });
    const laneWhite = new THREE.MeshStandardMaterial({ color: 0xe5e1d7, roughness: 0.9 });
    const laneGold = new THREE.MeshStandardMaterial({ color: 0xd6aa2d, roughness: 0.86 });
    const roadWidth = wx(TILE * 1.72);
    const walkWidth = wx(TILE * 0.30);
    const worldW = wx(WORLD_PX_W);
    const worldH = wz(WORLD_PX_H);

    for (const street of STREETS) {
      if (street.axis === "y") {
        const z = wz(street.tile * TILE);
        root.add(box(worldW, 0.035, roadWidth, road, worldW / 2, 0.075, z));
        root.add(box(worldW, 0.09, walkWidth, curb, worldW / 2, 0.10, z - roadWidth / 2 - walkWidth / 2));
        root.add(box(worldW, 0.09, walkWidth, curb, worldW / 2, 0.10, z + roadWidth / 2 + walkWidth / 2));
        root.add(box(worldW, 0.018, 0.08, laneWhite, worldW / 2, 0.105, z - roadWidth * 0.37));
        root.add(box(worldW, 0.018, 0.08, laneWhite, worldW / 2, 0.105, z + roadWidth * 0.37));
        for (let x = 2.0; x < worldW - 1; x += 5.7) root.add(box(2.4, 0.022, 0.09, laneGold, x, 0.11, z));
      } else {
        const x = wx(street.tile * TILE);
        root.add(box(roadWidth, 0.035, worldH, road, x, 0.075, worldH / 2));
        root.add(box(walkWidth, 0.09, worldH, curb, x - roadWidth / 2 - walkWidth / 2, 0.10, worldH / 2));
        root.add(box(walkWidth, 0.09, worldH, curb, x + roadWidth / 2 + walkWidth / 2, 0.10, worldH / 2));
        root.add(box(0.08, 0.018, worldH, laneWhite, x - roadWidth * 0.37, 0.105, worldH / 2));
        root.add(box(0.08, 0.018, worldH, laneWhite, x + roadWidth * 0.37, 0.105, worldH / 2));
        for (let z = 2.0; z < worldH - 1; z += 5.7) root.add(box(0.09, 0.022, 2.4, laneGold, x, 0.11, z));
      }
    }
  }

  private buildIntersections(root: THREE.Group) {
    const stripe = new THREE.MeshStandardMaterial({ color: 0xf0ede5, roughness: 0.9 });
    const pole = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.4, metalness: 0.62 });
    const signalCase = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.62, metalness: 0.2 });
    const roadWidth = wx(TILE * 1.72);
    const stop = wx(TILE * 0.92);

    for (const vx0 of VERTICAL_STREET_CENTERS) {
      for (const hy0 of HORIZONTAL_STREET_CENTERS) {
        const cx = wx(vx0);
        const cz = wz(hy0);
        for (let i = -3; i <= 3; i++) {
          root.add(box(0.16, 0.02, roadWidth, stripe, cx - stop + i * 0.34, 0.13, cz));
          root.add(box(roadWidth, 0.02, 0.16, stripe, cx, 0.13, cz - stop + i * 0.34));
        }
        root.add(box(0.12, 0.025, roadWidth * 0.9, stripe, cx - stop - 0.45, 0.135, cz));
        root.add(box(roadWidth * 0.9, 0.025, 0.12, stripe, cx, 0.135, cz - stop - 0.45));
        this.addSignalHead(root, pole, signalCase, "x", vx0, hy0, cx + stop, cz - stop);
        this.addSignalHead(root, pole, signalCase, "y", vx0, hy0, cx - stop, cz + stop);
      }
    }
  }

  private addSignalHead(
    root: THREE.Group,
    poleMat: THREE.Material,
    caseMat: THREE.Material,
    axis: "x" | "y",
    ix: number,
    iy: number,
    x: number,
    z: number,
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.55, 8), poleMat);
    pole.position.y = 1.275;
    group.add(pole);
    group.add(box(0.34, 0.9, 0.22, caseMat, 0, 2.34, 0));

    const red = new THREE.MeshStandardMaterial({ color: 0x4a1111, emissive: 0xff2525, emissiveIntensity: 0.08 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0x4a3b0b, emissive: 0xffc928, emissiveIntensity: 0.05 });
    const green = new THREE.MeshStandardMaterial({ color: 0x0b3d22, emissive: 0x24e57b, emissiveIntensity: 0.05 });
    for (const [mat, y] of [[red, 2.61], [yellow, 2.34], [green, 2.07]] as const) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), mat);
      lamp.position.set(0, y, 0.12);
      group.add(lamp);
    }
    if (axis === "x") group.rotation.y = Math.PI / 2;
    root.add(group);
    this.signals.push({ axis, ix, iy, red, yellow, green });
  }

  private makeTextSprite(text: string, accent: string, width = 512, height = 128) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(8,10,9,0.9)";
    ctx.fillRect(10, 18, width - 20, height - 36);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(13, 21, width - 26, height - 42);
    ctx.fillStyle = accent;
    ctx.fillRect(28, height - 36, width - 56, 5);
    ctx.fillStyle = "#f4f0e7";
    ctx.font = "800 42px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2, width - 62);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5.8, 1.45, 1);
    sprite.renderOrder = 4;
    return sprite;
  }

  private buildLandmarkMarkers(root: THREE.Group) {
    const defs: { id: string; text: string; accent: string; y: number }[] = [
      { id: "apartment", text: "BENJI'S APARTMENT", accent: "#1db954", y: 5.2 },
      { id: "store", text: "$ACKRELIGIOUS HQ", accent: "#d4af37", y: 6.7 },
      { id: "court", text: "901 COURT", accent: "#1db954", y: 4.2 },
      { id: "dropvan", text: "DROP VAN", accent: "#d4af37", y: 3.5 },
      { id: "beale", text: "BEALE STREET", accent: "#e85d4c", y: 6.4 },
      { id: "pyramid", text: "THE PYRAMID", accent: "#d4af37", y: 15.0 },
      { id: "river", text: "MISSISSIPPI RIVER", accent: "#4f9ddf", y: 4.8 },
    ];
    for (const def of defs) {
      const poi = POIS.find((p) => p.id === def.id);
      if (!poi) continue;
      const marker = this.makeTextSprite(def.text, def.accent);
      marker.position.set(wx(poi.x + poi.w / 2), def.y, wz(poi.y + poi.h / 2));
      root.add(marker);
      this.markerCount++;
    }
  }

  private makeParkedCar(color: number) {
    const root = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.32 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x17232a, roughness: 0.18, metalness: 0.25 });
    const tire = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.96 });
    root.add(box(2.25, 0.48, 1.0, bodyMat, 0, 0.42, 0));
    root.add(box(1.15, 0.42, 0.86, glass, -0.1, 0.79, 0));
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10);
    for (const [x, z] of [[0.72, 0.5], [0.72, -0.5], [-0.72, 0.5], [-0.72, -0.5]] as const) {
      const wheel = new THREE.Mesh(wheelGeo, tire);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.24, z);
      root.add(wheel);
    }
    return root;
  }

  private buildParkedCars(root: THREE.Group) {
    const colors = [0x111111, 0x30557a, 0x742d2d, 0x6c604b, 0x174d33, 0xe0ddd5];
    const placements: [number, number, number][] = [
      [15.0, 5.0, 0], [24.0, 6.8, Math.PI], [44.0, 20.9, 0], [53.0, 19.1, Math.PI],
      [33.4, 13.0, Math.PI / 2], [34.7, 25.0, -Math.PI / 2], [15.2, 35.2, 0], [51.0, 33.1, Math.PI],
      [27.0, 20.8, 0], [18.0, 19.2, Math.PI], [49.4, 7.0, Math.PI / 2], [16.6, 29.0, -Math.PI / 2],
    ];
    for (let i = 0; i < placements.length; i++) {
      const [tx, ty, rot] = placements[i]!;
      const car = this.makeParkedCar(colors[i % colors.length]!);
      car.position.set(wx(tx * TILE), 0.02, wz(ty * TILE));
      car.rotation.y = rot;
      root.add(car);
      this.parkedCars++;
    }
  }

  private buildCourtGameDay(root: THREE.Group) {
    const cx = wx(COURT.x + COURT.w / 2);
    const cz = wz(COURT.y + COURT.h / 2);
    const cw = wx(COURT.w);
    const cd = wz(COURT.h);
    const black = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.78 });
    const green = new THREE.MeshStandardMaterial({ color: 0x08713f, roughness: 0.68, emissive: 0x062d1c, emissiveIntensity: 0.24 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.52, metalness: 0.22 });

    const outer = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.13, 8, 32), gold);
    outer.rotation.x = Math.PI / 2;
    outer.position.set(cx, 0.17, cz);
    root.add(outer);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.08, 8, 32), green);
    inner.rotation.x = Math.PI / 2;
    inner.position.set(cx, 0.18, cz);
    root.add(inner);

    for (const side of [-1, 1]) {
      const bx = cx + side * (cw / 2 + 1.35);
      root.add(box(1.65, 0.35, cd * 0.7, black, bx, 0.22, cz));
      root.add(box(1.35, 0.32, cd * 0.62, green, bx + side * 0.35, 0.55, cz));
      root.add(box(1.05, 0.28, cd * 0.54, gold, bx + side * 0.62, 0.84, cz));
    }

    const sign = this.makeTextSprite("SACKROW BALLERS", "#d4af37");
    sign.scale.set(7.2, 1.8, 1);
    sign.position.set(cx, 5.4, cz - cd / 2 - 1.3);
    root.add(sign);
    this.markerCount++;
    root.add(box(5.2, 0.22, 0.24, black, cx, 3.65, cz - cd / 2 - 1.22));
    root.add(box(2.4, 0.12, 0.28, green, cx, 3.34, cz - cd / 2 - 1.18));
    root.add(box(1.4, 0.10, 0.30, gold, cx, 3.08, cz - cd / 2 - 1.16));
  }

  private buildBealeNeon(root: THREE.Group) {
    const beale = POIS.find((p) => p.id === "beale");
    if (!beale) return;
    const colors = [0x1db954, 0xe85d4c, 0x4f9ddf, 0xd4af37, 0xb14ddf, 0x30c6c2];
    for (let i = 0; i < 10; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        emissive: colors[i % colors.length],
        emissiveIntensity: 1.45,
        roughness: 0.38,
      });
      const x = wx(beale.x + 22 + i * ((beale.w - 44) / 9));
      const z = wz(beale.y + (i % 2 === 0 ? 18 : beale.h - 18));
      root.add(box(1.1 + (i % 3) * 0.25, 0.42, 0.08, material, x, 2.8 + (i % 2) * 0.45, z));
    }
  }

  private signalOffset(ix: number, iy: number) {
    const sx = nearest(ix, VERTICAL_STREET_CENTERS);
    const sy = nearest(iy, HORIZONTAL_STREET_CENTERS);
    return ((Math.floor(sx / TILE) * 0.37 + Math.floor(sy / TILE) * 0.19) % 1.7 + 1.7) % 1.7;
  }

  private signalState(clock: number, axis: "x" | "y", ix: number, iy: number): SignalState {
    const p = (clock + this.signalOffset(ix, iy)) % 12;
    if (axis === "x") {
      if (p < 4.6) return "green";
      if (p < 5.3) return "yellow";
      return "red";
    }
    if (p < 5.8) return "red";
    if (p < 10.4) return "green";
    if (p < 11.1) return "yellow";
    return "red";
  }

  private updateSignals(clock: number) {
    for (const signal of this.signals) {
      const state = this.signalState(clock, signal.axis, signal.ix, signal.iy);
      signal.red.emissiveIntensity = state === "red" ? 2.8 : 0.08;
      signal.yellow.emissiveIntensity = state === "yellow" ? 2.4 : 0.05;
      signal.green.emissiveIntensity = state === "green" ? 2.5 : 0.05;
    }
  }

  private approachFor(car: LiveCar, lane: Lane) {
    const centers = lane.axis === "x" ? VERTICAL_STREET_CENTERS : HORIZONTAL_STREET_CENTERS;
    const along = lane.axis === "x" ? car.x : car.y;
    let bestCenter: number | null = null;
    let bestDelta = Infinity;
    for (const center of centers) {
      const delta = (center - along) * lane.dir;
      if (delta < -10 || delta > 82) continue;
      if (delta < bestDelta) {
        bestDelta = delta;
        bestCenter = center;
      }
    }
    if (bestCenter === null) return null;
    const ix = lane.axis === "x" ? bestCenter : nearest(lane.fixed, VERTICAL_STREET_CENTERS);
    const iy = lane.axis === "x" ? nearest(lane.fixed, HORIZONTAL_STREET_CENTERS) : bestCenter;
    return { center: bestCenter, delta: bestDelta, ix, iy };
  }

  private destinationLane(lane: Lane, center: number, turn: "left" | "right") {
    const axis = lane.axis === "x" ? "y" : "x";
    const desiredDir = lane.axis === "x"
      ? turn === "left" ? -lane.dir : lane.dir
      : turn === "left" ? lane.dir : -lane.dir;
    const candidates = this.lanes.filter((candidate) =>
      candidate.axis === axis &&
      candidate.dir === desiredDir &&
      Math.abs(candidate.fixed - center) < TILE * 0.62,
    );
    return candidates.sort((a, b) => Math.abs(a.fixed - center) - Math.abs(b.fixed - center))[0] ?? null;
  }

  preSync(f: WorldFrame) {
    let stoppedAtRed = 0;
    let movingPeds = 0;
    let pausedPeds = 0;

    for (let i = 0; i < f.cars.length; i++) {
      const car = f.cars[i] as LiveCar;
      if (!car.laneId) continue;
      const lane = this.laneMap.get(car.laneId);
      if (!lane) continue;
      let memory = this.trafficMemory.get(car);
      if (!memory) {
        memory = { turnCount: 0, cooldownUntil: f.clock + pseudo(i * 7.3) * 1.5 };
        this.trafficMemory.set(car, memory);
      }
      const approach = this.approachFor(car, lane);
      if (!approach) continue;
      const signal = this.signalState(f.clock, lane.axis, approach.ix, approach.iy);
      const yellowStop = signal === "yellow" && approach.delta > 28;
      const shouldStop = signal === "red" || yellowStop;
      if (shouldStop && approach.delta > 0 && approach.delta < 62) {
        const stopGap = Math.max(28, car.w * 0.64);
        const stopCoord = approach.center - lane.dir * stopGap;
        const along = lane.axis === "x" ? car.x : car.y;
        const toStop = (stopCoord - along) * lane.dir;
        if (toStop <= 8 && toStop > -7) {
          if (lane.axis === "x") car.x = stopCoord;
          else car.y = stopCoord;
          car.vx = 0;
          car.vy = 0;
          stoppedAtRed++;
        } else if (toStop > 0) {
          car.vx *= 0.22;
          car.vy *= 0.22;
        }
      }

      if (signal !== "green" || f.clock < memory.cooldownUntil || approach.delta < -10 || approach.delta > 15) continue;
      const roll = pseudo(i * 97 + memory.turnCount * 41 + approach.center * 0.013);
      const turn = roll < 0.18 ? "left" : roll < 0.36 ? "right" : null;
      memory.turnCount++;
      memory.cooldownUntil = f.clock + 1.7;
      if (!turn) continue;
      const destination = this.destinationLane(lane, approach.center, turn);
      if (!destination) continue;
      car.laneId = destination.id;
      if (destination.axis === "x") car.y = destination.fixed;
      else car.x = destination.fixed;
      const velocity = laneVelocity(destination, 0.62);
      car.vx = velocity.vx;
      car.vy = velocity.vy;
      this.totalTurns++;
    }

    for (let i = 0; i < f.peds.length; i++) {
      const ped = f.peds[i] as LivePed;
      if (typeof ped.vx !== "number" || typeof ped.vy !== "number") continue;
      if (Math.hypot(ped.vx, ped.vy) > 0.5) movingPeds++;
      let memory = this.pedMemory.get(ped);
      if (!memory) {
        memory = {
          nextDecision: f.clock + 0.6 + pseudo(i * 19) * 2.5,
          pauseUntil: 0,
          resumeVx: 0,
          resumeVy: 0,
          pauseCount: 0,
        };
        this.pedMemory.set(ped, memory);
      }
      if (f.clock < memory.pauseUntil) {
        ped.vx = 0;
        ped.vy = 0;
        pausedPeds++;
        continue;
      }
      if (memory.resumeVx !== 0 || memory.resumeVy !== 0) {
        ped.vx = memory.resumeVx;
        ped.vy = memory.resumeVy;
        memory.resumeVx = 0;
        memory.resumeVy = 0;
      }
      if (f.clock < memory.nextDecision) continue;
      const roll = pseudo(i * 53 + memory.pauseCount * 17 + Math.floor(f.clock * 0.5));
      memory.nextDecision = f.clock + 2.2 + pseudo(i * 31 + memory.pauseCount * 11) * 3.8;
      if (roll > 0.58 || Math.hypot(ped.vx, ped.vy) < 0.5) continue;
      memory.resumeVx = ped.vx;
      memory.resumeVy = ped.vy;
      memory.pauseUntil = f.clock + 0.8 + pseudo(i * 47 + memory.pauseCount * 13) * 1.7;
      memory.pauseCount++;
      this.pedestrianPauses++;
      ped.vx = 0;
      ped.vy = 0;
      pausedPeds++;
    }

    this.lastStoppedAtRed = stoppedAtRed;
    this.lastMovingPeds = movingPeds;
    this.lastPausedPeds = pausedPeds;
  }

  private lastStoppedAtRed = 0;
  private lastMovingPeds = 0;
  private lastPausedPeds = 0;

  postSync(f: WorldFrame, carGroups: THREE.Group[], npcSprites: Map<string, THREE.Sprite>) {
    this.updateSignals(f.clock);
    this.smoothCarVisuals(f, carGroups);
    this.ensureCourtCrowd(npcSprites);
    if (this.courtCrowd) {
      const cx = COURT.x + COURT.w / 2;
      const cy = COURT.y + COURT.h / 2;
      const near = Math.hypot(f.px - cx, f.py - cy) < 520;
      this.courtCrowd.visible = f.mode === "basketball" || near;
      for (let i = 0; i < this.courtCrowd.children.length; i++) {
        const child = this.courtCrowd.children[i]!;
        child.position.y = 0.95 + Math.sin(f.clock * 2.2 + i * 1.4) * 0.025;
      }
    }
    this.publishDiagnostics(f);
  }

  private smoothCarVisuals(f: WorldFrame, groups: THREE.Group[]) {
    const ease = 1 - Math.exp(-10 * Math.min(f.dt || 1 / 60, 0.05));
    for (let i = 0; i < groups.length; i++) {
      const car = f.cars[i];
      const group = groups[i];
      if (!car || !group || !group.visible) continue;
      const target = Math.abs(car.vy) > Math.abs(car.vx)
        ? car.vy > 0 ? 0 : Math.PI
        : car.vx < 0 ? Math.PI / 2 : -Math.PI / 2;
      const prev = typeof group.userData.smoothYaw === "number" ? group.userData.smoothYaw : target;
      const smooth = lerpAngle(prev, target, ease);
      group.userData.smoothYaw = smooth;
      group.rotation.y = smooth;
      const speed = Math.min(1, Math.hypot(car.vx, car.vy) / 85);
      group.position.y = Math.sin(f.clock * 7.5 + i * 0.83) * 0.012 * speed;
    }
  }

  private ensureCourtCrowd(npcSprites: Map<string, THREE.Sprite>) {
    if (this.courtCrowd) return;
    const ids = ["court_coach", "supporter_1", "downtown_fan", "culture_host", "street_npc", "k_blanco"];
    if (ids.some((id) => !npcSprites.get(id))) return;
    const group = new THREE.Group();
    group.name = "sackrow-court-crowd";
    const positions = [
      [COURT.x + 22, COURT.y + 74],
      [COURT.x + 24, COURT.y + 145],
      [COURT.x + 26, COURT.y + 215],
      [COURT.x + COURT.w - 22, COURT.y + 82],
      [COURT.x + COURT.w - 24, COURT.y + 154],
      [COURT.x + COURT.w - 26, COURT.y + 224],
    ] as const;
    for (let i = 0; i < ids.length; i++) {
      const source = npcSprites.get(ids[i]!);
      if (!source) continue;
      const material = source.material.clone();
      const clone = new THREE.Sprite(material);
      clone.scale.copy(source.scale).multiplyScalar(i === 0 ? 1.08 : 0.94 + (i % 3) * 0.05);
      clone.position.set(wx(positions[i]![0]), 0.95, wz(positions[i]![1]));
      group.add(clone);
    }
    this.courtCrowd = group;
    this.scene.add(group);
  }

  private publishDiagnostics(f: WorldFrame) {
    let offLaneCars = 0;
    const sampleLanes: string[] = [];
    for (const raw of f.cars) {
      const car = raw as LiveCar;
      if (!car.laneId) continue;
      const lane = this.laneMap.get(car.laneId);
      if (!lane) {
        offLaneCars++;
        continue;
      }
      const lateral = lane.axis === "x" ? Math.abs(car.y - lane.fixed) : Math.abs(car.x - lane.fixed);
      if (lateral > TILE * 0.72) offLaneCars++;
      if (sampleLanes.length < 8) sampleLanes.push(car.laneId);
    }

    (window as typeof window & {
      __SACK_TRAFFIC__?: {
        cars: number;
        lanes: number;
        signals: number;
        markers: number;
        parkedCars: number;
        courtCrowd: number;
        turningEnabled: boolean;
        totalTurns: number;
        stoppedAtRed: number;
        pedestrianPauses: number;
        movingPeds: number;
        pausedPeds: number;
        offLaneCars: number;
        sampleLanes: string[];
      };
    }).__SACK_TRAFFIC__ = {
      cars: f.cars.length,
      lanes: this.lanes.length,
      signals: this.signals.length,
      markers: this.markerCount,
      parkedCars: this.parkedCars,
      courtCrowd: this.courtCrowd?.children.length ?? 0,
      turningEnabled: true,
      totalTurns: this.totalTurns,
      stoppedAtRed: this.lastStoppedAtRed,
      pedestrianPauses: this.pedestrianPauses,
      movingPeds: this.lastMovingPeds,
      pausedPeds: this.lastPausedPeds,
      offLaneCars,
      sampleLanes,
    };
  }
}
