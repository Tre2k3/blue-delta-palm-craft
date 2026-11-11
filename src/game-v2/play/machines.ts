import * as THREE from "three";
import type { HudState } from "../core/types";
import { clamp, damp, lerp } from "../core/util";
import type { Activity, Game } from "../game";
import { basketballTex } from "../gfx/tex";

const _v = new THREE.Vector3();

type Mole = { group: THREE.Group; body: THREE.Mesh; hat: THREE.Mesh; x: number; z: number; up: number; show: number; kind: 0 | 1 | 2; bonk: number };

/**
 * The Whack-A-Mole machine on the Fun House floor. Moles come up through the table,
 * Benji has the hammer. Thirty seconds, tickets for the score.
 */
export class Whack implements Activity {
  hints: [string, string][] = [
    ["W A S D", "Move the hammer"],
    ["Space", "Swing"],
    ["1 - 9", "Hit that hole"],
    ["Q", "Walk away"],
  ];
  private moles: Mole[] = [];
  private mallet = new THREE.Group();
  private cursor = 4;
  private swing = 0;
  private left = 30;
  private score = 0;
  private hits = 0;
  private spawn = 0.6;
  private call = "";
  private callLeft = 0;
  private skins: THREE.MeshStandardMaterial[];
  private onKey = (e: KeyboardEvent) => {
    const k = e.code.match(/^(?:Digit|Numpad)([1-9])$/);
    if (!k || e.repeat || this.g.overlay) return;
    const d = Number(k[1]) - 1;
    this.hit((2 - Math.floor(d / 3)) * 3 + (d % 3));
  };

