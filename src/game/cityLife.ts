import { POIS, STREETS, TILE } from "./data";
import { inCourtPx } from "./worldTopology";

export type PedJob = "stroll" | "shopper" | "spectator" | "waiter" | "pair" | "alight" | "photo" | "fan";

export type PedActor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  t: number;
  skin: number;
  walk: number;
  job: PedJob;
  homeJob: PedJob;
  phase: string;
  phaseT: number;
  tx: number;
  ty: number;
  pair?: number;
  facing: number;
  inside?: boolean;
  waving?: number;
  talking?: number;
  freeze?: number;
  svx?: number;
  svy?: number;
  sideline?: boolean;
  cross?: number;
  car?: number;
};

export type CityLifeCtx = {
  dt: number;
  hour: number;
  clock: number;
  collides: (x: number, y: number, r: number) => boolean;
  vanX: number;
  vanY: number;
  vanHot: boolean;
  basketball: boolean;
  crowdPulse?: number;
  dropLive?: boolean;
  px: number;
  py: number;
  walks: { x: number; y: number; w: number; h: number }[];
};

const COLORS = ["#d6d3d1", "#a8a29e", "#78716c", "#1db954", "#44403c", "#fafaf9", "#e7dcc8", "#c4b8a8"];

function poi(id: string) {
  return POIS.find((p) => p.id === id)!;
}

function hypot(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

export function crossings() {
  const xs = STREETS.filter((s) => s.axis === "x");
  const ys = STREETS.filter((s) => s.axis === "y");
  const out: { x: number; y: number }[] = [];
  for (const a of xs) for (const b of ys) out.push({ x: a.tile * TILE, y: b.tile * TILE });
  return out;
}

const CROSS = crossings();

const HQ_DOOR = () => {
  const s = poi("store");
  return { x: s.x + s.w / 2, y: s.y + s.h + 10 };
};

function courtSideline(i: number) {
  const c = poi("court");
  const spots = [
    { x: c.x - 38, y: c.y + c.h * 0.28 },
    { x: c.x - 38, y: c.y + c.h * 0.62 },
    { x: c.x + c.w + 38, y: c.y + c.h * 0.32 },
    { x: c.x + c.w + 38, y: c.y + c.h * 0.66 },
    { x: c.x + c.w * 0.28, y: c.y + c.h + 38 },
    { x: c.x + c.w * 0.72, y: c.y + c.h + 38 },
    { x: c.x + c.w * 0.3, y: c.y - 38 },
    { x: c.x + c.w * 0.7, y: c.y - 38 },
  ];
  return spots[i % spots.length]!;
}

const PARKED = [
  { x: 24.0 * TILE, y: 6.8 * TILE },
  { x: 27.0 * TILE, y: 20.8 * TILE },
  { x: 18.0 * TILE, y: 19.2 * TILE },
  { x: 44.0 * TILE, y: 20.9 * TILE },
  { x: 15.0 * TILE, y: 5.0 * TILE },
  { x: 49.4 * TILE, y: 7.0 * TILE },
];

const MEETS = [
  { x: 22 * TILE, y: 20.55 * TILE },
  { x: 16.6 * TILE, y: 20.55 * TILE },
  { x: 34 * TILE, y: 6.55 * TILE },
  { x: 28 * TILE, y: 8 * TILE + 5 * TILE + 36 },
];

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function inPaint(x: number, y: number) {
  const c = poi("court");
  return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
}

function sidewalkNear(walks: CityLifeCtx["walks"], x: number, y: number) {
  let best = walks[0] ?? { x, y, w: 40, h: 20 };
  let bestD = Infinity;
  for (const w of walks) {
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    const d = hypot(x, y, cx, cy);
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}

type Focus = "court" | "hq" | "beale" | "downtown" | "mixed";

function cityFocus(ctx: CityLifeCtx): Focus {
  if (ctx.basketball) return "court";
  const court = poi("court");
  const store = poi("store");
  const beale = poi("beale");
  const dtown = poi("downtown");
  if (hypot(ctx.px, ctx.py, court.x + court.w / 2, court.y + court.h / 2) < 280) return "court";
  if (hypot(ctx.px, ctx.py, store.x + store.w / 2, store.y + store.h / 2) < 260) return "hq";
  if (ctx.hour >= 19.5 || ctx.hour < 5.5) return "beale";
  if (hypot(ctx.px, ctx.py, beale.x + beale.w / 2, beale.y + beale.h / 2) < 220) return "beale";
  if (hypot(ctx.px, ctx.py, dtown.x + dtown.w / 2, dtown.y + dtown.h / 2) < 240) return "downtown";
  return "mixed";
}

function nightOut(hour: number) {
  return hour >= 20.2 || hour < 6;
}

function shouldBeHome(p: PedActor, ctx: CityLifeCtx) {
  if (ctx.basketball && (p.homeJob === "spectator" || p.skin === 6)) return false;
  if (!nightOut(ctx.hour)) return false;
  return p.homeJob === "shopper" || p.homeJob === "alight";
}

function moveToward(p: PedActor, tx: number, ty: number, spd: number, ctx: CityLifeCtx, opts?: { paint?: boolean }) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d < 14) {
    p.vx = 0;
    p.vy = 0;
    p.x = tx;
    p.y = ty;
    return true;
  }
  const vx = (dx / d) * spd;
  const vy = (dy / d) * spd;
  const nx = p.x + vx * ctx.dt;
  const ny = p.y + vy * ctx.dt;
  const paintHit = opts?.paint ? false : inPaint(nx, ny);
  const blocked = ctx.collides(nx, ny, 12) || paintHit;
  if (!blocked) {
    p.x = nx;
    p.y = ny;
    p.vx = vx;
    p.vy = vy;
  } else if (!ctx.collides(nx, p.y, 12) && (opts?.paint || !inPaint(nx, p.y))) {
    p.x = nx;
    p.vx = vx;
    p.vy = 0;
  } else if (!ctx.collides(p.x, ny, 12) && (opts?.paint || !inPaint(p.x, ny))) {
    p.y = ny;
    p.vy = vy;
    p.vx = 0;
  } else {
    p.vx *= -0.35;
    p.vy *= -0.35;
  }
  if (Math.abs(p.vx) > 6) p.facing = p.vx < 0 ? -1 : 1;
  return false;
}

