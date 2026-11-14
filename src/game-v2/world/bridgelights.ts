import * as THREE from "three";
import { lerp, smooth } from "../core/util";
import { FAR_BANK_Z, RIVER_Z } from "./map";

/** Where the M bridge crosses, and the shape of it. The steel in `landmarks.ts` is built from the same numbers. */
export const BRIDGE = { x: -196, z0: RIVER_Z - 4, z1: FAR_BANK_Z + 6, deckY: 13, side: 7.6, rise: 30 };

export type BridgeShow = {
  group: THREE.Group;
  /** The colour the river under it picks up right now. */
  glow: THREE.Color;
  /** Eight colours along the span, near bank to far, for the river to mirror. */
  strip: Float32Array;
  /** The programme that is playing. */
  programme: string;
  update(dt: number, lights: number): void;
};

/** `u` runs 0..1 from the near bank to the far one; `i` is the lamp's own number. */
type Paint = (u: number, t: number, i: number, out: THREE.Color) => void;

const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

const PROGRAMMES: { name: string; paint: Paint }[] = [
  {
    // White water running down a blue river.
    name: "river",
    paint: (u, t, _i, c) => {
      const w = Math.pow(0.5 + 0.5 * Math.sin(u * 30 - t * 2.4), 5);
      c.setRGB(0.1 + w * 1.5, 0.38 + w * 1.3, 1.5 + w * 0.6);
    },
  },
  {
    // The brand's green, marching across, with a few lamps popping white.
    name: "sack",
    paint: (u, t, i, c) => {
      const band = (((u * 9 - t * 0.7) % 1) + 1) % 1;
      const on = band < 0.55 ? 1 : 0.12;
      const spark = hash(i + Math.floor(t * 7) * 13.7) > 0.965 ? 1.6 : 0;
      c.setRGB(0.3 * on + spark, 1.9 * on + spark, 0.12 * on + spark);
    },
  },
  {
    name: "rainbow",
    paint: (u, t, _i, c) => {
      c.setHSL((((u * 1.4 - t * 0.11) % 1) + 1) % 1, 1, 0.55).multiplyScalar(1.7);
    },
  },
  {
    // Memphis blue and gold, trading places.
    name: "blue and gold",
    paint: (u, t, _i, c) => {
      const s = smooth(0.5 + 0.5 * Math.sin(u * 16 + t * 0.9));
      c.setRGB(lerp(0.12, 2.0, s), lerp(0.42, 1.35, s), lerp(1.9, 0.2, s));
    },
  },
  {
    // Beale Street pink, beating out from the middle of the span.
    name: "beale",
    paint: (u, t, _i, c) => {
      const w = 0.5 + 0.5 * Math.sin(Math.abs(u - 0.5) * 40 - t * 4.2);
      c.setRGB(1.9 * (0.35 + 0.65 * w), 0.25 + 0.5 * (1 - w), 1.5 * (0.5 + 0.5 * (1 - w)));
    },
  },
];

const SPAN = 18;
const CROSS = 2.2;

/**
 * The lights on the M bridge. By day they are dark conduit along the arches. From dusk they
 * run a show: every lamp along both arches, the hangers under them and the rail of the deck
 * takes its colour from the programme that is playing, and the river below takes it from them.
 */
