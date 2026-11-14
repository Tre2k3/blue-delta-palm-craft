import * as THREE from "three";

const COLORS = [0x39ff14, 0xffd23a, 0xff5ad1, 0x35e0d0, 0xff8a1e, 0xffffff];
const SPARKS = 720;
const G = 9;

type Shell = { at: number; x: number; y: number; z: number; color: number };

/**
 * Fireworks over the city: shells that go off in the sky and rain sparks. One cloud of points
 * for all of them, so a whole show costs one draw.
 */
export class Fireworks {
  readonly points: THREE.Points;
  private pos = new Float32Array(SPARKS * 3);
  private col = new Float32Array(SPARKS * 3);
  private vel = new Float32Array(SPARKS * 3);
  private life = new Float32Array(SPARKS);
  private span = new Float32Array(SPARKS);
  private base = new Float32Array(SPARKS * 3);
  private next = 0;
  private queue: Shell[] = [];
  private clock = 0;
  private live = 0;
  /** Called as each shell goes off, for the bang. */
  onBurst: (() => void) | null = null;

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.renderOrder = 6;
    this.pos.fill(-9999);
  }

  /**
   * A show of `shells` where the lens can see it: out along its line of sight `dir`, spread
   * across the picture and up in the top third of it, where the sky is.
   */
  show(from: THREE.Vector3, dir: THREE.Vector3, shells: number) {
    const flat = Math.hypot(dir.x, dir.z) || 1;
    const rx = -dir.z / flat;
    const rz = dir.x / flat;
    for (let i = 0; i < shells; i++) {
      const out = 70 + Math.random() * 45;
      const side = (Math.random() - 0.5) * out * 0.95;
      const up = Math.tan(0.14 + Math.random() * 0.2) * out;
      this.queue.push({
        at: this.clock + i * 0.42 + Math.random() * 0.2,
        x: from.x + dir.x * out + rx * side,
        y: Math.max(16, from.y + dir.y * out + up),
        z: from.z + dir.z * out + rz * side,
        color: COLORS[(i + Math.floor(Math.random() * 3)) % COLORS.length]!,
      });
    }
  }

  private burst(s: Shell) {
    const c = new THREE.Color(s.color);
    const n = 110;
    const power = 13 + Math.random() * 7;
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % SPARKS;
      // Even over a sphere, with a little raggedness.
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const v = power * (0.72 + Math.random() * 0.36);
      this.pos[i * 3] = s.x;
      this.pos[i * 3 + 1] = s.y;
      this.pos[i * 3 + 2] = s.z;
      this.vel[i * 3] = Math.cos(a) * r * v;
      this.vel[i * 3 + 1] = u * v + 2;
      this.vel[i * 3 + 2] = Math.sin(a) * r * v;
      const hot = k % 9 === 0;
      this.base[i * 3] = hot ? 2.6 : c.r * 2.2;
      this.base[i * 3 + 1] = hot ? 2.6 : c.g * 2.2;
      this.base[i * 3 + 2] = hot ? 2.6 : c.b * 2.2;
      this.span[i] = 1.5 + Math.random() * 0.9;
      this.life[i] = this.span[i]!;
    }
    this.onBurst?.();
  }

  update(dt: number) {
    this.clock += dt;
    while (this.queue.length && this.queue[0]!.at <= this.clock) this.burst(this.queue.shift()!);
    let live = 0;
    const drag = Math.exp(-1.5 * dt);
    for (let i = 0; i < SPARKS; i++) {
      if (this.life[i]! <= 0) continue;
      this.life[i]! -= dt;
      if (this.life[i]! <= 0) {
        this.pos[i * 3 + 1] = -9999;
        this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0;
        continue;
      }
      live++;
      this.vel[i * 3]! *= drag;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1]! * drag - G * 0.42 * dt;
      this.vel[i * 3 + 2]! *= drag;
      this.pos[i * 3]! += this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1]! += this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2]! += this.vel[i * 3 + 2]! * dt;
      // Bright, then a long glittering fade.
      const k = this.life[i]! / this.span[i]!;
      const f = k * k * (0.75 + 0.25 * Math.sin(this.clock * 40 + i));
      this.col[i * 3] = this.base[i * 3]! * f;
      this.col[i * 3 + 1] = this.base[i * 3 + 1]! * f;
      this.col[i * 3 + 2] = this.base[i * 3 + 2]! * f;
    }
    const on = live > 0 || this.queue.length > 0;
    if (on || this.live > 0) {
      (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
    this.live = live;
    this.points.visible = on;
  }

  get busy() {
    return this.live > 0 || this.queue.length > 0;
  }
}
