import * as THREE from "three";
import {
  TRAFFIC_WRAPS,
  bindWrapTextures,
  kindFromPack,
  makePaintedHull,
  makeWrappedHull,
  DROP_VAN_WRAP,
  type CarKind,
  type WrapPackName,
} from "./vehicleWraps";

export type StreetCarRig = {
  root: THREE.Group;
  hull: THREE.Group;
  wheels: THREE.Group[];
  headlights: THREE.MeshStandardMaterial[];
  brakes: THREE.MeshStandardMaterial[];
  blinkers: THREE.MeshStandardMaterial[];
  pack: WrapPackName | null;
  kind: CarKind;
  civilian: boolean;
};

/** Sit on the raised WorldLife road (top ~0.09) instead of the y=0 ground plane. */
export const CAR_RIDE = 0.16;

export const CIVILIAN_PAINTS: { color: number; kind: CarKind }[] = [
  { color: 0xcfc8bf, kind: "sedan" },
  { color: 0xf4f1ea, kind: "sedan" },
  { color: 0x1e293b, kind: "sedan" },
  { color: 0x7f1d1d, kind: "coupe" },
  { color: 0x3f3f46, kind: "suv" },
  { color: 0x57534e, kind: "sedan" },
  { color: 0x1e3a5f, kind: "suv" },
  { color: 0x44403c, kind: "coupe" },
  { color: 0xb45309, kind: "sedan" },
  { color: 0x3f4f2a, kind: "suv" },
  { color: 0x94a3b8, kind: "sedan" },
  { color: 0x292524, kind: "coupe" },
];

function dimsFor(kind: CarKind) {
  if (kind === "suv") return { L: 2.48, H: 0.98, W: 1.08 };
  if (kind === "coupe") return { L: 2.32, H: 0.72, W: 0.98 };
  if (kind === "van") return { L: 2.62, H: 1.12, W: 1.14 };
  return { L: 2.38, H: 0.8, W: 1.0 };
}

function makeWheel() {
  const tire = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.96 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.32, metalness: 0.72 });
  const disc = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.55, metalness: 0.4 });
  const root = new THREE.Group();
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 18), tire);
  wheel.rotation.x = Math.PI / 2;
  root.add(wheel);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.04, 18), tire);
  wall.rotation.x = Math.PI / 2;
  wall.position.z = 0.07;
  root.add(wall);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.175, 12), rim);
  hub.rotation.x = Math.PI / 2;
  root.add(hub);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), disc);
  cap.position.z = 0.09;
  root.add(cap);
  root.userData.wheel = true;
  return root;
}

/** Branded wraps stay rare. Most traffic is ordinary Memphis paint. Drop van is never used here. */
export function lookForIndex(index: number): { pack: WrapPackName | null; kind: CarKind; color: number } {
  if (index % 5 === 0) {
    const pack = TRAFFIC_WRAPS[(index / 5) % TRAFFIC_WRAPS.length]!;
    return { pack, kind: kindFromPack(pack), color: 0xffffff };
  }
  const paint = CIVILIAN_PAINTS[index % CIVILIAN_PAINTS.length]!;
  return { pack: null, kind: paint.kind, color: paint.color };
}

