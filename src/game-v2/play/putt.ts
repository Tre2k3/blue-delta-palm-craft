import * as THREE from "three";
import type { HudState } from "../core/types";
import { clamp, damp } from "../core/util";
import type { Activity, Game } from "../game";
import { CURB } from "../world/map";
import { BALL_R, CUP_R, HOLES, PUTT_PAR, PUTT_STAND, feltHeight, onSlope, playDir, wallsOf, type Hole, type Seg } from "../world/rec-map";

const Y0 = CURB + 0.022;
/** How fast felt takes speed off the ball, and sand, m/s². */
const FELT = 1.35;
const SAND = 8;
const G = 9.8;
/** Off the tee: the slowest and the hardest putt, m/s. */
const SOFT = 1;
const HARD = 9;
/** Strokes after which the ball is picked up, and what that hole costs. */
const LIMIT = 6;
const STEP = 1 / 240;
/** How near the bottom of its turn a paddle shuts the gate, radians either side. */
const SHUT = 0.36;

const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();

const NAMES: Record<string, string> = { "-2": "EAGLE", "-1": "BIRDIE", "0": "PAR", "1": "BOGEY", "2": "DOUBLE BOGEY" };

/**
 * Sack Putt: nine holes behind Benji's house. Left and right turn the putter, holding fills the
 * meter, letting go putts. The ball rolls on felt, dies in sand, comes back down a hill it did not
 * get over, bounces off kerbs and posts, and has to wait for the paddle wheel like everybody else.
 */
export class Putt implements Activity {
  hints: [string, string][] = [
    ["A D", "Aim"],
    ["Hold Space", "Power"],
    ["Release", "Putt"],
    ["Q", "Walk off"],
  ];
  private ball: THREE.Mesh;
  private guide: THREE.Mesh;
  private club: THREE.Group;
  private wheel: THREE.Group;
  private turn = 0;
  private at = 0;
  private walls: Seg[] = [];
  private x = 0;
  private z = 0;
  private vx = 0;
  private vz = 0;
  /** Where the ball last lay still: it goes back there if it ever gets out. */
  private restX = 0;
  private restZ = 0;
  private aim = Math.PI;
  private power = 0;
  private dir = 1;
  private charging = false;
  private strokes = 0;
  private card: number[] = [];
  private aces = 0;
  private phase: "aim" | "roll" | "sunk" | "over" = "aim";
  private t = 0;
  private sweet: [number, number] = [0.3, 0.4];
  private call = "";
  private callLeft = 0;
  private lipped = false;
  private look = new THREE.Vector3();
  private on = false;
  private knock = 0;

