import * as THREE from "three";
import { Card } from "../actors/card";
import { Driver, type DriveTune } from "../actors/vehicle";
import { PEDS } from "../assets/cast";
import type { HudState } from "../core/types";
import { clamp, damp, dampAngle, formatClock, wrapAngle } from "../core/util";
import type { Activity, Game } from "../game";
import { pushOut, sight } from "../world/collide";
import { KART_LENGTH, KART_PADS, kartAt, kartNearest } from "../world/funhouse";
import { CURB, KART_TRACK } from "../world/map";

function payTickets(g: Game, title: string, sub: string, rows: [string, string][], tickets: number, record: boolean, again: () => void, close: () => void) {
  const won = tickets > 0 ? g.winTickets(tickets) : 0;
  if (won) g.sound.cash();
  g.showResults({ title, sub, rows, pay: 0, respect: 0, tickets: won, record, again: "Go again" }, again, close);
}

// ------------------------------------------------------------------ go-karts

const KART: DriveTune = { top: 14.2, accel: 12.5, boostTop: 19.5, grip: 9.8 };
const KART_LAPS = 5;

function makeKart(color: number) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.25, metalness: 0.9 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.86, 0.12, 1.6), dark, 0, 0.16, 0);
  add(new THREE.BoxGeometry(0.62, 0.2, 0.62), paint, 0, 0.3, 0.62);
  add(new THREE.BoxGeometry(0.94, 0.1, 0.16), paint, 0, 0.24, 0.92);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.22, 0.2, 0.86), paint, s * 0.44, 0.3, -0.1);
  add(new THREE.BoxGeometry(0.5, 0.52, 0.12), paint, 0, 0.5, -0.52);
  add(new THREE.BoxGeometry(0.6, 0.26, 0.4), dark, 0, 0.36, -0.78);
  const col = add(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 6), chrome, 0, 0.5, 0.34);
  col.rotation.x = -0.9;
  const wheel = add(new THREE.TorusGeometry(0.14, 0.022, 6, 14), dark, 0, 0.66, 0.18);
  wheel.rotation.x = -0.9 + Math.PI / 2;
  const tyre = new THREE.CylinderGeometry(0.19, 0.19, 0.2, 14);
  tyre.rotateZ(Math.PI / 2);
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [
    [-0.52, 0.56],
    [0.52, 0.56],
    [-0.54, -0.6],
    [0.54, -0.6],
  ] as const)
    wheels.push(add(tyre, dark, x, 0.19, z));
  return { group: g, wheels };
}

type Bot = { kart: ReturnType<typeof makeKart>; driver: Card; name: string; s: number; off: number; drift: number; speed: number; top: number; done: number; x: number; z: number };

/** Five laps of the oval behind the Fun House. Tickets for where you finish. */
export class KartRace implements Activity {
  hints: [string, string][] = [
    ["W S", "Gas, brake"],
    ["A D", "Steer"],
    ["Space", "Slide"],
    ["Q", "Back inside"],
  ];
  private kart = makeKart(0x14592f);
  private bots: Bot[] = [];
  private d = new Driver();
  private phase: "count" | "go" | "finish" = "count";
  private count = 3;
  private clock = 0;
  private time = 0;
  private prog = 0;
  private lap = 0;
  private lapStart = 0;
  private bestLap = 0;
  private place = 6;
  /** Seconds of extra speed left, from a pad or from letting go of a long slide. */
  private boost = 0;
  private slide = 0;
  private call = "";
  private callLeft = 0;
  private wrong = 0;
  private leaving = false;

  constructor(private g: Game) {
    this.d.radius = 0.6;
    this.kart.group.visible = false;
    g.city.exterior.add(this.kart.group);
    // Five other drivers, each a person from the neighbourhood sat down in a kart.
    const field: [number, string, number][] = [
      [0xc22a22, "Tasha", 1],
      [0x2a6cff, "Dre", 0],
      [0xe8a81e, "Keisha", 3],
      [0x9a3ad6, "Marcus", 4],
      [0xf2efe9, "Jay", 2],
    ];
    field.forEach(([color, name, art], i) => {
      const kart = makeKart(color);
      kart.group.visible = false;
      g.city.exterior.add(kart.group);
      const driver = new Card(PEDS[art % PEDS.length]!.art, 1.5);
      driver.visible = false;
      g.city.exterior.add(driver.group);
      this.bots.push({ kart, driver, name, s: 0, off: 0, drift: 0, speed: 0, top: 13.5 - i * 0.42, done: -1, x: 0, z: 0 });
    });
  }

  start() {
    const g = this.g;
    this.leaving = false;
    this.kart.group.visible = true;
    const grid: [number, number][] = [
      [10.2, 1.2],
      [10.2, -1.2],
      [7.6, 1.2],
      [7.6, -1.2],
      [5, 1.2],
    ];
    this.bots.forEach((b, i) => {
      b.s = grid[i]![0];
      b.off = grid[i]![1];
      b.speed = 0;
      b.done = -1;
      b.drift = 0;
      b.kart.group.visible = true;
      b.driver.visible = true;
      this.poseBot(b, 0, 0);
    });
    this.boost = 0;
    this.slide = 0;
    const p = kartAt(5, -1.2);
    this.d.reset(p.x, p.z, p.heading);
    this.d.y = CURB;
    this.phase = "count";
    this.count = 3;
    this.clock = 0;
    this.time = 0;
    this.prog = 5;
    this.lap = 0;
    this.lapStart = 0;
    this.bestLap = 0;
    this.place = this.bots.length + 1;
    this.wrong = 0;
    this.say("Five laps. Stay off the tyres.", 3);
    g.sound.countdown();
    g.benji.visible = true;
    this.sync(0);
    g.chaseCar(0, this.d, 4.4, 1.9, true, []);
  }

