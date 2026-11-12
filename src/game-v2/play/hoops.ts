import * as THREE from "three";
import { Card } from "../actors/card";
import { BALLERS, BENJI_HEIGHT } from "../assets/cast";
import type { Hoop, HoopsKind, HudState } from "../core/types";
import { clamp, damp, lerp } from "../core/util";
import type { Activity, Game } from "../game";
import { basketballTex } from "../gfx/tex";
import { COURT, CURB } from "../world/map";

const G = 9.81;
const BALL_R = 0.12;
const TUBE = 0.02;
const SECONDS = 60;
const FLOOR = CURB;
/** Where the court art paints the arc. */
const ARC = 6;

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
  /** Whose shot: 0 is Benji, 1 the other player. */
  who: 0 | 1;
  /** Put through the rim by hand. */
  dunk: boolean;
};

/** A game to this many, shot for shot from the same spot. */
const TO = 11;
/** Who Benji runs into at the court, easiest first. `skill` is how often they are in the green. */
const RIVALS = [
  { name: "Lil Tez", skill: 0.42, height: 1.62, line: "First one's free." },
  { name: "D-Mac", skill: 0.56, height: 1.78, line: "I don't miss from here." },
  { name: "Rico", skill: 0.68, height: 1.82, line: "Corner pocket. Watch." },
  { name: "Ace", skill: 0.8, height: 1.84, line: "They call me Ace for a reason." },
];
/** How fast the other player gets to a spot, m/s. */
const RIVAL_PACE = 5.2;
/** Seconds the other player is off the floor when he takes it to the rim. */
const DRIVE_AIR = 0.62;

/**
 * Basketball on the north basket of the 901 Court, three ways: the sixty-second shootout, a
 * game to eleven against whoever is on the court, and practice with no clock at all. The ball is a real projectile:
 * it is thrown at the rim, and the rim, the glass and the floor decide what happens next.
 */
export class Hoops implements Activity {
  hints: [string, string][] = [
    ["W A S D", "Move"],
    ["Hold Space", "Charge the shot"],
    ["Release", "In the green"],
    ["Space", "On his shot: jump to block it"],
    ["3 in a row", "Space at the rim: dunk"],
    ["Q", "Leave"],
  ];
  kind: HoopsKind = "shootout";
  /** The other player: where he is, where he is headed, and how far into his jumper he is. */
  private rival = { card: null as Card | null, tier: 0, name: "", skill: 0.5, score: 0, wait: 0, x: 0, z: 0, tx: 0, tz: 0, jump: 0 };
  /** Versus: whose shot it is. "air" is a ball on its way, "next" the pause between rounds. */
  private turn: "you" | "rival" | "air" | "next" = "you";
  private shotClock = 0;
  private pause = 0;
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
  private ballMat: THREE.MeshStandardMaterial;
  /** Defence: when Benji last left the floor at the other player's shot, and what it did to the shot. */
  private contest = { at: -9, cool: 0, result: "" as "" | "block" | "hand" };
  /** A pump fake the other player still has in him before this shot. */
  private fake = false;
  /** How long his arms are up before the ball leaves: a quick release one time, a slow one the next. */
  private lead = 0.5;
  /** Benji left the floor on the fake. */
  private bit = false;
  /** Space has to come up before a new shot can be charged, so a jump on defence is not also a shot. */
  private armed = true;
  /** The dunk: how far into it he is, where it started from, and what it is worth. */
  private dunk = { on: false, t: 0, fx: 0, fz: 0, pts: 2, done: false };
  /** The other player taking it to the rim: on from the moment he sets off, `t` from when he leaves the floor. */
  private drive = { on: false, t: 0, done: false };

