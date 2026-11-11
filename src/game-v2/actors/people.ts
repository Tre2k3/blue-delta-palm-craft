import * as THREE from "three";
import { PEDS } from "../assets/cast";
import { rng } from "../core/util";
import { COURT, KART_TRACK, PIER, RACE_MEET, WALK, slab, type Rect } from "../world/map";
import { Card } from "./card";
import { stepClear, type Moving } from "./crowd";

type Walker = { card: Card; ring: Rect; s: number; dir: 1 | -1; pace: number; wait: number; ox: number; oz: number; hop: number };
/** Someone who stays put: where they are, what they are watching, and how long they keep jumping. */
type Stander = { card: Card; x: number; z: number; fx: number; fz: number; hop: number; seed: number; ox: number; oz: number };

/** Point `s` metres clockwise round a rectangle, starting at its north-west corner. */
function ringAt(r: Rect, s: number, out: { x: number; z: number; heading: number }) {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  const p = 2 * (w + d);
  let t = ((s % p) + p) % p;
  if (t < w) {
    out.x = r.minX + t;
    out.z = r.minZ;
    out.heading = Math.PI / 2;
  } else if ((t -= w) < d) {
    out.x = r.maxX;
    out.z = r.minZ + t;
    out.heading = 0;
  } else if ((t -= d) < w) {
    out.x = r.maxX - t;
    out.z = r.maxZ;
    out.heading = -Math.PI / 2;
  } else {
    t -= w;
    out.x = r.minX;
    out.z = r.maxZ - t;
    out.heading = Math.PI;
  }
}

const _p = { x: 0, z: 0, heading: 0 };
const _q = { x: 0, z: 0 };

/**
 * Memphians. Walkers do laps of their block; everyone else has somewhere to be: the rail at
 * the court, the line at a food truck, the fence at the kart track, a corner on Beale. A crowd
 * faces what it came to watch, turns to Benji when he walks up, and jumps when something lands.
 */
export class People {
  readonly group = new THREE.Group();
  private walkers: Walker[] = [];
  private standing: Stander[] = [];
  /** How far away people are still drawn. */
  private reach: number;
  private time = 0;

  constructor(walkers: number, dense: boolean) {
    this.reach = dense ? 150 : 115;
    const rand = rng(1968);
    for (let i = 0; i < walkers; i++) {
      const col = Math.floor(rand() * 4);
      const row = Math.floor(rand() * 4);
      const sl = slab(col, row);
      const inset = WALK / 2;
      const ring = { minX: sl.minX + inset, maxX: sl.maxX - inset, minZ: sl.minZ + inset, maxZ: sl.maxZ - inset };
      const kind = PEDS[i % PEDS.length]!;
      const card = new Card(kind.art, kind.height);
      this.group.add(card.group);
      this.walkers.push({ card, ring, s: rand() * 400, dir: rand() > 0.5 ? 1 : -1, pace: 1.15 + rand() * 0.5, wait: 0, ox: 0, oz: 0, hop: 0 });
    }

    let n = 0;
    const stand = (x: number, z: number, fx: number, fz: number) => {
      const kind = PEDS[(n * 3 + 1 + Math.floor(rand() * 3)) % PEDS.length]!;
      const card = new Card(kind.art, kind.height * (0.94 + rand() * 0.1));
      const jx = (rand() - 0.5) * 0.5;
      const jz = (rand() - 0.5) * 0.5;
      card.place(x + jx, z + jz);
      this.group.add(card.group);
      this.standing.push({ card, x: x + jx, z: z + jz, fx, fz, hop: 0, seed: rand() * 10, ox: 0, oz: 0 });
      n++;
    };
    // The court: both sidelines, inside the fence, watching the floor.
    for (const side of [-1, 1]) for (let z = -11; z <= 11; z += dense ? 2.4 : 4.8) stand(COURT.cx + side * (COURT.halfW + 1.1), COURT.cz + z, COURT.cx, COURT.cz + z * 0.4);
    for (const pz of [-203, -211, -219]) stand(PIER.x + (pz % 2 ? 1.3 : -1.3), pz, PIER.x, pz - 12);
    // Riverside Strip, where the racers meet.
    for (const [rx, rz] of [
      [2.4, 0.6],
      [-2.2, 1.2],
      [3.8, -1.4],
      [-3.6, -1],
    ] as const)
      stand(RACE_MEET.x + rx, RACE_MEET.z + rz, RACE_MEET.x, RACE_MEET.z);
    // The fence round the kart track.
    const k = KART_TRACK;
    for (const side of [-1, 1]) for (let x = -16; x <= 16; x += dense ? 3.2 : 6.4) stand(k.cx + x, k.cz + side * (k.halfZ + k.width / 2 + 2.3), k.cx + x * 0.6, k.cz);
    for (const side of [-1, 1]) for (const z of [-3, 0, 3]) stand(k.cx + side * (k.halfX + k.width / 2 + 2.4), k.cz + z, k.cx, k.cz);
  }

