import * as THREE from "three";
import { Card } from "../actors/card";
import { PEDS } from "../assets/cast";
import type { HudState } from "../core/types";
import { clamp, damp, rng, wrapAngle } from "../core/util";
import type { Activity, Game } from "../game";
import type { RinkFloor } from "../world/rink";

/** A session on the floor, seconds. */
const SESSION = 60;
/** Cruising on held W, the most a push can add, the fastest anyone goes, m/s. */
const CRUISE = 4.2;
const TOP = 9.5;
/** How fast he turns, rad/s, and how quickly the floor takes speed off him. */
const TURN = 2.3;
const ROLL = 0.18;

const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();

/**
 * How far a point is outside the floor's rounded oblong (negative inside), and the way back in.
 */
export function outside(f: RinkFloor, x: number, z: number, inset = 0) {
  const hx = f.halfX - inset;
  const hz = f.halfZ - inset;
  const r = Math.max(0.5, f.corner - inset);
  const qx = Math.abs(x - f.x) - (hx - r);
  const qz = Math.abs(z - f.z) - (hz - r);
  const ox = Math.max(qx, 0);
  const oz = Math.max(qz, 0);
  const d = Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - r;
  // The way back in, pointing at the middle of the nearest straight or corner.
  let nx = 0;
  let nz = 0;
  if (ox > 0 || oz > 0) {
    const len = Math.hypot(ox, oz) || 1;
    nx = (-Math.sign(x - f.x) * ox) / len;
    nz = (-Math.sign(z - f.z) * oz) / len;
  } else if (qx > qz) nx = -Math.sign(x - f.x);
  else nz = -Math.sign(z - f.z);
  return { d, nx, nz };
}

/** A point on a loop round the floor, `a` radians round from the east end, anticlockwise from above. */
export function loopAt(f: RinkFloor, a: number, inset: number) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  // A squarish oval: straights down the long sides, round at the ends.
  const k = 0.55;
  return {
    x: f.x + (f.halfX - inset) * Math.sign(c) * Math.pow(Math.abs(c), k),
    z: f.z - (f.halfZ - inset) * Math.sign(s) * Math.pow(Math.abs(s), k),
  };
}

type Skater = { card: Card; a: number; speed: number; inset: number; wobble: number; spin: number };

/**
 * The regulars on the floor: going round all night anticlockwise, some fast on the outside,
 * some slow on the inside, one now and then turning a spin. They skate whether Benji does or not.
 */
export class RinkCrowd {
  readonly group = new THREE.Group();
  private skaters: Skater[] = [];
  private time = 0;

  constructor(
    parent: THREE.Group,
    private floor: RinkFloor,
    count: number,
  ) {
    const rand = rng(1981);
    for (let i = 0; i < count; i++) {
      const kind = PEDS[(i * 5 + 2) % PEDS.length]!;
      const card = new Card(kind.art, kind.height);
      this.group.add(card.group);
      this.skaters.push({
        card,
        a: (i / count) * Math.PI * 2 + rand() * 0.3,
        speed: 2.6 + rand() * 3.2,
        inset: 1.2 + rand() * 4,
        wobble: rand() * 6,
        spin: 0,
      });
    }
    parent.add(this.group);
  }

  update(dt: number, camera: THREE.Vector3, tint: THREE.Color) {
    this.time += dt;
    const f = this.floor;
    for (const s of this.skaters) {
      // Round the floor at a steady pace: radians per second from the path's rough size.
      const reach = (f.halfX + f.halfZ) / 2 - s.inset;
      s.a = wrapAngle(s.a + (s.speed / reach) * dt);
      const p = loopAt(f, s.a, s.inset + Math.sin(this.time * 0.3 + s.wobble) * 0.6);
      const q = loopAt(f, s.a + 0.04, s.inset);
      const heading = Math.atan2(q.x - p.x, q.z - p.z);
      if (s.spin <= 0 && Math.sin(this.time * 0.21 + s.wobble * 3) > 0.995) s.spin = 0.9;
      s.spin = Math.max(0, s.spin - dt);
      s.card.heading = heading + (s.spin > 0 ? (1 - s.spin / 0.9) * Math.PI * 2 : 0);
      // A glide: the legs move slower than the floor goes by.
      s.card.speed = s.speed * 0.42;
      s.card.tilt = Math.sin(this.time * 2.2 + s.wobble) * 0.05;
      s.card.place(p.x, p.z);
      s.card.update(dt, camera, tint, 0);
    }
  }

  /** For the tests. */
  get count() {
    return this.skaters.length;
  }
}

/**
 * A session on the floor at the Crystal Palace. W rolls him along, the stick steers, Space is a
 * push: on the beat it carries him much further than off it. E turns a spin when he has the
 * speed for it. Laps count only the way the floor goes. A minute, then the lights come up.
 */
