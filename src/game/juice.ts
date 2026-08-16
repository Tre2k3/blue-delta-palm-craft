/** Presentation-only feel constants. Never change simulation outcomes. */

export type JuiceKind =
  | "interact"
  | "pickup"
  | "deliver"
  | "cash"
  | "perfect"
  | "make"
  | "miss"
  | "combo"
  | "complete"
  | "grade";

export const JUICE = {
  trauma: {
    interact: 0.1,
    pickup: 0.26,
    deliver: 0.34,
    cash: 0.2,
    perfect: 0.48,
    make: 0.3,
    miss: 0.16,
    combo: 0.12,
    complete: 0.55,
    grade: 0.22,
  },
  hitstop: {
    pickup: 0.035,
    deliver: 0.05,
    perfect: 0.08,
    make: 0.04,
  },
  punch: {
    deliver: 0.55,
    perfect: 0.72,
    make: 0.38,
    complete: 0.82,
  },
} as const;

export type ScreenParticle = {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export function emitBurst(color: string, count = 22): ScreenParticle[] {
  const out: ScreenParticle[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 90 + Math.random() * 240;
    const life = 0.42 + Math.random() * 0.5;
    out.push({
      ox: (Math.random() - 0.5) * 18,
      oy: (Math.random() - 0.5) * 10,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 50,
      life,
      maxLife: life,
      color,
      size: 2 + Math.random() * 5,
    });
  }
  return out;
}

export function stepParticles(list: ScreenParticle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]!;
    p.ox += p.vx * dt;
    p.oy += p.vy * dt;
    p.vy += 220 * dt;
    p.life -= dt;
    if (p.life <= 0) list.splice(i, 1);
  }
}
