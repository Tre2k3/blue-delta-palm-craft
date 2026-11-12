import * as THREE from "three";
import { CarModel, RACE, type CarKind } from "../actors/vehicle";
import type { HudState } from "../core/types";
import { clamp, formatClock, wrapAngle } from "../core/util";
import type { Activity, Game } from "../game";
import { tex } from "../gfx/tex";

/** The circuit: Riverside, Danny Thomas, Union, Front. Rounded at the four junctions. */
const X0 = -128;
const X1 = 128;
const Z0 = -140;
const Z1 = -12;
const R = 8;
const START_X = -96;

type Seg = { line: true; x: number; z: number; dx: number; dz: number; len: number } | { line: false; cx: number; cz: number; a0: number; len: number };

const SEGS: Seg[] = [
  { line: true, x: START_X, z: Z0, dx: 1, dz: 0, len: X1 - R - START_X },
  { line: false, cx: X1 - R, cz: Z0 + R, a0: -Math.PI / 2, len: (Math.PI * R) / 2 },
  { line: true, x: X1, z: Z0 + R, dx: 0, dz: 1, len: Z1 - Z0 - 2 * R },
  { line: false, cx: X1 - R, cz: Z1 - R, a0: 0, len: (Math.PI * R) / 2 },
  { line: true, x: X1 - R, z: Z1, dx: -1, dz: 0, len: X1 - X0 - 2 * R },
  { line: false, cx: X0 + R, cz: Z1 - R, a0: Math.PI / 2, len: (Math.PI * R) / 2 },
  { line: true, x: X0, z: Z1 - R, dx: 0, dz: -1, len: Z1 - Z0 - 2 * R },
  { line: false, cx: X0 + R, cz: Z0 + R, a0: Math.PI, len: (Math.PI * R) / 2 },
  { line: true, x: X0 + R, z: Z0, dx: 1, dz: 0, len: START_X - X0 - R },
];
export const RACE_LENGTH = SEGS.reduce((s, g) => s + g.len, 0);
const LAPS = 3;

/** Where each bend starts, and the boost gates on the straights, in metres round the lap. */
const BENDS: number[] = [];
const GATES: number[] = [];
{
  let base = 0;
  for (const g of SEGS) {
    if (!g.line) BENDS.push(base);
    // Early on each straight, so a boost has road in front of it and not a wall.
    else if (g.len > 180) GATES.push(base + g.len * 0.22, base + g.len * 0.52);
    else if (g.len > 100) GATES.push(base + g.len * 0.32);
    base += g.len;
  }
}
/** How close to a gate the button has to land: dead on, or near enough. */
const PERFECT = 8;
const GOOD = 18;
const CUE_FROM = 48;

/** Point `s` metres round the circuit, `off` metres to the outside. `corner` is true on the bends. */
function at(s: number, off: number) {
  let t = ((s % RACE_LENGTH) + RACE_LENGTH) % RACE_LENGTH;
  for (const g of SEGS) {
    if (t > g.len) {
      t -= g.len;
      continue;
    }
    if (g.line) return { x: g.x + g.dx * t + g.dz * off, z: g.z + g.dz * t - g.dx * off, heading: Math.atan2(g.dx, g.dz), corner: false };
    const a = g.a0 + t / R;
    return { x: g.cx + Math.cos(a) * (R + off), z: g.cz + Math.sin(a) * (R + off), heading: Math.atan2(-Math.sin(a), Math.cos(a)), corner: true };
  }
  return { x: START_X, z: Z0, heading: Math.PI / 2, corner: false };
}

