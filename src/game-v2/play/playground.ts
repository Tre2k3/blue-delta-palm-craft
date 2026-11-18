import * as THREE from "three";
import type { HudState } from "../core/types";
import { clamp, damp } from "../core/util";
import type { Activity, Game } from "../game";
import { CURB, SLIDE, SWING } from "../world/map";

const Y0 = CURB;
const G = 9.8;
/** As far as the chains go either way, radians. */
const MAX = 1.42;
/** What his legs add on the way forward, rad/s². */
const PUMP = 1.25;
/** Where the seat meets him on the standing drawing and on the seated one, as a share of his height. */
const HIPS = 0.36;
const HIPS_SAT = 0.2;
/** The chute: how steep, how long, and what the plastic takes off. */
const PITCH = Math.atan2(SLIDE.top.y - SLIDE.foot.y, SLIDE.foot.z - SLIDE.top.z);
const RUN = Math.hypot(SLIDE.top.y - SLIDE.foot.y, SLIDE.foot.z - SLIDE.top.z);
const RUB = 0.1;

const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();

const metres = (cm: number) => `${(cm / 100).toFixed(1)} m`;

/**
 * The swing in the park. Holding the button on the way forward pumps it higher, holding it on
 * the way back only drags. Letting go of the chains at the right moment on the way up throws
 * Benji out over the wood chips: how far he lands from the frame is the score, and a little flag
 * stays where his best one came down.
 */
export class Swing implements Activity {
  hints: [string, string][] = [
    ["Hold Space", "Pump on the way forward"],
    ["E", "Jump off"],
    ["Q", "Step off"],
  ];
  private arm = new THREE.Group();
  private flag = new THREE.Group();
  /** Angle from straight down, forward (south) positive, and how fast it is changing. */
  private a = 0;
  private w = 0;
  private riding = false;
  private phase: "ride" | "air" | "land" = "ride";
  private t = 0;
  /** In the air: where his hips are and how they are moving. */
  private fly = { z: 0, y: 0, vz: 0, vy: 0, lean: 0 };
  private last = 0;
  private record = false;
  private call = "";
  private callLeft = 0;
  private look = new THREE.Vector3();
  private said = false;