export function buildBridgeLights(): BridgeShow {
  const { x, z0, z1, deckY, side, rise } = BRIDGE;
  const group = new THREE.Group();
  group.name = "bridge lights";
  const span = (z1 - z0) / 2;
  const tubeMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
  const spotMat = new THREE.MeshBasicMaterial({ toneMapped: false, fog: false });

  // Arches: a tube of light riding on each steel arch, coloured ring by ring.
  const RINGS = 40;
  const AROUND = 5;
  const tubes: { colors: THREE.BufferAttribute; u0: number }[] = [];
  for (const s of [-side, side]) {
    for (let k = 0; k < 2; k++) {
      const a = z0 + span * k;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        pts.push(new THREE.Vector3(x + s, deckY + 1.3 + Math.sin(t * Math.PI) * rise, a + span * t));
      }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), RINGS, 0.36, AROUND, false);
      const colors = new THREE.BufferAttribute(new Float32Array(geo.attributes.position!.count * 3), 3);
      colors.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("color", colors);
      const mesh = new THREE.Mesh(geo, tubeMat);
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      tubes.push({ colors, u0: k * 0.5 });
    }
  }

  // Hangers and the rail of the deck: one small lamp each.
  const spots: { u: number; gain: number }[] = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const place: { p: THREE.Vector3; s: THREE.Vector3 }[] = [];
  for (const s of [-side, side]) {
    for (let k = 0; k < 2; k++) {
      for (let i = 2; i <= 14; i += 2) {
        const t = i / 16;
        const top = deckY + Math.sin(t * Math.PI) * rise;
        place.push({ p: new THREE.Vector3(x + s, (top + deckY) / 2, z0 + span * (k + t)), s: new THREE.Vector3(0.34, top - deckY, 0.34) });
        spots.push({ u: (k + t) / 2, gain: 0.3 });
      }
    }
    const RAIL = 46;
    for (let i = 0; i < RAIL; i++) {
      const u = (i + 0.5) / RAIL;
      place.push({ p: new THREE.Vector3(x + s * 1.02, deckY + 1, z0 + (z1 - z0) * u), s: new THREE.Vector3(0.3, 0.3, (Math.abs(z1 - z0) / RAIL) * 0.7) });
      spots.push({ u, gain: 0.75 });
    }
  }
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), spotMat, place.length);
  place.forEach((pl, i) => lamps.setMatrixAt(i, m4.compose(pl.p, q, pl.s)));
  lamps.instanceMatrix.needsUpdate = true;
  lamps.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(place.length * 3), 3);
  lamps.instanceColor.setUsage(THREE.DynamicDrawUsage);
  lamps.frustumCulled = false;
  group.add(lamps);

  const a = new THREE.Color();
  const b = new THREE.Color();
  const off = new THREE.Color(0.1, 0.11, 0.12);
  let time = Math.random() * SPAN * PROGRAMMES.length;
  let shown = -1;

  const at = (u: number, i: number, now: number, fade: number, k: number, out: THREE.Color) => {
    PROGRAMMES[now]!.paint(u, time, i, out);
    if (fade < 1) {
      PROGRAMMES[(now + PROGRAMMES.length - 1) % PROGRAMMES.length]!.paint(u, time, i, b);
      out.lerpColors(b, out, fade);
    }
    // Coming on at dusk: dark conduit first, then the show.
    return out.multiplyScalar(k).lerp(off, 1 - Math.min(1, k * 3));
  };

  const show: BridgeShow = {
    group,
    glow: new THREE.Color(0, 0, 0),
    strip: new Float32Array(24),
    programme: "",
    update(dt, lights) {
      const k = smooth(Math.min(1, Math.max(0, (lights - 0.35) / 0.3)));
      if (k <= 0 && shown === 0) return;
      shown = k;
      time += dt;
      const now = Math.floor(time / SPAN) % PROGRAMMES.length;
      const fade = smooth(Math.min(1, (time % SPAN) / CROSS));
      show.programme = k > 0 ? PROGRAMMES[now]!.name : "";
      let n = 0;
      for (const tube of tubes) {
        const arr = tube.colors.array as Float32Array;
        for (let r = 0; r <= RINGS; r++) {
          at(tube.u0 + (r / RINGS) * 0.5, n++, now, fade, k, a);
          for (let j = 0; j <= AROUND; j++) {
            const o = (r * (AROUND + 1) + j) * 3;
            arr[o] = a.r;
            arr[o + 1] = a.g;
            arr[o + 2] = a.b;
          }
        }
        tube.colors.needsUpdate = true;
      }
      const inst = lamps.instanceColor!.array as Float32Array;
      for (let i = 0; i < spots.length; i++) {
        const sp = spots[i]!;
        at(sp.u, n++, now, fade, k * sp.gain, a);
        inst[i * 3] = a.r;
        inst[i * 3 + 1] = a.g;
        inst[i * 3 + 2] = a.b;
      }
      lamps.instanceColor!.needsUpdate = true;
      // What the water sees of it.
      show.glow.setRGB(0, 0, 0);
      for (let i = 0; i < 8; i++) {
        at(i / 7, i * 31, now, fade, k, a);
        if (k <= 0) a.setRGB(0, 0, 0);
        show.strip[i * 3] = a.r;
        show.strip[i * 3 + 1] = a.g;
        show.strip[i * 3 + 2] = a.b;
        show.glow.r += a.r / 8;
        show.glow.g += a.g / 8;
        show.glow.b += a.b / 8;
      }
    },
  };
  show.update(0, 0);
  return show;
}
