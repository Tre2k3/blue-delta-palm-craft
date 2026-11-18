export const TAU = Math.PI * 2;

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smooth(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Frame-rate independent approach factor: `v += (target - v) * damp(rate, dt)`. */
export function damp(rate: number, dt: number) {
  return 1 - Math.exp(-rate * dt);
}

export function wrapAngle(a: number) {
  let x = a;
  while (x > Math.PI) x -= TAU;
  while (x < -Math.PI) x += TAU;
  return x;
}

export function dampAngle(current: number, target: number, amount: number) {
  return current + wrapAngle(target - current) * amount;
}

/** Deterministic generator so the city is the same city on every load. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length) % list.length]!;
}

export function range(rand: () => number, lo: number, hi: number) {
  return lo + (hi - lo) * rand();
}

export type Vec2 = { x: number; z: number };

export function dist2(ax: number, az: number, bx: number, bz: number) {
  return Math.hypot(ax - bx, az - bz);
}

export function formatClock(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest < 10 ? "0" : ""}${rest.toFixed(1)}`;
}
