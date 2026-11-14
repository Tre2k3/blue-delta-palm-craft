import * as THREE from "three";
import { Card } from "../actors/card";
import { TAGGERS } from "../assets/cast";
import type { HudState, LoadoutHud } from "../core/types";
import { clamp, damp, wrapAngle } from "../core/util";
import type { Activity, Game } from "../game";
import { ARENA_D, ARENA_W } from "../world/arena";
import { pushOut } from "../world/collide";
import { ROOM } from "../world/map";

/** Seconds in a match. */
const LENGTH = 150;
/** Hits a base takes before it pays out and goes dark. */
const BASE_HP = 3;
/** His eyes above the floor (he is not tall: level is chest height on most people), and how wide he sees from the hip. */
const EYE = 1.32;
const FOV = 72;
/** A full vest. */
const VEST = 100;

export type Blaster = {
  id: "pulse" | "scatter" | "marksman";
  name: string;
  note: string;
  /** The rank it is issued at. */
  rank: number;
  mag: number;
  /** Seconds between shots, and whether holding the trigger keeps it firing. */
  rate: number;
  auto: boolean;
  /** What one beam takes off a vest, to the body and to the head. */
  body: number;
  head: number;
  pellets: number;
  reload: number;
  /** How far the beams stray, radians, from the hip and down the sights; and what each shot adds. */
  hip: number;
  ads: number;
  bloom: number;
  /** Field of view down the sights. */
  zoom: number;
  range: number;
  /** Past this many metres a beam starts to lose its bite. */
  fade: number;
  kick: number;
  color: [number, number, number];
};

export const BLASTERS: Blaster[] = [
  { id: "pulse", name: "Pulse Rifle", note: "Fully automatic. The all-rounder.", rank: 0, mag: 24, rate: 0.13, auto: true, body: 34, head: 68, pellets: 1, reload: 1.4, hip: 0.03, ads: 0.004, bloom: 0.006, zoom: 50, range: 44, fade: 30, kick: 0.16, color: [0.4, 3, 0.3] },
  { id: "scatter", name: "Scatter", note: "A wide burst. Owns the corners, useless across the room.", rank: 2, mag: 6, rate: 0.72, auto: false, body: 17, head: 22, pellets: 8, reload: 1.9, hip: 0.085, ads: 0.06, bloom: 0, zoom: 60, range: 18, fade: 5, kick: 0.5, color: [3, 1.3, 0.2] },
  { id: "marksman", name: "Marksman", note: "One clean tag from anywhere. Raise the scope first.", rank: 4, mag: 5, rate: 0.95, auto: false, body: 100, head: 100, pellets: 1, reload: 2.2, hip: 0.1, ads: 0.0008, bloom: 0, zoom: 24, range: 60, fade: 60, kick: 0.6, color: [0.3, 1.4, 3] },
];

/** What it takes to hold each rank. */
export const RANKS: [number, string][] = [
  [0, "Recruit"],
  [300, "Private"],
  [800, "Corporal"],
  [1600, "Sergeant"],
  [2800, "Lieutenant"],
  [4500, "Captain"],
  [7000, "Major"],
  [10000, "Colonel"],
  [14000, "Commander"],
  [20000, "Legend"],
];

export function rankOf(xp: number) {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i]![0]) index = i;
  const floor = RANKS[index]![0];
  const next = RANKS[index + 1]?.[0] ?? floor;
  return { index, name: RANKS[index]![1], floor, next, share: next > floor ? clamp((xp - floor) / (next - floor), 0, 1) : 1 };
}

const CALLSIGNS: Record<string, string> = { "male-01": "Dre", "male-02": "Marcus", "female-02": "Nia", "male-03": "Trey", "female-01": "Tasha", "female-03": "Keisha", "male-04": "Pops", "female-04": "Renee" };
/** Tags in a row without going down, and what each run earns. */
const REWARDS: [number, string][] = [
  [3, "RADAR SWEEP"],
  [5, "OVERCHARGE"],
  [7, "BLACKOUT"],
];

type Team = 0 | 1;
type Tagger = {
  card: Card;
  plate: THREE.Sprite;
  name: string;
  team: Team;
  height: number;
  /** In this match: one pink sits each one out. */
  playing: boolean;
  x: number;
  z: number;
  /** How high their feet are: the floor, the upstairs, or part way up a ramp. And the node they are walking to. */
  y: number;
  node: number;
  /** The node they are making for (-1 when they have nowhere in mind), and why. */
  goal: number;
  want: "benji" | "base" | "post";
  tx: number;
  tz: number;
  home: { x: number; z: number };
  hp: number;
  /** Seconds until they are back in, after their vest goes dark. */
  out: number;
  aim: number;
  cool: number;
  stuck: number;
  /** Who they are lining up on: another tagger, Benji, or a base. */
  at: Tagger | "benji" | "base" | null;
  /** When they last fired, for the radar. */
  shot: number;
  /** Seconds they stay turned on Benji after he hits them. */
  alert: number;
};
type Base = { x: number; z: number; hp: number; dark: number; core: THREE.Mesh; ring: THREE.Mesh };
type PowerKind = "rapid" | "shield" | "double";
type Power = { mesh: THREE.Mesh; kind: PowerKind; x: number; y: number; z: number; wait: number };
type Beam = { mesh: THREE.Mesh; left: number };
type Hit = { kind: "wall" | "bot" | "base"; s: number; x: number; y: number; z: number; bot: Tagger | null; head: boolean };

const POWER: Record<PowerKind, { name: string; color: [number, number, number]; seconds: number }> = {
  rapid: { name: "RAPID FIRE", color: [3, 2.4, 0.3], seconds: 9 },
  shield: { name: "SHIELD", color: [0.3, 2.4, 3], seconds: 7 },
  double: { name: "DOUBLE POINTS", color: [3, 0.6, 2.6], seconds: 12 },
};

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

/** A name over somebody's head. */
function plate(text: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.font = "900 34px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 7;
  g.strokeStyle = "rgba(0,0,0,0.85)";
  g.strokeText(text, 128, 34);
  g.fillStyle = color;
  g.fillText(text, 128, 34);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.set(1.3, 0.325, 1);
  s.renderOrder = 8;
  return s;
}

/**
 * Laser tag, through Benji's own eyes. Green against pink, four a side, two and a half minutes.
 *
 * He carries one of three blasters, picked at the door: it sits in his hands at the bottom of the
 * view, comes up to the eye to aim, kicks when it fires and has to be reloaded. A crosshair shows
 * where the beams go and how far they stray; it turns pink over somebody he can tag, and marks
 * every hit. A vest takes a hundred before it goes dark, recharges if he keeps out of the light,
 * and puts him back at his base when it is gone. Tags in a row without going down earn a radar
 * sweep, then an overcharged blaster, then a blackout of every pink vest on the floor. Their base
 * still pays big for three hits, and the last twenty seconds count double.
 */
