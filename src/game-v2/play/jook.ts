import * as THREE from "three";
import { Card } from "../actors/card";
import { Troupe, type Stop } from "../actors/crowd";
import { JOOKERS, PEDS } from "../assets/cast";
import { TUNES } from "../core/band";
import { JOOK_LEAD } from "../core/keys";
import type { HudState } from "../core/types";
import { clamp, damp, lerp, rng } from "../core/util";
import type { Activity, Game } from "../game";
import { CURB, CYPHER as C } from "../world/map";

const Y0 = CURB;
const BPM = TUNES.jook!.bpm;
/** How near the beat a move has to land, in beats either side of it: dead on, and near enough. */
const PERFECT = 0.13;
const GOOD = 0.26;
const ROUNDS = 3;
const ROUND_BEATS = 24;
const ANSWER_BEATS = 8;
/** What each lane is asked for with: glide left, buck, up on the toes, glide right, and the spin. */
const LANES = ["left", "down", "up", "right", "action"] as const;
const SPIN = 4;
/** How far he can glide off the middle of the lino. */
const REACH = 1.7;
/** How many moves the HUD is told about at once. */
const SHOWN = 24;

type Note = { beat: number; lane: number; state: 0 | 1 | 2 };
type Dancer = { card: Card; name: string; hx: number; hz: number; x: number; z: number };

/** Eight beats of somebody who has the floor: the drawing, and where across the lino it is done. */
const FLOW: [string, number][] = [
  ["jook-glide", -0.95],
  ["jook-toes", -0.95],
  ["jook-glide-r", 0.05],
  ["jook-glide-r", 1],
  ["jook-buck", 1],
  ["jook-toes", 1],
  ["jook-glide", 0],
  ["jook-spin", 0],
];
/** What the one waiting does on the edge: a two-step. */
const TWO = ["jook-glide", "jook-toes", "jook-glide-r", "jook-toes"];
/** Benji on his own by the ring, with nobody asking anything of him. */
const FREE = ["jook-heel", "jook-glide", "jook-toes", "jook-heel-r", "jook-glide-r", "jook-buck"];

const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();

/**
 * The cypher in Handy Park. Two jookers trade the floor all day and night to a Memphis beat
 * with a ring of people round them. Benji can take it: three rounds on the lino, each move
 * called two beats ahead and landed on the beat, with one of the two answering him between
 * rounds. Glides carry him across the floor; the crowd warms up or cools off with his timing.
 */
export class Jook implements Activity {
  hints: [string, string][] = [
    ["A D", "Glide"],
    ["W", "Toes"],
    ["S", "Buck"],
    ["Space", "Spin"],
    ["Q", "Walk away"],
  ];
  /** Keep our own count and never follow the speaker's: for a run that must come out the same every time. */
  metronome = false;
  private dancers: Dancer[] = [];
  private ring: Troupe;
  private on = false;
  private phase: "count" | "dance" | "watch" | "bow" | "over" = "count";
  private notes: Note[] = [];
  private max = 1;
  /** Beats into the routine: below zero is the count-in. */
  private beat = -4;
  /** The speaker's beat our zero sits on, while we are following it. */
  private origin = 0;
  private synced = false;
  /** Beats since the park opened, for when nobody is playing and the speaker cannot be heard. */
  private idleBeat = 0;
  private clock = 0;
  private score = 0;
  private combo = 0;
  private longest = 0;
  private tally = { perfect: 0, good: 0, miss: 0 };
  /** 0 to 1: how much the ring is with him. */
  private heat = 0.3;
  private roared = -99;
  private level = 0;
  private runs = 0;
  private round = 0;
  private call = "";
  /** The last move he made, when, and where across the floor he is gliding to. */
  private move = -1;
  private moveAt = -99;
  private slide = 0;
  private slideTo = 0;
  private wx = C.x;
  private wz = C.z;
  private look = new THREE.Vector3();
  private loiter = 0;
  private ticked = -99;

