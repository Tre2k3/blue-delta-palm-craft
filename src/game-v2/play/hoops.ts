import * as THREE from "three";
import { BENJI_HEIGHT } from "../assets/cast";
import type { Hoop, HudState } from "../core/types";
import { clamp, damp, lerp } from "../core/util";
import type { Activity, Game } from "../game";
import { basketballTex } from "../gfx/tex";
import { COURT, CURB } from "../world/map";

const G = 9.81;
const BALL_R = 0.12;
const TUBE = 0.02;
const SECONDS = 60;
const FLOOR = CURB;
const ARC = 6.75;

type Ball = {
  mesh: THREE.Mesh;
  live: boolean;
  p: THREE.Vector3;
  v: THREE.Vector3;
  spin: number;
  rim: boolean;
  board: boolean;
  scored: boolean;
  judged: boolean;
  points: number;
  bounces: number;
  age: number;
  error: number;
  hot: boolean;
};

/**
 * Sixty-second shootout on the north basket of the 901 Court. The ball is a real projectile:
 * it is thrown at the rim, and the rim, the glass and the floor decide what happens next.
 */
export class Hoops implements Activity {
  hints: [string, string][] = [
    ["W A S D", "Move"],
    ["Hold Space", "Charge the shot"],
    ["Release", "In the green"],
    ["Q", "Leave"],
  ];
  private hoop: Hoop;
  private net: THREE.Mesh;
  private balls: Ball[] = [];
  private hand: THREE.Mesh;
  private ring: THREE.Mesh;
  private group = new THREE.Group();
  private charge = 0;
  private charging = false;
  private cool = 0;
  private left = SECONDS;
  private started = false;
  private over = false;
  private score = 0;
  private shots = 0;
  private made = 0;
  private streak = 0;
  private bestStreak = 0;
  private call = "";
  private callLeft = 0;
  private netKick = 0;
  private jump = 0;
  private dribble = 0;
  private spot = { x: 0, z: 0 };
  private lastRim = 0;
  private tick = 0;
  private cam = new THREE.Vector3();
  private look = new THREE.Vector3();
  private trail: THREE.Line;
  private trailPos = new Float32Array(30 * 3);
  private trailBall: Ball | null = null;

