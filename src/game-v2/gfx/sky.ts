import * as THREE from "three";
import { clamp01, lerp, smooth } from "../core/util";

export type Phase = "golden" | "night" | "day";

export type Look = {
  zenith: THREE.Color;
  horizon: THREE.Color;
  /** Halo around the sun or moon. */
  halo: THREE.Color;
  sun: THREE.Color;
  sunPower: number;
  sunDir: THREE.Vector3;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiPower: number;
  fog: THREE.Color;
  fogNear: number;
  fogFar: number;
  exposure: number;
  bloom: number;
  /** 0 by day, 1 at night: windows, neon, lamps, headlights. */
  lights: number;
  stars: number;
  cloud: THREE.Color;
  cloudLit: THREE.Color;
  /** Tint for the flat-shaded character cards so they sit in the same light. */
  figure: THREE.Color;
  waterDeep: THREE.Color;
  waterSky: THREE.Color;
  /** Lower is wetter. Roads and the plaza read rain-slick at sunset and at night. */
  roadRough: number;
  env: number;
};

const c = (hex: number) => new THREE.Color(hex);
const dir = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();

export const LOOKS: Record<Phase, Look> = {
  // The concept art: sun on the far bank, dark wet stone, green neon.
  golden: {
    zenith: c(0x15172a),
    horizon: c(0xf28a36),
    halo: c(0xffb857),
    sun: c(0xff9440),
    sunPower: 2.5,
    sunDir: dir(0.3, 0.13, -0.94),
    hemiSky: c(0xc9906a),
    hemiGround: c(0x2a1c16),
    hemiPower: 0.5,
    fog: c(0x7a4630),
    fogNear: 130,
    fogFar: 760,
    exposure: 1.0,
    bloom: 0.36,
    lights: 0.68,
    stars: 0,
    cloud: c(0x4a3548),
    cloudLit: c(0xffa24a),
    figure: c(0xffd6ae),
    waterDeep: c(0x0d1420),
    waterSky: c(0xff9a44),
    roadRough: 0.52,
    env: 0.5,
  },
  night: {
    zenith: c(0x05070f),
    horizon: c(0x1a2238),
    halo: c(0x6a7ea8),
    sun: c(0x8fa8d8),
    sunPower: 0.42,
    sunDir: dir(-0.35, 0.62, -0.5),
    hemiSky: c(0x2a3858),
    hemiGround: c(0x100c0a),
    hemiPower: 0.42,
    fog: c(0x0e1220),
    fogNear: 60,
    fogFar: 460,
    exposure: 1.05,
    bloom: 0.62,
    lights: 1,
    stars: 1,
    cloud: c(0x10141f),
    cloudLit: c(0x2a3350),
    figure: c(0xb9c6dc),
    waterDeep: c(0x04060c),
    waterSky: c(0x1c2740),
    roadRough: 0.48,
    env: 0.4,
  },
  day: {
    zenith: c(0x2f6fc4),
    horizon: c(0xbfdcf2),
    halo: c(0xfff4d6),
    sun: c(0xfff2dc),
    sunPower: 3.1,
    sunDir: dir(0.42, 0.78, 0.36),
    hemiSky: c(0xcfe4ff),
    hemiGround: c(0x5a6a4a),
    hemiPower: 0.85,
    fog: c(0xc3d8ea),
    fogNear: 140,
    fogFar: 760,
    exposure: 0.98,
    bloom: 0.16,
    lights: 0.06,
    stars: 0,
    cloud: c(0xdfe8f2),
    cloudLit: c(0xffffff),
    figure: c(0xffffff),
    waterDeep: c(0x1c3c4a),
    waterSky: c(0xa8c8e0),
    roadRough: 1,
    env: 0.6,
  },
};

export const PHASES: Phase[] = ["golden", "night", "day"];
const PHASE_SECONDS: Record<Phase, number> = { golden: 260, night: 300, day: 280 };
const BLEND_SECONDS = 9;

function mixLook(a: Look, b: Look, t: number, out: Look) {
  for (const key of Object.keys(a) as (keyof Look)[]) {
    const av = a[key];
    const bv = b[key];
    if (av instanceof THREE.Color) (out[key] as THREE.Color).copy(av).lerp(bv as THREE.Color, t);
    else if (av instanceof THREE.Vector3) (out[key] as THREE.Vector3).copy(av).lerp(bv as THREE.Vector3, t).normalize();
    else (out[key] as number) = lerp(av as number, bv as number, t);
  }
}

function cloneLook(l: Look): Look {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(l)) out[k] = v instanceof THREE.Color || v instanceof THREE.Vector3 ? v.clone() : v;
  return out as Look;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHalo;