  constructor(private g: Game) {
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, emissive: 0x39ff14, emissiveIntensity: 0.25 }));
    this.ball.castShadow = true;
    this.ball.visible = false;
    const gg = new THREE.PlaneGeometry(0.035, 1);
    gg.rotateX(-Math.PI / 2);
    gg.translate(0, 0, 0.5);
    this.guide = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, toneMapped: false, depthTest: false }));
    this.guide.renderOrder = 7;
    this.guide.visible = false;
    // The putter: a head behind the ball and a shaft up toward his hands.
    this.club = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.25, metalness: 0.9 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.04), steel);
    head.position.set(0, 0.02, -0.07);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.95, 6), steel);
    shaft.position.set(0.19, 0.46, -0.09);
    shaft.rotation.z = -0.4;
    this.club.add(head, shaft);
    this.club.visible = false;
    // The paddle wheel on the sixth: it never stops, played or not.
    this.wheel = new THREE.Group();
    const wh = HOLES.find((h) => h.wheel);
    if (wh?.wheel) {
      const red = new THREE.MeshStandardMaterial({ color: 0xb5262a, roughness: 0.6 });
      const cream = new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.7 });
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 10), red);
      hub.rotation.z = Math.PI / 2;
      this.wheel.add(hub);
      const n = wh.wheel.paddles;
      for (let k = 0; k < n; k++) {
        const arm = new THREE.Group();
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 0.04), red);
        spoke.position.y = -0.34;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.3, 0.03), cream);
        blade.position.y = -0.56;
        arm.add(spoke, blade);
        arm.rotation.x = (k * Math.PI * 2) / n;
        this.wheel.add(arm);
      }
      const [x0, z0, x1] = wh.wheel.gap;
      this.wheel.position.set(wh.at[0] + (x0 + x1) / 2, Y0 + 0.74, wh.at[1] + z0);
    }
    g.city.exterior.add(this.ball, this.guide, this.club, this.wheel);
  }

  /** The wheel turns whether anyone is playing or not. */
  idle(dt: number) {
    const w = HOLES.find((h) => h.wheel)?.wheel;
    if (!w) return;
    this.turn += w.speed * dt;
    this.wheel.rotation.x = this.turn;
  }

  private get hole(): Hole {
    return HOLES[this.at]!;
  }

  /** Is the wheel's gate shut right now? */
  private shut() {
    const w = this.hole.wheel;
    if (!w) return false;
    const arc = (Math.PI * 2) / w.paddles;
    const phase = ((this.turn % arc) + arc) % arc;
    return phase < SHUT || phase > arc - SHUT;
  }

  start() {
    this.on = true;
    this.card = [];
    this.aces = 0;
    this.tee(0);
    this.frame(0, true);
  }

  private tee(n: number) {
    const g = this.g;
    this.at = n;
    const h = this.hole;
    this.walls = wallsOf(h);
    this.x = this.restX = h.tee[0];
    this.z = this.restZ = h.tee[1];
    this.vx = this.vz = 0;
    this.strokes = 0;
    // Straight down the hole to begin with.
    this.aim = playDir(h) > 0 ? 0 : Math.PI;
    this.phase = "aim";
    this.t = 0;
    this.power = 0;
    this.charging = false;
    this.ball.visible = true;
    this.ball.scale.setScalar(1);
    this.hint();
    this.say(`${h.name.toUpperCase()}  ·  PAR ${h.par}`, 2.2);
    g.toast(h.tip, 5);
    g.push();
  }

  /** The stretch of the meter that would just reach the cup in a straight line from here. */
  private hint() {
    const h = this.hole;
    const d = Math.hypot(h.cup[0] - this.x, h.cup[1] - this.z);
    const climb = Math.max(0, feltHeight(h, h.cup[1]) - feltHeight(h, this.z));
    const v = Math.sqrt(2 * FELT * d * 1.14 + 2 * G * climb * 1.25);
    const p = clamp((v - SOFT) / (HARD - SOFT), 0.06, 0.94);
    this.sweet = [p - 0.05, p + 0.05];
  }

  private say(text: string, seconds = 1.6) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  /** One short step of the ball. */
  private step(h: number) {
    const hole = this.hole;
    const g = this.g;
    // The hill pulls it back toward the tee.
    const r = hole.ramp;
    if (r && onSlope(hole, this.z)) this.vz += Math.sign(r.z0 - r.z1) * ((G * r.h) / Math.hypot(r.z0 - r.z1, r.h)) * h;
    let speed = Math.hypot(this.vx, this.vz);
    const inSand = (hole.sand ?? []).some(([x0, z0, x1, z1]) => this.x > x0 && this.x < x1 && this.z > z0 && this.z < z1);
    const drop = Math.min(speed, (inSand ? SAND : FELT) * h);
    if (speed > 1e-6) {
      this.vx -= (this.vx / speed) * drop;
      this.vz -= (this.vz / speed) * drop;
    }
    this.x += this.vx * h;
    this.z += this.vz * h;

    const bounce = (cx: number, cz: number, reach: number, spring: number, kick: number) => {
      const dx = this.x - cx;
      const dz = this.z - cz;
      const d = Math.hypot(dx, dz);
      if (d >= reach || d < 1e-6) return;
      const nx = dx / d;
      const nz = dz / d;
      this.x = cx + nx * reach;
      this.z = cz + nz * reach;
      const into = this.vx * nx + this.vz * nz;
      if (into >= 0) return;
      const out = Math.max(-into * spring, kick);
      this.vx += nx * (out - into);
      this.vz += nz * (out - into);
      if (-into > 0.6 && this.knock <= 0) {
        this.knock = 0.08;
        if (kick > 0) g.sound.bounce(0.8);
        else g.sound.board();
      }
    };
    const wall = ([x0, z0, x1, z1]: Seg, spring: number) => {
      const ex = x1 - x0;
      const ez = z1 - z0;
      const k = clamp(((this.x - x0) * ex + (this.z - z0) * ez) / (ex * ex + ez * ez), 0, 1);
      bounce(x0 + ex * k, z0 + ez * k, BALL_R, spring, 0);
    };
    for (const s of this.walls) wall(s, 0.72);
    if (hole.wheel && this.shut()) wall(hole.wheel.gap, 0.55);
    for (const [px, pz, pr] of hole.posts ?? []) bounce(px, pz, pr + BALL_R, 1.05, 1.3);

    // The cup takes anything slow enough; a ball going too fast runs over the lip and is knocked off line.
    const dx = hole.cup[0] - this.x;
    const dz = hole.cup[1] - this.z;
    const d = Math.hypot(dx, dz);
    speed = Math.hypot(this.vx, this.vz);
    if (d < CUP_R - 0.01) {
      if (speed < 3.1) return true;
      if (!this.lipped) {
        this.lipped = true;
        const side = dx * this.vz - dz * this.vx > 0 ? 1 : -1;
        const c = Math.cos(0.35 * side);
        const s = Math.sin(0.35 * side);
        const nx = (this.vx * c - this.vz * s) * 0.78;
        this.vz = (this.vx * s + this.vz * c) * 0.78;
        this.vx = nx;
        this.say("Lipped out: too hard", 1.2);
        g.sound.rim();
      }
    } else if (d > CUP_R + 0.05) this.lipped = false;
    return false;
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    const hole = this.hole;
    this.t += dt;
    if (this.knock > 0) this.knock -= dt;
    this.idle(dt);
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    if (this.phase === "aim") {
      // Right on the stick turns the putter to the right of where he is looking.
      this.aim -= input.move().x * (this.charging ? 0.35 : 0.95) * dt;
      if (!this.charging && this.t > 0.3 && input.down("action")) {
        this.charging = true;
        this.power = 0;
        this.dir = 1;
      }
      if (this.charging) {
        this.power += this.dir * dt * 0.62;
        if (this.power >= 1) {
          this.power = 1;
          this.dir = -1;
        } else if (this.power <= 0) {
          this.power = 0;
          this.dir = 1;
        }
        if (!input.down("action")) this.putt(this.aim, this.power);
      }
    } else if (this.phase === "roll") {
      let sunk = false;
      for (let left = dt; left > 0 && !sunk; left -= STEP) sunk = this.step(Math.min(STEP, left));
      const speed = Math.hypot(this.vx, this.vz);
      this.ball.rotation.x += speed * dt * 9;
      const xs = hole.outline.map((p) => p[0]);
      const zs = hole.outline.map((p) => p[1]);
      const out = this.x < Math.min(...xs) - 0.6 || this.x > Math.max(...xs) + 0.6 || this.z < Math.min(...zs) - 0.6 || this.z > Math.max(...zs) + 0.6;
      const sloped = onSlope(hole, this.z);
      if (sunk) this.sink();
      else if (out) {
        this.x = this.restX;
        this.z = this.restZ;
        this.vx = this.vz = 0;
        this.strokes++;
        this.say("Out of bounds: one stroke", 1.6);
        this.rest();
      } else if ((speed < 0.05 && !sloped) || this.t > 14) {
        this.vx = this.vz = 0;
        this.rest();
      }
    } else if (this.phase === "sunk") {
      this.ball.scale.setScalar(Math.max(0.01, 1 - this.t * 4));
      if (this.t > 2.1) {
        if (this.at + 1 >= HOLES.length) this.finish();
        else {
          this.tee(this.at + 1);
          this.frame(0, true);
        }
      }
    }

    // The ball, the putter behind it, the line he is looking down, and Benji at its side.
    const [ox, oz] = hole.at;
    const wx = ox + this.x;
    const wz = oz + this.z;
    const y = Y0 + feltHeight(hole, this.z) + BALL_R;
    const fx = Math.sin(this.aim);
    const fz = Math.cos(this.aim);
    if (this.phase !== "sunk") this.ball.position.set(wx, y, wz);
    const aiming = this.phase === "aim";
    this.guide.visible = aiming;
    this.club.visible = aiming || (this.phase === "roll" && this.t < 0.35);
    if (aiming) {
      this.guide.position.set(wx, y - BALL_R + 0.012, wz);
      this.guide.rotation.y = this.aim;
      this.guide.scale.z = 1.4 + this.power * 2.6;
    }
    const pull = aiming ? (this.charging ? this.power * 0.42 : 0.02) : -0.12;
    this.club.position.set(wx - fx * pull, y - BALL_R, wz - fz * pull);
    this.club.rotation.y = this.aim;
    g.pos.x = wx + Math.cos(this.aim) * 0.55 - fx * 0.12;
    g.pos.z = wz - Math.sin(this.aim) * 0.55 - fz * 0.12;
    g.heading = this.aim;
    g.benji.speed = 0;
    g.benji.pose = this.phase === "sunk" && this.strokes <= hole.par ? "cheer" : null;
    g.live.meter = this.charging ? this.power : 0;
    g.live.sweetLo = this.sweet[0];
    g.live.sweetHi = this.sweet[1];
    g.live.aim = 0;
    this.frame(dt, false);
  }

  /** A putt at a heading with a share of full power. Also what the tests call. */
  putt(aim: number, power: number) {
    if (this.phase !== "aim") return;
    this.charging = false;
    this.aim = aim;
    const v = SOFT + (HARD - SOFT) * clamp(power, 0, 1);
    this.vx = Math.sin(aim) * v;
    this.vz = Math.cos(aim) * v;
    this.strokes++;
    this.phase = "roll";
    this.t = 0;
    this.lipped = false;
    this.g.sound.release();
    this.g.push();
  }

  private rest() {
    this.restX = this.x;
    this.restZ = this.z;
    if (this.strokes >= LIMIT) {
      this.strokes = LIMIT + 1;
      this.card.push(this.strokes);
      this.phase = "sunk";
      this.t = 0;
      this.say("Pick it up.  Seven", 2);
      this.g.sound.bad();
      return;
    }
    // Look at the cup again from wherever it stopped.
    const h = this.hole;
    this.aim = Math.atan2(h.cup[0] - this.x, h.cup[1] - this.z);
    this.phase = "aim";
    this.t = 0;
    this.power = 0;
    this.hint();
    this.g.push();
  }

  private sink() {
    const g = this.g;
    const h = this.hole;
    this.card.push(this.strokes);
    this.phase = "sunk";
    this.t = 0;
    this.x = h.cup[0];
    this.z = h.cup[1];
    this.vx = this.vz = 0;
    g.sound.swish();
    g.buzz(35);
    const over = this.strokes - h.par;
    if (this.strokes === 1) {
      this.aces++;
      this.say("HOLE IN ONE!", 2);
      g.moment(this.at === HOLES.length - 1 ? 3 : 2);
    } else {
      this.say(NAMES[String(over)] ?? `${this.strokes} strokes`, 1.8);
      if (over < 0) g.sound.cheer();
    }
    g.push();
  }

  /** Strokes against par over the holes played so far, the way a card shows it. */
  private against() {
    const par = HOLES.slice(0, this.card.length).reduce((n, h) => n + h.par, 0);
    const d = this.card.reduce((n, s) => n + s, 0) - par;
    return d === 0 ? "E" : d > 0 ? `+${d}` : String(d);
  }

  private finish() {
    const g = this.g;
    this.phase = "over";
    this.ball.visible = false;
    const total = this.card.reduce((n, s) => n + s, 0);
    const best = g.save.best.putt ?? 0;
    const record = best === 0 || total < best;
    if (record) g.save.best.putt = total;
    const under = PUTT_PAR - total;
    const got = g.earn(clamp(60 + under * 14 + this.aces * 15, 20, 220), clamp(3 + under, 1, 12));
    if (under >= 0) g.moment(under >= 3 ? 2 : 1);
    g.emit("putt", total, this.aces);
    g.showResults(
      {
        title: under > 0 ? `${under} UNDER PAR` : under === 0 ? "LEVEL PAR" : `${-under} OVER PAR`,
        sub: under >= 0 ? "The man in the hut wants to know who taught you." : "Par is 23. The meter's green stretch is the weight to the cup.",
        rows: [
          ["Card", this.card.join("  ")],
          ["Strokes", `${total}  (par ${PUTT_PAR})`],
          ["Holes in one", String(this.aces)],
          ["Best round", String(record ? total : best)],
        ],
        pay: got.dollars,
        respect: got.respect,
        tickets: 0,
        record: record && best !== 0,
        win: under >= 0,
        again: "Another nine",
      },
      () => this.start(),
      () => this.quit(),
    );
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const hole = this.hole;
    const [ox, oz] = hole.at;
    const wx = ox + this.x;
    const wz = oz + this.z;
    const y = Y0 + feltHeight(hole, this.z);
    const fx = Math.sin(this.aim);
    const fz = Math.cos(this.aim);
    // Behind the ball, looking down the line; a little higher and further back once it is rolling.
    const far = this.phase === "aim" ? 0 : 1;
    _eye.set(wx - fx * (3.9 + far * 0.6), y + 2.85 + far * 0.8, wz - fz * (3.9 + far * 0.6));
    _at.set(wx + fx * 2.7, y + 0.1, wz + fz * 2.7);
    const k = snap ? 1 : damp(this.phase === "aim" ? 5 : 3, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    g.camera.lookAt(this.look);
    if (Math.abs(g.camera.fov - 50) > 0.01) {
      g.camera.fov = 50;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    this.on = false;
    this.ball.visible = false;
    this.guide.visible = false;
    this.club.visible = false;
    g.pos.x = PUTT_STAND.x;
    g.pos.z = PUTT_STAND.z;
    g.heading = Math.PI;
    g.camYaw = Math.PI;
    g.live.meter = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    const hole = this.hole;
    h.machine = {
      name: "Sack Putt",
      stats: [
        ["Hole", `${this.at + 1} of ${HOLES.length}`, "#39ff14"],
        ["Par", String(hole.par)],
        ["Strokes", String(Math.min(this.strokes, LIMIT + 1))],
        ["Round", this.against(), "#f4d77a"],
      ],
      call: this.call,
      meter: this.phase === "aim",
      act: "Putt",
    };
  }

  /** For the tests: where the ball is and what it is doing. */
  get state() {
    return { hole: this.at, x: this.x, z: this.z, phase: this.phase, strokes: this.strokes, card: [...this.card], on: this.on, shut: this.shut() };
  }
}
