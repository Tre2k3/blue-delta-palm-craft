import * as THREE from "three";
import type { Catch, HudState } from "../core/types";
import { clamp, damp, lerp } from "../core/util";
import type { Activity, Game } from "../game";
import { tex } from "../gfx/tex";
import { CURB, PIER } from "../world/map";

const WATER = -0.55;
const DECK = CURB;

type Species = { name: string; min: number; max: number; base: number; rate: number; rarity: string; color: string; odds: number; far: number; night?: number };

const SPECIES: Species[] = [
  { name: "Bluegill", min: 0.3, max: 1.2, base: 8, rate: 6, rarity: "Common", color: "#6fa8c9", odds: 30, far: 0 },
  { name: "White Crappie", min: 0.5, max: 2.2, base: 9, rate: 6, rarity: "Common", color: "#c9c7b0", odds: 26, far: 0 },
  { name: "Largemouth Bass", min: 2, max: 7.5, base: 14, rate: 6, rarity: "Uncommon", color: "#5f8a3a", odds: 18, far: 8 },
  { name: "Channel Catfish", min: 3, max: 12, base: 16, rate: 5, rarity: "Uncommon", color: "#7a7f86", odds: 14, far: 10, night: 2.2 },
  { name: "Flathead Catfish", min: 8, max: 30, base: 30, rate: 5, rarity: "Rare", color: "#8a6a3a", odds: 6, far: 15, night: 2 },
  { name: "Alligator Gar", min: 15, max: 60, base: 60, rate: 4, rarity: "Epic", color: "#4a6a52", odds: 2.4, far: 19 },
  { name: "Paddlefish", min: 20, max: 70, base: 70, rate: 4, rarity: "Epic", color: "#59607a", odds: 1.8, far: 21 },
  { name: "Golden Moneybag", min: 1, max: 1, base: 300, rate: 0, rarity: "Legendary", color: "#e0b33a", odds: 0.7, far: 12 },
];

type Phase = "ready" | "charge" | "flying" | "wait" | "bite" | "reel" | "landed" | "lost";

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _tip = new THREE.Vector3();

/**
 * A line off the pier. Cast by timing the meter, hook on the dip, then bring it in: hold to
 * reel, let go while it runs. It is meant to be easy: the bite waits two seconds and comes
 * round a second time, slack never loses a fish, and a fish cannot run the reel empty. Small
 * fish come straight in. The one way to lose a fish on the line is to haul on a big one right
 * through its runs until the line snaps.
 */
export class Fishing implements Activity {
  hints: [string, string][] = [
    ["Hold Space", "Cast, then reel"],
    ["Space", "Hook it when the float goes under"],
    ["Let go", "While the fish runs"],
    ["A D", "Lean against it: faster"],
    ["Q", "Pack up"],
  ];
  private group = new THREE.Group();
  private rod: THREE.Mesh;
  private line: THREE.Line;
  private linePos: Float32Array;
  private bobber: THREE.Mesh;
  private shadow: THREE.Mesh;
  private fishMesh: THREE.Group;
  private fishSkin: THREE.MeshStandardMaterial;
  private drops: THREE.Points;
  private dropPos: Float32Array;
  private dropVel: Float32Array;
  private dropLife: Float32Array;
  private phase: Phase = "ready";
  private t = 0;
  private power = 0;
  private dx = 0;
  private dz = -1;
  private cast = { x: 0, z: 0 };
  private from = new THREE.Vector3();
  private bob = new THREE.Vector3();
  private dist = 0;
  private waitFor = 0;
  private nibble = 0;
  private fish: Catch | null = null;
  private strength = 1;
  private tension = 0;
  private running = false;
  private mood = 0;
  private side = 0;
  private drift = 0;
  private slack = 0;
  /** Bites this cast has had: the fish comes back once if the first is missed. */
  private bites = 0;
  private call = "";
  private cam = new THREE.Vector3();
  private look = new THREE.Vector3();
  private shadowAng = 0;

