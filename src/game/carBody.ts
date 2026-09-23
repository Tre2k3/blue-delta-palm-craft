import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CarKind, WrapFace, WrapPackName } from "./vehicleWraps";

/** Tyre radius. The rig origin is the contact patch, so wheels sit at this local Y. */
export const WHEEL_RADIUS = 0.26;

/**
 * Side-profile numbers for each body style. Car faces +X, width is Z, Y is up from the tyre contact patch.
 * X stations are fractions of half-length (1 = front bumper, -1 = rear bumper).
 */
type BodySpec = {
  L: number;
  W: number;
  clear: number; // underbody height
  nose: number; // top of the front fascia
  belt: number; // hood / door top line
  roof: number;
  deck: number; // trunk lid height
  tail: number; // top of the rear fascia
  hood: number; // windshield base
  roofFront: number;
  roofRear: number;
  glassRear: number; // rear glass meets the deck
  axle: number;
  cabinW: number; // greenhouse width as a fraction of W
  sideGlassTo?: number; // panel vans: side glass stops here
};

const SPECS: Record<CarKind, BodySpec> = {
  sedan: {
    L: 2.38, W: 1.0, clear: 0.16, nose: 0.5, belt: 0.68, roof: 1.04, deck: 0.7, tail: 0.64,
    hood: 0.3, roofFront: 0.02, roofRear: -0.44, glassRear: -0.7, axle: 0.64, cabinW: 0.84,
  },
  coupe: {
    L: 2.32, W: 0.98, clear: 0.14, nose: 0.46, belt: 0.66, roof: 0.96, deck: 0.67, tail: 0.6,
    hood: 0.22, roofFront: -0.08, roofRear: -0.38, glassRear: -0.84, axle: 0.64, cabinW: 0.82,
  },
  suv: {
    L: 2.48, W: 1.08, clear: 0.2, nose: 0.66, belt: 0.8, roof: 1.26, deck: 0.8, tail: 0.78,
    hood: 0.42, roofFront: 0.16, roofRear: -0.86, glassRear: -0.93, axle: 0.66, cabinW: 0.88,
  },
  van: {
    L: 2.62, W: 1.14, clear: 0.2, nose: 0.7, belt: 0.8, roof: 1.42, deck: 0.8, tail: 0.8,
    hood: 0.6, roofFront: 0.36, roofRear: -0.96, glassRear: -0.99, axle: 0.66, cabinW: 0.94, sideGlassTo: 0.08,
  },
};

const BEVEL = 0.03;
const ARCH_GAP = 0.08;

/** Logo band of the full-car wrap art (black background blends into the black paint). */
const WRAP_CROP: Record<"left" | "right" | "hood", { u0: number; u1: number; v0: number; v1: number }> = {
  left: { u0: 0.22, u1: 0.82, v0: 0.04, v1: 0.78 },
  right: { u0: 0.18, u1: 0.78, v0: 0.04, v1: 0.78 },
  hood: { u0: 0.33, u1: 0.67, v0: 0.38, v1: 0.8 },
};

const shared = {
  glass: new THREE.MeshStandardMaterial({ color: 0x26394a, roughness: 0.1, metalness: 0.45, side: THREE.DoubleSide }),
  trim: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.72, metalness: 0.1 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.26, metalness: 0.8 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.94 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xb9bcbf, roughness: 0.3, metalness: 0.75 }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
};
const paints = new Map<number, THREE.MeshStandardMaterial>();

function paintFor(color: number, branded: boolean) {
  const key = branded ? -1 : color;
  let mat = paints.get(key);
  if (!mat) {
    mat = branded
      ? new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.28, metalness: 0.35 })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.22 });
    paints.set(key, mat);
  }
  return mat;
}

function flat(parts: THREE.BufferGeometry[]) {
  const ready = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.clearGroups();
    for (const name of Object.keys(n.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") n.deleteAttribute(name);
    }
    return n;
  });
  return mergeGeometries(ready, false)!;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

/** Flat quad from four points, UV 0..1 across (a→b) and (a→d). */
function quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, uv = [0, 1, 0, 1]) {
  const [u0, u1, v0, v1] = uv as [number, number, number, number];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray()], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
  g.computeVertexNormals();
  return g;
}