  constructor(private g: Game) {
    JOOKERS.forEach((j, i) => {
      const card = new Card(j.art, j.height);
      const hx = C.x + (i ? 2.95 : -2.95);
      const hz = C.z - 1.5;
      card.place(hx, hz);
      g.city.exterior.add(card.group);
      this.dancers.push({ card, name: j.name, hx, hz, x: hx, z: hz });
    });
    // The ring: down both sides of the lino and across the back, between the speakers.
    const few = g.stage.quality === "low";
    const ring = (this.ring = new Troupe(g.city.exterior, g.city.solids, null, 43));
    const at = (dx: number, dz: number, act: Stop["act"]): Stop => ({ x: C.x + dx, z: C.z + dz, fx: C.x, fz: C.z, act });
    const stops = [at(-4.05, -2.3, "watch"), at(4.1, -0.7, "dance"), at(-4.3, -0.6, "cheer"), at(4.05, -2.4, "watch"), at(-4.1, 1.2, "dance"), at(4.15, 1.1, "cheer"), at(-0.6, -4.05, "dance"), at(0.95, -4.15, "watch")];
    stops.slice(0, few ? 5 : stops.length).forEach((s, i) => {
      const w = PEDS[(i * 5 + 2) % PEDS.length]!;
      ring.post(w.art, w.height, s);
    });
  }

  /** The speaker's count while it can be heard, ours when it cannot. */
  private pulse(dt: number) {
    const b = this.g.sound.beat("jook");
    this.idleBeat = b >= 0 ? b : this.idleBeat + (dt * BPM) / 60;
    return this.idleBeat;
  }

  /** The names of the two who hold the floor, for whoever asks. */
  get names() {
    return this.dancers.map((d) => d.name);
  }

  /** How far off the ring is still drawn, and whether the lens is inside that. */
  private get reach() {
    return this.g.stage.quality === "low" ? 115 : 150;
  }

  private seen() {
    const cam = this.g.camera.position;
    return Math.abs(cam.x - C.x) + Math.abs(cam.z - C.z) < this.reach;
  }

  /** The cypher goes on whether or not Benji is in it: the two trade the floor every four bars. */
  idle(dt: number) {
    if (this.on) return;
    const g = this.g;
    const beat = this.pulse(dt);
    const near = Math.hypot(g.pos.x - C.x, g.pos.z - C.z);
    if (!this.seen()) for (const d of this.dancers) d.card.visible = d.card.group.visible = false;
    else {
      const lead = Math.floor(beat / 16) % 2;
      this.dancers.forEach((d, i) => this.dance(d, i, beat, i === lead, dt));
    }
    this.ring.update(dt, g.camera.position, g.tint, g.mode === "walk" ? g.pos : null, g.time, beat / 1.58, this.reach);
    // Stood by the ring with the beat going, he does not stay still for long.
    const still = g.mode === "walk" && !g.overlay && g.benji.speed < 0.2 && near < 6.5 && near > 1;
    this.loiter = still ? this.loiter + dt : 0;
    if (this.loiter > 1.4 && g.benji.has("jook-glide")) g.benji.pose = FREE[Math.floor(beat / 2) % FREE.length]!;
    else if (g.benji.pose?.startsWith("jook-")) g.benji.pose = null;
  }

  /** One of the two, a frame: the one with the floor works across it, the other keeps time on the edge. */
  private dance(d: Dancer, i: number, beat: number, lead: boolean, dt: number) {
    const g = this.g;
    const cam = g.camera.position;
    const k = Math.floor(beat);
    const f = beat - k;
    let pose: string;
    let tx = d.hx;
    let tz = d.hz;
    let lift = 0;
    if (lead) {
      const [move, across] = FLOW[((k % FLOW.length) + FLOW.length) % FLOW.length]!;
      pose = move;
      tx = C.x + across * 1.05;
      tz = C.z - 0.35;
      if (move === "jook-spin") pose = f < 0.62 && Math.floor(f * 11) % 2 ? "jook-spin-r" : "jook-spin";
      else if (move === "jook-buck") lift = f < 0.34 ? Math.sin((f / 0.34) * Math.PI) * 0.11 : 0;
      else if (move === "jook-toes") lift = 0.03 + Math.sin(f * Math.PI) * 0.025;
    } else {
      pose = TWO[(((Math.floor(beat / 2) + i) % 4) + 4) % 4]!;
      tx += pose === "jook-glide" ? -0.22 : pose === "jook-glide-r" ? 0.22 : 0;
    }
    // A glide is drawn going one way: seen from the Beale side it is the other drawing that goes that way.
    if (cam.z < d.z && pose.startsWith("jook-glide")) pose = pose === "jook-glide" ? "jook-glide-r" : "jook-glide";
    d.x += (tx - d.x) * damp(lead ? 6.5 : 4, dt);
    d.z += (tz - d.z) * damp(lead ? 5 : 4, dt);
    d.card.visible = true;
    d.card.pose = pose;
    d.card.lift = lift;
    d.card.place(d.x, d.z);
    d.card.update(dt, cam, g.tint, null);
  }