export function makeStreetCar(index: number, parked = false): StreetCarRig {
  const look = lookForIndex(index + (parked ? 17 : 0));
  const { L, H, W } = dimsFor(look.kind);
  const y = 0.3 + H / 2;
  const root = new THREE.Group();
  root.name = parked ? "parked-street-car" : "world-life-3d-vehicle";
  const hull = look.pack
    ? makeWrappedHull(look.pack, L, H, W, y)
    : makePaintedHull(look.kind, L, H, W, y, look.color);
  root.add(hull);

  const trim = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.72, metalness: 0.18 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb7b7b7, roughness: 0.3, metalness: 0.72 });
  const headlights: THREE.MeshStandardMaterial[] = [];
  const brakes: THREE.MeshStandardMaterial[] = [];
  const blinkers: THREE.MeshStandardMaterial[] = [];

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, W * 0.86), chrome);
  frontBumper.position.set(L / 2 + 0.04, 0.37, 0);
  root.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.x = -L / 2 - 0.04;
  root.add(rearBumper);

  for (const z of [-W * 0.34, W * 0.34]) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf0e8c9,
      emissive: 0xffdf9a,
      emissiveIntensity: parked ? 0.05 : 0.85,
      roughness: 0.28,
    });
    headlights.push(mat);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.17, 0.22), mat);
    lamp.position.set(L / 2 + 0.06, 0.53, z);
    root.add(lamp);
    const blink = new THREE.MeshStandardMaterial({
      color: 0x5a3a08,
      emissive: 0xff9a1a,
      emissiveIntensity: 0.08,
      roughness: 0.4,
    });
    blinkers.push(blink);
    const amber = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.1), blink);
    amber.position.set(L / 2 + 0.05, 0.42, z * 1.18);
    root.add(amber);
  }
  for (const z of [-W * 0.34, W * 0.34]) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a0a0a,
      emissive: 0xff2020,
      emissiveIntensity: 0.22,
      roughness: 0.34,
    });
    brakes.push(mat);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.17, 0.22), mat);
    lamp.position.set(-L / 2 - 0.06, 0.53, z);
    root.add(lamp);
  }

  const wheels: THREE.Group[] = [];
  const ax = L * 0.32;
  for (const [x, z] of [
    [ax, W * 0.5],
    [ax, -W * 0.5],
    [-ax, W * 0.5],
    [-ax, -W * 0.5],
  ] as const) {
    const wheel = makeWheel();
    wheel.position.set(x, 0.27, z);
    if (z < 0) wheel.rotation.y = Math.PI;
    root.add(wheel);
    wheels.push(wheel);
  }

  const rail = new THREE.Mesh(new THREE.BoxGeometry(L * 0.78, 0.06, 0.04), trim);
  rail.position.set(0, 0.36, W / 2 + 0.02);
  root.add(rail);
  const rail2 = rail.clone();
  rail2.position.z = -W / 2 - 0.02;
  root.add(rail2);

  return {
    root,
    hull,
    wheels,
    headlights,
    brakes,
    blinkers,
    pack: look.pack,
    kind: look.kind,
    civilian: !look.pack,
  };
}

export function bindStreetCar(rig: StreetCarRig) {
  if (rig.pack) bindWrapTextures(rig.hull);
}

export function makeDropVan(): THREE.Group {
  const L = 3.12;
  const H = 1.32;
  const W = 1.28;
  const y = 0.34 + H / 2;
  const root = new THREE.Group();
  root.name = "drop-van";
  const hull = makeWrappedHull(DROP_VAN_WRAP, L, H, W, y);
  bindWrapTextures(hull);
  root.add(hull);
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb7b7b7, roughness: 0.3, metalness: 0.72 });
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, W * 0.88), chrome);
  frontBumper.position.set(L / 2 + 0.04, 0.38, 0);
  root.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.x = -L / 2 - 0.04;
  root.add(rearBumper);
  for (const z of [-W * 0.34, W * 0.34]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.17, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xf0e8c9, emissive: 0xffdf9a, emissiveIntensity: 0.7, roughness: 0.28 }),
    );
    lamp.position.set(L / 2 + 0.06, 0.56, z);
    root.add(lamp);
    const brake = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.17, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x4a0a0a, emissive: 0xff2020, emissiveIntensity: 0.28, roughness: 0.34 }),
    );
    brake.position.set(-L / 2 - 0.06, 0.56, z);
    root.add(brake);
  }
  const ax = L * 0.32;
  for (const [x, z] of [
    [ax, W * 0.5],
    [ax, -W * 0.5],
    [-ax, W * 0.5],
    [-ax, -W * 0.5],
  ] as const) {
    const wheel = makeWheel();
    wheel.position.set(x, 0.26, z);
    if (z < 0) wheel.rotation.y = Math.PI;
    root.add(wheel);
  }
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.15),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  root.add(sh);
  return root;
}
