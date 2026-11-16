import * as THREE from "three";
import type { HudState } from "../core/types";
import { clamp, damp, rng, wrapAngle } from "../core/util";
import type { Activity, Game } from "../game";
import { placeTrain, type Fair, type Track } from "../world/fair";
import { CURB, FAIR } from "../world/map";

const Y0 = CURB;
const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();
const kmh = (v: number) => `${Math.round(v * 3.6)} km/h`;

/** What every ride and game at the fair shares: a camera that eases, a line on the screen that fades. */
abstract class FairThing implements Activity {
  abstract hints: [string, string][];
  protected call = "";
  protected callLeft = 0;
  protected look = new THREE.Vector3();
  protected on = false;
  constructor(
    protected g: Game,
    protected fair: Fair,
  ) {}
  protected say(text: string, seconds = 1.4) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }
  protected tickCall(dt: number) {
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        this.g.push();
      }
    }
  }
  protected aim(
    eye: THREE.Vector3,
    at: THREE.Vector3,
    dt: number,
    snap: boolean,
    fov = 58,
    rate = 5,
  ) {
    const g = this.g;
    const k = snap ? 1 : damp(rate, dt);
    g.camera.position.lerp(eye, k);
    if (snap) this.look.copy(at);
    else this.look.lerp(at, k);
    g.camera.lookAt(this.look);
    if (Math.abs(g.camera.fov - fov) > 0.1) {
      g.camera.fov = fov;
      g.camera.updateProjectionMatrix();
    }
  }
  /** Sit Benji at a point, facing `heading`, with his seat `seat` metres off the ground. */
  protected sit(p: THREE.Vector3, heading: number, seat = 0.4) {
    const g = this.g;
    g.pos.x = p.x;
    g.pos.z = p.z;
    g.heading = heading;
    const sat = g.benji.has("swing");
    g.benji.pose = sat ? "swing" : null;
    g.benji.lift = Math.max(0, p.y - Y0 + (sat ? seat - 0.2 : seat - 0.6));
    g.benji.speed = 0;
  }
  protected off(x: number, z: number, heading: number) {
    const g = this.g;
    this.on = false;
    g.pos.x = x;
    g.pos.z = z;
    g.heading = heading;
    g.camYaw = heading;
    g.benji.pose = null;
    g.benji.lift = 0;
    g.benji.tilt = 0;
    g.live.meter = 0;
    g.end("walk");
  }
  abstract update(dt: number): void;
  abstract hud(h: HudState): void;
  abstract quit(): void;
}

export type RideKind = "pippin" | "flume" | "ferris" | "carousel" | "drop";

const RIDE_NAMES: Record<RideKind, string> = {
  pippin: "Zippin Pippin",
  flume: "Log Flume",
  ferris: "Ferris Wheel",
  carousel: "Grand Carousel",
  drop: "Free Fall",
};

/**
 * Riding something at the fair. The coaster and the flume run their track once round, up the
 * chain and down on gravity; the wheel goes round once; the carousel plays its tune; the drop
 * tower takes him up slow and lets go.
 */
export class FairRide extends FairThing {
  hints: [string, string][] = [["Q", "Get off at the end"]];
  kind: RideKind = "pippin";
  private t = 0;
  private s = 0;
  private v = 0;
  private top = 0;
  private air = 0;
  private start0 = 0;
  private splashed = false;
  private y = 0;
  private phase: "board" | "ride" | "done" = "board";

  start(kind: RideKind) {
    const g = this.g;
    this.kind = kind;
    this.on = true;
    this.t = 0;
    this.s = 0;
    this.v = 0;
    this.top = 0;
    this.air = 0;
    this.splashed = false;
    this.phase = "board";
    this.fair.held.add(kind);
    if (kind === "ferris") {
      this.fair.speed.wheel = 3;
      this.start0 = this.fair.wheelAngle();
    }
    if (kind === "carousel") this.fair.speed.carousel = 1;
    if (kind === "drop") this.y = 1.2;
    this.say(
      kind === "pippin"
        ? "Lap bar down. Hold on."
        : kind === "flume"
          ? "You will get wet."
          : kind === "drop"
            ? "Up we go..."
            : "Enjoy the ride.",
      2.4,
    );
    this.place(0, true);
    g.push();
  }

  private track(): Track {
    return this.kind === "pippin" ? this.fair.pippin : this.fair.flume;
  }

