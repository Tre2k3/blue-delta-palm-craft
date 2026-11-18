import * as THREE from "three";
import { Card, type CardArt } from "../actors/card";
import type { HudState } from "../core/types";
import { clamp, damp } from "../core/util";
import type { Activity, Game } from "../game";
import { CURB, WATERPARK } from "../world/map";
import { standHeight } from "../world/ground";
import type { Waterpark } from "../world/waterpark";

const Y0 = CURB;
const G = 9.8;

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();
const _t2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _n = new THREE.Vector3();
const _down = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

const kmh = (v: number) => `${Math.round(v * 3.6)} km/h`;

/** A ring of white water where he hits the pool, spreading and fading. */
function splashRing() {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.9, 28),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 4;
  m.visible = false;
  return m;
}

/**
 * Geronimo, the tall one at Adventure River. A moment at the top, then down: holding Space keeps
 * him tucked, arms crossed and flat, and the water carries him faster; let go and he sits up and
 * the chute slows him. The pool at the bottom says how fast he was going.
 */
export class Geronimo implements Activity {
  hints: [string, string][] = [
    ["Space", "Push off, then hold to tuck"],
    ["Q", "Climb back down"],
  ];
  private phase: "top" | "down" | "splash" = "top";
  private t = 0;
  private s = 0;
  private v = 0;
  private top = 0;
  private len = 1;
  private tucked = 0;
  private call = "";
  private ring = splashRing();
  private look = new THREE.Vector3();
  private spray: Spray;

  constructor(
    private g: Game,
    private park: Waterpark,
  ) {
    this.len = park.geronimo.getLength();
    park.group.add(this.ring);
    this.spray = new Spray(park.group);
  }

  start() {
    const g = this.g;
    this.phase = "top";
    this.t = 0;
    this.s = 0;
    this.v = 0;
    this.top = 0;
    this.tucked = 0;
    this.call = "Space to push off";
    this.place();
    this.frame(0, true);
    g.push();
  }

  /** Off the top. Also what the tests call. */
  go() {
    if (this.phase !== "top") return;
    this.phase = "down";
    this.t = 0;
    this.v = 1.2;
    this.call = "GERONIMO!";
    this.g.sound.whoosh();
    this.g.buzz(30);
    this.g.push();
  }

  private place() {
    const g = this.g;
    const u = clamp(this.s / this.len, 0, 1);
    this.park.geronimo.getPointAt(u, _p);
    this.park.geronimo.getTangentAt(u, _t);
    g.pos.x = _p.x;
    g.pos.z = _p.z;
    g.heading = Math.atan2(_t.x, _t.z);
    // Sat down in the chute, the water up round him: the sides hide him from the waist.
    seatIn(g.benji, _p.y - 0.75 + 0.5, standHeight(_p.x, _p.z), 0.55, "lean");
    g.benji.tilt = 0;
  }

  update(dt: number) {
    const g = this.g;
    this.t += dt;
    if (this.phase === "top") {
      this.place();
      if (g.input.hit("action") || this.t > 6) this.go();
    } else if (this.phase === "down") {
      const tuck = g.input.down("action");
      if (tuck) this.tucked += dt;
      const u = clamp(this.s / this.len, 0, 1);
      this.park.geronimo.getTangentAt(u, _t);
      // Down the slope, less what the water and the plastic take off.
      const drag = tuck ? 0.006 : 0.03;
      this.v = Math.max(0.6, this.v + (-_t.y * G - drag * this.v * this.v - 0.4) * dt);
      this.s += this.v * dt;
      this.top = Math.max(this.top, this.v);
      this.place();
      this.call = tuck ? "TUCKED" : "Hold Space to tuck";
      this.park.geronimo.getPointAt(clamp(this.s / this.len, 0, 1), _p);
      this.spray.emit(_p.x, _p.y - 0.2, _p.z, Math.ceil(this.v / 4), 0.5 + this.v * 0.07, 0.5);
      if (this.v > 12 && this.t % 0.4 < dt) g.buzz(12);
      if (this.s >= this.len) this.splash();
    } else {
      // The ring spreads and fades.
      const k = clamp(this.t / 1.3, 0, 1);
      this.ring.scale.setScalar(1 + k * 6);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      // In the pool to his chest.
      this.park.geronimo.getPointAt(1, _p);
      seatIn(g.benji, Y0 + WATERPARK.waterY, standHeight(_p.x, _p.z), 0.45, "stand");
      if (this.t > 1.6) this.done();
    }
    this.spray.update(dt);
    g.live.meter = clamp(this.v / 18, 0, 1);
    g.live.sweetLo = 0.7;
    g.live.sweetHi = 1;
    this.frame(dt, false);
  }

