import * as THREE from "three";
import type { Solid } from "../core/types";
import { dampAngle, damp } from "../core/util";
import { pushCircle, pushOut } from "../world/collide";
import { Card, type CardArt } from "./card";

/**
 * What someone is doing while they are stopped somewhere.
 *  watch  stand and look at it          play   work a machine
 *  eat    at a table                    dance  move to the music
 *  cheer  jump now and then             serve  behind a counter, turns to whoever walks up
 *  bounce on a trampoline               wade   in the ball pit
 *  inside gone through a door for a while
 *  throw  one go at something (a bowling ball), then off again
 */
export type Act = "watch" | "play" | "eat" | "dance" | "cheer" | "serve" | "bounce" | "wade" | "inside" | "throw";

export type Stop = {
  x: number;
  z: number;
  /** What they face while they are here. */
  fx: number;
  fz: number;
  act: Act;
  /** Seconds they stay, shortest and longest. */
  stay?: [number, number];
  /** Height of whatever they stand on here, above the floor. */
  lift?: number;
  /** Called once when someone gets here. */
  on?: () => void;
  taken?: boolean;
};

type Member = {
  card: Card;
  stops: Stop[];
  stop: Stop;
  going: boolean;
  t: number;
  x: number;
  z: number;
  pace: number;
  seed: number;
  hop: number;
  checkT: number;
  checkX: number;
  checkZ: number;
  /** Posted: never leaves the one stop. */
  posted: boolean;
  order: boolean;
  at: number;
  /** Behind a counter: seconds left holding an order out, seconds until the next one, and who they share the window with. */
  serving: number;
  rest: number;
  team: string;
  served: number;
  /** Seconds left standing still, turned to whoever spoke to them. */
  hail: number;
};

/** Somebody Benji could speak to: who they are, where, and what they are in the middle of. */
export type Talker = { key: string; card: Card; x: number; z: number; doing: string };

const STAY: Record<Act, [number, number]> = {
  watch: [4, 9],
  play: [7, 14],
  eat: [9, 16],
  dance: [8, 15],
  cheer: [5, 10],
  serve: [1e9, 1e9],
  bounce: [1e9, 1e9],
  wade: [1e9, 1e9],
  inside: [8, 18],
  throw: [1.6, 2.2],
};

const _pos = { x: 0, z: 0 };

/** A car on the move: where it is and where it is going. */
export type Moving = { x: number; z: number; vx: number; vz: number; speed: number };

/**
 * Nobody gets run over. Moves a point out of the strip of road a car is about to drive through,
 * a quick step to whichever side is nearer. Returns true if it had to move.
 */
export function stepClear(p: { x: number; z: number }, car: Moving, dt: number) {
  const lx = car.vx * 0.8;
  const lz = car.vz * 0.8;
  const len2 = lx * lx + lz * lz;
  const t = len2 > 0 ? Math.max(-0.1, Math.min(1, ((p.x - car.x) * lx + (p.z - car.z) * lz) / len2)) : 0;
  let dx = p.x - (car.x + lx * t);
  let dz = p.z - (car.z + lz * t);
  const d = Math.hypot(dx, dz);
  const clear = 2.7;
  if (d >= clear) return false;
  if (d < 0.05) {
    // Dead on its line: any side will do.
    dx = -lz;
    dz = lx;
  }
  const n = Math.hypot(dx, dz) || 1;
  const push = Math.min(clear - d, 16 * dt);
  p.x += (dx / n) * push;
  p.z += (dz / n) * push;
  return true;
}

/**
 * People with somewhere to be. Each one walks from stop to stop and does what the stop is for:
 * plays the machine, eats at the table, watches the lane, goes in through the door and comes
 * back out. They walk round furniture, step round Benji, and give up a spot when he wants it.
 */
export class Troupe {
  private members: Member[] = [];
  private rand: () => number;
  private clock = 0;