  update(dt: number) {
    if (!this.on) return;
    this.t += dt;
    this.tickCall(dt);
    const k = this.kind;
    if (this.phase === "board") {
      if (this.t > 1.2) {
        this.phase = "ride";
        this.t = 0;
      }
    } else if (this.phase === "ride") {
      if (k === "pippin" || k === "flume") {
        const tr = this.track();
        const u = clamp(this.s / tr.len, 0, 1);
        tr.curve.getTangentAt(u, _t);
        if (u > tr.lift[0] && u < tr.lift[1]) this.v = k === "pippin" ? 3.4 : 2.6;
        else
          this.v = Math.max(
            k === "pippin" ? 3 : 2.4,
            this.v + (-_t.y * 9.8 - (k === "pippin" ? 0.016 : 0.04) * this.v * this.v) * dt,
          );
        if (k === "pippin" && _t.y < -0.25 && this.v > 10) this.air += dt;
        if (k === "pippin" && _t.y < -0.4 && this.callLeft <= 0)
          this.say(this.v > 14 ? "AAAAAH!" : "Hands up!", 0.8);
        // The flume's splash comes at the bottom of the drop.
        if (k === "flume" && !this.splashed && u > 0.6 && _t.y > -0.05 && this.v > 7) {
          this.splashed = true;
          this.say("SPLASH!", 1.4);
          this.g.sound.crash(0.3);
          this.g.buzz([40, 30, 40]);
        }
        this.s += this.v * dt;
        this.top = Math.max(this.top, this.v);
        if (this.s >= tr.len) this.finish();
      } else if (k === "ferris") {
        if (this.fair.wheelAngle() - this.start0 > Math.PI * 2) this.finish();
        if (Math.abs(Math.cos(this.fair.wheelAngle()) + 1) < 0.02 && this.callLeft <= 0)
          this.say("Top of the wheel. That's all of Memphis.", 2.5);
      } else if (k === "carousel") {
        if (this.t > 28) this.finish();
      } else if (k === "drop") {
        const H = FAIR.drop.h - 4;
        if (this.t < 9) this.y = 1.2 + (this.t / 9) * (H - 1.2);
        else if (this.t < 11.5) {
          this.y = H;
          if (this.callLeft <= 0) this.say("Wait for it...", 1);
        } else {
          this.v += 9.8 * dt;
          if (this.y < 10) this.v = Math.max(0, this.v - 30 * dt);
          this.y = Math.max(1.2, this.y - this.v * dt);
          this.top = Math.max(this.top, this.v);
          if (this.y <= 1.21 && this.v < 0.5) this.finish();
        }
        this.fair.dropCar.position.y = Y0 + this.y;
      }
    } else if (this.t > 1.2) return this.done();
    this.place(dt, false);
  }

  private place(dt: number, snap: boolean) {
    const g = this.g;
    const k = this.kind;
    if (k === "pippin" || k === "flume") {
      const tr = this.track();
      placeTrain(tr, this.s);
      const front = tr.car.children[0]!;
      const u = clamp(this.s / tr.len, 0, 1);
      tr.curve.getTangentAt(u, _t);
      _p.copy(front.position);
      this.sit(_p, Math.atan2(_t.x, _t.z), k === "pippin" ? 1 : 0.8);
      _eye.set(_p.x - _t.x * 4.6, _p.y + 2.6 - _t.y * 2, _p.z - _t.z * 4.6);
      _at.set(_p.x + _t.x * 6, _p.y + _t.y * 6 + 0.6, _p.z + _t.z * 6);
      this.aim(_eye, _at, dt, snap, 62 + clamp(this.v / 20, 0, 1) * 12, 9);
      g.live.meter = clamp(this.v / 20, 0, 1);
    } else if (k === "ferris") {
      const a = this.fair.wheelAngle();
      this.fair.wheelSeat(a, _p);
      this.sit(_p.setY(_p.y - 0.4), Math.PI);
      const W = FAIR.ferris;
      _eye.set(_p.x, _p.y + 1.6, _p.z + 3.4);
      _at.set(W.x + Math.sin(g.time * 0.15) * 30, Y0 + 4, W.z - 80);
      this.aim(_eye, _at, dt, snap, 60, 3);
    } else if (k === "carousel") {
      this.fair.horseAt(_p);
      const C = FAIR.carousel;
      const heading = Math.atan2(_p.z - C.z, -(_p.x - C.x));
      this.sit(_p.clone().setY(_p.y + 0.4), heading, 0.6);
      _eye.set(C.x + (_p.x - C.x) * 2.1, Y0 + 3.2, C.z + (_p.z - C.z) * 2.1);
      _at.set(_p.x, _p.y + 1, _p.z);
      this.aim(_eye, _at, dt, snap, 56, 4);
    } else {
      const D = FAIR.drop;
      _p.set(D.x, Y0 + this.y, D.z - 2.9);
      this.sit(_p, Math.PI, 0.4);
      _eye.set(D.x + 1.6, Y0 + this.y + 1.8, D.z - 5.4);
      _at.set(D.x - 6, Y0 + Math.max(0, this.y - 14), D.z - 30);
      this.aim(_eye, _at, dt, snap, 64, 8);
      g.live.meter = clamp(this.y / (D.h - 4), 0, 1);
    }
  }

  private finish() {
    this.phase = "done";
    this.t = 0;
    this.g.sound.cheer();
  }

  private release() {
    const k = this.kind;
    this.fair.held.delete(k);
    this.fair.speed.wheel = 1;
    const sp = this.fair.spots[k]!;
    this.off(sp.x, sp.z - 1.2, Math.PI);
  }

  private done() {
    const g = this.g;
    const k = this.kind;
    this.release();
    const key = `ride_${k}`;
    const rides = (g.save.best[key] ?? 0) + 1;
    g.save.best[key] = rides;
    g.earn(0, rides === 1 ? 1 : 0, { quiet: true });
    g.emit("fairride", 1);
    if (k === "pippin" || k === "drop") {
      const best = g.save.best[`${k}_top`] ?? 0;
      const cm = Math.round(this.top * 100);
      if (cm > best) g.save.best[`${k}_top`] = cm;
      g.showResults(
        {
          title: k === "pippin" ? "YOU RODE THE PIPPIN" : "FREE FALL",
          sub: `Mid-South Fair · ${RIDE_NAMES[k]}`,
          rows: [
            ["Top speed", kmh(this.top)],
            ...(k === "pippin"
              ? ([["Air time", `${this.air.toFixed(1)} s`]] as [string, string][])
              : []),
            ["Times ridden", `${rides}`],
          ],
          pay: 0,
          respect: rides === 1 ? 1 : 0,
          tickets: 0,
          record: cm > best && best > 0,
          again: `Ride again · $${PRICE[k]}`,
          win: true,
        },
        () => g.rideFair(k),
        () => {},
      );
    } else
      g.toast(
        k === "flume"
          ? "Soaked, and smiling about it."
          : k === "ferris"
            ? "All the way round. You could see the Pyramid from up there."
            : "Round and round to the band organ. Kids wave at you.",
        4,
      );
  }

