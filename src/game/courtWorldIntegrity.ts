import * as THREE from "three";
import { POIS, TILE } from "./data";
import { laneVelocity, trafficLanes } from "./worldTopology";
import { WorldLifePass } from "./worldLifePass";
import { wx, wz, type WorldFrame } from "./world3dCore";

const COURT = POIS.find((p) => p.id === "court")!;
const COURT_BLOCKED_LANES = new Set([
  "POPLAR AVE:east",
  "POPLAR AVE:west",
  "3RD ST:south",
  "3RD ST:north",
]);
const SAFE_LANES = trafficLanes().filter((lane) => !COURT_BLOCKED_LANES.has(lane.id));

type LiveCar = WorldFrame["cars"][number] & { laneId?: string };
type PatchedLife = WorldLifePass & { __courtIntegrityPatched?: boolean };

function insideCourt(x: number, y: number, pad = 0) {
  return x >= COURT.x - pad && x <= COURT.x + COURT.w + pad && y >= COURT.y - pad && y <= COURT.y + COURT.h + pad;
}

function buildCourtDeck(scene: THREE.Scene) {
  scene.getObjectByName("sackrow-court-safety-deck")?.removeFromParent();
  const root = new THREE.Group();
  root.name = "sackrow-court-safety-deck";
  const cx = wx(COURT.x + COURT.w / 2);
  const cz = wz(COURT.y + COURT.h / 2);
  const cw = wx(COURT.w);
  const cd = wz(COURT.h);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x101211, roughness: 0.82, metalness: 0.02 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.25, cd - 0.25), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.155, cz);
  floor.receiveShadow = true;
  root.add(floor);

  const green = new THREE.MeshStandardMaterial({ color: 0x08713f, emissive: 0x052b1a, emissiveIntensity: 0.22, roughness: 0.72 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.55, metalness: 0.12 });
  const stripeH = 0.022;
  const edge = 0.10;
  const box = (w: number, d: number, mat: THREE.Material, x: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, stripeH, d), mat);
    mesh.position.set(x, 0.17, z);
    root.add(mesh);
  };
  box(cw - 0.55, edge, gold, cx, cz - cd / 2 + 0.28);
  box(cw - 0.55, edge, gold, cx, cz + cd / 2 - 0.28);
  box(edge, cd - 0.55, green, cx - cw / 2 + 0.28, cz);
  box(edge, cd - 0.55, green, cx + cw / 2 - 0.28, cz);
  box(edge, cd - 1.2, gold, cx, cz);

  const center = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.08, 8, 36), green);
  center.rotation.x = Math.PI / 2;
  center.position.set(cx, 0.18, cz);
  root.add(center);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.05, 8, 36), gold);
  inner.rotation.x = Math.PI / 2;
  inner.position.set(cx, 0.182, cz);
  root.add(inner);

  scene.add(root);
}

function hideCourtStreetFurniture(scene: THREE.Scene) {
  const root = scene.getObjectByName("memphis-world-life");
  if (!root) return;
  scene.updateMatrixWorld(true);
  const pos = new THREE.Vector3();
  for (const child of [...root.children]) {
    if (!(child instanceof THREE.Group)) continue;
    let vehicleOrSignal = false;
    child.traverse((node) => {
      if (node instanceof THREE.Mesh && node.geometry instanceof THREE.CylinderGeometry) vehicleOrSignal = true;
    });
    if (!vehicleOrSignal) continue;
    child.getWorldPosition(pos);
    const px = pos.x / (1 / 16);
    const py = pos.z / (1 / 16);
    if (insideCourt(px, py, TILE * 0.65)) child.visible = false;
  }
}

function rerouteCourtCar(car: LiveCar, index: number) {
  if (!car.laneId || !COURT_BLOCKED_LANES.has(car.laneId)) return false;
  const source = trafficLanes().find((lane) => lane.id === car.laneId);
  if (!source) return false;
  const candidates = SAFE_LANES.filter((lane) => lane.axis === source.axis && lane.dir === source.dir);
  const target = candidates[index % Math.max(1, candidates.length)];
  if (!target) return false;
  car.laneId = target.id;
  if (target.axis === "x") car.y = target.fixed;
  else car.x = target.fixed;
  const velocity = laneVelocity(target, 0.82);
  car.vx = velocity.vx;
  car.vy = velocity.vy;
  return true;
}

export function installCourtWorldIntegrity() {
  const proto = WorldLifePass.prototype as PatchedLife;
  if (proto.__courtIntegrityPatched) return;
  proto.__courtIntegrityPatched = true;

  const originalBuild = WorldLifePass.prototype.build;
  WorldLifePass.prototype.build = function courtSafeBuild(this: WorldLifePass) {
    originalBuild.call(this);
    const scene = (this as unknown as { scene: THREE.Scene }).scene;
    hideCourtStreetFurniture(scene);
    buildCourtDeck(scene);
  };

  const originalPreSync = WorldLifePass.prototype.preSync;
  WorldLifePass.prototype.preSync = function courtSafeTraffic(this: WorldLifePass, frame: WorldFrame) {
    originalPreSync.call(this, frame);
    for (let i = 0; i < frame.cars.length; i++) rerouteCourtCar(frame.cars[i] as LiveCar, i);
  };

  const originalPostSync = WorldLifePass.prototype.postSync;
  WorldLifePass.prototype.postSync = function courtSafeDiagnostics(
    this: WorldLifePass,
    frame: WorldFrame,
    carGroups: THREE.Group[],
    npcSprites: Map<string, THREE.Sprite>,
  ) {
    originalPostSync.call(this, frame, carGroups, npcSprites);
    let carsOnCourt = 0;
    let carsOnBlockedLane = 0;
    for (const raw of frame.cars) {
      const car = raw as LiveCar;
      if (insideCourt(car.x, car.y, TILE * 0.18)) carsOnCourt++;
      if (car.laneId && COURT_BLOCKED_LANES.has(car.laneId)) carsOnBlockedLane++;
    }
    const w = window as typeof window & {
      __SACK_TRAFFIC__?: Record<string, unknown> & {
        carsOnCourt?: number;
        carsOnBlockedLane?: number;
        courtTrafficProtected?: boolean;
      };
    };
    if (w.__SACK_TRAFFIC__) {
      w.__SACK_TRAFFIC__.carsOnCourt = carsOnCourt;
      w.__SACK_TRAFFIC__.carsOnBlockedLane = carsOnBlockedLane;
      w.__SACK_TRAFFIC__.courtTrafficProtected = true;
    }
  };
}