export class Skate implements Activity {
  hints: [string, string][] = [
    ["W / A / D", "Roll and steer"],
    ["Space", "Push, on the beat"],
    ["E", "Spin"],
    ["Q", "Off the floor"],
  ];
  private on = false;
  private left = SESSION;
  private speed = 0;
  private heading = 0;
  /** Radians round the floor, counting only the right way. */
  private round = 0;
  private lastA = 0;
  private laps = 0;
  private perfect = 0;
  private good = 0;
  private spins = 0;
  private spin = 0;
  private bumps = 0;
  private cool = 0;
  private call = "";
  private callLeft = 0;
  private look = new THREE.Vector3();
  private pushLeft = 0;

  constructor(
    private g: Game,
    private floor: RinkFloor,
  ) {}

  start() {
    const g = this.g;
    const f = this.floor;
    this.on = true;
    this.left = SESSION;
    this.speed = 0;
    this.laps = this.perfect = this.good = this.spins = this.bumps = 0;
    this.round = 0;
    this.spin = 0;
    this.cool = 0;
    // On at the near straight, facing the way the floor goes.
    const p = loopAt(f, -Math.PI / 2, 2.2);
    const q = loopAt(f, -Math.PI / 2 + 0.05, 2.2);
    g.pos.x = p.x;
    g.pos.z = p.z;
    this.heading = Math.atan2(q.x - p.x, q.z - p.z);
    g.heading = this.heading;
    g.camYaw = this.heading;
    this.lastA = Math.atan2(-(p.z - f.z), p.x - f.x);
    g.benji.pose = null;
    this.say("Push on the beat. Go with the floor.", 3);
    this.frame(0, true);
    g.push();
  }

  private say(text: string, seconds = 1.4) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  /** How close to a beat the music is right now: 0 on it, 0.5 halfway between. -1 if nothing is playing. */
  private offBeat() {
    const b = this.g.sound.beat();
    if (b < 0) return -1;
    const frac = b - Math.floor(b);
    return Math.min(frac, 1 - frac);
  }

  /** A push off one skate. Also what the tests call. */
  stride() {
    const g = this.g;
    if (!this.on || this.cool > 0) return "";
    this.cool = 0.28;
    const off = this.offBeat();
    // With the sound off there is no beat to find: every push is a good one.
    const grade = off < 0 ? "good" : off < 0.09 ? "perfect" : off < 0.2 ? "good" : "off";
    const add = grade === "perfect" ? 2.6 : grade === "good" ? 1.7 : 0.8;
    this.speed = Math.min(TOP, this.speed + add);
    this.pushLeft = 0.25;
    if (grade === "perfect") {
      this.perfect++;
      this.say("ON THE BEAT", 0.6);
      g.buzz(12);
    } else if (grade === "good") this.good++;
    g.sound.step();
    return grade;
  }

  /** A spin, if he is rolling fast enough to carry one. Also what the tests call. */
  turn() {
    const g = this.g;
    if (!this.on || this.spin > 0) return false;
    if (this.speed < 4) {
      this.say("More speed for a spin", 1);
      return false;
    }
    this.spin = 0.75;
    this.spins++;
    this.speed *= 0.86;
    g.sound.whoosh();
    g.buzz(18);
    this.say(this.spins % 3 === 0 ? "CLEAN!" : "SPIN", 0.7);
    return true;
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    const f = this.floor;
    if (!this.on) return;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    this.cool = Math.max(0, this.cool - dt);
    this.pushLeft = Math.max(0, this.pushLeft - dt);
    this.left -= dt;
    if (this.left <= 0) return this.done();
    const m = input.move();
    // A to the left of the screen, D to the right: the camera is behind him.
    this.heading = wrapAngle(
      this.heading - m.x * TURN * dt * (0.55 + 0.45 * clamp(this.speed / TOP, 0, 1)),
    );
    if (m.y > 0.2 && this.speed < CRUISE) this.speed = Math.min(CRUISE, this.speed + 3.2 * dt);
    if (m.y < -0.2) this.speed = Math.max(0, this.speed - 7 * dt);
    this.speed = Math.max(0, this.speed - this.speed * ROLL * dt);
    if (input.hit("action")) this.stride();
    if (input.hit("interact")) this.turn();
    const vx = Math.sin(this.heading) * this.speed;
    const vz = Math.cos(this.heading) * this.speed;
    g.pos.x += vx * dt;
    g.pos.z += vz * dt;
    // The rail: off the edge he is put back on, and it costs him.
    const o = outside(f, g.pos.x, g.pos.z, 0.6);
    if (o.d > 0) {
      g.pos.x += o.nx * o.d;
      g.pos.z += o.nz * o.d;
      if (this.speed > 3) {
        this.bumps++;
        this.say("THE RAIL!", 0.8);
        g.sound.crash(0.25);
        g.buzz(25);
      }
      // Turned along the rail, and slowed.
      const along = Math.atan2(-o.nz, o.nx);
      const a1 = wrapAngle(along - this.heading);
      const a2 = wrapAngle(along + Math.PI - this.heading);
      this.heading = wrapAngle(this.heading + (Math.abs(a1) < Math.abs(a2) ? a1 : a2) * 0.6);
      this.speed *= 0.6;
    }
    // Laps: how far round the middle he has come, the way the floor goes (anticlockwise from above).
    const a = Math.atan2(-(g.pos.z - f.z), g.pos.x - f.x);
    const da = wrapAngle(a - this.lastA);
    this.lastA = a;
    this.round = Math.max(this.round - 0.5, this.round + da);
    if (da < -0.02 && this.speed > 2.5 && this.callLeft <= 0) this.say("Wrong way!", 0.9);
    const laps = Math.floor(this.round / (Math.PI * 2));
    if (laps > this.laps) {
      this.laps = laps;
      this.say(`LAP ${laps}`, 1);
      g.sound.ui();
    }
    // The spin: once round on the spot, then back to where he was going.
    this.spin = Math.max(0, this.spin - dt);
    const show = this.heading + (this.spin > 0 ? (1 - this.spin / 0.75) * Math.PI * 2 : 0);
    g.heading = show;
    g.benji.speed = this.pushLeft > 0 ? this.speed * 0.7 : this.speed * 0.32;
    g.benji.tilt = clamp(-m.x * this.speed * 0.025, -0.18, 0.18);
    g.benji.pose = this.spin > 0.2 && g.benji.has("cheer") ? "cheer" : null;
    g.live.meter = clamp(this.speed / TOP, 0, 1);
    g.live.sweetLo = 0.75;
    g.live.sweetHi = 1;
    this.frame(dt, false);
  }