function setPhase(p: PedActor, phase: string, t = 0) {
  p.phase = phase;
  p.phaseT = t;
}

const CAST: PedJob[] = ["shopper", "shopper", "spectator", "spectator", "pair", "pair", "waiter", "alight"];
const LIVE_CAST: PedJob[] = ["fan", "fan", "photo", "shopper", "fan", "photo", "shopper", "stroll", "fan", "alight"];

export function spawnCityPeds(walks: CityLifeCtx["walks"]): PedActor[] {
  const door = HQ_DOOR();
  const out: PedActor[] = [];
  for (let i = 0; i < CAST.length; i++) {
    const job = CAST[i]!;
    const walk = walks[i % Math.max(walks.length, 1)] ?? { x: door.x, y: door.y, w: 80, h: 20 };
    const horiz = walk.w >= walk.h;
    const t = 0.12 + (i * 0.11) % 0.76;
    let x = horiz ? walk.x + t * walk.w : walk.x + walk.w * 0.5;
    let y = horiz ? walk.y + walk.h * 0.5 : walk.y + t * walk.h;
    let tx = x;
    let ty = y;
    let phase = "go";
    let cross = i % CROSS.length;
    let car = i % PARKED.length;
    if (job === "shopper") {
      x = door.x + (i === 0 ? -120 : 140);
      y = door.y + 36;
      tx = door.x;
      ty = door.y;
      phase = i === 0 ? "go" : "leave";
    } else if (job === "spectator") {
      const rail = courtSideline(i);
      x = rail.x + (i % 2 === 0 ? -90 : 110);
      y = rail.y + 70;
      tx = rail.x;
      ty = rail.y;
    } else if (job === "pair") {
      const meet = MEETS[0]!;
      x = meet.x + (i === 4 ? -90 : 100);
      y = meet.y;
      tx = meet.x + (i === 4 ? -16 : 16);
      ty = meet.y;
    } else if (job === "waiter") {
      const c = CROSS[1] ?? CROSS[0]!;
      cross = 1;
      x = c.x - 90;
      y = c.y + TILE * 0.95;
      tx = c.x - 26;
      ty = c.y + TILE * 0.95;
    } else if (job === "alight") {
      const pk = PARKED[0]!;
      car = 0;
      x = pk.x + 8;
      y = pk.y + 6;
      tx = pk.x + 40;
      ty = pk.y + 32;
      phase = "exit";
    }
    const spd = 50 + i * 3;
    out.push({
      x,
      y,
      vx: horiz ? spd : 0,
      vy: horiz ? 0 : spd,
      color: COLORS[i % COLORS.length]!,
      t: i * 1.4,
      skin: i,
      walk: i % Math.max(walks.length, 1),
      job,
      homeJob: job,
      phase,
      phaseT: hash(i + 3) * 2.2,
      tx,
      ty,
      pair: job === "pair" ? (i === 4 ? 5 : 4) : undefined,
      facing: 1,
      inside: false,
      waving: 0,
      talking: 0,
      cross,
      car,
    });
  }
  return out;
}

