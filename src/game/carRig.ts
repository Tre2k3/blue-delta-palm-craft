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
/** Tyre radius. The rig origin is the contact patch, so wheels sit at this local Y. */
export const WHEEL_RADIUS = 0.26;

/**
 * Ride height above the world origin.
 *
 * Wheels sit at local Y == WHEEL_RADIUS, so the rig origin is the tyre contact
 * patch. WorldLife asphalt is a 0.035-tall box centered at y=0.075 (top ~0.093).
 * CAR_RIDE is that surface so cars sit on the road instead of sinking through it.
 * Animate the hull for suspension — do not raise the root.
 */
export const CAR_RIDE = 0.093;

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
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.16, 18), tire);
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
    wheel.position.set(x, WHEEL_RADIUS, z);
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
    wheel.position.set(x, WHEEL_RADIUS, z);
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

function luxuryPaint(color = 0x0b0b0d) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.72 });
}

function luxuryChrome(color = 0xd8d4cc) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.22, metalness: 0.92 });
}

function luxuryGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x0a1218,
    roughness: 0.08,
    metalness: 0.55,
    transparent: true,
    opacity: 0.72,
  });
}

function luxuryWheel() {
  const tire = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.96 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.38, metalness: 0.7 });
  const lip = new THREE.MeshStandardMaterial({ color: 0xb7b7b7, roughness: 0.28, metalness: 0.86 });
  const root = new THREE.Group();
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.18, 20), tire);
  wheel.rotation.x = Math.PI / 2;
  root.add(wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.19, 12), rim);
  hub.rotation.x = Math.PI / 2;
  root.add(hub);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 20), lip);
  ring.rotation.y = Math.PI / 2;
  root.add(ring);
  root.userData.wheel = true;
  return root;
}

function letterPlane(text: string, sub: string, w = 1.9, h = 0.28) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = "#c9a84c";
  ctx.font = "700 92px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, 512, 118);
  ctx.fillStyle = "#e8e0d0";
  ctx.font = "600 36px ui-sans-serif, system-ui";
  ctx.fillText(sub, 512, 178);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

function mercedesStar(scale = 1) {
  const g = new THREE.Group();
  const chrome = luxuryChrome(0xf2efe8);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12 * scale, 0.016 * scale, 10, 28), chrome);
  g.add(ring);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.2 * scale, 0.018 * scale), chrome);
    arm.position.y = 0.055 * scale;
    const wrap = new THREE.Group();
    wrap.add(arm);
    wrap.rotation.z = (i * Math.PI * 2) / 3;
    g.add(wrap);
  }
  return g;
}

function cadillacCrest(scale = 1) {
  const g = new THREE.Group();
  const chrome = luxuryChrome(0xe8e4dc);
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.07 * scale, 0.01 * scale, 8, 20), chrome);
  wreath.scale.set(1, 1.25, 1);
  g.add(wreath);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, 0.08 * scale, 0.02 * scale), chrome);
  g.add(shield);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.012 * scale, 0.018 * scale), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.6, roughness: 0.35 }));
  bar.position.y = 0.012 * scale;
  g.add(bar);
  return g;
}

function addLuxuryLamps(root: THREE.Group, L: number, W: number, y: number, wide = false) {
  for (const z of [-W * 0.32, W * 0.32]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(wide ? 0.06 : 0.05, wide ? 0.1 : 0.16, wide ? 0.38 : 0.2),
      new THREE.MeshStandardMaterial({ color: 0xf8f1d4, emissive: 0xffe7a8, emissiveIntensity: 0.95, roughness: 0.22 }),
    );
    lamp.position.set(L / 2 + 0.05, y, z);
    root.add(lamp);
    const brake = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.14, wide ? 0.32 : 0.2),
      new THREE.MeshStandardMaterial({ color: 0x4a0a0a, emissive: 0xff2020, emissiveIntensity: 0.38, roughness: 0.32 }),
    );
    brake.position.set(-L / 2 - 0.05, y, z);
    root.add(brake);
  }
}