  get score() {
    return this.laps * 150 + this.perfect * 25 + this.good * 10 + this.spins * 60 - this.bumps * 15;
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    g.camYaw = snap ? this.heading : g.camYaw + wrapAngle(this.heading - g.camYaw) * damp(3, dt);
    const fx = Math.sin(g.camYaw);
    const fz = Math.cos(g.camYaw);
    _eye.set(g.pos.x - fx * 5.2, 2.7, g.pos.z - fz * 5.2);
    _at.set(g.pos.x + fx * 3, 1.1, g.pos.z + fz * 3);
    const k = snap ? 1 : damp(6, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    if (snap) this.look.copy(_at);
    g.camera.lookAt(this.look);
    const fov = 58 + clamp(this.speed / TOP, 0, 1) * 8;
    if (Math.abs(g.camera.fov - fov) > 0.1) {
      g.camera.fov = fov;
      g.camera.updateProjectionMatrix();
    }
  }

  private done() {
    const g = this.g;
    this.on = false;
    const score = Math.max(0, this.score);
    const best = g.save.best.skate ?? 0;
    const record = score > best;
    if (record) g.save.best.skate = score;
    const pay = Math.round(score / 40);
    const respect = score >= 900 ? 2 : score >= 450 ? 1 : 0;
    g.earn(pay, respect, { quiet: true });
    g.emit("skate", score);
    g.benji.pose = null;
    g.benji.tilt = 0;
    g.live.meter = 0;
    g.end("walk");
    g.showResults(
      {
        title: score >= 900 ? "FLOOR CERTIFIED" : score >= 450 ? "SMOOTH" : "LIGHTS UP",
        sub: "Crystal Palace · skate session",
        rows: [
          ["Laps", `${this.laps}`],
          ["Pushes on the beat", `${this.perfect}`],
          ["Spins", `${this.spins}`],
          ["Into the rail", `${this.bumps}`],
          ["Score", `${score}`],
          ["Best", `${Math.max(best, score)}`],
        ],
        pay,
        respect,
        tickets: 0,
        record,
        again: "Skate again · $5",
        win: score >= 900,
      },
      () => g.rentSkates(),
      () => {},
    );
  }

  quit() {
    const g = this.g;
    this.on = false;
    g.benji.pose = null;
    g.benji.tilt = 0;
    g.live.meter = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    const best = this.g.save.best.skate ?? 0;
    h.machine = {
      name: "Crystal Palace",
      stats: [
        ["Time", `${Math.ceil(Math.max(0, this.left))}`, "#5ae0ff"],
        ["Laps", `${this.laps}`, "#39ff14"],
        ["Score", `${Math.max(0, this.score)}`],
        ["Best", best > 0 ? `${best}` : "-", "#f4d77a"],
      ],
      call: this.call,
      meter: true,
      act: "Push",
    };
  }

  /** For the tests. */
  get state() {
    return {
      on: this.on,
      speed: this.speed,
      laps: this.laps,
      round: this.round,
      perfect: this.perfect,
      good: this.good,
      spins: this.spins,
      bumps: this.bumps,
      left: this.left,
      heading: this.heading,
    };
  }
}