  constructor(private g: Game) {
    const rg = new THREE.CylinderGeometry(0.012, 0.03, 2.5, 6);
    rg.translate(0, 1.25, 0);
    this.rod = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.5 }));
    this.rod.castShadow = true;
    this.linePos = new Float32Array(14 * 3);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(this.linePos, 3));
    this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf2f2e8, transparent: true, opacity: 0.75 }));
    this.line.frustumCulled = false;
    this.bobber = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 14, 10),
      new THREE.MeshStandardMaterial({
        map: tex(4, 16, (c, w, h) => {
          c.fillStyle = "#f4f1ea";
          c.fillRect(0, 0, w, h);
          c.fillStyle = "#e0261c";
          c.fillRect(0, 0, w, h / 2);
        }),
        roughness: 0.3,
        emissive: 0x401008,
      }),
    );
    const sg = new THREE.CircleGeometry(0.5, 18);
    sg.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x02080c, transparent: true, opacity: 0.42, depthWrite: false }));
    this.shadow.renderOrder = 3;

    this.fishSkin = new THREE.MeshStandardMaterial({ color: 0x6fa8c9, roughness: 0.35, metalness: 0.3 });
    this.fishMesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), this.fishSkin);
    body.scale.set(1, 0.42, 0.26);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.42, 4), this.fishSkin);
    tail.rotation.z = Math.PI / 2;
    tail.scale.set(1, 1, 0.2);
    tail.position.x = -0.62;
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 3), this.fishSkin);
    fin.position.set(0.02, 0.24, 0);
    fin.scale.z = 0.2;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x101010 }));
    eye.position.set(0.34, 0.06, 0.1);
    const eye2 = eye.clone();
    eye2.position.z = -0.1;
    this.fishMesh.add(body, tail, fin, eye, eye2);
    this.fishMesh.traverse((o) => (o.castShadow = true));

    const N = 60;
    this.dropPos = new Float32Array(N * 3);
    this.dropVel = new Float32Array(N * 3);
    this.dropLife = new Float32Array(N);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(this.dropPos, 3));
    this.drops = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xdff2ff, size: 0.14, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
    this.drops.frustumCulled = false;
    this.group.add(this.rod, this.line, this.bobber, this.shadow, this.fishMesh, this.drops);
    this.group.visible = false;
    g.city.exterior.add(this.group);
  }

  start(spot: { x: number; z: number }) {
    const g = this.g;
    const off = spot.x - PIER.x;
    if (Math.abs(off) < 0.4) {
      this.dx = 0;
      this.dz = -1;
    } else {
      this.dx = Math.sign(off);
      this.dz = 0;
    }
    g.pos.x = spot.x;
    g.pos.z = spot.z;
    g.heading = Math.atan2(this.dx, this.dz);
    g.fishTrip = 0;
    this.group.visible = true;
    this.fishMesh.visible = false;
    for (let i = 0; i < this.dropLife.length; i++) this.dropLife[i] = 0;
    this.ready("Hold Space to charge the cast.");
    this.frame(0, true);
  }

  private say(text: string) {
    this.call = text;
    this.g.push();
  }

  private ready(text: string) {
    this.phase = "ready";
    this.t = 0;
    this.tension = 0;
    this.fish = null;
    this.bites = 0;
    this.bobber.visible = false;
    this.shadow.visible = false;
    this.line.visible = false;
    this.say(text);
  }

  private burst(x: number, z: number, n: number, power: number) {
    let made = 0;
    for (let i = 0; i < this.dropLife.length && made < n; i++) {
      if (this.dropLife[i]! > 0) continue;
      this.dropLife[i] = 0.5 + Math.random() * 0.5;
      const a = Math.random() * Math.PI * 2;
      const s = (0.6 + Math.random() * 1.6) * power;
      this.dropPos[i * 3] = x;
      this.dropPos[i * 3 + 1] = WATER + 0.05;
      this.dropPos[i * 3 + 2] = z;
      this.dropVel[i * 3] = Math.cos(a) * s;
      this.dropVel[i * 3 + 1] = (2.2 + Math.random() * 2.4) * power;
      this.dropVel[i * 3 + 2] = Math.sin(a) * s;
      made++;
    }
  }

  private splash(power: number) {
    const g = this.g;
    g.sound.splash(power);
    g.city.water.ripple(this.bob.x, this.bob.z, power);
    this.burst(this.bob.x, this.bob.z, Math.round(10 + power * 16), 0.6 + power * 0.6);
  }

  private pickFish() {
    const night = this.g.sky.phase === "night";
    const pool = SPECIES.filter((s) => this.dist >= s.far);
    const total = pool.reduce((sum, s) => sum + s.odds * (night && s.night ? s.night : 1), 0);
    let r = Math.random() * total;
    let sp = pool[0]!;
    for (const s of pool) {
      r -= s.odds * (night && s.night ? s.night : 1);
      if (r <= 0) {
        sp = s;
        break;
      }
    }
    const u = Math.random() ** 1.7;
    const lb = Math.round(lerp(sp.min, sp.max, u) * 10) / 10;
    this.fish = { name: sp.name, lb, pay: Math.round(sp.base + lb * sp.rate), rarity: sp.rarity, color: sp.color };
    this.strength = 0.55 + Math.min(1.25, lb / 24);
    this.fishSkin.color.set(sp.color);
    const size = clamp(0.5 + lb / 26, 0.5, 2.4);
    this.fishMesh.scale.setScalar(size);
    this.shadow.scale.set(size * 1.6, 1, size * 0.6);
  }

  private lose(text: string) {
    const g = this.g;
    g.save.bait = Math.max(0, g.save.bait - 1);
    g.sound.bad();
    this.phase = "lost";
    this.t = 0;
    this.shadow.visible = false;
    this.bobber.visible = false;
    this.say(text);
  }

  private land() {
    const g = this.g;
    const f = this.fish!;
    g.save.bait = Math.max(0, g.save.bait - 1);
    g.save.cooler.push(f);
    g.fishTrip++;
    const best = g.save.best.fish ?? 0;
    if (f.lb > best) g.save.best.fish = f.lb;
    g.earn(0, f.rarity === "Common" ? 1 : f.rarity === "Uncommon" ? 2 : 5, { quiet: true });
    // The ones worth telling people about.
    if (f.rarity === "Legendary") g.moment(2);
    else if (f.rarity === "Epic" || f.rarity === "Rare") g.moment(1);
    else g.sound.cheer();
    this.splash(1);
    this.phase = "landed";
    this.t = 0;
    this.from.copy(this.bob);
    this.fishMesh.visible = true;
    this.shadow.visible = false;
    this.bobber.visible = false;
    this.say(`${f.name}, ${f.lb} lb${f.lb > best && best > 0 ? ". New record!" : ""}`);
    g.emit("fish", f.lb, g.fishTrip);
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    this.t += dt;
    const hx = g.pos.x - this.dz * 0.3 + this.dx * 0.25;
    const hz = g.pos.z + this.dx * 0.3 + this.dz * 0.25;
    g.benji.speed = 0;

    if (this.phase === "ready") {
      if (g.save.bait <= 0) {
        g.toast("Out of bait. The shack sells five for $10.");
        this.quit();
        return;
      }
      if (input.down("action")) {
        this.phase = "charge";
        this.t = 0;
        this.say("Let go to cast. Farther water holds bigger fish.");
      }
    } else if (this.phase === "charge") {
      const u = (this.t * 0.95) % 2;
      this.power = u < 1 ? u : 2 - u;
      if (!input.down("action")) {
        this.dist = 6 + this.power * 21;
        this.cast.x = g.pos.x + this.dx * this.dist + (Math.random() - 0.5) * 1.2;
        this.cast.z = g.pos.z + this.dz * this.dist + (Math.random() - 0.5) * 1.2;
        this.phase = "flying";
        this.t = 0;
        this.bobber.visible = true;
        this.line.visible = true;
        g.sound.whoosh();
        this.say("");
      }
    } else if (this.phase === "flying") {
      const u = Math.min(1, this.t / 0.85);
      this.bob.set(lerp(_tip.x, this.cast.x, u), lerp(_tip.y, WATER + 0.04, u) + Math.sin(u * Math.PI) * (2 + this.dist * 0.16), lerp(_tip.z, this.cast.z, u));
      if (u >= 1) {
        this.phase = "wait";
        this.t = 0;
        this.waitFor = 2 + Math.random() * 4.5;
        this.nibble = 0.8 + Math.random() * 1.5;
        this.shadowAng = Math.random() * 6;
        this.splash(0.5);
        this.say("Wait for the dip...");
      }
    } else if (this.phase === "wait") {
      const near = clamp(this.t / this.waitFor, 0, 1);
      this.shadow.visible = near > 0.25;
      this.shadowAng += dt * (1.2 + near);
      const r = lerp(5, 0.7, near);
      this.shadow.position.set(this.cast.x + Math.cos(this.shadowAng) * r, WATER + 0.03, this.cast.z + Math.sin(this.shadowAng) * r);
      this.shadow.rotation.y = -this.shadowAng - Math.PI / 2;
      this.shadow.scale.set(1.1, 1, 0.42);
      this.nibble -= dt;
      const dip = this.nibble < 0 && this.nibble > -0.22 ? -0.07 : 0;
      this.bob.set(this.cast.x, WATER + 0.05 + Math.sin(g.time * 2.4) * 0.025 + dip, this.cast.z);
      if (this.nibble < -0.22) {
        this.nibble = 0.9 + Math.random() * 1.6;
        g.city.water.ripple(this.cast.x, this.cast.z, 0.25);
      }
      if (input.hit("action")) this.say("Not yet. Wait for the float to go under.");
      if (this.t >= this.waitFor) {
        this.phase = "bite";
        this.t = 0;
        this.bites++;
        if (!this.fish) this.pickFish();
        g.sound.bite();
        g.buzz([40, 60, 40]);
        this.splash(0.6);
        this.say("FISH ON!  Space!");
      }
    } else if (this.phase === "bite") {
      this.bob.set(this.cast.x, WATER - 0.12 + Math.sin(this.t * 30) * 0.03, this.cast.z);
      if (input.hit("action")) {
        this.phase = "reel";
        this.t = 0;
        this.tension = 0.2;
        this.running = true;
        this.mood = 1.2;
        this.side = Math.random() > 0.5 ? 1 : -1;
        this.drift = 0;
        this.slack = 0;
        this.bobber.visible = false;
        this.shadow.visible = true;
        g.sound.reel();
        this.say("Hooked! Hold Space to reel.");
      } else if (this.t > (g.wearing("nightmare") ? 3 : 2)) {
        if (this.bites >= 2) this.lose("It took your bait and left.");
        else {
          // Missed it: the float comes back up and the fish has another go.
          this.phase = "wait";
          this.t = 0;
          this.waitFor = 1.6 + Math.random() * 1.2;
          this.nibble = 0.6;
          this.say("Missed it. It's coming back...");
        }
      }
    } else if (this.phase === "reel") {
      const reel = input.down("action");
      const lean = input.move().x;
      this.mood -= dt;
      if (this.mood <= 0) {
        this.running = !this.running;
        g.push();
        this.mood = this.running ? 0.9 + Math.random() * 1.5 * this.strength : 0.9 + Math.random() * 1.4;
        if (this.running) {
          this.side = Math.random() > 0.5 ? 1 : -1;
          this.strength = Math.max(0.4, this.strength - 0.1);
          this.splash(0.45);
          this.say("It's running. LET GO!");
        } else this.say("It's tired. REEL!");
      }
      const against = this.running && Math.sign(lean) === -this.side && Math.abs(lean) > 0.3;
      if (reel) {
        this.dist -= (this.running ? 1.4 : 3.9) * (against ? 1.5 : 1) * dt;
        // A small fish can be hauled straight in. A big one pulls back hard enough to snap the
        // line if it is reeled through its runs; between runs the line always eases.
        this.tension += (this.running ? Math.min(0.7, 0.5 * this.strength ** 2.2) * (against ? 0.5 : 1) : -0.25) * dt;
        if (Math.floor(this.t * 9) !== Math.floor((this.t - dt) * 9)) g.sound.reel();
      } else {
        this.tension -= 0.95 * dt;
        // A running fish takes line, but only so much of it.
        if (this.running) this.dist = Math.min(34, this.dist + 1.2 * this.strength * dt);
      }
      this.tension = Math.max(0, this.tension);
      if (this.running && this.tension < 0.1) this.slack += dt;
      else this.slack = Math.max(0, this.slack - dt * 0.5);
      this.drift += ((this.running ? this.side * 3.2 : 0) - this.drift) * damp(1.4, dt);
      const px = -this.dz;
      const pz = this.dx;
      this.bob.set(g.pos.x + this.dx * this.dist + px * this.drift, WATER - 0.05, g.pos.z + this.dz * this.dist + pz * this.drift);
      this.shadow.position.set(this.bob.x, WATER + 0.03, this.bob.z);
      this.shadow.rotation.y = Math.atan2(this.dx, this.dz) + (this.running ? this.side * 0.9 : Math.PI) + Math.sin(g.time * 9) * 0.25;
      if (this.running && Math.random() < dt * 5) this.burst(this.bob.x, this.bob.z, 2, 0.5);
      if (Math.random() < dt * 1.5) g.city.water.ripple(this.bob.x, this.bob.z, 0.3);
      if (this.tension >= 1) this.lose("Snap! Let go of Space while it runs.");
      else if (this.dist <= 2) this.land();
      else if (this.running && reel && this.tension > 0.7 && this.call !== "LET GO! The line is about to snap") this.say("LET GO! The line is about to snap");
    } else if (this.phase === "landed") {
      const u = Math.min(1, this.t / 0.7);
      const tx = g.pos.x + this.dx * 0.9;
      const tz = g.pos.z + this.dz * 0.9;
      this.fishMesh.position.set(lerp(this.from.x, tx, u), lerp(WATER, DECK + 1.25, u) + Math.sin(u * Math.PI) * 1.6, lerp(this.from.z, tz, u));
      this.fishMesh.rotation.set(0, g.time * 1.2, u < 1 ? Math.sin(this.t * 22) * 0.5 : Math.PI / 2 + Math.sin(this.t * 14) * 0.12);
      this.bob.copy(this.fishMesh.position);
      if (this.t > 2.6 || (this.t > 1 && (input.hit("action") || input.hit("interact")))) {
        this.fishMesh.visible = false;
        this.ready(g.save.bait > 0 ? "In the cooler. Cast again." : "In the cooler.");
      }
    } else if (this.phase === "lost") {
      if (this.t > 1.8) this.ready("Hold Space to cast again.");
    }

    g.live.meter = this.phase === "charge" ? this.power : 0;
    g.live.sweetLo = 0.8;
    g.live.sweetHi = 1;
    g.live.tension = this.phase === "reel" ? this.tension : 0;

    // Rod, line, spray.
    const lift = this.phase === "charge" ? 1.25 - this.power * 0.9 : this.phase === "flying" ? 0.35 : 0.95 - this.tension * 0.5;
    const sway = this.phase === "reel" ? this.drift * 0.08 : 0;
    _dir.set(this.dx * Math.cos(lift) - this.dz * sway, Math.sin(lift), this.dz * Math.cos(lift) + this.dx * sway).normalize();
    this.rod.position.set(hx, DECK + 1.0, hz);
    this.rod.quaternion.setFromUnitVectors(_up, _dir);
    _tip.copy(this.rod.position).addScaledVector(_dir, 2.5);
    if (this.line.visible) {
      const sag = this.phase === "reel" ? (1 - this.tension) * 0.5 : this.phase === "flying" ? 0.1 : 0.9;
      for (let i = 0; i < 14; i++) {
        const u = i / 13;
        this.linePos[i * 3] = lerp(_tip.x, this.bob.x, u);
        this.linePos[i * 3 + 1] = lerp(_tip.y, this.bob.y, u) - Math.sin(u * Math.PI) * sag;
        this.linePos[i * 3 + 2] = lerp(_tip.z, this.bob.z, u);
      }
      (this.line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
    this.bobber.position.copy(this.bob);
    for (let i = 0; i < this.dropLife.length; i++) {
      if (this.dropLife[i]! <= 0) {
        this.dropPos[i * 3 + 1] = -50;
        continue;
      }
      this.dropLife[i]! -= dt;
      this.dropVel[i * 3 + 1]! -= 9.8 * dt;
      this.dropPos[i * 3]! += this.dropVel[i * 3]! * dt;
      this.dropPos[i * 3 + 1]! += this.dropVel[i * 3 + 1]! * dt;
      this.dropPos[i * 3 + 2]! += this.dropVel[i * 3 + 2]! * dt;
      if (this.dropPos[i * 3 + 1]! < WATER) this.dropLife[i] = 0;
    }
    (this.drops.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const px = -this.dz;
    const pz = this.dx;
    const out = this.phase === "wait" || this.phase === "bite" || this.phase === "reel" ? clamp(this.dist / 30, 0.2, 1) : 0.3;
    this.cam.set(g.pos.x - this.dx * 4.6 + px * 1.5, DECK + 2.3 + out * 0.8, g.pos.z - this.dz * 4.6 + pz * 1.5);
    this.look.set(g.pos.x + this.dx * (4 + out * 12), DECK + 0.6, g.pos.z + this.dz * (4 + out * 12));
    if (snap) g.camera.position.copy(this.cam);
    else g.camera.position.lerp(this.cam, damp(3, dt));
    g.camera.lookAt(this.look);
    if (g.camera.fov !== 48) {
      g.camera.fov = 48;
      g.camera.updateProjectionMatrix();
    }
    g.camYaw = Math.atan2(this.dx, this.dz);
  }

  quit() {
    const g = this.g;
    this.group.visible = false;
    g.heading = Math.atan2(-this.dx, -this.dz);
    g.camYaw = g.heading;
    if (g.save.cooler.length) g.toast(`${g.save.cooler.length} in the cooler. Sell them at the bait shack.`, 4);
    g.end("walk");
  }

  hud(h: HudState) {
    h.fish = {
      phase: this.phase,
      bait: this.g.save.bait,
      distance: Math.round(this.dist),
      fish: this.phase === "landed" ? this.fish : null,
      call: this.call,
      cooler: this.g.save.cooler.length,
      value: this.g.save.cooler.reduce((s, f) => s + f.pay, 0),
      running: this.phase === "reel" && this.running,
    };
  }
}
