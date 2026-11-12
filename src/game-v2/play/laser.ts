import * as THREE from "three";
import { Card } from "../actors/card";
import { PEDS } from "../assets/cast";
import type { HudState } from "../core/types";
import { damp, dampAngle, wrapAngle } from "../core/util";
import type { Activity, Game } from "../game";
import { pushOut, sight } from "../world/collide";
import { ROOM } from "../world/map";
import { makeBlaster } from "./fun";

/** Hits a vest takes before its wearer sits out. */
const VEST = 3;
const LENGTH = 120;
/** Hits a base takes before it pays out and goes dark. */
const BASE_HP = 3;

type Team = 0 | 1;
type Tagger = {
  card: Card;
  lamp: THREE.Mesh;
  gun: THREE.Group;
  team: Team;
  x: number;
  z: number;
  tx: number;
  tz: number;
  stun: number;
  aim: number;
  cool: number;
  stuck: number;
  /** Who they are lining up on: another tagger, Benji, or a base. */
  at: Tagger | "benji" | "base" | null;
};
type Base = { x: number; z: number; hp: number; dark: number; core: THREE.Mesh; ring: THREE.Mesh };
type PowerKind = "rapid" | "shield" | "double";
type Power = { mesh: THREE.Mesh; kind: PowerKind; x: number; z: number; wait: number };
type Beam = { mesh: THREE.Mesh; left: number };

const POWER: Record<PowerKind, { name: string; color: [number, number, number]; seconds: number }> = {
  rapid: { name: "RAPID FIRE", color: [3, 2.4, 0.3], seconds: 9 },
  shield: { name: "SHIELD", color: [0.3, 2.4, 3], seconds: 7 },
  double: { name: "DOUBLE POINTS", color: [3, 0.6, 2.6], seconds: 12 },
};

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

/**
 * Laser tag, green against pink. Benji and two from the neighbourhood hold the green base;
 * four pinks hold theirs. Tags score, a base that takes three hits pays big and goes dark for a
 * while, and power-ups drop on the floor. Two minutes; the team with more on the board wins.
 */
export class LaserTag implements Activity {
  hints: [string, string][] = [
    ["W A S D", "Move and turn"],
    ["Space", "Fire"],
    ["Shift", "Run"],
    ["Q", "Leave the arena"],
  ];
  private bots: Tagger[] = [];
  private bases: [Base, Base];
  private powers: Power[] = [];
  private gun = makeBlaster(new THREE.Color(0.4, 3, 0.3));
  private vest = VEST;
  private down = 0;
  private beams: Beam[] = [];
  private group = new THREE.Group();
  private phase: "count" | "go" | "over" = "count";
  private count = 3;
  private clock = 0;
  private left = LENGTH;
  /** Benji's own points, and each side's total. */
  private score = 0;
  private team: [number, number] = [0, 0];
  private tags = 0;
  private baseHits = 0;
  private combo = 0;
  private comboLeft = 0;
  private cool = 0;
  private shield = 0;
  private rapid = 0;
  private double = 0;
  private gotHit = 0;
  private call = "";
  private callLeft = 0;
  private leaving = false;
  private mats: [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial];

