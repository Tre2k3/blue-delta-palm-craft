import * as THREE from "three";
import type { HudState } from "../core/types";
import { clamp, damp, lerp } from "../core/util";
import type { Game } from "../game";
import { Machine } from "./floor";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ the midway stall

/**
 * What the three stall games share: aim across with the stick, hold for power, let go to
 * throw, and a ball that goes where the aim and the power said it would.
 */
abstract class Toss extends Machine {
  hints: [string, string][] = [
    ["A D", "Aim"],
    ["Hold Space", "Power"],
    ["Release", "Throw"],
    ["Q", "Walk away"],
  ];
  abstract readonly name: string;
  protected abstract readonly throws: number;
  /** Where on the power meter the good throw is. */
  protected abstract readonly sweet: [number, number];
  protected ball: THREE.Mesh;
  protected marker: THREE.Mesh;
  protected left = 0;
  protected score = 0;
  protected aim = 0;
  protected power = 0;
  protected phase: "aim" | "fly" | "show" = "aim";
  protected t = 0;
  protected time = 0;
  protected to = new THREE.Vector3();
  private from = new THREE.Vector3();
  private dir = 1;
  private charging = false;
  private wait = 0;
  private flight = 0.5;

  constructor(g: Game, ball: THREE.Mesh) {
    super(g);
    this.ball = ball;
    this.ball.visible = false;
    const ring = new THREE.TorusGeometry(0.06, 0.008, 6, 20);
    this.marker = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0x39ff14, toneMapped: false, transparent: true, opacity: 0.85, depthTest: false }));
    this.marker.renderOrder = 8;
    this.marker.visible = false;
    g.rooms.fun.group.add(this.ball, this.marker);
  }

  protected abstract stand(): { x: number; z: number };
  /** Where a throw with this aim and power comes down. */
  protected abstract landing(aim: number, power: number, out: THREE.Vector3): THREE.Vector3;
  /** Put everything back for a fresh round. */
  protected abstract reset(): void;
  /** The throw got there: score it and say what to shout. */
  protected abstract arrive(): string;
  /** The round is over. */
  protected abstract finish(): void;
  /** Whatever moves on its own: mouths, falling bottles. */
  protected tick(_dt: number) {}
  /** True ends the round before the throws run out. */
  protected over() {
    return false;
  }
  /** Where to look from while aiming. */
  protected eye(pos: THREE.Vector3, at: THREE.Vector3) {
    const s = this.stand();
    this.landing(0, (this.sweet[0] + this.sweet[1]) / 2, at);
    pos.set(s.x, 1.62, s.z - 0.2);
  }

  start() {
    this.left = this.throws;
    this.score = 0;
    this.reset();
    this.next();
    this.wait = 0.35;
    this.g.benji.visible = false;
    this.say("Hold Space, then let go", 2.2);
    this.frame(0, true);
  }

  private next() {
    this.phase = "aim";
    this.power = 0;
    this.dir = 1;
    this.charging = false;
    this.ball.visible = true;
    this.marker.visible = true;
  }

  /** The throwing hand: low and to the right of wherever the eye is, drawn back as the throw winds up. */
  private hand(out: THREE.Vector3) {
    this.eye(_a, _b);
    _b.sub(_a).normalize();
    _c.crossVectors(_b, _up).normalize();
    _d.crossVectors(_c, _b);
    const wind = this.charging ? this.power : 0;
    return out
      .copy(_a)
      .addScaledVector(_b, 0.62 - wind * 0.12)
      .addScaledVector(_c, 0.2 + this.aim * 0.1)
      .addScaledVector(_d, -0.2 + wind * 0.05);
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.time += dt;
    this.tickCall(dt);
    this.tick(dt);
    if (this.phase === "aim") {
      this.aim = clamp(this.aim + input.move().x * 1.15 * dt, -1, 1);
      if (this.wait > 0) this.wait -= dt;
      else if (!this.charging && input.down("action")) {
        this.charging = true;
        this.power = 0;
        this.dir = 1;
      }
      if (this.charging) {
        this.power += this.dir * dt * 0.9;
        if (this.power >= 1) {
          this.power = 1;
          this.dir = -1;
        } else if (this.power <= 0) {
          this.power = 0;
          this.dir = 1;
        }
        if (!input.down("action")) {
          this.charging = false;
          this.phase = "fly";
          this.t = 0;
          this.marker.visible = false;
          this.hand(this.from);
          this.landing(this.aim, this.power, this.to);
          this.flight = 0.34 + this.from.distanceTo(this.to) * 0.075;
          g.sound.whoosh();
        }
      }
      if (this.phase === "aim") {
        this.hand(this.ball.position);
        this.landing(this.aim, (this.sweet[0] + this.sweet[1]) / 2, this.marker.position);
        this.marker.lookAt(g.camera.position);
      }
    } else if (this.phase === "fly") {
      this.t += dt;
      const k = Math.min(1, this.t / this.flight);
      this.ball.position.lerpVectors(this.from, this.to, k);
      this.ball.position.y += Math.sin(k * Math.PI) * (0.18 + this.flight * 0.5);
      this.ball.rotation.x -= dt * 14;
      if (k >= 1) {
        this.phase = "show";
        this.t = 0;
        this.left--;
        this.say(this.arrive(), 1);
      }
    } else {
      this.t += dt;
      if (this.t > 0.85) {
        if (this.left <= 0 || this.over()) {
          this.ball.visible = false;
          this.finish();
          return;
        }
        this.next();
        this.wait = 0.1;
      }
    }
    g.live.meter = this.charging ? this.power : 0;
    g.live.sweetLo = this.sweet[0];
    g.live.sweetHi = this.sweet[1];
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    this.eye(_a, _b);
    this.aimCamera(_a, _b, 46, dt, snap);
  }

  quit() {
    this.ball.visible = false;
    this.marker.visible = false;
    this.reset();
    this.leave(this.stand(), Math.PI);
  }

  hud(h: HudState) {
    h.machine = {
      name: this.name,
      stats: [
        ["Score", String(this.score), "#39ff14"],
        ["Throws", String(Math.max(0, this.left))],
        ["Record", String(this.g.save.best[this.key] ?? 0)],
      ],
      call: this.call,
      meter: true,
      act: "Throw",
    };
  }

  protected abstract readonly key: string;

  /** Results card and tickets, the same shape for all three. */
  protected pay(title: string, sub: string, rows: [string, string][], tickets: number, win: boolean) {
    const g = this.g;
    const best = g.save.best[this.key] ?? 0;
    const record = this.score > best;
    if (record) g.save.best[this.key] = this.score;
    if (win) g.moment(1);
    const won = g.arcadeWin(tickets);
    g.showResults({ title, sub, rows: [...rows, ["Record", String(Math.max(best, this.score))]], pay: 0, respect: 0, tickets: won, record, win, again: "Go again" }, () => this.start(), () => this.quit());
  }
}