export class LaserTag implements Activity {
  /** Shown for the first moments of a match, then cleared so nothing sits over the blaster. */
  hints: [string, string][] = [];
  private bots: Tagger[] = [];
  private bases: [Base, Base];
  private powers: Power[] = [];
  private beams: Beam[] = [];
  private group = new THREE.Group();
  private built = false;
  private matches = 0;
  /** 0 to 1 with his rank: the pinks get sharper and his own side less so as he is promoted. */
  private skill = 0;
  private phase: "count" | "go" | "over" = "count";
  private count = 3;
  private clock = 0;
  private left = LENGTH;
  /** Benji's own points, and each side's total. */
  private score = 0;
  private team: [number, number] = [0, 0];
  private tags = 0;
  private outs = 0;
  private heads = 0;
  private shots = 0;
  private landed = 0;
  private baseHits = 0;
  private streak = 0;
  private bestStreak = 0;
  private combo = 0;
  private comboLeft = 0;
  private first = true;
  /** Whoever put him out last: tagging them back is worth more. */
  private nemesis: Tagger | null = null;
  private by = "";
  /** The blaster in his hands. */
  gun: Blaster = BLASTERS[0]!;
  private ammo = 0;
  private cool = 0;
  private reloading = 0;
  private ads = 0;
  private pitch = 0;
  /** How high his feet are, and how fast he is falling when he has stepped off something. */
  private y = 0;
  private vy = 0;
  private kick = 0;
  private bloom = 0;
  private flash = 0;
  private bob = 0;
  private swayX = 0;
  private swayY = 0;
  /** Has he looked about with a mouse, a finger or a stick this match? Until he has, A and D turn him. */
  private looked = false;
  private onTarget = 0;
  private target: Tagger | "base" | null = null;
  private friendly = false;
  private hitMark = 0;
  private hitKind = 0;
  private hurt = 0;
  private hurtFrom = 0;
  private vest = VEST;
  private sinceHit = 99;
  private down = 0;
  private shield = 0;
  private rapid = 0;
  private double = 0;
  private sweep = 0;
  private over = 0;
  private gotHit = 0;
  private call = "";
  private callLeft = 0;
  private leaving = false;
  private feed: { a: string; b: string; team: Team; head: boolean; t: number }[] = [];
  private mats: [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial];
  /** Thin lines from pinks who are lining up on Benji. */
  private sights: THREE.Mesh[] = [];
  /** The dash: time left in it, time until the next, and which way. */
  private dash = { left: 0, cool: 0, x: 0, z: 0 };
  /** The last twenty seconds count double; said once. */
  private frenzy = false;
  private warned = 0;
  /** For the tests: beams go exactly where he is looking, and everybody else stands where they are put. */
  steady = false;
  hold = false;