  // ---------------------------------------------------------------- the routine

  /** Three rounds of moves. Each is busier than the last, and the whole thing is busier every time he has won. */
  private chart(level: number, seed: number) {
    const rand = rng(seed);
    const notes: Note[] = [];
    let last = -1;
    let before = -1;
    const pick = () => {
      let lane = Math.floor(rand() * 4);
      while (lane === last && lane === before) lane = Math.floor(rand() * 4);
      before = last;
      last = lane;
      return lane;
    };
    for (let r = 0; r < ROUNDS; r++) {
      const from = r * (ROUND_BEATS + ANSWER_BEATS);
      const between = Math.min(0.78, [0.12, 0.3, 0.48][r]! + level * 0.09);
      for (let b = 0; b < ROUND_BEATS; b++) {
        const inBar = b % 4;
        // A round ends on a spin, and so does every second bar once he is warm.
        if (b === ROUND_BEATS - 1 || (inBar === 3 && (b >> 2) % 2 === 1 && r + level > 0)) {
          notes.push({ beat: from + b, lane: SPIN, state: 0 });
          continue;
        }
        if (inBar % 2 === 0 || rand() < 0.82) notes.push({ beat: from + b, lane: pick(), state: 0 });
        if (b < ROUND_BEATS - 2 && rand() < between) notes.push({ beat: from + b + 0.5, lane: pick(), state: 0 });
      }
    }
    return notes;
  }

  private worth(n: Note, perfect: boolean, combo: number) {
    return (n.lane === SPIN ? 2 : 1) * (perfect ? 100 : 60) * (1 + Math.min(3, Math.floor(combo / 8)));
  }

  start() {
    const g = this.g;
    this.on = true;
    this.level = clamp(g.save.best.jookWins ?? 0, 0, 3);
    this.notes = this.chart(this.level, 901 + this.runs++ * 7 + this.level * 31);
    this.max = this.notes.reduce((sum, n, i) => sum + this.worth(n, true, i), 0);
    this.score = 0;
    this.combo = 0;
    this.longest = 0;
    this.tally = { perfect: 0, good: 0, miss: 0 };
    this.heat = 0.3;
    this.roared = -99;
    this.round = 0;
    this.move = -1;
    this.moveAt = -99;
    this.slide = this.slideTo = 0;
    this.wx = C.x;
    this.wz = C.z + 0.3;
    this.clock = 0;
    // With the speaker going the routine starts at the top of a bar of it, two to five seconds off.
    const b = this.metronome ? -1 : g.sound.beat("jook");
    this.synced = b >= 0;
    if (this.synced) {
      this.origin = Math.ceil((b + 2.5) / 4) * 4;
      this.beat = b - this.origin;
    } else this.beat = -4;
    this.phase = "count";
    g.pos.x = this.wx;
    g.pos.z = this.wz;
    g.benji.visible = true;
    g.live.jookN = 0;
    g.live.jookWord = 0;
    this.say("YOUR FLOOR");
    this.frame(0, true);
    g.push();
  }

  private say(text: string) {
    if (text === this.call) return;
    this.call = text;
    this.g.push();
  }