const baseball = () => new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.5, emissive: 0x554433, emissiveIntensity: 0.5 }));

/** Bottle Bash: six milk bottles in a pyramid, three balls. Take the bottom out and the rest comes with it. */
export class BottleBash extends Toss {
  readonly name = "Bottle Bash";
  protected readonly key = "bottles";
  protected readonly throws = 3;
  protected readonly sweet: [number, number] = [0.2, 0.33];
  /** Offsets from the middle of the shelf: across, and up. The third number is the row. */
  private static SPOTS: [number, number, number][] = [
    [-0.13, 0.095, 0],
    [0, 0.095, 0],
    [0.13, 0.095, 0],
    [-0.065, 0.285, 1],
    [0.065, 0.285, 1],
    [0, 0.475, 2],
  ];
  /** What each bottle stands on. */
  private static ON: number[][] = [[], [], [], [0, 1], [1, 2], [3, 4]];
  private bottles: { mesh: THREE.Group; up: boolean; v: THREE.Vector3; spin: number; t: number }[] = [];

  constructor(g: Game) {
    super(g, baseball());
    const glass = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.3, emissive: 0x8899aa, emissiveIntensity: 0.35 });
    const cap = new THREE.MeshStandardMaterial({ color: 0x2a6cff, roughness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.13, 12), glass);
      body.position.y = -0.03;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.044, 0.045, 10), glass);
      neck.position.y = 0.057;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.016, 10), cap);
      top.position.y = 0.087;
      b.add(body, neck, top);
      g.rooms.fun.group.add(b);
      this.bottles.push({ mesh: b, up: true, v: new THREE.Vector3(), spin: 0, t: 0 });
    }
    this.reset();
  }

  protected stand() {
    return this.g.rooms.fun.midway.bottles.stand;
  }

  protected reset() {
    const s = this.g.rooms.fun.midway.bottles;
    this.bottles.forEach((b, i) => {
      const [x, y] = BottleBash.SPOTS[i]!;
      b.up = true;
      b.t = 0;
      b.mesh.visible = true;
      b.mesh.rotation.set(0, 0, 0);
      b.mesh.position.set(s.x + x, s.y + y, s.z);
    });
  }

  protected landing(aim: number, power: number, out: THREE.Vector3) {
    const s = this.g.rooms.fun.midway.bottles;
    return out.set(s.x + aim * 0.3, s.y - 0.09 + power * 0.72, s.z + 0.03);
  }

  protected arrive() {
    const g = this.g;
    const s = g.rooms.fun.midway.bottles;
    const hit = this.bottles.map((b, i) => b.up && Math.hypot(this.to.x - (s.x + BottleBash.SPOTS[i]![0]), this.to.y - (s.y + BottleBash.SPOTS[i]![1])) < 0.1);
    if (!hit.some(Boolean)) {
      g.sound.bad();
      return this.to.y < s.y ? "LOW" : "MISSED";
    }
    // Whatever was standing on a bottle that went, goes too.
    let fell = 0;
    for (let i = 0; i < 6; i++) {
      const b = this.bottles[i]!;
      if (!b.up) continue;
      const lost = BottleBash.ON[i]!.some((k) => !this.bottles[k]!.up);
      if (!hit[i] && !lost) continue;
      b.up = false;
      b.t = 0;
      b.v.set((Math.random() - 0.5) * 1.6 + (BottleBash.SPOTS[i]![0] - (this.to.x - s.x)) * 5, 0.9 + Math.random() * 0.9, -1.2 - Math.random() * 0.8);
      b.spin = (Math.random() - 0.5) * 16;
      fell++;
    }
    this.score += fell;
    g.sound.pins(fell * 2);
    g.buzz(20 + fell * 8);
    this.ball.visible = false;
    return this.bottles.every((b) => !b.up) ? "CLEAN SWEEP!" : `${fell} DOWN`;
  }

  protected over() {
    return this.bottles.every((b) => !b.up);
  }

  protected tick(dt: number) {
    for (const b of this.bottles) {
      if (b.up || !b.mesh.visible) continue;
      b.t += dt;
      b.v.y -= 9 * dt;
      b.mesh.position.addScaledVector(b.v, dt);
      b.mesh.rotation.x += b.spin * dt;
      b.mesh.rotation.z += b.spin * 0.6 * dt;
      if (b.t > 0.75 || b.mesh.position.y < 0.1) b.mesh.visible = false;
    }
  }

  protected finish() {
    const all = this.score >= 6;
    this.pay(all ? "CLEAN SWEEP" : "BOTTLE BASH", all ? "All six. The man behind the counter is not smiling." : "Take a bottle out of the bottom row and whatever stands on it goes too.", [["Bottles down", `${this.score} of 6`]], all ? 30 : this.score * 3, all);
  }
}