  quit() {
    this.release();
  }

  hud(h: HudState) {
    const k = this.kind;
    h.machine = {
      name: RIDE_NAMES[k],
      stats:
        k === "pippin" || k === "flume" || k === "drop"
          ? [
              ["Speed", kmh(this.v), "#5ae0ff"],
              ["Top", kmh(this.top), "#39ff14"],
            ]
          : [["Riding", "", "#ffd23a"]],
      call: this.call,
      meter: k === "pippin" || k === "drop",
      act: "",
    };
  }

  /** For the tests. */
  get state() {
    return {
      on: this.on,
      kind: this.kind,
      phase: this.phase,
      s: this.s,
      v: this.v,
      top: this.top,
      y: this.y,
    };
  }
}

export const PRICE: Record<RideKind, number> = {
  pippin: 5,
  flume: 4,
  ferris: 3,
  carousel: 2,
  drop: 4,
};

/**
 * Bumper cars. Forty-five seconds under the sparks: the stick steers, the trigger or W drives.
 * Hitting somebody square and fast scores; being hit costs nothing but pride.
 */
export class BumperCars extends FairThing {
  hints: [string, string][] = [
    ["W / S", "Go / back"],
    ["A / D", "Steer"],
    ["Q", "Climb out"],
  ];
  private left = 45;
  private heading = 0;
  private speed = 0;
  private score = 0;
  private hits = 0;
  private cool = new Map<number, number>();
  private ai: { heading: number; speed: number; chase: number }[] = [];

  start() {
    const g = this.g;
    this.on = true;
    this.left = 45;
    this.score = this.hits = 0;
    this.speed = 0;
    this.heading = 0;
    this.cool.clear();
    this.fair.held.add("bumper");
    const B = FAIR.bumper;
    const cars = this.fair.bumperCars;
    cars[0]!.position.set(B.minX + 4, Y0, (B.minZ + B.maxZ) / 2);
    this.ai = cars.map((_, i) => ({ heading: i * 1.3, speed: 3 + (i % 3) * 0.6, chase: 0 }));
    this.say("Hit them square, hit them fast.", 2.4);
    this.frame(0, true);
    g.push();
  }

