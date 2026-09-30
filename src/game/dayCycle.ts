/** In-game clock: ~1 hour every 2.5 real minutes. A full day is about an hour of play. */
export const DAY_START_HOUR = 12;
export const HOURS_PER_SECOND = 0.0065;

export type LightLook = {
  sky: [string, string, string, string, string];
  fog: number;
  fogNear: number;
  fogFar: number;
  clear: number;
  sun: number;
  sunI: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  amb: number;
  ambI: number;
  exposure: number;
  sunY: number;
  sunX: number;
  sunZ: number;
  disk: number;
  glow: number;
  glowOp: number;
  overlay: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpHex(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
}

function mixLook(a: LightLook, b: LightLook, t: number): LightLook {
  const u = Math.max(0, Math.min(1, t));
  return {
    sky: a.sky.map((c, i) => mixCss(c, b.sky[i]!, u)) as LightLook["sky"],
    fog: lerpHex(a.fog, b.fog, u),
    fogNear: lerp(a.fogNear, b.fogNear, u),
    fogFar: lerp(a.fogFar, b.fogFar, u),
    clear: lerpHex(a.clear, b.clear, u),
    sun: lerpHex(a.sun, b.sun, u),
    sunI: lerp(a.sunI, b.sunI, u),
    hemiSky: lerpHex(a.hemiSky, b.hemiSky, u),
    hemiGround: lerpHex(a.hemiGround, b.hemiGround, u),
    hemiI: lerp(a.hemiI, b.hemiI, u),
    amb: lerpHex(a.amb, b.amb, u),
    ambI: lerp(a.ambI, b.ambI, u),
    exposure: lerp(a.exposure, b.exposure, u),
    sunY: lerp(a.sunY, b.sunY, u),
    sunX: lerp(a.sunX, b.sunX, u),
    sunZ: lerp(a.sunZ, b.sunZ, u),
    disk: lerpHex(a.disk, b.disk, u),
    glow: lerpHex(a.glow, b.glow, u),
    glowOp: lerp(a.glowOp, b.glowOp, u),
    overlay: lerp(a.overlay, b.overlay, u),
  };
}

function mixCss(a: string, b: string, t: number) {
  const pa = parseCss(a);
  const pb = parseCss(b);
  const r = Math.round(lerp(pa[0], pb[0], t));
  const g = Math.round(lerp(pa[1], pb[1], t));
  const bl = Math.round(lerp(pa[2], pb[2], t));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function parseCss(c: string): [number, number, number] {
  const n = Number.parseInt(c.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const DAY: LightLook = {
  sky: ["#1d6eae", "#4ea4d6", "#f2d7a4", "#f6efe4", "#7f9a62"],
  fog: 0xb9c8c2,
  fogNear: 52,
  fogFar: 280,
  clear: 0x6eafd4,
  sun: 0xfff1c2,
  sunI: 2.85,
  hemiSky: 0xc5e4ff,
  hemiGround: 0x3f6434,
  hemiI: 0.72,
  amb: 0xb7c3b4,
  ambI: 0.38,
  exposure: 1.16,
  sunY: 62,
  sunX: -34,
  sunZ: 16,
  disk: 0xfff6d0,
  glow: 0xffd98a,
  glowOp: 0.22,
  overlay: 0,
};

const DUSK: LightLook = {
  sky: ["#24344f", "#4a5c78", "#e08a4a", "#f4d08a", "#6b5a4a"],
  fog: 0x6b5a4a,
  fogNear: 45,
  fogFar: 190,
  clear: 0x4a3a32,
  sun: 0xffd9a8,
  sunI: 2.3,
  hemiSky: 0x9ec4e8,
  hemiGround: 0x4a3a2c,
  hemiI: 1.15,
  amb: 0x5d6b7a,
  ambI: 0.75,
  exposure: 1.35,
  sunY: 46,
  sunX: -52,
  sunZ: -18,
  disk: 0xffe0b0,
  glow: 0xffb060,
  glowOp: 0.2,
  overlay: 0.1,
};

const NIGHT: LightLook = {
  sky: ["#05060c", "#10182c", "#24324c", "#12161e", "#07080c"],
  fog: 0x1c2840,
  fogNear: 28,
  fogFar: 168,
  clear: 0x10151f,
  sun: 0xd5e2ff,
  sunI: 0.55,
  hemiSky: 0x7d90c4,
  hemiGround: 0x141820,
  hemiI: 0.55,
  amb: 0x2a384c,
  ambI: 0.42,
  exposure: 1.08,
  sunY: 16,
  sunX: 40,
  sunZ: 28,
  disk: 0xe8eef8,
  glow: 0xa8b8d8,
  glowOp: 0.16,
  overlay: 0.34,
};

/** 0 = full day, 1 = dusk, 2 = night. */
export function lightLook(hour: number): LightLook {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h < 16.4) return DAY;
  if (h >= 16.4 && h < 18.2) return mixLook(DAY, DUSK, (h - 16.4) / 1.8);
  if (h >= 18.2 && h < 20.4) return mixLook(DUSK, NIGHT, (h - 18.2) / 2.2);
  if (h >= 5.6 && h < 7) return mixLook(NIGHT, DAY, (h - 5.6) / 1.4);
  return NIGHT;
}

export function nightAmount(hour: number) {
  return lightLook(hour).overlay;
}
