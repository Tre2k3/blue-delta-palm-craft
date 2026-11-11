import * as THREE from "three";
import { rng } from "../core/util";
import { EDGE, LANE, STREETS_X, STREETS_Z } from "../world/map";
import type { SignalState } from "../world/streets";
import { CarModel, PAINTS, type CarKind } from "./vehicle";

type Dir = { dx: number; dz: number };
const DIRS: Dir[] = [
  { dx: 1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: -1, dz: 0 },
  { dx: 0, dz: -1 },
];

type Car = {
  model: CarModel;
  /** Junction being left and the way out of it. */
  i: number;
  j: number;
  dir: number;
  /** Distance travelled along the current leg. */
  s: number;
  /** Curve through the junction at the start of this leg, if the car turned into it. */
  turn: { ax: number; az: number; cx: number; cz: number; bx: number; bz: number; len: number } | null;
  speed: number;
  cruise: number;
  x: number;
  z: number;
  heading: number;
  nextDir: number;
};

export type TrafficCar = { x: number; z: number; radius: number; speed: number };

const STOP_BACK = EDGE + 1.6;

function inGrid(i: number, j: number) {
  return i >= 0 && i < STREETS_X.length && j >= 0 && j < STREETS_Z.length;
}

/**
 * Cars working the grid. Right-hand traffic, one lane each way, every junction on the
 * shared signal clock. Cars go straight or turn right; they only turn left where the road ends,
 * so nothing crosses an oncoming lane on a green.
 */
export class Traffic {
  readonly group = new THREE.Group();
  readonly cars: Car[] = [];
  private rand = rng(4242);
  hidden = false;

  constructor(count: number) {
    const kinds: CarKind[] = ["sedan", "suv", "sedan", "coupe", "sedan", "van", "suv", "sedan"];
    let n = 0;
    let guard = 0;
    while (this.cars.length < count && guard++ < 400) {
      const i = Math.floor(this.rand() * STREETS_X.length);
      const j = Math.floor(this.rand() * STREETS_Z.length);
      const dir = Math.floor(this.rand() * 4);
      const d = DIRS[dir]!;
      if (!inGrid(i + d.dx, j + d.dz)) continue;
      if (this.cars.some((c) => c.i === i && c.j === j && c.dir === dir)) continue;
      const model = new CarModel(kinds[n % kinds.length]!, PAINTS[n % PAINTS.length]!);
      n += 1;
      const car: Car = { model, i, j, dir, s: STOP_BACK + 6 + this.rand() * 20, turn: null, speed: 0, cruise: 9 + this.rand() * 3.5, x: 0, z: 0, heading: 0, nextDir: dir };
      car.nextDir = this.choose(car);
      this.poseOnLeg(car);
      this.group.add(model.group);
      this.cars.push(car);
    }
  }

  private legLength(car: Car) {
    const d = DIRS[car.dir]!;
    return Math.abs(d.dx ? STREETS_X[car.i + d.dx]! - STREETS_X[car.i]! : STREETS_Z[car.j + d.dz]! - STREETS_Z[car.j]!);
  }

  /** Lane point `s` metres out from junction (i, j) along `dir`. */
  private lanePoint(i: number, j: number, dir: number, s: number) {
    const d = DIRS[dir]!;
    return { x: STREETS_X[i]! + d.dx * s - d.dz * LANE, z: STREETS_Z[j]! + d.dz * s + d.dx * LANE };
  }

  private choose(car: Car) {
    const d = DIRS[car.dir]!;
    const ni = car.i + d.dx;
    const nj = car.j + d.dz;
    const right = (car.dir + 1) % 4;
    const left = (car.dir + 3) % 4;
    const can = (dir: number) => inGrid(ni + DIRS[dir]!.dx, nj + DIRS[dir]!.dz);
    const opts: number[] = [];
    if (can(car.dir)) opts.push(car.dir, car.dir);
    if (can(right)) opts.push(right);
    if (!can(car.dir) && can(left)) opts.push(left);
    if (!opts.length) opts.push(can(left) ? left : (car.dir + 2) % 4);
    return opts[Math.floor(this.rand() * opts.length)]!;
  }

