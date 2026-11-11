import * as THREE from "three";
import type { HudState } from "../core/types";
import { clamp, damp, lerp } from "../core/util";
import type { Activity, Game } from "../game";
import { tex } from "../gfx/tex";
import { SKEE_HOLES } from "../world/funhouse";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/** Shared by the floor machines: a line that shows for a moment, and a camera that eases between poses. */
abstract class Machine implements Activity {
  abstract hints: [string, string][];
  protected call = "";
  private callLeft = 0;
  private look = new THREE.Vector3();
  constructor(protected g: Game) {}
  abstract update(dt: number): void;
  abstract hud(h: HudState): void;
  abstract quit(): void;

  protected say(text: string, seconds = 1) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  protected tickCall(dt: number) {
    if (this.callLeft <= 0) return;
    this.callLeft -= dt;
    if (this.callLeft <= 0) {
      this.call = "";
      this.g.push();
    }
  }

  protected aimCamera(pos: THREE.Vector3, at: THREE.Vector3, fov: number, dt: number, snap: boolean) {
    const cam = this.g.camera;
    const k = snap ? 1 : damp(5, dt);
    cam.position.lerp(pos, k);
    this.look.lerp(at, k);
    cam.lookAt(this.look);
    const f = snap ? fov : lerp(cam.fov, fov, k);
    if (Math.abs(cam.fov - f) > 0.01) {
      cam.fov = f;
      cam.updateProjectionMatrix();
    }
  }

  protected leave(stand: { x: number; z: number }, heading: number) {
    const g = this.g;
    g.pos.x = stand.x;
    g.pos.z = stand.z;
    g.heading = heading;
    g.camYaw = heading;
    g.live.meter = 0;
    g.end("walk");
  }
}

// ------------------------------------------------------------------ pinball

type Seg = { ax: number; ay: number; bx: number; by: number; kick?: number; pts?: number };

// The table is simulated in its own units: 220 across, 340 long, the drain at the high-y end.
const PL = 130;
const PR = 330;
const LANE = 350;
const TOP = 10;
const BR = 6;
const FLEN = 46;
const WALLS: Seg[] = [
  { ax: PL, ay: TOP, bx: PL, by: 350 },
  { ax: PL, ay: TOP, bx: LANE, by: TOP },
  { ax: LANE, ay: TOP, bx: LANE, by: 350 },
  { ax: PR, ay: 74, bx: PR, by: 350 },
  { ax: LANE, ay: 62, bx: 298, by: TOP },
  { ax: PL, ay: 62, bx: 182, by: TOP },
  { ax: PL, ay: 246, bx: 178, by: 300 },
  { ax: PR, ay: 246, bx: 282, by: 300 },
  { ax: 152, ay: 214, bx: 172, by: 262, kick: 300, pts: 10 },
  { ax: 308, ay: 214, bx: 288, by: 262, kick: 300, pts: 10 },
];

/**
 * The pinball table by the prize counter. A real table: a steel ball, two flippers, three pop
 * bumpers, a row of drop targets and a plunger, played standing at it.
 */
export class PinballTable extends Machine {
  hints: [string, string][] = [
    ["A", "Left flipper"],
    ["D", "Right flipper"],
    ["Space", "Plunger, or both flippers"],
    ["Q", "Walk away"],
  ];
  private table = new THREE.Group();
  private ballMesh: THREE.Mesh;
  private plunger: THREE.Mesh;
  private flipMesh: THREE.Mesh[] = [];
  private bumpMesh: { cap: THREE.Mesh; mat: THREE.MeshStandardMaterial }[] = [];
  private dropMesh: THREE.Mesh[] = [];
  private k: number;
  private bumpers = [
    { x: 196, y: 112, r: 16, lit: 0 },
    { x: 264, y: 112, r: 16, lit: 0 },
    { x: 230, y: 164, r: 16, lit: 0 },
  ];
  private drops = [202, 230, 258].map((x) => ({ x, y: 52, up: true }));
  private flip = [
    { px: 178, py: 300, dir: 1, a: 0.5, w: 0, on: false },
    { px: 282, py: 300, dir: -1, a: 0.5, w: 0, on: false },
  ];
  private ball = { x: 340, y: 338, vx: 0, vy: 0, live: false };
  private balls = 3;
  private charge = 0;
  private charging = false;
  private score = 0;
  private over = false;
  private shown = -1;
  private zoom = 0;

