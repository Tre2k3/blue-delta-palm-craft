import * as THREE from "three";
import { Card } from "../actors/card";
import { COACH } from "../assets/cast";
import type { HudState } from "../core/types";
import { clamp, damp, lerp } from "../core/util";
import type { Activity, Game } from "../game";
import { CURB } from "../world/map";
import { TENNIS as T, TENNIS_FENCE as F, TENNIS_GATE } from "../world/rec-map";

const Y0 = CURB + 0.02;
const G = 9.2;
const BALL = 0.085;
/** Games to win the match. */
const GAMES = 3;
const REACH = 1.8;
const RIVAL_REACH = 1.5;
const PACE = 6.4;
const POINTS = ["0", "15", "30", "40"];
const RIVAL = { name: "Coach Renee" };
/** The serve meter: in the green is a first serve with pace; over it is long. */
const SWEET: [number, number] = [0.62, 0.86];

type Who = 0 | 1;
const other = (w: Who): Who => (w === 0 ? 1 : 0);

const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();

/**
 * Singles at the Park Avenue Courts against Coach Renee, first to three games, scored the way
 * tennis is. Benji has the near end. Move to the ball and swing as it gets to him; whichever way
 * the stick is held when he swings is where the shot goes. Hold and let go to serve.
 */
export class Tennis implements Activity {
  hints: [string, string][] = [
    ["W A S D", "Move"],
    ["Space", "Swing"],
    ["A D + Space", "Place it"],
    ["Hold Space", "Serve"],
    ["Q", "Walk off"],
  ];
  private ball: THREE.Mesh;
  private ballMat: THREE.MeshStandardMaterial;
  private shadow: THREE.Mesh;
  private mark: THREE.Mesh;
  private rival: Card;
  private p = new THREE.Vector3();
  private v = new THREE.Vector3();
  private live = false;
  /** Bounces since it was last hit. */
  private bounces = 0;
  private last: Who = 0;
  /** A serve that has not come down yet, and which side of the middle line it has to come down on. */
  private serving = false;
  private box = 1;
  private wasServe = false;
  private touched = false;
  private netted = false;
  /** Where the ball in the air will come down, and where it will be a moment after. */
  private land = { x: 0, z: 0 };
  private meet = { x: 0, z: 0 };
  private opp = { x: 0, z: 0 };
  private pts: [number, number] = [0, 0];
  private games: [number, number] = [0, 0];
  private server: Who = 0;
  private faults = 0;
  private phase: "serve" | "rally" | "point" | "over" = "serve";
  private after: (() => void) | null = null;
  private t = 0;
  private power = 0;
  private dir = 1;
  private charging = false;
  private swing = 0;
  /** Which side of each of them the ball was on when they last swung: 1 forehand, -1 backhand. */
  private wing = 1;
  private rivalWing = 1;
  private swingCool = 0;
  private rivalCool = 0;
  /** How far the ball was from her a frame ago: she swings when it is as near as it is going to get. */
  private rivalGap = 99;
  /** Seconds before she has read where Benji's shot is going and sets off after it. */
  private rivalRead = 0;
  private rivalSwing = 0;
  private call = "";
  private callLeft = 0;
  private level = 0;
  private rallies = 0;
  private longest = 0;
  private aces = 0;
  private look = new THREE.Vector3();
  private on = false;