  private splash() {
    const g = this.g;
    this.phase = "splash";
    this.t = 0;
    this.park.geronimo.getPointAt(1, _p);
    this.ring.position.set(_p.x, Y0 + WATERPARK.waterY + 0.03, _p.z);
    this.ring.visible = true;
    this.spray.emit(_p.x, Y0 + WATERPARK.waterY, _p.z, 110, 3.6, 1.5);
    g.sound.splash(1.4);
    g.sound.crash(0.25);
    g.sound.cheer();
    g.buzz([40, 30, 60]);
    this.call = kmh(this.top);
    g.push();
  }

  private done() {
    const g = this.g;
    this.ring.visible = false;
    const best = g.save.best.geronimo ?? 0;
    const cm = Math.round(this.top * 100);
    const record = cm > best;
    if (record) g.save.best.geronimo = cm;
    const pay = Math.round(this.top * 1.5);
    const respect = this.top * 3.6 >= 60 ? 1 : 0;
    g.earn(pay, respect, { quiet: true });
    g.emit("geronimo", Math.round(this.top * 3.6));
    g.benji.lift = 0;
    g.benji.tilt = 0;
    g.live.meter = 0;
    g.end("walk");
    g.showResults(
      {
        title: this.top * 3.6 >= 60 ? "GERONIMO!" : "SPLASHDOWN",
        sub: "Adventure River · Geronimo",
        rows: [
          ["Top speed", kmh(this.top)],
          ["Tucked", `${this.tucked.toFixed(1)} s`],
          ["Best", kmh(Math.max(best, cm) / 100)],
        ],
        pay,
        respect,
        tickets: 0,
        record,
        again: "Go again",
        win: this.top * 3.6 >= 60,
      },
      () => g.rideGeronimo(),
      () => {},
    );
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const u = clamp(this.s / this.len, 0, 1);
    this.park.geronimo.getPointAt(u, _p);
    this.park.geronimo.getTangentAt(Math.min(1, u + 0.02), _t);
    if (this.phase === "splash") {
      // Out over the pool, turned back to see him come up out of the white water.
      _eye.set(_p.x + _t.x * 7, _p.y + 2.8, _p.z + _t.z * 7);
      _at.set(_p.x, _p.y + 0.3, _p.z);
    } else {
      // Up on the tower, close in over his shoulder, so the deck and the roof stay out of the shot.
      const T = WATERPARK.tower;
      const onTop = Math.abs(_p.x - T.x) < 5 && Math.abs(_p.z - T.z) < 5;
      const back = onTop ? 2.2 : 3.6;
      _eye.set(_p.x - _t.x * back, _p.y + 1.7 - _t.y * 2, _p.z - _t.z * back);
      _at.set(_p.x + _t.x * 4, _p.y + _t.y * 4 + 0.4, _p.z + _t.z * 4);
      if (Math.abs(_eye.x - T.x) < 5 && Math.abs(_eye.z - T.z) < 5)
        _eye.y = Math.min(_eye.y, Y0 + T.top + 1.85);
    }
    const k = snap ? 1 : damp(this.phase === "down" ? 10 : 4, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    if (snap) this.look.copy(_at);
    // The faster he goes, the more the lens rattles.
    const shake = this.phase === "down" ? clamp((this.v - 6) / 12, 0, 1) * 0.09 : 0;
    g.camera.position.x += (Math.random() - 0.5) * shake;
    g.camera.position.y += (Math.random() - 0.5) * shake;
    g.camera.lookAt(this.look);
    const fov = 60 + clamp(this.v / 18, 0, 1) * 18;
    if (Math.abs(g.camera.fov - fov) > 0.1) {
      g.camera.fov = fov;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    this.ring.visible = false;
    const st = this.park.stairs;
    g.pos.x = st.x;
    g.pos.z = st.z;
    g.benji.lift = 0;
    g.benji.tilt = 0;
    g.live.meter = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    const best = this.g.save.best.geronimo ?? 0;
    h.machine = {
      name: "Geronimo",
      stats: [
        ["Speed", kmh(this.v), "#5ae0ff"],
        ["Top", kmh(this.top), "#39ff14"],
        ["Best", best > 0 ? kmh(best / 100) : "-", "#f4d77a"],
      ],
      call: this.call,
      meter: this.phase === "down",
      act: this.phase === "top" ? "Go" : "Tuck",
    };
  }

  /** For the tests. */
  get state() {
    return { phase: this.phase, s: this.s, len: this.len, v: this.v, top: this.top };
  }
}

/**
 * Once round the lazy river on a tube. The current carries him; W paddles. Nothing to win, a
 * little to earn, the whole park going by.
 */
export class LazyRiver implements Activity {
  hints: [string, string][] = [
    ["W", "Paddle"],
    ["Q", "Climb out"],
  ];
  private u = 0;
  private went = 0;
  private tube: THREE.Mesh;
  private on = false;
  private call = "";
  private look = new THREE.Vector3();
  private len = 1;

  constructor(
    private g: Game,
    private park: Waterpark,
  ) {
    const geo = new THREE.TorusGeometry(0.62, 0.24, 10, 20);
    geo.rotateX(Math.PI / 2);
    this.tube = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0x39ff14, roughness: 0.5 }),
    );
    this.tube.visible = false;
    park.group.add(this.tube);
    this.len = park.river.getLength();
  }

  start() {
    const g = this.g;
    // In at the nearest point of the river.
    let best = 0;
    let bestD = 1e9;
    for (let i = 0; i < 60; i++) {
      this.park.river.getPointAt(i / 60, _p);
      const d = Math.hypot(_p.x - g.pos.x, _p.z - g.pos.z);
      if (d < bestD) {
        bestD = d;
        best = i / 60;
      }
    }
    this.u = best;
    this.went = 0;
    this.on = true;
    this.tube.visible = true;
    this.call = "W to paddle. Or just float.";
    this.place(0);
    this.frame(0, true);
    g.push();
  }

  private place(time: number) {
    const g = this.g;
    this.park.river.getPointAt(this.u, _p);
    this.park.river.getTangentAt(this.u, _t);
    g.pos.x = _p.x;
    g.pos.z = _p.z;
    g.heading = Math.atan2(_t.x, _t.z) + Math.sin(time * 0.4) * 0.3;
    const bob = Math.sin(time * 1.3) * 0.05;
    this.tube.position.set(_p.x, _p.y + bob, _p.z);
    this.tube.rotation.y = time * 0.3;
    // Sat down in the tube: the waist up shows, the rest is in the ring.
    seatIn(g.benji, _p.y + bob + 0.18, standHeight(_p.x, _p.z));
    g.benji.tilt = Math.sin(time * 0.9) * 0.04;
  }

  update(dt: number) {
    const g = this.g;
    if (!this.on) return;
    const paddle = g.input.move().y > 0.2;
    const v = paddle ? 2.4 : 1;
    const du = (v * dt) / this.len;
    this.u = (this.u + du) % 1;
    this.went += du;
    this.place(g.time);
    if (paddle) this.call = "";
    if (this.went >= 1) this.done();
    this.frame(dt, false);
  }

  private done() {
    const g = this.g;
    this.on = false;
    this.tube.visible = false;
    g.earn(8, 0, { quiet: true });
    g.emit("lazyriver", 1);
    g.toast("All the way round the lazy river. Nobody has ever been this relaxed.", 4);
    this.out();
  }

  private out() {
    const g = this.g;
    // Out onto the deck on the outside of the river.
    const R = WATERPARK.river;
    const dx = g.pos.x - R.cx;
    const dz = g.pos.z - R.cz;
    const len = Math.hypot(dx, dz) || 1;
    g.pos.x += (dx / len) * (R.width / 2 + 1.6);
    g.pos.z += (dz / len) * (R.width / 2 + 1.6);
    g.benji.pose = null;
    g.benji.lift = 0;
    g.end("walk");
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    this.park.river.getPointAt(this.u, _p);
    this.park.river.getTangentAt(this.u, _t);
    _eye.set(_p.x - _t.x * 5, _p.y + 2.8, _p.z - _t.z * 5);
    _at.set(_p.x + _t.x * 2, _p.y + 0.6, _p.z + _t.z * 2);
    const k = snap ? 1 : damp(3, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    if (snap) this.look.copy(_at);
    g.camera.lookAt(this.look);
    if (Math.abs(g.camera.fov - 55) > 0.1) {
      g.camera.fov = 55;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    this.on = false;
    this.tube.visible = false;
    this.out();
  }

  hud(h: HudState) {
    h.machine = {
      name: "Lazy River",
      stats: [["Round", `${Math.round(clamp(this.went, 0, 1) * 100)}%`, "#5ae0ff"]],
      call: this.call,
      meter: false,
      act: "",
    };
  }

  /** For the tests. */
  get state() {
    return { on: this.on, u: this.u, went: this.went };
  }
}

/**
 * The high dive at the wave pool. Out to the end of the board; Space jumps, and holding it in the
 * air tucks him into flips. Every full turn before the water counts.
 */
export class HighDive implements Activity {
  hints: [string, string][] = [
    ["Space", "Jump, then hold to flip"],
    ["Q", "Climb back down"],
  ];
  private phase: "top" | "air" | "splash" = "top";
  private t = 0;
  private p = new THREE.Vector3();
  private v = new THREE.Vector3();
  private spin = 0;
  private turns = 0;
  private ring = splashRing();
  private look = new THREE.Vector3();
  private call = "";

  constructor(
    private g: Game,
    private park: Waterpark,
  ) {
    park.group.add(this.ring);
  }

  start() {
    const b = this.park.dive.board;
    this.phase = "top";
    this.t = 0;
    this.spin = 0;
    this.turns = 0;
    this.p.set(b.x + 0.4, b.y, b.z);
    this.call = "Space to jump";
    this.place();
    this.frame(0, true);
    this.g.push();
  }

  /** Off the board. Also what the tests call. */
  jump() {
    if (this.phase !== "top") return;
    this.phase = "air";
    this.t = 0;
    this.v.set(-2.4, 4.2, 0);
    this.call = "";
    this.g.sound.whoosh();
  }

  private place() {
    const g = this.g;
    g.pos.x = this.p.x;
    g.pos.z = this.p.z;
    g.heading = -Math.PI / 2 + this.spin;
    g.benji.lift = Math.max(0, this.p.y - Y0);
    g.benji.pose = this.phase === "air" && g.benji.has("cheer") ? "cheer" : null;
    g.benji.speed = 0;
  }

  update(dt: number) {
    const g = this.g;
    this.t += dt;
    if (this.phase === "top") {
      if (g.input.hit("action")) this.jump();
    } else if (this.phase === "air") {
      this.v.y -= 9.8 * dt;
      this.p.addScaledVector(this.v, dt);
      if (g.input.down("action")) {
        this.spin += dt * 11;
        this.turns = Math.floor(this.spin / (Math.PI * 2));
      }
      if (this.p.y <= Y0 + WATERPARK.waterY) {
        this.phase = "splash";
        this.t = 0;
        this.ring.position.set(this.p.x, Y0 + WATERPARK.waterY + 0.03, this.p.z);
        this.ring.visible = true;
        g.sound.crash(0.4);
        g.buzz([40, 30, 50]);
        const clean =
          Math.abs(((this.spin % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) < 0.9 ||
          Math.abs((this.spin % (Math.PI * 2)) - Math.PI * 2) < 0.9;
        this.call =
          this.turns > 0
            ? `${this.turns} ${this.turns === 1 ? "FLIP" : "FLIPS"}${clean ? " · CLEAN" : " · BELLY FLOP"}`
            : "SPLASH";
        const pay = this.turns > 0 ? this.turns * 3 + (clean ? 3 : 0) : 1;
        g.earn(pay, this.turns >= 2 && clean ? 1 : 0, { quiet: true });
        const best = g.save.best.dive ?? 0;
        if (clean && this.turns > best) g.save.best.dive = this.turns;
        g.emit("dive", this.turns);
        g.push();
      }
    } else {
      const k = clamp(this.t / 1.2, 0, 1);
      this.ring.scale.setScalar(1 + k * 5);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      this.p.y = Y0;
      if (this.t > 1.6) return this.out();
    }
    this.place();
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    _eye.set(this.p.x - 4, Y0 + 5.5, this.p.z - 9);
    _at.set(this.p.x - 1, this.p.y, this.p.z);
    const k = snap ? 1 : damp(5, dt);
    g.camera.position.lerp(_eye, k);
    if (snap) this.look.copy(_at);
    else this.look.lerp(_at, k);
    g.camera.lookAt(this.look);
  }

  private out() {
    const g = this.g;
    this.ring.visible = false;
    const d = this.park.dive;
    g.pos.x = d.x;
    g.pos.z = d.z;
    g.benji.lift = 0;
    g.benji.pose = null;
    g.end("walk");
    if (this.call) g.toast(this.call, 3);
  }

  quit() {
    this.call = "";
    this.out();
  }

  hud(h: HudState) {
    h.machine = {
      name: "High Dive",
      stats: [
        ["Flips", `${this.turns}`, "#39ff14"],
        ["Best", `${this.g.save.best.dive ?? 0}`, "#f4d77a"],
      ],
      call: this.call,
      meter: false,
      act: this.phase === "top" ? "Jump" : "Flip",
    };
  }

  get state() {
    return { phase: this.phase, turns: this.turns, y: this.p.y };
  }
}

/**
 * Seated drawings, and for each where the seat meets it and how much of it goes out of sight, as
 * shares of its height up from the soles. Sat on the swing: knees bent, the shins hang down out of
 * sight. Leant back on the slide: legs out over the front, hands up. Sat on a stool: the stool is
 * in the drawing, so it goes with the shins.
 */
const SEATED = { swing: [0.27, 0.24], slide: [0.2, 0.02], sit: [0.35, 0.37] } as const;

/**
 * Sit a drawing down inside something whose rim is at `rimY`: a tube, a raft, a car, a log. With a
 * seated drawing he sits in it, down in the seat, and the knees or the legs come over the front;
 * `lean` has him lie back with his hands up, for the slides. Without one (or with `stand`, chest
 * deep in a pool) the waist up shows above the rim and the rest is inside it, out of sight.
 */
export function seatIn(
  card: Card,
  rimY: number,
  groundY: number,
  show = 0.56,
  how: "sit" | "lean" | "stand" = "sit",
) {
  card.speed = 0;
  const pose =
    how === "stand"
      ? null
      : how === "lean" && card.has("slide")
        ? "slide"
        : card.has("swing")
          ? "swing"
          : card.has("sit")
            ? "sit"
            : null;
  if (!pose) {
    card.pose = null;
    card.side = false;
    card.sink = card.height * (1 - show);
    card.lift = rimY - groundY - card.sink;
    return;
  }
  const [seat, hide] = SEATED[pose];
  const h = card.heightOf(pose);
  card.pose = pose;
  // The swing and the slide are drawn from the side only.
  card.side = pose !== "sit";
  card.sink = Math.max(0.01, hide * h);
  // Down in the seat, a hand below the rim.
  card.lift = rimY - 0.14 - groundY - seat * h;
}

/** A soft round drop, so spray reads as water and not as squares. */
let drop: THREE.Texture | null = null;
function dropTex() {
  if (drop) return drop;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.5, "rgba(235,248,255,0.8)");
  gr.addColorStop(1, "rgba(235,248,255,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  drop = new THREE.CanvasTexture(c);
  return drop;
}

/** White water thrown up behind a rider and out of a splash: a pool of drops under gravity. */
export class Spray {
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private next = 0;
  private geo = new THREE.BufferGeometry();
  readonly points: THREE.Points;

  constructor(
    parent: THREE.Object3D,
    private n = 220,
  ) {
    this.pos = new Float32Array(n * 3).fill(-999);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(
      this.geo,
      new THREE.PointsMaterial({
        color: 0xf2fbff,
        map: dropTex(),
        alphaTest: 0.05,
        size: 0.09,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    parent.add(this.points);
  }

  /** `count` drops from a point, flung out at up to `speed`, with `up` more upward. */
  emit(x: number, y: number, z: number, count: number, speed: number, up = 1) {
    for (let k = 0; k < count; k++) {
      const i = this.next++ % this.n;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * r;
      this.vel[i * 3 + 1] = up * (0.5 + Math.random()) * speed * 0.8;
      this.vel[i * 3 + 2] = Math.sin(a) * r;
      this.life[i] = 0.5 + Math.random() * 0.7;
    }
  }

  update(dt: number) {
    let any = false;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i]! <= 0) continue;
      any = true;
      this.life[i]! -= dt;
      this.vel[i * 3 + 1]! -= G * dt;
      this.pos[i * 3]! += this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1]! += this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2]! += this.vel[i * 3 + 2]! * dt;
      if (this.life[i]! <= 0) this.pos[i * 3 + 1] = -999;
    }
    if (any) (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** A ride tube: thick, bright, two handles. */
function rideTube(color: number) {
  const g = new THREE.Group();
  const geo = new THREE.TorusGeometry(0.62, 0.27, 10, 22);
  geo.rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.45 })));
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.03, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }),
    );
    h.position.set(s * 0.62, 0.26, 0);
    h.rotation.y = Math.PI / 2;
    g.add(h);
  }
  g.visible = false;
  return g;
}