  /** Where the routine is: our own count, pulled onto the speaker's while that can be heard. */
  private tick(dt: number) {
    const b = this.metronome ? -1 : this.g.sound.beat("jook");
    if (b < 0) {
      this.synced = false;
      this.beat += (dt * BPM) / 60;
      return;
    }
    // Picking the speaker up, or coming back from a pause: onto its nearest beat, never a jump of more than half a one.
    if (!this.synced || Math.abs(b - this.origin - this.beat) > 1) this.origin = Math.round(b - this.beat);
    this.synced = true;
    this.beat = b - this.origin;
  }

  private press(lane: number) {
    const g = this.g;
    g.live.jookTap[lane] = 1;
    this.move = lane;
    this.moveAt = this.clock;
    if (lane === 0) this.slideTo = Math.max(-REACH, this.slideTo - 0.85);
    else if (lane === 3) this.slideTo = Math.min(REACH, this.slideTo + 0.85);
    else if (lane === SPIN) g.sound.whoosh();
    if (this.phase !== "dance") return;
    let hit: Note | null = null;
    let off = GOOD;
    for (const n of this.notes) {
      if (n.state !== 0 || n.lane !== lane) continue;
      const d = Math.abs(n.beat - this.beat);
      if (d <= off) {
        off = d;
        hit = n;
      }
    }
    if (!hit) return;
    const perfect = off <= PERFECT;
    hit.state = 1;
    this.score += this.worth(hit, perfect, this.combo);
    this.combo++;
    this.longest = Math.max(this.longest, this.combo);
    if (perfect) this.tally.perfect++;
    else this.tally.good++;
    this.heat = Math.min(1, this.heat + (perfect ? 0.024 : 0.012) + (lane === SPIN ? 0.02 : 0));
    g.live.jookWord = perfect ? 1 : 2;
    g.live.jookWordAge = 0;
    // The ring goes up when he has them, and for every spin landed clean.
    if ((this.heat > 0.78 && this.clock - this.roared > 5) || (lane === SPIN && perfect && this.clock - this.roared > 1.6)) {
      this.roared = this.clock;
      this.ring.cheer(C.x, C.z, 9, lane === SPIN ? 1 : 1.6);
      if (this.heat > 0.78) g.sound.cheer();
    }
    g.push();
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.clock += dt;
    if (this.phase !== "over") this.tick(dt);
    const beat = this.beat;
    const whole = ROUND_BEATS + ANSWER_BEATS;
    const end = (ROUNDS - 1) * whole + ROUND_BEATS;

    // Where in the routine this is.
    if (this.phase !== "over") {
      const r = Math.floor(Math.max(0, beat) / whole);
      const into = beat - r * whole;
      if (beat < 0) {
        this.phase = "count";
        this.say(beat < -3 ? "YOUR FLOOR" : String(Math.ceil(-beat)));
      } else if (beat >= end) {
        if (this.phase !== "bow") {
          this.phase = "bow";
          this.moveAt = this.clock;
          this.say(this.score >= this.max * 0.7 ? "THAT'S BUCK!" : "");
          this.ring.cheer(C.x, C.z, 9, 2);
        }
        if (beat >= end + 3.5) this.finish();
      } else if (into < ROUND_BEATS) {
        this.phase = "dance";
        this.round = r;
        this.say(into < 2 ? (r === 0 ? "GO!" : `ROUND ${r + 1}`) : "");
      } else {
        this.phase = "watch";
        this.round = r;
        const left = whole - into;
        // Who has the floor, said once; then nothing over the picture until Benji is counted back in.
        this.say(left <= 3 ? String(Math.ceil(left)) : into < ROUND_BEATS + 2.6 ? `${this.dancers[r % 2]!.name.toUpperCase()} ANSWERS` : "");
      }
    }
    if (this.phase === "over") {
      this.steady(dt);
      return;
    }

    // With no speaker to hear, something still has to give him the beat.
    if (!this.synced && Math.floor(beat) !== this.ticked && beat > -4) {
      this.ticked = Math.floor(beat);
      if (this.phase === "dance" || this.phase === "count") g.sound.ui();
    }

    // His moves. He can throw them any time he has the floor; they only count on a note.
    if (this.phase === "dance" || this.phase === "count") for (let lane = 0; lane < LANES.length; lane++) if (input.hit(LANES[lane]!)) this.press(lane);
    for (const n of this.notes) {
      if (n.state === 0 && n.beat < beat - GOOD) {
        n.state = 2;
        this.combo = 0;
        this.tally.miss++;
        this.heat = Math.max(0, this.heat - 0.1);
        g.live.jookWord = 3;
        g.live.jookWordAge = 0;
        g.push();
      }
    }

    // What the HUD draws: every move within two beats of landing, and the ones just gone.
    const live = g.live;
    let shown = 0;
    for (const n of this.notes) {
      const left = n.beat - beat;
      if (left > JOOK_LEAD || left < -0.7 || shown >= SHOWN) continue;
      live.jook[shown * 3] = n.lane;
      live.jook[shown * 3 + 1] = left;
      live.jook[shown * 3 + 2] = n.state;
      shown++;
    }
    live.jookN = this.phase === "bow" ? 0 : shown;
    live.jookBeat = beat;
    live.jookWordAge += dt;
    for (let i = 0; i < LANES.length; i++) live.jookTap[i] = Math.max(0, live.jookTap[i]! - dt * 5);

    this.steady(dt);
  }