  private poseOnLeg(car: Car) {
    const d = DIRS[car.dir]!;
    if (car.turn && car.s < car.turn.len) {
      const t = car.s / car.turn.len;
      const u = 1 - t;
      const tn = car.turn;
      car.x = u * u * tn.ax + 2 * u * t * tn.cx + t * t * tn.bx;
      car.z = u * u * tn.az + 2 * u * t * tn.cz + t * t * tn.bz;
      const tx = 2 * u * (tn.cx - tn.ax) + 2 * t * (tn.bx - tn.cx);
      const tz = 2 * u * (tn.cz - tn.az) + 2 * t * (tn.bz - tn.cz);
      car.heading = Math.atan2(tx, tz);
      return;
    }
    const along = car.turn ? STOP_BACK + (car.s - car.turn.len) : car.s;
    const p = this.lanePoint(car.i, car.j, car.dir, along);
    car.x = p.x;
    car.z = p.z;
    car.heading = Math.atan2(d.dx, d.dz);
  }

  /** Distance left on this leg before the stop line of the next junction. */
  private toStop(car: Car) {
    const total = (car.turn ? car.turn.len - STOP_BACK : 0) + this.legLength(car) - STOP_BACK;
    return total - car.s;
  }

  /** `focus` is where the player is: cars a long way from it keep driving but are not drawn. */
  update(dt: number, signals: SignalState, blockers: TrafficCar[], focus?: { x: number; z: number }) {
    this.group.visible = !this.hidden;
    if (this.hidden) return;
    for (const car of this.cars) {
      const d = DIRS[car.dir]!;
      const axis = d.dx ? "ew" : "ns";
      const left = this.toStop(car);
      let want = car.cruise;
      // Hold at the line on amber and red. A car already past it clears the junction.
      if (signals[axis] !== "green" && left > -0.5 && left < 14) want = Math.min(want, Math.max(0, (left - 0.4) * 1.4));
      // Keep a gap to whatever is ahead in the same lane: traffic, Benji, his car.
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      const check = (ox: number, oz: number, radius: number) => {
        const rx = ox - car.x;
        const rz = oz - car.z;
        const ahead = rx * fx + rz * fz;
        const side = Math.abs(rx * fz - rz * fx);
        if (ahead > 0.5 && ahead < 16 && side < 1.5 + radius) want = Math.min(want, Math.max(0, (ahead - 4.6 - radius) * 1.2));
      };
      for (const other of this.cars) if (other !== car) check(other.x, other.z, 1.2);
      for (const b of blockers) check(b.x, b.z, b.radius);
      const rate = want < car.speed ? 14 : 4.5;
      car.speed += Math.max(-rate * dt, Math.min(rate * dt, want - car.speed));
      const travel = car.speed * dt;
      car.s += travel;

      // Through the stop line: take the planned way out and start the next leg.
      if (this.toStop(car) <= 0) {
        const ni = car.i + d.dx;
        const nj = car.j + d.dz;
        const out = car.nextDir;
        const a = this.lanePoint(car.i, car.j, car.dir, this.legLength(car) - STOP_BACK);
        const ax = a.x;
        const az = a.z;
        const b = this.lanePoint(ni, nj, out, STOP_BACK);
        let cx = (ax + b.x) / 2;
        let cz = (az + b.z) / 2;
        if (out !== car.dir) {
          // Corner of the two lane lines.
          cx = d.dx ? b.x : ax;
          cz = d.dx ? az : b.z;
        }
        const len = out === car.dir ? Math.hypot(b.x - ax, b.z - az) : (Math.hypot(cx - ax, cz - az) + Math.hypot(b.x - cx, b.z - cz)) * 0.86;
        car.turn = { ax, az, cx, cz, bx: b.x, bz: b.z, len };
        car.i = ni;
        car.j = nj;
        car.dir = out;
        car.s = 0;
        car.nextDir = this.choose(car);
      }
      const before = car.heading;
      this.poseOnLeg(car);
      const steer = Math.max(-0.5, Math.min(0.5, (before - car.heading) * 6));
      const seen = !focus || Math.abs(car.x - focus.x) + Math.abs(car.z - focus.z) < 190;
      car.model.group.visible = seen;
      if (!seen) continue;
      car.model.place(car.x, 0, car.z, car.heading);
      car.model.roll(travel, steer);
    }
  }

  setLights(head: number) {
    for (const car of this.cars) car.model.lamps(head, car.speed < 1 ? 2.2 : 0.4);
  }

  list(): TrafficCar[] {
    return this.hidden ? [] : this.cars.map((c) => ({ x: c.x, z: c.z, radius: 1.3, speed: c.speed }));
  }
}