  update(dt: number) {
    if (!this.on) return;
    const g = this.g;
    this.tickCall(dt);
    this.left -= dt;
    if (this.left <= 0) return this.done();
    const B = FAIR.bumper;
    const cars = this.fair.bumperCars;
    const m = g.input.move();
    const gas = clamp(g.input.throttle(), -1, 1);
    this.speed += (gas * 6.5 - this.speed) * damp(2.4, dt);
    this.heading = wrapAngle(this.heading - m.x * 2.6 * dt * (this.speed >= 0 ? 1 : -1));
    const me = cars[0]!;
    me.position.x += Math.sin(this.heading) * this.speed * dt;
    me.position.z += Math.cos(this.heading) * this.speed * dt;
    me.rotation.y = this.heading;
    // The others: wander, and now and then come for Benji.
    for (let i = 1; i < cars.length; i++) {
      const c = cars[i]!;
      const a = this.ai[i]!;
      a.chase -= dt;
      if (a.chase <= 0) {
        a.chase = 1.5 + (i % 3);
        const toMe = Math.atan2(me.position.x - c.position.x, me.position.z - c.position.z);
        a.heading = i % 2 && Math.random() < 0.5 ? toMe : a.heading + (Math.random() - 0.5) * 2;
      }
      c.position.x += Math.sin(a.heading) * a.speed * dt;
      c.position.z += Math.cos(a.heading) * a.speed * dt;
      c.rotation.y = a.heading;
    }
    // Walls.
    cars.forEach((c, i) => {
      const keep = (v: number, lo: number, hi: number, flip: () => void) => {
        if (v < lo || v > hi) flip();
        return clamp(v, lo, hi);
      };
      c.position.x = keep(c.position.x, B.minX + 1.4, B.maxX - 1.4, () =>
        i ? (this.ai[i]!.heading = -this.ai[i]!.heading) : (this.speed *= -0.4),
      );
      c.position.z = keep(c.position.z, B.minZ + 1.4, B.maxZ - 1.4, () =>
        i ? (this.ai[i]!.heading = Math.PI - this.ai[i]!.heading) : (this.speed *= -0.4),
      );
    });
    // Bumps.
    for (const [k, v] of this.cool) this.cool.set(k, v - dt);
    for (let i = 0; i < cars.length; i++)
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i]!.position;
        const b = cars[j]!.position;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d > 2.3 || d < 1e-4) continue;
        const push = (2.3 - d) / 2;
        a.x -= (dx / d) * push;
        a.z -= (dz / d) * push;
        b.x += (dx / d) * push;
        b.z += (dz / d) * push;
        if (i === 0 && (this.cool.get(j) ?? 0) <= 0) {
          const into = (Math.sin(this.heading) * dx + Math.cos(this.heading) * dz) / d;
          const hit = this.speed * into;
          this.cool.set(j, 0.7);
          if (hit > 2) {
            const pts = Math.round(hit * 25);
            this.score += pts;
            this.hits++;
            this.ai[j]!.heading = Math.atan2(dx, dz);
            this.say(hit > 5 ? `BOOM! +${pts}` : `+${pts}`, 0.8);
            g.sound.crash(Math.min(0.6, hit / 10));
            g.buzz(30);
          } else if (hit < -1) g.sound.crash(0.15);
          this.speed *= 0.4;
        }
      }
    g.pos.x = me.position.x;
    g.pos.z = me.position.z;
    g.heading = this.heading;
    g.benji.lift = 0.5;
    g.benji.pose = g.benji.has("swing") ? "swing" : null;
    g.benji.speed = 0;
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const me = this.fair.bumperCars[0]!.position;
    _eye.set(me.x - Math.sin(this.heading) * 6, Y0 + 4.2, me.z - Math.cos(this.heading) * 6);
    _at.set(me.x + Math.sin(this.heading) * 3, Y0 + 0.6, me.z + Math.cos(this.heading) * 3);
    this.aim(_eye, _at, dt, snap, 60, 4);
    g.live.meter = clamp(Math.abs(this.speed) / 6.5, 0, 1);
  }

  private release() {
    this.fair.held.delete("bumper");
    const sp = this.fair.spots.bumper!;
    this.off(sp.x, sp.z - 1, Math.PI);
  }

  private done() {
    const g = this.g;
    this.release();
    const best = g.save.best.bumper ?? 0;
    const record = this.score > best;
    if (record) g.save.best.bumper = this.score;
    const pay = Math.round(this.score / 60);
    g.earn(pay, this.score >= 1200 ? 1 : 0, { quiet: true });
    g.emit("bumper", this.score);
    g.showResults(
      {
        title: this.score >= 1200 ? "DEMOLITION DERBY" : "BUMPED",
        sub: "Mid-South Fair · Bumper Cars",
        rows: [
          ["Square hits", `${this.hits}`],
          ["Score", `${this.score}`],
          ["Best", `${Math.max(best, this.score)}`],
        ],
        pay,
        respect: this.score >= 1200 ? 1 : 0,
        tickets: 0,
        record,
        again: "Go again · $3",
        win: this.score >= 1200,
      },
      () => g.playFair("bumper"),
      () => {},
    );
  }

  quit() {
    this.release();
  }

  hud(h: HudState) {
    h.machine = {
      name: "Bumper Cars",
      stats: [
        ["Time", `${Math.ceil(Math.max(0, this.left))}`, "#5ae0ff"],
        ["Hits", `${this.hits}`, "#39ff14"],
        ["Score", `${this.score}`],
      ],
      call: this.call,
      meter: true,
      act: "",
    };
  }

  get state() {
    return { on: this.on, score: this.score, hits: this.hits, left: this.left, speed: this.speed };
  }
}

/**
 * The bull at the rodeo. Eight seconds is a qualified ride. He bucks one way and then the
 * other; leaning against him (A and D) keeps Benji on. Lean too late or too far and he is off.
 */
export class BullRide extends FairThing {
  hints: [string, string][] = [
    ["A / D", "Lean against the buck"],
    ["Q", "Climb off"],
  ];
  private t = 0;
  private bal = 0;
  private vel = 0;
  private thrown = false;
  private landT = 0;
  private seed = rng(1936);
  private kick = 0;
  private kickDir = 1;

  start() {
    const g = this.g;
    this.on = true;
    this.t = 0;
    this.bal = 0;
    this.vel = 0;
    this.thrown = false;
    this.landT = 0;
    this.kick = 0.8;
    this.fair.held.add("bull");
    this.say("Eight seconds. Lean against him.", 2.2);
    this.frame(0, true);
    g.push();
  }