  /** Benji, the two jookers, the ring and the lens, a frame. */
  private steady(dt: number) {
    const g = this.g;
    const beat = this.beat;
    const watching = this.phase === "watch";
    // He glides: the feet go where the move sent them, smoothly, and he steps off the lino for the answer.
    this.slide += (this.slideTo - this.slide) * damp(7, dt);
    if (watching) this.slideTo = 0;
    const tx = watching ? C.x + 2.55 : C.x + this.slide;
    const tz = watching ? C.z + 1.9 : C.z + 0.3;
    this.wx += (tx - this.wx) * damp(watching ? 3.2 : 14, dt);
    this.wz += (tz - this.wz) * damp(3.2, dt);
    g.pos.x = this.wx;
    g.pos.z = this.wz;
    g.vel.x = g.vel.z = 0;
    g.benji.speed = 0;
    const cam = g.camera.position;
    const facing = watching ? Math.atan2(C.x - g.pos.x, C.z - g.pos.z) : Math.atan2(cam.x - g.pos.x, cam.z - g.pos.z);
    const drawn = g.benji.has("jook-glide");
    const since = this.clock - this.moveAt;
    const held = this.move >= 0 && since < 1.15;
    let pose: string | null = null;
    let lift = 0;
    let tilt = 0;
    let turn = 0;
    if (this.phase === "bow" || this.phase === "over") pose = drawn ? "jook-finish" : g.benji.has("cheer") ? "cheer" : null;
    else if (watching) g.benji.groove = beat / 1.58;
    else if (held && this.move === SPIN && since < 0.55) {
      // Round he goes: in the green tee the spin drawing whips from side to side, in any other fit he turns on the spot.
      if (drawn) pose = Math.floor(since * 16) % 2 ? "jook-spin-r" : "jook-spin";
      else turn = (since / 0.55) * Math.PI * 2;
      lift = Math.sin((since / 0.55) * Math.PI) * 0.08;
    } else if (held) {
      const m = this.move;
      if (drawn) pose = m === 0 ? "jook-glide" : m === 3 ? "jook-glide-r" : m === 1 ? "jook-buck" : m === 2 ? "jook-toes" : "jook-finish";
      else if (m === 1) pose = g.benji.has("ready") ? "ready" : null;
      // Without the drawings the glide is a lean into it, the toes a rise, the buck a stance.
      if (m === 0 || m === 3) tilt = drawn ? 0 : (m === 0 ? 0.2 : -0.2) * clamp(1 - since / 0.9, 0, 1);
      if (m === 2) lift = (drawn ? 0.04 : 0.16) * clamp(1 - since / 0.9, 0, 1);
      if (m === 1 && since < 0.24) lift = Math.sin((since / 0.24) * Math.PI) * 0.1;
    } else if (drawn) pose = Math.floor(Math.max(0, beat + 64)) % 2 ? "jook-heel-r" : "jook-heel";
    else g.benji.groove = beat / 1.58;
    g.heading = facing + turn;
    g.benji.pose = pose;
    g.benji.lift = lift;
    g.benji.tilt = tilt;

    // Between rounds one of the two takes the floor and shows him how it is done.
    const lead = watching ? this.round % 2 : -1;
    this.dancers.forEach((d, i) => this.dance(d, i, beat + 64, i === lead, dt));
    this.ring.update(dt, cam, g.tint, null, g.time, (beat + 64) / 1.58, this.reach);
    this.frame(dt, false);
  }

