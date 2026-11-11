import * as THREE from "three";
import { PEDS } from "../assets/cast";
import { rng } from "../core/util";
import { BOWL, COURT, FUN, HQ, KART_TRACK, PIER, RACE_MEET, RIVER_Z, ROAD_HALF, STREETS_Z, TRUCKS, WALK, slab, type Rect } from "../world/map";
import { Card } from "./card";

type Walker = { card: Card; ring: Rect; s: number; dir: 1 | -1; pace: number; wait: number };
/** Someone who stays put: where they are, what they are watching, and how long they keep jumping. */
type Stander = { card: Card; x: number; z: number; fx: number; fz: number; hop: number; seed: number };

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
      this.walkers.push({ card, ring, s: rand() * 400, dir: rand() > 0.5 ? 1 : -1, pace: 1.15 + rand() * 0.5, wait: 0 });
    }

    let n = 0;
    const stand = (x: number, z: number, fx: number, fz: number) => {
      const kind = PEDS[(n * 3 + 1 + Math.floor(rand() * 3)) % PEDS.length]!;
      const card = new Card(kind.art, kind.height * (0.94 + rand() * 0.1));
      const jx = (rand() - 0.5) * 0.5;
      const jz = (rand() - 0.5) * 0.5;
      card.place(x + jx, z + jz);
      this.group.add(card.group);
      this.standing.push({ card, x: x + jx, z: z + jz, fx, fz, hop: 0, seed: rand() * 10 });
      n++;
    };
    // The court: both sidelines, inside the fence, watching the floor.
    for (const side of [-1, 1]) for (let z = -11; z <= 11; z += dense ? 2.4 : 4.8) stand(COURT.cx + side * (COURT.halfW + 1.1), COURT.cz + z, COURT.cx, COURT.cz + z * 0.4);
    // The truck lot: a line at each window, people at the tables, a knot in front of Veli's screen.
    for (const off of [-13, -1, 13]) for (let k = 0; k < (dense ? 3 : 2); k++) stand(TRUCKS.x + off - 0.3 + k * 0.5, TRUCKS.z - 4.4 - k * 1.2, TRUCKS.x + off - 1.2, TRUCKS.z);
    for (const tx of [-14, -4, 6, 16]) stand(TRUCKS.x + tx + 1.6, TRUCKS.z - 10.6, TRUCKS.x + tx, TRUCKS.z - 9.5);
    for (const [vx, vz] of [
      [4.2, -5.6],
      [5.8, -6.6],
      [7.2, -5.4],
      [6.4, -8],
    ] as const)
      stand(TRUCKS.x + vx, TRUCKS.z + vz, TRUCKS.x + 5.6, TRUCKS.z);
    // The plaza in front of the boutique, and the river rail.
    for (const [px, pz] of [
      [-24, -168.5],
      [-16.5, -167],
      [-11, -169.5],
      [-28, -165],
      [-3, -166],
      [8, -168],
    ] as const)
      stand(px, pz, HQ.doorX, HQ.frontZ);
    for (let x = -60; x <= 40; x += dense ? 16 : 30) stand(x, RIVER_Z + 2.4, x, RIVER_Z - 30);
    for (const pz of [-203, -211, -219]) stand(PIER.x + (pz % 2 ? 1.3 : -1.3), pz, PIER.x, pz - 12);
    // Riverside Strip, where the racers meet.
    for (const [rx, rz] of [
      [2.4, 0.6],
      [-2.2, 1.2],
      [3.8, -1.4],
      [-3.6, -1],
    ] as const)
      stand(RACE_MEET.x + rx, RACE_MEET.z + rz, RACE_MEET.x, RACE_MEET.z);
    // Beale Street: both sidewalks, block after block.
    const beale = STREETS_Z[1];
    for (let x = -112; x <= 112; x += dense ? 9 : 18) {
      const side = Math.round(x / 9) % 2 ? 1 : -1;
      if (Math.abs(((x + 128) % 64) - 0) < ROAD_HALF + 2 || Math.abs(((x + 128) % 64) - 64) < ROAD_HALF + 2) continue;
      stand(x, beale + side * (ROAD_HALF + 1.7), x + 3, beale);
    }
    // 901 Bowl, the Fun House door, and the fence round the kart track.
    for (const bx of [-4.5, -2.8, 3.4, 5]) stand(BOWL.doorX + bx, BOWL.frontZ + 2.2, BOWL.doorX, BOWL.frontZ);
    for (const fx of [-6, -4.4, -2.6, 3, 4.6, 6.4]) stand(FUN.doorX + fx, FUN.frontZ - 2.4, FUN.doorX, FUN.frontZ);
    const k = KART_TRACK;
    for (const side of [-1, 1]) for (let x = -16; x <= 16; x += dense ? 3.2 : 6.4) stand(k.cx + x, k.cz + side * (k.halfZ + k.width / 2 + 2.3), k.cx + x * 0.6, k.cz);
    for (const side of [-1, 1]) for (const z of [-3, 0, 3]) stand(k.cx + side * (k.halfX + k.width / 2 + 2.4), k.cz + z, k.cx, k.cz);
  }

  /** Everyone standing within `r` of a point jumps for a moment. */
  cheer(x: number, z: number, r: number, seconds = 1.3) {
    for (const s of this.standing) if (Math.hypot(s.x - x, s.z - z) < r) s.hop = seconds * (0.7 + ((s.seed * 7) % 1) * 0.6);
  }

  /**
   * `beat` is the song playing on the truck lot (seconds in, or -1) and `bx`, `bz` where it is
   * coming from: people close enough to hear it move to it.
   */
  update(dt: number, camera: THREE.Vector3, tint: THREE.Color, player: { x: number; z: number }, beat = -1, bx = 0, bz = 0) {
    this.time += dt;
    for (const w of this.walkers) {
      ringAt(w.ring, w.s, _p);
      const far = Math.abs(_p.x - camera.x) + Math.abs(_p.z - camera.z) > this.reach;
      const near = Math.hypot(_p.x - player.x, _p.z - player.z) < 1.3;
      w.wait = near ? 0.6 : Math.max(0, w.wait - dt);
      const v = w.wait > 0 ? 0 : w.pace;
      w.s += v * w.dir * dt;
      w.card.visible = !far;
      if (far) {
        w.card.group.visible = false;
        continue;
      }
      w.card.place(_p.x, _p.z);
      w.card.heading = w.dir > 0 ? _p.heading : _p.heading + Math.PI;
      w.card.speed = v;
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
      const dx = player.x - s.x;
      const dz = player.z - s.z;
      const close = dx * dx + dz * dz < 9;
      c.heading = close ? Math.atan2(dx, dz) : Math.atan2(s.fx - s.x, s.fz - s.z);
      if (s.hop > 0) {
        s.hop = Math.max(0, s.hop - dt);
        c.lift = Math.abs(Math.sin((this.time + s.seed) * 9)) * 0.24 * Math.min(1, s.hop * 2);
      } else c.lift = 0;
      c.groove = beat >= 0 && Math.hypot(s.x - bx, s.z - bz) < 16 ? beat + s.seed * 0.05 : -1;
      c.update(dt, camera, tint);
    }
  }
}
