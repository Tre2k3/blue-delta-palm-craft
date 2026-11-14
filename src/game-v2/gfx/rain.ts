import * as THREE from "three";

const STREAKS = 1500;
const SPLASHES = 180;

const DROP_VERT = /* glsl */ `
attribute vec3 aSeed;
attribute float aEnd;
attribute float aSide;
uniform float uWide;
uniform vec3 uCam;
uniform vec3 uBox;
uniform vec3 uFall;
uniform float uTime;
uniform float uAmount;
varying float vAlpha;
void main() {
  // Each drop has a fixed place in the world; the box of them that is drawn rides with the lens.
  float speed = 0.8 + aSeed.x * 0.4;
  vec3 w = mod(aSeed * uBox + uFall * uTime * speed - uCam, uBox) - 0.5 * uBox + uCam;
  w += uFall * speed * 0.034 * aEnd;
  vec4 mv = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  // A pixel or two across, whatever the screen: a touch wider close to the lens.
  gl_Position.x += aSide * (1.1 + 2.4 / max(1.0, -mv.z)) / uWide * gl_Position.w;
  vAlpha = (1.0 - aEnd * 0.75) * smoothstep(-0.5 * uBox.z, -0.5 * uBox.z + 6.0, mv.z) * smoothstep(-0.6, -2.2, mv.z);
  if (fract(aSeed.z * 7.31) > uAmount) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const DROP_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
uniform float uAmount;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, vAlpha * 0.42);
}`;

const SPLASH_VERT = /* glsl */ `
attribute vec3 aSeed;
uniform vec3 uCam;
uniform float uTime;
uniform float uAmount;
uniform float uScale;
uniform float uRiverZ;
varying float vLife;
void main() {
  float cycle = uTime * (1.6 + aSeed.y) + aSeed.z * 9.0;
  vLife = fract(cycle);
  // A new place on the ground every time it lands.
  vec2 at = vec2(fract(aSeed.x + floor(cycle) * 0.6180339), fract(aSeed.z + floor(cycle) * 0.7548776)) * 28.0;
  vec2 xz = mod(at - uCam.xz, 28.0) - 14.0 + uCam.xz;
  vec4 mv = viewMatrix * vec4(xz.x, 0.17, xz.y, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(46.0, (0.1 + vLife * 0.4) * uScale / max(0.5, -mv.z));
  // The whole ring is tested as if it stood a little nearer, or the ground would hide its near half.
  vec4 nearer = projectionMatrix * vec4(mv.xy, mv.z + 0.4, 1.0);
  gl_Position.z = nearer.z / nearer.w * gl_Position.w;
  if (fract(aSeed.y * 5.17) > uAmount || xz.y < uRiverZ) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const SPLASH_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
varying float vLife;
void main() {
  // A ring lying on the ground, so it is drawn squashed.
  vec2 c = (gl_PointCoord - 0.5) * vec2(2.0, 5.0);
  float r = length(c);
  float ring = smoothstep(0.55, 0.78, r) * smoothstep(1.0, 0.86, r);
  float a = ring * (1.0 - vLife) * 0.5;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

/**
 * Rain: streaks coming down through a box of air that follows the lens, and the rings they
 * make where they land. All of it is worked out on the graphics chip, so nothing is moved
 * by hand each frame. `share` is how much of it to draw on this machine.
 */
export class Rain {
  readonly group = new THREE.Group();
  private drops: THREE.ShaderMaterial;
  private rings: THREE.ShaderMaterial;
  private time = 0;

  constructor(riverZ: number) {
    // Four corners to a streak: top and bottom, left and right.
    const seeds = new Float32Array(STREAKS * 4 * 3);
    const ends = new Float32Array(STREAKS * 4);
    const sides = new Float32Array(STREAKS * 4);
    const index = new Uint16Array(STREAKS * 6);
    for (let i = 0; i < STREAKS; i++) {
      const a = Math.random();
      const b = Math.random();
      const c = Math.random();
      for (let k = 0; k < 4; k++) {
        seeds.set([a, b, c], (i * 4 + k) * 3);
        ends[i * 4 + k] = k >> 1;
        sides[i * 4 + k] = k & 1 ? 1 : -1;
      }
      index.set([i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 1, i * 4 + 2, i * 4 + 3], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STREAKS * 4 * 3), 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    geo.setAttribute("aEnd", new THREE.BufferAttribute(ends, 1));
    geo.setAttribute("aSide", new THREE.BufferAttribute(sides, 1));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    this.drops = new THREE.ShaderMaterial({
      vertexShader: DROP_VERT,
      fragmentShader: DROP_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uWide: { value: 1280 },
        uCam: { value: new THREE.Vector3() },
        uBox: { value: new THREE.Vector3(34, 22, 34) },
        uFall: { value: new THREE.Vector3(2.4, -25, 1.1) },
        uTime: { value: 0 },
        uAmount: { value: 0 },
        uColor: { value: new THREE.Color(0.72, 0.8, 0.95) },
      },
    });
    const lines = new THREE.Mesh(geo, this.drops);
    lines.frustumCulled = false;
    lines.renderOrder = 6;

    const sseeds = new Float32Array(SPLASHES * 3);
    for (let i = 0; i < sseeds.length; i++) sseeds[i] = Math.random();
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPLASHES * 3), 3));
    sgeo.setAttribute("aSeed", new THREE.BufferAttribute(sseeds, 3));
    this.rings = new THREE.ShaderMaterial({
      vertexShader: SPLASH_VERT,
      fragmentShader: SPLASH_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uCam: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uAmount: { value: 0 },
        uScale: { value: 600 },
        uRiverZ: { value: riverZ },
        uColor: { value: new THREE.Color(0.8, 0.86, 1) },
      },
    });
    const points = new THREE.Points(sgeo, this.rings);
    points.frustumCulled = false;
    points.renderOrder = 5;
    this.group.add(lines, points);
    this.group.visible = false;
  }

  /** `amount` 0..1 is how hard it is coming down; `light` 0..1 how much there is to catch it. */
  update(dt: number, camera: THREE.PerspectiveCamera, amount: number, share: number, light: number, width: number, height: number) {
    this.group.visible = amount > 0.01;
    if (!this.group.visible) return;
    this.time += dt;
    const k = amount * share;
    for (const m of [this.drops, this.rings]) {
      m.uniforms.uTime!.value = this.time;
      m.uniforms.uAmount!.value = k;
      (m.uniforms.uCam!.value as THREE.Vector3).copy(camera.position);
    }
    // Rain is seen by what it catches: pale against a day sky, lamp-coloured after dark.
    (this.drops.uniforms.uColor!.value as THREE.Color).setRGB(0.5 + light * 0.25, 0.56 + light * 0.26, 0.68 + light * 0.28);
    this.rings.uniforms.uScale!.value = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    this.drops.uniforms.uWide!.value = Math.max(320, width);
  }
}