function addLuxuryWheels(root: THREE.Group, L: number, W: number, ax = 0.34) {
  for (const [x, z] of [
    [L * ax, W * 0.52],
    [L * ax, -W * 0.52],
    [-L * ax, W * 0.52],
    [-L * ax, -W * 0.52],
  ] as const) {
    const wheel = luxuryWheel();
    wheel.position.set(x, WHEEL_RADIUS, z);
    if (z < 0) wheel.rotation.y = Math.PI;
    root.add(wheel);
  }
}

function addGroundShadow(root: THREE.Group, L: number, W: number) {
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(L * 0.92, W * 1.15),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  root.add(sh);
}

/** High-roof Mercedes-Benz Sprinter — black luxury, three-pointed star, captain-chair van. */
export function makeLuxurySprinter(): THREE.Group {
  const L = 3.58;
  const H = 1.78;
  const W = 1.36;
  const root = new THREE.Group();
  root.name = "rcm-sprinter";
  const paint = luxuryPaint(0x0a0a0c);
  const chrome = luxuryChrome();
  const glass = luxuryGlass();
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.38, metalness: 0.7, emissive: 0x5a4310, emissiveIntensity: 0.22 });

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(L * 0.78, H, W), paint);
  cabin.position.set(-L * 0.08, 0.38 + H / 2, 0);
  cabin.castShadow = true;
  root.add(cabin);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(L * 0.28, H * 0.42, W * 0.96), paint);
  hood.position.set(L * 0.36, 0.38 + H * 0.22, 0);
  hood.castShadow = true;
  root.add(hood);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.82, H * 0.42), glass);
  windshield.position.set(L * 0.22, 0.38 + H * 0.62, 0);
  windshield.rotation.y = Math.PI / 2;
  windshield.rotation.z = -0.28;
  root.add(windshield);

  for (const z of [W / 2 + 0.01, -W / 2 - 0.01]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.62, H * 0.38), glass);
    win.position.set(-L * 0.06, 0.38 + H * 0.62, z);
    win.rotation.y = z > 0 ? 0 : Math.PI;
    root.add(win);
  }

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, H * 0.28, W * 0.72), chrome);
  grille.position.set(L / 2 + 0.02, 0.58, 0);
  root.add(grille);
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.018, W * 0.62), chrome);
    slat.position.set(L / 2 + 0.05, 0.46 + i * 0.055, 0);
    root.add(slat);
  }
  const star = mercedesStar(1.05);
  star.position.set(L / 2 + 0.08, 0.72, 0);
  star.rotation.y = Math.PI / 2;
  root.add(star);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, W * 0.9), chrome);
  bumper.position.set(L / 2 + 0.04, 0.36, 0);
  root.add(bumper);
  const rearBumper = bumper.clone();
  rearBumper.position.x = -L / 2 - 0.04;
  root.add(rearBumper);

  addLuxuryLamps(root, L, W, 0.62);
  addLuxuryWheels(root, L, W, 0.3);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, 0.04, 0.04), chrome);
  rail.position.set(-L * 0.06, 0.38 + H + 0.04, W * 0.28);
  root.add(rail);
  const rail2 = rail.clone();
  rail2.position.z = -W * 0.28;
  root.add(rail2);

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.12, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.55 }),
  );
  plate.position.set(-L / 2 - 0.07, 0.42, 0);
  root.add(plate);

  const sideL = letterPlane("RCM WORX", "ON TIME. EVERY TIME.", 1.85, 0.32);
  sideL.position.set(-0.15, 0.86, W / 2 + 0.02);
  root.add(sideL);
  const sideR = letterPlane("RCM WORX", "ELITE LUXURY", 1.85, 0.32);
  sideR.position.set(-0.15, 0.86, -W / 2 - 0.02);
  sideR.rotation.y = Math.PI;
  root.add(sideR);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(L * 0.7, 0.03, 0.02), gold);
  stripe.position.set(-0.1, 1.12, W / 2 + 0.015);
  root.add(stripe);
  const stripe2 = stripe.clone();
  stripe2.position.z = -W / 2 - 0.015;
  root.add(stripe2);

  addGroundShadow(root, L, W);
  return root;
}