/** Clown Toss: three mouths that open and shut, five balls. The fast one in the middle pays most. */
export class ClownToss extends Toss {
  readonly name = "Clown Toss";
  protected readonly key = "clowns";
  protected readonly throws = 5;
  protected readonly sweet: [number, number] = [0.42, 0.58];
  private static CLOWNS = [
    { period: 2.1, open: 0.56, phase: 0, pts: 1 },
    { period: 1.15, open: 0.42, phase: 0.5, pts: 3 },
    { period: 1.55, open: 0.5, phase: 0.9, pts: 2 },
  ];
  private teeth: THREE.Mesh[] = [];
  private fed = 0;

  constructor(g: Game) {
    super(g, baseball());
    const c = g.rooms.fun.midway.clowns;
    const mat = new THREE.MeshBasicMaterial({ color: 0xf6f1e6, toneMapped: false });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.079, 20), mat);
      m.position.set(c.x + (i - 1) * c.gap, c.y, c.z + 0.012);
      g.rooms.fun.group.add(m);
      this.teeth.push(m);
    }
  }

  protected stand() {
    return this.g.rooms.fun.midway.clowns.stand;
  }

  private open(i: number, at: number) {
    const k = ClownToss.CLOWNS[i]!;
    return ((at / k.period + k.phase) % 1) < k.open;
  }

  protected reset() {
    this.fed = 0;
  }

  protected landing(aim: number, power: number, out: THREE.Vector3) {
    const c = this.g.rooms.fun.midway.clowns;
    return out.set(c.x + aim * 0.8, c.y - 0.3 + power * 0.6, c.z + 0.04);
  }

  protected arrive() {
    const g = this.g;
    const c = g.rooms.fun.midway.clowns;
    const i = [0, 1, 2].find((k) => Math.abs(this.to.x - (c.x + (k - 1) * c.gap)) < 0.07 && Math.abs(this.to.y - c.y) < 0.07);
    if (i === undefined) {
      g.sound.board();
      return Math.abs(this.to.y - c.y) >= 0.07 ? (this.to.y > c.y ? "HIGH" : "LOW") : "OFF THE NOSE";
    }
    if (!this.open(i, this.time)) {
      g.sound.rim();
      return "SHUT!";
    }
    const pts = ClownToss.CLOWNS[i]!.pts;
    this.score += pts;
    this.fed++;
    this.ball.visible = false;
    g.sound.swish();
    g.buzz(30);
    return `IN! +${pts}`;
  }

  protected tick(dt: number) {
    this.teeth.forEach((m, i) => {
      // A row of teeth comes down over the mouth when it shuts.
      m.scale.y = lerp(m.scale.y, this.open(i, this.time) ? 0.04 : 1, damp(18, dt));
    });
  }

  protected finish() {
    const win = this.score >= 9;
    this.pay(win ? "FED THE CLOWNS" : "CLOWN TOSS", win ? "Five balls, five mouths full." : "Throw early: the ball takes half a second to get there. The middle one pays three.", [["Points", String(this.score)], ["In", `${this.fed} of 5`]], this.score * 3, win);
  }
}

