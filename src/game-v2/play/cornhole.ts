import * as THREE from "three";
import { Card } from "../actors/card";
import { PEDS } from "../assets/cast";
import type { HudState } from "../core/types";
import { clamp, damp, lerp } from "../core/util";
import type { Activity, Game } from "../game";
import { CURB } from "../world/map";
import { CORNHOLE as C, CORNHOLE_STAND, boardY } from "../world/rec-map";

const Y0 = CURB;
const TO = 21;
/** How fast a bag on the board loses speed, m/s². */
const GRIP = 3.2;
const BAG = 0.075;
/** Where on the power meter a bag lands to slide up to the hole. */
const SWEET: [number, number] = [0.61, 0.7];
const RIVAL = { name: "Mr. Willie", ped: 6 };

type Bag = {
  mesh: THREE.Mesh;
  who: 0 | 1;
  /** In the hand, in the air, sliding or lying on the board, on the grass, or gone down the hole. */
  state: "hand" | "fly" | "board" | "grass" | "in";
  u: number;
  v: number;
  su: number;
  sv: number;
  t: number;
  flight: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
};

const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();

/**
 * Cornhole on the lawn by the courts, against Mr. Willie. Four bags each a round, thrown turn
 * about. A bag on the board is one, a bag in the hole is three, and only the difference counts.
 * First to 21. Bags slide, and a bag that slides into another one shoves it.
 */
export class Cornhole implements Activity {
  hints: [string, string][] = [
    ["A D", "Aim"],
    ["Hold Space", "Power"],
    ["Release", "Throw"],
    ["Q", "Walk away"],
  ];
  private bags: Bag[] = [];
  private rival: Card;
  private marker: THREE.Mesh;
  /** The bag in Benji's hand while he lines the throw up. */
  private held: THREE.Mesh;
  private score: [number, number] = [0, 0];
  private thrown: [number, number] = [0, 0];
  private round = 1;
  /** Who throws first this round: whoever took the last one. */
  private first: 0 | 1 = 0;
  private turn: 0 | 1 = 0;
  private phase: "aim" | "fly" | "settle" | "think" | "tally" | "over" = "aim";
  private t = 0;
  private aim = 0;
  private power = 0;
  private dir = 1;
  private charging = false;
  private live: Bag | null = null;
  private call = "";
  private callLeft = 0;
  private level = 0;
  private fours = 0;
  private swing = 0;
  private look = new THREE.Vector3();
  private on = false;

