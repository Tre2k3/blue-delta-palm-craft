import * as THREE from "three";
import type { HudState } from "../core/types";
import { clamp, damp } from "../core/util";
import type { Activity, Game } from "../game";
import { CURB, WATERPARK } from "../world/map";
import type { Waterpark } from "../world/waterpark";

const Y0 = CURB;
const G = 9.8;

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _at = new THREE.Vector3();

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

  constructor(
    private g: Game,
    private park: Waterpark,
  ) {
    this.len = park.geronimo.getLength();
    park.group.add(this.ring);
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
    g.benji.lift = Math.max(0, _p.y - Y0 - 0.15);
    g.benji.speed = 0;
    g.benji.pose = null;
    // Lying back down the chute; sitting up when he is not tucked.
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
      if (this.s >= this.len) this.splash();
    } else {
      // The ring spreads and fades.
      const k = clamp(this.t / 1.3, 0, 1);
      this.ring.scale.setScalar(1 + k * 6);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      g.benji.lift = Math.max(0, WATERPARK.waterY - 0.3);
      if (this.t > 1.6) this.done();
    }
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
    g.sound.crash(0.35);
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
    if (this.phase === "splash") _eye.set(_p.x - 6, _p.y + 2.6, _p.z - 3);
    else _eye.set(_p.x - _t.x * 3.6, _p.y + 1.7 - _t.y * 2, _p.z - _t.z * 3.6);
    _at.set(_p.x + _t.x * 4, _p.y + _t.y * 4 + 0.4, _p.z + _t.z * 4);
    const k = snap ? 1 : damp(this.phase === "down" ? 10 : 4, dt);
    g.camera.position.lerp(_eye, k);
    this.look.lerp(_at, k);
    if (snap) this.look.copy(_at);
    g.camera.lookAt(this.look);
    const fov = 60 + clamp(this.v / 18, 0, 1) * 14;
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
    const sat = g.benji.has("swing");
    g.benji.pose = sat ? "swing" : null;
    g.benji.lift = Math.max(0, _p.y - Y0 - (sat ? 0.2 : 0.45));
    g.benji.speed = 0;
    this.tube.position.set(_p.x, _p.y, _p.z);
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
