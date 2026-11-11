import * as THREE from "three";
import type { Look } from "./sky";

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uSky;
uniform vec3 uSunDir;
uniform vec3 uSun;
uniform vec3 uFog;
uniform float uFogNear;
uniform float uFogFar;
uniform float uLights;
uniform vec4 uRipple[6];
uniform float uFarZ;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float height(vec2 p) {
  float t = uTime;
  float h = 0.0;
  h += sin(p.x * 0.34 + t * 0.9) * 0.5;
  h += sin(p.y * 0.52 - t * 0.7 + p.x * 0.13) * 0.35;
  h += noise(p * 0.9 + vec2(t * 0.35, -t * 0.22)) * 0.9;
  h += noise(p * 2.7 + vec2(-t * 0.6, t * 0.4)) * 0.35;
  for (int i = 0; i < 6; i++) {
    vec4 r = uRipple[i];
    if (r.w > 0.0) {
      float d = distance(p, r.xy);
      float ring = sin(d * 7.0 - r.z * 9.0) * exp(-d * 0.9) * r.w;
      h += ring * 1.6 * smoothstep(r.z * 3.2 + 0.4, r.z * 3.2 - 1.6, d);
    }
  }
  return h;
}

void main() {
  vec2 p = vWorld.xz;
  float e = 0.18;
  float h0 = height(p);
  vec3 n = normalize(vec3(h0 - height(p + vec2(e, 0.0)), 1.9, h0 - height(p + vec2(0.0, e))));
  vec3 view = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(n, view), 0.0), 3.2);
  vec3 col = mix(uDeep, uSky, clamp(fres * 0.95 + 0.06, 0.0, 1.0));
  // The sun road across the water.
  vec3 refl = reflect(-view, n);
  float spec = pow(max(dot(refl, normalize(uSunDir)), 0.0), 90.0);
  float streak = pow(max(dot(normalize(vec3(refl.x, 0.0, refl.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 34.0);
  col += uSun * (spec * 2.4 + streak * 0.42 * clamp(fres * 3.0, 0.0, 1.0) * (0.6 + 0.4 * noise(p * 1.8 + uTime)));
  // City lights from the far bank smear down toward the camera after dark.
  float toBank = clamp((vWorld.z - uFarZ) / 70.0, 0.0, 1.0);
  float band = noise(vec2(p.x * 0.42, 3.0)) * noise(vec2(p.x * 0.11 + 9.0, 1.0));
  col += vec3(1.0, 0.72, 0.36) * uLights * (1.0 - toBank) * smoothstep(0.22, 0.5, band) * (0.5 + 0.5 * noise(vec2(p.x * 3.0, p.y * 0.4 - uTime * 0.6))) * 0.5;
  float dist = length(cameraPosition - vWorld);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFog, fog);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type Water = {
  mesh: THREE.Mesh;
  update(dt: number, look: Look): void;
  /** Rings where a bobber lands or a fish breaks the surface. */
  ripple(x: number, z: number, strength?: number): void;
};

export function makeWater(minX: number, maxX: number, minZ: number, maxZ: number, farZ: number): Water {
  const ripples = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0));
  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color() },
    uSky: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSun: { value: new THREE.Color() },
    uFog: { value: new THREE.Color() },
    uFogNear: { value: 90 },
    uFogFar: { value: 600 },
    uLights: { value: 0 },
    uRipple: { value: ripples },
    uFarZ: { value: farZ },
  };
  const geo = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms }));
  mesh.position.set((minX + maxX) / 2, -0.55, (minZ + maxZ) / 2);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  let next = 0;
  return {
    mesh,
    update(dt, look) {
      uniforms.uTime.value += dt;
      uniforms.uDeep.value.copy(look.waterDeep);
      uniforms.uSky.value.copy(look.waterSky);
      uniforms.uSunDir.value.copy(look.sunDir);
      uniforms.uSun.value.copy(look.sun).multiplyScalar(Math.min(1.4, look.sunPower * 0.5));
      uniforms.uFog.value.copy(look.fog);
      uniforms.uFogNear.value = look.fogNear;
      uniforms.uFogFar.value = look.fogFar;
      uniforms.uLights.value = look.lights;
      for (const r of ripples) {
        if (r.w <= 0) continue;
        r.z += dt;
        r.w = Math.max(0, r.w - dt * 0.38);
      }
    },
    ripple(x, z, strength = 1) {
      ripples[next]!.set(x, z, 0, strength);
      next = (next + 1) % ripples.length;
    },
  };
}
