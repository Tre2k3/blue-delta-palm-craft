import * as THREE from "three";
import { PEDS } from "../assets/cast";
import { rng } from "../core/util";
import { COURT, PIER, TRUCKS, WALK, slab, type Rect } from "../world/map";
import { Card } from "./card";

type Walker = { card: Card; ring: Rect; s: number; dir: 1 | -1; pace: number; wait: number };

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

/** Memphians: walkers doing laps of their block and a few regulars who stay put. */
export class People {
  readonly group = new THREE.Group();
  private walkers: Walker[] = [];
  private standing: Card[] = [];

  constructor(count: number) {
    const rand = rng(1968);
    for (let i = 0; i < count; i++) {
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
    const spots: [number, number, number][] = [
      [COURT.cx + 10.2, COURT.cz - 4.5, -Math.PI / 2],
      [COURT.cx + 11.2, COURT.cz + 2.2, -Math.PI / 2],
      [COURT.cx + 10.2, COURT.cz + 5.8, -Math.PI / 2],
      [COURT.cx - 10.4, COURT.cz - 9, Math.PI / 2],
      [COURT.cx - 10.9, COURT.cz - 3.2, Math.PI / 2],
      [COURT.cx - 10.4, COURT.cz + 4, Math.PI / 2],
      [COURT.cx + 10.6, COURT.cz - 10.5, -Math.PI / 2],
      [TRUCKS.x - 6.5, TRUCKS.z - 7, 0],
      [TRUCKS.x + 8, TRUCKS.z - 5.5, 0],
      [5, -167, Math.PI],
      [-27, -169, 0],
      [PIER.x - 1.2, -212, Math.PI],
    ];
    spots.forEach(([x, z, h], i) => {
      const kind = PEDS[(i * 3 + 1) % PEDS.length]!;
      const card = new Card(kind.art, kind.height);
      card.place(x, z);
      card.heading = h;
      this.group.add(card.group);
      this.standing.push(card);
    });
  }

  update(dt: number, camera: THREE.Vector3, tint: THREE.Color, player: { x: number; z: number }) {
    for (const w of this.walkers) {
      ringAt(w.ring, w.s, _p);
      const far = Math.abs(_p.x - camera.x) + Math.abs(_p.z - camera.z) > 150;
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
    for (const c of this.standing) {
      c.visible = Math.abs(c.group.position.x - camera.x) + Math.abs(c.group.position.z - camera.z) < 140;
      c.update(dt, camera, tint);
    }
  }
}
