import * as THREE from "three";
import { Driver } from "../actors/vehicle";
import type { HudState, Solid } from "../core/types";
import { clamp, damp, wrapAngle } from "../core/util";
import type { Activity, Game } from "../game";
import { BRIDGE } from "../world/bridgelights";
import { standHeight } from "../world/ground";
import { FAR_BANK_Z, PIER, RIVER_Z } from "../world/map";

/** Where the river's surface lies. */
const WATER = -0.55;
/** Tied up on the east side of the pier, bow to the open river. */
export const MOORING = { x: PIER.x + PIER.half + 1.5, z: -208.5, heading: Math.PI };
/** Where Benji stands on the pier to step aboard. */
export const BOARD = { x: PIER.x + 1.1, z: MOORING.z };
const TOP = 15;
const FLAT_OUT = 23;
const HALF = 1.15;
/** The water he can use: bank to bank, and a long way up and down river. */
const REACH = { minX: -292, maxX: 292, minZ: FAR_BANK_Z + 8, maxZ: RIVER_Z - 4.5 };
/** Jump ramps: where, which way they run, and their size. Both ends slope, so either way works. */
const RAMPS = [
  { x: 30, z: -292, yaw: Math.PI / 2, len: 9, wide: 4.4, high: 1.5 },
  { x: -128, z: -246, yaw: Math.PI / 2, len: 9, wide: 4.4, high: 1.5 },
];
/** Sacks adrift on the river, bank side to far side, clear of the pier, the bridge and the ramps. */
const SACKS: [number, number][] = [
  [-66, -236],
  [-40, -262],
  [-8, -300],
  [22, -244],
  [58, -276],
  [96, -312],
  [134, -250],
  [176, -288],
  [228, -262],
  [-104, -288],
  [-150, -310],
  [-168, -232],
  [-232, -268],
  [-262, -306],
];

type Foam = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; age: number; life: number; grow: number };
type Sack = { group: THREE.Group; x: number; z: number; got: boolean };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** The speedboat: a white hull with a green rail, a wood foredeck, a screen, two seats and an outboard. */
function makeBoat() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.35, metalness: 0.1 });
  const green = new THREE.MeshStandardMaterial({ color: 0x1fbf2a, roughness: 0.4, emissive: 0x0a3a0c, emissiveIntensity: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6 });
  const plan = (w: number, stern: number, shoulder: number, bow: number) => {
    const s = new THREE.Shape();
    s.moveTo(-w, stern);
    s.lineTo(w, stern);
    s.lineTo(w, shoulder);
    s.quadraticCurveTo(w * 0.86, (shoulder + bow) / 2 + 0.25, 0, bow);
    s.quadraticCurveTo(-w * 0.86, (shoulder + bow) / 2 + 0.25, -w, shoulder);
    s.closePath();
    return s;
  };
  const slab = (shape: THREE.Shape, depth: number, top: number, mat: THREE.Material) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
    // Drawn looking down on it, then laid flat with the bow along +Z.
    geo.rotateX(Math.PI / 2);
    geo.translate(0, top, 0);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  };
  // The bottom, then the sides as a ring left open on top, with a green rail round it.
  const ring = (outer: number, inner: number) => {
    const s = plan(outer, -2.3 - (outer - 0.9), 0.5, 2.5 + (outer - 0.9));
    s.holes.push(plan(inner, -2.16, 0.5, 2.2));
    return s;
  };
  g.add(slab(plan(0.9, -2.3, 0.5, 2.5), 0.42, 0.22, white));
  g.add(slab(ring(0.9, 0.76), 0.3, 0.52, white));
  g.add(slab(ring(0.93, 0.76), 0.05, 0.57, green));
  g.add(slab(plan(0.76, -2.16, 0.5, 2.2), 0.02, 0.24, dark));
  // The foredeck over the bow.
  const fore = new THREE.Shape();
  fore.moveTo(-0.88, 0.55);
  fore.lineTo(0.88, 0.55);
  fore.quadraticCurveTo(0.76, 1.6, 0, 2.46);
  fore.quadraticCurveTo(-0.76, 1.6, -0.88, 0.55);
  g.add(slab(fore, 0.05, 0.6, wood));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.38, roughness: 0.1, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  screen.position.set(0, 0.84, 0.52);
  screen.rotation.x = -0.5;
  g.add(screen);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.04, 0.04), dark);
  bar.position.set(0, 1.06, 0.4);
  g.add(bar);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 16), dark);
  wheel.position.set(-0.32, 0.78, 0.2);
  wheel.rotation.x = -0.9;
  g.add(wheel);
  for (const sx of [-0.36, 0.36]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), dark);
    seat.position.set(sx, 0.34, -0.9);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), dark);
    back.position.set(sx, 0.56, -1.18);
    const pipe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.12), green);
    pipe.position.set(sx, 0.82, -1.18);
    g.add(seat, back, pipe);
  }
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.58, 0.46), dark);
  motor.position.set(0, 0.62, -2.5);
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.48), green);
  cowl.position.set(0, 0.74, -2.5);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.16), dark);
  leg.position.set(0, 0.0, -2.52);
  g.add(motor, cowl, leg);
  return g;
}

