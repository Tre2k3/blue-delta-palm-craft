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
uniform float uNearZ;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// The river runs along X. Every layer rides the current; the long ones are stretched down it.
float height(vec2 p, float drift) {
  vec2 q = p - vec2(drift, 0.0);
  float h = 0.0;
  h += noise(q * vec2(0.16, 0.5)) * 1.2;
  h += noise(q * vec2(0.45, 1.4) + 11.0) * 0.62;
  h += noise(q * vec2(1.5, 3.2) + vec2(0.0, uTime * 0.32)) * 0.36;
  h += noise(q * vec2(3.6, 6.4) - vec2(uTime * 0.45, uTime * 0.18)) * 0.2;
  h += noise(q * vec2(8.0, 13.0) + vec2(uTime * 0.3, -uTime * 0.5)) * 0.035;
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
  float dist = length(cameraPosition - vWorld);
  // Slack water against both banks, the full current mid-channel.
  float channel = clamp((uNearZ - vWorld.z) / 30.0, 0.0, 1.0) * clamp((vWorld.z - uFarZ) / 30.0, 0.0, 1.0);
  float drift = uTime * mix(0.5, 1.7, channel);

  float e = 0.2;
  float h0 = height(p, drift);
  // Steep enough near the lens that the chop breaks the reflection up; calmer far out so it does not sparkle into noise.
  float slope = 0.85 / (1.0 + dist * 0.04);
  vec3 n = normalize(vec3((h0 - height(p + vec2(e, 0.0), drift)) * slope / e, 1.0, (h0 - height(p + vec2(0.0, e), drift)) * slope / e));
  vec3 view = normalize(cameraPosition - vWorld);
  vec2 q = p - vec2(drift, 0.0);

  // Mississippi brown: silt in the water, more of it in the shallows, clouds of it drifting down.
  float day = clamp(dot(uSky, vec3(0.3, 0.5, 0.2)) * 1.4 + 0.12, 0.0, 1.0);
  vec3 mud = vec3(0.36, 0.26, 0.14) * (0.22 + day * 0.85);
  vec3 body = mix(uDeep, mud, 0.5 + (1.0 - channel) * 0.25);
  float silt = noise(q * vec2(0.035, 0.11)) * 0.65 + noise((p - vec2(drift * 1.3, 0.0)) * vec2(0.11, 0.3)) * 0.35;
  body *= 0.72 + smoothstep(0.3, 0.75, silt) * 0.5;
  // Lines of current: lighter where the water piles up, darker in the troughs.
  float lines = noise(q * vec2(0.09, 1.7)) * 0.6 + noise(q * vec2(0.3, 4.2) + 3.0) * 0.4;
  body *= 0.8 + lines * 0.45;

  // What the surface mirrors: the dark far bank low down, the bright band of sky over it, deeper sky above.
  vec3 refl = reflect(-view, n);
  float ry = refl.y;
  vec3 high = mix(uSky, uFog, 0.45) * 0.82;
  vec3 mirror = mix(uSky * 1.08, high, smoothstep(0.1, 0.55, ry));
  mirror = mix(uFog * 0.45 + uDeep * 0.4, mirror, smoothstep(-0.06, 0.1, ry));
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, view), 0.0), 3.4);
  vec3 col = mix(body, mirror, clamp(fres, 0.0, 0.9));

  // Sun: a glitter path broken up by the chop.
  vec3 sunDir = normalize(uSunDir);
  float spark = pow(max(dot(refl, sunDir), 0.0), 120.0);
  float road = pow(max(dot(normalize(vec3(refl.x, 0.0, refl.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0), 22.0);
  col += uSun * (spark * 3.0 + road * 0.5 * clamp(fres * 2.5, 0.0, 1.0) * smoothstep(0.3, 0.75, noise(q * vec2(1.1, 2.8))));

  // Foam: long threads pulled out by the current, and a wash where the river meets the wall.
  float threads = smoothstep(0.74, 0.9, noise(q * vec2(0.05, 3.6))) * smoothstep(0.35, 0.75, noise(q * vec2(0.4, 1.0) + 4.0));
  float wall = uNearZ - vWorld.z + sin(p.x * 0.6 + uTime * 0.9) * 0.4;
  float wash = smoothstep(2.6, 0.0, wall) * (0.4 + 0.6 * noise(vec2(p.x * 1.6 - uTime * 0.8, p.y * 2.0)));
  float foam = clamp(threads * 0.4 * (0.25 + channel) + wash * 0.8, 0.0, 1.0) / (1.0 + dist * 0.012);
  col = mix(col, vec3(0.92, 0.89, 0.82) * (0.3 + day * 0.75), foam * 0.6);

  // City lights from the far bank smear down toward the camera after dark.
  float toBank = clamp((vWorld.z - uFarZ) / 70.0, 0.0, 1.0);
  float band = noise(vec2(p.x * 0.42, 3.0)) * noise(vec2(p.x * 0.11 + 9.0, 1.0));
  col += vec3(1.0, 0.72, 0.36) * uLights * (1.0 - toBank) * smoothstep(0.22, 0.5, band) * (0.5 + 0.5 * noise(vec2(p.x * 3.0, p.y * 0.4 - uTime * 0.6))) * 0.5;
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
    uNearZ: { value: maxZ },
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