/**
 * Everybody else on the water: a rider in every tube going round the lazy river and in half the
 * rafts on the wave pool, sat down inside them, spinning slowly, riding the waves.
 */
export class Floaters {
  private riders: { card: Card; mesh: THREE.Mesh; seed: number }[] = [];

  constructor(park: Waterpark, people: { art: CardArt; height: number }[]) {
    const seats = [...park.floats, ...park.rafts.filter((_, i) => i % 2 === 0)];
    seats.forEach((mesh, i) => {
      const w = people[i % Math.max(1, people.length)];
      if (!w) return;
      const card = new Card(w.art, w.height);
      park.group.add(card.group);
      this.riders.push({ card, mesh, seed: i * 1.7 });
    });
  }

  update(
    dt: number,
    camera: THREE.Vector3,
    tint: THREE.Color,
    time: number,
    near: boolean,
    clear?: { x: number; z: number } | null,
  ) {
    for (const r of this.riders) {
      const c = r.card;
      const close =
        clear && Math.hypot(r.mesh.position.x - clear.x, r.mesh.position.z - clear.z) < 2.4;
      // A tube that drifts into Benji's: it and its rider duck out of the way for a moment.
      r.mesh.visible = !close || !!r.mesh.userData.held;
      c.visible = near && !r.mesh.userData.held && !close;
      if (c.visible) {
        c.place(r.mesh.position.x, r.mesh.position.z);
        seatIn(c, r.mesh.position.y + 0.16, Y0);
        c.heading = time * 0.25 + r.seed;
        c.tilt = Math.sin(time * 1.3 + r.seed) * 0.05;
      }
      c.update(dt, camera, tint, Y0);
    }
  }
}