  update(dt: number) {
    if (!this.on) return;
    const g = this.g;
    this.tickCall(dt);
    const bull = this.fair.bull;
    if (this.thrown) {
      this.landT += dt;
      g.benji.lift = Math.max(0, 2 - this.landT * 4);
      if (this.landT > 1.6) return this.done();
      return this.frame(dt, false);
    }
    this.t += dt;
    // The bull: a buck every so often, harder the longer the ride goes.
    this.kick -= dt;
    if (this.kick <= 0) {
      this.kickDir = this.seed() < 0.5 ? -1 : 1;
      this.vel += this.kickDir * (1.6 + this.t * 0.22 + this.seed() * 0.8);
      this.kick = 0.55 + this.seed() * 0.6 - Math.min(0.3, this.t * 0.03);
      g.sound.step();
    }
    const m = g.input.move();
    this.vel += (-m.x * 3.4 + this.bal * 1.2) * dt;
    this.vel *= 1 - Math.min(1, 1.6 * dt);
    this.bal += this.vel * dt;
    bull.rotation.z = Math.sin(this.t * 9) * 0.12 * (0.5 + Math.min(1, this.t / 4));
    bull.rotation.x = Math.sin(this.t * 7.3) * 0.2;
    bull.rotation.y = Math.sin(this.t * 1.7) * 0.9;
    g.live.meter = clamp(0.5 + this.bal / 2, 0, 1);
    g.live.sweetLo = 0.3;
    g.live.sweetHi = 0.7;
    if (Math.abs(this.bal) > 1) {
      this.thrown = true;
      this.say(this.t >= 8 ? "Off after the buzzer!" : "THROWN!", 1.6);
      g.sound.crash(0.5);
      g.buzz([60, 40, 80]);
    } else if (this.t >= 8 && this.t - dt < 8) {
      this.say("THE BUZZER! QUALIFIED RIDE!", 2);
      g.sound.cheer();
      g.cheer(FAIR.rodeo.minX + 35, FAIR.rodeo.minZ + 10, 40, 2.4);
    }
    if (this.t > 10) {
      this.thrown = true;
      this.landT = 0.8;
    }
    const p = bull.position;
    g.pos.x = p.x + Math.sin(bull.rotation.y) * 0.3;
    g.pos.z = p.z + Math.cos(bull.rotation.y) * 0.3;
    g.heading = bull.rotation.y;
    g.benji.lift = 2 + Math.abs(Math.sin(this.t * 7.3)) * 0.3;
    g.benji.tilt = this.bal * 0.6;
    g.benji.pose = g.benji.has("swing") ? "swing" : null;
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const p = this.fair.bull.position;
    _eye.set(p.x - 9, Y0 + 3.4, p.z - 5);
    _at.set(p.x, Y0 + 2, p.z);
    this.aim(_eye, _at, dt, snap, 56, 4);
  }

  private release() {
    this.fair.held.delete("bull");
    const sp = this.fair.spots.rodeo!;
    this.off(sp.x, sp.z, Math.PI);
  }

  private done() {
    const g = this.g;
    const t = Math.min(this.t, 8);
    this.release();
    const best = g.save.best.bull ?? 0;
    const cs = Math.round(t * 100);
    const record = cs > best;
    if (record) g.save.best.bull = cs;
    const won = this.t >= 8;
    const pay = won ? 25 : Math.round(t * 2);
    g.earn(pay, won ? 2 : 0, { quiet: true });
    g.emit("bull", cs);
    g.showResults(
      {
        title: won ? "QUALIFIED RIDE" : "IN THE DIRT",
        sub: "Mid-South Fair · PRCA Rodeo",
        rows: [
          ["On the bull", `${t.toFixed(2)} s`],
          ["Best", `${(Math.max(best, cs) / 100).toFixed(2)} s`],
        ],
        pay,
        respect: won ? 2 : 0,
        tickets: 0,
        record,
        again: "Ride again · $5",
        win: won,
      },
      () => g.playFair("bull"),
      () => {},
    );
  }

  quit() {
    this.release();
  }

  hud(h: HudState) {
    h.machine = {
      name: "Bull Riding",
      stats: [["Time", `${Math.min(8, this.t).toFixed(1)} / 8`, "#ffd23a"]],
      call: this.call,
      meter: true,
      act: "",
    };
  }

  get state() {
    return { on: this.on, t: this.t, bal: this.bal, thrown: this.thrown };
  }
}

const PIG_NAMES = ["Hamlet", "Sir Oinksalot", "Piggy Smalls", "Bacon Bit"];

/** The pig races: pick a pig, five dollars on it, and they are off once round the track. */
export class PigRace extends FairThing {
  hints: [string, string][] = [
    ["A / D", "Pick a pig"],
    ["Space", "Put $5 on it"],
    ["Q", "Walk away"],
  ];
  private pick = 0;
  private phase: "pick" | "race" | "done" = "pick";
  private a = [0, 0, 0, 0];
  private v = [0, 0, 0, 0];
  private winner = -1;
  private t = 0;
  private seed = rng(1856);

  start() {
    this.on = true;
    this.phase = "pick";
    this.pick = 0;
    this.winner = -1;
    this.t = 0;
    this.fair.held.add("pigs");
    this.a = [0, 0, 0, 0];
    this.placePigs();
    this.say("Pick your pig.", 2);
    this.frame(0, true);
    this.g.push();
  }

  private placePigs() {
    const P = FAIR.pigs;
    this.fair.pigs.forEach((p, i) => {
      const a = -Math.PI / 2 + this.a[i]!;
      const lane = (i - 1.5) * 0.7;
      p.position.set(
        P.x + Math.cos(a) * (P.halfX + lane),
        Y0,
        P.z + Math.sin(a) * (P.halfZ + lane),
      );
      p.rotation.y = Math.atan2(-Math.sin(a) * P.halfX, Math.cos(a) * P.halfZ) + Math.PI;
      p.position.y = Y0 + (this.phase === "race" ? Math.abs(Math.sin(this.t * 14 + i)) * 0.08 : 0);
    });
  }

  /** Five on the pig picked, and the gate goes up. Also what the tests call. */
  bet() {
    const g = this.g;
    if (this.phase !== "pick") return false;
    if (!g.spend(5)) return false;
    this.phase = "race";
    this.t = 0;
    this.v = [0, 0, 0, 0].map(() => 2.2 + this.seed() * 0.5);
    this.say(
      `And they're off! ${PIG_NAMES[this.pick]} in the ${["pink", "blush", "tan", "black"][this.pick]}!`,
      2,
    );
    g.sound.horn();
    return true;
  }