  /**
   * Nobody gets run over: anyone a moving car comes at jumps clear of it, and steps back to
   * where they were once it has gone by. Returns true while they are out of its way.
   */
  private dodge(x: number, z: number, o: { ox: number; oz: number; hop: number }, car: Moving | null, dt: number) {
    if (car && car.speed > 2.5) {
      _q.x = x + o.ox;
      _q.z = z + o.oz;
      if (stepClear(_q, car, dt)) {
        o.ox = _q.x - x;
        o.oz = _q.z - z;
        o.hop = Math.max(o.hop, 0.5);
        return true;
      }
      if (Math.hypot(_q.x - car.x, _q.z - car.z) < 7) return true;
    }
    const back = Math.min(1, dt * 1.6);
    o.ox -= o.ox * back;
    o.oz -= o.oz * back;
    return false;
  }

  /** Everyone standing within `r` of a point jumps for a moment. */
  cheer(x: number, z: number, r: number, seconds = 1.3) {
    for (const s of this.standing) if (Math.hypot(s.x - x, s.z - z) < r) s.hop = seconds * (0.7 + ((s.seed * 7) % 1) * 0.6);
  }

  /**
   * `beat` is the song playing on the truck lot (seconds in, or -1) and `bx`, `bz` where it is
   * coming from: people close enough to hear it move to it.
   */
  update(dt: number, camera: THREE.Vector3, tint: THREE.Color, player: { x: number; z: number }, beat = -1, bx = 0, bz = 0, car: Moving | null = null) {
    this.time += dt;
    for (const w of this.walkers) {
      ringAt(w.ring, w.s, _p);
      const far = Math.abs(_p.x - camera.x) + Math.abs(_p.z - camera.z) > this.reach;
      const near = Math.hypot(_p.x - player.x, _p.z - player.z) < 1.3;
      const clear = this.dodge(_p.x, _p.z, w, car, dt);
      w.wait = near || clear ? 0.6 : Math.max(0, w.wait - dt);
      const v = w.wait > 0 ? 0 : w.pace;
      w.s += v * w.dir * dt;
      w.card.visible = !far;
      if (far) {
        w.card.group.visible = false;
        continue;
      }
      w.card.place(_p.x + w.ox, _p.z + w.oz);
      w.card.heading = w.dir > 0 ? _p.heading : _p.heading + Math.PI;
      w.card.speed = v;
      w.hop = Math.max(0, w.hop - dt);
      w.card.lift = w.hop > 0 ? Math.abs(Math.sin(w.hop * 12)) * 0.22 : 0;
      w.card.update(dt, camera, tint);
    }
    for (const s of this.standing) {
      const c = s.card;
      if (Math.abs(s.x - camera.x) + Math.abs(s.z - camera.z) > this.reach) {
        c.visible = false;
        c.group.visible = false;
        continue;
      }
      c.visible = true;
      this.dodge(s.x, s.z, s, car, dt);
      c.place(s.x + s.ox, s.z + s.oz);
      const dx = player.x - s.x;
      const dz = player.z - s.z;
      const close = dx * dx + dz * dz < 9;
      c.heading = close ? Math.atan2(dx, dz) : Math.atan2(s.fx - s.x, s.fz - s.z);
      if (s.hop > 0) {
        s.hop = Math.max(0, s.hop - dt);
        c.lift = Math.abs(Math.sin((this.time + s.seed) * 9)) * 0.24 * Math.min(1, s.hop * 2);
      } else c.lift = Math.sin(this.time * 0.6 + s.seed * 3) > 0.86 ? Math.abs(Math.sin((this.time + s.seed) * 8)) * 0.12 : 0;
      c.groove = beat >= 0 && Math.hypot(s.x - bx, s.z - bz) < 16 ? beat + s.seed * 0.05 : -1;
      c.update(dt, camera, tint);
    }
  }
}
