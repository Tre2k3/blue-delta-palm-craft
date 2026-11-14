import * as THREE from "three";
import type { HudState } from "../core/types";
import { clamp, damp } from "../core/util";
import type { Activity, Game } from "../game";
import { tex } from "../gfx/tex";
import { LANE } from "../world/rooms";

const LANE_Y = 0.08;
const BALL_R = 0.109;
const PIN_R = 0.06;
const BALL_M = 6.8;
const PIN_M = 1.55;
const HALF = LANE.width / 2;
const WALL = HALF + LANE.gutter;

type Pin = {
  mesh: THREE.Mesh;
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  down: boolean;
  gone: boolean;
  tilt: number;
  dir: number;
};

type Phase = "position" | "aim" | "power" | "roll" | "settle" | "done";

const _axis = new THREE.Vector3();

/** Ten frames at 901 Bowl. Ball and pins are discs on the deck with real mass, so pins take out pins. */
export class Bowling implements Activity {
  hints: [string, string][] = [
    ["A D", "Line up, then hook the ball"],
    ["Space", "Lock position, aim, power"],
    ["Q", "Leave"],
  ];
  private group = new THREE.Group();
  private pins: Pin[] = [];
  private ball: THREE.Mesh;
  private arrow: THREE.Mesh;
  private phase: Phase = "position";
  private px = 0;
  private aim = 0;
  private power = 0;
  private t = 0;
  private bx = 0;
  private bz = 0;
  private bvx = 0;
  private bvz = 0;
  private gutter = false;
  private spin = 0;
  private settle = 0;
  private hitAt = -1;
  private frames: number[][] = [];
  private standingAtStart = 10;
  private call = "";
  private strikes = 0;
  private cam = new THREE.Vector3();
  private look = new THREE.Vector3();
  private ox: number;
  private oz: number;