/**
 * The Twister: the tallest spiral off the tower, three turns in a tube. The water carries him
 * faster and faster and the turns throw him up the wall; A and D spin the tube for style. The
 * splash pool says how fast, and how many spins.
 */
export class Twister implements Activity {
  hints: [string, string][] = [
    ["Space", "Push off"],
    ["A / D", "Spin the tube"],
    ["Q", "Climb back down"],
  ];
  private phase: "top" | "down" | "splash" = "top";
  private t = 0;
  private s = 0;
  private v = 0;
  private top = 0;
  private len = 1;
  private bank = 0;
  private spin = 0;
  private spinV = 0;
  private turned = 0;
  private call = "";
  private ring = splashRing();
  private look = new THREE.Vector3();
  private tube = rideTube(0xff7a2a);
  private spray: Spray;
  private c = new THREE.Vector3();
  private wall = new THREE.Vector3();

  constructor(
    private g: Game,
    private park: Waterpark,
  ) {
    this.len = park.twister.getLength();
    park.group.add(this.ring, this.tube);
    this.spray = new Spray(park.group);
  }

  get spins() {
    return Math.floor(Math.abs(this.turned) / (Math.PI * 2));
  }

  start() {
    this.phase = "top";
    this.t = this.s = this.v = this.top = this.bank = this.spin = this.spinV = this.turned = 0;
    this.call = "Space to push off";
    this.tube.visible = true;
    this.place(0);
    this.frame(0, true);
    this.g.push();
  }