/** Closest place on the circuit: distance round and distance outside the line. */
function nearest(x: number, z: number) {
  let best = { s: 0, off: 0, d: 1e9 };
  let base = 0;
  for (const g of SEGS) {
    if (g.line) {
      const t = clamp((x - g.x) * g.dx + (z - g.z) * g.dz, 0, g.len);
      const px = g.x + g.dx * t;
      const pz = g.z + g.dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < best.d) best = { s: base + t, off: (x - px) * g.dz - (z - pz) * g.dx, d };
    } else {
      const a = clamp(wrapAngle(Math.atan2(z - g.cz, x - g.cx) - g.a0), 0, Math.PI / 2);
      const rr = Math.hypot(x - g.cx, z - g.cz);
      const px = g.cx + Math.cos(g.a0 + a) * R;
      const pz = g.cz + Math.sin(g.a0 + a) * R;
      const d = Math.hypot(x - px, z - pz);
      if (d < best.d) best = { s: base + a * R, off: rr - R, d };
    }
    base += g.len;
  }
  return best;
}

type Rival = { name: string; model: CarModel; s: number; off: number; speed: number; top: number; done: number; x: number; z: number; heading: number };

/** Three laps of downtown against Nitro and two of his people. Traffic is cleared for it. */
export class StreetRace implements Activity {
  hints: [string, string][] = [
    ["W S", "Gas, brake"],
    ["A D", "Steer"],
    ["E", "Hit it on GO and on every gate: boost"],
    ["Shift", "Nitro"],
    ["Space", "Handbrake: drift builds nitro"],
    ["Q", "Quit the race"],
  ];
  /** The line to follow, painted on the road ahead; the gates; the boards on the bends. */
  private guide: THREE.Mesh[] = [];
  private gates: THREE.Group[] = [];
  private dressing = new THREE.Group();
  private guideMat: [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial];
  /** Next gate, counted from the start of the race. */
  private gate = 0;
  /** Seconds of free boost left from a gate or the launch. */
  private kick = 0;
  private goAt = -1;
  private jumped = 0;
  private launched = false;
  private perfects = 0;
  private rivals: Rival[] = [];
  private phase: "count" | "go" | "finish" = "count";
  private count = 3;
  private clock = 0;
  private time = 0;
  /** Player distance from the start line, all laps. */
  private prog = 0;
  private lapStart = 0;
  private bestLap = 0;
  private nitro = 0.5;
  private wrong = 0;
  private offRoute = 0;
  private call = "";
  private callLeft = 0;
  private place = 4;
  private firstDone = -1;