/**
 * A boat ride on the Mississippi. She is tied up beside the pier; Benji steps aboard and takes
 * her out. Fourteen sacks are adrift between the bridge and the bend: bringing them all in is
 * the river run, against the clock. Two ramps are anchored out there for anyone who wants air.
 */
export class BoatRide implements Activity {
  hints: [string, string][] = [
    ["W S", "Throttle and reverse"],
    ["A D", "Steer"],
    ["Shift", "Open her up"],
    ["Space", "Horn"],
    ["Q", "Back to the pier"],
  ];
  private boat = makeBoat();
  private d = new Driver();
  private x = MOORING.x;
  private z = MOORING.z;
  private heading = MOORING.heading;
  private vx = 0;
  private vz = 0;
  private steer = 0;
  /** Height above the water she rests on, and how fast it is changing. */
  private y = 0;
  private vy = 0;
  private air = false;
  private airtime = 0;
  private rise = 0;
  private riding = false;
  private leaving = false;
  private foam: Foam[] = [];
  private nextFoam = 0;
  private sacks: Sack[] = [];
  private got = 0;
  private time = 0;
  private done = false;
  private call = "";
  private callLeft = 0;
  private hull: Solid[];
  private bumped = 0;
  private pitch = 0;
  private roll = 0;

  constructor(private g: Game) {
    const ext = g.city.exterior;
    ext.add(this.boat);
    this.boat.rotation.order = "YXZ";
    // Foam: soft white rounds that spread and fade behind her.
    const puff = document.createElement("canvas");
    puff.width = puff.height = 64;
    const pg = puff.getContext("2d")!;
    const fade = pg.createRadialGradient(32, 32, 2, 32, 32, 32);
    fade.addColorStop(0, "rgba(255,255,255,0.95)");
    fade.addColorStop(0.5, "rgba(255,255,255,0.5)");
    fade.addColorStop(1, "rgba(255,255,255,0)");
    pg.fillStyle = fade;
    pg.fillRect(0, 0, 64, 64);
    const soft = new THREE.CanvasTexture(puff);
    const quad = new THREE.PlaneGeometry(1.6, 1.6);
    quad.rotateX(-Math.PI / 2);
    for (let i = 0; i < 44; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: soft, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(quad, mat);
      mesh.visible = false;
      mesh.renderOrder = 2;
      ext.add(mesh);
      this.foam.push({ mesh, mat, age: 0, life: 1, grow: 1 });
    }
    // The sacks: burlap, tied at the neck, each in a ring that can be seen from across the water.
    const burlap = new THREE.MeshStandardMaterial({ color: 0xb08a4f, roughness: 0.95 });
    const tie = new THREE.MeshStandardMaterial({ color: 0x1fbf2a, roughness: 0.5, emissive: 0x0f5f14, emissiveIntensity: 1 });
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.6, 0.4), toneMapped: false });
    const body = new THREE.SphereGeometry(0.42, 10, 8);
    body.scale(1, 1.15, 1);
    const neck = new THREE.CylinderGeometry(0.1, 0.2, 0.24, 8);
    const band = new THREE.TorusGeometry(0.15, 0.035, 6, 12);
    const ring = new THREE.TorusGeometry(1.25, 0.05, 6, 28);
    for (const [x, z] of SACKS) {
      const group = new THREE.Group();
      const b = new THREE.Mesh(body, burlap);
      b.position.y = 0.3;
      const n = new THREE.Mesh(neck, burlap);
      n.position.y = 0.84;
      const t = new THREE.Mesh(band, tie);
      t.rotation.x = Math.PI / 2;
      t.position.y = 0.74;
      const r = new THREE.Mesh(ring, ringMat);
      r.rotation.x = Math.PI / 2;
      r.position.y = 0.04;
      group.add(b, n, t, r);
      group.position.set(x, WATER, z);
      group.visible = false;
      ext.add(group);
      this.sacks.push({ group, x, z, got: false });
    }
    // The ramps: a pontoon with a slope up either end.
    const pontoon = new THREE.MeshStandardMaterial({ color: 0xd8401f, roughness: 0.6 });
    const deck = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.5 });
    for (const r of RAMPS) {
      const group = new THREE.Group();
      const slope = Math.atan2(r.high, r.len / 2);
      const run = Math.hypot(r.high, r.len / 2);
      for (const s of [-1, 1]) {
        const face = new THREE.Mesh(new THREE.BoxGeometry(r.wide, 0.12, run), deck);
        face.position.set(0, r.high / 2 + 0.05, (s * r.len) / 4);
        face.rotation.x = s * slope;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, run), tie);
        stripe.position.copy(face.position);
        stripe.rotation.x = s * slope;
        group.add(face, stripe);
      }
      for (const sx of [-1, 1]) {
        const float = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, r.len + 0.6, 10), pontoon);
        float.rotation.x = Math.PI / 2;
        float.position.set(sx * (r.wide / 2 + 0.2), 0.12, 0);
        group.add(float);
      }
      group.position.set(r.x, WATER, r.z);
      group.rotation.y = r.yaw;
      ext.add(group);
    }
    // What she cannot drive through: the pier and the bridge's three piers.
    const span = (BRIDGE.z1 - BRIDGE.z0) / 2;
    this.hull = [
      { minX: PIER.x - PIER.half - 0.2, maxX: PIER.x + PIER.half + 0.2, minZ: PIER.z1 - 0.4, maxZ: RIVER_Z + 2 },
      ...[BRIDGE.z0, BRIDGE.z0 + span, BRIDGE.z1].map((z) => ({ minX: BRIDGE.x - 9, maxX: BRIDGE.x + 9, minZ: z - 3.5, maxZ: z + 3.5 })),
    ];
    this.moor();
  }

  /** Back on her rope beside the pier. */
  private moor() {
    this.x = MOORING.x;
    this.z = MOORING.z;
    this.heading = MOORING.heading;
    this.vx = this.vz = this.steer = this.y = this.vy = 0;
    this.air = false;
    this.pitch = this.roll = 0;
    this.pose(0);
  }

  /** Put the hull where the numbers say, riding the water. */
  private pose(dt: number) {
    const t = this.g.time;
    const speed = Math.hypot(this.vx, this.vz);
    const k = clamp(speed / FLAT_OUT, 0, 1);
    const bob = this.air ? 0 : Math.sin(t * 1.7 + this.x * 0.3) * 0.045 * (1 - k * 0.6);
    // Bow up as she comes on the plane; nose up off a ramp and down again coming in.
    const wantPitch = this.air ? clamp(-this.vy * 0.045, -0.3, 0.3) : -(0.02 + k * 0.1) - this.rise * 0.04;
    const wantRoll = this.air ? 0 : this.steer * k * 0.3 + Math.sin(t * 1.3) * 0.02 * (1 - k);
    const e = dt > 0 ? damp(7, dt) : 1;
    this.pitch += (wantPitch - this.pitch) * e;
    this.roll += (wantRoll - this.roll) * e;
    this.boat.position.set(this.x, WATER + 0.08 + this.y + bob + k * 0.06, this.z);
    this.boat.rotation.set(this.pitch, this.heading, this.roll);
  }

  /** Tied up, she still rides the swell. The foam she left goes on fading. */
  idle(dt: number) {
    this.fade(dt);
    if (!this.riding) this.pose(dt);
  }

  private fade(dt: number) {
    for (const f of this.foam) {
      if (!f.mesh.visible) continue;
      f.age += dt;
      const k = f.age / f.life;
      if (k >= 1) {
        f.mesh.visible = false;
        continue;
      }
      f.mat.opacity = 0.75 * (1 - k) * (1 - k);
      const s = 0.7 + k * f.grow;
      f.mesh.scale.set(s, 1, s);
    }
  }

  private spray(x: number, z: number, grow: number, life: number) {
    const f = this.foam.find((q) => !q.mesh.visible) ?? this.foam[0]!;
    f.age = 0;
    f.life = life;
    f.grow = grow;
    f.mesh.position.set(x, WATER + 0.03, z);
    f.mesh.scale.set(0.7, 1, 0.7);
    f.mat.opacity = 0.75;
    f.mesh.visible = true;
  }

  /** How high a ramp's deck stands over the water at a point, 0 on open water. */
  private rampAt(x: number, z: number) {
    for (const r of RAMPS) {
      const dx = x - r.x;
      const dz = z - r.z;
      const along = dx * Math.sin(r.yaw) + dz * Math.cos(r.yaw);
      const across = dx * Math.cos(r.yaw) - dz * Math.sin(r.yaw);
      if (Math.abs(across) > r.wide / 2 + 0.5 || Math.abs(along) > r.len / 2) continue;
      return r.high * (1 - Math.abs(along) / (r.len / 2));
    }
    return 0;
  }

  start() {
    const g = this.g;
    this.riding = true;
    this.leaving = false;
    this.moor();
    this.got = 0;
    this.time = 0;
    this.done = false;
    this.nextFoam = 0;
    for (const s of this.sacks) {
      s.got = false;
      s.group.visible = true;
    }
    this.say("Fourteen sacks adrift out there. Bring them in.", 3.4);
    g.sound.setEngine(true, 0.12);
    this.aboard();
    this.sync();
    g.chaseCar(0, this.d, 7.4, 3.1, true, []);
    g.push();
  }

  private say(text: string, seconds = 1.8) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  /** Benji at the wheel. */
  private aboard() {
    const g = this.g;
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    g.pos.x = this.x - fx * 0.3 - fz * 0.3;
    g.pos.z = this.z - fz * 0.3 + fx * 0.3;
    g.heading = this.heading;
    g.benji.speed = 0;
    g.benji.pose = null;
    g.benji.tilt = 0;
    g.benji.lift = this.boat.position.y + 0.25 - standHeight(g.pos.x, g.pos.z);
  }

  /** What the camera follows. */
  private sync() {
    const d = this.d;
    d.x = this.x;
    d.z = this.z;
    d.y = WATER + this.y;
    d.heading = this.heading;
    d.vx = this.vx;
    d.vz = this.vz;
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    this.bumped -= dt;
    const m = input.move();
    const throttle = this.leaving ? 0 : input.throttle();
    const flat = input.down("run");
    if (input.hit("action")) g.sound.horn();

    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    let fwd = this.vx * fx + this.vz * fz;
    let lat = this.vx * fz - this.vz * fx;
    if (!this.air) {
      const top = flat ? FLAT_OUT : TOP;
      if (throttle > 0) fwd += 9.5 * (flat ? 1.35 : 1) * throttle * clamp(1 - fwd / top, 0, 1) * dt;
      else if (throttle < 0) fwd += (fwd > 0.6 ? 11 : 4.5 * clamp(1 + fwd / 4.5, 0, 1)) * throttle * dt;
      // Water takes speed off all the time, and takes a slide off slower than tyres would.
      fwd -= fwd * damp(throttle === 0 ? 0.55 : 0.2, dt);
      lat -= lat * damp(2.3, dt);
      this.steer += ((this.leaving ? 0 : m.x) - this.steer) * damp(6, dt);
      const bite = clamp(Math.abs(fwd) / 4.5, 0, 1) * (1.55 - 0.7 * clamp(Math.abs(fwd) / FLAT_OUT, 0, 1));
      this.heading = wrapAngle(this.heading - this.steer * bite * Math.sign(fwd || 1) * dt);
    }
    const nfx = Math.sin(this.heading);
    const nfz = Math.cos(this.heading);
    this.vx = nfx * fwd + nfz * lat;
    this.vz = nfz * fwd - nfx * lat;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.collide();

    // Up a ramp and off the top of it.
    const sup = this.rampAt(this.x, this.z);
    if (this.air) {
      this.vy -= 15 * dt;
      this.y += this.vy * dt;
      this.airtime += dt;
      if (this.y <= sup) this.land(sup);
    } else {
      const rise = dt > 0 ? (sup - this.y) / dt : 0;
      if (rise < -2.5 && this.rise > 2.5) {
        // The deck fell away under her: she is flying.
        this.air = true;
        this.airtime = 0;
        this.vy = this.rise;
        g.sound.whoosh();
      } else {
        this.y = sup;
        this.rise = clamp(rise, -12, 12);
      }
    }

    const speed = Math.hypot(this.vx, this.vz);
    // Foam off the stern, more of it the faster she goes.
    this.nextFoam -= dt * Math.max(speed, 0.4);
    if (this.nextFoam <= 0 && !this.air && speed > 1.2) {
      this.nextFoam = 0.7;
      const side = (Math.random() - 0.5) * 0.9;
      this.spray(this.x - nfx * 2.4 + nfz * side, this.z - nfz * 2.4 - nfx * side, 1.6 + speed * 0.12, 1.5 + speed * 0.04);
    }
    this.fade(dt);

    // Sacks: alongside is close enough.
    for (const s of this.sacks) {
      if (s.got) continue;
      s.group.position.y = WATER + Math.sin(g.time * 1.9 + s.x) * 0.06;
      s.group.rotation.y += dt * 0.6;
      if (Math.hypot(s.x - this.x, s.z - this.z) < 2.5) this.collect(s);
    }
    if (!this.done && this.got > 0) this.time += dt;

    this.pose(dt);
    this.aboard();
    this.sync();
    g.sound.setEngine(true, 0.14 + clamp(speed / FLAT_OUT, 0, 1) * 0.86, flat && throttle > 0);
    g.live.speed = speed;
    if (!this.leaving) {
      const home = Math.hypot(this.x - MOORING.x, this.z - MOORING.z) < 7.5;
      if (home && speed < 7 && input.hit("interact")) this.leave();
      g.chaseCar(dt, this.d, 7.4, 3.1, false, []);
    }
  }

  private collect(s: Sack) {
    const g = this.g;
    s.got = true;
    s.group.visible = false;
    this.got++;
    this.spray(s.x, s.z, 3.2, 1.2);
    g.sound.cash();
    g.buzz(20);
    const left = SACKS.length - this.got;
    if (left > 0) {
      g.earn(10, 0, { quiet: true });
      this.say(left === 1 ? "One more out there" : `SACK  +$10   ${left} to go`, 1.3);
      return;
    }
    // The lot: the river run is done.
    this.done = true;
    const secs = Math.round(this.time);
    const best = g.save.best.river ?? 0;
    const record = best === 0 || secs < best;
    if (record) g.save.best.river = secs;
    g.earn(120, 4);
    g.moment(record && best !== 0 ? 3 : 2);
    g.emit("river", secs);
    this.say(record ? `RIVER RUN  ${clock(secs)}  ·  YOUR BEST` : `RIVER RUN  ${clock(secs)}   best ${clock(best)}`, 4);
  }

  /** Banks, the far reaches, the pier, the bridge and the steamer. */
  private collide() {
    const g = this.g;
    const hit = (nx: number, nz: number) => {
      const into = this.vx * nx + this.vz * nz;
      if (into >= 0) return;
      this.vx -= nx * into * 1.3;
      this.vz -= nz * into * 1.3;
      if (-into > 2.5 && this.bumped <= 0) {
        this.bumped = 0.4;
        g.sound.board();
        g.sound.splash(Math.min(1, -into / 12));
        g.buzz(30);
        g.stage.setPunch(Math.min(0.6, -into / 20));
      }
    };
    const R = REACH;
    if (this.x < R.minX) {
      this.x = R.minX;
      hit(1, 0);
    }
    if (this.x > R.maxX) {
      this.x = R.maxX;
      hit(-1, 0);
    }
    if (this.z < R.minZ) {
      this.z = R.minZ;
      hit(0, 1);
    }
    if (this.z > R.maxZ) {
      this.z = R.maxZ;
      hit(0, -1);
    }
    const s = g.city.boat.group.position;
    const boxes = [...this.hull, { minX: s.x - 21, maxX: s.x + 21, minZ: s.z - 5.2, maxZ: s.z + 5.2 }];
    for (const b of boxes) {
      const px = clamp(this.x, b.minX, b.maxX);
      const pz = clamp(this.z, b.minZ, b.maxZ);
      let dx = this.x - px;
      let dz = this.z - pz;
      let d = Math.hypot(dx, dz);
      if (d >= HALF) continue;
      if (d < 1e-4) {
        // Inside it: out by the nearest side.
        const out = [this.x - b.minX, b.maxX - this.x, this.z - b.minZ, b.maxZ - this.z];
        const k = out.indexOf(Math.min(...out));
        dx = k === 0 ? -1 : k === 1 ? 1 : 0;
        dz = k === 2 ? -1 : k === 3 ? 1 : 0;
        this.x = k === 0 ? b.minX - HALF : k === 1 ? b.maxX + HALF : this.x;
        this.z = k === 2 ? b.minZ - HALF : k === 3 ? b.maxZ + HALF : this.z;
        hit(dx, dz);
        continue;
      }
      dx /= d;
      dz /= d;
      this.x = px + dx * HALF;
      this.z = pz + dz * HALF;
      d = HALF;
      hit(dx, dz);
    }
  }

  private land(sup: number) {
    const g = this.g;
    const hard = -this.vy;
    this.air = false;
    this.y = sup;
    this.vy = 0;
    this.rise = 0;
    g.sound.splash(clamp(hard / 9, 0.3, 1));
    g.stage.setPunch(clamp(hard / 14, 0.2, 0.7));
    g.input.rumble(0.7, 180);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.spray(this.x + Math.sin(a) * 1.3, this.z + Math.cos(a) * 1.3, 3.4, 1.3);
    }
    if (this.airtime > 0.45) {
      const pay = Math.round(this.airtime * 20);
      g.earn(pay, 0, { quiet: true });
      const best = g.save.best.air ?? 0;
      const tenths = Math.round(this.airtime * 10);
      if (tenths > best) g.save.best.air = tenths;
      this.say(`AIR  ${this.airtime.toFixed(1)}s   +$${pay}`, 1.6);
      g.emit("air", tenths);
    }
  }

  /** Bring her in and step back onto the pier. */
  private leave() {
    const g = this.g;
    if (this.leaving) return;
    this.leaving = true;
    g.transition(() => {
      this.riding = false;
      this.moor();
      for (const s of this.sacks) s.group.visible = false;
      g.sound.setEngine(false);
      g.pos.x = BOARD.x;
      g.pos.z = BOARD.z;
      g.heading = Math.PI / 2;
      g.camYaw = Math.PI / 2;
      g.live.speed = 0;
      g.end("walk");
    });
  }

  quit() {
    this.leave();
  }

  hud(h: HudState) {
    const best = this.g.save.best.river ?? 0;
    const speed = Math.hypot(this.vx, this.vz);
    const home = !this.leaving && Math.hypot(this.x - MOORING.x, this.z - MOORING.z) < 7.5 && speed < 7;
    h.machine = {
      name: "On the river",
      stats: [
        ["Sacks", `${this.got} of ${SACKS.length}`, "#39ff14"],
        ["Time", clock(this.time)],
        ["Speed", `${Math.round(speed * 2.237)} mph`],
        ["Best run", best > 0 ? clock(best) : "-", "#f4d77a"],
      ],
      call: this.call || (home && this.got > 0 ? "E: tie up at the pier" : ""),
      meter: false,
      act: "Horn",
    };
  }

  /** For the tests. */
  get state() {
    return { x: this.x, z: this.z, heading: this.heading, speed: Math.hypot(this.vx, this.vz), y: this.y, air: this.air, got: this.got, time: this.time, riding: this.riding, sacks: SACKS, ramps: RAMPS, done: this.done };
  }

  /** For the tests: put her somewhere, pointing some way, at some speed. */
  set(x: number, z: number, heading: number, speed = 0) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.vx = Math.sin(heading) * speed;
    this.vz = Math.cos(heading) * speed;
  }
}