/** Shrink a convex polygon by `e` (points in either winding). */
function inset(points: THREE.Vector2[], e: number) {
  const n = points.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += points[i]!.cross(points[(i + 1) % n]!);
  const sign = area > 0 ? 1 : -1;
  const lines = points.map((p, i) => {
    const q = points[(i + 1) % n]!;
    const d = q.clone().sub(p).normalize();
    const inward = new THREE.Vector2(-d.y, d.x).multiplyScalar(sign * e);
    return { p: p.clone().add(inward), d };
  });
  return lines.map((l, i) => {
    const prev = lines[(i + n - 1) % n]!;
    const denom = prev.d.cross(l.d);
    if (Math.abs(denom) < 1e-6) return l.p.clone();
    const t = l.p.clone().sub(prev.p).cross(l.d) / denom;
    return prev.p.clone().add(prev.d.clone().multiplyScalar(t));
  });
}

function extrudeCentered(shape: THREE.Shape, width: number) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, width - BEVEL * 2),
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 2,
    curveSegments: 10,
  });
  return g.translate(0, 0, -(width - BEVEL * 2) / 2);
}

type BodyGeo = {
  paint: THREE.BufferGeometry;
  trim: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  chrome: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  brake: THREE.BufferGeometry;
  blink: THREE.BufferGeometry;
  shadow: THREE.BufferGeometry;
  decals: { face: WrapFace; geo: THREE.BufferGeometry }[];
  wheelSpots: [number, number][];
};

const bodyCache = new Map<string, BodyGeo>();