  private say(text: string, seconds = 2) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  private poseBot(b: Bot, travel: number, dt: number) {
    const p = kartAt(b.s, b.off);
    b.x = p.x;
    b.z = p.z;
    b.kart.group.position.set(p.x, CURB, p.z);
    b.kart.group.rotation.y = p.heading;
    for (const w of b.kart.wheels) w.rotation.x += travel / 0.19;
    // The driver: a person, sat low enough that the kart hides their legs.
    const g = this.g;
    b.driver.place(p.x - Math.sin(p.heading) * 0.3, p.z - Math.cos(p.heading) * 0.3);
    b.driver.heading = p.heading;
    b.driver.lift = -0.3;
    b.driver.speed = 0;
    b.driver.update(dt, g.camera.position, g.tint, CURB);
  }

  private sync(dt: number) {
    const g = this.g;
    const d = this.d;
    this.kart.group.position.set(d.x, CURB, d.z);
    this.kart.group.rotation.y = d.heading;
    for (const w of this.kart.wheels) w.rotation.x += (d.forward * dt) / 0.19;
    this.kart.wheels[0]!.rotation.y = this.kart.wheels[1]!.rotation.y = -d.steer * 0.4;
    g.pos.x = d.x - Math.sin(d.heading) * 0.3;
    g.pos.z = d.z - Math.cos(d.heading) * 0.3;
    g.heading = d.heading;
    g.benji.lift = -0.4;
    g.benji.speed = 0;
    g.live.speed = d.speed * 2.237;
  }

  update(dt: number) {
    const g = this.g;
    const d = this.d;
    const m = g.input.move();
    this.clock += dt;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    if (this.phase === "count") {
      if (this.clock >= 1) {
        this.clock -= 1;
        this.count--;
        if (this.count <= 0) {
          this.phase = "go";
          g.sound.countdown(true);
          this.say("GO!", 1);
        } else g.sound.countdown();
        g.push();
      }
      g.sound.setEngine(true, 0.15);
    } else {
      if (this.phase === "go") this.time += dt;
      const done = this.phase === "finish";
      // Hold a slide through a bend and let go: the kart fires out of it.
      const sliding = !done && g.input.down("action") && d.speed > 6 && Math.abs(m.x) > 0.3;
      if (sliding) this.slide += dt;
      else {
        if (this.slide > 0.7 && !done) {
          this.boost = Math.max(this.boost, Math.min(1.6, this.slide * 0.9));
          this.say("DRIFT BOOST", 0.9);
          g.sound.ui();
        }
        this.slide = 0;
      }
      this.boost = Math.max(0, this.boost - dt);
      d.step(dt, { throttle: done ? 0 : g.input.throttle(), steer: m.x, handbrake: done || g.input.down("action"), boost: this.boost > 0 && !done }, KART, [], CURB);
      g.stage.setPunch(this.boost > 0 ? 0.6 : 0);
      // The tyre wall and the kerb.
      const n = kartNearest(d.x, d.z);
      for (const pad of KART_PADS) {
        const ds = Math.abs(n.s - pad * KART_LENGTH);
        if (ds < 1.6 && Math.abs(n.off) < 1.5 && this.boost < 0.9 && !done) {
          this.boost = 1.5;
          this.say("BOOST", 0.8);
          g.sound.ui();
          g.input.rumble(0.5, 160);
        }
      }
      const limit = KART_TRACK.width / 2 - 0.55;
      if (Math.abs(n.off) > limit) {
        const over = Math.abs(n.off) - limit;
        const sx = Math.sign(n.off);
        d.x -= n.nx * sx * over;
        d.z -= n.nz * sx * over;
        const into = (d.vx * n.nx + d.vz * n.nz) * sx;
        if (into > 0) {
          d.vx -= n.nx * sx * into * 1.3;
          d.vz -= n.nz * sx * into * 1.3;
          d.vx *= 0.9;
          d.vz *= 0.9;
          if (into > 2.5) g.sound.crash(Math.min(1, into / 9));
        }
      }
      for (const b of this.bots) {
        if (d.bump(b.x, b.z, 0.62) > 1.5) {
          g.sound.crash(0.4);
          b.speed *= 0.92;
        }
      }
      if (d.slip > 3.5 && d.speed > 6) g.sound.skid(Math.min(1, d.slip / 9));
      g.sound.setEngine(true, 0.25 + (d.speed / KART.top) * 0.75);

      for (const b of this.bots) {
        const here = b.s % KART_LENGTH;
        const str = 2 * (KART_TRACK.halfX - KART_TRACK.halfZ);
        const bend = Math.PI * KART_TRACK.halfZ;
        const onBend = (here > str - 2.5 && here < str + bend - 3) || here > 2 * str + bend - 2.5;
        let want = b.done >= 0 && b.s > KART_LENGTH * KART_LAPS + 12 ? 0 : onBend ? b.top * 0.74 : b.top;
        // The pack stays a pack: leaders ease up a touch, back markers push.
        const gap = b.s - this.prog;
        want *= gap > 30 ? 0.86 : gap > 12 ? 0.95 : gap < -30 ? 1.12 : gap < -12 ? 1.05 : 1;
        for (const pad of KART_PADS) if (Math.abs(here - pad * KART_LENGTH) < 4) want *= 1.16;
        b.speed += clamp(want - b.speed, -12 * dt, 7.5 * dt);
        // Each driver has a line of their own and wanders off it.
        b.drift += dt * (0.5 + (b.top % 1));
        b.off = clamp(b.off + Math.sin(b.drift + b.top * 3) * 0.5 * dt, -1.5, 1.5);
        const travel = b.speed * dt;
        b.s += travel;
        this.poseBot(b, travel, dt);
        if (b.done < 0 && b.s >= KART_LENGTH * KART_LAPS) b.done = this.time;
      }

      const lapS = ((this.prog % KART_LENGTH) + KART_LENGTH) % KART_LENGTH;
      let delta = n.s - lapS;
      if (delta > KART_LENGTH / 2) delta -= KART_LENGTH;
      if (delta < -KART_LENGTH / 2) delta += KART_LENGTH;
      if (delta > -12 && delta < 20) this.prog += delta;
      const head = kartAt(n.s).heading;
      this.wrong = d.vx * Math.sin(head) + d.vz * Math.cos(head) < -2 ? this.wrong + dt : 0;
      if (this.phase === "go") {
        const lap = Math.floor(Math.max(0, this.prog) / KART_LENGTH);
        if (lap > this.lap) {
          const t = this.time - this.lapStart;
          this.lapStart = this.time;
          if (!this.bestLap || t < this.bestLap) this.bestLap = t;
          this.lap = lap;
          if (lap < KART_LAPS) {
            this.say(lap === KART_LAPS - 1 ? "Final lap!" : `Lap ${lap + 1}`, 1.6);
            g.sound.ui();
          }
          g.people.cheer(KART_TRACK.cx, KART_TRACK.cz, 40, 1.4);
        }
        const was = this.place;
        this.place = 1 + this.bots.filter((b) => b.s > this.prog).length;
        if (this.place < was && this.time > 2) {
          const passed = this.bots.filter((b) => b.s <= this.prog).sort((a, b) => b.s - a.s)[0];
          this.say(this.place === 1 ? "YOU LEAD!" : `P${this.place}${passed ? `  ·  past ${passed.name}` : ""}`, 1.1);
        }
        if (this.prog >= KART_LENGTH * KART_LAPS) this.finish();
      }
    }
    this.sync(dt);
    if (!this.leaving) g.chaseCar(dt, d, 4.4, 1.9, false, []);
  }

