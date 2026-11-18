import * as THREE from "three";
import { Card, type CardArt } from "../actors/card";
import type { Hoop } from "../core/types";
import { basketballTex } from "../gfx/tex";
import { standHeight } from "../world/ground";

const BALL_R = 0.12;
const G = 9.8;
/** How far off a court is still worth running: past this its game is hidden and stands still. */
const NEAR = 95;
/** Pace of a player going to a spot, m/s. */
const PACE = 4.4;

type Player = {
  card: Card;
  team: 0 | 1;
  x: number;
  z: number;
  tx: number;
  tz: number;
  jump: number;
};

type Phase = "check" | "move" | "shoot" | "air" | "loose";

export type PickupCourt = {
  shape: { cx: number; cz: number; halfW: number; halfL: number };
  hoops: Hoop[];
  nets: THREE.Mesh[];
};

/**
 * A pickup game already going on a court when Benji walks up: one-on-one or two-on-two at the
 * north basket. Whoever has it dribbles to a spot, rises up and lets it go; the ball arcs at the
 * rim and drops through the net or comes off it, and they all go after the rebound. After a make
 * the other side checks it at the top of the key. Nobody here is scripted to win.
 */
export class Pickup {
  readonly group = new THREE.Group();
  private players: Player[] = [];
  private hoop: Hoop;
  private net: THREE.Mesh | null;
  private ball: THREE.Mesh;
  private bv = new THREE.Vector3();
  private phase: Phase = "check";
  private t = 0;
  private holder = 0;
  private make = false;
  private through = 0;
  private swish = 0;
  private bounces = 0;
  private rand: () => number;
  /** Set while Benji is playing on this court: the regulars step off and wait. */
  benched = false;