  update(dt: number) {
    if (!this.on) return;
    const g = this.g;
    this.tickCall(dt);
    this.t += dt;
    if (this.phase === "pick") {
      if (g.input.hit("left")) this.pick = (this.pick + 3) % 4;
      if (g.input.hit("right")) this.pick = (this.pick + 1) % 4;
      if (g.input.hit("action") || g.input.hit("interact")) this.bet();
      g.push();
    } else if (this.phase === "race") {
      for (let i = 0; i < 4; i++) {
        // Surges and stalls: a pig race is never a straight run.
        if (this.seed() < dt * 1.2) this.v[i] = 1.6 + this.seed() * 1.8;
        this.a[i] = this.a[i]! + (this.v[i]! / ((FAIR.pigs.halfX + FAIR.pigs.halfZ) / 2)) * dt;
        if (this.a[i]! >= Math.PI * 2 && this.winner < 0) {
          this.winner = i;
          this.phase = "done";
          this.t = 0;
          const won = i === this.pick;
          this.say(
            won ? `${PIG_NAMES[i]} WINS! You called it!` : `${PIG_NAMES[i]} by a snout.`,
            2.6,
          );
          if (won) {
            g.earn(15, 1, { quiet: true });
            g.sound.cheer();
          } else g.sound.bad();
          g.emit("pigs", won ? 1 : 0);
        }
      }
    } else if (this.t > 3) return this.release();
    this.placePigs();
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const P = FAIR.pigs;
    _eye.set(P.x, Y0 + 6, P.z - P.halfZ - 9);
    _at.set(P.x, Y0, P.z);
    this.aim(_eye, _at, dt, snap, 56, 3);
  }

  private release() {
    this.fair.held.delete("pigs");
    const sp = this.fair.spots.pigs!;
    this.off(sp.x, sp.z, 0);
  }

  quit() {
    this.release();
  }

  hud(h: HudState) {
    h.machine = {
      name: "Racing Pigs",
      stats: [
        ["Your pig", PIG_NAMES[this.pick]!, "#ff7ad8"],
        ["Pays", "$15", "#39ff14"],
      ],
      call: this.call || (this.phase === "pick" ? "A / D to pick · Space to bet $5" : ""),
      meter: false,
      act: this.phase === "pick" ? "Bet" : "",
    };
  }

  get state() {
    return { on: this.on, phase: this.phase, pick: this.pick, winner: this.winner, a: [...this.a] };
  }
}

/** The Krystal eating contest: thirty seconds, mash for every bite, five bites a burger. */
export class EatingContest extends FairThing {
  hints: [string, string][] = [
    ["Space", "Bite (fast!)"],
    ["Q", "Push the plate away"],
  ];
  private left = 30;
  private bites = 0;
  private rivals = [0, 0, 0];
  private rates = [0.42, 0.5, 0.57];

  start() {
    this.on = true;
    this.left = 30;
    this.bites = 0;
    this.rivals = [0, 0, 0];
    this.say("Ready... EAT!", 1.6);
    const K = FAIR.krystal;
    this.g.pos.x = K.x + 3;
    this.g.pos.z = K.z - 1.6;
    this.g.heading = 0;
    this.frame(0, true);
    this.g.push();
  }

  get burgers() {
    return Math.floor(this.bites / 5);
  }

  /** One bite. Also what the tests call. */
  bite() {
    if (!this.on) return;
    this.bites++;
    if (this.bites % 5 === 0) {
      this.g.sound.step();
      this.say(`${this.burgers}`, 0.4);
    }
  }

  update(dt: number) {
    if (!this.on) return;
    const g = this.g;
    this.tickCall(dt);
    this.left -= dt;
    if (g.input.hit("action")) this.bite();
    for (let i = 0; i < 3; i++)
      this.rivals[i] =
        this.rivals[i]! + this.rates[i]! * dt * (0.8 + Math.sin(g.time * 2 + i) * 0.25);
    if (this.left <= 0) return this.done();
    g.benji.pose = null;
    g.benji.lift = 0;
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const K = FAIR.krystal;
    _eye.set(K.x + 3, Y0 + 2.4, K.z - 6);
    _at.set(K.x + 5, Y0 + 1.2, K.z);
    this.aim(_eye, _at, dt, snap, 56, 4);
  }

  private done() {
    const g = this.g;
    const mine = this.burgers;
    const best = Math.max(...this.rivals.map((r) => Math.floor(r)));
    const won = mine > best;
    const sp = this.fair.spots.krystal!;
    this.off(sp.x, sp.z, -Math.PI / 2);
    const rec = g.save.best.krystal ?? 0;
    if (mine > rec) g.save.best.krystal = mine;
    g.earn(won ? 20 : 2, won ? 2 : 0, { quiet: true });
    g.emit("krystal", mine);
    g.showResults(
      {
        title: won ? "KRYSTAL CHAMPION" : "FULL",
        sub: "Mid-South Fair · Krystal eating contest",
        rows: [
          ["Your burgers", `${mine}`],
          ["Best of the rest", `${best}`],
          ["Your record", `${Math.max(rec, mine)}`],
        ],
        pay: won ? 20 : 2,
        respect: won ? 2 : 0,
        tickets: 0,
        record: mine > rec,
        again: "Again · $4",
        win: won,
      },
      () => g.playFair("krystal"),
      () => {},
    );
  }

  quit() {
    const sp = this.fair.spots.krystal!;
    this.off(sp.x, sp.z, -Math.PI / 2);
  }