  private finish() {
    const g = this.g;
    this.phase = "finish";
    const place = 1 + this.bots.filter((b) => b.done >= 0).length;
    this.place = place;
    const best = g.save.best.kart ?? 0;
    const record = !best || this.time < best;
    if (record) g.save.best.kart = Math.round(this.time * 100) / 100;
    if (place === 1) g.sound.cheer();
    payTickets(
      g,
      place === 1 ? "CHECKERED FLAG" : `FINISHED ${["1ST", "2ND", "3RD", "4TH"][place - 1]}`,
      place === 1 ? "Fastest kart in Orange Mound." : "Brake before the bend, gas out of it.",
      [
        ["Place", `${place} of 4`],
        ["Time", formatClock(this.time)],
        ["Best lap", this.bestLap ? formatClock(this.bestLap) : "--"],
      ],
      [30, 18, 10, 5][place - 1]!,
      record,
      () => this.start(),
      () => this.leave(),
    );
  }

  private leave() {
    const g = this.g;
    if (this.leaving) return;
    this.leaving = true;
    g.transition(() => {
      this.kart.group.visible = false;
      for (const b of this.bots) {
        b.kart.group.visible = false;
        b.driver.visible = false;
        b.driver.group.visible = false;
      }
      g.sound.setEngine(false);
      g.benji.lift = 0;
      g.setPlace("fun");
      const door = g.rooms.fun.kartDoor;
      g.pos.x = door.x;
      g.pos.z = door.z - 0.6;
      g.heading = Math.PI;
      g.camYaw = Math.PI;
      g.live.speed = 0;
      g.end("walk");
    });
  }

  quit() {
    this.leave();
  }

  hud(h: HudState) {
    h.race = {
      phase: this.phase,
      count: this.count,
      lap: Math.min(KART_LAPS, this.lap + 1),
      laps: KART_LAPS,
      place: this.place,
      racers: 4,
      time: this.time,
      best: this.g.save.best.kart ?? 0,
      call: this.call,
      wrongWay: this.wrong > 1,
      kart: true,
    };
  }
}

// ------------------------------------------------------------------ laser tag

type Tagger = { card: Card; lamp: THREE.Mesh; gun: THREE.Group; x: number; z: number; tx: number; tz: number; stun: number; aim: number; cool: number; stuck: number };