uniform vec3 uSunDir;
uniform vec3 uSun;
uniform vec3 uCloud;
uniform vec3 uCloudLit;
uniform float uStars;
uniform float uTime;
uniform float uDisc;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float up = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(up, 0.42));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  // Wide warm wash toward the sun, tight halo, then the disc.
  col += uHalo * (pow(sd, 3.0) * 0.32 + pow(sd, 22.0) * 0.55);
  col = mix(col, uHorizon * 1.08, pow(1.0 - up, 9.0) * 0.6);
  // Clouds: a flat layer, lit from the sun side.
  if (d.y > 0.015) {
    vec2 uv = d.xz / (d.y + 0.16) * 1.15 + vec2(uTime * 0.004, uTime * 0.0015);
    float n = fbm(uv);
    float cover = smoothstep(0.44, 0.7, n) * smoothstep(0.015, 0.16, d.y);
    float edge = smoothstep(0.44, 0.56, n) - smoothstep(0.56, 0.84, n);
    vec3 cl = mix(uCloud, uCloudLit, clamp(pow(sd, 2.0) * 1.1 + edge * 0.5, 0.0, 1.0));
    col = mix(col, cl, cover * 0.86);
  }
  col += uSun * smoothstep(1.0 - uDisc, 1.0 - uDisc * 0.55, sd) * 3.0;
  if (uStars > 0.01) {
    vec2 sp = d.xz / (abs(d.y) + 0.35) * 90.0;
    float s = step(0.9965, hash(floor(sp)));
    col += vec3(0.85, 0.9, 1.0) * s * uStars * smoothstep(0.05, 0.4, d.y) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(sp)) * 40.0));
  }
  if (d.y < 0.0) col = mix(col, uHorizon * 0.55, clamp(-d.y * 6.0, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  readonly look: Look = cloneLook(LOOKS.golden);
  readonly dome: THREE.Mesh;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  phase: Phase = "golden";
  /** Auto cycle on. Off pins the current phase. */
  auto = true;
  private from: Look = cloneLook(LOOKS.golden);
  private blend = 1;
  private clock = 0;
  private time = 0;
  private uniforms: Record<string, THREE.IUniform>;
  private envs: Partial<Record<Phase, THREE.Texture>> = {};

  constructor(
    private scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
  ) {
    this.uniforms = {
      uZenith: { value: this.look.zenith },
      uHorizon: { value: this.look.horizon },
      uHalo: { value: this.look.halo },
      uSunDir: { value: this.look.sunDir },
      uSun: { value: this.look.sun },
      uCloud: { value: this.look.cloud },
      uCloudLit: { value: this.look.cloudLit },
      uStars: { value: 0 },
      uTime: { value: 0 },
      uDisc: { value: 0.0016 },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false }),
    );
    this.dome.scale.setScalar(900);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.05;
    const cam = this.sun.shadow.camera;
    cam.left = -46;
    cam.right = 46;
    cam.top = 46;
    cam.bottom = -46;
    cam.near = 20;
    cam.far = 320;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(this.hemi);
    scene.fog = new THREE.Fog(0xd98a4a, 90, 620);

    // Reflections come from the sky itself, baked once per phase.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const probe = new THREE.Scene();
    const probeMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, uniforms: {} });
    const probeDome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), probeMat);
    probeDome.scale.setScalar(50);
    probe.add(probeDome);
    for (const phase of PHASES) {
      const l = LOOKS[phase];
      probeMat.uniforms = {
        uZenith: { value: l.zenith },
        uHorizon: { value: l.horizon },
        uHalo: { value: l.halo },
        uSunDir: { value: l.sunDir },
        uSun: { value: l.sun },
        uCloud: { value: l.cloud },
        uCloudLit: { value: l.cloudLit },
        uStars: { value: 0 },
        uTime: { value: 0 },
        uDisc: { value: 0.004 },
      };
      probeMat.needsUpdate = true;
      this.envs[phase] = pmrem.fromScene(probe, 0.02, 1, 120).texture;
    }
    pmrem.dispose();
    probeDome.geometry.dispose();
    probeMat.dispose();
    scene.environment = this.envs.golden ?? null;
  }

  setPhase(phase: Phase, instant = false) {
    if (phase === this.phase && this.blend >= 1) return;
    mixLook(this.from, LOOKS[this.phase], smooth(this.blend), this.from);
    this.phase = phase;
    this.blend = instant ? 1 : 0;
    this.clock = 0;
    if (instant) this.from = cloneLook(LOOKS[phase]);
  }

  next() {
    this.setPhase(PHASES[(PHASES.indexOf(this.phase) + 1) % PHASES.length]!);
  }

  /** Follow keeps the shadow box and the dome on the player. */
  update(dt: number, follow: THREE.Vector3, camera: THREE.Camera) {
    this.time += dt;
    if (this.auto) {
      this.clock += dt;
      if (this.clock > PHASE_SECONDS[this.phase]) this.next();
    }
    if (this.blend < 1) this.blend = clamp01(this.blend + dt / BLEND_SECONDS);
    const t = smooth(this.blend);
    mixLook(this.from, LOOKS[this.phase], t, this.look);
    const l = this.look;
    this.uniforms.uStars!.value = l.stars;
    this.uniforms.uTime!.value = this.time;
    this.dome.position.copy(camera.position);
    this.sun.color.copy(l.sun);
    this.sun.intensity = l.sunPower;
    this.sun.target.position.set(follow.x, 0, follow.z);
    this.sun.position.copy(this.sun.target.position).addScaledVector(l.sunDir, 150);
    this.hemi.color.copy(l.hemiSky);
    this.hemi.groundColor.copy(l.hemiGround);
    this.hemi.intensity = l.hemiPower;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(l.fog);
    fog.near = l.fogNear;
    fog.far = l.fogFar;
    const env = t > 0.5 ? this.envs[this.phase] : undefined;
    if (env && this.scene.environment !== env) this.scene.environment = env;
    this.scene.environmentIntensity = l.env;
  }
}