/** Bag Toss: four bean bags at a leaning board. On the board is a point, in the hole is three. */
export class BagToss extends Toss {
  readonly name = "Bag Toss";
  protected readonly key = "bags";
  protected readonly throws = 4;
  protected readonly sweet: [number, number] = [0.62, 0.7];
  private bags: THREE.Mesh[] = [];
  private holed = 0;
  private slide: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; t: number; drop: boolean } | null = null;

  constructor(g: Game) {
    super(g, new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.13), new THREE.MeshStandardMaterial({ color: 0x39c21a, roughness: 0.9, emissive: 0x143a0c, emissiveIntensity: 0.6 })));
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.13), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd9a11a : 0x39c21a, roughness: 0.9 }));
      m.visible = false;
      g.rooms.fun.group.add(m);
      this.bags.push(m);
    }
  }

  protected stand() {
    return this.g.rooms.fun.midway.bags.stand;
  }

  protected reset() {
    this.holed = 0;
    this.slide = null;
    for (const b of this.bags) b.visible = false;
  }

  /** A point on the board: `u` across from the middle, `s` 0..1 from the front edge to the back. */
  private onBoard(u: number, s: number, out: THREE.Vector3) {
    const b = this.g.rooms.fun.midway.bags;
    return out.set(b.x + u, lerp(b.y0, b.y1, s) + 0.035, lerp(b.z0, b.z1, s));
  }

  private at(aim: number, power: number) {
    return { u: aim * 0.44, s: -0.25 + power * 1.5 };
  }

  protected landing(aim: number, power: number, out: THREE.Vector3) {
    const b = this.g.rooms.fun.midway.bags;
    const { u, s } = this.at(aim, power);
    if (s < 0) return out.set(b.x + u, 0.04, b.z0 - s * (b.z1 - b.z0) * 0.6 + 0.12);
    if (s > 1) return out.set(b.x + u, 0.04, b.z1 - 0.25);
    return this.onBoard(u, s, out);
  }

  protected eye(pos: THREE.Vector3, at: THREE.Vector3) {
    const s = this.stand();
    this.onBoard(0, 0.5, at);
    pos.set(s.x, 1.7, s.z - 0.25);
  }

  protected arrive() {
    const g = this.g;
    const b = g.rooms.fun.midway.bags;
    const len = Math.hypot(b.z1 - b.z0, b.y1 - b.y0);
    const { u, s } = this.at(this.aim, this.power);
    const bag = this.bags[this.throws - this.left - 1]!;
    this.ball.visible = false;
    if (s < 0 || s > 1 || Math.abs(u) > b.w / 2) {
      g.sound.bad();
      return s < 0 ? "SHORT" : s > 1 ? "LONG" : "OFF THE SIDE";
    }
    bag.visible = true;
    bag.rotation.set(-Math.atan2(b.y1 - b.y0, b.z0 - b.z1), Math.random() * 0.8, 0);
    this.onBoard(u, s, bag.position);
    const short = (b.hole - s) * len;
    if (Math.hypot(u, short) < b.r) {
      // Straight in.
      this.slide = { mesh: bag, from: bag.position.clone(), to: this.onBoard(0, b.hole, new THREE.Vector3()), t: 0, drop: true };
      this.score += 3;
      this.holed++;
      g.sound.swish();
      g.buzz(40);
      return "IN THE HOLE! +3";
    }
    // It slides a hand's width up the board, and a bag that lands just short of the hole drops in.
    const run = 0.05 + this.power * 0.12;
    const drops = Math.abs(u) < b.r * 0.85 && short > 0 && short < run + b.r * 0.4;
    this.slide = { mesh: bag, from: bag.position.clone(), to: this.onBoard(drops ? 0 : u, drops ? b.hole : Math.min(0.97, s + run / len), new THREE.Vector3()), t: 0, drop: drops };
    g.sound.board();
    if (drops) {
      this.score += 3;
      this.holed++;
      return "SLID IN! +3";
    }
    this.score += 1;
    return "ON THE BOARD +1";
  }

  protected tick(dt: number) {
    const sl = this.slide;
    if (!sl) return;
    sl.t += dt;
    const k = Math.min(1, sl.t / 0.3);
    sl.mesh.position.lerpVectors(sl.from, sl.to, 1 - (1 - k) * (1 - k));
    if (k >= 1) {
      if (sl.drop) sl.mesh.visible = false;
      this.slide = null;
    }
  }

  protected finish() {
    const win = this.holed >= 2;
    this.pay(win ? "BAGS IN THE HOLE" : "BAG TOSS", win ? "That is a backyard champion's arm." : "The green on the meter is the hole. A touch short still slides in.", [["Points", String(this.score)], ["In the hole", `${this.holed} of 4`]], this.score * 3, win);
  }
}