  constructor(private g: Game) {
    const geo = new THREE.BoxGeometry(0.15, 0.045, 0.15);
    const mats = [new THREE.MeshStandardMaterial({ color: 0x2fae4f, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0xd8a93a, roughness: 0.9 })];
    for (let i = 0; i < 8; i++) {
      const who = (i % 2) as 0 | 1;
      const mesh = new THREE.Mesh(geo, mats[who]);
      mesh.castShadow = true;
      mesh.visible = false;
      g.city.exterior.add(mesh);
      this.bags.push({ mesh, who, state: "hand", u: 0, v: 0, su: 0, sv: 0, t: 0, flight: 1, from: new THREE.Vector3(), to: new THREE.Vector3() });
    }
    this.held = new THREE.Mesh(geo, mats[0]);
    this.held.visible = false;
    g.city.exterior.add(this.held);
    const ring = new THREE.RingGeometry(0.07, 0.095, 24);
    ring.rotateX(-Math.PI / 2);
    this.marker = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0x39ff14, toneMapped: false, transparent: true, opacity: 0.85, depthTest: false }));
    this.marker.renderOrder = 8;
    this.marker.visible = false;
    g.city.exterior.add(this.marker);
    const ped = PEDS[RIVAL.ped]!;
    this.rival = new Card(ped.art, ped.height);
    this.rival.place(C.x + 0.85, C.nearZ + 0.2);
    this.rival.heading = Math.PI;
    g.city.exterior.add(this.rival.group);
  }

  /** Mr. Willie is always at his board, whether or not anyone is playing him. */
  idle(dt: number) {
    if (this.on) return;
    const g = this.g;
    const d = Math.hypot(g.pos.x - (C.x + 0.85), g.pos.z - (C.nearZ + 0.2));
    this.rival.heading = d < 6 ? Math.atan2(g.pos.x - (C.x + 0.85), g.pos.z - (C.nearZ + 0.2)) : Math.PI;
    this.rival.pose = null;
    this.rival.update(dt, g.camera.position, g.tint, null);
  }

  start() {
    const g = this.g;
    this.on = true;
    this.level = clamp(g.save.best.cornhole ?? 0, 0, 3);
    this.score = [0, 0];
    this.round = 1;
    this.first = 0;
    this.fours = 0;
    g.pos.x = CORNHOLE_STAND.x;
    g.pos.z = CORNHOLE_STAND.z;
    g.heading = Math.PI;
    g.benji.visible = true;
    this.rival.heading = Math.PI;
    this.deal();
    this.say(`FIRST TO ${TO}  ·  YOU THROW FIRST`, 2.6);
    this.frame(0, true);
    g.push();
  }

  private deal() {
    this.thrown = [0, 0];
    for (const b of this.bags) {
      b.state = "hand";
      b.mesh.visible = false;
      b.mesh.scale.setScalar(1);
    }
    this.turn = this.first;
    this.begin();
  }

  /** Whoever's turn it is picks up a bag. */
  private begin() {
    this.live = null;
    this.aim = 0;
    this.power = 0;
    this.charging = false;
    this.t = 0;
    this.phase = this.turn === 0 ? "aim" : "think";
    this.g.push();
  }

  private say(text: string, seconds = 1.5) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  /** Where a bag aimed and thrown like this comes down, across the board and up it. */
  private target(aim: number, power: number): [number, number] {
    return [aim * 0.5, lerp(-2.2, 1.9, power)];
  }

  private place(b: Bag) {
    const onBoard = b.state === "board" || b.state === "in";
    b.mesh.position.set(C.x + b.u, Y0 + (onBoard ? boardY(clamp(b.v, 0, C.len)) + 0.04 : 0.035), C.farZ - b.v);
    b.mesh.rotation.set(onBoard ? Math.atan2(C.rear - C.front, C.len) : 0, b.mesh.rotation.y, 0);
  }

  private toss(who: 0 | 1, aim: number, power: number, wobbleU: number, wobbleV: number) {
    const g = this.g;
    const b = this.bags.find((k) => k.who === who && k.state === "hand")!;
    const [u, v] = this.target(aim, power);
    b.u = u + wobbleU;
    b.v = v + wobbleV;
    b.su = aim * 0.12;
    b.sv = 0.8 + 1.9 * power;
    const sx = who === 0 ? CORNHOLE_STAND.x + 0.3 : C.x + 0.55;
    b.from.set(sx, Y0 + 0.95, C.nearZ - 0.1);
    const onBoard = b.v >= 0 && b.v <= C.len && Math.abs(b.u) <= C.wide / 2;
    b.to.set(C.x + b.u, Y0 + (onBoard ? boardY(b.v) + 0.04 : 0.035), C.farZ - b.v);
    b.flight = 0.78 + power * 0.25;
    b.t = 0;
    b.state = "fly";
    b.mesh.visible = true;
    b.mesh.rotation.set(0, Math.random() * 3, 0);
    this.live = b;
    this.thrown[who]++;
    this.phase = "fly";
    this.t = 0;
    this.swing = 0.45;
    this.marker.visible = false;
    g.sound.whoosh();
    g.push();
  }

  /** The bag has come down: on the board, straight in the hole, or on the grass. */
  private land(b: Bag) {
    const g = this.g;
    const onBoard = b.v >= 0 && b.v <= C.len && Math.abs(b.u) <= C.wide / 2;
    if (!onBoard) {
      b.state = "grass";
      b.sv *= 0.25;
      g.sound.step();
      return;
    }
    if (Math.hypot(b.u, b.v - C.holeV) < C.holeR - 0.012) {
      b.state = "in";
      b.t = 0;
      b.sv = b.su = 0;
      g.sound.swish();
      this.say(b.who === 0 ? "AIRMAIL!  Straight in" : `${RIVAL.name} airmails it`, 1.4);
      return;
    }
    b.state = "board";
    g.sound.board();
  }

  /** Everything on the board that is still moving, for one step. True while anything is. */
  private slide(dt: number) {
    let moving = false;
    for (const b of this.bags) {
      if (b.state === "in") {
        // Down the hole.
        b.t += dt;
        b.mesh.position.y -= dt * 0.5;
        b.mesh.scale.setScalar(Math.max(0.01, 1 - b.t * 3));
        if (b.t < 0.33) moving = true;
        else b.mesh.visible = false;
        continue;
      }
      if (b.state === "grass") {
        if (b.sv > 0.02) {
          b.v += b.sv * dt;
          b.sv = Math.max(0, b.sv - 5 * dt);
          this.place(b);
          moving = true;
        }
        continue;
      }
      if (b.state !== "board") continue;
      const speed = Math.hypot(b.su, b.sv);
      if (speed < 0.02) {
        b.su = b.sv = 0;
        continue;
      }
      moving = true;
      const drop = Math.min(speed, GRIP * dt);
      b.su -= (b.su / speed) * drop;
      b.sv -= (b.sv / speed) * drop;
      b.u += b.su * dt;
      b.v += b.sv * dt;
      // Into the back of another bag: most of the push goes into it.
      for (const o of this.bags) {
        if (o === b || o.state !== "board") continue;
        const du = o.u - b.u;
        const dv = o.v - b.v;
        const d = Math.hypot(du, dv);
        if (d > BAG * 2 || d < 1e-4) continue;
        const nu = du / d;
        const nv = dv / d;
        const along = b.su * nu + b.sv * nv;
        if (along <= 0) continue;
        o.su += nu * along * 0.75;
        o.sv += nv * along * 0.75;
        b.su -= nu * along * 0.8;
        b.sv -= nv * along * 0.8;
        o.u = b.u + nu * BAG * 2;
        o.v = b.v + nv * BAG * 2;
        this.g.sound.step();
      }
      const near = Math.hypot(b.u, b.v - C.holeV);
      if (near < C.holeR + 0.02 && Math.hypot(b.su, b.sv) < 2.6) {
        b.state = "in";
        b.t = 0;
        b.u = 0;
        b.v = C.holeV;
        this.g.sound.swish();
        this.g.buzz(30);
        if (b !== this.live) this.say("KNOCKED IN!", 1.3);
      } else if (Math.abs(b.u) > C.wide / 2 + 0.03 || b.v > C.len + 0.03 || b.v < -0.03) {
        b.state = "grass";
        b.sv = Math.max(0, b.sv) * 0.3;
        b.su = 0;
      }
      this.place(b);
    }
    return moving;
  }

  private count(who: 0 | 1) {
    let n = 0;
    for (const b of this.bags) if (b.who === who) n += b.state === "in" ? 3 : b.state === "board" ? 1 : 0;
    return n;
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.t += dt;
    if (this.swing > 0) this.swing -= dt;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    if (this.phase === "aim") {
      this.aim = clamp(this.aim + input.move().x * 0.9 * dt, -1, 1);
      if (!this.charging && this.t > 0.25 && input.down("action")) {
        this.charging = true;
        this.power = 0;
        this.dir = 1;
      }
      if (this.charging) {
        this.power += this.dir * dt * 0.85;
        if (this.power >= 1) {
          this.power = 1;
          this.dir = -1;
        } else if (this.power <= 0) {
          this.power = 0;
          this.dir = 1;
        }
        if (!input.down("action")) {
          this.charging = false;
          this.toss(0, this.aim, this.power, (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.06);
        }
      }
      if (this.phase === "aim") {
        const [u, v] = this.target(this.aim, (SWEET[0] + SWEET[1]) / 2);
        this.marker.visible = true;
        this.marker.position.set(C.x + u, Y0 + boardY(clamp(v, 0, C.len)) + 0.05, C.farZ - v);
        // The bag in his hand, low and to the right of the eye, drawn back as the throw winds up.
        this.held.position.set(C.x + 0.42 + this.aim * 0.08, Y0 + 1.07 - this.power * 0.1 + Math.sin(this.t * 3) * 0.008, C.nearZ - 2.3 + this.power * 0.35);
        this.held.rotation.set(0.5, 0.4, 0);
      }
    } else if (this.phase === "think") {
      if (this.t > 0.9) {
        // He aims to land it halfway up and let it slide. The better he has been beaten, the steadier he is.
        const k = this.level / 3;
        const wild = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        this.toss(1, wild() * lerp(0.34, 0.18, k), lerp(0.63, 0.655, k) + wild() * lerp(0.07, 0.035, k), 0, 0);
      }
    } else if (this.phase === "fly") {
      const b = this.live!;
      b.t += dt;
      const k = Math.min(1, b.t / b.flight);
      b.mesh.position.lerpVectors(b.from, b.to, k);
      b.mesh.position.y += Math.sin(k * Math.PI) * (1.15 + b.flight * 0.5);
      b.mesh.rotation.x += dt * 5;
      if (k >= 1) {
        this.land(b);
        this.place(b);
        this.phase = "settle";
        this.t = 0;
      }
    } else if (this.phase === "settle") {
      const moving = this.slide(dt);
      if (!moving && this.t > 0.55) {
        const b = this.live!;
        if (!this.call) {
          const mine = b.who === 0;
          if (b.state === "in") this.say(mine ? "IN THE HOLE!  +3" : `${RIVAL.name} drops it in`, 1.2);
          else if (b.state === "board") this.say(mine ? "On the board" : `${RIVAL.name} is on the board`, 1);
          else this.say(b.v < 0 ? (mine ? "Short" : `${RIVAL.name} is short`) : Math.abs(b.u) > C.wide / 2 ? (mine ? "Wide" : `${RIVAL.name} misses wide`) : mine ? "Off the back" : `${RIVAL.name} slides off`, 1);
        }
        if (this.thrown[0] >= 4 && this.thrown[1] >= 4) {
          this.phase = "tally";
          this.t = 0;
          this.tally();
        } else {
          this.turn = this.thrown[this.turn === 0 ? 1 : 0] < 4 ? ((1 - this.turn) as 0 | 1) : this.turn;
          this.begin();
        }
      }
    } else if (this.phase === "tally") {
      if (this.t > 2.6) {
        if (this.score[0] >= TO || this.score[1] >= TO) this.finish();
        else {
          this.round++;
          this.deal();
        }
      }
    }
    // Benji on his side of the board, the other man on his.
    g.pos.x = CORNHOLE_STAND.x;
    g.pos.z = CORNHOLE_STAND.z;
    g.heading = Math.PI;
    g.benji.speed = 0;
    g.benji.pose = this.swing > 0 && this.live?.who === 0 ? "bowl" : null;
    this.rival.pose = this.phase === "tally" && this.count(1) > this.count(0) ? "cheer" : null;
    this.rival.update(dt, g.camera.position, g.tint, null);
    g.live.meter = this.charging ? this.power : 0;
    g.live.sweetLo = SWEET[0];
    g.live.sweetHi = SWEET[1];
    g.live.aim = this.phase === "aim" ? this.aim : 0;
    this.held.visible = this.phase === "aim";
    this.frame(dt, false);
  }

  /** The round is over: only the difference goes on the board. */
  private tally() {
    const g = this.g;
    const a = this.count(0);
    const b = this.count(1);
    if (this.bags.filter((k) => k.who === 0 && k.state === "in").length === 4) {
      this.fours++;
      g.moment(1);
    }
    if (a === b) this.say(a ? `${a} each: a wash` : "Nothing either way", 2.4);
    else {
      const who = a > b ? 0 : 1;
      this.score[who] += Math.abs(a - b);
      this.first = who;
      this.say(`${a} to ${b}:  ${who === 0 ? "Benji" : RIVAL.name} +${Math.abs(a - b)}`, 2.4);
      if (who === 0) g.sound.cheer();
    }
    g.push();
  }

  private finish() {
    const g = this.g;
    this.phase = "over";
    const won = this.score[0] > this.score[1];
    const wins = g.save.best.cornhole ?? 0;
    if (won) g.save.best.cornhole = wins + 1;
    const got = won ? g.earn(70 + this.level * 25, 5 + this.level * 2) : g.earn(10, 1);
    if (won) g.moment(2);
    g.emit("cornhole", won ? 1 : 0, this.score[0] - this.score[1]);
    g.showResults(
      {
        title: won ? "BAGS!  YOU TOOK IT" : `${RIVAL.name.toUpperCase()} TOOK IT`,
        sub: won ? `${RIVAL.name} wants his rematch. He will be steadier.` : "Land it halfway up the board and let it slide.",
        rows: [
          ["Final", `${this.score[0]} to ${this.score[1]}`],
          ["Rounds", String(this.round)],
          ["Four-baggers", String(this.fours)],
          ["Wins here", String(g.save.best.cornhole ?? 0)],
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
    // Benji's throw is seen from his own eye at the line, drawn in on the far board. While the other
    // man gets set the lens is round the front of them both; once a bag is in the air it is down the lane.
    let fov = 46;
    if (this.phase === "aim") {
      _eye.set(C.x, Y0 + 1.55, C.nearZ - 0.15);
      _at.set(C.x, Y0 + 0.2, C.farZ - 0.6);
      fov = 28;
    } else if (this.phase === "think") {
      _eye.set(C.x - 2.7, Y0 + 1.45, C.nearZ - 3.3);
      _at.set(C.x + 0.3, Y0 + 0.95, C.nearZ + 0.2);
    } else {
      _eye.set(C.x + 1.25, Y0 + 1.55, C.farZ + 2.7);
      _at.set(C.x, Y0 + 0.2, C.farZ - 0.75);
    }
    const k = snap ? 1 : damp(this.phase === "aim" ? 6 : 3.4, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    g.camera.lookAt(this.look);
    const f = snap ? fov : lerp(g.camera.fov, fov, k);
    if (Math.abs(g.camera.fov - f) > 0.01) {
      g.camera.fov = f;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    this.on = false;
    this.marker.visible = false;
    this.held.visible = false;
    for (const b of this.bags) b.mesh.visible = false;
    this.rival.pose = null;
    g.pos.x = CORNHOLE_STAND.x - 0.6;
    g.pos.z = CORNHOLE_STAND.z + 1.6;
    g.heading = Math.PI;
    g.camYaw = Math.PI;
    g.live.meter = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    h.machine = {
      name: "Cornhole",
      stats: [
        ["Benji", String(this.score[0]), "#39ff14"],
        [RIVAL.name, String(this.score[1]), "#f4d77a"],
        ["Round", String(this.round)],
        ["Bags", String(4 - this.thrown[0])],
      ],
      call: this.call || (this.phase === "think" ? `${RIVAL.name} to throw` : ""),
      meter: this.phase === "aim",
      act: "Throw",
    };
  }
}