  constructor(private g: Game) {
    const m = g.rooms.fun.whack;
    this.skins = [0x8a5a34, 0xe0b33a, 0x5a5560].map((color, i) => new THREE.MeshStandardMaterial({ color, roughness: i === 1 ? 0.3 : 0.9, metalness: i === 1 ? 0.7 : 0 }));
    const dark = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.5 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xf2a9a0, roughness: 0.7 });
    const red = new THREE.MeshStandardMaterial({ color: 0xd02a2a, roughness: 0.4 });
    for (const h of m.holes) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.2, 6, 14), this.skins[0]);
      body.position.y = 0.2;
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), pink);
      snout.position.set(0, 0.27, 0.1);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), dark);
      nose.position.set(0, 0.29, 0.155);
      const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), white);
      teeth.position.set(0, 0.225, 0.135);
      group.add(body, snout, nose, teeth);
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), dark);
        eye.position.set(s * 0.05, 0.34, 0.095);
        group.add(eye);
      }
      const hat = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), red);
      hat.position.y = 0.36;
      group.add(hat);
      group.position.set(h.x, m.top - 0.5, h.z);
      g.rooms.fun.group.add(group);
      this.moles.push({ group, body, hat, x: h.x, z: h.z, up: 0, show: 0, kind: 0, bonk: 0 });
    }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.46, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.7 }));
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.25;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.2, 14), red);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 14), new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: 0.4 }));
    cap.position.y = -0.1;
    this.mallet.add(handle, head, cap);
    this.mallet.traverse((o) => (o.castShadow = true));
    this.mallet.visible = false;
    g.rooms.fun.group.add(this.mallet);
  }

  start() {
    const g = this.g;
    this.left = 30;
    this.score = this.hits = 0;
    this.spawn = 0.6;
    this.cursor = 4;
    this.swing = 0;
    for (const m of this.moles) {
      m.up = 0;
      m.show = 0;
      m.bonk = 0;
    }
    this.mallet.visible = true;
    g.benji.visible = false;
    window.addEventListener("keydown", this.onKey);
    this.say("Whack the moles. Leave the hard hats alone.", 3);
    this.frame(0, true);
  }

  private say(text: string, seconds = 1) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  private hit(i: number) {
    const g = this.g;
    if (this.left <= 0 || i < 0 || i >= this.moles.length) return;
    this.cursor = i;
    this.swing = 0.2;
    const m = this.moles[i]!;
    if (m.up > 0 && m.show > 0.4) {
      const pts = m.kind === 2 ? -20 : m.kind === 1 ? 30 : 10;
      this.score = Math.max(0, this.score + pts);
      if (pts > 0) this.hits++;
      m.up = 0;
      m.bonk = 0.3;
      g.sound.board();
      if (m.kind === 1) g.sound.cash();
      if (m.kind === 2) g.sound.bad();
      this.say(m.kind === 2 ? "HARD HAT  -20" : m.kind === 1 ? "GOLD  +30" : "+10", 0.6);
      g.stage.setPunch(0.35);
    } else g.sound.bounce(0.4);
  }

  /** A tap or click on the scene: swing at the nearest hole to it. */
  tap(nx: number, ny: number) {
    let best = -1;
    let bestD = 0.16;
    const top = this.g.rooms.fun.whack.top;
    this.moles.forEach((m, i) => {
      _v.set(m.x, top + 0.12, m.z).project(this.g.camera);
      const d = Math.hypot(_v.x - nx, (_v.y - ny) * 0.6);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0) this.hit(best);
  }

  update(dt: number) {
    const g = this.g;
    const input = g.input;
    const top = g.rooms.fun.whack.top;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    const col = this.cursor % 3;
    const row = Math.floor(this.cursor / 3);
    if (input.hit("left") && col > 0) this.cursor--;
    if (input.hit("right") && col < 2) this.cursor++;
    if (input.hit("up") && row > 0) this.cursor -= 3;
    if (input.hit("down") && row < 2) this.cursor += 3;
    if (input.hit("action") || input.hit("interact")) this.hit(this.cursor);

    const before = Math.ceil(this.left);
    this.left -= dt;
    if (Math.ceil(this.left) !== before) {
      if (this.left <= 5 && this.left > 0) g.sound.countdown();
      g.push();
    }
    const gone = 30 - this.left;
    this.spawn -= dt;
    if (this.spawn <= 0 && this.left > 0.8) {
      const free = this.moles.filter((m) => m.up <= 0 && m.show < 0.05);
      const m = free[Math.floor(Math.random() * free.length)];
      if (m) {
        const r = Math.random();
        m.kind = r < 0.1 ? 1 : r < 0.24 ? 2 : 0;
        m.up = (m.kind === 1 ? 0.65 : 0.85 + Math.random() * 0.5) - gone * 0.008;
        m.body.material = this.skins[m.kind]!;
        m.hat.visible = m.kind === 2;
      }
      this.spawn = 0.3 + Math.random() * 0.36 - gone * 0.006;
    }
    for (const m of this.moles) {
      if (m.up > 0) {
        m.up -= dt;
        m.show = Math.min(1, m.show + dt * 8);
      } else m.show = Math.max(0, m.show - dt * (m.bonk > 0 ? 14 : 7));
      if (m.bonk > 0) m.bonk -= dt;
      m.group.position.y = top - 0.5 + m.show * 0.48;
      m.group.scale.set(1 + (m.bonk > 0 ? 0.25 : 0), m.bonk > 0 ? 0.6 : 1, 1 + (m.bonk > 0 ? 0.25 : 0));
      m.group.rotation.y = Math.sin(g.time * 3 + m.x * 7) * 0.25;
    }

    // Hammer over the chosen hole, coming down on a swing.
    const c = this.moles[this.cursor]!;
    if (this.swing > 0) this.swing -= dt;
    const down = this.swing > 0 ? Math.sin((this.swing / 0.2) * Math.PI) : 0;
    _v.set(c.x, top + 0.5 - down * 0.2, c.z + 0.12);
    this.mallet.position.lerp(_v, damp(26, dt));
    this.mallet.rotation.x = -0.35 + down * 1.1;

    if (this.left <= 0) {
      const best = g.save.best.whack ?? 0;
      const record = this.score > best;
      if (record) g.save.best.whack = this.score;
      const won = g.winTickets(Math.min(25, Math.floor(this.score / 18)));
      if (won) g.sound.cash();
      g.showResults(
        {
          title: this.score >= 300 ? "MOLE PATROL" : "TIME",
          sub: this.score >= 300 ? "Not one of them saw daylight." : "Gold moles are quick and worth triple.",
          rows: [
            ["Score", String(this.score)],
            ["Moles", String(this.hits)],
            ["Record", String(Math.max(best, this.score))],
          ],
          pay: 0,
          respect: 0,
          tickets: won,
          record,
          again: "Go again",
        },
        () => this.start(),
        () => this.quit(),
      );
      return;
    }
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const m = g.rooms.fun.whack;
    _v.set(m.x, m.top + 1.42, m.z + 1.55);
    if (snap) g.camera.position.copy(_v);
    else g.camera.position.lerp(_v, damp(6, dt));
    _v.set(m.x, m.top + 0.12, m.z - 0.02);
    g.camera.lookAt(_v);
    if (g.camera.fov !== 46) {
      g.camera.fov = 46;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    window.removeEventListener("keydown", this.onKey);
    this.mallet.visible = false;
    for (const m of this.moles) {
      m.up = 0;
      m.show = 0;
      m.group.position.y = g.rooms.fun.whack.top - 0.5;
    }
    const s = g.rooms.fun.whack.stand;
    g.pos.x = s.x;
    g.pos.z = s.z;
    g.heading = Math.PI;
    g.camYaw = Math.PI;
    g.end("walk");
  }

  hud(h: HudState) {
    h.whack = { left: Math.max(0, Math.ceil(this.left)), score: this.score, hits: this.hits, call: this.call };
  }
}

type Shot = { mesh: THREE.Mesh; live: boolean; age: number; power: number; scored: boolean; judged: boolean; rim: boolean; v: THREE.Vector3 };

const BALL = 0.11;
const RIM = 0.2;
const TUBE = 0.018;

/**
 * The hoop-shot cage, like the ones at every pizza arcade: real basketballs, a rim that slides,
 * thirty-five seconds. Each ball is a thrown object, so it can rattle out or kiss the glass.
 */
export class PopShot implements Activity {
  hints: [string, string][] = [
    ["A D", "Aim"],
    ["Hold Space", "Wind up"],
    ["Release", "In the green"],
    ["Q", "Walk away"],
  ];
  private rim: THREE.Mesh;
  private net: THREE.Mesh;
  private hand: THREE.Mesh;
  private shots: Shot[] = [];
  private off = 0;
  private dir = 1;
  private aim = 0;
  private charge = 0;
  private holding = false;
  private cool = 0;
  private left = 35;
  private score = 0;
  private taken = 0;
  private made = 0;
  private streak = 0;
  private call = "";
  private callLeft = 0;
  private netKick = 0;

  constructor(private g: Game) {
    const p = g.rooms.fun.popshot;
    const orange = new THREE.MeshStandardMaterial({ color: 0xff5a1e, emissive: 0xff3a00, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.4 });
    this.rim = new THREE.Mesh(new THREE.TorusGeometry(RIM, TUBE, 8, 24), orange);
    this.rim.rotation.x = Math.PI / 2;
    this.rim.position.set(p.hoop.x, p.hoop.y, p.hoop.z);
    this.net = new THREE.Mesh(new THREE.CylinderGeometry(RIM, 0.12, 0.34, 12, 2, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.7 }));
    this.net.position.set(p.hoop.x, p.hoop.y - 0.18, p.hoop.z);
    const geo = new THREE.SphereGeometry(BALL, 16, 12);
    const skin = new THREE.MeshStandardMaterial({ map: basketballTex(), roughness: 0.7, emissive: 0x6a2a0a, emissiveIntensity: 0.5 });
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(geo, skin);
      mesh.visible = false;
      g.rooms.fun.group.add(mesh);
      this.shots.push({ mesh, live: false, age: 0, power: 0, scored: false, judged: false, rim: false, v: new THREE.Vector3() });
    }
    this.hand = new THREE.Mesh(geo, skin);
    this.hand.visible = false;
    g.rooms.fun.group.add(this.rim, this.net, this.hand);
  }

  start() {
    const g = this.g;
    this.left = 35;
    this.score = this.taken = this.made = this.streak = 0;
    this.charge = 0;
    this.holding = false;
    this.cool = 0.3;
    this.off = 0;
    this.aim = 0;
    for (const s of this.shots) {
      s.live = false;
      s.mesh.visible = false;
    }
    g.benji.visible = false;
    this.hand.visible = true;
    this.say("Aim with A and D. Hold Space, let go in the green.", 3.5);
    this.frame(0, true);
  }

  private say(text: string, seconds = 1) {
    this.call = text;
    this.callLeft = seconds;
    this.g.push();
  }

  private throwBall() {
    const g = this.g;
    const p = g.rooms.fun.popshot;
    const s = this.shots.find((k) => !k.live) ?? this.shots.reduce((x, y) => (x.age > y.age ? x : y));
    const x0 = p.x + this.aim * 0.5;
    const y0 = 1.3;
    const z0 = p.z - 0.5;
    // Thrown at the middle of the cage; the aim leans it left or right.
    const tx = p.hoop.x + this.aim;
    const d = Math.hypot(tx - x0, p.hoop.z - z0);
    const theta = 1.12;
    const rise = p.hoop.y - y0;
    const v = Math.sqrt((9.81 * d * d) / (2 * Math.cos(theta) ** 2 * (d * Math.tan(theta) - rise))) * (1 + (this.charge - 0.8) * 0.36 + (Math.random() - 0.5) * 0.008);
    const yaw = Math.atan2(tx - x0, p.hoop.z - z0);
    s.mesh.position.set(x0, y0, z0);
    s.v.set(Math.sin(yaw) * Math.cos(theta) * v, Math.sin(theta) * v, Math.cos(yaw) * Math.cos(theta) * v);
    s.live = true;
    s.age = 0;
    s.power = this.charge;
    s.scored = s.judged = s.rim = false;
    s.mesh.visible = true;
    this.taken++;
    g.sound.release();
  }

  private judge(s: Shot, made: boolean) {
    if (s.judged) return;
    s.judged = true;
    const g = this.g;
    if (made) {
      this.made++;
      this.streak++;
      const pts = (this.left < 10 ? 3 : 2) + (this.streak >= 3 ? 1 : 0);
      this.score += pts;
      this.netKick = 1;
      g.sound.swish();
      this.say(this.streak >= 3 ? `ON FIRE  +${pts}` : s.rim ? `BUCKET  +${pts}` : `SWISH  +${pts}`, 0.8);
    } else {
      this.streak = 0;
      this.say(Math.abs(s.power - 0.8) > 0.09 ? (s.power < 0.8 ? "Short" : "Long") : "Off the rim", 0.8);
    }
  }

  private fly(s: Shot, dt: number) {
    const g = this.g;
    const p = g.rooms.fun.popshot;
    const pos = s.mesh.position;
    const steps = Math.max(1, Math.ceil(dt / (1 / 200)));
    const h = dt / steps;
    const rx = this.rim.position.x;
    const glass = p.hoop.z - 0.28;
    for (let i = 0; i < steps; i++) {
      const prevY = pos.y;
      pos.addScaledVector(s.v, h);
      pos.y -= 0.5 * 9.81 * h * h;
      s.v.y -= 9.81 * h;
      const dx = pos.x - rx;
      const dz = pos.z - p.hoop.z;
      const dh = Math.hypot(dx, dz);
      if (Math.abs(pos.y - p.hoop.y) < BALL + TUBE + 0.01 && dh < RIM + BALL + TUBE + 0.01) {
        const ux = dh > 1e-5 ? dx / dh : 1;
        const uz = dh > 1e-5 ? dz / dh : 0;
        const ex = pos.x - (rx + ux * RIM);
        const ey = pos.y - p.hoop.y;
        const ez = pos.z - (p.hoop.z + uz * RIM);
        const dist = Math.hypot(ex, ey, ez);
        if (dist < BALL + TUBE && dist > 1e-5) {
          const nx = ex / dist;
          const ny = ey / dist;
          const nz = ez / dist;
          const vn = s.v.x * nx + s.v.y * ny + s.v.z * nz;
          if (vn < 0) {
            s.v.x -= 1.5 * vn * nx;
            s.v.y -= 1.5 * vn * ny;
            s.v.z -= 1.5 * vn * nz;
            if (!s.rim && vn < -0.6) g.sound.rim();
            s.rim = true;
          }
          const push = BALL + TUBE - dist;
          pos.x += nx * push;
          pos.y += ny * push;
          pos.z += nz * push;
        }
      }
      if (pos.z < glass + BALL && s.v.z < 0 && pos.y > p.hoop.y - 0.12 && pos.y < p.hoop.y + 0.58 && Math.abs(pos.x - p.hoop.x) < 0.52) {
        pos.z = glass + BALL;
        s.v.z *= -0.55;
        g.sound.board();
      }
      if (Math.abs(pos.x - p.hoop.x) > 0.5) {
        pos.x = p.hoop.x + Math.sign(pos.x - p.hoop.x) * 0.5;
        s.v.x *= -0.4;
      }
      if (!s.scored && prevY > p.hoop.y && pos.y <= p.hoop.y && s.v.y < 0 && dh < RIM - 0.02) {
        s.scored = true;
        s.v.x *= 0.2;
        s.v.z *= 0.2;
        s.v.y = Math.max(s.v.y, -3.4);
        this.judge(s, true);
      }
    }
    s.age += dt;
    s.mesh.rotation.x -= dt * 9;
    if (pos.y < 1.12 || s.age > 3) {
      if (!s.scored) this.judge(s, false);
      s.live = false;
      s.mesh.visible = false;
    }
  }

  update(dt: number) {
    const g = this.g;
    const p = g.rooms.fun.popshot;
    const input = g.input;
    if (this.callLeft > 0) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) {
        this.call = "";
        g.push();
      }
    }
    const before = Math.ceil(this.left);
    this.left -= dt;
    if (Math.ceil(this.left) !== before) {
      if (this.left <= 5 && this.left > 0) g.sound.countdown();
      g.push();
    }
    // The rim starts to slide a few seconds in and keeps getting quicker.
    const gone = 35 - this.left;
    const speed = gone < 7 ? 0 : 0.2 + gone * 0.012;
    this.off += this.dir * speed * dt;
    if (this.off > 0.26) this.dir = -1;
    if (this.off < -0.26) this.dir = 1;
    this.rim.position.x = this.net.position.x = p.hoop.x + this.off;
    if (this.netKick > 0) {
      this.netKick = Math.max(0, this.netKick - dt * 2.6);
      const k = Math.sin(this.netKick * 14) * this.netKick;
      this.net.scale.set(1 - k * 0.15, 1 + k * 0.3, 1 - k * 0.15);
    }

    this.aim = clamp(this.aim + input.move().x * 0.55 * dt, -0.3, 0.3);
    this.cool -= dt;
    const live = this.left > 0;
    if (live && !this.holding && this.cool <= 0 && input.down("action")) {
      this.holding = true;
      this.charge = 0;
    }
    if (this.holding) {
      this.charge = Math.min(1.1, this.charge + dt / 0.75);
      if (!input.down("action") || this.charge >= 1.1 || !live) {
        this.holding = false;
        this.cool = 0.34;
        this.throwBall();
      }
    }
    g.live.meter = this.holding ? Math.min(1, this.charge) : 0;
    g.live.sweetLo = 0.715;
    g.live.sweetHi = 0.885;
    this.hand.visible = live && this.cool <= 0;
    this.hand.position.set(p.x + this.aim * 0.5, 1.12 + (this.holding ? this.charge * 0.2 : Math.sin(g.time * 4) * 0.015), p.z - 0.45);

    for (const s of this.shots) if (s.live) this.fly(s, dt);

    if (this.left <= 0 && !this.shots.some((s) => s.live && !s.judged)) {
      const best = g.save.best.popshot ?? 0;
      const record = this.score > best;
      if (record) g.save.best.popshot = this.score;
      const won = g.winTickets(Math.min(25, Math.floor(this.score / 2)));
      if (won) g.sound.cash();
      g.showResults(
        {
          title: this.score >= 40 ? "HOOP FEVER" : "BUZZER",
          sub: this.score >= 40 ? "The machine wants a word with you." : "Follow the rim with A and D. Three in a row lights you up.",
          rows: [
            ["Score", String(this.score)],
            ["Shooting", `${this.made} of ${this.taken}`],
            ["Record", String(Math.max(best, this.score))],
          ],
          pay: 0,
          respect: 0,
          tickets: won,
          record,
          again: "Go again",
        },
        () => this.start(),
        () => this.quit(),
      );
      return;
    }
    this.frame(dt, false);
  }

  private frame(dt: number, snap: boolean) {
    const g = this.g;
    const p = g.rooms.fun.popshot;
    _v.set(p.x + 0.3, 1.74, p.z + 0.8);
    if (snap) g.camera.position.copy(_v);
    else g.camera.position.lerp(_v, damp(6, dt));
    _v.set(p.hoop.x, lerp(1.5, p.hoop.y, 0.7), p.hoop.z);
    g.camera.lookAt(_v);
    if (g.camera.fov !== 50) {
      g.camera.fov = 50;
      g.camera.updateProjectionMatrix();
    }
  }

  quit() {
    const g = this.g;
    const p = g.rooms.fun.popshot;
    this.hand.visible = false;
    for (const s of this.shots) {
      s.live = false;
      s.mesh.visible = false;
    }
    this.rim.position.x = this.net.position.x = p.hoop.x;
    g.pos.x = p.x;
    g.pos.z = p.z + 0.4;
    g.heading = Math.PI;
    g.camYaw = Math.PI;
    g.live.meter = 0;
    g.end("walk");
  }

  hud(h: HudState) {
    h.hoops = { phase: this.left > 0 ? "run" : "over", score: this.score, left: Math.max(0, Math.ceil(this.left)), shots: this.taken, made: this.made, streak: this.streak, best: this.g.save.best.popshot ?? 0, call: this.call, fire: this.streak >= 3, range: this.left < 10 ? "3 PT" : "2 PT" };
  }
}