/** A laser tag blaster: chunky body, a lit barrel, a sight on top. Held at the hip, pointing where its owner aims. */
function makeBlaster(glow: THREE.Color) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.45, metalness: 0.4 });
  const lit = new THREE.MeshBasicMaterial({ color: glow, toneMapped: false });
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  part(new THREE.BoxGeometry(0.11, 0.15, 0.44), shell, 0, 0, 0.1);
  part(new THREE.BoxGeometry(0.08, 0.2, 0.1), shell, 0, -0.15, -0.04);
  part(new THREE.BoxGeometry(0.06, 0.06, 0.2), shell, 0, 0.1, 0.02);
  const barrel = part(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 10), lit, 0, 0.01, 0.42);
  barrel.rotation.x = Math.PI / 2;
  part(new THREE.BoxGeometry(0.125, 0.03, 0.3), lit, 0, 0.06, 0.1);
  part(new THREE.SphereGeometry(0.05, 10, 8), lit, 0, 0.01, 0.56);
  return g;
}

/** Hits a vest takes before its wearer is out for a few seconds. */
const VEST = 3;
type Beam = { mesh: THREE.Mesh; left: number };

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

/**
 * Ninety seconds in the dark with five taggers, everyone carrying a blaster. They hunt harder
 * every twenty seconds. Three hits on the vest and Benji is out for a moment and pays for it.
 */