  constructor(private g: Game) {
    const steel = new THREE.MeshStandardMaterial({ color: 0x6f757e, roughness: 0.4, metalness: 0.7 });
    const L = SWING.len;
    for (const dx of [-0.2, 0.2]) {
      const chain = new THREE.Mesh(new THREE.BoxGeometry(0.035, L - 0.03, 0.035), steel);
      chain.position.set(dx, -L / 2, 0);
      this.arm.add(chain);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.2), new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.7 }));
    seat.position.y = -L;
    seat.castShadow = true;
    this.arm.add(seat);
    this.arm.position.set(SWING.x, Y0 + SWING.top, SWING.z);
    // The flag where his best jump came down.
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 5), steel);
    pole.position.y = 0.35;
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16), new THREE.MeshBasicMaterial({ color: 0x39ff14, side: THREE.DoubleSide, toneMapped: false }));
    cloth.position.set(0.14, 0.6, 0);
    this.flag.add(pole, cloth);
    this.flag.visible = false;
    g.city.exterior.add(this.arm, this.flag);
    this.plant();
  }

  /** Stand the flag at the best jump on the save. */
  private plant() {
    const best = this.g.save.best.swing ?? 0;
    this.flag.visible = best > 0;
    this.flag.position.set(SWING.x + 0.75, Y0 + 0.012, SWING.z + best / 100);
  }

  /** The empty seat keeps swinging after he leaves it, and comes to rest. */
  idle(dt: number) {
    if (this.riding && this.phase === "ride") return;
    if (Math.abs(this.a) < 0.002 && Math.abs(this.w) < 0.002) {
      if (this.a !== 0) {
        this.a = this.w = 0;
        this.arm.rotation.x = 0;
      }
      return;
    }
    this.swing(dt, 0, 0.45);
    this.arm.rotation.x = -this.a;
  }

  /** The pendulum over one frame, in short steps. */
  private swing(dt: number, push: number, drag: number) {
    const L = SWING.len;
    for (let left = Math.min(dt, 0.1); left > 0; left -= 1 / 240) {
      const h = Math.min(1 / 240, left);
      this.w += (-(G / L) * Math.sin(this.a) + push * Math.cos(this.a) - drag * this.w) * h;
      this.a += this.w * h;
      if (Math.abs(this.a) > MAX) {
        this.a = Math.sign(this.a) * MAX;
        this.w *= -0.15;
      }
    }
  }

  start() {
    const g = this.g;
    this.riding = true;
    this.phase = "ride";
    this.t = 0;
    this.a = 0;
    this.w = 0;
    this.last = 0;
    this.record = false;
    this.said = false;
    this.plant();
    this.say("Hold on the way forward to pump. E jumps off.", 3.4);
    this.place();
    this.frame(0, true);
    g.push();
  }

  private say(text: string, seconds = 1.6) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  /** Where the seat is right now: metres south of the frame, and above the ground. */
  private seat() {
    return { z: SWING.len * Math.sin(this.a), y: SWING.top - SWING.len * Math.cos(this.a) };
  }

  /** Sit Benji on the seat, leaning with the chains. */
  private place() {
    const g = this.g;
    const s = this.seat();
    const sat = g.benji.has("swing");
    const k = (sat ? HIPS_SAT : HIPS) * g.benji.height;
    g.pos.x = SWING.x;
    g.pos.z = SWING.z + s.z + Math.sin(this.a) * k;
    g.heading = 0;
    g.benji.lift = Math.max(0, s.y - Math.cos(this.a) * k);
    g.benji.speed = 0;
    g.benji.pose = sat ? "swing" : null;
    // Seen from the west: south is to the right, so leaning back at the front of the arc is a turn to the left.
    // Sat down he leans all the way with the chains; a standing drawing only part of it.
    g.benji.tilt = (g.camera.position.x < SWING.x ? 1 : -1) * this.a * (sat ? 1 : 0.55);
    this.arm.rotation.x = -this.a;
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.t += dt;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    if (this.phase === "ride") {
      const still = Math.abs(this.a) < 0.07 && Math.abs(this.w) < 0.16;
      // From rest, a push off the ground starts it.
      if (still && input.hit("action")) {
        this.w = 1.25;
        g.sound.step();
      }
      const held = input.down("action") && !still;
      const before = this.w;
      this.swing(dt, held ? (this.w >= 0 ? PUMP : -PUMP * 0.55) : 0, 0.05);
      if (before > 0 && this.w <= 0 && this.a > 0.5) g.sound.whoosh();
      if (!this.said && this.height() > 0.82) {
        this.said = true;
        this.say("That is as high as she goes. Jump on the way up!", 2.4);
      }
      this.place();
      if (input.hit("interact")) this.jump();
    } else if (this.phase === "air") {
      const f = this.fly;
      f.vy -= G * dt;
      f.z += f.vz * dt;
      f.y += f.vy * dt;
      f.lean += (0 - f.lean) * damp(5, dt);
      const k = HIPS * g.benji.height;
      const soles = f.y - k;
      g.pos.x = SWING.x;
      g.pos.z = SWING.z + f.z;
      g.benji.lift = Math.max(0, soles);
      g.benji.tilt = (g.camera.position.x < SWING.x ? 1 : -1) * f.lean;
      g.benji.pose = f.vy > 0 ? "cheer" : null;
      this.idle(dt);
      if (soles <= 0 && f.vy < 0) this.landed();
    } else {
      this.idle(dt);
      g.benji.pose = this.record ? "cheer" : null;
      if (this.t > (this.record ? 1.9 : 1.1)) this.done();
    }
    g.live.meter = this.phase === "ride" ? this.height() : 0;
    g.live.sweetLo = 0.8;
    g.live.sweetHi = 1;
    g.live.aim = 0;
    this.frame(dt, false);
  }

  /** How high this swing will carry, 0 to 1 of all the chains allow. */
  private height() {
    const L = SWING.len;
    const e = 0.5 * this.w * this.w + (G / L) * (1 - Math.cos(this.a));
    return clamp(Math.sqrt(e / ((G / L) * (1 - Math.cos(MAX)))), 0, 1);
  }

  /** Let go of the chains. Also what the tests call. */
  jump() {
    const g = this.g;
    if (this.phase !== "ride") return;
    const v = SWING.len * this.w;
    // Hardly moving: he just steps off.
    if (Math.abs(v) < 1.1 && Math.abs(this.a) < 0.3) {
      this.quit();
      return;
    }
    const s = this.seat();
    this.fly = { z: s.z, y: s.y, vz: Math.cos(this.a) * v, vy: Math.sin(this.a) * v + 0.6, lean: this.a };
    this.phase = "air";
    this.t = 0;
    // The seat kicks back as he leaves it.
    this.w *= 0.45;
    g.sound.whoosh();
    g.buzz(20);
    g.push();
  }

  private landed() {
    const g = this.g;
    this.phase = "land";
    this.t = 0;
    g.benji.lift = 0;
    g.benji.tilt = 0;
    const cm = Math.round(this.fly.z * 100);
    this.last = cm;
    g.sound.step();
    g.sound.board();
    g.buzz(35);
    const best = g.save.best.swing ?? 0;
    if (cm <= 60) {
      this.say(cm < 0 ? "Off the back. Jump on the way forward." : "Hardly left the seat.", 1.6);
      return;
    }
    this.record = cm > best;
    if (this.record) {
      g.save.best.swing = cm;
      this.plant();
      g.sound.cheer();
      g.earn(Math.round(cm / 20), cm >= 400 ? 1 : 0, { quiet: true });
      if (cm >= 420) g.moment(1);
      this.say(`${metres(cm)}  ·  YOUR BEST JUMP`, 1.9);
    } else this.say(`${metres(cm)}   best ${metres(best)}`, 1.4);
    g.emit("swing", cm);
  }

  private done() {
    const g = this.g;
    this.riding = false;
    g.heading = 0;
    g.camYaw = 0;
    g.live.meter = 0;
    g.end("walk");
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const out = this.phase === "ride" ? 0.9 : clamp(this.fly.z, 0.9, 7.5);
    _eye.set(SWING.x - 5.7, Y0 + 1.55, SWING.z + 1.1 + out * 0.6);
    _at.set(SWING.x, Y0 + 1.4, SWING.z + out * 0.85);
    const k = snap ? 1 : damp(4, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    g.camera.lookAt(this.look);
    if (Math.abs(g.camera.fov - 56) > 0.01) {
      g.camera.fov = 56;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    this.riding = false;
    // Off to the side of the seat, which is left swinging.
    g.pos.x = SWING.x - 0.75;
    g.pos.z = SWING.z + 0.2;
    g.heading = 0;
    g.camYaw = 0;
    g.live.meter = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    const best = this.g.save.best.swing ?? 0;
    const ready = this.phase === "ride" && this.w > 0.6 && this.a > 0.25 && this.a < 1.05;
    h.machine = {
      name: "The swings",
      stats: [
        ["Height", `${Math.round(this.height() * 100)}%`, "#39ff14"],
        ["Jump", this.last > 0 ? metres(this.last) : "-"],
        ["Best", best > 0 ? metres(best) : "-", "#f4d77a"],
      ],
      call: this.call || (ready && this.height() > 0.55 ? "JUMP!" : ""),
      meter: this.phase === "ride",
      act: "Pump",
    };
  }

  /** For the tests. */
  get state() {
    return { phase: this.phase, a: this.a, w: this.w, height: this.height(), last: this.last, riding: this.riding, seat: this.arm.rotation.x };
  }
}

/**
 * The slide. Up the ladder, a moment on the deck, and down the chute as fast as the plastic lets
 * him: off the end with a hop and a few steps to stop.
 */
export class Slide implements Activity {
  hints: [string, string][] = [
    ["Space", "Push off"],
    ["Q", "Climb down"],
  ];
  private phase: "climb" | "top" | "down" | "out" = "climb";
  private t = 0;
  /** Metres down the chute, and how fast. */
  private s = 0;
  private v = 0;
  private fastest = 0;
  private hop = 0;
  private vy = 0;
  private z = 0;
  private call = "";
  private callLeft = 0;
  private look = new THREE.Vector3();
  private rides = 0;

  constructor(private g: Game) {}

  start() {
    const g = this.g;
    this.phase = "climb";
    this.t = 0;
    this.s = this.v = this.hop = this.vy = 0;
    this.fastest = 0;
    this.call = "";
    this.callLeft = 0;
    g.pos.x = SLIDE.x;
    g.pos.z = SLIDE.z - 1.15;
    g.heading = 0;
    this.frame(0, true);
    g.push();
  }

  private say(text: string, seconds = 1.6) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.t += dt;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    // Seen from the east, south is to the left: leaning back down the chute is a turn to the right.
    const side = g.camera.position.x > SLIDE.x ? -1 : 1;
    g.pos.x = SLIDE.x;
    g.heading = 0;
    if (this.phase === "climb") {
      // Up the rungs, then two steps across the deck to the top of the chute.
      const k = clamp(this.t / 1.5, 0, 1);
      const up = clamp(k / 0.72, 0, 1);
      g.pos.z = SLIDE.z - 1.15 + up * 0.5 + clamp((k - 0.72) / 0.28, 0, 1) * 0.95;
      g.benji.lift = up * up * (3 - 2 * up) * SLIDE.deck;
      g.benji.speed = 2.2;
      g.benji.tilt = side * -0.1 * (up < 1 ? 1 : 0);
      if (k >= 1) {
        this.phase = "top";
        this.t = 0;
        this.say("Push off when you are ready", 4);
        g.push();
      }
    } else if (this.phase === "top") {
      g.pos.z = SLIDE.z + 0.3;
      g.benji.lift = SLIDE.deck;
      g.benji.speed = 0;
      g.benji.tilt = 0;
      if (input.hit("action") || input.hit("interact") || this.t > 6) this.push();
    } else if (this.phase === "down") {
      this.v += G * (Math.sin(PITCH) - RUB * Math.cos(PITCH)) * dt;
      this.s += this.v * dt;
      this.fastest = Math.max(this.fastest, this.v);
      const s = Math.min(this.s, RUN);
      g.pos.z = SLIDE.z + SLIDE.top.z + Math.cos(PITCH) * s + 0.1;
      g.benji.lift = Math.max(0, SLIDE.top.y - Math.sin(PITCH) * s + 0.04);
      g.benji.speed = 0;
      g.benji.pose = g.benji.has("slide") ? "slide" : "cheer";
      g.benji.tilt += (side * -0.42 - g.benji.tilt) * damp(10, dt);
      if (this.s >= RUN) {
        // Off the lip: what speed he has carries him out and a little up.
        this.phase = "out";
        this.t = 0;
        this.z = g.pos.z;
        this.hop = g.benji.lift;
        this.vy = 1.5;
        this.v *= Math.cos(PITCH);
        g.sound.step();
        g.push();
      }
    } else {
      this.vy -= G * dt;
      this.hop = Math.max(0, this.hop + this.vy * dt);
      if (this.hop <= 0) this.v -= this.v * damp(3.2, dt);
      this.z += this.v * dt;
      g.pos.z = this.z;
      g.benji.lift = this.hop;
      g.benji.tilt += (0 - g.benji.tilt) * damp(9, dt);
      g.benji.speed = this.hop > 0 ? 0 : this.v;
      g.benji.pose = this.hop > 0 || this.v < 0.9 ? "cheer" : null;
      if (this.hop <= 0 && this.v < 0.35 && this.t > 0.9) this.done();
    }
    g.live.meter = 0;
    this.frame(dt, false);
  }

  /** Off the deck and down. Also what the tests call. */
  push() {
    if (this.phase !== "top") return;
    const g = this.g;
    this.phase = "down";
    this.t = 0;
    this.s = 0;
    this.v = 1.1;
    this.call = "";
    g.sound.whoosh();
    g.buzz(15);
    g.push();
  }

  private done() {
    const g = this.g;
    this.rides++;
    const best = g.save.best.slide ?? 0;
    const mph = Math.round(this.fastest * 2.237);
    if (mph > best) g.save.best.slide = mph;
    g.emit("slide", mph);
    g.toast(`Down the slide at ${mph} mph`, 2.4);
    g.heading = 0;
    g.camYaw = 0;
    g.end("walk");
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const along = clamp(g.pos.z - SLIDE.z, -1, 6.5);
    _eye.set(SLIDE.x + 6.1, Y0 + 2.25, SLIDE.z + 1.5 + along * 0.45);
    _at.set(SLIDE.x, Y0 + 0.95 + g.benji.lift * 0.35, SLIDE.z + 0.6 + along * 0.6);
    const k = snap ? 1 : damp(4.5, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    g.camera.lookAt(this.look);
    if (Math.abs(g.camera.fov - 52) > 0.01) {
      g.camera.fov = 52;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    g.pos.x = SLIDE.x;
    g.pos.z = SLIDE.z - 1.6;
    g.heading = 0;
    g.camYaw = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    const best = this.g.save.best.slide ?? 0;
    h.machine = {
      name: "The slide",
      stats: [
        ["Speed", `${Math.round(this.v * 2.237)} mph`, "#39ff14"],
        ["Fastest", best > 0 ? `${best} mph` : "-", "#f4d77a"],
      ],
      call: this.call,
      meter: false,
      act: "Go",
    };
  }

  /** For the tests. */
  get state() {
    return { phase: this.phase, s: this.s, v: this.v, lift: this.g.benji.lift, z: this.g.pos.z, rides: this.rides };
  }
}