  constructor(private g: Game) {
    this.ballMat = new THREE.MeshStandardMaterial({ color: 0xd8f03a, roughness: 0.6, emissive: 0x8aa010, emissiveIntensity: 0.6 });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL, 14, 10), this.ballMat);
    this.ball.castShadow = true;
    this.ball.visible = false;
    const sg = new THREE.CircleGeometry(0.16, 16);
    sg.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
    this.shadow.renderOrder = 2;
    this.shadow.visible = false;
    const rg = new THREE.RingGeometry(0.32, 0.42, 28);
    rg.rotateX(-Math.PI / 2);
    this.mark = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x39ff14, toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 }));
    this.mark.renderOrder = 3;
    this.mark.visible = false;
    this.rival = new Card(COACH.art, COACH.height);
    this.opp.x = T.cx + T.half - 1;
    this.opp.z = T.cz;
    this.rival.place(this.opp.x, this.opp.z);
    this.rival.heading = -Math.PI / 2;
    g.city.exterior.add(this.ball, this.shadow, this.mark, this.rival.group);
  }

  /** Coach Renee is always out on her end, played or not. */
  idle(dt: number) {
    if (this.on) return;
    this.rival.pose = "tennis";
    this.rival.speed = 0;
    this.rival.heading = -Math.PI / 2;
    this.rival.update(dt, this.g.camera.position, this.g.tint, null);
  }

  start() {
    const g = this.g;
    this.on = true;
    this.level = clamp(g.save.best.tennis ?? 0, 0, 2);
    this.pts = [0, 0];
    this.games = [0, 0];
    this.server = 0;
    this.rallies = this.longest = this.aces = 0;
    g.benji.visible = true;
    this.toServe();
    this.say(`FIRST TO ${GAMES} GAMES  ·  YOUR SERVE`, 2.6);
    this.frame(0, true);
  }

  private say(text: string, seconds = 1.6) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  /** Which side of the middle the server stands on for this point: +1 is toward Park Avenue. */
  private side() {
    const even = (this.pts[0] + this.pts[1]) % 2 === 0;
    return (this.server === 0 ? 1 : -1) * (even ? 1 : -1);
  }

  private toServe() {
    const g = this.g;
    const s = this.side();
    this.phase = "serve";
    this.t = 0;
    this.live = false;
    this.charging = false;
    this.power = 0;
    this.bounces = 0;
    this.box = -s;
    this.mark.visible = false;
    const base = T.half + 0.5;
    // The server out wide of the middle mark, the receiver across from where it is coming.
    g.pos.x = T.cx - base;
    g.pos.z = T.cz + (this.server === 0 ? s * 1.3 : -s * 2.3);
    this.opp.x = T.cx + base;
    this.opp.z = T.cz + (this.server === 1 ? s * 1.3 : -s * 2.3);
    g.push();
  }

  /** Sends the ball from where it is so that it comes down at (tx, tz) after `time` seconds. */
  private launch(tx: number, tz: number, time: number, clear = true) {
    let tt = time;
    for (let i = 0; i < 20; i++) {
      this.v.x = (tx - this.p.x) / tt;
      this.v.z = (tz - this.p.z) / tt;
      this.v.y = (Y0 + BALL - this.p.y) / tt + 0.5 * G * tt;
      if (!clear) break;
      // High enough at the net?
      const tn = (T.cx - this.p.x) / this.v.x;
      if (tn <= 0 || tn >= tt) break;
      if (this.p.y + this.v.y * tn - 0.5 * G * tn * tn > Y0 + T.net + 0.3) break;
      tt += 0.07;
    }
    this.land.x = tx;
    this.land.z = tz;
    // Where it will be at a comfortable height after the bounce.
    this.meet.x = tx + this.v.x * 0.8 * 0.42;
    this.meet.z = tz + this.v.z * 0.8 * 0.42;
    this.live = true;
    this.bounces = 0;
    this.netted = false;
    this.ball.visible = true;
  }

  private serve(who: Who, power: number, steer: number) {
    const g = this.g;
    const from = who === 0 ? g.pos : this.opp;
    this.p.set(from.x + (who === 0 ? 0.3 : -0.3), Y0 + 2.5, from.z);
    const toward = who === 0 ? 1 : -1;
    const long = power > SWEET[1];
    const good = power >= SWEET[0] && !long;
    const depth = long ? T.service + 0.9 + (power - SWEET[1]) * 5 : good ? T.service - 1 : lerp(2.8, T.service - 1.8, clamp(power / SWEET[0], 0, 1));
    const tz = T.cz + this.box * (2.05 + clamp(steer * this.box, -1, 1) * 1.5);
    this.last = who;
    this.serving = true;
    this.wasServe = true;
    this.touched = false;
    this.launch(T.cx + toward * depth, tz, good ? 0.66 - (who === 1 ? this.level * 0.04 : 0) : long ? 0.7 : lerp(1.05, 0.8, clamp(power / SWEET[0], 0, 1)));
    this.phase = "rally";
    this.t = 0;
    this.rallies = 0;
    if (who === 0) this.swing = 0.35;
    else this.rivalSwing = 0.35;
    g.sound.board();
    g.push();
  }

  /** Is a bounce at (x, z) good for whoever hit it? */
  private good(x: number, z: number) {
    const side: Who = x > T.cx ? 1 : 0;
    if (side === this.last) return false;
    const dx = Math.abs(x - T.cx);
    const dz = z - T.cz;
    if (Math.abs(dz) > T.wide + 0.07 || dx > T.half + 0.07) return false;
    if (this.serving) {
      if (dx > T.service + 0.07) return false;
      if (dz * this.box < -0.07) return false;
    }
    return true;
  }

  private bounce() {
    const g = this.g;
    if (this.phase !== "rally") return;
    if (this.bounces === 0) {
      if (!this.good(this.p.x, this.p.z)) {
        if (this.serving) this.fault();
        else this.point(other(this.last), this.netted ? "INTO THE NET" : "OUT");
        return;
      }
      this.bounces = 1;
      this.serving = false;
      g.sound.bounce(0.6);
      return;
    }
    // Twice: nobody got to it.
    if (this.wasServe && !this.touched) {
      if (this.last === 0) this.aces++;
      this.point(this.last, "ACE!");
    } else this.point(this.last, this.last === 0 ? "WINNER!" : "Too good");
  }

  private fault() {
    const g = this.g;
    this.faults++;
    this.serving = false;
    this.phase = "point";
    this.t = 0;
    g.sound.bad();
    if (this.faults >= 2) {
      this.faults = 0;
      this.award(other(this.server), "DOUBLE FAULT");
      return;
    }
    this.say(this.netted ? "FAULT: net.  Second serve" : "FAULT: long.  Second serve", 1.5);
    this.after = () => this.toServe();
  }

  private point(winner: Who, why: string) {
    this.phase = "point";
    this.t = 0;
    this.faults = 0;
    this.longest = Math.max(this.longest, this.rallies);
    this.award(winner, why);
  }

  /** A point to `winner`: the game and the match move on from it. */
  private award(winner: Who, why: string) {
    const g = this.g;
    this.pts[winner]++;
    const [a, b] = this.pts;
    const mine = winner === 0;
    if (mine) g.cheer(T.cx, T.cz, 22, 1.2);
    if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2) {
      this.games[winner]++;
      this.pts = [0, 0];
      this.server = other(this.server);
      const done = this.games[winner] >= GAMES;
      this.say(`${why}   ${done ? "GAME, SET, MATCH" : "GAME"}  ${mine ? "BENJI" : RIVAL.name.toUpperCase()}`, 2.4);
      if (mine) g.sound.cheer();
      this.after = done ? () => this.finish() : () => this.toServe();
      if (done && mine) g.moment(2);
    } else {
      this.say(`${why}   ${this.score()}`, 1.8);
      this.after = () => this.toServe();
    }
    g.push();
  }

  private score() {
    const [a, b] = this.pts;
    if (a >= 3 && b >= 3) return a === b ? "DEUCE" : a > b ? "ADVANTAGE BENJI" : `ADVANTAGE ${RIVAL.name.toUpperCase()}`;
    return `${POINTS[a]} – ${POINTS[b]}`;
  }

  /** Benji's racket meets the ball. `mx`, `my` are the stick: across the court and down it. */
  private hit(mx: number, my: number, d: number) {
    const g = this.g;
    const q = clamp(1 - d / REACH, 0, 1);
    const depth = my > 0.35 ? T.half - 1.5 : my < -0.35 ? 3.4 : T.half - 3.4;
    const wild = lerp(1.25, 0.22, q);
    const tx = T.cx + depth + (Math.random() - 0.5) * 2 * wild;
    const tz = T.cz + mx * (T.wide - 0.55) + (Math.random() - 0.5) * 2 * wild * 0.8;
    this.p.y = Math.max(this.p.y, Y0 + 0.5);
    this.last = 0;
    this.serving = false;
    this.touched = true;
    this.rallies++;
    this.launch(tx, tz, lerp(1.25, 0.8, q) + (my < -0.35 ? 0.15 : 0));
    this.rivalRead = lerp(0.5, 0.34, this.level / 2);
    this.mark.visible = false;
    g.sound.board();
    g.buzz(20);
    g.stage.setPunch(0.25);
  }

  /** Coach Renee's reply. She misses more when she is stretched, and less the more she has been beaten. */
  private reply(stretch: number) {
    const g = this.g;
    const error = Math.random() < 0.085 - this.level * 0.02 + (stretch > 0.75 ? 0.2 : 0) + Math.min(0.2, this.rallies * 0.012);
    // Away from where he is, nearer the lines the more she has been beaten; now and then back behind him.
    const away = g.pos.z > T.cz ? -1 : 1;
    const wide = lerp(T.wide - 2.3, T.wide - 0.7, this.level / 2);
    let tx = T.cx - (T.half - 1.2 - Math.random() * lerp(4.2, 2.6, this.level / 2));
    let tz = T.cz + away * (1.2 + Math.random() * (wide - 1.2)) * (Math.random() < 0.22 ? -0.5 : 1);
    let time = lerp(1.32, 1.02, this.level / 2) + Math.random() * 0.12;
    let clear = true;
    if (error) {
      const how = Math.random();
      if (how < 0.4) {
        // Into the net.
        time = 0.5;
        clear = false;
      } else if (how < 0.75) tx = T.cx - T.half - 0.5 - Math.random() * 1.2;
      else tz = T.cz + away * (T.wide + 0.4 + Math.random() * 0.9);
    }
    this.p.y = Math.max(this.p.y, Y0 + 0.6);
    this.last = 1;
    this.serving = false;
    this.touched = true;
    this.rallies++;
    this.launch(tx, tz, time, clear);
    this.rivalSwing = 0.3;
    this.rivalWing = this.p.z <= this.opp.z ? 1 : -1;
    this.rivalCool = 0.4;
    g.sound.board();
  }

  /** The ball for one frame: gravity, the net, the court, the fence. */
  private fly(dt: number) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps && this.live; i++) {
      const px = this.p.x;
      this.v.y -= G * h;
      this.p.addScaledVector(this.v, h);
      // The net.
      if ((px - T.cx) * (this.p.x - T.cx) < 0 && this.p.y < Y0 + T.net && Math.abs(this.p.z - T.cz) < T.wide + T.alley + 0.9) {
        this.p.x = px;
        this.v.x *= -0.12;
        this.v.z *= 0.3;
        this.v.y = Math.min(this.v.y, 0.4);
        this.netted = true;
        this.g.sound.rim();
      }
      if (this.p.x < F.minX + 0.2 || this.p.x > F.maxX - 0.2) {
        this.p.x = clamp(this.p.x, F.minX + 0.2, F.maxX - 0.2);
        this.v.x *= -0.25;
      }
      if (this.p.z < F.minZ + 0.2 || this.p.z > F.maxZ - 0.2) {
        this.p.z = clamp(this.p.z, F.minZ + 0.2, F.maxZ - 0.2);
        this.v.z *= -0.25;
      }
      if (this.p.y <= Y0 + BALL && this.v.y < 0) {
        this.p.y = Y0 + BALL;
        this.v.y *= -0.74;
        this.v.x *= 0.8;
        this.v.z *= 0.8;
        if (Math.abs(this.v.y) < 0.7) this.v.y = 0;
        this.bounce();
      }
    }
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.t += dt;
    if (this.swing > 0) this.swing -= dt;
    if (this.swingCool > 0) this.swingCool -= dt;
    if (this.rivalCool > 0) this.rivalCool -= dt;
    if (this.rivalSwing > 0) this.rivalSwing -= dt;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    const mv = input.move();
    let moved = 0;
    let rivalMoved = 0;

    if (this.phase === "serve") {
      if (this.server === 0) {
        if (!this.charging && this.t > 0.5 && input.down("action")) {
          this.charging = true;
          this.power = 0;
          this.dir = 1;
        }
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
            this.serve(0, this.power, mv.x);
          }
        }
      } else if (this.t > 1.3) {
        // Hers come harder the more she has been beaten, and now and then she misses the box.
        const long = Math.random() < 0.07;
        this.serve(1, long ? 0.95 : lerp(0.5, 0.74, Math.random() * 0.5 + this.level * 0.25), (Math.random() - 0.5) * 1.6);
      }
    } else if (this.phase === "rally") {
      // Benji runs where the stick says. Left alone, he drifts to where the ball is going.
      let wx = mv.y;
      let wz = mv.x;
      if (Math.hypot(wx, wz) < 0.15 && this.live && this.last === 1) {
        const dx = clamp(this.meet.x, T.cx - T.half - 1, T.cx - 1.5) - g.pos.x;
        const dz = this.meet.z - g.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.35) {
          wx = (dx / d) * 0.45;
          wz = (dz / d) * 0.45;
        }
      }
      const px = g.pos.x;
      const pz = g.pos.z;
      g.pos.x = clamp(g.pos.x + wx * PACE * dt, T.cx - T.half - 1.1, T.cx - 0.9);
      g.pos.z = clamp(g.pos.z + wz * PACE * dt, F.minZ + 0.8, F.maxZ - 0.8);
      moved = Math.hypot(g.pos.x - px, g.pos.z - pz) / Math.max(dt, 1e-4);

      // Back at the baseline he lets it bounce (and a ball going long is left alone); up at the net he can take it out of the air.
      const mine = this.live && this.last === 1 && (this.bounces === 1 || (this.bounces === 0 && g.pos.x > T.cx - T.service)) && this.p.x < T.cx + 0.4;
      const d = Math.hypot(this.p.x - g.pos.x, this.p.z - g.pos.z);
      const can = mine && d < REACH && this.p.y < Y0 + 2.5;
      this.ballMat.emissive.setHex(can ? 0x39ff14 : 0x8aa010);
      this.ballMat.emissiveIntensity = can ? 1.6 : 0.6;
      if (input.hit("action") && this.swingCool <= 0) {
        this.swingCool = 0.32;
        this.swing = 0.3;
        this.wing = this.p.z >= g.pos.z ? 1 : -1;
        if (can) this.hit(mv.x, mv.y, d);
        else g.sound.whoosh();
      }

      // She runs to meet it, and goes back to the middle when it is on its way to Benji.
      if (this.rivalRead > 0) this.rivalRead -= dt;
      const chasing = this.live && this.last === 0 && !this.netted && this.rivalRead <= 0;
      const tx = chasing ? clamp(this.meet.x, T.cx + 1.4, T.cx + T.half + 2.6) : T.cx + T.half - 0.4;
      const tz = chasing ? clamp(this.meet.z, F.minZ + 0.8, F.maxZ - 0.8) : T.cz;
      const ox = tx - this.opp.x;
      const oz = tz - this.opp.z;
      const od = Math.hypot(ox, oz);
      const speed = [3.9, 4.5, 5.1][this.level]!;
      if (od > 0.08) {
        const step = Math.min(od, speed * (chasing ? 1 : 0.7) * dt);
        this.opp.x += (ox / od) * step;
        this.opp.z += (oz / od) * step;
        rivalMoved = step / Math.max(dt, 1e-4);
      }
      if (this.live && this.last === 0 && !this.netted && this.bounces === 1 && this.rivalCool <= 0 && this.p.x > T.cx + 0.4 && this.p.y < Y0 + 2.4) {
        const rd = Math.hypot(this.p.x - this.opp.x, this.p.z - this.opp.z);
        // Right on it, or as near as it will come before it is past her.
        if (rd < 0.85 || (rd < RIVAL_REACH && rd > this.rivalGap)) this.reply(rd / RIVAL_REACH);
        this.rivalGap = rd;
      } else this.rivalGap = 99;
      this.fly(dt);
      // Where it is coming down on his side.
      this.mark.visible = this.live && this.last === 1 && this.bounces === 0 && !this.netted && this.phase === "rally";
      if (this.mark.visible) {
        this.mark.position.set(this.land.x, Y0 + 0.03, this.land.z);
        // Green where it is coming down in; red when it is going out and can be left.
        const out = Math.abs(this.land.z - T.cz) > T.wide + 0.07 || this.land.x < T.cx - T.half - 0.07 || (this.serving && (this.land.x < T.cx - T.service - 0.07 || (this.land.z - T.cz) * this.box < -0.07));
        (this.mark.material as THREE.MeshBasicMaterial).color.setHex(out ? 0xff3b3b : 0x39ff14);
      }
    } else if (this.phase === "point") {
      this.mark.visible = false;
      if (this.live) this.fly(dt);
      if (this.t > (this.callLeft > 0 ? 1.5 : 1.2) && this.callLeft <= 0.2) {
        const f = this.after;
        this.after = null;
        this.live = false;
        if (f) f();
        else this.toServe();
      }
    }

    // The ball in the server's hand before it goes up.
    if (this.phase === "serve") {
      const from = this.server === 0 ? g.pos : this.opp;
      this.ball.visible = true;
      this.p.set(from.x + (this.server === 0 ? 0.3 : -0.3), Y0 + 1.25 + (this.charging ? this.power * 1.2 : Math.abs(Math.sin(this.t * 5)) * 0.25), from.z);
    }
    this.ball.position.copy(this.p);
    this.shadow.visible = this.ball.visible;
    this.shadow.position.set(this.p.x, Y0 + 0.02, this.p.z);
    const hgt = clamp((this.p.y - Y0) / 4, 0, 1);
    this.shadow.scale.setScalar(1 + hgt * 1.2);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.45 - hgt * 0.25;

    g.heading = Math.PI / 2;
    g.benji.speed = moved;
    // Arms up to serve; the long follow-through when he swings.
    // In the fit he has racket drawings for, he holds one: up to serve, across him on either side, and ready between shots.
    const racket = g.benji.has("tennis");
    g.benji.pose =
      this.phase === "serve" && this.server === 0 && this.charging
        ? racket
          ? "serve"
          : "shoot"
        : this.swing > 0
          ? racket
            ? this.wing > 0
              ? "forehand"
              : "backhand"
            : "bowl"
          : this.phase === "point" && this.after && this.call.includes("BENJI") && this.call.includes("GAME")
            ? "cheer"
            : racket
              ? "tennis"
              : null;
    const rc = this.rival;
    rc.place(this.opp.x, this.opp.z);
    rc.speed = rivalMoved;
    rc.heading = rivalMoved > 0.6 && this.phase === "rally" ? Math.atan2(this.meet.x - this.opp.x || -1, this.meet.z - this.opp.z) : -Math.PI / 2;
    if (rivalMoved < 0.6 || this.last === 1) rc.heading = -Math.PI / 2;
    rc.pose = this.rivalSwing > 0 ? (this.rivalWing > 0 ? "forehand" : "backhand") : this.phase === "serve" && this.server === 1 ? "serve" : "tennis";
    rc.update(dt, g.camera.position, g.tint, null);
    g.live.meter = this.charging ? this.power : 0;
    g.live.sweetLo = SWEET[0];
    g.live.sweetHi = SWEET[1];
    g.live.aim = 0;
    this.frame(dt, false);
  }

  private finish() {
    const g = this.g;
    this.phase = "over";
    this.ball.visible = false;
    this.shadow.visible = false;
    const won = this.games[0] > this.games[1];
    const wins = g.save.best.tennis ?? 0;
    if (won) g.save.best.tennis = wins + 1;
    const got = won ? g.earn(90 + this.level * 30, 6 + this.level * 2) : g.earn(12, 1);
    g.emit("tennis", won ? 1 : 0, this.games[0] - this.games[1]);
    g.showResults(
      {
        title: won ? "GAME, SET, MATCH" : `${RIVAL.name.toUpperCase()} TAKES IT`,
        sub: won ? `${RIVAL.name} says come back. She will be quicker next time.` : "Get to where the ring is, and swing as the ball turns green.",
        rows: [
          ["Games", `${this.games[0]} to ${this.games[1]}`],
          ["Longest rally", `${this.longest} shots`],
          ["Aces", String(this.aces)],
          ["Wins here", String(g.save.best.tennis ?? 0)],
        ],
        pay: got.dollars,
        respect: got.respect,
        tickets: 0,
        record: false,
        win: won,
        again: won ? "Rematch" : "Run it back",
      },
      () => this.start(),
      () => this.quit(),
    );
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    // Up behind his baseline, inside the fence, leaning a little the way he and the ball go.
    _eye.set(F.minX + 0.35, Y0 + 4.3, T.cz + (g.pos.z - T.cz) * 0.3);
    _at.set(T.cx - 1, Y0 + 0.3, T.cz + (g.pos.z - T.cz) * 0.12 + (this.live ? (this.p.z - T.cz) * 0.1 : 0));
    const k = snap ? 1 : damp(4, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    g.camera.lookAt(this.look);
    if (Math.abs(g.camera.fov - 55) > 0.01) {
      g.camera.fov = 55;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    this.on = false;
    this.live = false;
    this.ball.visible = false;
    this.shadow.visible = false;
    this.mark.visible = false;
    this.opp.x = T.cx + T.half - 1;
    this.opp.z = T.cz;
    this.rival.place(this.opp.x, this.opp.z);
    g.pos.x = TENNIS_GATE.x;
    g.pos.z = TENNIS_GATE.z;
    g.heading = Math.PI / 2;
    g.camYaw = Math.PI / 2;
    g.live.meter = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    h.machine = {
      name: "Tennis",
      stats: [
        ["Games", `${this.games[0]} – ${this.games[1]}`, "#39ff14"],
        ["Points", this.score().replace("ADVANTAGE", "AD"), "#f4d77a"],
        ["Serving", this.server === 0 ? "Benji" : RIVAL.name],
      ],
      call: this.call || (this.phase === "serve" && this.server === 0 && this.t > 2.5 && !this.charging ? "Hold to serve, let go in the green" : ""),
      meter: this.phase === "serve" && this.server === 0,
      act: "Swing",
    };
  }

  /** For the tests. */
  get state() {
    return { phase: this.phase, server: this.server, pts: [...this.pts], games: [...this.games], live: this.live, last: this.last, bounces: this.bounces, x: this.p.x, y: this.p.y, z: this.p.z, land: { ...this.land }, on: this.on };
  }
}