export function boostDropLive(peds: PedActor[], walks: CityLifeCtx["walks"]) {
  if (peds.some((p) => p.homeJob === "photo" || p.homeJob === "fan")) return peds;
  const door = HQ_DOOR();
  const brand = ["#1db954", "#c9a84c", "#f5f0e1", "#39ff14"];
  for (let i = 0; i < LIVE_CAST.length; i++) {
    const job = LIVE_CAST[i]!;
    const ang = (i / LIVE_CAST.length) * Math.PI * 2;
    peds.push({
      x: door.x + Math.cos(ang) * (70 + (i % 3) * 28),
      y: door.y + 40 + Math.sin(ang) * (36 + (i % 4) * 16),
      vx: 0,
      vy: 0,
      color: brand[i % brand.length]!,
      t: 8 + i,
      skin: i % 8,
      walk: i % Math.max(walks.length, 1),
      job,
      homeJob: job,
      phase: job === "photo" ? "watch" : "go",
      phaseT: 0,
      tx: door.x,
      ty: door.y + 24,
      facing: 1,
      waving: job === "photo" ? 0.8 : 0.2,
      talking: 0,
      cross: i % CROSS.length,
      car: i % PARKED.length,
    });
  }
  return peds;
}

function reactToVan(p: PedActor, ctx: CityLifeCtx) {
  const vanD = hypot(p.x, p.y, ctx.vanX, ctx.vanY);
  if (!ctx.vanHot || vanD > 110 || p.inside) return false;
  p.facing = ctx.vanX < p.x ? -1 : 1;
  p.waving = Math.max(p.waving ?? 0, vanD < 64 ? 1.8 : 0.7);
  if (vanD < 54) {
    const dx = p.x - ctx.vanX;
    const dy = p.y - ctx.vanY;
    const d = Math.hypot(dx, dy) || 1;
    const nx = p.x + (dx / d) * 70 * ctx.dt;
    const ny = p.y + (dy / d) * 70 * ctx.dt;
    if (!ctx.collides(nx, ny, 12) && !inPaint(nx, ny)) {
      p.x = nx;
      p.y = ny;
      p.vx = (dx / d) * 70;
      p.vy = (dy / d) * 70;
    } else {
      p.vx = 0;
      p.vy = 0;
    }
    return true;
  }
  if (vanD < 88) {
    p.vx *= 0.2;
    p.vy *= 0.2;
    return true;
  }
  return false;
}