  constructor(
    private court: PickupCourt,
    arts: { art: CardArt; height: number }[],
    seed: number,
  ) {
    let s = seed;
    this.rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const north = court.hoops.reduce((a, b) => (b.z < a.z ? b : a));
    this.hoop = north;
    this.net = court.nets[court.hoops.indexOf(north)] ?? null;
    arts.forEach(({ art, height }, i) => {
      const card = new Card(art, height);
      const p: Player = { card, team: (i % 2) as 0 | 1, x: 0, z: 0, tx: 0, tz: 0, jump: 0 };
      this.spotFor(p, 2.5 + i * 1.2, (i % 2 ? 1 : -1) * (0.3 + i * 0.3));
      p.x = p.tx;
      p.z = p.tz;
      card.place(p.x, p.z);
      this.group.add(card.group);
      this.players.push(p);
    });
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 16, 12),
      new THREE.MeshStandardMaterial({
        map: basketballTex(),
        roughness: 0.75,
        emissive: 0x8a3a12,
        emissiveIntensity: 0.45,
      }),
    );
    this.ball.castShadow = true;
    this.group.add(this.ball);
    this.holder = Math.floor(this.rand() * this.players.length);
    this.check();
  }

  /** A spot `d` metres out from the rim, `a` radians off the line down the middle of the court. */
  private spotFor(p: Player, d: number, a: number) {
    const h = this.hoop;
    const c = this.court.shape;
    p.tx = THREE.MathUtils.clamp(h.x + Math.sin(a) * d, c.cx - c.halfW + 0.7, c.cx + c.halfW - 0.7);
    p.tz = h.z - h.dir * Math.cos(a) * d;
  }

  private check() {
    this.phase = "check";
    this.t = 0;
    const p = this.players[this.holder]!;
    // Back out to the top of the key with it; the rest find somewhere to be.
    this.spotFor(p, 6.8, (this.rand() - 0.5) * 0.4);
    for (const q of this.players) if (q !== p) this.cover(q, p);
  }

  /** On defence, between his man and the basket; on offence, somewhere open on the wing. */
  private cover(q: Player, ball: Player) {
    if (q.team !== ball.team) {
      const h = this.hoop;
      const dx = h.x - ball.tx;
      const dz = h.z - ball.tz;
      const d = Math.hypot(dx, dz) || 1;
      q.tx = ball.tx + (dx / d) * 1.3 + (this.rand() - 0.5) * 0.4;
      q.tz = ball.tz + (dz / d) * 1.3 + (this.rand() - 0.5) * 0.4;
    } else
      this.spotFor(
        q,
        3 + this.rand() * 3.5,
        (this.rand() < 0.5 ? -1 : 1) * (0.7 + this.rand() * 0.6),
      );
  }

  private shoot() {
    const p = this.players[this.holder]!;
    const h = this.hoop;
    const d = Math.hypot(h.x - p.x, h.z - p.z);
    // Close in, he usually gets it; from deep, about one in three.
    this.make = this.rand() < 0.68 - d * 0.045;
    const flight = 0.75 + d * 0.06;
    const from = this.ball.position;
    // Long and to one side when it misses: off the back of the rim and out.
    const miss = this.make ? 0 : 0.28 + this.rand() * 0.12;
    const side = this.rand() < 0.5 ? -1 : 1;
    const tx = h.x + side * miss * 0.6;
    const tz = h.z + h.dir * miss;
    const ty = h.y + (this.make ? 0.02 : 0.06);
    this.bv.set(
      (tx - from.x) / flight,
      (ty - from.y + 0.5 * G * flight * flight) / flight,
      (tz - from.z) / flight,
    );
    this.phase = "air";
    this.t = 0;
    this.through = flight;
    this.bounces = 0;
  }

  update(dt: number, time: number, eye: THREE.Vector3, tint: THREE.Color) {
    const c = this.court.shape;
    const near = !this.benched && Math.hypot(eye.x - c.cx, eye.z - c.cz) < NEAR;
    this.group.visible = near;
    if (!near) return;
    this.t += dt;
    const h = this.hoop;
    const p = this.players[this.holder]!;
    const ballFloor = standHeight(this.ball.position.x, this.ball.position.z) + BALL_R;

    if (this.phase === "check" || this.phase === "move") {
      const there = Math.hypot(p.tx - p.x, p.tz - p.z) < 0.2;
      if (this.phase === "check" && there && this.t > 1.2) {
        // Checked: go. A drive to a spot of his own, everyone else moving with it.
        this.phase = "move";
        this.t = 0;
        const deep = this.rand();
        this.spotFor(
          p,
          deep < 0.3 ? 1.6 + this.rand() : 3 + this.rand() * 4.2,
          (this.rand() - 0.5) * 2.6,
        );
        for (const q of this.players) if (q !== p) this.cover(q, p);
      } else if (this.phase === "move" && there && this.t > 0.3) {
        this.phase = "shoot";
        this.t = 0;
        p.jump = 0.001;
      }
    }
    if (this.phase === "shoot" && this.t > 0.32) this.shoot();

    // The ball: in his hands, in the air, or loose on the floor.
    const b = this.ball.position;
    if (this.phase === "check" || this.phase === "move" || this.phase === "shoot") {
      const f = Math.atan2(h.x - p.x, h.z - p.z);
      const up = this.phase === "shoot";
      const moving = Math.hypot(p.tx - p.x, p.tz - p.z) > 0.2;
      const dribble = moving || this.phase === "check" ? Math.abs(Math.sin(time * 7.5)) : 0.85;
      b.set(
        p.x + Math.sin(f) * 0.3 + Math.cos(f) * 0.18,
        up
          ? standHeight(p.x, p.z) + p.card.height + 0.25 + p.card.lift
          : standHeight(p.x, p.z) + BALL_R + dribble * 0.85,
        p.z + Math.cos(f) * 0.3 - Math.sin(f) * 0.18,
      );
    } else if (this.phase === "air") {
      this.bv.y -= G * dt;
      b.addScaledVector(this.bv, dt);
      if (this.t >= this.through) {
        if (this.make) {
          // Through the net: straight down out of the bottom of it.
          b.set(h.x, h.y - 0.05, h.z);
          this.bv.set((this.rand() - 0.5) * 0.6, -1.5, -h.dir * 0.8);
          this.swish = 0.5;
        } else {
          // Off the iron: up and out, away from the board.
          this.bv.set(
            (b.x - h.x) * 5 + (this.rand() - 0.5) * 1.5,
            2.6 + this.rand() * 1.5,
            -h.dir * (2.2 + this.rand() * 2.2),
          );
        }
        this.phase = "loose";
        this.t = 0;
        // Everybody crashes the glass: where it is going to come down.
        const land = { x: b.x + this.bv.x * 0.9, z: b.z + this.bv.z * 0.9 };
        for (const q of this.players) {
          q.tx = land.x + (this.rand() - 0.5) * 2.2;
          q.tz = land.z + (this.rand() - 0.5) * 2.2;
        }
      }
    } else if (this.phase === "loose") {
      this.bv.y -= G * dt;
      b.addScaledVector(this.bv, dt);
      if (b.y < ballFloor) {
        b.y = ballFloor;
        this.bv.y = Math.abs(this.bv.y) * 0.55;
        this.bv.x *= 0.8;
        this.bv.z *= 0.8;
        this.bounces++;
      }
      b.x = THREE.MathUtils.clamp(b.x, c.cx - c.halfW - 1, c.cx + c.halfW + 1);
      b.z = THREE.MathUtils.clamp(b.z, c.cz - c.halfL - 1, c.cz + c.halfL + 1);
      // Whoever gets to it first has it. After a make it goes to the other side.
      if (this.t > 0.45) {
        let best = -1;
        let bd = 1e9;
        this.players.forEach((q, i) => {
          if (this.make && this.players.length > 1 && q.team === p.team) return;
          q.tx = b.x;
          q.tz = b.z;
          const d = Math.hypot(q.x - b.x, q.z - b.z);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        if (best >= 0 && (bd < 0.7 || this.t > 3) && (b.y < 1.6 || this.t > 3)) {
          this.holder = best;
          this.check();
        }
      }
    }

    // The net kicks when it goes through.
    if (this.net) {
      this.swish = Math.max(0, this.swish - dt);
      const k = this.swish > 0 ? Math.sin((0.5 - this.swish) * 22) * this.swish * 0.5 : 0;
      this.net.scale.set(1 - k * 0.4, 1 + k, 1 - k * 0.4);
    }

    // The players: running to their spots, in a stance on the ball, up for the jumper.
    const holder = this.players[this.holder]!;
    for (const q of this.players) {
      const dx = q.tx - q.x;
      const dz = q.tz - q.z;
      const d = Math.hypot(dx, dz);
      const run = d > 0.2;
      const step = Math.min(d, PACE * dt);
      if (run) {
        q.x += (dx / d) * step;
        q.z += (dz / d) * step;
      }
      const card = q.card;
      card.place(q.x, q.z);
      card.speed = run ? PACE : 0;
      if (q.jump > 0) {
        q.jump += dt;
        const u = q.jump / 0.6;
        card.lift = u >= 1 ? 0 : Math.sin(u * Math.PI) * 0.45;
        if (u >= 1) q.jump = 0;
      } else card.lift = 0;
      const guarding =
        q.team !== holder.team &&
        this.players.length > 1 &&
        Math.hypot(q.x - holder.x, q.z - holder.z) < 2.4;
      card.heading = run
        ? Math.atan2(dx, dz)
        : guarding
          ? Math.atan2(holder.x - q.x, holder.z - q.z)
          : Math.atan2(h.x - q.x, h.z - q.z);
      card.pose = run
        ? "drive"
        : q === holder && (this.phase === "shoot" || q.jump > 0)
          ? "shoot"
          : guarding && this.phase !== "air" && this.phase !== "loose"
            ? "ready"
            : null;
      if (card.pose && !card.has(card.pose)) card.pose = null;
      card.update(dt, eye, tint);
    }
  }
}