  constructor(private g: Game) {
    const spec: [string, CarKind, number, number][] = [
      ["Nitro", "coupe", 0xb3261c, 33.8],
      ["Deuce", "sedan", 0x23406a, 32.2],
      ["Big Tone", "suv", 0x1b1d21, 30.8],
    ];
    for (const [name, kind, color, top] of spec) {
      const model = new CarModel(kind, color);
      model.group.visible = false;
      g.city.exterior.add(model.group);
      this.rivals.push({ name, model, s: 0, off: 0, speed: 0, top, done: -1, x: 0, z: 0, heading: 0 });
    }
    // Chevrons on the road: green down the straights, yellow through the bends.
    const chev = new THREE.Shape();
    chev.moveTo(0, 2.2);
    chev.lineTo(2.6, -0.6);
    chev.lineTo(2.6, -2.2);
    chev.lineTo(0, 0.6);
    chev.lineTo(-2.6, -2.2);
    chev.lineTo(-2.6, -0.6);
    chev.closePath();
    const chevGeo = new THREE.ShapeGeometry(chev);
    chevGeo.rotateX(Math.PI / 2);
    const mat = (r: number, gr: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, gr, b), toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    this.guideMat = [mat(0.3, 2.4, 0.2), mat(2.6, 1.9, 0.2)];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(chevGeo, this.guideMat[0]);
      m.renderOrder = 2;
      this.guide.push(m);
      this.dressing.add(m);
    }
    // Boost gates: a lit strip across the road between two posts.
    const strip = new THREE.MeshBasicMaterial({
      map: tex(256, 64, (c, w, h) => {
        c.fillStyle = "#06220a";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#39ff14";
        c.font = `900 44px "Arial Black", Impact, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("BOOST  ›››  E", w / 2, h / 2 + 2);
      }),
      toneMapped: false,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const post = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 3, 0.3), toneMapped: false });
    for (const gs of GATES) {
      const p = at(gs, 0);
      const group = new THREE.Group();
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 2.6), strip);
      floor.rotation.x = -Math.PI / 2;
      // Turned so the words read the right way up for whoever is driving at them.
      floor.rotation.z = Math.PI;
      floor.position.y = 0.17;
      floor.renderOrder = 2;
      group.add(floor);
      for (const sx of [-5.6, 5.6]) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8), post);
        m.position.set(sx, 2.2, 0);
        group.add(m);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.16, 0.16), post);
      bar.position.y = 4.4;
      group.add(bar);
      group.position.set(p.x, 0, p.z);
      group.rotation.y = p.heading;
      this.gates.push(group);
      this.dressing.add(group);
    }
    // A board of chevrons dead ahead at every bend, where the road runs out.
    const board = new THREE.MeshBasicMaterial({
      map: tex(256, 96, (c, w, h) => {
        c.fillStyle = "#0b0b0d";
        c.fillRect(0, 0, w, h);
        c.strokeStyle = "#ffd23a";
        c.lineWidth = 12;
        c.lineJoin = "miter";
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(26 + i * 58, 14);
          c.lineTo(62 + i * 58, h / 2);
          c.lineTo(26 + i * 58, h - 14);
          c.stroke();
        }
      }),
      toneMapped: false,
    });
    for (const bs of BENDS) {
      const p = at(bs - 0.5, 0);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), board);
      m.position.set(p.x + Math.sin(p.heading) * (R + 12.5), 3.4, p.z + Math.cos(p.heading) * (R + 12.5));
      m.rotation.y = p.heading + Math.PI;
      this.dressing.add(m);
    }
    this.dressing.visible = false;
    g.city.exterior.add(this.dressing);
  }

  start() {
    const g = this.g;
    g.traffic.hidden = true;
    g.benji.visible = false;
    const grid: [number, number][] = [
      [-5, 2.5],
      [-5, -2.5],
      [-13, 2.5],
    ];
    this.rivals.forEach((r, i) => {
      r.s = grid[i]![0];
      r.off = grid[i]![1];
      r.speed = 0;
      r.done = -1;
      r.model.group.visible = true;
      this.pose(r, 0);
    });
    const p = at(-13, -2.5);
    g.driver.reset(p.x, p.z, p.heading);
    g.driver.y = 0;
    g.car.place(p.x, 0, p.z, p.heading);
    this.phase = "count";
    this.count = 3;
    this.clock = 0;
    this.time = 0;
    this.prog = -13;
    this.lap = 0;
    this.lapStart = 0;
    this.bestLap = 0;
    this.nitro = 0.5;
    this.wrong = 0;
    this.offRoute = 0;
    this.firstDone = -1;
    this.place = 4;
    this.gate = 0;
    this.kick = 0;
    this.goAt = -1;
    this.jumped = 0;
    this.launched = false;
    this.perfects = 0;
    this.dressing.visible = true;
    for (const gt of this.gates) gt.visible = true;
    this.say("Follow the arrows. Hit E on GO and on every gate.", 3);
    g.sound.countdown();
    g.chaseCar(0, g.driver, 8.8, 3, true);
  }

  private say(text: string, seconds = 2) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  private pose(r: Rival, travel: number) {
    const p = at(r.s, r.off);
    const lean = wrapAngle(p.heading - r.heading);
    r.x = p.x;
    r.z = p.z;
    r.heading = p.heading;
    r.model.place(p.x, 0, p.z, p.heading);
    r.model.roll(travel, clamp(-lean * 8, -0.5, 0.5));
    r.model.lamps(this.g.sky.look.lights > 0.4 ? 3 : 0.2, 0.5);
  }

  private rival(r: Rival, dt: number) {
    const g = this.g;
    if (r.done >= 0 && r.s > RACE_LENGTH * LAPS + 60) {
      r.speed = Math.max(0, r.speed - 20 * dt);
    } else {
      // Brake into the bends, hold the line through them, then back on it.
      const here = at(r.s, 0);
      const soon = at(r.s + 10 + r.speed * 0.9, 0);
      let want = here.corner ? 15.5 : soon.corner ? 17 : r.top;
      const gap = r.s - this.prog;
      if (gap > 45) want *= 0.84;
      else if (gap < -70) want *= 1.08;
      // Do not drive through the player.
      const d = g.driver;
      const ahead = (d.x - r.x) * Math.sin(r.heading) + (d.z - r.z) * Math.cos(r.heading);
      const sideways = (d.x - r.x) * Math.cos(r.heading) - (d.z - r.z) * Math.sin(r.heading);
      let lane = r.off;
      if (ahead > 0 && ahead < 14 && Math.abs(sideways) < 2.4) {
        lane += (sideways > 0 ? 1 : -1) * 6 * dt;
        if (ahead < 6) want = Math.min(want, d.speed + 1);
      }
      r.off = clamp(lane, -3.4, 3.4);
      const rate = want < r.speed ? 18 : 9.5;
      r.speed += clamp(want - r.speed, -rate * dt, rate * dt);
    }
    const travel = r.speed * dt;
    r.s += travel;
    this.pose(r, travel);
    if (r.done < 0 && r.s >= RACE_LENGTH * LAPS) {
      r.done = this.time;
      if (this.firstDone < 0) this.firstDone = this.time;
    }
  }

  update(dt: number) {
    const g = this.g;
    const d = g.driver;
    const m = g.input.move();
    const gas = g.input.throttle();
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
          this.goAt = 0;
          g.sound.countdown(true);
          this.say("GO!", 1);
        } else g.sound.countdown();
        g.push();
      }
      // Too keen on the button before the light costs a moment off the line.
      if (this.phase === "count" && g.input.hit("interact") && !(this.count === 1 && this.clock > 0.82)) {
        this.jumped = 0.9;
        this.launched = true;
        this.say("JUMPED IT", 1);
        g.sound.bad();
      } else if (this.phase === "count" && g.input.hit("interact")) this.launch();
      d.step(dt, { throttle: 0, steer: 0, handbrake: true, boost: false }, RACE, g.city.carSolids);
      g.sound.setEngine(true, gas > 0 ? 0.5 + Math.sin(g.time * 30) * 0.05 : 0.1);
    } else {
      if (this.phase === "go") this.time += dt;
      if (this.goAt >= 0) this.goAt += dt;
      if (this.phase === "go" && g.input.hit("interact")) {
        if (!this.launched && this.goAt < 0.4) this.launch();
        else this.press();
      }
      this.jumped -= dt;
      this.kick -= dt;
      const free = this.kick > 0;
      const boosting = this.phase === "go" && (free || (g.input.down("run") && this.nitro > 0.02 && gas > 0));
      if (boosting) {
        if (this.nitro === 1 || !this.boostWas) g.sound.nitro();
        if (!free) this.nitro = Math.max(0, this.nitro - 0.36 * dt);
      } else this.nitro = Math.min(1, this.nitro + (g.wearing("tour_red") ? 0.11 : 0.065) * dt + (d.slip > 4 && d.speed > 10 ? 0.2 * dt : 0));
      this.boostWas = boosting;
      const done = this.phase === "finish";
      d.step(dt, { throttle: done || this.jumped > 0 ? 0 : free ? Math.max(gas, 0.9) : gas, steer: m.x, handbrake: done || g.input.down("action"), boost: boosting }, RACE, g.city.carSolids);
      for (const r of this.rivals) {
        const hit = d.bump(r.x, r.z, 1.3);
        if (hit > 2) {
          g.sound.crash(Math.min(1, hit / 14));
          r.speed *= 0.94;
        }
      }
      if (d.hit > 3) {
        g.sound.crash(Math.min(1, d.hit / 16));
        g.stage.setPunch(0.5);
        g.input.rumble(Math.min(1, d.hit / 12), 200);
      }
      if (boosting) g.input.rumble(0.25, 60);
      if (d.slip > 5 && d.speed > 8) g.sound.skid(Math.min(1, d.slip / 12));
      g.sound.setEngine(true, d.speed / RACE.top, boosting);
      for (const r of this.rivals) this.rival(r, dt);

      // Where the player is on the route. Cutting a corner through town does not count.
      const n = nearest(d.x, d.z);
      const lapS = ((this.prog % RACE_LENGTH) + RACE_LENGTH) % RACE_LENGTH;
      let delta = n.s - lapS;
      if (delta > RACE_LENGTH / 2) delta -= RACE_LENGTH;
      if (delta < -RACE_LENGTH / 2) delta += RACE_LENGTH;
      const on = Math.abs(n.off) < 15 && delta > -40 && delta < 70;
      if (on) {
        this.prog += delta;
        this.offRoute = 0;
      } else this.offRoute += dt;
      const head = at(n.s, 0).heading;
      const along = d.vx * Math.sin(head) + d.vz * Math.cos(head);
      this.wrong = on && along < -3 ? this.wrong + dt : !on && this.offRoute > 1.2 ? this.wrong + dt : 0;

      if (this.phase === "go") {
        const lap = Math.floor(Math.max(0, this.prog) / RACE_LENGTH);
        if (lap > this.lap) {
          const t = this.time - this.lapStart;
          this.lapStart = this.time;
          if (!this.bestLap || t < this.bestLap) this.bestLap = t;
          this.lap = lap;
          if (lap < LAPS) {
            this.say(lap === LAPS - 1 ? `Final lap!  ${formatClock(t)}` : `Lap ${lap + 1}  ${formatClock(t)}`, 2.2);
            this.nitro = Math.min(1, this.nitro + 0.25);
            g.sound.ui();
          }
        }
        this.place = 1 + this.rivals.filter((r) => r.s > this.prog).length;
        if (this.prog >= RACE_LENGTH * LAPS) this.finish(false);
        else if (this.firstDone >= 0 && this.time - this.firstDone > 40) this.finish(true);
      }
    }

    this.dress();
    g.car.place(d.x, d.y, d.z, d.heading);
    g.car.roll(d.forward * dt, d.steer * 0.5);
    g.car.lean(-d.steer * Math.min(1, d.speed / 20) * 0.06, 0);
    g.car.lamps(g.sky.look.lights > 0.4 ? 3 : 0.2, gas < 0 ? 3 : 0.5);
    g.pos.x = d.x;
    g.pos.z = d.z;
    g.heading = d.heading;
    g.live.speed = d.speed * 2.237;
    g.live.nitro = this.nitro;
    g.chaseCar(dt, d, 8.8, 3);
  }

  private boostWas = false;
  private lap = 0;

  /** E inside the launch window: off the line under boost. */
  private launch() {
    const g = this.g;
    this.launched = true;
    this.kick = 1.7;
    this.perfects++;
    this.say("PERFECT LAUNCH", 1.2);
    g.sound.nitro();
    g.stage.setPunch(0.5);
    g.input.rumble(0.7, 220);
  }

  /** E on the way to a gate. Dead on the strip is a full boost, close is half of one, early is nothing. */
  private press() {
    const g = this.g;
    const d = g.driver;
    const lap = Math.floor(this.gate / GATES.length);
    const cue = lap * RACE_LENGTH + GATES[this.gate % GATES.length]! - this.prog;
    if (cue > CUE_FROM) return;
    const off = Math.abs(cue);
    this.gate++;
    if (off > GOOD) {
      this.say("TOO EARLY", 0.8);
      g.sound.bad();
      return;
    }
    const perfect = off <= PERFECT;
    this.kick = perfect ? 1.5 : 0.8;
    this.nitro = Math.min(1, this.nitro + (perfect ? 0.22 : 0.1));
    const shove = perfect ? 7 : 3.5;
    d.vx += Math.sin(d.heading) * shove;
    d.vz += Math.cos(d.heading) * shove;
    if (perfect) this.perfects++;
    this.say(perfect ? "PERFECT BOOST" : "BOOST", 0.9);
    g.sound.nitro();
    g.stage.setPunch(perfect ? 0.5 : 0.25);
    g.input.rumble(perfect ? 0.8 : 0.4, 200);
  }

  /** The arrows on the road ahead, which gate is live, and what the HUD needs to cue the player. */
  private dress() {
    const g = this.g;
    const racing = this.phase !== "finish";
    const lapS = ((this.prog % RACE_LENGTH) + RACE_LENGTH) % RACE_LENGTH;
    const first = Math.ceil((this.prog + 12) / 13) * 13;
    this.guide.forEach((m, i) => {
      const p = at(first + i * 13, 0);
      m.visible = racing;
      m.position.set(p.x, 0.19, p.z);
      m.rotation.y = p.heading;
      m.material = this.guideMat[p.corner ? 1 : 0];
    });
    // A gate that has gone by is used up: move on to the next one.
    let cue = 999;
    if (racing && this.phase === "go") {
      let lap = Math.floor(this.gate / GATES.length);
      let dist = lap * RACE_LENGTH + GATES[this.gate % GATES.length]! - this.prog;
      if (dist < -GOOD) {
        this.gate++;
        lap = Math.floor(this.gate / GATES.length);
        dist = lap * RACE_LENGTH + GATES[this.gate % GATES.length]! - this.prog;
      }
      if (lap < LAPS && dist < CUE_FROM) cue = dist;
    }
    this.gates.forEach((gt, i) => {
      // The live gate pulses, so it reads from a long way back.
      const live = i === this.gate % GATES.length;
      gt.scale.y = live ? 1 + Math.sin(g.time * 8) * 0.06 : 1;
    });
    g.live.cue = cue;
    let turn = -1;
    if (racing) {
      for (const b of BENDS) {
        let ahead = b - lapS;
        if (ahead < -2) ahead += RACE_LENGTH;
        if (ahead < 95 && (turn < 0 || ahead < turn)) turn = Math.max(0, ahead);
      }
    }
    g.live.turn = turn;
  }

  private finish(dnf: boolean) {
    const g = this.g;
    this.phase = "finish";
    const place = dnf ? 4 : 1 + this.rivals.filter((r) => r.done >= 0).length;
    this.place = place;
    const best = g.save.best.race ?? 0;
    const record = !dnf && (!best || this.time < best);
    if (record) g.save.best.race = Math.round(this.time * 100) / 100;
    const got = g.earn([150, 60, 30, 10][place - 1]!, [12, 6, 3, 1][place - 1]!, { race: true });
    if (place === 1) g.award("blue_901");
    if (place === 1) g.moment(3);
    g.emit("race", place);
    g.showResults(
      {
        win: place === 1,
        title: dnf ? "LEFT BEHIND" : place === 1 ? "YOU RUN THE STRIP" : `FINISHED ${["1ST", "2ND", "3RD", "4TH"][place - 1]}`,
        sub: place === 1 ? "Nitro's going to want a rematch." : "Nitro's waiting at the line. Drift for nitro, boost the straights.",
        rows: [
          ["Place", `${place} of 4`],
          ["Time", dnf ? "DNF" : formatClock(this.time)],
          ["Best lap", this.bestLap ? formatClock(this.bestLap) : "--"],
          ["Perfect boosts", String(this.perfects)],
          ["Record", g.save.best.race ? formatClock(g.save.best.race) : "--"],
        ],
        pay: got.dollars,
        respect: got.respect,
        tickets: 0,
        record,
        again: "Rematch",
      },
      () => {
        this.lap = 0;
        this.start();
      },
      () => this.leave(),
    );
  }

  private leave() {
    const g = this.g;
    for (const r of this.rivals) r.model.group.visible = false;
    this.dressing.visible = false;
    g.live.cue = 999;
    g.live.turn = -1;
    g.traffic.hidden = false;
    this.lap = 0;
    g.driver.vx = g.driver.vz = 0;
    g.live.nitro = 0;
    g.end("drive");
  }

  quit() {
    this.leave();
  }

  hud(h: HudState) {
    h.race = {
      phase: this.phase,
      count: this.count,
      lap: Math.min(LAPS, this.lap + 1),
      laps: LAPS,
      place: this.place,
      racers: 4,
      time: this.time,
      best: this.g.save.best.race ?? 0,
      call: this.call,
      wrongWay: this.wrong > 1,
      kart: false,
    };
  }
}