function bodyGeometry(s: BodySpec): BodyGeo {
  const n = s.L / 2;
  const r = WHEEL_RADIUS;
  const ax = s.axle * n;
  const ar = r + ARCH_GAP;
  const hx = s.hood * n;
  const rf = s.roofFront * n;
  const rr = s.roofRear * n;
  const gr = s.glassRear * n;

  // Lower body: fascia, hood, doors, trunk, with real wheel arches.
  const body = new THREE.Shape();
  body.moveTo(-n + 0.06, s.clear);
  body.lineTo(-ax - ar, s.clear);
  body.absarc(-ax, r, ar, Math.PI, 0, true);
  body.lineTo(-ax + ar, s.clear);
  body.lineTo(ax - ar, s.clear);
  body.absarc(ax, r, ar, Math.PI, 0, true);
  body.lineTo(ax + ar, s.clear);
  body.lineTo(n - 0.06, s.clear);
  body.quadraticCurveTo(n, s.clear, n, s.clear + 0.08);
  body.lineTo(n, s.nose - 0.06);
  body.quadraticCurveTo(n, s.nose, n - 0.12, s.nose + 0.015);
  body.quadraticCurveTo((n + hx) / 2, s.belt - 0.01, hx, s.belt);
  const deckStart = Math.max(gr, -n + 0.22);
  body.lineTo(deckStart, s.belt);
  body.quadraticCurveTo((deckStart - n + 0.08) / 2, s.deck, -n + 0.08, s.deck);
  body.quadraticCurveTo(-n, s.deck, -n, s.tail - 0.04);
  body.lineTo(-n, s.clear + 0.08);
  body.quadraticCurveTo(-n, s.clear, -n + 0.06, s.clear);

  // Greenhouse: A-pillar, roof, C-pillar.
  const cabin = new THREE.Shape();
  cabin.moveTo(hx, s.belt - 0.02);
  cabin.lineTo(rf + 0.07, s.roof - 0.03);
  cabin.quadraticCurveTo(rf, s.roof, rf - 0.1, s.roof);
  cabin.lineTo(rr + 0.1, s.roof);
  cabin.quadraticCurveTo(rr, s.roof, rr - 0.04, s.roof - 0.05);
  cabin.lineTo(gr, s.belt - 0.02);
  cabin.closePath();
  const cabinW = s.W * s.cabinW;

  const mirrorX = hx - 0.06;
  const paint = flat([
    extrudeCentered(body, s.W),
    extrudeCentered(cabin, cabinW),
    box(0.1, 0.06, 0.1, mirrorX, s.belt + 0.07, s.W / 2 + 0.03),
    box(0.1, 0.06, 0.1, mirrorX, s.belt + 0.07, -s.W / 2 - 0.03),
  ]);

  // Glass: side windows inset from the greenhouse outline, plus windshield and back light.
  const sideTo = s.sideGlassTo !== undefined ? s.sideGlassTo * n : null;
  const winPoly = inset(
    sideTo !== null
      ? [new THREE.Vector2(hx, s.belt), new THREE.Vector2(rf, s.roof), new THREE.Vector2(sideTo, s.roof), new THREE.Vector2(sideTo, s.belt)]
      : [new THREE.Vector2(hx, s.belt), new THREE.Vector2(rf, s.roof), new THREE.Vector2(rr, s.roof), new THREE.Vector2(gr, s.belt)],
    0.065,
  );
  const gz = cabinW / 2 + 0.006;
  const sideGlass = (z: number) => {
    const [a, b, c, d] = winPoly.map((p) => new THREE.Vector3(p.x, p.y, z)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
    return quad(a, b, c, d);
  };
  const slope = (x0: number, y0: number, x1: number, y1: number, halfW: number, out: number, facing: 1 | -1) => {
    const d = new THREE.Vector2(x1 - x0, y1 - y0).normalize();
    const nrm = new THREE.Vector2(d.y, -d.x);
    if (nrm.dot(new THREE.Vector2(facing, 1)) < 0) nrm.negate();
    const pad = 0.05;
    const p0 = new THREE.Vector2(x0, y0).addScaledVector(d, pad).addScaledVector(nrm, out);
    const p1 = new THREE.Vector2(x1, y1).addScaledVector(d, -pad).addScaledVector(nrm, out);
    return quad(
      new THREE.Vector3(p0.x, p0.y, -halfW),
      new THREE.Vector3(p0.x, p0.y, halfW),
      new THREE.Vector3(p1.x, p1.y, halfW),
      new THREE.Vector3(p1.x, p1.y, -halfW),
    );
  };
  const glass = flat([
    sideGlass(gz),
    sideGlass(-gz),
    slope(hx, s.belt - 0.02, rf + 0.07, s.roof - 0.03, cabinW / 2 - 0.07, BEVEL + 0.006, 1),
    slope(gr, s.belt - 0.02, rr - 0.04, s.roof - 0.05, cabinW / 2 - 0.07, BEVEL + 0.006, -1),
  ]);

  const fx = n + BEVEL;
  const midDoor = sideTo !== null ? Math.min(rf - 0.05, sideTo) : (rf + rr) / 2;
  const trimParts = [
    box(0.1, 0.15, s.W + 0.03, fx + 0.02, s.clear + 0.09, 0),
    box(0.1, 0.15, s.W + 0.03, -fx - 0.02, s.clear + 0.09, 0),
    box(0.03, 0.07, s.W * 0.24, fx + 0.004, s.nose - 0.1, 0),
    box(2 * (ax - ar) - 0.04, 0.05, s.W + 0.012, 0, s.clear + 0.02, 0),
    box(0.07, s.roof - s.belt - 0.1, cabinW + 0.016, midDoor, (s.belt + s.roof) / 2 - 0.02, 0),
  ];
  for (const x of [midDoor, sideTo !== null ? -n * 0.35 : rr + 0.02]) {
    trimParts.push(box(0.012, s.belt - s.clear - 0.14, s.W + 0.006, x, (s.belt + s.clear) / 2 + 0.02, 0));
  }
  const trim = flat(trimParts);

  const chrome = flat([
    box(0.1, 0.022, s.W + 0.012, midDoor + 0.2, s.belt - 0.09, 0),
    box(0.1, 0.022, s.W + 0.012, midDoor - 0.22, s.belt - 0.09, 0),
    box(0.012, 0.09, 0.28, fx + 0.075, s.clear + 0.1, 0),
    box(0.012, 0.09, 0.28, -fx - 0.075, s.clear + 0.1, 0),
  ]);

  const lampY = s.nose - 0.1;
  const head = flat([
    box(0.03, 0.08, s.W * 0.22, fx + 0.006, lampY, s.W * 0.25),
    box(0.03, 0.08, s.W * 0.22, fx + 0.006, lampY, -s.W * 0.25),
  ]);
  const blink = flat([
    box(0.03, 0.05, 0.07, fx + 0.006, lampY, s.W * 0.41),
    box(0.03, 0.05, 0.07, fx + 0.006, lampY, -s.W * 0.41),
  ]);
  const brake = flat([
    box(0.03, 0.08, s.W * 0.24, -fx - 0.006, s.tail - 0.1, s.W * 0.3),
    box(0.03, 0.08, s.W * 0.24, -fx - 0.006, s.tail - 0.1, -s.W * 0.3),
  ]);

  const shadow = new THREE.PlaneGeometry(s.L * 1.02, s.W * 1.12).rotateX(-Math.PI / 2).translate(0, 0.012, 0);

  // Wrap decals: door band on both sides and a crest on the hood, UV-cropped to the logo.
  const dx0 = -ax + ar + 0.06;
  const dx1 = ax - ar - 0.06;
  const dy0 = s.clear + 0.08;
  const dy1 = s.belt - 0.05;
  const dz = s.W / 2 + 0.004;
  const cropUv = (c: { u0: number; u1: number; v0: number; v1: number }) => [c.u0, c.u1, c.v0, c.v1];
  const decals: { face: WrapFace; geo: THREE.BufferGeometry }[] = [
    {
      face: "right",
      geo: quad(new THREE.Vector3(dx0, dy0, dz), new THREE.Vector3(dx1, dy0, dz), new THREE.Vector3(dx1, dy1, dz), new THREE.Vector3(dx0, dy1, dz), cropUv(WRAP_CROP.right)),
    },
    {
      face: "left",
      geo: quad(new THREE.Vector3(dx1, dy0, -dz), new THREE.Vector3(dx0, dy0, -dz), new THREE.Vector3(dx0, dy1, -dz), new THREE.Vector3(dx1, dy1, -dz), cropUv(WRAP_CROP.left)),
    },
  ];
  if (hx < n - 0.3) {
    const hoodMid = new THREE.Vector2((n - 0.12 + hx) / 2, (s.nose + s.belt) / 2);
    const d = new THREE.Vector2(hx - (n - 0.12), s.belt - s.nose).normalize();
    const nrm = new THREE.Vector2(-d.y, d.x);
    if (nrm.y < 0) nrm.negate();
    const half = Math.min(0.16, (n - 0.12 - hx) * 0.32);
    const lift = BEVEL + 0.02;
    const a0 = hoodMid.clone().addScaledVector(d, -half).addScaledVector(nrm, lift);
    const a1 = hoodMid.clone().addScaledVector(d, half).addScaledVector(nrm, lift);
    decals.push({
      face: "hood",
      geo: quad(
        new THREE.Vector3(a0.x, a0.y, half * 0.9),
        new THREE.Vector3(a0.x, a0.y, -half * 0.9),
        new THREE.Vector3(a1.x, a1.y, -half * 0.9),
        new THREE.Vector3(a1.x, a1.y, half * 0.9),
        cropUv(WRAP_CROP.hood),
      ),
    });
  }

  const wz = s.W / 2 - 0.06;
  return {
    paint,
    trim,
    glass,
    chrome,
    head,
    brake,
    blink,
    shadow,
    decals,
    wheelSpots: [
      [ax, wz],
      [ax, -wz],
      [-ax, wz],
      [-ax, -wz],
    ],
  };
}

let wheelGeo: { tire: THREE.BufferGeometry; rim: THREE.BufferGeometry } | null = null;

function wheelGeometry() {
  if (wheelGeo) return wheelGeo;
  const r = WHEEL_RADIUS;
  const axis = (g: THREE.BufferGeometry) => g.rotateX(Math.PI / 2);
  const tire = flat([
    axis(new THREE.CylinderGeometry(r, r, 0.16, 20)),
    new THREE.TorusGeometry(r - 0.015, 0.03, 6, 20).translate(0, 0, 0.065),
  ]);
  const spokes: THREE.BufferGeometry[] = [axis(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 16)).translate(0, 0, 0.03)];
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.BoxGeometry(0.035, 0.16, 0.02).translate(0, 0.08, 0.095);
    spokes.push(spoke.rotateZ((i * Math.PI * 2) / 5));
  }
  spokes.push(axis(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10)).translate(0, 0, 0.1));
  wheelGeo = { tire, rim: flat(spokes) };
  return wheelGeo;
}