  constructor(private g: Game) {
    const hoops = g.city.hoops;
    const i = hoops[0]!.z < hoops[1]!.z ? 0 : 1;
    this.hoop = hoops[i]!;
    this.net = g.city.nets[i]!;
    const geo = new THREE.SphereGeometry(BALL_R, 20, 14);
    const mat = new THREE.MeshStandardMaterial({ map: basketballTex(), roughness: 0.75, emissive: 0x8a3a12, emissiveIntensity: 0.55 });
    this.ballMat = mat;
    for (let k = 0; k < 3; k++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.visible = false;
      this.group.add(mesh);
      this.balls.push({ mesh, live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), spin: 0, rim: false, board: false, scored: false, judged: false, points: 2, bounces: 0, age: 0, error: 0, dunk: false, who: 0, hot: false });
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

  start(kind: HoopsKind = this.kind) {
    const g = this.g;
    this.kind = kind;
    this.group.visible = true;
    g.benji.visible = true;
    this.left = SECONDS;
    this.started = false;
    this.over = false;
    this.score = this.shots = this.made = this.streak = this.bestStreak = 0;
    this.charge = 0;
    this.charging = false;
    this.cool = 0.4;
    this.tick = 10;
    this.dunk.on = false;
    this.drive.on = false;
    this.contest = { at: -9, cool: 0, result: "" };
    this.fake = false;
    this.armed = false;
    for (const b of this.balls) {
      b.live = false;
      b.mesh.visible = false;
    }
    g.pos.x = COURT.cx;
    g.pos.z = this.hoop.z + 5.2;
    this.moveSpot();
    const r = this.rival;
    if (r.card) r.card.visible = kind === "versus";
    this.turn = "you";
    if (kind === "versus") {
      r.tier = Math.min(RIVALS.length - 1, g.save.best.versus ?? 0);
      const who = RIVALS[r.tier]!;
      r.name = who.name;
      r.skill = who.skill;
      r.score = 0;
      const art = BALLERS[r.tier]!;
      if (!r.card) {
        r.card = new Card(art, who.height);
        g.city.exterior.add(r.card.group);
      } else r.card.setArt(art);
      r.card.height = who.height;
      r.card.visible = true;
      // He comes off the baseline to the first spot.
      r.x = r.tx = this.hoop.x - 3.4;
      r.z = r.tz = this.hoop.z + 2.2;
      r.jump = 0;
      this.started = true;
      this.round();
      this.say(`${r.name}: "${who.line}"  First to ${TO}.`, 3.2);
      g.sound.voice(`rival-${r.name.toLowerCase().replace(/[^a-z]+/g, "-")}`);
    } else this.say(kind === "practice" ? "Practice. No clock, no pressure." : "Shoot to start the clock", 6);
    this.frame(0, true);
  }

  /** Versus: a new spot, the other player shoots first, Benji answers from the same place. */
  private round() {
    const r = this.rival;
    this.moveSpot();
    this.turn = "rival";
    // He does not shoot on a count: sometimes quick, sometimes he makes Benji wait, and the
    // better players put the ball up once without letting it go.
    r.wait = 0.75 + Math.random() * 0.9;
    this.fake = Math.random() < [0, 0.12, 0.3, 0.42][Math.min(3, r.tier)]!;
    this.lead = 0.38 + Math.random() * 0.26;
    this.bit = false;
    r.tx = this.spot.x;
    r.tz = this.spot.z;
    // Benji guards him: a step toward the rim from the spot.
    const gx = this.hoop.x - this.spot.x;
    const gz = this.hoop.z - this.spot.z;
    const gd = Math.hypot(gx, gz) || 1;
    // A little to the lens's side of the line to the rim, so the shooter does not hide him.
    this.g.pos.x = this.spot.x + (gx / gd) * 1.3 + (gz / gd) * 0.7;
    this.g.pos.z = this.spot.z + (gz / gd) * 1.3 - (gx / gd) * 0.7;
    this.g.vel.x = this.g.vel.z = 0;
    this.contest.result = "";
    this.contest.at = -9;
    if (Math.max(this.score, r.score) >= TO - 3) this.say(this.score >= TO - 3 && this.score >= r.score ? "GAME POINT" : `GAME POINT, ${r.name.toUpperCase()}`, 1.3);
    this.g.push();
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
    let half = lerp(0.092, 0.052, clamp((d - 2) / 7, 0, 1));
    if (this.g.wearing("sackrow_11")) half *= 1.3;
    if (this.streak >= 3) half *= 1.15;
    return { lo: 0.8 - half, hi: 0.8 + half, half };
  }

  /** Throw a ball from where a player stands. `e` is how far off the perfect release it was. */
  private throwBall(who: 0 | 1, px: number, pz: number, e: number, half: number, speed: number, height: number, hot: boolean) {
    const h = this.hoop;
    const ball = this.balls.find((b) => !b.live) ?? this.balls.reduce((a, b) => (a.age > b.age ? a : b));
    const heading = Math.atan2(h.x - px, h.z - pz);
    const sx = px + Math.sin(heading) * 0.25;
    const sz = pz + Math.cos(heading) * 0.25;
    const far = Math.hypot(h.x - px, h.z - pz);
    const d = Math.hypot(h.x - sx, h.z - sz);
    const outside = Math.sign(e) * Math.max(0, Math.abs(e) - half);
    const y0 = height + 0.42;
    // Close shots go up steep so they drop in over the front of the rim.
    const theta = lerp(1.2, 0.93, clamp((d - 1) / 7.5, 0, 1));
    const rise = h.y - (FLOOR + y0);
    const v2 = (G * d * d) / (2 * Math.cos(theta) ** 2 * Math.max(0.2, d * Math.tan(theta) - rise));
    const perfect = Math.abs(e) <= half;
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
    ball.who = who;
    ball.dunk = false;
    ball.points = far > ARC ? 3 : 2;
    ball.hot = hot;
    if (ball.hot) ball.points += 1;
    this.trailBall = ball;
    for (let i = 0; i < 30; i++) this.trailPos.set([ball.p.x, ball.p.y, ball.p.z], i * 3);
    this.g.sound.release();
    return perfect && Math.abs(e) < half * 0.4;
  }

  private release() {
    const g = this.g;
    const far = Math.hypot(this.hoop.x - g.pos.x, this.hoop.z - g.pos.z);
    const w = this.window(far);
    const hot = this.kind === "shootout" && Math.hypot(g.pos.x - this.spot.x, g.pos.z - this.spot.z) < 1.15;
    const pure = this.throwBall(0, g.pos.x, g.pos.z, this.charge - 0.8, w.half, Math.hypot(g.vel.x, g.vel.z), BENJI_HEIGHT + this.jump, hot);
    this.shots++;
    this.started = true;
    this.cool = 0.55;
    this.jump = 0.001;
    if (this.kind === "versus") {
      this.turn = "air";
      const pts = far > ARC ? 3 : 2;
      if (this.score + pts >= TO && this.score + pts > this.rival.score) {
        g.hold(1.3, 0.5);
        this.say("FOR THE WIN...", 1.6);
        return;
      }
    }
    if (pure) this.say("PERFECT RELEASE", 1);
  }

  /** The other player's shot: in the green as often as their skill says, off by a bit otherwise. */
  private rivalShot() {
    const r = this.rival;
    const far = Math.hypot(this.hoop.x - this.spot.x, this.hoop.z - this.spot.z);
    const half = lerp(0.085, 0.045, clamp((far - 2) / 7, 0, 1));
    const g = this.g;
    // Benji is in the air for half a second. At the top of it the shot is blocked; either side of
    // that there is a hand in the shooter's face; down again, or too far off, and the look is open.
    const since = g.time - this.contest.at;
    const near = Math.hypot(g.pos.x - this.spot.x, g.pos.z - this.spot.z) < 2.6;
    const result = !near || since < 0.06 || since > 0.46 ? "" : since >= 0.21 && since <= 0.29 ? "block" : "hand";
    this.contest.result = result;
    // A man who went for the fake is no defence at all: the shooter has all day.
    const good = result !== "block" && Math.random() < r.skill * (result === "hand" ? 0.6 : this.bit ? 1.15 : 1);
    const e = good ? (Math.random() - 0.5) * half * 1.5 : (Math.random() < 0.5 ? -1 : 1) * (half + 0.035 + Math.random() * 0.11);
    // An open look that was going in anyway: now and then the better players take it to the rim
    // instead. It counts two wherever he set off from, so from outside the arc it costs him a point.
    if (good && result === "" && r.tier >= 1 && far <= 8 && r.card?.has("dunk") && Math.random() < 0.25) {
      this.drive = { on: true, t: 0, done: false };
      r.tx = this.hoop.x;
      r.tz = this.hoop.z + 0.7;
      this.turn = "air";
      this.say(`${r.name} takes it to the rim`, 1.2);
      return;
    }
    this.throwBall(1, this.spot.x, this.spot.z, e, half, 0, (r.card?.height ?? 1.78) * 0.97, false);
    if (result === "block" && this.trailBall) {
      // Swatted: it comes off his hand sideways and nowhere near the rim.
      const b = this.trailBall;
      const side = Math.random() < 0.5 ? -1 : 1;
      b.v.set(side * (2 + Math.random() * 1.5), 2.6, 1.5 + Math.random());
      b.p.y += 0.25;
      g.sound.board();
      g.stage.setPunch(0.8);
      g.input.rumble(0.7, 160);
      g.buzz([30, 40, 60]);
      g.cheer(COURT.cx, COURT.cz, 20, 1.8);
      this.say("BLOCKED!", 1.3);
    } else if (result === "hand") this.say("HAND IN HIS FACE", 1);
    r.jump = 0.001;
    this.turn = "air";
  }

  private judge(b: Ball, made: boolean) {
    if (b.judged) return;
    b.judged = true;
    const g = this.g;
    if (made) g.cheer(COURT.cx, COURT.cz, 18, b.points >= 3 ? 1.8 : 1.1);
    if (b.who === 1) {
      const r = this.rival;
      if (made) {
        r.score += b.points;
        this.netKick = 1;
        g.sound.swish();
        const talk = ["Too easy.", "Count it.", "Net.", "All day.", "You see that?"];
        this.say(b.dunk ? `${r.name} THROWS IT DOWN  +${b.points}` : this.contest.result === "hand" ? `${r.name} hits over you  +${b.points}` : `${r.name}: "${talk[Math.floor(Math.random() * talk.length)]}"  +${b.points}`, 1.5);
      } else this.say(this.contest.result === "block" ? "BLOCKED!  Your ball." : this.contest.result === "hand" ? `Good D. ${r.name} misses.` : `${r.name} bricks it. Your ball.`, 1.5);
      this.contest.result = "";
      // Benji answers from the same spot.
      this.turn = "you";
      this.armed = false;
      this.shotClock = 10;
      // He steps off the spot and guards it.
      r.tx = this.spot.x - 2;
      r.tz = this.spot.z + 1.2;
      g.pos.x = this.spot.x;
      g.pos.z = this.spot.z;
      g.push();
      return;
    }
    if (this.kind === "versus") {
      this.turn = "next";
      this.pause = 1.3;
    }
    if (made) {
      this.made++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const bonus = this.streak >= 3 && this.kind === "shootout" ? 1 : 0;
      this.score += b.points + bonus;
      this.netKick = 1;
      if (b.rim || b.board) g.sound.rim();
      g.sound.swish();
      if (b.points >= 3 || this.streak === 3) g.sound.cheer();
      const what = b.dunk ? "DUNK!" : !b.rim && !b.board ? "SWISH" : b.board ? "OFF THE GLASS" : "BUCKET";
      // The dunk is what three in a row buys, and it has to be earned again.
      if (b.dunk) this.streak = 0;
      this.say(`${what}  +${b.points + bonus}${this.streak === 3 ? (this.kind === "versus" ? "  ON FIRE: SPACE TO DUNK" : "  ON FIRE: DUNK AT THE RIM") : this.streak > 3 ? "  ON FIRE" : ""}`, this.streak === 3 ? 2.2 : 1.4);
      if (b.hot && this.kind === "shootout") this.moveSpot();
      g.stage.setPunch(0.5);
      g.input.rumble(0.45, 120);
      g.buzz(30);
      // The bucket that ends a game to eleven.
      if (this.kind === "versus" && this.score >= TO && this.score > this.rival.score) g.moment(2);
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

    if (this.kind === "versus" && !this.over) this.versus(dt);
    if (this.started && !this.over && this.kind === "shootout") {
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
    if (this.over && this.kind === "versus") return;
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
    if (this.dunk.on) {
      g.vel.x = g.vel.z = 0;
    } else {
      g.vel.x += ((fx * m.y - fz * m.x) * top - g.vel.x) * k;
      g.vel.z += ((fz * m.y + fx * m.x) * top - g.vel.z) * k;
      g.pos.x = clamp(g.pos.x + g.vel.x * dt, COURT.cx - COURT.halfW + 0.5, COURT.cx + COURT.halfW - 0.5);
      g.pos.z = clamp(g.pos.z + g.vel.z * dt, h.z + 1.25, COURT.cz + 3);
    }
    if (this.kind === "versus" && this.turn !== "rival" && !this.dunk.on) {
      // Shot for shot means the same shot: Benji stays inside the ring.
      const ox = g.pos.x - this.spot.x;
      const oz = g.pos.z - this.spot.z;
      const od = Math.hypot(ox, oz);
      if (od > 1) {
        g.pos.x = this.spot.x + (ox / od) * 1;
        g.pos.z = this.spot.z + (oz / od) * 1;
      }
    }
    // He faces the rim, except on defence, when he faces the man with the ball.
    const guarding = this.kind === "versus" && this.turn === "rival" && this.rival.card;
    g.heading = guarding ? Math.atan2(this.rival.x - g.pos.x, this.rival.z - g.pos.z) : Math.atan2(h.x - g.pos.x, h.z - g.pos.z);
    g.benji.speed = Math.hypot(g.vel.x, g.vel.z);

    // The shot.
    this.cool -= dt;
    const w = this.window(d);
    g.live.sweetLo = w.lo;
    g.live.sweetHi = w.hi;
    if (!input.down("action")) this.armed = true;
    this.contest.cool -= dt;
    const mine = this.kind !== "versus" || this.turn === "you";
    if (!this.over && !this.dunk.on) {
      // Defence: one jump at his shot. Go on the fake and he shoots over a man coming down.
      if (this.kind === "versus" && this.turn === "rival" && input.hit("action") && this.jump === 0 && this.contest.cool <= 0) {
        this.jump = 0.001;
        this.contest.at = g.time;
        // Up, down and set again takes long enough that a fake cannot be answered twice.
        this.contest.cool = 1.7;
        this.armed = false;
        g.sound.whoosh();
      }
      // Three in a row: at the rim (or anywhere, in a game to eleven) Space is a dunk.
      if (this.streak >= 3 && mine && !this.charging && this.cool <= 0 && this.armed && input.hit("action") && (this.kind === "versus" || d < 4.8)) {
        this.dunk = { on: true, t: 0, fx: g.pos.x, fz: g.pos.z, pts: this.kind === "versus" ? (d > ARC ? 3 : 2) : 3, done: false };
        this.armed = false;
        this.started = true;
        if (this.kind === "versus") this.turn = "air";
        g.sound.whoosh();
      } else if (!this.charging && this.cool <= 0 && this.armed && input.down("action") && mine) {
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

    if (this.dunk.on) this.runDunk(dt);
    if (this.drive.on) this.runDrive(dt);
    else if (this.jump > 0) {
      this.jump += dt;
      const t = this.jump / 0.5;
      // He gets up higher to block a shot than to take one.
      g.benji.lift = t >= 1 ? 0 : Math.sin(t * Math.PI) * (this.kind === "versus" && this.turn !== "you" && g.time - this.contest.at < 0.6 ? 0.62 : 0.34);
      if (t >= 1) this.jump = 0;
    } else g.benji.lift = 0;
    // Arms up through the shot and the follow-through; the stance while the other player shoots.
    // The dunk has its own drawing in some fits: three running steps, then up with one arm.
    const dunking = this.dunk.on ? (!g.benji.has("dunk") ? "shoot" : this.dunk.t >= 0.3 ? "dunk" : null) : undefined;
    // The bucket that won it: fist up until the card comes.
    const won = this.kind === "versus" && this.turn === "next" && this.score >= TO && this.score > this.rival.score;
    g.benji.pose = dunking !== undefined ? dunking : won ? "cheer" : this.charging || this.jump > 0 ? "shoot" : this.kind === "versus" && this.turn === "rival" && g.benji.speed < 0.5 ? "ready" : g.benji.speed > 0.8 ? "drive" : null;

    // Ball in hand: dribbled low, lifted to the forehead on the way up.
    const rx = -Math.cos(g.heading);
    const rz = Math.sin(g.heading);
    this.dribble += dt * (6 + g.benji.speed * 0.8);
    const bounce = Math.abs(Math.sin(this.dribble));
    this.hand.visible = (this.cool <= 0 && !this.over && (this.kind !== "versus" || this.turn === "you")) || (this.dunk.on && !this.dunk.done);
    // On fire, the ball looks it.
    const fire = this.streak >= 3;
    this.ballMat.emissiveIntensity = lerp(this.ballMat.emissiveIntensity, fire ? 1.7 : 0.55, damp(6, dt));
    (this.trail.material as THREE.LineBasicMaterial).color.setRGB(fire ? 3.4 : 2.4, fire ? 0.8 : 1.3, fire ? 0.12 : 0.35);
    const r = this.rival;
    const rc = r.card;
    if (rc && rc.visible) {
      const dx = r.tx - r.x;
      const dz = r.tz - r.z;
      const left = Math.hypot(dx, dz);
      const running = left > 0.04;
      if (running) {
        const step = Math.min(left, RIVAL_PACE * dt);
        r.x += (dx / left) * step;
        r.z += (dz / left) * step;
        rc.heading = Math.atan2(dx, dz);
      } else if (this.turn === "you") rc.heading = Math.atan2(g.pos.x - r.x, g.pos.z - r.z);
      else rc.heading = Math.atan2(h.x - r.x, h.z - r.z);
      rc.place(r.x, r.z);
      rc.speed = running ? RIVAL_PACE : 0;
      if (r.jump > 0) {
        r.jump += dt;
        const t = r.jump / 0.5;
        rc.lift = t >= 1 ? 0 : Math.sin(t * Math.PI) * 0.3;
        if (t >= 1) r.jump = 0;
      } else rc.lift = 0;
      // Running to the spot, arms up through his jumper, in a stance while Benji has the ball.
      rc.pose = running ? "drive" : r.jump > 0 || (this.turn === "rival" && r.wait < this.lead) ? "shoot" : this.turn === "you" ? "ready" : null;
      if (this.drive.on && this.drive.t > 0) {
        // Off the floor and up at the rim, one arm high.
        const u = Math.min(1, this.drive.t / DRIVE_AIR);
        rc.lift = Math.sin(u * Math.PI) * Math.max(0.6, h.y - FLOOR - rc.height + 0.1);
        rc.pose = "dunk";
        rc.heading = Math.atan2(h.x - r.x, h.z - 0.4 - r.z);
      }
      rc.update(dt, g.camera.position, g.tint, FLOOR);
    }
    if (this.dunk.on) {
      // Held high in one hand all the way to the rim.
      this.hand.position.set(g.pos.x + fx * 0.22, FLOOR + g.benji.lift + BENJI_HEIGHT + 0.26, g.pos.z + fz * 0.22);
    } else if (this.charging) {
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

  /** The other player's drive: he runs in from the spot, leaves the floor a stride out and puts it through. */
  private runDrive(dt: number) {
    const g = this.g;
    const h = this.hoop;
    const r = this.rival;
    const k = this.drive;
    if (k.t === 0 && Math.hypot(r.tx - r.x, r.tz - r.z) > 1.7) return;
    k.t += dt;
    const u = k.t / DRIVE_AIR;
    if (!k.done && u >= 0.55) {
      k.done = true;
      const ball = this.balls.find((b) => !b.live) ?? this.balls[0]!;
      ball.p.set(h.x, h.y + 0.16, h.z);
      ball.v.set(0, -6.5, 0);
      ball.live = true;
      ball.mesh.visible = true;
      ball.rim = ball.board = ball.scored = ball.judged = false;
      ball.bounces = 0;
      ball.age = 0;
      ball.error = 0;
      ball.who = 1;
      ball.hot = false;
      ball.dunk = true;
      ball.points = 2;
      this.trailBall = null;
      g.sound.rim();
      g.sound.board();
      g.stage.setPunch(0.8);
      g.input.rumble(0.8, 180);
    }
    if (u >= 1) k.on = false;
  }

  /** Three steps and up: he carries it to the rim and puts it through. */
  private runDunk(dt: number) {
    const g = this.g;
    const h = this.hoop;
    const k = this.dunk;
    k.t += dt;
    const u = Math.min(1, k.t / 1);
    const run = Math.min(1, u / 0.78);
    const ease = run * run * (3 - 2 * run);
    g.pos.x = lerp(k.fx, h.x, ease);
    g.pos.z = lerp(k.fz, h.z + 0.62, ease);
    const air = clamp((u - 0.3) / 0.7, 0, 1);
    // High enough that the ball in his hand clears the rim.
    g.benji.lift = Math.sin(air * Math.PI) * Math.max(0.6, h.y - FLOOR - BENJI_HEIGHT + 0.12);
    g.benji.speed = u < 0.35 ? 5 : 0;
    if (!k.done && u >= 0.66) {
      k.done = true;
      const ball = this.balls.find((b) => !b.live) ?? this.balls[0]!;
      ball.p.set(h.x, h.y + 0.16, h.z);
      ball.v.set(0, -6.5, 0);
      ball.live = true;
      ball.mesh.visible = true;
      ball.rim = ball.board = ball.scored = ball.judged = false;
      ball.bounces = 0;
      ball.age = 0;
      ball.error = 0;
      ball.who = 0;
      ball.hot = false;
      ball.dunk = true;
      ball.points = k.pts;
      this.trailBall = null;
      this.shots++;
      g.sound.rim();
      g.sound.board();
      g.stage.setPunch(1);
      g.input.rumble(1, 220);
      g.moment(1);
    }
    if (u >= 1) {
      k.on = false;
      g.benji.lift = 0;
      g.pos.z = h.z + 1.5;
      this.cool = 0.5;
    }
  }

  private versus(dt: number) {
    const g = this.g;
    const r = this.rival;
    if (this.turn === "rival") {
      // The clock on his shot starts when he has got to the spot.
      if (Math.hypot(r.tx - r.x, r.tz - r.z) < 0.05) r.wait -= dt;
      if (this.fake && r.wait <= 0.16) {
        // Up, and down again. He goes for real a beat later.
        this.fake = false;
        r.wait = 0.95 + Math.random() * 0.5;
        if (g.time - this.contest.at < 0.6) {
          this.bit = true;
          this.say("PUMP FAKE! He got you in the air", 1.2);
        }
      }
      if (r.wait <= 0) this.rivalShot();
    } else if (this.turn === "you" && !this.charging) {
      this.shotClock -= dt;
      if (this.shotClock <= 0) {
        this.say("Shot clock. No bucket.", 1.4);
        this.streak = 0;
        this.turn = "next";
        this.pause = 1.1;
      }
    } else if (this.turn === "next") {
      this.pause -= dt;
      if (this.pause > 0) return;
      if ((this.score >= TO || r.score >= TO) && this.score !== r.score) {
        this.over = true;
        this.finishVersus();
      } else this.round();
    }
    void g;
  }

  private finishVersus() {
    const g = this.g;
    const r = this.rival;
    const won = this.score > r.score;
    const beaten = g.save.best.versus ?? 0;
    if (won) g.save.best.versus = Math.max(beaten, r.tier + 1);
    const k = g.wearing("fresh_black") ? 1.15 : 1;
    const got = won ? g.earn(Math.round((80 + r.tier * 45) * k), 6 + r.tier * 3) : g.earn(10, 1);
    if (won) g.sound.cheer();
    if (won) g.award("sackrow_11");
    g.cheer(COURT.cx, COURT.cz, 20, 2.4);
    g.emit("versus", won ? 1 : 0, r.tier);
    this.hand.visible = false;
    const next = RIVALS[Math.min(RIVALS.length - 1, g.save.best.versus ?? 0)]!;
    g.showResults(
      {
        win: won,
        title: won ? "GAME. YOU RAN IT." : `${r.name.toUpperCase()} TOOK IT`,
        sub: won ? (r.tier >= RIVALS.length - 1 ? "Nobody left on this court. It's yours." : `${next.name} wants next.`) : "Shot for shot, he had one more. Run it back.",
        rows: [
          ["Final", `${this.score} - ${r.score}`],
          ["Against", r.name],
          ["Shooting", `${this.made} of ${this.shots}`],
          ["Court wins", `${g.save.best.versus ?? 0} of ${RIVALS.length}`],
        ],
        pay: got.dollars,
        respect: got.respect,
        tickets: 0,
        record: won && r.tier + 1 > beaten,
        again: won ? "Who's next" : "Run it back",
      },
      () => this.start("versus"),
      () => this.leave(),
    );
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const h = this.hoop;
    // In a game to eleven the lens stays on the spot both players shoot from.
    const px = this.kind === "versus" ? this.spot.x : g.pos.x;
    const pz = this.kind === "versus" ? this.spot.z : g.pos.z;
    const tx = px - h.x;
    const tz = pz - h.z;
    const d = Math.hypot(tx, tz) || 1;
    const ux = tx / d;
    const uz = tz / d;
    // Low behind the shooter's shoulder, looking up at the rim, and never outside the fence.
    this.cam.set(px + ux * 5.1 - uz * 1.25, FLOOR + 1.4 + d * 0.03, pz + uz * 5.1 + ux * 1.25);
    this.cam.x = clamp(this.cam.x, COURT.cx - COURT.halfW - 1.1, COURT.cx + COURT.halfW + 1.1);
    this.cam.z = Math.min(this.cam.z, COURT.cz + COURT.halfL + 1.1);
    this.look.set(lerp(px, h.x, 0.6), FLOOR + 2.05, lerp(pz, h.z, 0.6));
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
    const got = g.earn(Math.round(this.score * 4 * (g.wearing("fresh_black") ? 1.15 : 1)), Math.floor(this.score / 3));
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
    if (this.rival.card) this.rival.card.visible = false;
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
      range: this.streak >= 3 && (this.kind === "versus" || d < 4.8) ? "DUNK IT" : `${d > ARC ? "3 PT" : "2 PT"}${onSpot && this.kind === "shootout" ? "  HOT SPOT +1" : ""}${this.streak >= 3 ? "  FIRE" : ""}`,
      kind: this.kind,
      rival: this.kind === "versus" ? { name: this.rival.name, score: this.rival.score, to: TO, yours: this.turn === "you", clock: Math.max(0, Math.ceil(this.shotClock)) } : null,
    };
  }
}