  hud(h: HudState) {
    h.machine = {
      name: "Krystal Eating Contest",
      stats: [
        ["Time", `${Math.ceil(Math.max(0, this.left))}`, "#5ae0ff"],
        ["You", `${this.burgers}`, "#39ff14"],
        ["Leader", `${Math.max(...this.rivals.map((r) => Math.floor(r)))}`, "#ff7a2a"],
      ],
      call: this.call,
      meter: false,
      act: "Bite",
    };
  }

  get state() {
    return {
      on: this.on,
      bites: this.bites,
      burgers: this.burgers,
      rivals: [...this.rivals],
      left: this.left,
    };
  }
}

/** Test your strength: the hammer comes down when the meter is where it should be. Three swings. */
export class HighStriker extends FairThing {
  hints: [string, string][] = [
    ["Space", "Swing at the top of the meter"],
    ["Q", "Put the hammer down"],
  ];
  private swings = 0;
  private best = 0;
  private t = 0;
  private fly = 0;
  private flyT = -1;

  start() {
    this.on = true;
    this.swings = 0;
    this.best = 0;
    this.t = 0;
    this.flyT = -1;
    this.fair.held.add("striker");
    const S = FAIR.striker;
    this.g.pos.x = S.x + 0.6;
    this.g.pos.z = S.z;
    this.g.heading = Math.PI / 2;
    this.say("Swing when the meter is full.", 2);
    this.frame(0, true);
    this.g.push();
  }

  private meter() {
    return 0.5 - Math.cos(this.t * 3.4) * 0.5;
  }

  /** The hammer comes down. Also what the tests call. */
  swing() {
    const g = this.g;
    if (!this.on || this.flyT >= 0 || this.swings >= 3) return -1;
    const p = this.meter();
    this.swings++;
    this.fly = p;
    this.flyT = 0;
    this.best = Math.max(this.best, p);
    g.sound.board();
    g.buzz(40);
    return p;
  }

  update(dt: number) {
    if (!this.on) return;
    const g = this.g;
    this.tickCall(dt);
    this.t += dt;
    if (g.input.hit("action")) this.swing();
    const puck = this.fair.puck;
    if (this.flyT >= 0) {
      this.flyT += dt;
      const peak = 0.8 + this.fly * 9.2;
      const k = this.flyT < 0.5 ? this.flyT / 0.5 : Math.max(0, 1 - (this.flyT - 0.5) / 0.6);
      puck.position.y = Y0 + 0.8 + (peak - 0.8) * Math.sin((k * Math.PI) / 2);
      if (this.flyT > 0.45 && this.flyT - dt <= 0.45) {
        if (this.fly > 0.93) {
          this.say("DING DING DING!", 1.6);
          g.sound.cheer();
        } else
          this.say(this.fly > 0.75 ? "So close!" : this.fly > 0.45 ? "Not bad." : "Weak!", 1.2);
      }
      if (this.flyT > 1.2) {
        this.flyT = -1;
        if (this.swings >= 3) return this.done();
      }
    }
    g.benji.pose = g.benji.has("cheer") && this.flyT >= 0 && this.fly > 0.93 ? "cheer" : null;
    g.live.meter = this.meter();
    g.live.sweetLo = 0.93;
    g.live.sweetHi = 1;
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const S = FAIR.striker;
    _eye.set(S.x - 5, Y0 + 3.6, S.z - 2.5);
    _at.set(S.x + 2, Y0 + 4, S.z);
    this.aim(_eye, _at, dt, snap, 58, 4);
  }

  private done() {
    const g = this.g;
    const rang = this.best > 0.93;
    this.fair.held.delete("striker");
    const sp = this.fair.spots.striker!;
    this.off(sp.x - 1, sp.z, -Math.PI / 2);
    g.earn(rang ? 6 : 0, rang ? 1 : 0, { quiet: true });
    g.emit("striker", Math.round(this.best * 100));
    g.toast(
      rang
        ? "Rang the bell. The man hands you a giant stuffed bear and a nod."
        : `Best swing ${Math.round(this.best * 100)}%. The bell is still waiting.`,
      4,
    );
  }

  quit() {
    this.fair.held.delete("striker");
    const sp = this.fair.spots.striker!;
    this.off(sp.x - 1, sp.z, -Math.PI / 2);
  }

  hud(h: HudState) {
    h.machine = {
      name: "Test Your Strength",
      stats: [
        ["Swings", `${this.swings} / 3`],
        ["Best", `${Math.round(this.best * 100)}%`, "#39ff14"],
      ],
      call: this.call,
      meter: true,
      act: "Swing",
    };
  }

  get state() {
    return { on: this.on, swings: this.swings, best: this.best };
  }
}

const MOVES: { key: "up" | "down" | "left" | "right"; label: string; pose: string }[] = [
  { key: "up", label: "W · TOES", pose: "jook-toes" },
  { key: "down", label: "S · BUCK", pose: "jook-buck" },
  { key: "left", label: "A · GLIDE", pose: "jook-glide" },
  { key: "right", label: "D · GLIDE", pose: "jook-glide" },
];

/**
 * The Youth Talent Contest, on the big stage. The routine is called out move by move, two beats
 * apart; hit each on its beat. The judges want seven in ten.
 */