function makeWheel() {
  const g = wheelGeometry();
  const root = new THREE.Group();
  root.add(new THREE.Mesh(g.tire, shared.tire));
  root.add(new THREE.Mesh(g.rim, shared.rim));
  root.userData.wheel = true;
  return root;
}

export type CarBody = {
  root: THREE.Group;
  hull: THREE.Group;
  wheels: THREE.Group[];
  headlights: THREE.MeshStandardMaterial[];
  brakes: THREE.MeshStandardMaterial[];
  blinkers: THREE.MeshStandardMaterial[];
};

/**
 * A modelled car: arched lower body, greenhouse with glass, fascia lamps, trim, spoked wheels.
 * Geometry is cached per body style; only lamp materials are per car (vehicleVisualPass animates them).
 * With a wrap pack the body is premium black and the pack's logo band goes on the doors and hood.
 */
export function buildCarBody(
  kind: CarKind,
  opts: { color?: number; pack?: WrapPackName | null; L?: number; W?: number; parked?: boolean } = {},
): CarBody {
  const spec = { ...SPECS[kind], ...(opts.L ? { L: opts.L } : {}), ...(opts.W ? { W: opts.W } : {}) };
  const key = `${kind}:${spec.L}:${spec.W}`;
  let geo = bodyCache.get(key);
  if (!geo) {
    geo = bodyGeometry(spec);
    bodyCache.set(key, geo);
  }
  const branded = !!opts.pack;
  const paint = paintFor(opts.color ?? 0xcfc8bf, branded);

  const root = new THREE.Group();
  const hull = new THREE.Group();
  if (opts.pack) hull.userData.wrapPack = opts.pack;
  root.add(hull);

  const body = new THREE.Mesh(geo.paint, paint);
  body.castShadow = true;
  body.receiveShadow = true;
  hull.add(body);
  hull.add(new THREE.Mesh(geo.glass, shared.glass));
  hull.add(new THREE.Mesh(geo.trim, shared.trim));
  hull.add(new THREE.Mesh(geo.chrome, shared.chrome));

  const head = new THREE.MeshStandardMaterial({ color: 0xf2ecd6, emissive: 0xffe2a8, emissiveIntensity: opts.parked ? 0.05 : 0.6, roughness: 0.25 });
  const brake = new THREE.MeshStandardMaterial({ color: 0x5a0c0c, emissive: 0xff2020, emissiveIntensity: 0.2, roughness: 0.3 });
  const blink = new THREE.MeshStandardMaterial({ color: 0x6a4410, emissive: 0xff9a1a, emissiveIntensity: 0.05, roughness: 0.35 });
  hull.add(new THREE.Mesh(geo.head, head));
  hull.add(new THREE.Mesh(geo.brake, brake));
  hull.add(new THREE.Mesh(geo.blink, blink));

  if (opts.pack) {
    for (const decal of geo.decals) {
      const mesh = new THREE.Mesh(decal.geo, paint);
      mesh.userData.wrapFace = decal.face;
      mesh.userData.wrapPack = opts.pack;
      hull.add(mesh);
    }
  }

  const shadow = new THREE.Mesh(geo.shadow, shared.shadow);
  shadow.renderOrder = -1;
  root.add(shadow);

  const wheels: THREE.Group[] = [];
  for (const [x, z] of geo.wheelSpots) {
    const wheel = makeWheel();
    wheel.position.set(x, WHEEL_RADIUS, z);
    if (z < 0) wheel.rotation.y = Math.PI;
    root.add(wheel);
    wheels.push(wheel);
  }

  return { root, hull, wheels, headlights: [head], brakes: [brake], blinkers: [blink] };
}