  constructor(g: Game) {
    super(g);
    const p = g.rooms.fun.pinball;
    const k = (this.k = p.w / 220);
    this.table.position.set(p.x, p.y, p.z);
    this.table.rotation.x = -p.tilt;
    g.rooms.fun.group.add(this.table);

    // The art under the glass.
    const art = tex(
      440,
      680,
      (c, w, h) => {
        const s = 2;
        const X = (x: number) => (x - PL) * s;
        const Y = (y: number) => (y - TOP) * s;
        const bg = c.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, "#2a1257");
        bg.addColorStop(0.55, "#16224a");
        bg.addColorStop(1, "#0a1226");
        c.fillStyle = bg;
        c.fillRect(0, 0, w, h);
        c.fillStyle = "rgba(224,179,58,0.2)";
        c.font = `900 190px "Arial Black", Impact, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("$", X(230), Y(236));
        c.fillStyle = "#e0b33a";
        c.font = `900 30px "Arial Black", Impact, sans-serif`;
        c.fillText("SACK PINBALL", X(230), Y(196));
        // Shooter lane.
        c.fillStyle = "rgba(0,0,0,0.45)";
        c.fillRect(X(PR), Y(74), X(LANE) - X(PR), h);
        // Rings under the bumpers, pads under the targets.
        for (const b of this.bumpers) {
          c.strokeStyle = "#39ff14";
          c.lineWidth = 5;
          c.beginPath();
          c.arc(X(b.x), Y(b.y), (b.r + 7) * s, 0, Math.PI * 2);
          c.stroke();
        }
        c.fillStyle = "rgba(53,224,208,0.35)";
        for (const d of this.drops) c.fillRect(X(d.x - 13), Y(d.y - 2), 26 * s, 14 * s);
        c.font = `900 17px "Arial Black", Impact, sans-serif`;
        c.fillStyle = "#35e0d0";
        c.fillText("250 EACH  ·  ALL THREE +1000", X(230), Y(80));
        // Arrows up the middle and the drain.
        c.fillStyle = "rgba(255,90,209,0.7)";
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.moveTo(X(230), Y(262 - i * 14));
          c.lineTo(X(222), Y(272 - i * 14));
          c.lineTo(X(238), Y(272 - i * 14));
          c.fill();
        }
        c.fillStyle = "rgba(255,59,59,0.3)";
        c.fillRect(X(190), Y(336), 80 * s, 14 * s);
        c.strokeStyle = "rgba(255,255,255,0.08)";
        c.lineWidth = 2;
        c.strokeRect(1, 1, w - 2, h - 2);
      },
      { repeat: false },
    );
    const fieldMat = p.field.material as THREE.MeshBasicMaterial;
    fieldMat.map = art;
    fieldMat.color.set(0xffffff);
    fieldMat.needsUpdate = true;

    const rail = new THREE.MeshStandardMaterial({ color: 0xe0b33a, roughness: 0.35, metalness: 0.7, emissive: 0x5a4208, emissiveIntensity: 0.6 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xff5ad1, roughness: 0.4, emissive: 0xff2ab0, emissiveIntensity: 0.8 });
    for (const w of WALLS) {
      const len = Math.hypot(w.bx - w.ax, w.by - w.ay) * k;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.012), w.kick ? pink : rail);
      m.position.set(this.lx((w.ax + w.bx) / 2), 0.015, this.lz((w.ay + w.by) / 2));
      m.rotation.y = Math.atan2(w.by - w.ay, -(w.bx - w.ax));
      this.table.add(m);
    }
    for (const b of this.bumpers) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x39ff14, roughness: 0.3, emissive: 0x39ff14, emissiveIntensity: 0.5 });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(b.r * k * 0.7, b.r * k * 0.8, 0.045, 18), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4 }));
      post.position.set(this.lx(b.x), 0.0225, this.lz(b.y));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(b.r * k, b.r * k, 0.016, 22), mat);
      cap.position.set(this.lx(b.x), 0.053, this.lz(b.y));
      this.table.add(post, cap);
      this.bumpMesh.push({ cap, mat });
    }
    const teal = new THREE.MeshStandardMaterial({ color: 0x35e0d0, roughness: 0.4, emissive: 0x35e0d0, emissiveIntensity: 0.7 });
    for (const d of this.drops) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(24 * k, 0.045, 8 * k), teal);
      m.position.set(this.lx(d.x), 0.0225, this.lz(d.y));
      this.table.add(m);
      this.dropMesh.push(m);
    }
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.35, emissive: 0x555555, emissiveIntensity: 0.6 });
    for (const f of this.flip) {
      const geo = new THREE.BoxGeometry(FLEN * k, 0.026, 0.034);
      geo.translate((FLEN * k) / 2, 0, 0);
      const m = new THREE.Mesh(geo, white);
      m.position.set(this.lx(f.px), 0.016, this.lz(f.py));
      this.table.add(m);
      this.flipMesh.push(m);
    }
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BR * k, 18, 14), new THREE.MeshStandardMaterial({ color: 0xe9edf2, roughness: 0.15, metalness: 0.9, emissive: 0x8a8f96, emissiveIntensity: 0.55 }));
    this.plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xc22a22, roughness: 0.4 }));
    this.plunger.rotation.x = Math.PI / 2;
    this.table.add(this.ballMesh, this.plunger);
    this.pose();
  }

  private lx(sx: number) {
    return (240 - sx) * this.k;
  }
  private lz(sy: number) {
    return (180 - sy) * this.k;
  }

  start() {
    const g = this.g;
    this.balls = 3;
    this.score = 0;
    this.over = false;
    this.charge = 0;
    this.charging = false;
    this.zoom = 0;
    this.ball.live = false;
    this.ball.vx = this.ball.vy = 0;
    for (const d of this.drops) d.up = true;
    for (const f of this.flip) f.a = 0.5;
    g.benji.visible = false;
    this.say("Hold Space, let go to launch", 2.5);
    this.frame(0, true);
  }

  /** One hit test of the ball against a line; `sx, sy` is how fast the far end of the line is moving. */
  private hit(ax: number, ay: number, bx: number, by: number, rest: number, kick: number, sx: number, sy: number) {
    const ball = this.ball;
    const dx = bx - ax;
    const dy = by - ay;
    const t = clamp(((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    let nx = ball.x - cx;
    let ny = ball.y - cy;
    const d = Math.hypot(nx, ny);
    if (d >= BR || d === 0) return false;
    nx /= d;
    ny /= d;
    ball.x = cx + nx * BR;
    ball.y = cy + ny * BR;
    const rel = (ball.vx - sx * t) * nx + (ball.vy - sy * t) * ny;
    if (rel < 0) {
      ball.vx -= (1 + rest) * rel * nx;
      ball.vy -= (1 + rest) * rel * ny;
    }
    ball.vx += nx * kick;
    ball.vy += ny * kick;
    return true;
  }

  private sim(dt: number) {
    const g = this.g;
    const ball = this.ball;
    for (const b of this.bumpers) b.lit = Math.max(0, b.lit - dt * 4);
    for (const f of this.flip) {
      const want = f.on ? -0.55 : 0.5;
      const before = f.a;
      f.a += clamp(want - f.a, -22 * dt, 22 * dt);
      f.w = (f.a - before) / Math.max(dt, 1e-4);
    }
    if (!ball.live) {
      ball.x = 340;
      ball.y = 338 + this.charge * 8;
      if (this.charging) this.charge = Math.min(1, this.charge + dt * 1.1);
      return;
    }
    const steps = 8;
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      ball.vy += 620 * h;
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      for (const w of WALLS) {
        if (this.hit(w.ax, w.ay, w.bx, w.by, 0.45, w.kick ?? 0, 0, 0) && w.pts) {
          this.score += w.pts;
          g.sound.bounce(0.5);
        }
      }
      for (const f of this.flip) {
        // The tip of a swinging flipper is moving: that is what throws the ball.
        const tx = f.px + Math.cos(f.a) * FLEN * f.dir;
        const ty = f.py + Math.sin(f.a) * FLEN;
        this.hit(f.px, f.py, tx, ty, 0.35, 0, -Math.sin(f.a) * FLEN * f.w * f.dir, Math.cos(f.a) * FLEN * f.w);
      }
      for (const b of this.bumpers) {
        const dx = ball.x - b.x;
        const dy = ball.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < b.r + BR && d > 0) {
          ball.x = b.x + (dx / d) * (b.r + BR);
          ball.y = b.y + (dy / d) * (b.r + BR);
          const sp = Math.max(330, Math.hypot(ball.vx, ball.vy) * 0.9);
          ball.vx = (dx / d) * sp;
          ball.vy = (dy / d) * sp;
          b.lit = 1;
          this.score += 100;
          g.sound.rim();
          g.input.rumble(0.3, 50);
        }
      }
      for (const d of this.drops) {
        if (d.up && Math.abs(ball.x - d.x) < 12 + BR && Math.abs(ball.y - d.y) < 5 + BR) {
          d.up = false;
          ball.vy = Math.abs(ball.vy) * 0.6;
          this.score += 250;
          g.sound.board();
          if (this.drops.every((q) => !q.up)) {
            this.score += 1000;
            this.say("ALL TARGETS  +1000", 1.6);
            g.sound.cash();
            g.stage.setPunch(0.4);
            for (const q of this.drops) q.up = true;
          }
        }
      }
      // Never out through a corner, however hard it was hit.
      ball.x = clamp(ball.x, PL + BR, LANE - BR);
      if (ball.y < TOP + BR) {
        ball.y = TOP + BR;
        ball.vy = Math.abs(ball.vy) * 0.5;
      }
      const sp = Math.hypot(ball.vx, ball.vy);
      if (sp > 900) {
        ball.vx *= 900 / sp;
        ball.vy *= 900 / sp;
      }
    }
    if (ball.y > 356) {
      ball.live = false;
      ball.vx = ball.vy = 0;
      this.charge = 0;
      this.balls--;
      g.sound.bad();
      if (this.balls <= 0) this.over = true;
      else this.say(`Ball ${4 - this.balls} of 3`, 1.6);
    }
  }

  /** Put the moving parts where the table says they are. */
  private pose() {
    const k = this.k;
    this.ballMesh.position.set(this.lx(this.ball.x), BR * k, this.lz(this.ball.y));
    this.plunger.position.set(this.lx(340), BR * k, this.lz(352 + this.charge * 8) - 0.05);
    this.flip.forEach((f, i) => (this.flipMesh[i]!.rotation.y = Math.atan2(Math.sin(f.a), -Math.cos(f.a) * f.dir)));
    this.bumpers.forEach((b, i) => {
      const m = this.bumpMesh[i]!;
      m.mat.emissiveIntensity = 0.5 + b.lit * 2.6;
      m.cap.scale.setScalar(1 + b.lit * 0.14);
    });
    this.drops.forEach((d, i) => (this.dropMesh[i]!.position.y = lerp(this.dropMesh[i]!.position.y, d.up ? 0.0225 : -0.03, 0.4)));
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.tickCall(dt);
    const lean = input.move().x;
    const both = this.ball.live && input.down("action");
    const left = input.down("left") || lean < -0.5 || both;
    const right = input.down("right") || lean > 0.5 || both;
    if ((left && !this.flip[0]!.on) || (right && !this.flip[1]!.on)) g.sound.step();
    this.flip[0]!.on = left;
    this.flip[1]!.on = right;
    if (!this.ball.live && !this.over) {
      if (input.down("action")) this.charging = true;
      else if (this.charging) {
        this.charging = false;
        this.ball.live = true;
        this.ball.vx = 0;
        this.ball.vy = -(520 + this.charge * 470);
        this.charge = 0;
        g.sound.release();
      }
    }
    // Two shorter steps keep a fast ball from tunnelling when a frame runs long.
    this.sim(dt / 2);
    this.sim(dt / 2);
    this.pose();
    if (this.score !== this.shown) {
      this.shown = this.score;
      g.push();
    }
    if (this.over) {
      const best = g.save.best.pinball ?? 0;
      const record = this.score > best;
      if (record) g.save.best.pinball = this.score;
      const won = g.arcadeWin(Math.min(40, Math.floor(this.score / 400)));
      g.showResults(
        {
          title: this.score >= 8000 ? "TABLE KING" : "GAME OVER",
          sub: this.score >= 8000 ? "They are going to have to oil that table." : "Drop all three targets for the thousand. Bumpers pay a hundred a pop.",
          rows: [
            ["Score", this.score.toLocaleString()],
            ["Record", Math.max(best, this.score).toLocaleString()],
          ],
          pay: 0,
          respect: 0,
          tickets: won,
          record,
          again: "Three more balls",
        },
        () => this.start(),
        () => this.quit(),
      );
      return;
    }
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const p = this.g.rooms.fun.pinball;
    // Stand back to take in the whole machine while the ball is on the plunger, lean in once it is in play.
    this.zoom = snap ? 0 : lerp(this.zoom, this.ball.live ? 1 : 0, damp(3, dt));
    const z = this.zoom;
    _a.set(p.x, lerp(1.98, 2.16, z), p.z - lerp(1.75, 1.14, z));
    _b.set(p.x, lerp(1.24, 1.0, z), p.z + lerp(0.3, 0, z));
    this.aimCamera(_a, _b, lerp(54, 50, z), dt, snap);
  }

  quit() {
    this.ball.live = false;
    this.charge = 0;
    this.charging = false;
    this.ball.x = 340;
    this.ball.y = 338;
    for (const f of this.flip) f.on = false;
    this.pose();
    this.leave(this.g.rooms.fun.pinball.stand, 0);
  }

  hud(h: HudState) {
    h.machine = {
      name: "Sack Pinball",
      stats: [
        ["Score", this.score.toLocaleString(), "#39ff14"],
        ["Balls", String(Math.max(0, this.balls))],
        ["Record", (this.g.save.best.pinball ?? 0).toLocaleString()],
      ],
      call: this.call,
      meter: false,
      act: this.ball.live ? "Flip" : "Launch",
    };
  }
}

// ------------------------------------------------------------------ Skee-Ball

const SKEE_R = 0.045;

/** Skee-Ball: nine balls rolled up a real lane, off the ramp and onto the rings. */
export class SkeeLane extends Machine {
  hints: [string, string][] = [
    ["A D", "Aim"],
    ["Hold Space", "Power"],
    ["Release", "Roll"],
    ["Q", "Walk away"],
  ];
  private ball: THREE.Mesh;
  private guide: THREE.Mesh;
  private balls = 9;
  private score = 0;
  private aim = 0;
  private power = 0;
  private dir = 1;
  private charging = false;
  private phase: "aim" | "roll" | "fly" | "drop" | "show" = "aim";
  private t = 0;
  private from = new THREE.Vector3();
  private lip = new THREE.Vector3();
  private land = new THREE.Vector3();
  private sink = new THREE.Vector3();
  private got = 0;
  private best100 = 0;

  constructor(g: Game) {
    super(g);
    const group = g.rooms.fun.group;
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(SKEE_R, 18, 14), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.45, emissive: 0x554433, emissiveIntensity: 0.5 }));
    this.ball.visible = false;
    const strip = new THREE.PlaneGeometry(0.03, 1);
    strip.rotateX(-Math.PI / 2);
    strip.translate(0, 0, 0.5);
    this.guide = new THREE.Mesh(strip, new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.7, toneMapped: false }));
    this.guide.visible = false;
    group.add(this.ball, this.guide);
  }

  /** A point on the target board: `u` across from the middle, `v` up from its bottom edge. */
  private onBoard(u: number, v: number, out: THREE.Vector3) {
    const s = this.g.rooms.fun.skee;
    const b = s.board;
    const along = v - b.l / 2;
    return out.set(s.x - u, b.y + along * Math.sin(b.tilt) + SKEE_R, b.z + along * Math.cos(b.tilt));
  }

  start() {
    this.balls = 9;
    this.score = 0;
    this.best100 = 0;
    this.next();
    this.t = 0.3;
    this.g.benji.visible = false;
    this.say("Nine balls. Hold Space for power", 2.5);
    this.frame(0, true);
  }

  private next() {
    this.phase = "aim";
    this.power = 0;
    this.dir = 1;
    this.charging = false;
    this.ball.visible = true;
    this.ball.scale.setScalar(1);
    this.guide.visible = true;
  }

  private roll() {
    const s = this.g.rooms.fun.skee;
    const b = s.board;
    this.phase = "roll";
    this.t = 0;
    this.guide.visible = false;
    this.from.copy(this.ball.position);
    this.lip.set(s.x - this.aim * 0.3, s.y + 0.22 + SKEE_R, s.zRamp + 0.04);
    const u = this.aim * 0.36 + (Math.random() - 0.5) * 0.024;
    const v = -0.15 + this.power * 1.65 + (Math.random() - 0.5) * 0.04;
    this.got = 0;
    if (v < 0) {
      // Short: it dies on the ramp.
      this.land.set(s.x - u, s.y + 0.3, s.zRamp + 0.25);
      this.sink.set(s.x - u, s.y + 0.05, s.zRamp + 0.1);
      this.got = -1;
    } else if (v > b.l) {
      // Long: over the top and into the net.
      this.onBoard(u, b.l + 0.12, this.land);
      this.land.y += 0.2;
      this.sink.copy(this.land).setY(s.y + 0.5);
      this.got = -2;
    } else {
      this.onBoard(clamp(u, -b.w / 2 + SKEE_R, b.w / 2 - SKEE_R), v, this.land);
      const uu = clamp(u, -b.w / 2 + SKEE_R, b.w / 2 - SKEE_R);
      const ring = SKEE_HOLES.find((h) => Math.hypot(uu - h.u, v - h.v0) < h.r - SKEE_R * 0.35);
      // Anything that misses the rings rolls down to the ten at the bottom.
      this.got = ring ? ring.v : 10;
      if (ring) this.onBoard(ring.u, ring.v >= 50 ? ring.v0 : ring.v0 - ring.r + 0.06, this.sink);
      else this.onBoard(0, 0.34, this.sink);
    }
    this.g.sound.roll();
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    const s = g.rooms.fun.skee;
    this.tickCall(dt);
    if (this.phase === "aim") {
      this.aim = clamp(this.aim + input.move().x * 1.2 * dt, -1, 1);
      if (!this.charging && input.down("action") && this.t <= 0) {
        this.charging = true;
        this.power = 0;
        this.dir = 1;
      }
      if (this.t > 0) this.t -= dt;
      if (this.charging) {
        this.power += this.dir * dt * 0.95;
        if (this.power >= 1) {
          this.power = 1;
          this.dir = -1;
        } else if (this.power <= 0) {
          this.power = 0;
          this.dir = 1;
        }
        if (!input.down("action")) {
          this.charging = false;
          this.roll();
        }
      }
      if (this.phase === "aim") {
        this.ball.position.set(s.x - this.aim * 0.2, s.y + 0.03 + SKEE_R + (this.charging ? this.power * 0.05 : 0), s.z0 + 0.45 - (this.charging ? this.power * 0.12 : 0));
        this.guide.position.set(this.ball.position.x, s.y + 0.036, s.z0 + 0.55);
        this.guide.scale.set(1, 1, s.zRamp - s.z0 - 1.05);
        this.guide.rotation.y = Math.atan2(-this.aim * 0.1, s.zRamp - s.z0 - 1.05);
      }
    } else {
      this.t += dt;
      const p = this.ball.position;
      if (this.phase === "roll") {
        const T = 0.75 - this.power * 0.3;
        const k = Math.min(1, this.t / T);
        p.lerpVectors(this.from, this.lip, k);
        // Flat down the lane, then up the ramp at the end.
        const ramp = clamp((k - 0.8) / 0.2, 0, 1);
        p.y = lerp(s.y + 0.03 + SKEE_R, this.lip.y, ramp * ramp);
        this.ball.rotation.x += dt * 22;
        if (k >= 1) {
          this.phase = "fly";
          this.t = 0;
          g.sound.release();
        }
      } else if (this.phase === "fly") {
        const k = Math.min(1, this.t / 0.42);
        p.lerpVectors(this.lip, this.land, k);
        p.y += Math.sin(k * Math.PI) * 0.22;
        if (k >= 1) {
          this.phase = "drop";
          this.t = 0;
          g.sound.board();
        }
      } else if (this.phase === "drop") {
        const T = this.got >= 50 || this.got < 0 ? 0.28 : 0.5;
        const k = Math.min(1, this.t / T);
        p.lerpVectors(this.land, this.sink, k * k);
        this.ball.scale.setScalar(this.got > 0 ? 1 - Math.max(0, k - 0.7) / 0.3 : 1);
        if (k >= 1) {
          this.phase = "show";
          this.t = 0;
          this.ball.visible = false;
          const pts = Math.max(0, this.got);
          this.score += pts;
          this.balls--;
          if (pts >= 100) {
            this.best100++;
            g.sound.cash();
            g.stage.setPunch(0.5);
            g.input.rumble(0.7, 160);
          } else if (pts >= 40) g.sound.swish();
          else if (pts === 0) g.sound.bad();
          this.say(this.got === -1 ? "SHORT" : this.got === -2 ? "OVER THE TOP" : pts >= 100 ? "HUNDRED!" : `+${pts}`, 0.9);
        }
      } else if (this.t > 0.75) {
        if (this.balls <= 0) {
          this.finish();
          return;
        }
        this.next();
        this.t = 0.12;
      }
    }
    g.live.meter = this.charging ? this.power : 0;
    g.live.sweetLo = 0.52;
    g.live.sweetHi = 0.61;
    this.frame(dt, false);
  }

  private finish() {
    const g = this.g;
    const best = g.save.best.skee ?? 0;
    const record = this.score > best;
    if (record) g.save.best.skee = this.score;
    const won = g.arcadeWin(Math.min(40, Math.floor(this.score / 25)));
    g.showResults(
      {
        title: this.score >= 450 ? "LANE BOSS" : "NINE ROLLED",
        sub: this.score >= 450 ? "Somebody get this man a prize." : "The green on the meter is the forty. A touch more for the fifty.",
        rows: [
          ["Score", String(this.score)],
          ["Hundreds", String(this.best100)],
          ["Record", String(Math.max(best, this.score))],
        ],
        pay: 0,
        respect: 0,
        tickets: won,
        record,
        again: "Nine more",
      },
      () => this.start(),
      () => this.quit(),
    );
  }

  private frame(dt: number, snap: boolean) {
    const s = this.g.rooms.fun.skee;
    if (this.phase === "aim" || this.phase === "roll") {
      _a.set(s.x, 1.92, s.z0 - 0.9);
      _b.set(s.x, 1.2, s.zRamp - 0.3);
    } else {
      // Push in to watch it land.
      _a.set(s.x, 1.98, s.zRamp - 1.5);
      _b.set(s.x, s.board.y - 0.05, s.board.z);
    }
    this.aimCamera(_a, _b, 50, dt, snap);
  }

  quit() {
    this.ball.visible = false;
    this.guide.visible = false;
    this.leave(this.g.rooms.fun.skee.stand, 0);
  }

  hud(h: HudState) {
    h.machine = {
      name: "Skee-Ball",
      stats: [
        ["Score", String(this.score), "#39ff14"],
        ["Balls", String(Math.max(0, this.balls))],
        ["Record", String(this.g.save.best.skee ?? 0)],
      ],
      call: this.call,
      meter: true,
      act: "Roll",
    };
  }
}

// ------------------------------------------------------------------ Spin-N-Win

/** The big wheel in the middle of the floor. Three pulls; whatever is under the flapper is yours. */
export class PrizeWheel extends Machine {
  hints: [string, string][] = [
    ["Hold Space", "Pull the lever"],
    ["Release", "Spin"],
    ["Q", "Walk away"],
  ];
  private flapper: THREE.Mesh;
  private lever = new THREE.Group();
  private angle = 0;
  private speed = 0.5;
  private spins = 3;
  private power = 0;
  private charging = false;
  private spinning = false;
  private total = 0;
  private wait = 0;
  private lastWedge = 0;
  private flick = 0;

  constructor(g: Game) {
    super(g);
    const w = g.rooms.fun.wheel;
    const n = w.wedges.length;
    const r = 1.3;
    const pegMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.3, metalness: 0.6, emissive: 0x777777, emissiveIntensity: 0.6 });
    const pegGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.08, 8);
    pegGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const peg = new THREE.Mesh(pegGeo, pegMat);
      // The art is drawn with y down, so its angles run the other way on the disc.
      peg.position.set(Math.cos(-a) * (r - 0.07), Math.sin(-a) * (r - 0.07), 0.04);
      w.disc.add(peg);
    }
    const flap = new THREE.ConeGeometry(0.07, 0.3, 4);
    flap.rotateX(Math.PI);
    flap.translate(0, -0.15, 0);
    this.flapper = new THREE.Mesh(flap, new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: 0.3, emissive: 0xffa800, emissiveIntensity: 0.9 }));
    this.flapper.position.set(w.x, w.y + r + 0.12, w.z + 0.2);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xcfd6dd, roughness: 0.25, metalness: 0.9 }));
    arm.position.y = 0.35;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xff3b3b, roughness: 0.3, emissive: 0xff1a1a, emissiveIntensity: 0.7 }));
    knob.position.y = 0.74;
    this.lever.add(arm, knob);
    this.lever.position.set(w.x + 1.55, 1.2, w.z + 0.5);
    g.rooms.fun.group.add(this.flapper, this.lever);
  }

  start() {
    this.spins = 3;
    this.total = 0;
    this.power = 0;
    this.charging = false;
    this.spinning = false;
    this.speed = 0.5;
    this.wait = 0;
    this.g.benji.visible = false;
    this.say("Hold Space, let go to spin", 2.5);
    this.frame(0, true);
  }

  private under() {
    const w = this.g.rooms.fun.wheel;
    const n = w.wedges.length;
    const at = (((this.angle - Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(at / ((Math.PI * 2) / n)) % n;
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    const w = g.rooms.fun.wheel;
    this.tickCall(dt);
    if (this.wait > 0) this.wait -= dt;
    if (!this.spinning && this.spins > 0 && this.wait <= 0) {
      if (input.down("action")) {
        if (!this.charging) this.power = 0;
        this.charging = true;
        this.power = (this.power + dt * 0.9) % 1;
      } else if (this.charging) {
        this.charging = false;
        this.spinning = true;
        this.speed = 5 + this.power * 7;
        g.sound.whoosh();
      } else this.speed = 0.5;
    }
    if (this.spinning) {
      // The pegs drag on the flapper: it slows the same way every time, so the pull can be learned.
      this.speed = Math.max(0, this.speed - (1.1 + this.speed * 0.22) * dt);
      if (this.speed <= 0.02) {
        this.spinning = false;
        this.speed = 0;
        const won = w.wedges[this.under()]!;
        this.total += won;
        this.spins--;
        this.wait = 1.7;
        this.power = 0;
        if (won >= 25) {
          g.sound.cheer();
          g.stage.setPunch(0.6);
          g.cheer(w.x, w.z + 2, 12, 2.5);
        }
        g.sound.cash();
        this.say(won >= 25 ? `JACKPOT  +${won} TICKETS` : `+${won} TICKET${won === 1 ? "" : "S"}`, 1.6);
        g.push();
      }
    } else if (this.spins <= 0 && this.wait <= 0) {
      const won = g.arcadeWin(Math.min(60, this.total));
      g.showResults(
        {
          title: this.total >= 50 ? "BIG WINNER" : "THREE PULLS",
          sub: this.total >= 50 ? "The whole room heard that one." : "It slows the same way every time. Learn the pull.",
          rows: [["Wheel paid", `${this.total} tickets`]],
          pay: 0,
          respect: 0,
          tickets: won,
          record: false,
          again: "Three more pulls",
        },
        () => this.start(),
        () => this.quit(),
      );
      return;
    }
    this.angle += this.speed * dt;
    w.disc.rotation.z = this.angle;
    const now = this.under();
    if (now !== this.lastWedge) {
      this.lastWedge = now;
      this.flick = 1;
      if (this.spinning) g.sound.step();
    }
    this.flick = Math.max(0, this.flick - dt * 9);
    this.flapper.rotation.z = -this.flick * 0.5;
    this.lever.rotation.x = lerp(this.lever.rotation.x, this.charging ? 0.25 + this.power * 0.85 : 0, damp(14, dt));
    g.live.meter = this.charging ? this.power : 0;
    g.live.sweetLo = 0;
    g.live.sweetHi = 0;
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const w = this.g.rooms.fun.wheel;
    _a.set(w.x + 0.5, 2.3, w.z + 5.3);
    _b.set(w.x + 0.15, w.y + 0.25, w.z);
    this.aimCamera(_a, _b, 50, dt, snap);
  }

  quit() {
    this.charging = false;
    this.lever.rotation.x = 0;
    this.leave(this.g.rooms.fun.wheel.stand, Math.PI);
  }

  hud(h: HudState) {
    h.machine = {
      name: "Spin-N-Win",
      stats: [
        ["Tickets", String(this.total), "#39ff14"],
        ["Pulls", String(Math.max(0, this.spins))],
      ],
      call: this.call,
      meter: true,
      act: "Pull",
    };
  }
}