export class TalentShow extends FairThing {
  hints: [string, string][] = [
    ["W A S D", "The called move, on the beat"],
    ["Q", "Leave the stage"],
  ];
  private beat = -4;
  private origin = 0;
  private clock = 0;
  private cue = -1;
  private hits = 0;
  private misses = 0;
  private due = 4;
  private done_ = false;
  private total = 20;
  private pose: string | null = null;
  private poseLeft = 0;
  private seed = rng(1953);

  start() {
    const g = this.g;
    this.on = true;
    this.hits = this.misses = 0;
    this.cue = -1;
    this.due = 4;
    this.done_ = false;
    this.clock = 0;
    const b = g.sound.beat();
    this.origin = b >= 0 ? Math.ceil(b) : 0;
    const SG = FAIR.stage;
    g.pos.x = SG.x - 1;
    g.pos.z = SG.z;
    g.heading = -Math.PI / 2;
    g.benji.lift = 1.2;
    this.say("Contestant number seven... from Orange Mound!", 3);
    this.frame(0, true);
    g.push();
  }

  /** Beats since the act began: the music's, or our own count if nothing is playing. */
  private now() {
    const b = this.g.sound.beat();
    return b >= 0 ? b - this.origin : this.clock * 2;
  }

  /** The move he makes. Also what the tests call. */
  move(key: "up" | "down" | "left" | "right") {
    const g = this.g;
    if (!this.on || this.cue < 0) return "";
    const want = MOVES[this.cue]!;
    const off = Math.abs(this.now() - this.due);
    const grade = want.key === key && off < 0.45 ? "hit" : "miss";
    if (grade === "hit") {
      this.hits++;
      this.say(off < 0.2 ? "PERFECT" : "GOOD", 0.5);
      g.cheer(FAIR.stage.x - 8, FAIR.stage.z, 12, 0.8);
    } else {
      this.misses++;
      this.say("MISS", 0.5);
    }
    this.pose = g.benji.has(want.pose) ? want.pose : g.benji.has("cheer") ? "cheer" : null;
    this.poseLeft = 0.45;
    this.cue = -1;
    this.due += 2;
    return grade;
  }

  update(dt: number) {
    if (!this.on) return;
    const g = this.g;
    this.tickCall(dt);
    this.clock += dt;
    const now = this.now();
    const n = this.hits + this.misses;
    if (n >= this.total && !this.done_) {
      this.done_ = true;
      this.clock = 0;
    }
    if (this.done_) {
      g.benji.pose = g.benji.has("jook-finish")
        ? "jook-finish"
        : g.benji.has("cheer")
          ? "cheer"
          : null;
      if (this.clock > 2) return this.done();
    } else {
      if (this.cue < 0 && now > this.due - 1.2) {
        this.cue = Math.floor(this.seed() * 4);
        this.call = MOVES[this.cue]!.label;
        this.callLeft = 2;
        g.push();
      }
      if (this.cue >= 0 && now > this.due + 0.6) {
        this.misses++;
        this.say("MISS", 0.5);
        this.cue = -1;
        this.due += 2;
      }
      for (const k of ["up", "down", "left", "right"] as const) if (g.input.hit(k)) this.move(k);
      this.poseLeft -= dt;
      g.benji.pose = this.poseLeft > 0 ? this.pose : null;
    }
    g.benji.lift = 1.2;
    g.live.meter = clamp(this.hits / this.total, 0, 1);
    g.live.sweetLo = 0.7;
    g.live.sweetHi = 1;
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const SG = FAIR.stage;
    _eye.set(SG.x - 13, Y0 + 3.8, SG.z - 3);
    _at.set(SG.x - 1, Y0 + 2.4, SG.z);
    this.aim(_eye, _at, dt, snap, 52, 3);
  }

  private done() {
    const g = this.g;
    const share = this.hits / this.total;
    const won = share >= 0.7;
    const sp = this.fair.spots.stage!;
    this.off(sp.x - 1, sp.z, Math.PI / 2);
    const best = g.save.best.talent ?? 0;
    const pct = Math.round(share * 100);
    if (pct > best) g.save.best.talent = pct;
    g.earn(won ? 30 : 5, won ? 3 : 0, { quiet: true });
    g.emit("talent", pct);
    g.showResults(
      {
        title: won ? "FIRST PLACE" : share >= 0.45 ? "HONORABLE MENTION" : "BACK TO PRACTICE",
        sub: "Mid-South Fair · Youth Talent Contest",
        rows: [
          ["Moves on the beat", `${this.hits} / ${this.total}`],
          ["Score", `${pct}%`],
          ["Best", `${Math.max(best, pct)}%`],
        ],
        pay: won ? 30 : 5,
        respect: won ? 3 : 0,
        tickets: 0,
        record: pct > best,
        again: "Perform again",
        win: won,
      },
      () => g.playFair("talent"),
      () => {},
    );
  }

  quit() {
    const sp = this.fair.spots.stage!;
    this.off(sp.x - 1, sp.z, Math.PI / 2);
  }

  hud(h: HudState) {
    h.machine = {
      name: "Youth Talent Contest",
      stats: [
        ["Moves", `${this.hits + this.misses} / ${this.total}`],
        ["On the beat", `${this.hits}`, "#39ff14"],
      ],
      call: this.call,
      meter: true,
      act: "",
    };
  }

  get state() {
    return {
      on: this.on,
      hits: this.hits,
      misses: this.misses,
      cue: this.cue,
      due: this.due,
      now: this.now(),
    };
  }
}