export class LaserTag implements Activity {
  hints: [string, string][] = [
    ["W A S D", "Move and turn"],
    ["Space", "Fire"],
    ["Shift", "Run"],
    ["Q", "Leave the arena"],
  ];
  private bots: Tagger[] = [];
  private gun = makeBlaster(new THREE.Color(0.4, 3, 0.3));
  private vest = VEST;
  /** Seconds left sitting out after the vest goes dark. */
  private down = 0;
  private beams: Beam[] = [];
  private group = new THREE.Group();
  private phase: "count" | "go" | "over" = "count";
  private count = 3;
  private clock = 0;
  private left = 90;
  private score = 0;
  private tags = 0;
  private combo = 0;
  private comboLeft = 0;
  private cool = 0;
  private shield = 0;
  private gotHit = 0;
  private call = "";
  private callLeft = 0;
  private leaving = false;
  private green = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 3, 0.3), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  private pink = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 2.2), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

  constructor(private g: Game) {
    const room = g.rooms.laser;
    this.group.add(this.gun);
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(geo, this.green);
      mesh.visible = false;
      this.group.add(mesh);
      this.beams.push({ mesh, left: 0 });
    }
    room.bots.slice(0, 5).forEach((p, i) => {
      const kind = PEDS[(i * 2 + 1) % PEDS.length]!;
      const card = new Card(kind.art, kind.height);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 2.2), toneMapped: false }));
      lamp.position.y = kind.height + 0.22;
      card.group.add(lamp);
      this.group.add(card.group);
      const gun = makeBlaster(new THREE.Color(3, 0.4, 2.2));
      this.group.add(gun);
      this.bots.push({ card, lamp, gun, x: p.x, z: p.z, tx: p.x, tz: p.z, stun: 0, aim: 0, cool: 1 + i * 0.4, stuck: 0 });
    });
    room.group.add(this.group);
  }

  start() {
    const g = this.g;
    const room = g.rooms.laser;
    this.leaving = false;
    g.pos.x = room.start.x;
    g.pos.z = room.start.z;
    g.heading = room.start.heading;
    g.camYaw = room.start.heading;
    g.vel.x = g.vel.z = 0;
    this.bots.forEach((b, i) => {
      const p = room.bots[i]!;
      b.x = b.tx = p.x;
      b.z = b.tz = p.z;
      b.stun = 0;
      b.aim = 0;
      b.cool = 1.5 + i * 0.5;
    });
    this.phase = "count";
    this.count = 3;
    this.clock = 0;
    this.left = 90;
    this.score = this.tags = this.combo = 0;
    this.vest = VEST;
    this.down = 0;
    this.shield = 0;
    this.say("Tag the pink lights. Break their line of sight.", 3);
    g.sound.countdown();
    g.chase(0, true);
  }

  private say(text: string, seconds = 1.6) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  private beam(ax: number, az: number, bx: number, bz: number, mat: THREE.Material) {
    const b = this.beams.find((k) => k.left <= 0) ?? this.beams[0]!;
    _a.set(ax, 1.08, az);
    _b.set(bx, 1.12, bz);
    const len = _a.distanceTo(_b);
    b.mesh.material = mat;
    b.mesh.position.copy(_a).lerp(_b, 0.5);
    b.mesh.scale.set(1, len, 1);
    b.mesh.quaternion.setFromUnitVectors(_y, _b.sub(_a).normalize());
    b.mesh.visible = true;
    b.left = 0.2;
  }

  /** 1 to 5: the arena heats up every twenty seconds. */
  private level() {
    return Math.min(5, 1 + Math.floor((90 - this.left) / 20));
  }

  private fire() {
    const g = this.g;
    const room = g.rooms.laser;
    this.cool = 0.36;
    g.sound.release();
    // Aim where the camera looks, with a little help toward anyone close to the line.
    let best: Tagger | null = null;
    let bestErr = 0.3;
    for (const b of this.bots) {
      if (b.stun > 0) continue;
      const dx = b.x - g.pos.x;
      const dz = b.z - g.pos.z;
      const err = Math.abs(wrapAngle(Math.atan2(dx, dz) - g.camYaw));
      if (err < bestErr && sight(g.pos.x, g.pos.z, b.x, b.z, room.solids, 0.05) >= 1) {
        best = b;
        bestErr = err;
      }
    }
    const mx = this.gun.position.x + Math.sin(this.gun.rotation.y) * 0.5;
    const mz = this.gun.position.z + Math.cos(this.gun.rotation.y) * 0.5;
    if (best) {
      this.beam(mx, mz, best.x, best.z, this.green);
      best.stun = Math.max(1.6, 3 - this.level() * 0.3);
      best.aim = 0;
      this.tags++;
      this.combo = this.comboLeft > 0 ? this.combo + 1 : 1;
      this.comboLeft = 4;
      const pts = Math.round((100 + (this.combo - 1) * 25) * (1 + (this.level() - 1) * 0.15));
      this.score += pts;
      g.sound.swish();
      this.say(this.combo > 1 ? `TAG x${this.combo}  +${pts}` : `TAG  +${pts}`, 1.2);
      g.heading = Math.atan2(best.x - g.pos.x, best.z - g.pos.z);
    } else {
      const fx = Math.sin(g.camYaw);
      const fz = Math.cos(g.camYaw);
      const t = sight(g.pos.x, g.pos.z, g.pos.x + fx * 30, g.pos.z + fz * 30, room.solids, 0.05);
      this.beam(mx, mz, g.pos.x + fx * 30 * t, g.pos.z + fz * 30 * t, this.green);
      g.heading = g.camYaw;
    }
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
    // The blaster rides at Benji's hip and points where he is looking.
    this.gun.visible = this.down <= 0;
    this.gun.position.set(g.pos.x + Math.sin(g.camYaw) * 0.3 - Math.cos(g.camYaw) * 0.3, 1.02 + (this.cool > 0.26 ? 0.04 : 0), g.pos.z + Math.cos(g.camYaw) * 0.3 + Math.sin(g.camYaw) * 0.3);
    this.gun.rotation.y = g.camYaw;
    if (live && this.cool <= 0 && input.down("action")) this.fire();
    const lv = this.level();

    // Taggers.
    for (const b of this.bots) {
      b.card.visible = true;
      const stunned = b.stun > 0;
      b.stun -= dt;
      (b.lamp.material as THREE.MeshBasicMaterial).color.setRGB(stunned ? 0.15 : 3, stunned ? 0.15 : b.aim > 0 && Math.sin(g.time * 40) > 0 ? 2.4 : 0.4, stunned ? 0.2 : 2.2);
      const dx = b.tx - b.x;
      const dz = b.tz - b.z;
      const dist = Math.hypot(dx, dz);
      const sees = live && !stunned && Math.hypot(g.pos.x - b.x, g.pos.z - b.z) < 15 + lv && sight(b.x, b.z, g.pos.x, g.pos.z, room.solids, 0.05) >= 1;
      b.gun.visible = !stunned;
      b.gun.position.set(b.x + Math.sin(b.card.heading) * 0.3 + Math.cos(b.card.heading) * 0.28, 1.02, b.z + Math.cos(b.card.heading) * 0.3 - Math.sin(b.card.heading) * 0.28);
      b.gun.rotation.y = b.card.heading;
      if (dist < 0.5 || b.stuck > 1.2) {
        // Next stop: any node this one can walk straight to.
        const open = room.nodes.filter((nd) => Math.hypot(nd.x - b.x, nd.z - b.z) > 3 && sight(b.x, b.z, nd.x, nd.z, room.solids, 0.45) >= 1);
        // Later on they stop wandering and close in on wherever Benji is.
        const hunt = live && Math.random() < 0.2 + lv * 0.13;
        const near = hunt ? [...open].sort((p, q) => Math.hypot(p.x - g.pos.x, p.z - g.pos.z) - Math.hypot(q.x - g.pos.x, q.z - g.pos.z))[0] : undefined;
        const pick = near ?? open[Math.floor(Math.random() * open.length)] ?? room.nodes[Math.floor(Math.random() * room.nodes.length)]!;
        b.tx = pick.x;
        b.tz = pick.z;
        b.stuck = 0;
      }
      let moved = 0;
      if (live && b.aim <= 0 && dist > 0.01) {
        const v = stunned ? 3.4 : 2.4 + lv * 0.36;
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
      if (sees && b.aim <= 0 && b.cool <= 0) b.aim = 0.78 - lv * 0.07;
      if (b.aim > 0) {
        b.card.heading = Math.atan2(g.pos.x - b.x, g.pos.z - b.z);
        b.aim -= dt;
        if (b.aim <= 0) {
          b.cool = (2.2 + Math.random() * 1.6) * (1 - lv * 0.09);
          const clear = !stunned && sight(b.x, b.z, g.pos.x, g.pos.z, room.solids, 0.05) >= 1;
          if (clear) {
            const hit = this.shield <= 0 && Math.random() < (speed > 3.2 ? 0.28 + lv * 0.03 : 0.6 + lv * 0.05);
            const miss = hit ? 0 : (Math.random() > 0.5 ? 1 : -1) * 0.9;
            this.beam(b.gun.position.x + Math.sin(b.card.heading) * 0.5, b.gun.position.z + Math.cos(b.card.heading) * 0.5, g.pos.x + miss, g.pos.z + miss, this.pink);
            g.sound.release();
            if (hit) {
              this.vest--;
              this.gotHit = 0.5;
              this.combo = 0;
              g.sound.bad();
              g.stage.setPunch(0.8);
              g.input.rumble(0.8, 220);
              if (this.vest <= 0) {
                // Vest dark: out for three seconds, and it costs.
                this.score = Math.max(0, this.score - 200);
                this.down = 3;
                this.shield = 3;
                g.vel.x = g.vel.z = 0;
                this.say("VEST DOWN  -200", 2);
              } else {
                this.score = Math.max(0, this.score - 50);
                this.shield = 1.2;
                this.say(`TAGGED  -50   ${this.vest} left on the vest`, 1.3);
              }
            }
          }
        }
      }
      b.card.place(b.x, b.z);
      b.card.update(dt, g.camera.position, g.tint, room.floorY + 0.03);
    }
    g.benji.mat.opacity = 1;
    g.benji.visible = this.shield <= 0 || Math.sin(g.time * 30) > 0;

    if (live) {
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
    const best = g.save.best.laser ?? 0;
    const record = this.score > best;
    if (record) g.save.best.laser = this.score;
    payTickets(
      g,
      this.score >= 1500 ? "ARENA MVP" : "GAME OVER",
      this.tags >= 10 ? "They never saw you coming." : "Use the walls. They can't tag what they can't see.",
      [
        ["Score", String(this.score)],
        ["Tags", String(this.tags)],
        ["Record", String(Math.max(best, this.score))],
      ],
      Math.min(60, Math.floor(this.score / 40)),
      record,
      () => this.start(),
      () => this.leave(),
    );
  }

  private leave() {
    const g = this.g;
    if (this.leaving) return;
    this.leaving = true;
    g.benji.visible = true;
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
    h.laser = { phase: this.phase, count: this.count, left: Math.max(0, Math.ceil(this.left)), score: this.score, tags: this.tags, hit: this.gotHit > 0, call: this.call, vest: Math.max(0, this.vest), level: this.level(), down: this.down > 0 };
  }
}

// ------------------------------------------------------------------ trampoline

/** Thirty seconds on the big trampoline. Press on the landing to go higher; spin in the air for points. */
export class Bounce implements Activity {
  hints: [string, string][] = [
    ["Space", "Push off as you land"],
    ["A D", "Spin in the air"],
    ["Q", "Hop off"],
  ];
  private y = 0;
  private vy = 0;
  private left = 30;
  private score = 0;
  private best = 0;
  private apex = 0;
  private combo = 0;
  private spun = 0;
  private pressed = 9;
  private call = "";
  private callLeft = 0;
  private face = 0;
  private cam = new THREE.Vector3();
  private look = new THREE.Vector3();

  constructor(private g: Game) {}

  start() {
    const g = this.g;
    const t = g.rooms.fun.tramp;
    g.pos.x = t.x;
    g.pos.z = t.z;
    this.y = 0;
    this.vy = 5.4;
    this.left = 30;
    this.score = this.best = this.combo = this.spun = 0;
    this.apex = 0;
    this.pressed = 9;
    this.face = 0;
    this.say("Press Space right as you land.", 3);
    this.frame(0, true);
  }

  private say(text: string, seconds = 1.4) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    const t = g.rooms.fun.tramp;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    this.pressed += dt;
    if (input.hit("action")) this.pressed = 0;
    this.vy -= 12 * dt;
    this.y += this.vy * dt;
    this.apex = Math.max(this.apex, this.y);
    const spin = input.move().x;
    if (this.y > 0.4 && Math.abs(spin) > 0.2) {
      this.face -= spin * 9 * dt;
      this.spun += Math.abs(spin) * 9 * dt;
    }
    if (this.y <= 0 && this.vy < 0) {
      // Landing: tally the jump, then push off.
      const spins = Math.floor((this.spun + 0.9) / (Math.PI * 2));
      if (this.apex > 0.5) {
        this.best = Math.max(this.best, this.apex);
        let pts = Math.round(this.apex * 12);
        if (spins > 0) {
          this.combo++;
          pts += spins * 40 * Math.min(5, this.combo);
          this.say(`${spins === 1 ? "360" : spins === 2 ? "720" : "1080"}  x${this.combo}  +${pts}`);
        } else this.combo = 0;
        this.score += pts;
      }
      const timed = this.pressed < 0.16;
      const speed = -this.vy;
      this.vy = timed ? Math.min(9.3, Math.max(6, speed) + 1.7) : Math.max(4.6, speed * 0.8);
      if (timed && this.vy >= 9.2) this.say("MAX AIR");
      this.y = 0;
      this.apex = 0;
      this.spun = 0;
      this.face = 0;
      this.pressed = 9;
      g.sound.bounce(Math.min(1, this.vy / 9));
      g.push();
    }
    g.pos.x = t.x;
    g.pos.z = t.z;
    g.heading = this.face;
    g.benji.lift = t.y + this.y;
    g.benji.speed = 0;
    // Timing meter: fills as the bed comes up.
    const fall = this.vy < 0 ? clamp(1 - this.y / Math.max(0.4, this.apex), 0, 1) : 0;
    g.live.meter = fall;
    g.live.sweetLo = 0.86;
    g.live.sweetHi = 1;

    const before = Math.ceil(this.left);
    this.left -= dt;
    if (Math.ceil(this.left) !== before) {
      if (this.left <= 5) g.sound.countdown();
      g.push();
    }
    if (this.left <= 0) {
      const best = g.save.best.bounce ?? 0;
      const record = this.score > best;
      if (record) g.save.best.bounce = this.score;
      payTickets(
        g,
        "TIME",
        this.score > 600 ? "You were up there a while." : "Hit Space on the landing to climb, spin on the way up.",
        [
          ["Score", String(this.score)],
          ["Best air", `${this.best.toFixed(1)} m`],
          ["Record", String(Math.max(best, this.score))],
        ],
        Math.min(40, Math.floor(this.score / 60)),
        record,
        () => this.start(),
        () => this.quit(),
      );
      return;
    }
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const t = g.rooms.fun.tramp;
    this.cam.set(t.x + 6.4, 2.5 + this.y * 0.35, t.z + 3.4);
    this.look.set(t.x, 1.5 + this.y * 0.6, t.z);
    if (snap) g.camera.position.copy(this.cam);
    else g.camera.position.lerp(this.cam, damp(5, dt));
    g.camera.lookAt(this.look);
    if (g.camera.fov !== 52) {
      g.camera.fov = 52;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    const e = g.rooms.fun.trampEdge;
    g.benji.lift = 0;
    g.pos.x = e.x;
    g.pos.z = e.z;
    g.heading = Math.PI / 2;
    g.camYaw = -Math.PI / 2;
    g.end("walk");
  }

  hud(h: HudState) {
    h.bounce = { left: Math.max(0, Math.ceil(this.left)), best: this.best, combo: this.combo, score: this.score, call: this.call };
  }
}

// ------------------------------------------------------------------ ball pit

const PIT_BALLS = 460;
const _m = new THREE.Matrix4();

/** Wade through the balls and dig out the gold ones before the buzzer. */
export class BallPit implements Activity {
  hints: [string, string][] = [
    ["W A S D", "Wade"],
    ["Q", "Climb out"],
  ];
  private mesh: THREE.InstancedMesh;
  private home: Float32Array;
  private off: Float32Array;
  private gold: { x: number; z: number; found: boolean; mesh: THREE.Mesh; pop: number }[] = [];
  private left = 25;
  private found = 0;
  private call = "";
  private cam = new THREE.Vector3();
  private look = new THREE.Vector3();
  private ping = 0;

  constructor(private g: Game) {
    const pit = g.rooms.fun.pit;
    const geo = new THREE.SphereGeometry(0.15, 10, 8);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.35 }), PIT_BALLS);
    this.home = new Float32Array(PIT_BALLS * 3);
    this.off = new Float32Array(PIT_BALLS * 2);
    const cols = [0xff5ad1, 0x35e0d0, 0xffd23a, 0x39ff14, 0x5ac8ff, 0xff8a1e];
    const c = new THREE.Color();
    for (let i = 0; i < PIT_BALLS; i++) {
      const layer = i % 3;
      this.home[i * 3] = pit.minX + Math.random() * (pit.maxX - pit.minX);
      this.home[i * 3 + 1] = 0.16 + layer * 0.2 + Math.random() * 0.06;
      this.home[i * 3 + 2] = pit.minZ + Math.random() * (pit.maxZ - pit.minZ);
      this.mesh.setColorAt(i, c.setHex(cols[i % cols.length]!));
      _m.makeTranslation(this.home[i * 3]!, this.home[i * 3 + 1]!, this.home[i * 3 + 2]!);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    g.rooms.fun.group.add(this.mesh);
    const gm = new THREE.MeshStandardMaterial({ color: 0xffc83a, emissive: 0xa86a00, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), gm);
      mesh.visible = false;
      g.rooms.fun.group.add(mesh);
      this.gold.push({ x: 0, z: 0, found: false, mesh, pop: 0 });
    }
  }

  start() {
    const g = this.g;
    const pit = g.rooms.fun.pit;
    this.left = 25;
    this.found = 0;
    for (const t of this.gold) {
      t.x = pit.minX + 0.6 + Math.random() * (pit.maxX - pit.minX - 1.2);
      t.z = pit.minZ + 0.6 + Math.random() * (pit.maxZ - pit.minZ - 1.2);
      t.found = false;
      t.mesh.visible = false;
      t.pop = 0;
    }
    g.pos.x = pit.maxX - 0.6;
    g.pos.z = (pit.minZ + pit.maxZ) / 2;
    g.vel.x = g.vel.z = 0;
    this.call = "Eight gold balls are buried in here. Dig!";
    g.sound.splash(0.6);
    g.push();
    this.frame(0, true);
  }

  update(dt: number) {
    const g = this.g;
    const pit = g.rooms.fun.pit;
    const m = g.input.move();
    // The camera sits south-east of the pit; keep the controls square to it.
    const k = damp(8, dt);
    g.vel.x += ((m.x * 0.8 - m.y * 0.6) * 2.5 - g.vel.x) * k;
    g.vel.z += ((-m.y * 0.8 - m.x * 0.6) * 2.5 - g.vel.z) * k;
    g.pos.x = clamp(g.pos.x + g.vel.x * dt, pit.minX + 0.3, pit.maxX - 0.3);
    g.pos.z = clamp(g.pos.z + g.vel.z * dt, pit.minZ + 0.3, pit.maxZ - 0.3);
    const speed = Math.hypot(g.vel.x, g.vel.z);
    if (speed > 0.3) g.heading = dampAngle(g.heading, Math.atan2(g.vel.x, g.vel.z), damp(10, dt));
    g.benji.speed = speed * 0.6;
    g.benji.lift = -0.42 + Math.sin(g.time * 7) * 0.03 * Math.min(1, speed);

    // Balls part around him and settle back.
    const back = damp(2.2, dt);
    for (let i = 0; i < PIT_BALLS; i++) {
      const hx = this.home[i * 3]!;
      const hy = this.home[i * 3 + 1]!;
      const hz = this.home[i * 3 + 2]!;
      let ox = this.off[i * 2]!;
      let oz = this.off[i * 2 + 1]!;
      const dx = hx + ox - g.pos.x;
      const dz = hz + oz - g.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.62 && d > 1e-4) {
        const push = (0.62 - d) * 0.9;
        ox += (dx / d) * push;
        oz += (dz / d) * push;
      } else {
        ox -= ox * back;
        oz -= oz * back;
      }
      this.off[i * 2] = ox;
      this.off[i * 2 + 1] = oz;
      const lift = Math.min(0.3, Math.hypot(ox, oz) * 0.5);
      _m.makeTranslation(clamp(hx + ox, pit.minX - 0.2, pit.maxX + 0.2), hy + lift, clamp(hz + oz, pit.minZ - 0.2, pit.maxZ + 0.2));
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    let near = 99;
    for (const t of this.gold) {
      if (t.found) {
        if (t.pop > 0) {
          t.pop -= dt;
          t.mesh.position.y += dt * 2.6;
          t.mesh.rotation.y += dt * 9;
          if (t.pop <= 0) t.mesh.visible = false;
        }
        continue;
      }
      const d = Math.hypot(t.x - g.pos.x, t.z - g.pos.z);
      near = Math.min(near, d);
      if (d < 0.62) {
        t.found = true;
        t.pop = 0.8;
        t.mesh.visible = true;
        t.mesh.position.set(t.x, 0.9, t.z);
        this.found++;
        g.sound.cash();
        this.call = this.found === 8 ? "All eight!" : `Gold ball ${this.found} of 8`;
        g.push();
      }
    }
    this.ping -= dt;
    if (near < 3 && this.ping <= 0) {
      this.ping = 0.12 + near * 0.3;
      g.sound.ui();
    }
    const hint = near < 1.3 ? "Burning hot!" : near < 2.6 ? "Getting warmer..." : "Cold. Keep wading.";
    if (!this.call.startsWith("Gold") && !this.call.startsWith("All") && hint !== this.call && this.left < 23) {
      this.call = hint;
      g.push();
    } else if (this.call.startsWith("Gold") && Math.floor(this.left * 2) % 3 === 0) this.call = hint;

    const before = Math.ceil(this.left);
    this.left -= dt;
    if (Math.ceil(this.left) !== before) {
      if (this.left <= 5) g.sound.countdown();
      g.push();
    }
    if (this.left <= 0 || this.found === 8) {
      const best = g.save.best.pit ?? 0;
      const record = this.found > best;
      if (record) g.save.best.pit = this.found;
      payTickets(
        g,
        this.found === 8 ? "GOLD RUSH" : "BUZZER",
        this.found === 8 ? "Cleaned the whole pit out." : "Follow the pings. Faster means closer.",
        [
          ["Gold balls", `${this.found} of 8`],
          ["Record", String(Math.max(best, this.found))],
        ],
        this.found * 4 + (this.found === 8 ? 8 : 0),
        record,
        () => this.start(),
        () => this.quit(),
      );
      return;
    }
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const pit = g.rooms.fun.pit;
    const cx = (pit.minX + pit.maxX) / 2;
    const cz = (pit.minZ + pit.maxZ) / 2;
    this.cam.set(cx + 5.4, 4.6, cz + 7);
    this.look.set(lerpTo(cx, g.pos.x, 0.5), 0.5, lerpTo(cz, g.pos.z, 0.5));
    if (snap) g.camera.position.copy(this.cam);
    else g.camera.position.lerp(this.cam, damp(4, dt));
    g.camera.lookAt(this.look);
    if (g.camera.fov !== 50) {
      g.camera.fov = 50;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    const e = g.rooms.fun.pitEdge;
    for (const t of this.gold) t.mesh.visible = false;
    g.benji.lift = 0;
    g.pos.x = e.x;
    g.pos.z = e.z;
    g.heading = Math.PI / 2;
    g.camYaw = -Math.PI / 2;
    g.end("walk");
  }

  hud(h: HudState) {
    h.pit = { left: Math.max(0, Math.ceil(this.left)), found: this.found, total: 8, call: this.call };
  }
}

function lerpTo(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