  constructor(
    private group: THREE.Group,
    private solids: Solid[],
    /** Floor height for a room; null outdoors, where the ground is looked up. */
    private floorY: number | null,
    seed = 7,
  ) {
    let s = seed * 9301 + 49297;
    this.rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  /** Stops are nudged clear of the furniture so they can always be reached. */
  stops(list: Stop[]) {
    for (const s of list) {
      _pos.x = s.x;
      _pos.z = s.z;
      if (s.act !== "bounce" && s.act !== "wade" && s.act !== "serve") pushOut(_pos, 0.34, this.solids);
      s.x = _pos.x;
      s.z = _pos.z;
    }
    return list;
  }

  /** Someone who goes round these stops: at random, or in order when `order` is set. */
  roam(art: CardArt, height: number, stops: Stop[], order = false) {
    const free = stops.filter((s) => !s.taken);
    const stop = order ? stops[0]! : (free[Math.floor(this.rand() * free.length)] ?? stops[0]!);
    return this.add(art, height, stops, stop, false, order);
  }

  /** Someone who stays where they are: a cook, a clerk, a kid on a trampoline. */
  post(art: CardArt, height: number, stop: Stop, team = "") {
    const card = this.add(art, height, [stop], stop, true, false);
    this.members[this.members.length - 1]!.team = team;
    return card;
  }

  /**
   * Whoever is nearest a point and free to be spoken to. Not the ones working a counter or sat at
   * a game (they have their own business with Benji), nor anyone out of reach on a trampoline.
   */
  nearest(x: number, z: number, r: number, tag: string): Talker | null {
    let best = -1;
    let bestD = r;
    this.members.forEach((m, i) => {
      const act = m.stop.act;
      if (!m.card.visible || (!m.going && (act === "inside" || act === "bounce" || act === "wade")) || (m.posted && (act === "serve" || act === "play"))) return;
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const m = this.members[best];
    return m ? { key: `${tag}${best}`, card: m.card, x: m.x, z: m.z, doing: m.going ? "walk" : m.stop.act } : null;
  }

  /** They stop what they are doing for a few seconds and turn to him. */
  hail(key: string, tag: string, seconds: number) {
    const m = key.startsWith(tag) ? this.members[Number(key.slice(tag.length))] : undefined;
    if (m) m.hail = seconds;
  }

  /** One of the crew holds an order out. The ones who share a window take turns. */
  private serve(m: Member, seconds: number) {
    m.serving = seconds;
    m.rest = 5 + this.rand() * 5;
    m.served = this.clock;
    if (m.team) for (const o of this.members) if (o !== m && o.team === m.team) o.rest = Math.max(o.rest, seconds + 1.5 + this.rand() * 2);
  }

  /** Benji ordered at (x, z): whoever at that window served longest ago hands it over. */
  serveAt(x: number, z: number, seconds = 3.4) {
    let pick: Member | null = null;
    for (const m of this.members) {
      if (m.stop.act !== "serve" || Math.hypot(m.x - x, m.z - z) > 7) continue;
      if (!pick || m.served < pick.served) pick = m;
    }
    if (pick) this.serve(pick, seconds);
    return !!pick;
  }

  private add(art: CardArt, height: number, stops: Stop[], stop: Stop, posted: boolean, order: boolean) {
    const card = new Card(art, height);
    this.group.add(card.group);
    stop.taken = true;
    const seed = this.rand() * 10;
    const stay = stop.stay ?? STAY[stop.act];
    const m: Member = { card, stops, stop, going: false, t: stay[0] + this.rand() * (stay[1] - stay[0]), x: stop.x, z: stop.z, pace: 1.25 + this.rand() * 0.5, seed, hop: 0, checkT: 0, checkX: stop.x, checkZ: stop.z, posted, order, at: Math.max(0, stops.indexOf(stop)), serving: 0, rest: 2 + this.rand() * 4, team: "", served: -1, hail: 0 };
    card.heading = Math.atan2(stop.fx - stop.x, stop.fz - stop.z);
    this.members.push(m);
    return card;
  }

  /** Everyone within `r` of a point jumps for a moment. */
  cheer(x: number, z: number, r: number, seconds = 1.3) {
    for (const m of this.members) if (!m.going && m.stop.act !== "inside" && Math.hypot(m.x - x, m.z - z) < r) m.hop = seconds * (0.7 + ((m.seed * 7) % 1) * 0.6);
  }

  private next(m: Member) {
    let pick: Stop | undefined;
    if (m.order) {
      m.at = (m.at + 1) % m.stops.length;
      pick = m.stops[m.at];
    } else {
      const free = m.stops.filter((s) => !s.taken && s !== m.stop);
      pick = free[Math.floor(this.rand() * free.length)];
    }
    if (!pick) {
      // Nowhere free: stay a little longer.
      m.t = 2 + this.rand() * 3;
      return;
    }
    if (!m.order) m.stop.taken = false;
    m.stop = pick;
    if (!m.order) pick.taken = true;
    m.going = true;
    m.checkT = 0;
    m.checkX = m.x;
    m.checkZ = m.z;
  }

  /**
   * `beat` is seconds into a song playing nearby, or -1. `reach` hides anyone further than that
   * from the camera (outdoors).
   */
  update(dt: number, camera: THREE.Vector3, tint: THREE.Color, player: { x: number; z: number } | null, time: number, beat = -1, reach = 0, car: Moving | null = null) {
    this.clock = time;
    for (const m of this.members) {
      const c = m.card;
      // A car coming: jump clear of it, then walk back to whatever you were doing.
      if (car && car.speed > 2.5 && !m.posted && m.stop.act !== "inside" && stepClear(m, car, dt)) {
        m.hop = Math.max(m.hop, 0.5);
        m.going = true;
        m.checkT = 0;
      }
      if (reach > 0 && Math.abs(m.x - camera.x) + Math.abs(m.z - camera.z) > reach) {
        // Out of sight they still keep their appointments, just without being drawn.
        c.visible = false;
        c.group.visible = false;
        if (!m.posted) {
          m.t -= dt;
          if (m.going) {
            m.x = m.stop.x;
            m.z = m.stop.z;
            m.going = false;
            const stay = m.stop.stay ?? STAY[m.stop.act];
            m.t = stay[0] + this.rand() * (stay[1] - stay[0]);
          } else if (m.t <= 0) this.next(m);
        }
        continue;
      }
      const s = m.stop;
      const pd = player ? Math.hypot(player.x - m.x, player.z - m.z) : 99;
      let lift = 0;
      c.groove = -1;
      // Spoken to: stand still and look at him until the moment has passed or he has walked off.
      if (m.hail > 0 && player && pd < 5 && s.act !== "inside") {
        m.hail -= dt;
        c.visible = true;
        c.speed = 0;
        c.pose = null;
        c.heading = dampAngle(c.heading, Math.atan2(player.x - m.x, player.z - m.z), damp(8, dt));
        c.lift = m.going ? 0 : (s.lift ?? 0);
        c.place(m.x, m.z);
        c.update(dt, camera, tint, this.floorY);
        continue;
      }
      m.hail = 0;
      if (m.going) {
        const dx = s.x - m.x;
        const dz = s.z - m.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.24) {
          m.going = false;
          m.x = s.x;
          m.z = s.z;
          const stay = s.stay ?? STAY[s.act];
          m.t = stay[0] + this.rand() * (stay[1] - stay[0]);
          if (s.act === "throw") m.hop = 0.5;
          s.on?.();
        } else {
          const bx = m.x;
          const bz = m.z;
          const step = Math.min(d, m.pace * dt);
          _pos.x = m.x + (dx / d) * step;
          _pos.z = m.z + (dz / d) * step;
          pushOut(_pos, 0.3, this.solids);
          if (player) pushCircle(_pos, 0.3, player.x, player.z, 0.5);
          m.x = _pos.x;
          m.z = _pos.z;
          const mx = m.x - bx;
          const mz = m.z - bz;
          const moved = Math.hypot(mx, mz);
          if (moved > 1e-4) c.heading = dampAngle(c.heading, Math.atan2(mx, mz), damp(10, dt));
          c.speed = dt > 0 ? moved / dt : 0;
          c.pose = null;
          if (m.hop > 0) {
            m.hop = Math.max(0, m.hop - dt);
            lift = Math.abs(Math.sin(m.hop * 12)) * 0.22;
          }
          // Boxed in: pick somewhere else to go.
          m.checkT += dt;
          if (m.checkT > 1.4) {
            if (Math.hypot(m.x - m.checkX, m.z - m.checkZ) < 0.35) {
              if (m.order) {
                m.x = s.x;
                m.z = s.z;
              } else {
                s.taken = false;
                const free = m.stops.filter((k) => !k.taken && k !== s);
                const pick = free[Math.floor(this.rand() * free.length)];
                if (pick) {
                  m.stop = pick;
                  pick.taken = true;
                } else s.taken = true;
              }
            }
            m.checkT = 0;
            m.checkX = m.x;
            m.checkZ = m.z;
          }
        }
        c.visible = true;
      } else {
        c.speed = 0;
        const act = s.act;
        c.visible = act !== "inside";
        // Turn to Benji when he is close enough to be talking to; otherwise mind your business.
        const facePlayer = player && pd < (act === "serve" ? 4 : 1.7) && act !== "bounce" && act !== "play";
        const want = facePlayer ? Math.atan2(player.x - m.x, player.z - m.z) : Math.atan2(s.fx - m.x, s.fz - m.z);
        c.heading = dampAngle(c.heading, want, damp(5, dt));
        lift = s.lift ?? 0;
        let up = false;
        if (act === "bounce") lift += Math.abs(Math.sin((time + m.seed) * 2.7)) * 1.15;
        else if (act === "wade") lift += Math.max(0, Math.sin((time + m.seed) * 2.1)) * 0.35;
        else if (act === "play") lift += Math.max(0, Math.sin((time + m.seed) * 7)) * 0.02;
        else if (act === "cheer" && Math.sin(time * 0.55 + m.seed * 3) > 0.55) {
          lift += Math.abs(Math.sin((time + m.seed) * 8)) * 0.16;
          up = true;
        }
        else if (act === "dance") c.groove = beat >= 0 ? beat + m.seed * 0.05 : time + m.seed;
        if (beat >= 0 && act !== "serve" && act !== "bounce" && act !== "inside") c.groove = beat + m.seed * 0.05;
        if (act === "serve") {
          if (m.serving > 0) m.serving -= dt;
          else {
            m.rest -= dt;
            if (m.rest <= 0) {
              // Somebody waiting at the window gets served; with nobody there, keep an eye out.
              const waiting = this.members.some((o) => !o.posted && !o.going && o.stop.act !== "inside" && Math.hypot(o.x - m.x, o.z - m.z) < 4.6);
              if (waiting) this.serve(m, 2.6);
              else m.rest = 1;
            }
          }
          c.pose = m.serving > 0 ? "serve" : null;
        }
        if (m.hop > 0) {
          m.hop = Math.max(0, m.hop - dt);
          lift += Math.abs(Math.sin((time + m.seed) * 9)) * 0.24 * Math.min(1, m.hop * 2);
          up = m.hop > 0.15;
        }
        // Both hands in the air while they are jumping about something.
        if (act !== "serve") c.pose = up ? "cheer" : null;
        if (!m.posted) {
          m.t -= dt;
          // Benji wants the spot: let him have it.
          if (player && pd < 1.15 && act !== "inside" && act !== "throw") m.t = Math.min(m.t, 0.5);
          if (m.t <= 0) this.next(m);
        }
      }
      c.lift = lift;
      c.place(m.x, m.z);
      c.update(dt, camera, tint, this.floorY);
    }
  }
}