  private finish() {
    const g = this.g;
    this.phase = "over";
    g.live.jookN = 0;
    g.live.jookWord = 0;
    const grade = this.score / this.max;
    const won = grade >= 0.7;
    const record = this.score > (g.save.best.jook ?? 0);
    if (record) g.save.best.jook = this.score;
    if (won) g.save.best.jookWins = (g.save.best.jookWins ?? 0) + 1;
    const got = won ? g.earn(60 + this.level * 25 + Math.round(grade * 40), 5 + this.level * 2) : g.earn(Math.round(10 + grade * 30), 1);
    if (won) g.moment(2);
    g.emit("jook", won ? 1 : 0, this.score);
    this.say("");
    g.showResults(
      {
        title: won ? "THE CYPHER IS YOURS" : grade >= 0.45 ? "THEY FELT THAT" : "BACK TO THE LAB",
        sub: won ? `${this.dancers[0]!.name} and ${this.dancers[1]!.name} give him the floor. Next time it comes faster.` : "Watch the move come down and land it right on the beat.",
        rows: [
          ["Score", `${this.score.toLocaleString()}  (${Math.round(grade * 100)}%)`],
          ["On the beat", `${this.tally.perfect} dead on · ${this.tally.good} close · ${this.tally.miss} missed`],
          ["Longest run", String(this.longest)],
          ["Best here", (g.save.best.jook ?? 0).toLocaleString()],
        ],
        pay: got.dollars,
        respect: got.respect,
        tickets: 0,
        record,
        win: won,
        again: "Run it back",
      },
      () => this.start(),
      () => this.quit(),
    );
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    let fov = 43;
    if (this.phase === "watch") {
      // Round the side, so the one answering has the picture and Benji is in the corner of it.
      _eye.set(C.x + 1.5, Y0 + 1.75, C.z + 6.9);
      _at.set(C.x + 0.4, Y0 + 0.75, C.z);
      fov = 47;
    } else {
      // In front of him and low. He is held in the top of the picture: the moves come down across the bottom of it.
      _eye.set(C.x + this.slide * 0.5, Y0 + 1.35, C.z + 5.9);
      _at.set(C.x + this.slide * 0.75, Y0 + 0.42, C.z + 0.3);
    }
    const k = snap ? 1 : damp(3.2, dt);
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
    this.phase = "over";
    this.call = "";
    this.idleBeat = Math.max(0, this.beat + 64);
    g.live.jookN = 0;
    g.live.jookWord = 0;
    g.benji.groove = -1;
    g.pos.x = C.x + 0.6;
    g.pos.z = C.z + 4.6;
    g.heading = Math.PI;
    g.camYaw = Math.PI;
    g.end("walk");
  }

  hud(h: HudState) {
    h.machine = {
      name: "Jookin",
      stats: [
        ["Score", this.score.toLocaleString(), "#39ff14"],
        ["Run", `x${1 + Math.min(3, Math.floor(this.combo / 8))}`, "#f4d77a"],
        ["Round", `${Math.min(ROUNDS, this.round + 1)}/${ROUNDS}`],
        ["Crowd", `${Math.round(this.heat * 100)}%`, this.heat > 0.78 ? "#ff5a5a" : undefined],
      ],
      call: this.call,
      meter: false,
      act: "Spin",
    };
    h.jook = { on: this.phase === "dance" || this.phase === "count" || this.phase === "watch", watching: this.phase === "watch" };
  }
}