  /** Off the top. Also what the tests call. */
  go() {
    if (this.phase !== "top") return;
    this.phase = "down";
    this.t = 0;
    this.v = 1.6;
    this.call = "HERE WE GO!";
    this.g.sound.whoosh();
    this.g.buzz(30);
    this.g.push();
  }

  private place(dt: number) {
    const g = this.g;
    const tw = this.park.twister;
    const u = clamp(this.s / this.len, 0, 0.999);
    tw.getPointAt(u, _p);
    tw.getTangentAt(u, _t);
    const side = _side.crossVectors(_t, UP).normalize();
    const n = _n.crossVectors(side, _t).normalize();
    // Thrown up the outside wall by the turn: how hard depends on the speed.
    tw.getTangentAt(Math.min(0.999, u + 0.01), _t2);
    const turn = _t2.clone().sub(_t);
    const k = turn.length() / Math.max(0.01, this.len * 0.01);
    const out = -Math.sign(turn.dot(side)) || 0;
    const want = clamp(out * Math.atan((this.v * this.v * k) / G), -1.25, 1.25);
    this.bank += (want - this.bank) * (dt > 0 ? damp(5, dt) : 1);
    // The tube rides 0.7 m out from the middle of the chute, round its wall.
    const r = 0.62;
    this.wall
      .copy(side)
      .multiplyScalar(Math.sin(this.bank))
      .addScaledVector(n, -Math.cos(this.bank));
    this.c.copy(_p).addScaledVector(this.wall, r);
    this.tube.position.copy(this.c);
    _q.setFromUnitVectors(UP, _down.copy(this.wall).negate());
    _q2.setFromAxisAngle(_down, this.spin);
    this.tube.quaternion.copy(_q2.multiply(_q));
    g.pos.x = this.c.x;
    g.pos.z = this.c.z;
    g.heading = Math.atan2(_t.x, _t.z) + this.spin;
    seatIn(g.benji, this.c.y + 0.2, standHeight(this.c.x, this.c.z), 0.56, "lean");
    g.benji.tilt = -this.bank * 0.5;
  }