export function tickCityPed(p: PedActor, i: number, all: PedActor[], ctx: CityLifeCtx) {
  p.t += ctx.dt;
  p.phaseT += ctx.dt;
  if (p.waving && p.waving > 0) p.waving -= ctx.dt;
  if (p.talking && p.talking > 0) p.talking -= ctx.dt;
  if (p.freeze && p.freeze > 0) {
    p.freeze -= ctx.dt;
    p.vx = 0;
    p.vy = 0;
    return;
  }

  if (shouldBeHome(p, ctx)) {
    if (!p.inside) {
      p.inside = true;
      p.vx = 0;
      p.vy = 0;
    }
    return;
  }
  if (p.inside && p.phase !== "shop") p.inside = false;

  if (reactToVan(p, ctx)) return;

  const night = nightOut(ctx.hour);
  const spd = night ? 46 : 62;
  const focus = cityFocus(ctx);
  const job = liveJob(p, focus, ctx);
  p.job = job;

  if (job === "shopper" || job === "fan") tickShopper(p, ctx, spd, night);
  else if (job === "spectator") tickSpectator(p, i, ctx, spd, night);
  else if (job === "pair") tickPair(p, all, ctx, spd, focus);
  else if (job === "waiter") tickWaiter(p, ctx, spd);
  else if (job === "alight") tickAlight(p, ctx, spd);
  else if (job === "photo") tickPhoto(p, ctx, spd);
  else tickStroll(p, ctx, spd, i, focus);
}

function liveJob(p: PedActor, focus: Focus, ctx: CityLifeCtx): PedJob {
  if (p.homeJob === "photo") return "photo";
  if (p.homeJob === "fan") return ctx.dropLive ? "fan" : "shopper";
  if (p.homeJob === "pair") return "pair";
  if (ctx.dropLive && (p.homeJob === "shopper" || p.homeJob === "alight")) return "shopper";
  if (focus === "court" && (p.homeJob === "spectator" || p.homeJob === "waiter" || p.skin === 1)) return "spectator";
  if (focus === "hq" && (p.homeJob === "shopper" || p.homeJob === "alight")) return "shopper";
  if (focus === "beale" && p.homeJob === "shopper") return "stroll";
  if (ctx.basketball && p.homeJob === "spectator") return "spectator";
  return p.homeJob;
}

function tickShopper(p: PedActor, ctx: CityLifeCtx, spd: number, night: boolean) {
  const door = HQ_DOOR();
  if (night && p.phase !== "leave" && p.phase !== "go") {
    p.inside = false;
    setPhase(p, "leave");
    const beale = poi("beale");
    p.tx = beale.x + 40 + p.skin * 12;
    p.ty = beale.y + beale.h + 18;
  }
  if (p.phase === "go") {
    p.inside = false;
    p.tx = door.x;
    p.ty = door.y;
    if (moveToward(p, p.tx, p.ty, spd, ctx) || hypot(p.x, p.y, door.x, door.y) < 22) {
      p.x = door.x;
      p.y = door.y;
      setPhase(p, "enter");
    }
  } else if (p.phase === "enter") {
    p.inside = true;
    p.vx = 0;
    p.vy = 0;
    p.x = door.x;
    p.y = door.y - 6;
    setPhase(p, "shop");
  } else if (p.phase === "shop") {
    p.inside = true;
    p.vx = 0;
    p.vy = 0;
    const stay = 4.5 + hash(p.skin + 2) * 5.5;
    if (p.phaseT > stay) {
      p.inside = false;
      p.x = door.x + (p.skin % 2 === 0 ? -10 : 10);
      p.y = door.y + 8;
      const walk = sidewalkNear(ctx.walks, door.x, door.y + 90);
      p.tx = walk.x + walk.w * 0.45;
      p.ty = walk.y + walk.h * 0.5;
      setPhase(p, "leave");
    }
  } else if (p.phase === "leave") {
    p.inside = false;
    if (moveToward(p, p.tx, p.ty, spd, ctx) || p.phaseT > 16) {
      p.tx = door.x + (hash(p.skin + Math.floor(ctx.hour)) > 0.5 ? -110 : 120);
      p.ty = door.y + 48;
      if (night) {
        const beale = poi("beale");
        p.tx = beale.x + 36;
        p.ty = beale.y + beale.h + 16;
      }
      setPhase(p, "go");
    }
  } else {
    setPhase(p, "go");
  }
}

function tickPhoto(p: PedActor, ctx: CityLifeCtx, spd: number) {
  const door = HQ_DOOR();
  p.tx = door.x + (p.skin % 2 === 0 ? -48 : 52);
  p.ty = door.y + 28;
  p.sideline = true;
  p.waving = 0.85 + Math.abs(Math.sin(ctx.clock * 6 + p.skin)) * 0.15;
  if (hypot(p.x, p.y, p.tx, p.ty) > 18) moveToward(p, p.tx, p.ty, spd * 0.7, ctx);
  else {
    p.vx = 0;
    p.vy = 0;
    p.facing = door.x < p.x ? -1 : 1;
  }
}