  constructor(private g: Game) {
    const lane = g.rooms.bowl.lane;
    this.ox = lane.x;
    this.oz = lane.z;
    this.group.position.set(lane.x, 0, lane.z);
    const profile = [
      [0.001, 0],
      [0.028, 0.004],
      [0.036, 0.03],
      [0.058, 0.1],
      [0.06, 0.14],
      [0.048, 0.21],
      [0.025, 0.275],
      [0.024, 0.3],
      [0.032, 0.335],
      [0.03, 0.36],
      [0.018, 0.377],
      [0.001, 0.38],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    const geo = new THREE.LatheGeometry(profile, 14);
    const skin = new THREE.MeshStandardMaterial({
      map: tex(4, 64, (g2, w, h) => {
        g2.fillStyle = "#f4f1ea";
        g2.fillRect(0, 0, w, h);
        g2.fillStyle = "#c2261c";
        g2.fillRect(0, h * 0.2, w, h * 0.045);
        g2.fillRect(0, h * 0.28, w, h * 0.045);
      }),
      roughness: 0.25,
    });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c <= r; c++) {
        const mesh = new THREE.Mesh(geo, skin);
        mesh.castShadow = true;
        this.group.add(mesh);
        const x = (c - r / 2) * LANE.colX;
        const z = LANE.pinZ - r * LANE.rowZ;
        this.pins.push({ mesh, homeX: x, homeZ: z, x, z, vx: 0, vz: 0, down: false, gone: false, tilt: 0, dir: 0 });
      }
    }
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 24, 16),
      new THREE.MeshStandardMaterial({
        map: tex(64, 64, (g2, w, h) => {
          g2.fillStyle = "#0d3a1f";
          g2.fillRect(0, 0, w, h);
          for (let i = 0; i < 40; i++) {
            g2.fillStyle = i % 3 ? "rgba(57,255,20,0.35)" : "rgba(216,169,58,0.5)";
            g2.beginPath();
            g2.ellipse((i * 29) % w, (i * 17) % h, 9, 3, i, 0, Math.PI * 2);
            g2.fill();
          }
        }),
        roughness: 0.12,
        metalness: 0.2,
      }),
    );
    this.ball.castShadow = true;
    this.group.add(this.ball);
    const ag = new THREE.PlaneGeometry(0.07, 5);
    ag.rotateX(-Math.PI / 2);
    ag.translate(0, 0, -2.5);
    this.arrow = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
    this.arrow.position.y = LANE_Y + 0.012;
    this.arrow.renderOrder = 3;
    this.group.add(this.arrow);
    this.group.visible = false;
    g.rooms.bowl.group.add(this.group);
  }

  start() {
    this.group.visible = true;
    this.frames = [[]];
    this.strikes = 0;
    this.px = 0;
    this.rack(true);
    this.setPhase("position");
    this.say("Frame 1. Line up with A and D.");
    this.frameCam(0, true);
  }

  private say(text: string) {
    this.call = text;
    this.g.push();
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.t = 0;
    this.arrow.visible = p === "aim" || p === "power";
    this.g.push();
  }

  private rack(full: boolean) {
    for (const p of this.pins) {
      if (full) p.gone = false;
      else if (p.down) p.gone = true;
      p.down = false;
      p.x = p.homeX;
      p.z = p.homeZ;
      p.vx = p.vz = 0;
      p.tilt = 0;
      p.mesh.visible = !p.gone;
      p.mesh.position.set(p.x, LANE_Y, p.z);
      p.mesh.quaternion.identity();
    }
    this.standingAtStart = this.pins.filter((p) => !p.gone).length;
  }

  private throwBall() {
    const g = this.g;
    const hot = this.power > 0.93;
    const angle = this.aim * 0.04 + (hot ? (Math.random() - 0.5) * 0.03 : 0);
    const v = 5.2 + this.power * 3.7;
    this.bx = this.px;
    this.bz = -0.2;
    this.bvx = Math.sin(angle) * v;
    this.bvz = -Math.cos(angle) * v;
    this.gutter = false;
    this.spin = 0;
    this.hitAt = -1;
    g.sound.roll();
    this.setPhase("roll");
    this.say(hot ? "Overthrown!" : "");
  }

  private collide(ax: number, az: number, ar: number, am: number, avx: number, avz: number, p: Pin, e: number): [number, number] | null {
    const pr = p.down ? 0.1 : PIN_R;
    const dx = p.x - ax;
    const dz = p.z - az;
    const d = Math.hypot(dx, dz);
    const min = ar + pr;
    if (d >= min || d < 1e-6) return null;
    const nx = dx / d;
    const nz = dz / d;
    const rel = (p.vx - avx) * nx + (p.vz - avz) * nz;
    // Separate along the normal, the lighter body moves more.
    const over = min - d;
    p.x += nx * over * (am / (am + PIN_M));
    p.z += nz * over * (am / (am + PIN_M));
    if (rel >= 0) return null;
    const j = (-(1 + e) * rel) / (1 / am + 1 / PIN_M);
    p.vx += (j / PIN_M) * nx;
    p.vz += (j / PIN_M) * nz;
    const kick = j / PIN_M;
    if (!p.down && kick > 0.85) {
      p.down = true;
      p.dir = Math.atan2(p.vx, p.vz);
    }
    return [(-j / am) * nx, (-j / am) * nz];
  }

  private physics(dt: number) {
    const g = this.g;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      // Ball.
      if (this.phase === "roll") {
        if (!this.gutter) {
          const back = clamp((-this.bz - 8) / 6, 0, 1);
          this.bvx += this.spin * (0.35 + back * 1.9) * (g.wearing("claw") ? 1.4 : 1) * h;
          this.bx += this.bvx * h;
          this.bz += this.bvz * h;
          if (Math.abs(this.bx) > HALF + 0.02 && this.bz > LANE.pinZ + 0.45) {
            this.gutter = true;
            this.bx = Math.sign(this.bx) * (HALF + LANE.gutter / 2);
            this.bvx = 0;
            this.say("Gutter ball");
            g.sound.bad();
          }
          if (Math.abs(this.bx) > WALL - BALL_R) {
            this.bx = Math.sign(this.bx) * (WALL - BALL_R);
            this.bvx *= -0.4;
          }
        } else this.bz += this.bvz * h;
        if (!this.gutter) {
          for (const p of this.pins) {
            if (p.gone) continue;
            const out = this.collide(this.bx, this.bz, BALL_R, BALL_M, this.bvx, this.bvz, p, 0.72);
            if (out) {
              this.bvx += out[0];
              this.bvz += out[1];
              if (this.hitAt < 0) {
                this.hitAt = 0;
                g.sound.pins(5);
                g.stage.setPunch(0.6);
                g.input.rumble(0.8, 240);
              }
            }
          }
        }
      }
      // Pins against pins, walls and the pit.
      for (let i = 0; i < this.pins.length; i++) {
        const a = this.pins[i]!;
        if (a.gone) continue;
        const sp = Math.hypot(a.vx, a.vz);
        if (sp > 0) {
          const drag = (a.down ? 2.6 : 5.5) * h;
          const k = sp > drag ? (sp - drag) / sp : 0;
          a.vx *= k;
          a.vz *= k;
          a.x += a.vx * h;
          a.z += a.vz * h;
        }
        if (sp > 0.02) {
          for (let j = 0; j < this.pins.length; j++) {
            if (j === i) continue;
            const b = this.pins[j]!;
            if (b.gone) continue;
            const out = this.collide(a.x, a.z, a.down ? 0.1 : PIN_R, PIN_M, a.vx, a.vz, b, 0.66);
            if (out) {
              a.vx += out[0];
              a.vz += out[1];
              if (!a.down && Math.hypot(out[0], out[1]) > 0.85) {
                a.down = true;
                a.dir = Math.atan2(a.vx, a.vz);
              }
            }
          }
        }
        if (Math.abs(a.x) > WALL - 0.05) {
          a.x = Math.sign(a.x) * (WALL - 0.05);
          a.vx *= -0.5;
          if (!a.down) {
            a.down = true;
            a.dir = Math.atan2(a.vx, a.vz);
          }
        }
        if (a.z < LANE.pitEnd + 0.1 || a.z > LANE.pinZ + 1.6) {
          a.down = true;
          a.gone = true;
          a.mesh.visible = false;
        }
      }
    }
    for (const p of this.pins) {
      if (p.gone) continue;
      if (p.down && p.tilt < Math.PI / 2) p.tilt = Math.min(Math.PI / 2, p.tilt + dt * 7);
      p.mesh.position.set(p.x, LANE_Y + Math.sin(p.tilt) * 0.055, p.z);
      if (p.tilt > 0) {
        _axis.set(Math.cos(p.dir), 0, -Math.sin(p.dir));
        p.mesh.quaternion.setFromAxisAngle(_axis, p.tilt);
      }
    }
  }

  private knocked() {
    return this.standingAtStart - this.pins.filter((p) => !p.gone && !p.down).length;
  }

  private score() {
    const flat = this.frames.flat();
    const totals: (number | null)[] = [];
    let i = 0;
    let sum = 0;
    for (let f = 0; f < 10; f++) {
      const a = flat[i];
      const b = flat[i + 1];
      const c = flat[i + 2];
      if (a === undefined) {
        totals.push(null);
        continue;
      }
      if (f === 9) {
        const done = this.frames[9] && (this.frames[9].length === 3 || (this.frames[9].length === 2 && a + (b ?? 0) < 10));
        sum += a + (b ?? 0) + (c ?? 0);
        totals.push(done ? sum : null);
        continue;
      }
      if (a === 10) {
        if (b === undefined || c === undefined) totals.push(null);
        else totals.push((sum += 10 + b + c));
        i += 1;
      } else if (b === undefined) totals.push(null);
      else if (a + b === 10) {
        if (c === undefined) totals.push(null);
        else totals.push((sum += 10 + c));
        i += 2;
      } else {
        totals.push((sum += a + b));
        i += 2;
      }
    }
    return { totals, total: flat.reduce((s, n) => s + n, 0), sum };
  }

  private marks() {
    return this.frames.map((fr, f) =>
      fr.map((n, k) => {
        if (f < 9) return n === 10 && k === 0 ? "X" : k === 1 && fr[0]! + n === 10 ? "/" : n === 0 ? "-" : String(n);
        const prev = fr[k - 1];
        const fresh = k === 0 || prev === 10 || (k === 2 && fr[0]! + fr[1]! === 10);
        if (n === 10 && fresh) return "X";
        if (!fresh && prev !== undefined && prev + n === 10) return "/";
        return n === 0 ? "-" : String(n);
      }),
    );
  }

  private settleUp() {
    const g = this.g;
    const n = this.knocked();
    const f = this.frames.length - 1;
    const fr = this.frames[f]!;
    fr.push(n);
    const left = this.pins.filter((p) => !p.gone && !p.down).length;
    let next: "ball" | "frame" | "fresh" | "done" = "ball";
    if (f < 9) {
      if (fr.length === 1 && n === 10) {
        this.strikes++;
        this.say("STRIKE!");
        g.moment(1);
        next = "frame";
      } else if (fr.length === 2) {
        this.say(left === 0 ? "SPARE!" : n === 0 ? "Missed 'em." : `${fr[0]! + n} down.`);
        if (left === 0) g.sound.cheer();
        next = "frame";
      } else this.say(n === 0 ? "Nothing. Pick up the spare." : `${n} down. Pick up the spare.`);
    } else {
      if (left === 0) {
        const strike = n === 10 && this.standingAtStart === 10;
        if (strike) this.strikes++;
        this.say(strike ? "STRIKE!" : "SPARE!");
        if (strike) g.moment(1);
        else g.sound.cheer();
      } else this.say(`${n} down.`);
      if (fr.length === 3 || (fr.length === 2 && fr[0]! + fr[1]! < 10)) next = "done";
      else next = left === 0 ? "fresh" : "ball";
    }
    if (next === "frame") {
      this.frames.push([]);
      this.rack(true);
    } else if (next === "fresh") this.rack(true);
    else if (next === "ball") this.rack(false);
    if (next === "done") {
      this.setPhase("done");
      this.finish();
      return;
    }
    this.px = 0;
    this.setPhase("position");
  }

  private finish() {
    const g = this.g;
    const { sum } = this.score();
    const best = g.save.best.bowl ?? 0;
    const record = sum > best;
    if (record) g.save.best.bowl = sum;
    const got = g.earn(Math.round(sum * 0.8) + this.strikes * 10, Math.floor(sum / 20));
    g.emit("bowl", sum, this.strikes);
    g.showResults(
      {
        title: sum >= 200 ? "LANE LEGEND" : sum >= 120 ? "POCKET CHANGE" : "TEN FRAMES",
        sub: sum >= 120 ? "Strike tips his cap." : "Strike says the arrows are your friend.",
        rows: [
          ["Score", String(sum)],
          ["Strikes", String(this.strikes)],
          ["Record", String(Math.max(best, sum))],
        ],
        pay: got.dollars,
        respect: got.respect,
        tickets: 0,
        record,
        again: g.save.dollars >= 5 ? "Another game ($5)" : null,
      },
      () => {
        if (g.spend(5)) this.start();
        else this.leave();
      },
      () => this.leave(),
    );
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.t += dt;
    if (this.phase === "position") {
      this.px = clamp(this.px + input.move().x * 0.7 * dt, -0.42, 0.42);
      if (input.hit("action") || input.hit("interact")) {
        g.sound.ui();
        this.setPhase("aim");
        this.say("Stop the arrow where you want the ball.");
      }
    } else if (this.phase === "aim") {
      this.aim = Math.sin(this.t * 2.3);
      if (input.hit("action") || input.hit("interact")) {
        g.sound.ui();
        this.setPhase("power");
        this.say("Stop the meter in the green.");
      }
    } else if (this.phase === "power") {
      const u = (this.t * 1.25) % 2;
      this.power = u < 1 ? u : 2 - u;
      if (input.hit("action") || input.hit("interact")) this.throwBall();
    } else if (this.phase === "roll") {
      this.spin += (input.move().x - this.spin) * damp(5, dt);
      this.physics(dt);
      if (this.hitAt >= 0) {
        this.hitAt += dt;
        if (this.hitAt > 0.3 && this.hitAt - dt <= 0.3 && this.knocked() >= 8) g.sound.pins(10);
      }
      const stopped = Math.hypot(this.bvx, this.bvz) < 0.4;
      if (this.bz < LANE.pitEnd + 0.2 || stopped) {
        this.ball.visible = false;
        this.settle = 0;
        this.setPhase("settle");
      }
    } else if (this.phase === "settle") {
      this.physics(dt);
      this.settle += dt;
      const moving = this.pins.some((p) => !p.gone && Math.hypot(p.vx, p.vz) > 0.08);
      if (this.settle > 2.6 || (this.settle > 1.1 && !moving)) this.settleUp();
    }

    g.live.meter = this.phase === "power" ? this.power : 0;
    g.live.sweetLo = 0.68;
    g.live.sweetHi = 0.93;
    g.live.aim = this.phase === "aim" || this.phase === "power" ? this.aim : 0;

    // Benji on the approach, the ball in his hand until it is thrown.
    g.pos.x = this.ox + this.px - 0.28;
    g.pos.z = this.oz + 1.25;
    g.heading = Math.PI;
    g.benji.speed = 0;
    // The follow-through, held while the ball is on its way.
    g.benji.pose = this.phase === "roll" || this.phase === "settle" ? "bowl" : null;
    const holding = this.phase === "position" || this.phase === "aim" || this.phase === "power";
    if (holding) {
      this.ball.visible = true;
      this.ball.position.set(this.px, 0.82 + Math.sin(this.t * 2) * 0.02, 0.9);
    } else if (this.phase === "roll") {
      this.ball.position.set(this.bx, LANE_Y + BALL_R - (this.gutter ? 0.05 : 0), this.bz);
      this.ball.rotation.x += (this.bvz * dt) / BALL_R;
      this.ball.rotation.z -= (this.bvx * dt) / BALL_R;
    }
    this.arrow.position.x = this.px;
    this.arrow.rotation.y = -this.aim * 0.04;
    this.frameCam(dt, false);
  }

  private frameCam(dt: number, snap: boolean) {
    const g = this.g;
    if (this.phase === "roll" || this.phase === "settle") {
      const z = this.phase === "roll" ? Math.max(this.bz + 3.4, LANE.pinZ + 4.4) : LANE.pinZ + 4.4;
      this.cam.set(this.ox + this.bx * 0.35, 1.02, this.oz + z);
      this.look.set(this.ox, 0.3, this.oz + LANE.pinZ - 0.3);
    } else {
      this.cam.set(this.ox + this.px * 0.6 + 0.55, 1.78, this.oz + 4.3);
      this.look.set(this.ox + this.px * 0.2, 0.35, this.oz - 13);
    }
    if (snap) g.camera.position.copy(this.cam);
    else g.camera.position.lerp(this.cam, damp(this.phase === "roll" ? 7 : 4, dt));
    g.camera.lookAt(this.look);
    if (g.camera.fov !== 44) {
      g.camera.fov = 44;
      g.camera.updateProjectionMatrix();
    }
  }

  private leave() {
    const g = this.g;
    this.group.visible = false;
    const desk = g.rooms.bowl.desk;
    g.pos.x = desk.x - 1.2;
    g.pos.z = desk.z - 0.6;
    g.heading = Math.PI;
    g.camYaw = Math.PI;
    g.end("walk");
  }

  quit() {
    this.leave();
  }

  hud(h: HudState) {
    const sc = this.score();
    const f = this.frames.length;
    h.bowl = {
      phase: this.phase,
      frame: Math.min(10, f),
      ball: (this.frames[f - 1]?.length ?? 0) + 1,
      marks: this.marks(),
      totals: sc.totals,
      total: sc.sum,
      call: this.call,
      best: this.g.save.best.bowl ?? 0,
      standing: this.pins.map((p) => !p.gone && !p.down),
    };
  }
}