  update(dt: number) {
    const g = this.g;
    this.t += dt;
    if (this.phase === "top") {
      if (g.input.hit("action") || this.t > 6) this.go();
      this.place(dt);
    } else if (this.phase === "down") {
      const tw = this.park.twister;
      const u = clamp(this.s / this.len, 0, 0.999);
      tw.getTangentAt(u, _t);
      this.v = Math.max(0.8, this.v + (-_t.y * G - 0.01 * this.v * this.v - 0.25) * dt);
      this.s += this.v * dt;
      this.top = Math.max(this.top, this.v);
      // Spin the tube: A one way, D the other; it keeps turning a while after.
      const m = g.input.move().x;
      this.spinV = clamp(this.spinV + -m * 6 * dt, -5, 5) * (1 - Math.min(1, dt * 0.8));
      this.spin += this.spinV * dt;
      this.turned += this.spinV * dt;
      this.place(dt);
      this.spray.emit(
        this.c.x,
        this.c.y - 0.15,
        this.c.z,
        Math.ceil(this.v / 5),
        0.6 + this.v * 0.08,
        0.6,
      );
      this.call =
        Math.abs(this.bank) > 0.85
          ? "UP THE WALL!"
          : this.spins > 0
            ? `${this.spins} SPIN${this.spins > 1 ? "S" : ""}`
            : "A / D to spin";
      if (Math.abs(this.bank) > 0.85 && this.t % 0.5 < dt) g.buzz(15);
      if (this.s >= this.len) this.splash();
    } else {
      const k = clamp(this.t / 1.3, 0, 1);
      this.ring.scale.setScalar(1 + k * 6);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      if (this.t > 1.8) this.done();
    }
    this.spray.update(dt);
    g.live.meter = clamp(this.v / 16, 0, 1);
    g.live.sweetLo = 0.7;
    g.live.sweetHi = 1;
    this.frame(dt, false);
  }

  private splash() {
    const g = this.g;
    this.phase = "splash";
    this.t = 0;
    this.park.twister.getPointAt(1, _p);
    this.ring.position.set(_p.x, Y0 + WATERPARK.waterY + 0.03, _p.z);
    this.ring.visible = true;
    this.spray.emit(_p.x, Y0 + WATERPARK.waterY, _p.z, 90, 3.2, 1.4);
    g.sound.splash(1.2);
    g.sound.cheer();
    g.buzz([40, 30, 60]);
    this.call = `${kmh(this.top)} · ${this.spins} SPINS`;
    g.push();
  }