// ------------------------------------------------------------------ air hockey

const PUCK = 0.045;
const MALLET = 0.078;

/** Air hockey against whoever is on the far end of the table. First to five. */
export class AirHockey extends Machine {
  hints: [string, string][] = [
    ["W A S D", "Move the mallet"],
    ["Q", "Walk away"],
  ];
  private puck: THREE.Mesh;
  private mine: THREE.Mesh;
  private theirs: THREE.Mesh;
  /** Everything below is in table space: x across, z along, the player's end at +z. */
  private p = { x: 0, z: 0, vx: 0, vz: 0 };
  private me = { x: 0, z: 0, vx: 0, vz: 0 };
  private ai = { x: 0, z: 0, vx: 0, vz: 0 };
  private you = 0;
  private them = 0;
  private serve = 0;
  private idle = 0;
  private done = false;

  constructor(g: Game) {
    super(g);
    const group = g.rooms.fun.group;
    this.puck = new THREE.Mesh(new THREE.CylinderGeometry(PUCK, PUCK, 0.016, 20), new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false }));
    const mallet = (color: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(MALLET, MALLET, 0.03, 20), new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.5 }));
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.06, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.3 }));
      knob.position.y = 0.04;
      m.add(knob);
      return m;
    };
    this.mine = mallet(0x39ff14);
    this.theirs = mallet(0xff5ad1);
    group.add(this.puck, this.mine, this.theirs);
    this.rest();
  }

  /** Between games the puck sits in the middle and the mallets at their ends. */
  private rest() {
    const h = this.g.rooms.fun.hockey;
    this.p = { x: 0, z: 0, vx: 0, vz: 0 };
    this.me = { x: 0, z: h.hl * 0.7, vx: 0, vz: 0 };
    this.ai = { x: 0, z: -h.hl * 0.7, vx: 0, vz: 0 };
    this.place();
  }

  private place() {
    const h = this.g.rooms.fun.hockey;
    this.puck.position.set(h.x + this.p.x, h.y + 0.009, h.z + this.p.z);
    this.mine.position.set(h.x + this.me.x, h.y + 0.016, h.z + this.me.z);
    this.theirs.position.set(h.x + this.ai.x, h.y + 0.016, h.z + this.ai.z);
  }

  start() {
    this.you = 0;
    this.them = 0;
    this.done = false;
    this.rest();
    this.drop(Math.random() < 0.5 ? 1 : -1);
    this.g.benji.visible = false;
    this.say("First to five", 1.8);
    this.frame(0, true);
  }

  /** The puck is dropped on one side's half. */
  private drop(side: number) {
    const h = this.g.rooms.fun.hockey;
    this.p = { x: (Math.random() - 0.5) * 0.3, z: side * h.hl * 0.3, vx: 0, vz: 0 };
    this.serve = 0.7;
    this.idle = 0;
  }

  private strike(m: { x: number; z: number; vx: number; vz: number }) {
    const p = this.p;
    const dx = p.x - m.x;
    const dz = p.z - m.z;
    const d = Math.hypot(dx, dz);
    const min = PUCK + MALLET;
    if (d >= min || d < 0.0001) return false;
    const nx = dx / d;
    const nz = dz / d;
    p.x = m.x + nx * min;
    p.z = m.z + nz * min;
    // Bounce off the mallet as if off a moving wall.
    const rel = (p.vx - m.vx) * nx + (p.vz - m.vz) * nz;
    if (rel < 0) {
      p.vx -= 1.9 * rel * nx;
      p.vz -= 1.9 * rel * nz;
    }
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 4.6) {
      p.vx *= 4.6 / sp;
      p.vz *= 4.6 / sp;
    }
    return true;
  }

  update(dt: number) {
    const g = this.g;
    const h = g.rooms.fun.hockey;
    this.tickCall(dt);
    if (this.done) return;
    const step = Math.min(dt, 1 / 30);
    const wall = h.hw - PUCK;
    // The player's mallet goes where the stick says, on their own half.
    const mv = g.input.move();
    const me = this.me;
    const ox = me.x;
    const oz = me.z;
    me.x = clamp(me.x + mv.x * 2.5 * step, -h.hw + MALLET, h.hw - MALLET);
    me.z = clamp(me.z - mv.y * 2.5 * step, MALLET + 0.02, h.hl - MALLET);
    me.vx = (me.x - ox) / step;
    me.vz = (me.z - oz) / step;

    // The other end: shadow the puck across, step up and hit it when it comes into reach, then drop back.
    const ai = this.ai;
    const p = this.p;
    const ax = ai.x;
    const az = ai.z;
    // Slower than the player's hand, and a little slower to read the puck: it gets sharper as it falls behind.
    const quick = 0.95 + this.you * 0.1;
    let tx = clamp(p.x * 0.7, -h.hw + MALLET, h.hw - MALLET);
    let tz = -h.hl * 0.72;
    if (this.serve <= 0 && p.z < -0.02) {
      const behind = p.z < ai.z + 0.02;
      if (behind) {
        // It got past: go round it, not through it into the goal.
        tx = clamp(p.x + (p.x >= 0 ? -0.2 : 0.2), -h.hw + MALLET, h.hw - MALLET);
        tz = Math.max(-h.hl + MALLET, p.z - 0.14);
      } else if (p.vz < 0.6 || p.z < -h.hl * 0.45) {
        tx = clamp(p.x - p.x * 0.12, -h.hw + MALLET, h.hw - MALLET);
        tz = Math.min(-MALLET - 0.02, p.z + 0.03);
      }
    }
    const ddx = tx - ai.x;
    const ddz = tz - ai.z;
    const dd = Math.hypot(ddx, ddz);
    const go = Math.min(dd, quick * step);
    if (dd > 0.0001) {
      ai.x += (ddx / dd) * go;
      ai.z += (ddz / dd) * go;
    }
    ai.z = clamp(ai.z, -h.hl + MALLET, -MALLET - 0.02);
    ai.vx = (ai.x - ax) / step;
    ai.vz = (ai.z - az) / step;

    if (this.serve > 0) this.serve -= dt;
    else {
      // The puck, in two half steps so a hard shot cannot pass through a mallet.
      for (let i = 0; i < 2; i++) {
        const s = step / 2;
        p.x += p.vx * s;
        p.z += p.vz * s;
        const hit = this.strike(me) || this.strike(ai);
        if (hit) {
          g.sound.board();
          g.buzz(12);
        }
        if (Math.abs(p.x) > wall) {
          p.x = Math.sign(p.x) * wall;
          p.vx = -p.vx * 0.94;
          g.sound.step();
        }
        const end = h.hl - PUCK;
        if (Math.abs(p.z) > end) {
          if (Math.abs(p.x) < h.goal / 2 - PUCK * 0.4) {
            if (Math.abs(p.z) > h.hl + PUCK) return this.goal(p.z < 0);
          } else {
            p.z = Math.sign(p.z) * end;
            p.vz = -p.vz * 0.94;
            g.sound.step();
          }
        }
      }
      const drag = Math.exp(-0.22 * step);
      p.vx *= drag;
      p.vz *= drag;
      // A puck left dead in a corner gets a nudge back toward whoever it is nearer.
      this.idle = Math.hypot(p.vx, p.vz) < 0.12 ? this.idle + dt : 0;
      if (this.idle > 2.2) {
        p.vx = (Math.random() - 0.5) * 0.6;
        p.vz = p.z > 0 ? 0.7 : -0.7;
        this.idle = 0;
      }
    }
    this.place();
    this.frame(dt, false);
  }

  private goal(mine: boolean) {
    const g = this.g;
    if (mine) {
      this.you++;
      g.sound.swish();
      g.buzz(60);
      g.stage.setPunch(0.4);
      this.say("GOAL!", 1.1);
    } else {
      this.them++;
      g.sound.bad();
      this.say("THEY SCORE", 1.1);
    }
    if (this.you >= 5 || this.them >= 5) return this.finish();
    // Loser of the point gets the puck.
    this.drop(mine ? -1 : 1);
    this.place();
    g.push();
  }

  private finish() {
    const g = this.g;
    this.done = true;
    const won = this.you > this.them;
    const best = g.save.best.hockey ?? 0;
    const margin = this.you - this.them;
    const record = won && margin > best;
    if (record) g.save.best.hockey = margin;
    if (won) g.moment(1);
    const tickets = g.arcadeWin(won ? 16 + margin * 2 : this.you * 2);
    g.showResults(
      {
        title: won ? "TABLE'S YOURS" : "THEY TOOK IT",
        sub: won ? (this.them === 0 ? "Five nothing. They are still looking for the puck." : "Winner stays on.") : "Stay between the puck and your goal, and hit it when it is on your half.",
        rows: [
          ["You", String(this.you)],
          ["Them", String(this.them)],
          ["Best win", best || record ? `by ${Math.max(best, won ? margin : 0)}` : "none yet"],
        ],
        pay: 0,
        respect: 0,
        tickets,
        record,
        win: won,
        again: "Run it back",
      },
      () => this.start(),
      () => this.quit(),
    );
  }

  private frame(dt: number, snap: boolean) {
    const h = this.g.rooms.fun.hockey;
    _a.set(h.x, h.y + 1.25, h.z + h.hl + 1.05);
    _b.set(h.x, h.y, h.z - 0.18);
    this.aimCamera(_a, _b, 50, dt, snap);
  }

  quit() {
    this.done = false;
    this.rest();
    this.leave(this.g.rooms.fun.hockey.stand, Math.PI);
  }

  hud(h: HudState) {
    h.machine = {
      name: "Air Hockey",
      stats: [
        ["You", String(this.you), "#39ff14"],
        ["Them", String(this.them), "#ff5ad1"],
        ["To", "5"],
      ],
      call: this.call,
      meter: false,
      act: "",
    };
  }
}