function tickSpectator(p: PedActor, i: number, ctx: CityLifeCtx, spd: number, night: boolean) {
  const rail = courtSideline(p.skin + i);
  if (p.phase === "go") {
    p.sideline = false;
    p.tx = rail.x;
    p.ty = rail.y;
    if (moveToward(p, p.tx, p.ty, spd, ctx)) setPhase(p, "watch");
  } else if (p.phase === "watch") {
    p.sideline = true;
    p.vx = 0;
    p.vy = 0;
    const court = poi("court");
    p.facing = court.x + court.w / 2 < p.x ? -1 : 1;
    if (ctx.basketball && hash(p.skin + Math.floor(ctx.clock * 2)) > 0.82) p.waving = 0.6;
    if ((ctx.crowdPulse ?? 0) > 0.25) p.waving = 0.95;
    const stay = ctx.basketball ? 22 : night ? 6 : 12;
    if (p.phaseT > stay && !ctx.basketball) {
      const beale = poi("beale");
      p.tx = beale.x + 50 + (p.skin % 3) * 24;
      p.ty = beale.y + beale.h + 20;
      p.sideline = false;
      setPhase(p, "break");
    }
  } else if (p.phase === "break") {
    if (moveToward(p, p.tx, p.ty, spd, ctx) || p.phaseT > 12) setPhase(p, "go");
  } else {
    setPhase(p, "go");
  }
}

function tickPair(p: PedActor, all: PedActor[], ctx: CityLifeCtx, spd: number, focus: Focus) {
  const mate = p.pair != null ? all[p.pair] : undefined;
  const meet = MEETS[focus === "hq" ? 3 : focus === "downtown" ? 2 : 0]!;
  const slot = p.skin === 4 || p.pair === 5 ? -16 : 16;
  if (p.phase === "go") {
    p.talking = 0;
    p.tx = meet.x + slot;
    p.ty = meet.y;
    if (moveToward(p, p.tx, p.ty, spd, ctx)) setPhase(p, "talk");
  } else if (p.phase === "talk") {
    p.vx = 0;
    p.vy = 0;
    p.talking = 1;
    if (mate) p.facing = mate.x < p.x ? -1 : 1;
    if (p.phaseT > 6.5 + hash(p.skin) * 4) {
      const beale = poi("beale");
      p.tx = beale.x + 28 + p.skin * 16;
      p.ty = beale.y + beale.h + 18;
      p.talking = 0;
      setPhase(p, "split");
    }
  } else if (p.phase === "split") {
    p.talking = 0;
    if (moveToward(p, p.tx, p.ty, spd, ctx) || p.phaseT > 14) setPhase(p, "go");
  } else {
    setPhase(p, "go");
  }
}

function tickWaiter(p: PedActor, ctx: CityLifeCtx, spd: number) {
  let nearest = CROSS[p.cross ?? 0] ?? CROSS[0]!;
  let best = hypot(ctx.px, ctx.py, nearest.x, nearest.y);
  for (let i = 0; i < CROSS.length; i++) {
    const c = CROSS[i]!;
    if (inCourtPx(c.x, c.y)) continue;
    const d = hypot(ctx.px, ctx.py, c.x, c.y);
    if (d < best - 40) {
      best = d;
      nearest = c;
      p.cross = i;
    }
  }
  const curbY = nearest.y + TILE * 0.92;
  const farY = nearest.y - TILE * 0.92;
  if (p.phase === "go") {
    p.tx = nearest.x - 24;
    p.ty = curbY;
    if (moveToward(p, p.tx, p.ty, spd, ctx)) setPhase(p, "wait");
  } else if (p.phase === "wait") {
    p.vx = 0;
    p.vy = 0;
    p.facing = 1;
    const cycle = (ctx.clock * 0.28) % 9;
    if (p.phaseT > 1.4 && cycle > 5.1) setPhase(p, "cross");
  } else if (p.phase === "cross") {
    p.tx = nearest.x - 24;
    p.ty = farY;
    if (moveToward(p, p.tx, p.ty, spd * 1.2, ctx)) {
      setPhase(p, "go");
      p.ty = curbY;
    }
  } else {
    setPhase(p, "go");
  }
}