  constructor(private g: Game) {
    const hoops = g.city.hoops;
    const i = hoops[0]!.z < hoops[1]!.z ? 0 : 1;
    this.hoop = hoops[i]!;
    this.net = g.city.nets[i]!;
    const geo = new THREE.SphereGeometry(BALL_R, 20, 14);
    const mat = new THREE.MeshStandardMaterial({ map: basketballTex(), roughness: 0.75, emissive: 0x8a3a12, emissiveIntensity: 0.55 });
    for (let k = 0; k < 3; k++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.visible = false;
      this.group.add(mesh);
      this.balls.push({ mesh, live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), spin: 0, rim: false, board: false, scored: false, judged: false, points: 2, bounces: 0, age: 0, error: 0, hot: false });
    }
    this.hand = new THREE.Mesh(geo, mat);
    this.hand.castShadow = true;
    this.group.add(this.hand);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 3;
    this.group.add(this.ring);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.BufferAttribute(this.trailPos, 3));
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: new THREE.Color(2.4, 1.3, 0.35), transparent: true, opacity: 0.85, toneMapped: false }));
    this.trail.frustumCulled = false;
    this.trail.visible = false;
    this.group.add(this.trail);
    this.group.visible = false;
    g.city.exterior.add(this.group);
  }

  start() {
    const g = this.g;
    this.group.visible = true;
    this.left = SECONDS;
    this.started = false;
    this.over = false;
    this.score = this.shots = this.made = this.streak = this.bestStreak = 0;
    this.charge = 0;
    this.charging = false;
    this.cool = 0.4;
    this.tick = 10;
    for (const b of this.balls) {
      b.live = false;
      b.mesh.visible = false;
    }
    this.say("Shoot to start the clock", 6);
    g.pos.x = COURT.cx;
    g.pos.z = this.hoop.z + 5.2;
    this.moveSpot();
    this.frame(0, true);
  }

  private say(text: string, seconds = 1.6) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  private moveSpot() {
    const h = this.hoop;
    const spots: [number, number][] = [
      [-6.2, 1.4],
      [6.2, 1.4],
      [-5.2, 5.4],
      [5.2, 5.4],
      [0, 7.6],
      [-2.6, 4],
      [2.6, 4],
      [0, 9.6],
    ];
    let pick = spots[0]!;
    for (let tries = 0; tries < 6; tries++) {
      pick = spots[Math.floor(Math.random() * spots.length)]!;
      if (Math.hypot(h.x + pick[0] - this.spot.x, h.z + pick[1] - this.spot.z) > 2.5) break;
    }
    this.spot.x = h.x + pick[0];
    this.spot.z = h.z + pick[1];
    this.ring.position.set(this.spot.x, FLOOR + 0.03, this.spot.z);
  }

  private window(d: number) {
    let half = lerp(0.085, 0.045, clamp((d - 2) / 7, 0, 1));
    if (this.g.wearing("sackrow_11")) half *= 1.3;
    if (this.streak >= 3) half *= 1.15;
    return { lo: 0.8 - half, hi: 0.8 + half, half };
  }

  private release() {
    const g = this.g;
    const h = this.hoop;
    const ball = this.balls.find((b) => !b.live) ?? this.balls.reduce((a, b) => (a.age > b.age ? a : b));
    const sx = g.pos.x + Math.sin(g.heading) * 0.25;
    const sz = g.pos.z + Math.cos(g.heading) * 0.25;
    const far = Math.hypot(h.x - g.pos.x, h.z - g.pos.z);
    const d = Math.hypot(h.x - sx, h.z - sz);
    const w = this.window(far);
    const e = this.charge - 0.8;
    const outside = Math.sign(e) * Math.max(0, Math.abs(e) - w.half);
    const speed = Math.hypot(g.vel.x, g.vel.z);
    const y0 = BENJI_HEIGHT + 0.42 + this.jump;
    // Close shots go up steep so they drop in over the front of the rim.
    const theta = lerp(1.2, 0.93, clamp((d - 1) / 7.5, 0, 1));
    const rise = h.y - (FLOOR + y0);
    const v2 = (G * d * d) / (2 * Math.cos(theta) ** 2 * Math.max(0.2, d * Math.tan(theta) - rise));
    const perfect = Math.abs(e) <= w.half;
    const factor = 1 + (perfect ? e * 0.035 : outside * 0.6 + Math.sign(e) * 0.012) + (Math.random() - 0.5) * 0.006;
    const v = Math.sqrt(v2) * factor;
    const side = (Math.random() + Math.random() - 1) * (0.004 + Math.abs(outside) * 0.3 + speed * 0.0035);
    const yaw = Math.atan2(h.x - sx, h.z - sz) + side;
    ball.p.set(sx, FLOOR + y0, sz);
    ball.v.set(Math.sin(yaw) * Math.cos(theta) * v, Math.sin(theta) * v, Math.cos(yaw) * Math.cos(theta) * v);
    ball.live = true;
    ball.mesh.visible = true;
    ball.rim = ball.board = ball.scored = ball.judged = false;
    ball.bounces = 0;
    ball.age = 0;
    ball.error = e;
    ball.points = far > ARC ? 3 : 2;
    ball.hot = Math.hypot(g.pos.x - this.spot.x, g.pos.z - this.spot.z) < 1.15;
    if (ball.hot) ball.points += 1;
    this.trailBall = ball;
    for (let i = 0; i < 30; i++) this.trailPos.set([ball.p.x, ball.p.y, ball.p.z], i * 3);
    this.shots++;
    this.started = true;
    this.cool = 0.55;
    this.jump = 0.001;
    g.sound.release();
    if (perfect && Math.abs(e) < w.half * 0.4) this.say("PERFECT RELEASE", 1);
  }

  private judge(b: Ball, made: boolean) {
    if (b.judged) return;
    b.judged = true;
    const g = this.g;
    if (made) {
      this.made++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const bonus = this.streak >= 3 ? 1 : 0;
      this.score += b.points + bonus;
      this.netKick = 1;
      if (b.rim || b.board) g.sound.rim();
      g.sound.swish();
      if (b.points >= 3 || this.streak === 3) g.sound.cheer();
      const what = !b.rim && !b.board ? "SWISH" : b.board ? "OFF THE GLASS" : "BUCKET";
      this.say(`${what}  +${b.points + bonus}${this.streak >= 3 ? "  ON FIRE" : ""}`, 1.4);
      if (b.hot) this.moveSpot();
      g.stage.setPunch(0.5);
    } else {
      this.streak = 0;
      this.say(Math.abs(b.error) < 0.06 ? "Rimmed out" : b.error < 0 ? "Short. Hold it longer." : "Long. Let go sooner.", 1.4);
    }
  }

  private physics(b: Ball, dt: number) {
    const h = this.hoop;
    const g = this.g;
    const steps = Math.max(1, Math.ceil(dt / (1 / 200)));
    const s = dt / steps;
    for (let i = 0; i < steps; i++) {
      const prevY = b.p.y;
      b.p.addScaledVector(b.v, s);
      b.p.y -= 0.5 * G * s * s;
      b.v.y -= G * s;
      const dx = b.p.x - h.x;
      const dz = b.p.z - h.z;
      const dh = Math.hypot(dx, dz);
      // Rim: nearest point on the ring.
      if (Math.abs(b.p.y - h.y) < BALL_R + TUBE + 0.01 && dh < h.rimR + BALL_R + TUBE + 0.01) {
        const ux = dh > 1e-5 ? dx / dh : 1;
        const uz = dh > 1e-5 ? dz / dh : 0;
        const ex = b.p.x - (h.x + ux * h.rimR);
        const ey = b.p.y - h.y;
        const ez = b.p.z - (h.z + uz * h.rimR);
        const dist = Math.hypot(ex, ey, ez);
        if (dist < BALL_R + TUBE && dist > 1e-5) {
          const nx = ex / dist;
          const ny = ey / dist;
          const nz = ez / dist;
          const vn = b.v.x * nx + b.v.y * ny + b.v.z * nz;
          if (vn < 0) {
            b.v.x -= 1.55 * vn * nx;
            b.v.y -= 1.55 * vn * ny;
            b.v.z -= 1.55 * vn * nz;
            b.rim = true;
            if (g.time - this.lastRim > 0.08 && vn < -0.8) g.sound.rim();
            this.lastRim = g.time;
          }
          const push = BALL_R + TUBE - dist;
          b.p.x += nx * push;
          b.p.y += ny * push;
          b.p.z += nz * push;
        }
      }
      // Glass.
      const front = h.dir * (b.p.z - h.boardZ);
      if (front > -BALL_R && front < 0.12 && Math.abs(b.p.x - h.x) < h.boardHalfW + 0.04 && b.p.y > h.boardMinY - 0.05 && b.p.y < h.boardMaxY + 0.05 && h.dir * b.v.z > 0) {
        b.v.z *= -0.62;
        b.v.x *= 0.9;
        b.p.z = h.boardZ - h.dir * BALL_R;
        b.board = true;
        g.sound.board();
      }
      // Through the hoop from above.
      if (!b.scored && prevY > h.y && b.p.y <= h.y && b.v.y < 0 && dh < h.rimR - 0.025) {
        b.scored = true;
        b.v.x *= 0.25;
        b.v.z *= 0.25;
        b.v.y = Math.max(b.v.y, -4.2);
        this.judge(b, true);
      }
      if (b.p.y < FLOOR + BALL_R) {
        b.p.y = FLOOR + BALL_R;
        if (b.v.y < -0.6) g.sound.bounce(Math.min(1, -b.v.y / 7));
        b.v.y = -b.v.y * 0.68;
        b.v.x *= 0.78;
        b.v.z *= 0.78;
        b.bounces++;
        if (!b.scored) this.judge(b, false);
      }
    }
    b.age += dt;
    b.spin += dt * 9;
    b.mesh.position.copy(b.p);
    b.mesh.rotation.set(-b.spin, 0, 0);
    if (b.bounces > 4 || b.age > 5) {
      b.live = false;
      b.mesh.visible = false;
      if (!b.scored) this.judge(b, false);
    }
  }

  update(dt: number) {
    const g = this.g;
    const h = this.hoop;
    const input = g.input;

    if (this.started && !this.over) {
      this.left -= dt;
      if (this.left <= this.tick && this.tick > 0) {
        if (this.tick <= 5) g.sound.countdown();
        this.tick = Math.ceil(this.left) - 1;
        g.push();
      }
      if (this.left <= 0) {
        this.left = 0;
        this.charging = false;
        this.over = true;
      }
    }
    if (this.over && !this.balls.some((b) => b.live && !b.judged)) {
      this.finish();
      return;
    }

    // Feet: W is toward the basket, A and D circle it.
    const m = input.move();
    const tx = h.x - g.pos.x;
    const tz = h.z - g.pos.z;
    const d = Math.hypot(tx, tz) || 1;
    const fx = tx / d;
    const fz = tz / d;
    const top = this.charging ? 1.7 : 4.4;
    const k = damp(12, dt);
    g.vel.x += ((fx * m.y - fz * m.x) * top - g.vel.x) * k;
    g.vel.z += ((fz * m.y + fx * m.x) * top - g.vel.z) * k;
    g.pos.x = clamp(g.pos.x + g.vel.x * dt, COURT.cx - COURT.halfW + 0.5, COURT.cx + COURT.halfW - 0.5);
    g.pos.z = clamp(g.pos.z + g.vel.z * dt, h.z + 1.25, COURT.cz + 3);
    g.heading = Math.atan2(h.x - g.pos.x, h.z - g.pos.z);
    g.benji.speed = Math.hypot(g.vel.x, g.vel.z);

    // The shot.
    this.cool -= dt;
    const w = this.window(d);
    g.live.sweetLo = w.lo;
    g.live.sweetHi = w.hi;
    if (!this.over) {
      if (!this.charging && this.cool <= 0 && input.down("action")) {
        this.charging = true;
        this.charge = 0;
      }
      if (this.charging) {
        this.charge += dt / 0.9;
        if (!input.down("action") || this.charge >= 1.12) {
          this.charging = false;
          this.release();
        }
      }
    }
    g.live.meter = this.charging ? Math.min(1, this.charge) : 0;

    if (this.jump > 0) {
      this.jump += dt;
      const t = this.jump / 0.5;
      g.benji.lift = t >= 1 ? 0 : Math.sin(t * Math.PI) * 0.34;
      if (t >= 1) this.jump = 0;
    } else g.benji.lift = 0;

    // Ball in hand: dribbled low, lifted to the forehead on the way up.
    const rx = -Math.cos(g.heading);
    const rz = Math.sin(g.heading);
    this.dribble += dt * (6 + g.benji.speed * 0.8);
    const bounce = Math.abs(Math.sin(this.dribble));
    this.hand.visible = this.cool <= 0 && !this.over;
    if (this.charging) {
      const up = Math.min(1, this.charge * 2.2);
      this.hand.position.set(g.pos.x + rx * 0.12 + fx * 0.2, FLOOR + lerp(0.95, BENJI_HEIGHT + 0.3, up), g.pos.z + rz * 0.12 + fz * 0.2);
    } else {
      this.hand.position.set(g.pos.x + rx * 0.42 + fx * 0.18, FLOOR + BALL_R + bounce * 0.78, g.pos.z + rz * 0.42 + fz * 0.18);
      if (bounce < 0.08 && this.hand.visible && Math.sin(this.dribble) * Math.sin(this.dribble - 0.3) < 0) g.sound.bounce(0.35);
    }
    this.hand.rotation.x -= dt * 6;

    for (const b of this.balls) if (b.live) this.physics(b, dt);
    // A streak of light behind the ball until it comes down.
    const tb = this.trailBall;
    this.trail.visible = !!tb && tb.live && tb.bounces === 0 && !tb.scored;
    if (tb && this.trail.visible) {
      this.trailPos.copyWithin(3, 0, 29 * 3);
      this.trailPos.set([tb.p.x, tb.p.y, tb.p.z], 0);
      (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    if (this.netKick > 0) {
      this.netKick = Math.max(0, this.netKick - dt * 2.4);
      const s = Math.sin(this.netKick * 14) * this.netKick;
      this.net.scale.set(1 - s * 0.16, 1 + s * 0.3, 1 - s * 0.16);
    }
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(g.time * 5) * 0.2;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const h = this.hoop;
    const tx = g.pos.x - h.x;
    const tz = g.pos.z - h.z;
    const d = Math.hypot(tx, tz) || 1;
    const ux = tx / d;
    const uz = tz / d;
    // Low behind his shoulder, looking up at the rim.
    this.cam.set(g.pos.x + ux * 5.1 - uz * 1.25, FLOOR + 1.4 + d * 0.03, g.pos.z + uz * 5.1 + ux * 1.25);
    this.look.set(lerp(g.pos.x, h.x, 0.6), FLOOR + 2.05, lerp(g.pos.z, h.z, 0.6));
    if (snap) g.camera.position.copy(this.cam);
    else g.camera.position.lerp(this.cam, damp(6, dt));
    g.camera.lookAt(this.look);
    if (g.camera.fov !== 50) {
      g.camera.fov = 50;
      g.camera.updateProjectionMatrix();
    }
    g.camYaw = Math.atan2(-ux, -uz);
  }

  private finish() {
    const g = this.g;
    const best = g.save.best.hoops ?? 0;
    const record = this.score > best;
    if (record) g.save.best.hoops = this.score;
    const got = g.earn(this.score * 4, Math.floor(this.score / 3));
    g.emit("hoops", this.score, this.bestStreak);
    this.over = true;
    this.hand.visible = false;
    g.showResults(
      {
        title: this.score >= 20 ? "HEAT CHECK" : this.score >= 10 ? "COURT APPROVED" : "FINAL BUZZER",
        sub: this.score >= 10 ? "Court OG nods. That'll play." : "OG wants to see ten. Run it back.",
        rows: [
          ["Points", String(this.score)],
          ["Shooting", `${this.made} of ${this.shots}`],
          ["Best streak", String(this.bestStreak)],
          ["Record", String(Math.max(best, this.score))],
        ],
        pay: got.dollars,
        respect: got.respect,
        tickets: 0,
        record,
        again: "Run it back",
      },
      () => this.start(),
      () => this.leave(),
    );
  }

  private leave() {
    const g = this.g;
    this.group.visible = false;
    g.benji.lift = 0;
    g.pos.x = g.city.anchors.ogSpot.x - 1.5;
    g.pos.z = g.city.anchors.ogSpot.z + 2.6;
    g.heading = Math.PI;
    g.camYaw = Math.PI;
    g.end("walk");
  }

  quit() {
    this.leave();
  }

  hud(h: HudState) {
    const d = Math.hypot(this.hoop.x - this.g.pos.x, this.hoop.z - this.g.pos.z);
    const onSpot = Math.hypot(this.g.pos.x - this.spot.x, this.g.pos.z - this.spot.z) < 1.15;
    h.hoops = {
      phase: this.over ? "over" : "run",
      score: this.score,
      left: Math.ceil(this.left),
      shots: this.shots,
      made: this.made,
      streak: this.streak,
      best: this.g.save.best.hoops ?? 0,
      call: this.call,
      fire: this.streak >= 3,
      range: `${d > ARC ? "3 PT" : "2 PT"}${onSpot ? "  HOT SPOT +1" : ""}`,
    };
  }
}