  constructor(private g: Game) {
    const room = g.rooms.laser;
    const C = ROOM.laser;
    const glow = (r: number, gr: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, gr, b), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mats = [glow(0.4, 3, 0.3), glow(3, 0.4, 2.2)];
    this.group.add(this.gun);
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(geo, this.mats[0]);
      mesh.visible = false;
      this.group.add(mesh);
      this.beams.push({ mesh, left: 0 });
    }
    // Two with Benji, four against.
    const sides: Team[] = [0, 0, 1, 1, 1, 1];
    sides.forEach((team, i) => {
      const kind = PEDS[(i * 3 + (team ? 1 : 0)) % PEDS.length]!;
      const card = new Card(kind.art, kind.height);
      const tint = team ? new THREE.Color(3, 0.4, 2.2) : new THREE.Color(0.4, 3, 0.3);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: tint.clone(), toneMapped: false }));
      lamp.position.y = kind.height + 0.22;
      card.group.add(lamp);
      this.group.add(card.group);
      const gun = makeBlaster(tint);
      this.group.add(gun);
      this.bots.push({ card, lamp, gun, team, x: 0, z: 0, tx: 0, tz: 0, stun: 0, aim: 0, cool: 1, stuck: 0, at: null });
    });
    // A pylon in each team's corner.
    const base = (x: number, z: number, team: Team): Base => {
      const c = team ? [3, 0.4, 2.2] : [0.4, 3, 0.3];
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 1.7, 10), new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.4, metalness: 0.5 }));
      post.position.set(x, 0.85, z);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0]!, c[1]!, c[2]!), toneMapped: false }));
      core.position.set(x, 2.05, z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0]!, c[1]!, c[2]!), toneMapped: false }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.06, z);
      this.group.add(post, core, ring);
      return { x, z, hp: BASE_HP, dark: 0, core, ring };
    };
    this.bases = [base(C.x - 14.6, C.z + 9.7, 0), base(C.x + 14.6, C.z - 9.7, 1)];
    const gem = new THREE.OctahedronGeometry(0.3);
    for (const kind of ["rapid", "shield"] as PowerKind[]) {
      const mesh = new THREE.Mesh(gem, new THREE.MeshBasicMaterial({ color: new THREE.Color(...POWER[kind].color), toneMapped: false }));
      mesh.visible = false;
      this.group.add(mesh);
      this.powers.push({ mesh, kind, x: 0, z: 0, wait: 3 });
    }
    room.group.add(this.group);
  }

  start() {
    const g = this.g;
    const room = g.rooms.laser;
    const C = ROOM.laser;
    this.leaving = false;
    g.pos.x = room.start.x;
    g.pos.z = room.start.z;
    g.heading = room.start.heading;
    g.camYaw = room.start.heading;
    g.vel.x = g.vel.z = 0;
    const greens = [
      { x: C.x - 9, z: C.z + 9 },
      { x: C.x - 13.5, z: C.z + 5.5 },
    ];
    let gi = 0;
    let pi = 0;
    for (const b of this.bots) {
      const p = b.team ? room.bots[pi++ % room.bots.length]! : greens[gi++]!;
      b.x = b.tx = p.x;
      b.z = b.tz = p.z;
      b.stun = 0;
      b.aim = 0;
      b.at = null;
      b.cool = 1.5 + Math.random() * 1.5;
      b.stuck = 0;
    }
    for (const base of this.bases) {
      base.hp = BASE_HP;
      base.dark = 0;
    }
    this.powers.forEach((p, i) => {
      p.wait = 4 + i * 5;
      p.mesh.visible = false;
    });
    this.phase = "count";
    this.count = 3;
    this.clock = 0;
    this.left = LENGTH;
    this.score = this.tags = this.combo = this.baseHits = 0;
    this.team = [0, 0];
    this.vest = VEST;
    this.down = 0;
    this.shield = this.rapid = this.double = 0;
    this.say("Green against pink. Hit their base for the big points.", 3.2);
    g.sound.countdown();
    g.chase(0, true);
  }

  private say(text: string, seconds = 1.6) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  private beam(ax: number, az: number, bx: number, bz: number, team: Team, by = 1.12) {
    const b = this.beams.find((k) => k.left <= 0) ?? this.beams[0]!;
    _a.set(ax, 1.08, az);
    _b.set(bx, by, bz);
    const len = _a.distanceTo(_b);
    b.mesh.material = this.mats[team];
    b.mesh.position.copy(_a).lerp(_b, 0.5);
    b.mesh.scale.set(1, len, 1);
    b.mesh.quaternion.setFromUnitVectors(_y, _b.sub(_a).normalize());
    b.mesh.visible = true;
    b.left = 0.2;
  }

  /** 1 to 5: the arena heats up as the clock runs. */
  private level() {
    return Math.min(5, 1 + Math.floor((LENGTH - this.left) / 24));
  }

  /** A base took a hit from `team`. Returns the points it paid, if that was the third. */
  private hitBase(base: Base, team: Team) {
    base.hp--;
    if (base.hp > 0) return 0;
    base.hp = BASE_HP;
    base.dark = 14;
    // Green is the away side at the pink base, so it pays them a little more.
    const pay = team ? 300 : 400;
    this.team[team] += pay;
    return pay;
  }

  private fire() {
    const g = this.g;
    const room = g.rooms.laser;
    this.cool = this.rapid > 0 ? 0.15 : 0.36;
    g.sound.release();
    // Aim where the camera looks, with a little help toward anyone close to the line.
    let best: Tagger | null = null;
    let bestErr = 0.3;
    for (const b of this.bots) {
      if (b.team === 0 || b.stun > 0) continue;
      const err = Math.abs(wrapAngle(Math.atan2(b.x - g.pos.x, b.z - g.pos.z) - g.camYaw));
      if (err < bestErr && sight(g.pos.x, g.pos.z, b.x, b.z, room.solids, 0.05) >= 1) {
        best = b;
        bestErr = err;
      }
    }
    const mx = this.gun.position.x + Math.sin(this.gun.rotation.y) * 0.5;
    const mz = this.gun.position.z + Math.cos(this.gun.rotation.y) * 0.5;
    const mult = this.double > 0 ? 2 : 1;
    const theirs = this.bases[1];
    if (best) {
      this.beam(mx, mz, best.x, best.z, 0);
      best.stun = Math.max(1.8, 3.2 - this.level() * 0.3);
      best.aim = 0;
      best.at = null;
      this.tags++;
      this.combo = this.comboLeft > 0 ? this.combo + 1 : 1;
      this.comboLeft = 4;
      const pts = Math.round((100 + (this.combo - 1) * 25) * mult);
      this.score += pts;
      this.team[0] += pts;
      g.sound.swish();
      this.say(this.combo > 1 ? `TAG x${this.combo}  +${pts}` : `TAG  +${pts}`, 1.1);
      g.heading = Math.atan2(best.x - g.pos.x, best.z - g.pos.z);
      return;
    }
    const toBase = Math.atan2(theirs.x - g.pos.x, theirs.z - g.pos.z);
    if (theirs.dark <= 0 && Math.abs(wrapAngle(toBase - g.camYaw)) < 0.24 && Math.hypot(theirs.x - g.pos.x, theirs.z - g.pos.z) < 20 && sight(g.pos.x, g.pos.z, theirs.x, theirs.z, room.solids, 0.05) >= 1) {
      this.beam(mx, mz, theirs.x, theirs.z, 0, 2.05);
      const left = theirs.hp - 1;
      const paid = this.hitBase(theirs, 0);
      g.heading = toBase;
      if (paid) {
        const pts = paid * mult;
        this.score += pts;
        this.team[0] += pts - paid;
        this.baseHits++;
        g.sound.cash();
        g.sound.cheer();
        g.stage.setPunch(0.7);
        g.input.rumble(0.8, 260);
        this.say(`THEIR BASE IS DOWN  +${pts}`, 2.2);
      } else {
        g.sound.rim();
        this.say(`BASE HIT  ${BASE_HP - left} of ${BASE_HP}`, 0.9);
      }
      return;
    }
    const fx = Math.sin(g.camYaw);
    const fz = Math.cos(g.camYaw);
    const t = sight(g.pos.x, g.pos.z, g.pos.x + fx * 30, g.pos.z + fz * 30, room.solids, 0.05);
    this.beam(mx, mz, g.pos.x + fx * 30 * t, g.pos.z + fz * 30 * t, 0);
    g.heading = g.camYaw;
  }

  private dropPower(p: Power) {
    const g = this.g;
    const nodes = g.rooms.laser.nodes.filter((n) => Math.hypot(n.x - g.pos.x, n.z - g.pos.z) > 5 && !this.powers.some((q) => q !== p && q.mesh.visible && Math.hypot(q.x - n.x, q.z - n.z) < 2));
    const n = nodes[Math.floor(Math.random() * nodes.length)];
    if (!n) return;
    const kinds: PowerKind[] = ["rapid", "shield", "double"];
    p.kind = kinds[Math.floor(Math.random() * kinds.length)]!;
    (p.mesh.material as THREE.MeshBasicMaterial).color.setRGB(...POWER[p.kind].color);
    p.x = n.x;
    p.z = n.z;
    p.mesh.visible = true;
  }

  update(dt: number) {
    const g = this.g;
    const room = g.rooms.laser;
    const input = g.input;
    this.clock += dt;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    for (const b of this.beams) {
      if (b.left > 0) {
        b.left -= dt;
        if (b.left <= 0) b.mesh.visible = false;
      }
    }
    if (this.phase === "count" && this.clock >= 1) {
      this.clock -= 1;
      this.count--;
      if (this.count <= 0) {
        this.phase = "go";
        g.sound.countdown(true);
      } else g.sound.countdown();
      g.push();
    }

    // Benji.
    if (this.down > 0) {
      this.down -= dt;
      if (this.down <= 0) {
        // Back in at the base with a fresh vest and a moment of cover.
        g.pos.x = room.start.x;
        g.pos.z = room.start.z;
        this.vest = VEST;
        this.shield = 2.2;
        this.say("BACK IN", 1);
      }
    }
    const live = this.phase === "go" && this.down <= 0;
    const m = live ? input.move() : { x: 0, y: 0 };
    const look = input.takeLook();
    g.camYaw = wrapAngle(g.camYaw - look - m.x * 1.9 * dt);
    const top = input.down("run") ? 6.2 : 4;
    const fx = Math.sin(g.camYaw);
    const fz = Math.cos(g.camYaw);
    const k = damp(12, dt);
    g.vel.x += ((fx * m.y - fz * m.x * 0.6) * top - g.vel.x) * k;
    g.vel.z += ((fz * m.y + fx * m.x * 0.6) * top - g.vel.z) * k;
    g.pos.x += g.vel.x * dt;
    g.pos.z += g.vel.z * dt;
    pushOut(g.pos, 0.36, room.solids);
    const speed = Math.hypot(g.vel.x, g.vel.z);
    if (speed > 0.5) g.heading = dampAngle(g.heading, Math.atan2(g.vel.x, g.vel.z), damp(12, dt));
    g.benji.speed = speed;
    this.cool -= dt;
    this.shield -= dt;
    this.gotHit -= dt;
    this.comboLeft -= dt;
    const hadPower = this.rapid > 0 || this.double > 0;
    this.rapid -= dt;
    this.double -= dt;
    if (hadPower && this.rapid <= 0 && this.double <= 0) g.push();
    // The blaster rides at Benji's hip and points where he is looking.
    this.gun.visible = this.down <= 0;
    this.gun.position.set(g.pos.x + Math.sin(g.camYaw) * 0.3 - Math.cos(g.camYaw) * 0.3, 1.02 + (this.cool > 0.26 ? 0.04 : 0), g.pos.z + Math.cos(g.camYaw) * 0.3 + Math.sin(g.camYaw) * 0.3);
    this.gun.rotation.y = g.camYaw;
    if (live && this.cool <= 0 && input.down("action")) this.fire();
    const lv = this.level();

    // Power-ups: they turn on the floor until someone green walks over one.
    for (const p of this.powers) {
      if (!p.mesh.visible) {
        if (this.phase === "go") {
          p.wait -= dt;
          if (p.wait <= 0) this.dropPower(p);
        }
        continue;
      }
      p.mesh.position.set(p.x, 1 + Math.sin(g.time * 3 + p.x) * 0.12, p.z);
      p.mesh.rotation.y += dt * 2.4;
      if (live && Math.hypot(p.x - g.pos.x, p.z - g.pos.z) < 1.05) {
        p.mesh.visible = false;
        p.wait = 11;
        const def = POWER[p.kind];
        if (p.kind === "rapid") this.rapid = def.seconds;
        else if (p.kind === "shield") this.shield = def.seconds;
        else this.double = def.seconds;
        g.sound.cash();
        this.say(def.name, 1.4);
      }
    }

    // Bases: a dark one is recharging and cannot be hit.
    this.bases.forEach((b, team) => {
      if (b.dark > 0) {
        b.dark -= dt;
        if (b.dark <= 0 && team === 0) this.say("OUR BASE IS BACK UP", 1.2);
      }
      const on = b.dark <= 0;
      const pulse = on ? 0.75 + Math.sin(g.time * 4 + team) * 0.25 : 0.08;
      const c = team ? [3, 0.4, 2.2] : [0.4, 3, 0.3];
      (b.core.material as THREE.MeshBasicMaterial).color.setRGB(c[0]! * pulse, c[1]! * pulse, c[2]! * pulse);
      (b.ring.material as THREE.MeshBasicMaterial).color.setRGB(c[0]! * pulse * 0.6, c[1]! * pulse * 0.6, c[2]! * pulse * 0.6);
      b.core.rotation.y += dt * (on ? 1.6 : 0.2);
      b.core.scale.setScalar(on ? 0.7 + (b.hp / BASE_HP) * 0.3 : 0.5);
    });

    // Everyone else.
    const benjiUp = live && this.shield <= 0;
    for (const b of this.bots) {
      b.card.visible = true;
      const stunned = b.stun > 0;
      b.stun -= dt;
      const c = b.team ? [3, 0.4, 2.2] : [0.4, 3, 0.3];
      const flash = b.aim > 0 && Math.sin(g.time * 40) > 0;
      (b.lamp.material as THREE.MeshBasicMaterial).color.setRGB(stunned ? 0.15 : flash ? 3 : c[0]!, stunned ? 0.15 : flash ? 3 : c[1]!, stunned ? 0.2 : flash ? 3 : c[2]!);
      const dx = b.tx - b.x;
      const dz = b.tz - b.z;
      const dist = Math.hypot(dx, dz);
      const enemyBase = this.bases[b.team ? 0 : 1];
      b.gun.visible = !stunned;
      b.gun.position.set(b.x + Math.sin(b.card.heading) * 0.3 + Math.cos(b.card.heading) * 0.28, 1.02, b.z + Math.cos(b.card.heading) * 0.3 - Math.sin(b.card.heading) * 0.28);
      b.gun.rotation.y = b.card.heading;

      // Who can they see? The nearest one on the other side.
      let seen: Tagger | "benji" | "base" | null = null;
      if (this.phase === "go" && !stunned) {
        let near = 15 + lv;
        if (b.team === 1 && benjiUp) {
          const d = Math.hypot(g.pos.x - b.x, g.pos.z - b.z);
          if (d < near && sight(b.x, b.z, g.pos.x, g.pos.z, room.solids, 0.05) >= 1) {
            near = d;
            seen = "benji";
          }
        }
        for (const o of this.bots) {
          if (o.team === b.team || o.stun > 0) continue;
          const d = Math.hypot(o.x - b.x, o.z - b.z);
          if (d < near && sight(b.x, b.z, o.x, o.z, room.solids, 0.05) >= 1) {
            near = d;
            seen = o;
          }
        }
        // Nobody about and their base in the open: go for it. Pinks only once the arena has warmed up.
        if (!seen && enemyBase.dark <= 0 && (b.team === 0 || lv >= 3) && Math.hypot(enemyBase.x - b.x, enemyBase.z - b.z) < 12 && sight(b.x, b.z, enemyBase.x, enemyBase.z, room.solids, 0.05) >= 1) seen = "base";
      }

      if (dist < 0.5 || b.stuck > 1.2) {
        // Next stop: any node this one can walk straight to.
        const open = room.nodes.filter((nd) => Math.hypot(nd.x - b.x, nd.z - b.z) > 3 && sight(b.x, b.z, nd.x, nd.z, room.solids, 0.45) >= 1);
        const toward = (px: number, pz: number) => [...open].sort((p, q) => Math.hypot(p.x - px, p.z - pz) - Math.hypot(q.x - px, q.z - pz))[0];
        const r = Math.random();
        let pick: { x: number; z: number } | undefined;
        if (b.team === 1) {
          // Pinks hunt Benji harder as it heats up, and some of them make a run on the green base.
          if (live && r < 0.18 + lv * 0.1) pick = toward(g.pos.x, g.pos.z);
          else if (lv >= 3 && r > 0.78) pick = toward(this.bases[0].x, this.bases[0].z);
        } else if (r < 0.4) pick = toward(g.pos.x, g.pos.z);
        else if (r > 0.68) pick = toward(this.bases[1].x, this.bases[1].z);
        pick ??= open[Math.floor(Math.random() * open.length)] ?? room.nodes[Math.floor(Math.random() * room.nodes.length)]!;
        b.tx = pick.x;
        b.tz = pick.z;
        b.stuck = 0;
      }
      let moved = 0;
      if (this.phase === "go" && b.aim <= 0 && dist > 0.01) {
        const v = stunned ? 3.2 : b.team ? 2.4 + lv * 0.34 : 3.1;
        const bx = b.x;
        const bz = b.z;
        b.x += (dx / dist) * v * dt;
        b.z += (dz / dist) * v * dt;
        pushOut(b, 0.36, room.solids);
        moved = Math.hypot(b.x - bx, b.z - bz) / dt;
        b.stuck = moved < v * 0.35 ? b.stuck + dt : 0;
        b.card.heading = Math.atan2(dx, dz);
      }
      b.card.speed = moved;
      b.cool -= dt;
      if (seen && b.aim <= 0 && b.cool <= 0) {
        b.at = seen;
        b.aim = seen === "base" ? (b.team ? 1.6 : 1.15) : b.team ? 0.8 - lv * 0.07 : 0.72;
      }
      if (b.aim > 0 && b.at) {
        const tx = b.at === "benji" ? g.pos.x : b.at === "base" ? enemyBase.x : b.at.x;
        const tz = b.at === "benji" ? g.pos.z : b.at === "base" ? enemyBase.z : b.at.z;
        b.card.heading = Math.atan2(tx - b.x, tz - b.z);
        b.aim -= dt;
        if (b.aim <= 0) {
          b.cool = b.team ? (2.9 + Math.random() * 2) * (1 - lv * 0.08) : 2 + Math.random() * 1.4;
          const clear = !stunned && sight(b.x, b.z, tx, tz, room.solids, 0.05) >= 1;
          const gx = b.gun.position.x + Math.sin(b.card.heading) * 0.5;
          const gz = b.gun.position.z + Math.cos(b.card.heading) * 0.5;
          if (clear && b.at === "base") {
            if (enemyBase.dark <= 0) {
              this.beam(gx, gz, tx, tz, b.team, 2.05);
              const paid = this.hitBase(enemyBase, b.team);
              if (b.team === 1) {
                g.sound.bad();
                this.say(paid ? `THEY TOOK OUR BASE  -  PINK +${paid}` : "THEY ARE ON OUR BASE", paid ? 2 : 1.3);
              } else if (paid) {
                g.sound.cash();
                this.say("GREEN TOOK THEIR BASE  +400", 1.8);
              }
              g.push();
            }
          } else if (clear && b.at === "benji") {
            const hit = this.shield <= 0 && this.down <= 0 && Math.random() < (speed > 3.2 ? 0.28 + lv * 0.03 : 0.6 + lv * 0.05);
            const miss = hit ? 0 : (Math.random() > 0.5 ? 1 : -1) * 0.9;
            this.beam(gx, gz, g.pos.x + miss, g.pos.z + miss, 1);
            g.sound.release();
            if (hit) {
              this.vest--;
              this.gotHit = 0.5;
              this.combo = 0;
              this.team[1] += 75;
              g.sound.bad();
              g.stage.setPunch(0.8);
              g.input.rumble(0.8, 220);
              if (this.vest <= 0) {
                // Vest dark: out for three seconds, and pink gets paid for it.
                this.team[1] += 125;
                this.down = 3;
                this.shield = 3;
                g.vel.x = g.vel.z = 0;
                this.say("VEST DOWN  -  PINK +200", 2);
              } else {
                this.shield = 1.2;
                this.say(`TAGGED   ${this.vest} left on the vest`, 1.3);
              }
            }
          } else if (clear && b.at !== "base" && b.at !== "benji") {
            const o = b.at;
            const hit = o.stun <= 0 && Math.random() < (b.team ? 0.4 : 0.58);
            const miss = hit ? 0 : (Math.random() > 0.5 ? 1 : -1) * 0.8;
            this.beam(gx, gz, o.x + miss, o.z + miss, b.team);
            if (hit) {
              o.stun = 2.6;
              o.aim = 0;
              o.at = null;
              this.team[b.team] += b.team ? 50 : 100;
              g.push();
            }
          }
          b.at = null;
        }
      }
      b.card.place(b.x, b.z);
      b.card.update(dt, g.camera.position, g.tint, room.floorY + 0.03);
    }
    g.benji.mat.opacity = 1;
    g.benji.visible = this.shield <= 0 || Math.sin(g.time * 30) > 0;

    // Radar: everyone, both bases and the power-ups, turned so that up is the way Benji is looking.
    const radar = g.live.radar;
    let n = 0;
    const cs = Math.cos(g.camYaw);
    const sn = Math.sin(g.camYaw);
    const blip = (x: number, z: number, kind: number) => {
      const rx = x - g.pos.x;
      const rz = z - g.pos.z;
      radar[n++] = (-rx * cs + rz * sn) / 20;
      radar[n++] = (rx * sn + rz * cs) / 20;
      radar[n++] = kind;
    };
    for (const b of this.bots) blip(b.x, b.z, b.stun > 0 ? 5 : b.team);
    this.bases.forEach((b, team) => blip(b.x, b.z, b.dark > 0 ? 5 : 2 + team));
    for (const p of this.powers) if (p.mesh.visible) blip(p.x, p.z, 4);
    g.live.radarN = n / 3;

    if (live || (this.phase === "go" && this.down > 0)) {
      const before = Math.ceil(this.left);
      this.left -= dt;
      if (Math.ceil(this.left) !== before) {
        if (this.left <= 5) g.sound.countdown();
        g.push();
      }
      if (this.left <= 0) this.finish();
    }
    if (!this.leaving) g.chase(dt);
  }

  private finish() {
    const g = this.g;
    this.phase = "over";
    g.benji.visible = true;
    g.live.radarN = 0;
    const best = g.save.best.laser ?? 0;
    const record = this.score > best;
    if (record) g.save.best.laser = this.score;
    const won = this.team[0] > this.team[1];
    const tickets = Math.min(60, Math.floor(this.score / 40)) + (won ? 15 : 0);
    const paid = tickets > 0 ? g.winTickets(tickets) : 0;
    if (paid) g.sound.cash();
    if (won) g.moment(2);
    g.showResults(
      {
        win: won,
        title: won ? "GREEN WINS" : this.team[0] === this.team[1] ? "DEAD EVEN" : "PINK TOOK IT",
        sub: won ? (this.baseHits ? "You went and got their base. That's the game." : "Held the floor. Their base pays 400 if you can get to it.") : "Their base is in the far corner: three hits pays 400. Grab the power-ups.",
        rows: [
          ["Green", String(this.team[0])],
          ["Pink", String(this.team[1])],
          ["Your points", String(this.score)],
          ["Tags", String(this.tags)],
          ["Bases taken", String(this.baseHits)],
        ],
        pay: 0,
        respect: 0,
        tickets: paid,
        record,
        again: "Go again",
      },
      () => this.start(),
      () => this.leave(),
    );
  }

  private leave() {
    const g = this.g;
    if (this.leaving) return;
    this.leaving = true;
    g.benji.visible = true;
    g.live.radarN = 0;
    g.transition(() => {
      g.setPlace("fun");
      const door = g.rooms.fun.laserDoor;
      g.pos.x = door.x;
      g.pos.z = door.z + 0.6;
      g.heading = 0;
      g.camYaw = 0;
      g.end("walk");
    });
  }

  quit() {
    this.leave();
  }

  hud(h: HudState) {
    const power = this.rapid > 0 ? "RAPID" : this.double > 0 ? "x2" : this.shield > 1.5 && this.down <= 0 ? "SHIELD" : "";
    h.laser = {
      phase: this.phase,
      count: this.count,
      left: Math.max(0, Math.ceil(this.left)),
      score: this.score,
      tags: this.tags,
      hit: this.gotHit > 0,
      call: this.call,
      vest: Math.max(0, this.vest),
      level: this.level(),
      down: this.down > 0,
      us: this.team[0],
      them: this.team[1],
      power,
    };
  }
}