  private done() {
    const g = this.g;
    this.ring.visible = false;
    this.tube.visible = false;
    const best = g.save.best.twister ?? 0;
    const score = Math.round(this.top * 3.6) + this.spins * 5;
    const record = score > best;
    if (record) g.save.best.twister = score;
    const pay = Math.round(this.top * 1.2) + this.spins * 2;
    const win = this.top * 3.6 >= 45 || this.spins >= 3;
    g.earn(pay, win ? 1 : 0, { quiet: true });
    g.emit("twister", score);
    g.end("walk");
    g.showResults(
      {
        title: win ? "TWISTED!" : "SPLASHDOWN",
        sub: "Adventure River · Twister",
        rows: [
          ["Top speed", kmh(this.top)],
          ["Spins", `${this.spins}`],
          ["Score", `${score}`],
          ["Best", `${Math.max(best, score)}`],
        ],
        pay,
        respect: win ? 1 : 0,
        tickets: 0,
        record,
        again: "Go again",
        win,
      },
      () => g.rideTwister(),
      () => {},
    );
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const u = clamp(this.s / this.len, 0, 0.999);
    this.park.twister.getTangentAt(Math.min(0.999, u + 0.015), _t);
    // From above and behind, looking down into the chute, so its walls never get in the way.
    if (this.phase === "splash") {
      this.park.twister.getTangentAt(1, _t);
      _eye.set(this.c.x + _t.x * 6, this.c.y + 3, this.c.z + _t.z * 6);
      _at.set(this.c.x, this.c.y + 0.4, this.c.z);
    } else {
      _eye.set(this.c.x - _t.x * 2.2, this.c.y + 2.3, this.c.z - _t.z * 2.2);
      _at.set(this.c.x + _t.x * 2.4, this.c.y + _t.y * 2.4, this.c.z + _t.z * 2.4);
    }
    const k = snap ? 1 : damp(this.phase === "down" ? 9 : 4, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    if (snap) this.look.copy(_at);
    // Rattled about at speed.
    const shake = this.phase === "down" ? clamp(this.v / 14, 0, 1) * 0.06 : 0;
    g.camera.position.x += (Math.random() - 0.5) * shake;
    g.camera.position.y += (Math.random() - 0.5) * shake;
    g.camera.lookAt(this.look);
    const fov = 60 + clamp(this.v / 14, 0, 1) * 16;
    if (Math.abs(g.camera.fov - fov) > 0.1) {
      g.camera.fov = fov;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    this.ring.visible = false;
    this.tube.visible = false;
    const st = this.park.twisterStart;
    g.pos.x = st.x;
    g.pos.z = st.z;
    g.live.meter = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    const best = this.g.save.best.twister ?? 0;
    h.machine = {
      name: "Twister",
      stats: [
        ["Speed", kmh(this.v), "#5ae0ff"],
        ["Spins", `${this.spins}`, "#ff7a2a"],
        ["Best", best > 0 ? `${best}` : "-", "#f4d77a"],
      ],
      call: this.call,
      meter: this.phase === "down",
      act: this.phase === "top" ? "Go" : "",
    };
  }

  /** For the tests. */
  get state() {
    return {
      phase: this.phase,
      s: this.s,
      len: this.len,
      v: this.v,
      top: this.top,
      bank: this.bank,
      spins: this.spins,
    };
  }
}

/**
 * A raft on the wave pool. Paddle about with WASD; when the horn goes the big waves come through,
 * and every one he rides over the top of counts. Out again at the beach.
 */
export class RaftRide implements Activity {
  hints: [string, string][] = [
    ["W A S D", "Paddle"],
    ["Q", "Back to the beach"],
  ];
  private raft: THREE.Mesh | null = null;
  private x = 0;
  private z = 0;
  private heading = Math.PI;
  private v = 0;
  private y = 0;
  private lastY = 0;
  private rising = false;
  private ridden = 0;
  private air = 0;
  private hop = 0;
  private t = 0;
  private call = "";
  private look = new THREE.Vector3();
  private spray: Spray;

  constructor(
    private g: Game,
    private park: Waterpark,
  ) {
    this.spray = new Spray(park.group, 120);
  }

  start() {
    const W = WATERPARK.wave;
    // The nearest free raft, brought to the shallow end.
    let best: THREE.Mesh | null = null;
    let bd = 1e9;
    for (const r of this.park.rafts) {
      if (r.userData.held) continue;
      const d = Math.hypot(r.position.x - this.park.beach.x, r.position.z - this.park.beach.z);
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    this.raft = best ?? this.park.rafts[0]!;
    this.raft.userData.held = true;
    this.x = clamp(this.g.pos.x, W.minX + 2, W.maxX - 2);
    this.z = W.minZ + 8;
    this.heading = 0;
    this.v = 0;
    this.ridden = 0;
    this.air = 0;
    this.hop = 0;
    this.t = 0;
    this.y = this.lastY = this.park.waveY(this.x, this.z);
    this.call =
      this.park.surge > 0
        ? "Big waves! Ride them!"
        : "Paddle out. When the horn goes, ride the big ones.";
    this.place(0);
    this.frame(0, true);
    this.g.push();
  }

  private place(dt: number) {
    const g = this.g;
    const r = this.raft!;
    r.position.set(this.x, this.y + 0.1 + this.hop, this.z);
    const slope = this.park.waveY(this.x, this.z + 0.6) - this.park.waveY(this.x, this.z - 0.6);
    r.rotation.set(slope * 0.9, this.heading, 0);
    g.pos.x = this.x;
    g.pos.z = this.z;
    g.heading = this.heading;
    seatIn(g.benji, this.y + 0.28 + this.hop, standHeight(this.x, this.z));
    g.benji.tilt = Math.sin(this.t * 1.7) * 0.04 + slope * 0.3;
    void dt;
  }

  update(dt: number) {
    const g = this.g;
    const W = WATERPARK.wave;
    this.t += dt;
    const m = g.input.move();
    // A turns left, D right; W paddles ahead, S back.
    this.heading -= m.x * 1.7 * dt;
    this.v += (m.y * 3.2 - this.v) * Math.min(1, dt * 1.6);
    // The big waves push him in toward the beach.
    const surge = this.park.surge;
    const slope = this.park.waveY(this.x, this.z + 0.6) - this.park.waveY(this.x, this.z - 0.6);
    this.x += Math.sin(this.heading) * this.v * dt;
    this.z += Math.cos(this.heading) * this.v * dt - Math.max(0, slope) * surge * 3.5 * dt;
    this.x = clamp(this.x, W.minX + 1.2, W.maxX - 1.2);
    this.z = clamp(this.z, W.minZ + 4.5, W.maxZ - 1.5);
    this.lastY = this.y;
    this.y = this.park.waveY(this.x, this.z);
    const vy = (this.y - this.lastY) / Math.max(dt, 1e-3);
    // Over the top of a big one: a moment of air, and it counts.
    if (vy > 0.4) this.rising = true;
    if (this.rising && vy < -0.1) {
      this.rising = false;
      if (surge > 0.4) {
        this.ridden++;
        this.air = 0.45;
        g.sound.splash(0.6);
        g.buzz(25);
        this.spray.emit(this.x, this.y, this.z, 26, 1.8, 1.2);
        this.call = `${this.ridden} WAVE${this.ridden > 1 ? "S" : ""}!`;
        g.push();
      }
    }
    if (this.air > 0) {
      this.air = Math.max(0, this.air - dt);
      this.hop = Math.sin((1 - this.air / 0.45) * Math.PI) * 0.45;
    } else this.hop = 0;
    if (Math.abs(this.v) > 1.2 && this.t % 0.12 < dt)
      this.spray.emit(this.x, this.y, this.z, 2, 0.8, 0.5);
    if (this.park.horn) {
      this.call = "WAVE HORN! Here they come!";
      g.push();
    }
    this.spray.update(dt);
    this.place(dt);
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    _eye.set(
      this.x - Math.sin(this.heading) * 5,
      this.y + 2.6,
      this.z - Math.cos(this.heading) * 5,
    );
    _at.set(this.x + Math.sin(this.heading) * 2, this.y + 0.6, this.z + Math.cos(this.heading) * 2);
    const k = snap ? 1 : damp(4, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    if (snap) this.look.copy(_at);
    g.camera.lookAt(this.look);
    if (Math.abs(g.camera.fov - 56) > 0.1) {
      g.camera.fov = 56;
      g.camera.updateProjectionMatrix();
    }
  }

  private out() {
    const g = this.g;
    if (this.raft) this.raft.userData.held = false;
    this.raft = null;
    const W = WATERPARK.wave;
    g.pos.x = clamp(this.x, W.minX + 1, W.maxX - 1);
    g.pos.z = W.minZ - 1.2;
    g.end("walk");
    if (this.ridden > 0) {
      g.earn(this.ridden * 2, this.ridden >= 4 ? 1 : 0, { quiet: true });
      g.emit("raft", this.ridden);
      g.toast(
        `Rode ${this.ridden} big wave${this.ridden > 1 ? "s" : ""}. +$${this.ridden * 2}`,
        3.5,
      );
    }
  }

  quit() {
    this.out();
  }

  hud(h: HudState) {
    h.machine = {
      name: "Wave Pool",
      stats: [
        ["Waves", `${this.ridden}`, "#5ae0ff"],
        [
          "Surf",
          this.park.surge > 0.3 ? "BIG" : "calm",
          this.park.surge > 0.3 ? "#ff7a2a" : "#39ff14",
        ],
      ],
      call: this.call,
      meter: false,
      act: "",
    };
  }

  /** For the tests. */
  get state() {
    return { ridden: this.ridden, x: this.x, z: this.z, y: this.y, held: !!this.raft };
  }
}