/** Cadillac Escalade ESV — long black executive SUV, vertical chrome grille. */
export function makeLuxuryEscalade(): THREE.Group {
  const L = 3.48;
  const H = 1.22;
  const W = 1.32;
  const root = new THREE.Group();
  root.name = "rcm-escalade";
  const paint = luxuryPaint(0x0c0c0e);
  const chrome = luxuryChrome(0xe4e0d8);
  const glass = luxuryGlass();
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.38, metalness: 0.7, emissive: 0x5a4310, emissiveIntensity: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(L * 0.92, H * 0.55, W), paint);
  body.position.set(-L * 0.02, 0.38 + H * 0.28, 0);
  body.castShadow = true;
  root.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(L * 0.58, H * 0.5, W * 0.96), paint);
  cabin.position.set(-L * 0.08, 0.38 + H * 0.72, 0);
  cabin.castShadow = true;
  root.add(cabin);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(L * 0.32, H * 0.22, W * 0.94), paint);
  hood.position.set(L * 0.3, 0.38 + H * 0.48, 0);
  hood.castShadow = true;
  root.add(hood);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.78, H * 0.36), glass);
  windshield.position.set(L * 0.16, 0.38 + H * 0.78, 0);
  windshield.rotation.y = Math.PI / 2;
  windshield.rotation.z = -0.42;
  root.add(windshield);

  for (const z of [W / 2 + 0.01, -W / 2 - 0.01]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.5, H * 0.32), glass);
    win.position.set(-L * 0.08, 0.38 + H * 0.78, z);
    win.rotation.y = z > 0 ? 0 : Math.PI;
    root.add(win);
  }

  const grillePlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, H * 0.42, W * 0.7), luxuryPaint(0x111113));
  grillePlate.position.set(L / 2 + 0.02, 0.62, 0);
  root.add(grillePlate);
  for (let i = 0; i < 9; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, H * 0.38, 0.028), chrome);
    bar.position.set(L / 2 + 0.055, 0.62, -W * 0.28 + i * ((W * 0.56) / 8));
    root.add(bar);
  }
  const crest = cadillacCrest(1.15);
  crest.position.set(L / 2 + 0.09, 0.92, 0);
  crest.rotation.y = Math.PI / 2;
  root.add(crest);

  const dri = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, W * 0.78),
    new THREE.MeshStandardMaterial({ color: 0xf8f4e4, emissive: 0xfff1c2, emissiveIntensity: 1.15, roughness: 0.18 }),
  );
  dri.position.set(L / 2 + 0.05, 0.86, 0);
  root.add(dri);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, W * 0.92), chrome);
  bumper.position.set(L / 2 + 0.05, 0.34, 0);
  root.add(bumper);
  const rearBumper = bumper.clone();
  rearBumper.position.x = -L / 2 - 0.04;
  root.add(rearBumper);

  for (const z of [W / 2 + 0.04, -W / 2 - 0.04]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, 0.05, 0.12), chrome);
    board.position.set(-0.05, 0.32, z);
    root.add(board);
  }

  addLuxuryLamps(root, L, W, 0.58, true);
  addLuxuryWheels(root, L, W, 0.32);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(L * 0.7, 0.03, 0.02), chrome);
  belt.position.set(-0.08, 0.92, W / 2 + 0.015);
  root.add(belt);
  const belt2 = belt.clone();
  belt2.position.z = -W / 2 - 0.015;
  root.add(belt2);

  const sideL = letterPlane("ESCALADE ESV", "RCM WORX · EXECUTIVE", 1.7, 0.26);
  sideL.position.set(-0.12, 0.7, W / 2 + 0.02);
  root.add(sideL);
  const sideR = letterPlane("ESCALADE ESV", "ON TIME. EVERY TIME.", 1.7, 0.26);
  sideR.position.set(-0.12, 0.7, -W / 2 - 0.02);
  sideR.rotation.y = Math.PI;
  root.add(sideR);

  for (const z of [-0.18, 0.18]) {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), chrome);
    tip.rotation.z = Math.PI / 2;
    tip.position.set(-L / 2 - 0.08, 0.28, z);
    root.add(tip);
  }

  const goldLip = new THREE.Mesh(new THREE.BoxGeometry(L * 0.2, 0.02, W * 0.7), gold);
  goldLip.position.set(L * 0.28, 0.86, 0);
  root.add(goldLip);

  addGroundShadow(root, L, W);
  return root;
}

