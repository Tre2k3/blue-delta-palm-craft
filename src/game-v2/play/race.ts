import { CarModel, RACE, type CarKind } from "../actors/vehicle";
import type { HudState } from "../core/types";
import { clamp, formatClock, wrapAngle } from "../core/util";
import type { Activity, Game } from "../game";

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
    ["Shift", "Nitro"],
    ["Space", "Handbrake: drift builds nitro"],
    ["Q", "Quit the race"],
  ];
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
    this.say("Three laps. Riverside, Danny Thomas, Union, Front.", 3);
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
          g.sound.countdown(true);
          this.say("GO!", 1);
        } else g.sound.countdown();
        g.push();
      }
      d.step(dt, { throttle: 0, steer: 0, handbrake: true, boost: false }, RACE, g.city.carSolids);
      g.sound.setEngine(true, gas > 0 ? 0.5 + Math.sin(g.time * 30) * 0.05 : 0.1);
    } else {
      if (this.phase === "go") this.time += dt;
      const boosting = this.phase === "go" && g.input.down("run") && this.nitro > 0.02 && gas > 0;
      if (boosting) {
        if (this.nitro === 1 || !this.boostWas) g.sound.nitro();
        this.nitro = Math.max(0, this.nitro - 0.36 * dt);
      } else this.nitro = Math.min(1, this.nitro + (g.wearing("tour_red") ? 0.11 : 0.065) * dt + (d.slip > 4 && d.speed > 10 ? 0.2 * dt : 0));
      this.boostWas = boosting;
      const done = this.phase === "finish";
      d.step(dt, { throttle: done ? 0 : gas, steer: m.x, handbrake: done || g.input.down("action"), boost: boosting }, RACE, g.city.carSolids);
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

  private finish(dnf: boolean) {
    const g = this.g;
    this.phase = "finish";
    const place = dnf ? 4 : 1 + this.rivals.filter((r) => r.done >= 0).length;
    this.place = place;
    const best = g.save.best.race ?? 0;
    const record = !dnf && (!best || this.time < best);
    if (record) g.save.best.race = Math.round(this.time * 100) / 100;
    const got = g.earn([150, 60, 30, 10][place - 1]!, [12, 6, 3, 1][place - 1]!, { race: true });
    if (place === 1) g.sound.cheer();
    g.emit("race", place);
    g.showResults(
      {
        title: dnf ? "LEFT BEHIND" : place === 1 ? "YOU RUN THE STRIP" : `FINISHED ${["1ST", "2ND", "3RD", "4TH"][place - 1]}`,
        sub: place === 1 ? "Nitro's going to want a rematch." : "Nitro's waiting at the line. Drift for nitro, boost the straights.",
        rows: [
          ["Place", `${place} of 4`],
          ["Time", dnf ? "DNF" : formatClock(this.time)],
          ["Best lap", this.bestLap ? formatClock(this.bestLap) : "--"],
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