  constructor(private g: Game) {
    const room = g.rooms.laser;
    const C = ROOM.laser;
    const glow = (r: number, gr: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, gr, b), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mats = [glow(0.4, 3, 0.3), glow(3, 0.4, 2.2)];
    const thin = new THREE.CylinderGeometry(0.014, 0.014, 1, 5);
    const sightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.5, 1.6), toneMapped: false, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(thin, sightMat);
      m.visible = false;
      this.group.add(m);
      this.sights.push(m);
    }
    const geo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6);
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(geo, this.mats[0]);
      mesh.visible = false;
      this.group.add(mesh);
      this.beams.push({ mesh, left: 0 });
    }
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
      this.powers.push({ mesh, kind, x: 0, y: 0, z: 0, wait: 3 });
    }
    room.group.add(this.group);
  }

  /** The other seven: drawn in their vests with a blaster in both hands. Made the first time he plays, not at the door of the city. */
  private build() {
    if (this.built) return;
    this.built = true;
    for (const t of TAGGERS) {
      const card = new Card(t.art, t.height);
      card.visible = false;
      const name = CALLSIGNS[t.name] ?? "Tagger";
      const p = plate(name, t.team ? "#ff6fd8" : "#7dff5c");
      p.visible = false;
      // A team mate's name shows through the walls, so he always knows where his side is.
      (p.material as THREE.SpriteMaterial).depthTest = t.team === 1;
      this.group.add(card.group, p);
      this.bots.push({ card, plate: p, name, team: t.team, height: t.height, playing: false, x: 0, z: 0, y: 0, node: 0, goal: -1, want: "post", tx: 0, tz: 0, home: { x: 0, z: 0 }, hp: VEST, out: 0, aim: 0, cool: 1, stuck: 0, at: null, shot: -9, alert: 0 });
    }
  }

  // ---------------------------------------------------------------- the service record

  private stat(key: string) {
    return this.g.save.best[`lt_${key}`] ?? 0;
  }

  /** What the screen at the door shows: his rank, his record and the three blasters. */
  loadout(): LoadoutHud {
    const xp = this.stat("xp");
    const r = rankOf(xp);
    const picked = this.pick();
    const tags = this.stat("tags");
    const outs = this.stat("outs");
    return {
      xp,
      rank: r.name,
      level: r.index + 1,
      floor: r.floor,
      next: r.next,
      share: r.share,
      top: r.index === RANKS.length - 1,
      stats: [
        ["Matches", String(this.stat("games"))],
        ["Wins", String(this.stat("wins"))],
        ["Tags", String(tags)],
        ["Tags per out", outs ? (tags / outs).toFixed(2) : tags ? String(tags) : "-"],
        ["Head tags", String(this.stat("heads"))],
        ["Best run", String(this.stat("streak"))],
        ["Best score", String(this.g.save.best.laser ?? 0)],
      ],
      guns: BLASTERS.map((b) => ({ id: b.id, name: b.name, note: b.note, mag: b.mag, locked: r.index < b.rank ? `Issued at ${RANKS[b.rank]![1]}` : "", picked: b.id === picked.id, img: `/game-v2/kit/blasters/${b.id}-hip.webp` })),
      maps: this.g.rooms.laser.arenas.map((a, i) => ({ id: a.id, name: a.name, note: a.note, floors: a.storeys, picked: i === this.map, plan: a.plan })),
      hall: { wide: ARENA_W, deep: ARENA_D },
      auto: this.auto(),
    };
  }

  /** The blaster he has chosen, if his rank still carries it. */
  private pick() {
    const want = BLASTERS[this.stat("gun")] ?? BLASTERS[0]!;
    return rankOf(this.stat("xp")).index >= want.rank ? want : BLASTERS[0]!;
  }

  choose(id: string) {
    const i = BLASTERS.findIndex((b) => b.id === id);
    if (i < 0 || rankOf(this.stat("xp")).index < BLASTERS[i]!.rank) return false;
    this.g.save.best.lt_gun = i;
    return true;
  }

  /** The hall as it is laid out for this match. */
  private get arena() {
    return this.g.rooms.laser.arena;
  }

  /** Which layout he has picked at the door. */
  get map() {
    return clamp(Math.floor(this.stat("map")), 0, this.g.rooms.laser.arenas.length - 1);
  }

  chooseMap(id: string) {
    const i = this.g.rooms.laser.arenas.findIndex((a) => a.id === id);
    if (i < 0) return false;
    this.g.save.best.lt_map = i;
    return true;
  }

  /** On a touch screen the blaster fires by itself when the crosshair is on somebody, unless that is turned off. */
  private auto() {
    return this.stat("manual") !== 1;
  }

  toggleAuto() {
    this.g.save.best.lt_manual = this.auto() ? 1 : 0;
  }

  // ---------------------------------------------------------------- a match

  start() {
    const g = this.g;
    const room = g.rooms.laser;
    this.build();
    this.leaving = false;
    // The hall is set out the way he asked for at the door.
    room.use(this.map);
    const A = this.arena;
    g.pos.x = room.start.x;
    g.pos.z = room.start.z;
    g.heading = room.start.heading;
    g.camYaw = room.start.heading;
    g.vel.x = g.vel.z = 0;
    this.pitch = 0;
    this.y = this.vy = 0;
    // Three in green with Benji; four of the five pinks, a different one sat out each match.
    const greens = A.greens;
    const bench = this.bots.filter((b) => b.team === 1)[this.matches++ % 5];
    let gi = 0;
    let pi = 0;
    for (const b of this.bots) {
      b.playing = b !== bench;
      b.card.visible = b.playing;
      b.plate.visible = false;
      if (!b.playing) continue;
      const p = b.team ? room.bots[pi++ % room.bots.length]! : greens[gi++]!;
      b.home = { x: p.x, z: p.z };
      b.x = b.tx = p.x;
      b.z = b.tz = p.z;
      b.y = 0;
      b.node = A.near(p.x, p.z, 0, true);
      b.goal = -1;
      b.hp = VEST;
      b.out = 0;
      b.aim = 0;
      b.at = null;
      b.cool = 1.5 + Math.random() * 1.5;
      b.stuck = 0;
      b.shot = -9;
      b.alert = 0;
      b.card.pose = null;
      b.card.heading = b.team ? 0 : Math.PI;
    }
    for (const base of this.bases) {
      base.hp = BASE_HP;
      base.dark = 0;
    }
    this.powers.forEach((p, i) => {
      p.wait = 4 + i * 5;
      p.mesh.visible = false;
    });
    this.gun = this.pick();
    this.skill = rankOf(this.stat("xp")).index / (RANKS.length - 1);
    this.ammo = this.gun.mag;
    this.cool = this.reloading = this.ads = this.kick = this.bloom = this.flash = 0;
    this.phase = "count";
    this.count = 3;
    this.clock = 0;
    this.left = LENGTH;
    this.score = this.tags = this.outs = this.heads = this.shots = this.landed = this.baseHits = 0;
    this.streak = this.bestStreak = this.combo = 0;
    this.first = true;
    this.nemesis = null;
    this.team = [0, 0];
    this.vest = VEST;
    this.sinceHit = 99;
    this.down = 0;
    this.shield = this.rapid = this.double = this.sweep = this.over = 0;
    this.dash = { left: 0, cool: 0, x: 0, z: 0 };
    this.frenzy = false;
    this.looked = false;
    this.steady = this.hold = false;
    this.target = null;
    this.onTarget = 0;
    this.feed = [];
    for (const m of this.sights) m.visible = false;
    for (const b of this.beams) {
      b.left = 0;
      b.mesh.visible = false;
    }
    g.benji.visible = false;
    this.hints = [
      ["Click / Space", "Fire"],
      ["Right click / F", "Aim"],
      ["R", "Reload"],
      ["E", "Dash"],
      ["Q", "Leave"],
    ];
    this.say("Green against pink. Tag them, and hit their base for the big points.", 3.2);
    g.sound.countdown();
    this.view(0);
  }

  private say(text: string, seconds = 1.6) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  private report(a: string, b: string, team: Team, head = false) {
    this.feed.unshift({ a, b, team, head, t: 6 });
    if (this.feed.length > 5) this.feed.length = 5;
    this.g.push();
  }

  private beam(ax: number, ay: number, az: number, bx: number, by: number, bz: number, team: Team) {
    const b = this.beams.find((k) => k.left <= 0) ?? this.beams[0]!;
    _a.set(ax, ay, az);
    _b.set(bx, by, bz);
    const len = _a.distanceTo(_b);
    b.mesh.material = this.mats[team];
    b.mesh.position.copy(_a).lerp(_b, 0.5);
    b.mesh.scale.set(1, len, 1);
    b.mesh.quaternion.setFromUnitVectors(_y, _b.sub(_a).normalize());
    b.mesh.visible = true;
    b.left = 0.16;
  }

  /** 1 to 5: the arena heats up as the clock runs. */
  private level() {
    return Math.min(5, 1 + Math.floor((LENGTH - this.left) / 30));
  }

  /** Everything is worth double at the end. */
  private worth() {
    return this.frenzy ? 2 : 1;
  }

  /** A base took a hit from `team`. Returns the points it paid, if that was the third. */
  private hitBase(base: Base, team: Team) {
    base.hp--;
    if (base.hp > 0) return 0;
    base.hp = BASE_HP;
    base.dark = 14;
    // Green is the away side at the pink base, so it pays them a little more.
    const pay = (team ? 300 : 400) * this.worth();
    this.team[team] += pay;
    return pay;
  }

  /** What a beam from his eye meets first, along a heading and a tilt. `wide` lets a near miss count, for thumbs. */
  private trace(yaw: number, pitch: number, reach: number, wide = 0): Hit {
    const g = this.g;
    const hx = Math.sin(yaw);
    const hz = Math.cos(yaw);
    const rise = Math.tan(pitch);
    const ox = g.pos.x;
    const oz = g.pos.z;
    const eye = this.y + EYE;
    // Walls, cover, the floors above and below, the ramps and the roof all stop a beam.
    const far = this.arena.beam(ox, eye, oz, hx, hz, rise, reach);
    let best: Hit = { kind: "wall", s: far, x: ox + hx * far, y: eye + rise * far, z: oz + hz * far, bot: null, head: false };
    for (const b of this.bots) {
      if (!b.playing || b.team === 0 || b.out > 0) continue;
      const dx = b.x - ox;
      const dz = b.z - oz;
      const s = dx * hx + dz * hz;
      if (s < 0.4 || s > best.s) continue;
      const off = Math.abs(dx * hz - dz * hx);
      // How high up them the beam is: they may be a floor above him, or below.
      const y = eye + rise * s - b.y;
      const slack = wide * s;
      if (off > 0.3 + slack || y < 0.04 - slack || y > b.height + 0.04 + slack) continue;
      best = { kind: "bot", s, x: ox + hx * s, y: b.y + clamp(y, 0.1, b.height), z: oz + hz * s, bot: b, head: y > b.height * 0.8 && off < 0.3 };
    }
    const base = this.bases[1];
    if (base.dark <= 0) {
      const dx = base.x - ox;
      const dz = base.z - oz;
      const s = dx * hx + dz * hz;
      const off = Math.abs(dx * hz - dz * hx);
      const y = eye + rise * s;
      if (s > 0.4 && s < best.s && off < 0.46 + wide * s && y > 0.05 && y < 2.5 + wide * s) best = { kind: "base", s, x: base.x, y: 2.05, z: base.z, bot: null, head: false };
    }
    return best;
  }

  /** How far the next beam may stray from the middle of the crosshair, radians. */
  private stray() {
    const gun = this.gun;
    const speed = Math.hypot(this.g.vel.x, this.g.vel.z);
    return gun.hip + (gun.ads - gun.hip) * this.ads + this.bloom + (speed / 6.4) * 0.018 * (1 - this.ads * 0.6);
  }

  /** Thumbs and sticks get a little help: a beam that passes close enough still counts. */
  private help() {
    const input = this.g.input;
    return input.touch || input.pad || !this.looked ? 0.022 : 0.004;
  }

  /** Where the muzzle is in the room: down and to the right of his eye from the hip, under it down the sights. */
  private muzzle() {
    const g = this.g;
    const yaw = g.camYaw;
    const side = 0.2 * (1 - this.ads);
    _a.set(g.pos.x + Math.sin(yaw) * 0.55 - Math.cos(yaw) * side, this.y + EYE - 0.16 + this.ads * 0.08, g.pos.z + Math.cos(yaw) * 0.55 + Math.sin(yaw) * side);
    return _a;
  }

  /** Pull the trigger. Also what the tests call. */
  fire() {
    const g = this.g;
    const gun = this.gun;
    if (this.down > 0 || this.reloading > 0 || this.phase !== "go") return false;
    if (this.ammo <= 0) {
      this.reload();
      return false;
    }
    this.cool = gun.rate * (this.rapid > 0 || this.over > 0 ? 0.55 : 1);
    if (this.over <= 0) this.ammo--;
    this.shots++;
    this.flash = 0.07;
    g.sound.release();
    g.buzz(8);
    const spread = this.steady ? 0 : this.stray();
    const help = this.help();
    const m = this.muzzle();
    const mx = m.x;
    const my = m.y;
    const mz = m.z;
    const took = new Map<Tagger, { dmg: number; head: boolean; far: number }>();
    let base = false;
    for (let i = 0; i < gun.pellets; i++) {
      const turn = Math.random() * Math.PI * 2;
      const out = Math.sqrt(Math.random()) * spread;
      const hit = this.trace(g.camYaw + Math.cos(turn) * out, this.pitch + Math.sin(turn) * out, gun.range, help);
      if (i < 4) this.beam(mx, my, mz, hit.x, hit.y, hit.z, 0);
      if (hit.kind === "bot" && hit.bot) {
        const bite = clamp(1 - (hit.s - gun.fade) / Math.max(4, gun.range - gun.fade), 0.25, 1);
        const was = took.get(hit.bot) ?? { dmg: 0, head: false, far: hit.s };
        was.dmg += (hit.head ? gun.head : gun.body) * bite;
        was.head ||= hit.head;
        took.set(hit.bot, was);
      } else if (hit.kind === "base") base = true;
    }
    for (const [bot, t] of took) this.strike(bot, t.dmg, t.head, t.far);
    if (base) this.strikeBase();
    this.kick = Math.min(1, this.kick + gun.kick);
    this.bloom = Math.min(0.05, this.bloom + gun.bloom);
    g.heading = g.camYaw;
    if (this.ammo <= 0 && this.over <= 0) this.reload();
    g.push();
    return true;
  }

  reload() {
    if (this.reloading > 0 || this.ammo >= this.gun.mag || this.down > 0) return;
    this.reloading = this.gun.reload;
    this.g.sound.ui();
    this.g.push();
  }

  /** One of Benji's beams landed on a pink. */
  private strike(b: Tagger, dmg: number, head: boolean, far: number) {
    const g = this.g;
    this.landed++;
    b.hp -= dmg;
    this.hitMark = 0.16;
    this.hitKind = head ? 3 : 1;
    // Being hit puts their aim off and turns them on him.
    b.aim = 0;
    b.at = null;
    b.cool = Math.max(b.cool, 0.35);
    b.alert = 2.5;
    if (b.hp > 0) {
      g.sound.rim();
      return;
    }
    this.hitKind = 2;
    this.putOut(b);
    this.tags++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.combo = this.comboLeft > 0 ? this.combo + 1 : 1;
    this.comboLeft = 4;
    if (head) this.heads++;
    const mult = (this.double > 0 ? 2 : 1) * this.worth();
    let pts = 100 + Math.min(4, this.combo - 1) * 25;
    const medals: string[] = [];
    if (head) {
      pts += 50;
      medals.push("HEAD TAG");
    }
    if (far > 18) {
      pts += 25;
      medals.push("LONG SHOT");
    }
    if (this.first) {
      this.first = false;
      pts += 50;
      medals.push("FIRST TAG");
    }
    if (this.nemesis === b) {
      this.nemesis = null;
      pts += 25;
      medals.push("PAYBACK");
    }
    if (this.left <= 3) medals.push("BUZZER BEATER");
    if (this.combo > 1) medals.push(["", "", "DOUBLE TAG", "TRIPLE TAG", "ON A TEAR"][this.combo] ?? "UNSTOPPABLE");
    pts = Math.round(pts * mult);
    this.score += pts;
    this.team[0] += pts;
    this.report("Benji", b.name, 0, head);
    g.sound.swish();
    g.buzz(this.combo > 2 ? [20, 30, 40] : 25);
    g.stage.setPunch(Math.min(0.5, 0.15 + this.combo * 0.08));
    if (this.combo >= 3) g.sound.cheer();
    this.say(`${medals.length ? medals.join("  ·  ") : "TAG"}  +${pts}`, 1.3);
    const reward = REWARDS.find((r) => r[0] === this.streak);
    if (reward) this.reward(reward[1]);
  }

  /** A run of tags without going down pays off. */
  private reward(name: string) {
    const g = this.g;
    g.sound.fanfare();
    if (name === "RADAR SWEEP") this.sweep = 18;
    else if (name === "OVERCHARGE") {
      this.over = 10;
      this.reloading = 0;
      this.ammo = this.gun.mag;
    } else {
      // Every pink vest on the floor goes dark at once.
      for (const b of this.bots) if (b.playing && b.team === 1 && b.out <= 0) this.putOut(b);
      g.stage.setPunch(0.8);
      g.moment(1);
    }
    this.say(`${this.streak} IN A ROW  ·  ${name}`, 2.4);
  }

  private strikeBase() {
    const g = this.g;
    const theirs = this.bases[1];
    const left = theirs.hp - 1;
    const paid = this.hitBase(theirs, 0);
    this.hitMark = 0.16;
    this.hitKind = 1;
    if (paid) {
      const pts = paid * (this.double > 0 ? 2 : 1);
      this.score += pts;
      this.team[0] += pts - paid;
      this.baseHits++;
      g.sound.cash();
      g.sound.cheer();
      g.stage.setPunch(0.6);
      g.input.rumble(0.8, 260);
      this.say(`THEIR BASE IS DOWN  +${pts}`, 2.2);
    } else {
      g.sound.rim();
      this.say(`BASE HIT  ${BASE_HP - left} of ${BASE_HP}`, 0.9);
    }
  }

  /** Somebody's vest has gone dark: they stand down, then start again from their own end. */
  private putOut(b: Tagger) {
    b.hp = 0;
    b.out = 3.6;
    b.aim = 0;
    b.at = null;
    b.card.pose = "out";
  }

  /** A pink's beam found Benji. */
  private tagged(by: Tagger) {
    const g = this.g;
    this.vest -= 34;
    this.sinceHit = 0;
    this.gotHit = 0.5;
    this.hurt = 1;
    this.hurtFrom = Math.atan2(by.x - g.pos.x, by.z - g.pos.z);
    this.combo = 0;
    this.team[1] += 50 * this.worth();
    g.sound.bad();
    g.stage.setPunch(0.5);
    g.input.rumble(0.8, 220);
    if (this.vest > 0) {
      this.shield = 0.5;
      return;
    }
    // Vest dark: out for a few seconds, and pink gets paid for it.
    this.vest = 0;
    this.outs++;
    this.streak = 0;
    this.nemesis = by;
    this.by = by.name;
    this.team[1] += 100 * this.worth();
    this.down = 3.4;
    this.shield = 3.4;
    this.sweep = this.over = 0;
    g.vel.x = g.vel.z = 0;
    this.report(by.name, "Benji", 1);
    this.say(`TAGGED OUT BY ${by.name.toUpperCase()}`, 2.2);
  }

  private dropPower(p: Power) {
    const g = this.g;
    const nodes = this.arena.nodes.filter((n) => Math.hypot(n.x - g.pos.x, n.z - g.pos.z) > 5 && !this.powers.some((q) => q !== p && q.mesh.visible && Math.hypot(q.x - n.x, q.z - n.z) < 2));
    const n = nodes[Math.floor(Math.random() * nodes.length)];
    if (!n) return;
    const kinds: PowerKind[] = ["rapid", "shield", "double"];
    p.kind = kinds[Math.floor(Math.random() * kinds.length)]!;
    (p.mesh.material as THREE.MeshBasicMaterial).color.setRGB(...POWER[p.kind].color);
    p.x = n.x;
    p.y = n.y;
    p.z = n.z;
    p.mesh.visible = true;
  }

  update(dt: number) {
    const g = this.g;
    const room = g.rooms.laser;
    const input = g.input;
    const gun = this.gun;
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
    for (let i = this.feed.length - 1; i >= 0; i--) {
      this.feed[i]!.t -= dt;
      if (this.feed[i]!.t <= 0) {
        this.feed.splice(i, 1);
        g.push();
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
    if (this.hints.length && this.phase === "go" && this.left < LENGTH - 9) {
      this.hints = [];
      g.push();
    }

    // ---- Benji.
    if (this.down > 0) {
      this.down -= dt;
      if (this.down <= 0) {
        // Back in at the base with a fresh vest, a full blaster and a moment of cover.
        g.pos.x = room.start.x;
        g.pos.z = room.start.z;
        g.camYaw = room.start.heading;
        this.pitch = 0;
        this.y = this.vy = 0;
        this.vest = VEST;
        this.ammo = gun.mag;
        this.reloading = 0;
        this.shield = 2.2;
        this.say("BACK IN", 1);
      }
    }
    const live = this.phase === "go" && this.down <= 0;
    const m = live ? input.move() : { x: 0, y: 0 };
    const aiming = live && this.reloading <= 0 && input.down("aim");
    this.ads += ((aiming ? 1 : 0) - this.ads) * damp(aiming ? 16 : 12, dt);
    if (this.ads < 0.002) this.ads = 0;
    // Looking: a mouse, a finger or the right stick. Slower down the sights, slower still through a scope.
    const zoomed = 1 - this.ads * (1 - gun.zoom / FOV) * 0.85;
    const lx = input.takeLook();
    const ly = input.takeLookY();
    if (lx !== 0 || ly !== 0) this.looked = true;
    if (this.down <= 0) {
      g.camYaw = wrapAngle(g.camYaw - lx * zoomed);
      this.pitch = clamp(this.pitch - ly * zoomed, -0.7, 0.7);
    }
    this.swayX += (clamp(lx * 14, -1, 1) - this.swayX) * damp(9, dt);
    this.swayY += (clamp(ly * 14, -1, 1) - this.swayY) * damp(9, dt);
    // With only a keyboard, A and D turn him as well, and his aim settles on whoever is nearly in line.
    const turnKeys = !this.looked;
    if (turnKeys) g.camYaw = wrapAngle(g.camYaw - m.x * 1.9 * dt);
    const sprint = live && input.down("run") && m.y > 0.3 && this.ads < 0.3 && this.reloading <= 0;
    const top = sprint ? 6.4 : 4.2 - this.ads * 1.5;
    const fx = Math.sin(g.camYaw);
    const fz = Math.cos(g.camYaw);
    const strafe = turnKeys ? 0.6 : 1;
    const k = damp(12, dt);
    g.vel.x += ((fx * m.y - fz * m.x * strafe) * top - g.vel.x) * k;
    g.vel.z += ((fz * m.y + fx * m.x * strafe) * top - g.vel.z) * k;
    // The dash: a burst the way he is going (or straight ahead), and nothing can tag him in it.
    const d = this.dash;
    d.cool -= dt;
    if (live && d.cool <= 0 && d.left <= 0 && input.hit("interact")) {
      const mv = Math.hypot(g.vel.x, g.vel.z);
      d.x = mv > 0.6 ? g.vel.x / mv : fx;
      d.z = mv > 0.6 ? g.vel.z / mv : fz;
      d.left = 0.2;
      d.cool = 2.2;
      this.shield = Math.max(this.shield, 0.5);
      g.sound.whoosh();
      g.buzz(15);
      // Anyone who had him lined up has lost him and has to start again.
      let dodged = false;
      for (const b of this.bots) {
        if (b.team !== 1 || b.at !== "benji" || b.aim <= 0) continue;
        b.aim = 0;
        b.at = null;
        b.cool = 0.9 + Math.random() * 0.8;
        dodged = true;
      }
      if (dodged) this.say("DODGED", 0.8);
    }
    if (d.left > 0) {
      d.left -= dt;
      g.vel.x = d.x * 15;
      g.vel.z = d.z * 15;
    }
    g.pos.x += g.vel.x * dt;
    g.pos.z += g.vel.z * dt;
    const A = this.arena;
    pushOut(g.pos, 0.36, A.solidsAt(this.y));
    // What is under his feet: up a ramp it carries him, off an edge he drops.
    const ground = A.surface(g.pos.x, g.pos.z, this.y);
    if (ground >= this.y - 0.02) {
      this.y += (ground - this.y) * damp(22, dt);
      this.vy = 0;
    } else {
      this.vy -= 24 * dt;
      this.y = Math.max(ground, this.y + this.vy * dt);
    }
    const speed = Math.hypot(g.vel.x, g.vel.z);
    g.heading = g.camYaw;
    g.benji.speed = 0;
    g.benji.visible = false;
    this.bob += dt * (2.2 + speed * 1.5);
    this.cool -= dt;
    this.shield -= dt;
    this.gotHit -= dt;
    this.comboLeft -= dt;
    this.hitMark -= dt;
    this.flash -= dt;
    this.hurt = Math.max(0, this.hurt - dt * 0.9);
    this.kick += (0 - this.kick) * damp(9, dt);
    this.bloom = Math.max(0, this.bloom - dt * 0.07);
    this.sweep -= dt;
    const hadPower = this.rapid > 0 || this.double > 0 || this.over > 0;
    this.rapid -= dt;
    this.double -= dt;
    this.over -= dt;
    if (hadPower && this.rapid <= 0 && this.double <= 0 && this.over <= 0) g.push();
    // The vest takes charge again when he has kept out of the light for a while.
    this.sinceHit += dt;
    if (live && this.sinceHit > 4.5 && this.vest < VEST) {
      const before = Math.floor(this.vest / 10);
      this.vest = Math.min(VEST, this.vest + 32 * dt);
      if (Math.floor(this.vest / 10) !== before) g.push();
    }
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        this.ammo = gun.mag;
        g.sound.ui();
        g.push();
      }
    }
    if (live && input.hit("reload")) this.reload();

    // What the crosshair is on.
    const help = this.help();
    const seen = live ? this.trace(g.camYaw, this.pitch, 60, help) : null;
    const was = this.target;
    this.target = seen?.kind === "bot" ? seen.bot : seen?.kind === "base" ? "base" : null;
    this.onTarget = this.target && this.target === was ? this.onTarget + dt : 0;
    this.friendly = false;
    if (live && !this.target) {
      for (const b of this.bots) {
        if (!b.playing || b.team !== 0 || b.out > 0) continue;
        const dx = b.x - g.pos.x;
        const dz = b.z - g.pos.z;
        const s = dx * fx + dz * fz;
        if (s > 0.4 && s < (seen?.s ?? 0) && Math.abs(dx * fz - dz * fx) < 0.3) this.friendly = true;
      }
    }
    // A little pull toward whoever is nearly in line, for thumbs, sticks and keyboards.
    if (live && (input.touch || input.pad || turnKeys)) {
      let near: Tagger | null = null;
      let err = turnKeys ? 0.3 : 0.13;
      for (const b of this.bots) {
        if (!b.playing || b.team === 0 || b.out > 0) continue;
        const e = Math.abs(wrapAngle(Math.atan2(b.x - g.pos.x, b.z - g.pos.z) - g.camYaw));
        if (e < err && A.clear(g.pos.x, this.y + EYE, g.pos.z, b.x, b.y + b.height * 0.62, b.z)) {
          near = b;
          err = e;
        }
      }
      if (near) {
        const want = Math.atan2(near.x - g.pos.x, near.z - g.pos.z);
        const pull = damp(turnKeys ? 7 : 2.4, dt);
        g.camYaw = wrapAngle(g.camYaw + wrapAngle(want - g.camYaw) * pull);
        const dist = Math.hypot(near.x - g.pos.x, near.z - g.pos.z);
        this.pitch += (Math.atan2(near.y + near.height * 0.62 - this.y - EYE, dist) - this.pitch) * pull;
      } else if (turnKeys) this.pitch += (0 - this.pitch) * damp(3, dt);
    }
    // The trigger: held for a blaster that keeps firing, pressed for one that does not; on a
    // touch screen it goes by itself once the crosshair has settled on somebody.
    const hands = live && this.cool <= 0 && this.reloading <= 0 && !sprint;
    const trigger = gun.auto ? input.down("action") : input.hit("action");
    const self = input.touch && this.auto() && this.target !== null && this.onTarget > (gun.id === "marksman" ? 0.3 : 0.1);
    if (hands && (trigger || self)) this.fire();
    const lv = this.level();
    if (!this.frenzy && this.phase === "go" && this.left <= 20) {
      this.frenzy = true;
      g.sound.fanfare();
      g.stage.setPunch(0.5);
      this.say("LAST 20 SECONDS: EVERYTHING COUNTS DOUBLE", 2.6);
    }

    // Power-ups: they turn on the floor until Benji walks over one.
    for (const p of this.powers) {
      if (!p.mesh.visible) {
        if (this.phase === "go") {
          p.wait -= dt;
          if (p.wait <= 0) this.dropPower(p);
        }
        continue;
      }
      p.mesh.position.set(p.x, p.y + 1 + Math.sin(g.time * 3 + p.x) * 0.12, p.z);
      p.mesh.rotation.y += dt * 2.4;
      if (live && Math.hypot(p.x - g.pos.x, p.z - g.pos.z) < 1.05 && Math.abs(p.y - this.y) < 1.3) {
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

    this.others(dt, live, speed, lv);

    // Radar: his own side always; a pink only when they have just fired, he can see them, or a sweep is running.
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
    for (const b of this.bots) {
      if (!b.playing) continue;
      if (b.team === 1 && b.out <= 0 && this.sweep <= 0 && this.clock + 1000 - b.shot > 2.5 && b !== this.target) {
        const ahead = (b.x - g.pos.x) * fx + (b.z - g.pos.z) * fz;
        if (ahead < 0 || !A.clear(g.pos.x, this.y + EYE, g.pos.z, b.x, b.y + 1.1, b.z)) continue;
      }
      blip(b.x, b.z, b.out > 0 ? 5 : b.team);
    }
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
    if (!this.leaving) this.view(dt, speed, sprint);
  }

  /** Everyone else on the floor: where they go, who they line up on, and what their beams do. */
  private others(dt: number, live: boolean, speed: number, lv: number) {
    const g = this.g;
    const room = g.rooms.laser;
    const A = this.arena;
    // Where a beam at Benji is aimed: his chest, wherever in the hall that is.
    const chest = this.y + EYE - 0.3;
    const benjiUp = live && this.shield <= 0;
    let lines = 0;
    this.warned -= dt;
    const now = this.clock + 1000;
    for (const b of this.bots) {
      if (!b.playing) continue;
      const c = b.card;
      if (b.out > 0) {
        // Vest dark: they stand where they were tagged for a moment, then start again from their own end.
        b.out -= dt;
        c.visible = b.out > 2.2;
        c.speed = 0;
        c.heading = Math.atan2(g.camera.position.x - b.x, g.camera.position.z - b.z);
        b.plate.visible = false;
        if (b.out <= 0) {
          b.x = b.tx = b.home.x;
          b.z = b.tz = b.home.z;
          b.y = 0;
          b.node = A.near(b.x, b.z, 0, true);
          b.goal = -1;
          b.hp = VEST;
          b.cool = 1.2;
          b.stuck = 0;
          c.pose = null;
          c.visible = true;
        }
        c.place(b.x, b.z);
        c.update(dt, g.camera.position, g.tint, room.floorY + b.y + 0.03);
        continue;
      }
      c.visible = true;
      b.alert -= dt;
      if (this.hold) {
        c.speed = 0;
        b.plate.visible = b.team === 0 ? this.phase !== "over" : this.target === b;
        b.plate.position.set(b.x, room.floorY + b.y + b.height + 0.3, b.z);
        c.place(b.x, b.z);
        c.update(dt, g.camera.position, g.tint, room.floorY + b.y + 0.03);
        continue;
      }
      const dx = b.tx - b.x;
      const dz = b.tz - b.z;
      const dist = Math.hypot(dx, dz);
      const enemyBase = this.bases[b.team ? 0 : 1];

      // Who can they see? The nearest one on the other side; Benji first if he has just hit them.
      let seen: Tagger | "benji" | "base" | null = null;
      if (this.phase === "go") {
        let near = 15 + lv;
        if (b.team === 1 && benjiUp) {
          const dd = Math.hypot(g.pos.x - b.x, g.pos.z - b.z);
          if (dd < (b.alert > 0 ? 40 : near) && A.clear(b.x, b.y + 1.2, b.z, g.pos.x, chest, g.pos.z)) {
            near = b.alert > 0 ? 0 : dd;
            seen = "benji";
          }
        }
        for (const o of this.bots) {
          if (!o.playing || o.team === b.team || o.out > 0) continue;
          const dd = Math.hypot(o.x - b.x, o.z - b.z);
          if (dd < near && A.clear(b.x, b.y + 1.2, b.z, o.x, o.y + 1.1, o.z)) {
            near = dd;
            seen = o;
          }
        }
        // Nobody about and their base in the open: go for it. Pinks only once the arena has warmed up.
        if (!seen && enemyBase.dark <= 0 && (b.team === 0 || lv >= 3) && Math.hypot(enemyBase.x - b.x, enemyBase.z - b.z) < 12 && A.clear(b.x, b.y + 1.2, b.z, enemyBase.x, 2.05, enemyBase.z)) seen = "base";
      }

      if (dist < 0.5 || b.stuck > 1.2) {
        // Next stop. Nodes are joined where one can be walked to from another in a straight line,
        // and a ramp joins its foot to its head: going somewhere is following the joins.
        if (b.stuck > 1.2) b.node = A.near(b.x, b.z, b.y, true);
        const here = b.node;
        const at = A.nodes[here]!;
        let pick = here;
        // Off the paths (just come in, or knocked off them): onto the nearest node first.
        if (Math.hypot(at.x - b.x, at.z - b.z) <= 0.7) {
          // Benji moves, so where he is gets looked up afresh; anywhere else is kept until it is reached.
          if (b.want === "benji") b.goal = A.near(g.pos.x, g.pos.z, this.y);
          if (b.goal < 0 || b.goal === here || Math.random() < 0.1) {
            const r = Math.random();
            b.want = "post";
            if (b.team === 1) {
              // Pinks hunt Benji harder as it heats up, and some of them make a run on the green base.
              if (live && r < 0.18 + lv * 0.1) b.want = "benji";
              else if (lv >= 3 && r > 0.78) b.want = "base";
            } else if (r < 0.4) b.want = "benji";
            else if (r > 0.68) b.want = "base";
            if (b.want === "benji") b.goal = A.near(g.pos.x, g.pos.z, this.y);
            else if (b.want === "base") b.goal = A.near(enemyBase.x, enemyBase.z, 0);
            // Otherwise somewhere to hold for a while: half the time upstairs, where there is one.
            else b.goal = A.upper.length && Math.random() < 0.5 ? A.upper[Math.floor(Math.random() * A.upper.length)]! : Math.floor(Math.random() * A.nodes.length);
          }
          pick = A.step(here, b.goal);
          // Already there: anywhere that can be walked to from here.
          if (pick === here) pick = at.links[Math.floor(Math.random() * at.links.length)] ?? here;
        }
        const to = A.nodes[pick]!;
        b.node = pick;
        b.tx = to.x;
        b.tz = to.z;
        b.stuck = 0;
      }
      let moved = 0;
      if (this.phase === "go" && b.aim <= 0 && dist > 0.01) {
        const v = b.team ? 2.4 + lv * 0.34 : 3.1;
        const bx = b.x;
        const bz = b.z;
        b.x += (dx / dist) * v * dt;
        b.z += (dz / dist) * v * dt;
        pushOut(b, 0.36, A.solidsAt(b.y));
        // Up the ramp with it, or down off the edge.
        const under = A.surface(b.x, b.z, b.y);
        b.y = under >= b.y ? under : Math.max(under, b.y - 9 * dt);
        moved = Math.hypot(b.x - bx, b.z - bz) / dt;
        b.stuck = moved < v * 0.35 ? b.stuck + dt : 0;
        c.heading = Math.atan2(dx, dz);
      }
      c.speed = moved;
      b.cool -= dt;
      if (seen && b.aim <= 0 && b.cool <= 0) {
        b.at = seen;
        b.aim = seen === "base" ? (b.team ? 1.6 : 1.15) : b.team ? 0.95 - lv * 0.07 - this.skill * 0.15 : 0.72;
        if (seen === "benji" && this.warned <= 0) {
          // One blip when somebody starts lining him up.
          this.warned = 0.5;
          g.sound.ui();
        }
      }
      // A pink lining up on Benji shows a line: time to dash or get behind something.
      if (b.team === 1 && b.aim > 0 && b.at === "benji" && lines < this.sights.length) {
        const sm = this.sights[lines++]!;
        _a.set(b.x, b.y + 1.12, b.z);
        _b.set(g.pos.x, chest, g.pos.z);
        const len = _a.distanceTo(_b);
        sm.position.copy(_a).lerp(_b, 0.5);
        sm.scale.set(1 + (1 - b.aim) * 2, len, 1 + (1 - b.aim) * 2);
        sm.quaternion.setFromUnitVectors(_y, _b.sub(_a).normalize());
        sm.visible = true;
      }
      if (b.aim > 0 && b.at) {
        const tx = b.at === "benji" ? g.pos.x : b.at === "base" ? enemyBase.x : b.at.x;
        const tz = b.at === "benji" ? g.pos.z : b.at === "base" ? enemyBase.z : b.at.z;
        c.heading = Math.atan2(tx - b.x, tz - b.z);
        b.aim -= dt;
        if (b.aim <= 0) {
          b.cool = b.team ? (2.9 + Math.random() * 2) * (1 - lv * 0.08) : 2 + Math.random() * 1.4;
          b.shot = now;
          const ty = b.at === "benji" ? chest : b.at === "base" ? 2.05 : b.at.y + 1.1;
          const clear = A.clear(b.x, b.y + 1.2, b.z, tx, ty, tz);
          const gx = b.x + Math.sin(c.heading) * 0.5;
          const gz = b.z + Math.cos(c.heading) * 0.5;
          if (clear && b.at === "base") {
            if (enemyBase.dark <= 0) {
              this.beam(gx, b.y + 1.12, gz, tx, 2.05, tz, b.team);
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
            const hit = this.shield <= 0 && this.down <= 0 && Math.random() < (speed > 3.2 ? 0.28 + lv * 0.03 : 0.6 + lv * 0.05) + this.skill * 0.12;
            const miss = hit ? 0 : (Math.random() > 0.5 ? 1 : -1) * 0.9;
            this.beam(gx, b.y + 1.12, gz, g.pos.x + miss, chest, g.pos.z + miss, 1);
            g.sound.release();
            if (hit) this.tagged(b);
          } else if (clear && b.at !== "base" && b.at !== "benji") {
            const o = b.at;
            const hit = o.out <= 0 && Math.random() < (b.team ? 0.4 + this.skill * 0.1 : 0.58 - this.skill * 0.14);
            const miss = hit ? 0 : (Math.random() > 0.5 ? 1 : -1) * 0.8;
            this.beam(gx, b.y + 1.12, gz, o.x + miss, o.y + 1.1, o.z + miss, b.team);
            if (hit) {
              o.hp -= 50;
              o.aim = 0;
              o.at = null;
              if (o.hp <= 0) {
                this.putOut(o);
                this.team[b.team] += (b.team ? 50 : 100) * this.worth();
                this.report(b.name, o.name, b.team);
              }
              g.push();
            }
          }
          b.at = null;
        }
      }
      // Names: his own side's all the time, a pink's only while the crosshair is on them.
      b.plate.visible = b.team === 0 ? this.phase !== "over" : this.target === b;
      b.plate.position.set(b.x, room.floorY + b.y + b.height + 0.3, b.z);
      const away = Math.hypot(b.x - g.pos.x, b.z - g.pos.z);
      const size = clamp(away / 9, 0.75, 2.2);
      b.plate.scale.set(1.3 * size, 0.325 * size, 1);
      c.place(b.x, b.z);
      c.update(dt, g.camera.position, g.tint, room.floorY + b.y + 0.03);
    }
    for (let i = lines; i < this.sights.length; i++) this.sights[i]!.visible = false;
  }

  /** The room through his eyes, and what the HUD needs every frame to draw the blaster in his hands. */
  private view(dt: number, speed = 0, sprint = false) {
    const g = this.g;
    const room = g.rooms.laser;
    const gun = this.gun;
    const cam = g.camera;
    const stride = Math.min(1, speed / 4.2);
    const out = this.down > 0 ? clamp((3.4 - this.down) * 4, 0, 1) : 0;
    const step = Math.sin(this.bob) * 0.028 * stride * (1 - this.ads * 0.7);
    cam.position.set(g.pos.x, room.floorY + this.y + EYE + step - out * 0.75, g.pos.z);
    cam.rotation.order = "YXZ";
    cam.rotation.set(this.pitch + this.kick * 0.035, g.camYaw + Math.PI, out * 0.38 + Math.cos(this.bob * 0.5) * 0.004 * stride);
    const fov = FOV + (gun.zoom - FOV) * this.ads + (sprint ? 4 : 0);
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * (dt > 0 ? damp(14, dt) : 1);
      cam.updateProjectionMatrix();
    }
    const fp = g.live.fp;
    fp.on = this.phase !== "over";
    fp.gun = BLASTERS.indexOf(gun);
    fp.ads = this.ads;
    fp.bob = this.bob;
    fp.move = stride;
    fp.kick = this.kick;
    fp.flash = Math.max(0, this.flash);
    fp.reload = this.reloading > 0 ? 1 - this.reloading / gun.reload : -1;
    fp.sprint += ((sprint ? 1 : 0) - fp.sprint) * (dt > 0 ? damp(10, dt) : 1);
    fp.gap = this.stray();
    fp.target = this.target ? 1 : this.friendly ? 2 : 0;
    fp.hit = Math.max(0, this.hitMark);
    fp.hitKind = this.hitKind;
    fp.hurt = this.hurt;
    fp.hurtAngle = wrapAngle(this.hurtFrom - g.camYaw);
    fp.swayX = this.swayX;
    fp.swayY = this.swayY;
    fp.down = out;
    fp.fov = cam.fov;
  }

  private finish() {
    const g = this.g;
    this.phase = "over";
    g.live.radarN = 0;
    g.live.fp.on = false;
    for (const m of this.sights) m.visible = false;
    for (const b of this.bots) b.plate.visible = false;
    const best = g.save.best.laser ?? 0;
    const record = this.score > best;
    if (record) g.save.best.laser = this.score;
    const won = this.team[0] > this.team[1];
    // The service record: what this match adds to it, and whether it carries him up a rank.
    const before = rankOf(this.stat("xp"));
    const xp = Math.round(this.score / 5) + this.tags * 10 + (won ? 100 : 25);
    const add = (key: string, n: number) => (g.save.best[`lt_${key}`] = this.stat(key) + n);
    add("xp", xp);
    add("games", 1);
    add("wins", won ? 1 : 0);
    add("tags", this.tags);
    add("outs", this.outs);
    add("heads", this.heads);
    g.save.best.lt_streak = Math.max(this.stat("streak"), this.bestStreak);
    const after = rankOf(this.stat("xp"));
    const promoted = after.index > before.index;
    const issued = promoted ? BLASTERS.find((b) => b.rank > before.index && b.rank <= after.index) : undefined;
    const tickets = Math.min(60, Math.floor(this.score / 40)) + (won ? 15 : 0);
    const paid = tickets > 0 ? g.winTickets(tickets) : 0;
    if (paid) g.sound.cash();
    if (won || promoted) g.moment(promoted ? 3 : 2);
    g.emit("laser", won ? 1 : 0);
    const aim = this.shots ? Math.round((this.landed / this.shots) * 100) : 0;
    g.showResults(
      {
        win: won,
        title: won ? "GREEN WINS" : this.team[0] === this.team[1] ? "DEAD EVEN" : "PINK TOOK IT",
        sub: promoted
          ? `Promoted to ${after.name}.${issued ? ` The ${issued.name} is yours at the door.` : ""}`
          : won
            ? this.baseHits
              ? "You went and got their base. That's the game."
              : "Held the floor. Their base pays 400 if you can get to it."
            : "Aim down the sights for a steadier beam, and keep out of the light while your vest charges.",
        rows: [
          ["Green", String(this.team[0])],
          ["Pink", String(this.team[1])],
          ["Your points", String(this.score)],
          ["Tags / times out", `${this.tags} / ${this.outs}`],
          ["Head tags", String(this.heads)],
          ["Best run", String(this.bestStreak)],
          ["On target", `${aim}%`],
          ["Rank", `${after.name}  ·  +${xp} XP`],
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
    g.live.radarN = 0;
    g.live.fp.on = false;
    g.transition(() => {
      for (const b of this.bots) {
        b.card.visible = false;
        b.plate.visible = false;
      }
      g.benji.visible = true;
      g.camera.rotation.set(0, 0, 0);
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
    const power = this.over > 0 ? "OVERCHARGE" : this.rapid > 0 ? "RAPID" : this.double > 0 ? "x2" : this.sweep > 0 ? "SWEEP" : this.shield > 1.5 && this.down <= 0 ? "SHIELD" : "";
    const next = REWARDS.find((r) => r[0] > this.streak);
    h.laser = {
      phase: this.phase,
      count: this.count,
      left: Math.max(0, Math.ceil(this.left)),
      score: this.score,
      tags: this.tags,
      hit: this.gotHit > 0,
      call: this.call,
      vest: Math.max(0, Math.round(this.vest)),
      level: this.level(),
      down: this.down > 0,
      us: this.team[0],
      them: this.team[1],
      power,
      gun: this.gun.name,
      ammo: this.over > 0 ? this.gun.mag : this.ammo,
      mag: this.gun.mag,
      reloading: this.reloading > 0,
      streak: this.streak,
      reward: next ? `${next[1]} in ${next[0] - this.streak}` : "",
      feed: this.feed.map((f) => ({ a: f.a, b: f.b, team: f.team, head: f.head })),
      by: this.down > 0 ? this.by : "",
      back: Math.max(0, Math.ceil(this.down)),
      auto: this.auto(),
      scope: this.gun.id === "marksman",
    };
  }
}