function tickAlight(p: PedActor, ctx: CityLifeCtx, spd: number) {
  if (p.phase === "exit") {
    p.vx = 0;
    p.vy = 0;
    p.inside = false;
    if (p.phaseT > 1.8) {
      const walk = sidewalkNear(ctx.walks, p.x, p.y);
      p.tx = walk.x + Math.min(walk.w * 0.55, 90);
      p.ty = walk.y + walk.h * 0.5;
      setPhase(p, "walkoff");
    }
  } else if (p.phase === "walkoff") {
    if (moveToward(p, p.tx, p.ty, spd, ctx) || p.phaseT > 11) {
      p.inside = true;
      setPhase(p, "away");
    }
  } else if (p.phase === "away") {
    p.inside = true;
    p.vx = 0;
    p.vy = 0;
    if (p.phaseT > 3.2) {
      const pk = PARKED[(p.car ?? 0) + 1] ?? PARKED[Math.floor(hash(p.skin + ctx.hour) * PARKED.length)]!;
      p.car = ((p.car ?? 0) + 1) % PARKED.length;
      p.x = pk.x + 10;
      p.y = pk.y + 8;
      p.inside = false;
      setPhase(p, "exit");
    }
  } else {
    setPhase(p, "exit");
  }
}

function tickStroll(p: PedActor, ctx: CityLifeCtx, spd: number, i: number, focus: Focus) {
  const walk = ctx.walks[p.walk] ?? ctx.walks[i % Math.max(ctx.walks.length, 1)];
  if (!walk) return;
  let hx = walk.x + walk.w / 2;
  let hy = walk.y + walk.h / 2;
  if (focus === "beale") {
    const b = poi("beale");
    hx = b.x + b.w / 2;
    hy = b.y + b.h + 18;
  } else if (focus === "downtown") {
    const d = poi("downtown");
    hx = d.x + d.w / 2;
    hy = d.y + 12;
  }
  if (hypot(p.x, p.y, hx, hy) > 420 && p.phase !== "seek") setPhase(p, "seek");
  if (p.phase === "seek") {
    p.tx = hx;
    p.ty = hy;
    if (moveToward(p, p.tx, p.ty, spd, ctx) || p.phaseT > 18) setPhase(p, "loop");
    return;
  }
  const horiz = walk.w >= walk.h;
  if (horiz) {
    p.vy = 0;
    if (Math.abs(p.vx) < 8) p.vx = spd * (p.facing >= 0 ? 1 : -1);
    p.y = walk.y + walk.h * 0.5;
    p.x += p.vx * ctx.dt;
    if (p.x < walk.x + 10) p.facing = 1;
    if (p.x > walk.x + walk.w - 10) p.facing = -1;
  } else {
    p.vx = 0;
    if (Math.abs(p.vy) < 8) p.vy = spd * (p.facing >= 0 ? 1 : -1);
    p.x = walk.x + walk.w * 0.5;
    p.y += p.vy * ctx.dt;
  }
  if (Math.abs(p.vx) > 8) p.facing = p.vx < 0 ? -1 : 1;
}

export const PED_JOB_CHAT: Record<PedJob, string[]> = {
  stroll: ["You Benji? SackReligious got the city on lock.", "901 all day. Keep it moving."],
  shopper: ["HQ just dropped the green hoodie. Wall's packed.", "I'm grabbing a tee then heading Beale."],
  spectator: ["Court's live. Don't leave that three short.", "Sackrow Ballers weather. You hoop?"],
  waiter: ["Light never lasts. Cross when it gives you a window.", "This corner been Memphis since forever."],
  pair: ["We was just talking the drop. You in it or watching?", "K Blanco don't play about the fit."],
  alight: ["Just parked. Don't block the whip.", "You seen the drop van? Black and gold, can't miss it."],
  photo: ["Hold still. Chin down, chain out. That's the cover.", "Drop Live looks different when the flash hits."],
  fan: ["I'm wearing the drop. You see me? That's the brand.", "K said the city would feel it. She wasn't lying."],
};
