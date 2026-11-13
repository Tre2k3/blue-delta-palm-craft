import * as THREE from "three";
import { P2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { Card } from "../actors/card";
import { CarModel } from "../actors/vehicle";
import { BENJI_HEIGHT, OUTFITS, type OutfitId } from "../assets/cast";
import type { CrewHud, Place } from "../core/types";
import { damp, dampAngle } from "../core/util";
import type { Game } from "../game";
import { rideById } from "../play/garage";
import { districtAt } from "../world/map";

/** What carries a crew's messages. The real one is browser to browser; a test can put its own in. */
export interface Transport {
  join(): Promise<void>;
  /** In order, and it gets there: to one friend, or to everybody. */
  send(data: unknown, to?: string): void;
  /** Latest wins: where everybody is, many times a second. */
  broadcast(data: unknown): void;
  close(): void;
}
export type TransportHooks = { peers(list: PeerInfo[]): void; message(from: string, data: unknown): void };
export type MakeTransport = (room: string, selfId: string, name: string, hooks: TransportHooks) => Transport;

const direct: MakeTransport = (room, selfId, name, hooks) => {
  const r = new P2PRoom({ room, selfId, name, onPeersChanged: hooks.peers, onMessage: (from, data) => hooks.message(from, data) });
  return { join: () => r.join(), send: (d, to) => r.send(d, to), broadcast: (d) => r.broadcast(d), close: () => r.close() };
};

/**
 * Where a friend is and what they are doing, a dozen times a second. On foot it is where they
 * stand; at the wheel it is where the car is, and `y` is how high the road has it.
 */
type State = { k: "s"; x: number; z: number; y: number; h: number; v: number; p: Place; m: string; o: OutfitId; r: string; a: string | null; l: number };
type Wire = State | { k: "re"; e: string } | { k: "win"; l: number } | { k: "tb"; [key: string]: unknown };

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NAME_KEY = "sack-v2-name";
const CODE_KEY = "sack-v2-crew";
const RATE = 1 / 12;
const PLACES: Record<Exclude<Place, "street">, string> = { hq: "SackReligious HQ", home: "Home", bowl: "901 Bowl", fun: "The Fun House", laser: "Laser Arena" };
/** What a friend is up to, in the words the crew screen uses. */
const DOING: Record<string, string> = { walk: "Walking", drive: "Driving", race: "Street racing", hoops: "Playing ball", bowl: "Bowling", fish: "Fishing", kart: "Racing karts", laser: "Playing laser tag", bounce: "On the trampoline", pit: "In the ball pit", whack: "Playing a game", title: "At the title screen" };
/** Most people in one crew: every device holds a line open to every other. */
export const CREW_MAX = 8;
export const REACTIONS = ["👋", "🔥", "😂", "👏", "💰", "GG"] as const;

type Friend = {
  id: string;
  name: string;
  link: "connecting" | "connected" | "failed";
  rtt: number | null;
  card: Card;
  tag: THREE.Sprite;
  bubble: THREE.Sprite;
  car: CarModel | null;
  ride: string;
  /** Has said where they are yet. */
  seen: boolean;
  x: number;
  y: number;
  z: number;
  h: number;
  tx: number;
  ty: number;
  tz: number;
  th: number;
  v: number;
  place: Place;
  mode: string;
  outfit: OutfitId;
  pose: string | null;
  lift: number;
  say: number;
  /** When their last win was called out here, so a run of them is one call. */
  cheered: number;
};

function label(text: string, color: string, size = 44) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.font = `900 ${size}px ui-sans-serif, system-ui, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  const w = Math.min(480, g.measureText(text).width + 56);
  g.fillStyle = "rgba(6,10,8,0.82)";
  g.beginPath();
  g.roundRect((512 - w) / 2, 22, w, 84, 42);
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 5;
  g.stroke();
  g.fillStyle = "#ffffff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 66, 430);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const letter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)]!;
/** A name fit to put over somebody's head, whoever sent it. */
const tidy = (name: string) => name.replace(/[^\w .'-]/g, "").trim().slice(0, 14);

/**
 * A crew: up to eight people who have typed the same four letters. Everyone in it is in their own
 * Memphis, and sees the others walking and driving round it, wearing what they are wearing, in
 * the car they are driving, doing what they are doing. It is also the line the park's tables are
 * played over.
 *
 * Nothing is trusted to a server and nobody is matched with strangers: a crew is people who gave
 * each other the code.
 */
export class Crew {
  code: string | null = null;
  name = "Player";
  readonly selfId: string;
  /** Swapped by the tests for a line that needs no network. */
  make: MakeTransport = direct;
  /** The park tables listen here. */
  onTable: ((from: string, msg: Record<string, unknown>) => void) | null = null;
  onGone: ((id: string) => void) | null = null;
  private link: Transport | null = null;
  private friends = new Map<string, Friend>();
  private clock = 0;
  private error = "";
  private joined = false;
  private resumed = false;

  constructor(private g: Game) {
    this.selfId = Array.from({ length: 12 }, letter).join("").toLowerCase() + Date.now().toString(36).slice(-4);
    try {
      this.name = (localStorage.getItem(NAME_KEY) || "").slice(0, 14) || `Player ${Math.floor(10 + Math.random() * 89)}`;
    } catch {
      // Private windows have no storage: the made-up name stands.
    }
  }

  /** A link that puts whoever opens it straight into this crew. */
  get invite() {
    return this.code && typeof location !== "undefined" ? `${location.origin}/?crew=${this.code}` : "";
  }

  /** The crew this visit should be in and is not in yet: the one in the link, or the one a refresh interrupted. */
  get waiting() {
    if (this.resumed || this.code || typeof location === "undefined") return "";
    let code = new URLSearchParams(location.search).get("crew") ?? "";
    try {
      code ||= sessionStorage.getItem(CODE_KEY) ?? "";
    } catch {
      // No storage: only a link brings him back.
    }
    code = code.toUpperCase();
    return /^[A-Z]{4}$/.test(code) ? code : "";
  }

  /** The day has started: join the crew that was waiting on it. Once a visit; after that the crew screen decides. */
  resume() {
    const code = this.waiting;
    this.resumed = true;
    if (code) this.join(code);
  }

  rename(name: string) {
    const clean = tidy(name);
    if (!clean || clean === this.name) return;
    this.name = clean;
    try {
      localStorage.setItem(NAME_KEY, clean);
    } catch {
      // Nowhere to keep it; it lasts the visit.
    }
    // A name is given when the line opens: open it again under the new one.
    if (this.code) this.join(this.code);
    else this.g.push();
  }

  /** Start a crew of his own and hand out the code. */
  host() {
    return this.join(letter() + letter() + letter() + letter());
  }

  /** Join the crew with this code. False if it is not a code a crew could have. */
  join(raw: string) {
    const code = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (code.length !== 4) {
      this.error = "A crew code is four letters.";
      this.g.push();
      return false;
    }
    this.leave();
    this.code = code;
    this.error = "";
    this.joined = false;
    try {
      sessionStorage.setItem(CODE_KEY, code);
    } catch {
      // A refresh will not bring him back, that is all.
    }
    const link = this.make(`sack-${code}`, this.selfId, this.name, {
      peers: (list) => this.link === link && this.peers(list),
      message: (from, data) => this.link === link && this.message(from, data as Wire),
    });
    this.link = link;
    void link
      .join()
      .then(() => {
        if (this.link !== link) return;
        this.joined = true;
        this.g.push();
      })
      .catch(() => {
        if (this.link !== link) return;
        this.error = "Could not reach the crew line. Check the connection and try again.";
        this.g.push();
      });
    this.g.push();
    return true;
  }

  leave() {
    if (!this.link) return;
    const link = this.link;
    this.link = null;
    link.close();
    this.code = null;
    this.joined = false;
    try {
      sessionStorage.removeItem(CODE_KEY);
    } catch {
      // Nothing was kept.
    }
    for (const f of this.friends.values()) {
      this.drop(f);
      this.onGone?.(f.id);
    }
    this.friends.clear();
    this.g.push();
  }

  /** The page is going away: hang up, but remember the crew for when it comes back. */
  shutdown() {
    this.link?.close();
    this.link = null;
  }

  /** The friends he has a working line to. */
  linked() {
    return [...this.friends.values()].filter((f) => f.link === "connected").map((f) => ({ id: f.id, name: f.name }));
  }

  nameOf(id: string) {
    return this.friends.get(id)?.name ?? "Your friend";
  }

  /** A message for the park tables, to one friend. */
  table(to: string, msg: Record<string, unknown>) {
    this.link?.send({ k: "tb", ...msg }, to);
  }

  /** Throw a reaction up over his own head, for everybody to see. */
  react(e: string) {
    if (!this.link || !(REACTIONS as readonly string[]).includes(e)) return;
    this.link.send({ k: "re", e });
    this.g.sound.ui();
    // His fist goes up with it, and that is seen on every screen too.
    this.g.fistUp(1.8);
    this.g.toast(`You: ${e}`, 1.6);
  }

  private enter(id: string, name: string): Friend {
    const card = new Card(OUTFITS.starter.art, BENJI_HEIGHT);
    card.visible = false;
    card.group.visible = false;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: label(name, "#39ff14"), depthWrite: false, transparent: true }));
    tag.scale.set(1.7, 0.425, 1);
    tag.renderOrder = 9;
    tag.visible = false;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true }));
    bubble.scale.set(1.9, 0.475, 1);
    bubble.renderOrder = 10;
    bubble.visible = false;
    this.g.city.scene.add(card.group, tag, bubble);
    return { id, name, link: "connecting", rtt: null, card, tag, bubble, car: null, ride: "", seen: false, x: 0, y: 0, z: 0, h: 0, tx: 0, ty: 0, tz: 0, th: 0, v: 0, place: "street", mode: "walk", outfit: "starter", pose: null, lift: 0, say: 0, cheered: -1e9 };
  }

  /** Something in a bubble over a friend's head for a few seconds. */
  private pop(f: Friend, text: string) {
    f.bubble.material.map?.dispose();
    f.bubble.material.map = label(text, "#f4d77a", 68);
    f.bubble.material.needsUpdate = true;
    f.say = 3.2;
  }

  /** A win worth a roar here is news for the whole crew. */
  celebrate(level: number) {
    this.link?.send({ k: "win", l: level });
  }

  private drop(f: Friend) {
    this.g.city.scene.remove(f.card.group, f.tag, f.bubble);
    if (f.car) this.g.city.exterior.remove(f.car.group);
    f.card.dispose();
    for (const s of [f.tag, f.bubble]) {
      s.material.map?.dispose();
      s.material.dispose();
    }
  }

  private peers(list: PeerInfo[]) {
    const g = this.g;
    const alive = new Set(list.map((p) => p.id));
    for (const p of list.slice(0, CREW_MAX - 1)) {
      let f = this.friends.get(p.id);
      if (!f) {
        f = this.enter(p.id, tidy(p.name) || "Friend");
        this.friends.set(p.id, f);
      }
      const name = tidy(p.name) || f.name;
      if (name !== f.name) {
        f.name = name;
        f.tag.material.map?.dispose();
        f.tag.material.map = label(name, "#39ff14");
        f.tag.material.needsUpdate = true;
      }
      const was = f.link;
      f.link = p.connectionState === "connected" ? "connected" : p.connectionState === "failed" || p.connectionState === "closed" ? "failed" : "connecting";
      f.rtt = p.rttMs ?? f.rtt;
      if (f.link === "connected" && was !== "connected") {
        g.toast(`${f.name} linked up`, 3);
        g.sound.cash();
      }
      if (f.link !== "connected" && was === "connected") this.onGone?.(f.id);
    }
    for (const [id, f] of this.friends) {
      if (alive.has(id)) continue;
      if (f.link === "connected") g.toast(`${f.name} left the crew`, 3);
      this.drop(f);
      this.friends.delete(id);
      this.onGone?.(id);
    }
    g.push();
  }

  private message(from: string, data: Wire) {
    const f = this.friends.get(from);
    if (!f || !data || typeof data !== "object") return;
    if (data.k === "s") {
      const s = data;
      if (![s.x, s.y, s.z, s.h, s.v, s.l].every((n) => typeof n === "number" && Number.isFinite(n))) return;
      f.tx = s.x;
      f.ty = s.y;
      f.tz = s.z;
      f.th = s.h;
      f.v = Math.min(60, Math.abs(s.v));
      f.place = s.p === "street" || s.p in PLACES ? s.p : "street";
      f.mode = String(s.m).slice(0, 12);
      f.pose = typeof s.a === "string" ? s.a.slice(0, 16) : null;
      f.lift = Math.max(0, Math.min(4, s.l));
      f.ride = String(s.r).slice(0, 24);
      if (s.o !== f.outfit && OUTFITS[s.o]) {
        f.outfit = s.o;
        f.card.setArt(OUTFITS[s.o].art);
      }
      if (!f.seen) {
        f.seen = true;
        f.x = s.x;
        f.y = s.y;
        f.z = s.z;
        f.h = s.h;
      }
    } else if (data.k === "re") {
      const e = String(data.e);
      if (!(REACTIONS as readonly string[]).includes(e)) return;
      this.pop(f, e);
      this.g.sound.ui();
      if (f.place !== this.g.place || Math.hypot(f.x - this.g.pos.x, f.z - this.g.pos.z) > 40) this.g.toast(`${f.name}: ${e}`, 2.2);
    } else if (data.k === "win") {
      const now = performance.now();
      if (now - f.cheered < 4000) return;
      f.cheered = now;
      this.pop(f, "🏆");
      const here = f.seen && f.place === this.g.place;
      this.g.crewWin(f.name, data.l === 3 ? 3 : 2, here ? { x: f.x, z: f.z } : null);
    } else if (data.k === "tb") this.onTable?.(from, data as Record<string, unknown>);
  }

  /** Every frame: say where Benji is, and move everybody else to where they said they were. */
  update(dt: number) {
    const g = this.g;
    if (!this.link) return;
    this.clock += dt;
    if (this.clock >= RATE && g.mode !== "title") {
      this.clock = 0;
      const driving = g.mode === "drive" || g.mode === "race";
      const d = g.driver;
      const s: State = {
        k: "s",
        x: +(driving ? d.x : g.pos.x).toFixed(2),
        y: driving ? +d.y.toFixed(2) : 0,
        z: +(driving ? d.z : g.pos.z).toFixed(2),
        h: +(driving ? d.heading : g.heading).toFixed(2),
        v: +(driving ? Math.abs(d.forward) : g.benji.speed).toFixed(1),
        p: g.place,
        m: g.mode,
        o: g.save.wearing,
        r: g.save.ride,
        a: g.benji.pose,
        l: +g.benji.lift.toFixed(2),
      };
      this.link.broadcast(s);
    }
    const cam = g.camera.position;
    const floor = g.place === "street" ? null : g.rooms[g.place].floorY + 0.03;
    const night = g.sky.look.lights > 0.4;
    for (const f of this.friends.values()) {
      const here = f.seen && f.link === "connected" && f.place === g.place;
      const driving = f.mode === "drive" || f.mode === "race";
      const px = f.x;
      const pz = f.z;
      // A ride across town is a jump, not a sprint.
      if (Math.hypot(f.tx - f.x, f.tz - f.z) > 18) {
        f.x = f.tx;
        f.y = f.ty;
        f.z = f.tz;
        f.h = f.th;
      } else {
        const k = damp(12, dt);
        f.x += (f.tx - f.x) * k;
        f.y += (f.ty - f.y) * k;
        f.z += (f.tz - f.z) * k;
        f.h = dampAngle(f.h, f.th, k);
      }
      f.card.visible = here && !driving;
      let top = 0;
      if (f.card.visible) {
        f.card.place(f.x, f.z);
        f.card.heading = f.h;
        f.card.speed = f.v;
        f.card.pose = f.pose && f.card.has(f.pose) ? f.pose : null;
        f.card.lift = f.lift;
        f.card.update(dt, cam, g.tint, floor);
        top = f.card.group.position.y + BENJI_HEIGHT + f.lift;
      } else f.card.group.visible = false;
      // The car they own, in its own colours, the first time they are seen at the wheel.
      if (here && driving && (!f.car || f.car.group.userData.ride !== f.ride)) {
        if (f.car) g.city.exterior.remove(f.car.group);
        const ride = rideById(f.ride);
        f.car = new CarModel(ride.kind, ride.paint, ride.wrap);
        f.car.group.userData.ride = f.ride;
        g.city.exterior.add(f.car.group);
      }
      if (f.car) {
        f.car.group.visible = here && driving;
        if (f.car.group.visible) {
          f.car.place(f.x, f.y, f.z, f.h);
          f.car.roll(Math.hypot(f.x - px, f.z - pz), 0);
          f.car.lamps(night ? 3 : 0.2, 0.5);
          top = f.y + 1.75;
        }
      }
      f.tag.visible = here;
      f.tag.position.set(f.x, top + 0.34, f.z);
      if (f.say > 0) f.say -= dt;
      f.bubble.visible = here && f.say > 0;
      // It pops up, hangs, and is gone.
      const rise = 1 - Math.min(1, (3.2 - f.say) / 0.25);
      f.bubble.position.set(f.x, top + 0.9 - rise * 0.3, f.z);
      f.bubble.material.opacity = Math.min(1, f.say / 0.4);
    }
  }

  hud(): CrewHud {
    return {
      code: this.code,
      name: this.name,
      status: !this.link ? "off" : this.linked().length ? "linked" : "waiting",
      ready: this.joined,
      error: this.error,
      invite: this.invite,
      waiting: this.waiting,
      friends: [...this.friends.values()].map((f) => ({
        id: f.id,
        name: f.name,
        link: f.link,
        rtt: f.rtt,
        x: f.x,
        z: f.z,
        street: f.seen && f.place === "street",
        where: !f.seen ? "" : f.place === "street" ? districtAt(f.x, f.z) : PLACES[f.place],
        doing: f.seen ? (DOING[f.mode] ?? "") : "",
      })),
      max: CREW_MAX,
    };
  }

  /** For the tests: where each friend is drawn. */
  get shown() {
    return [...this.friends.values()].map((f) => ({ id: f.id, name: f.name, link: f.link, x: f.x, z: f.z, visible: f.card.group.visible, car: !!f.car?.group.visible, outfit: f.outfit, pose: f.card.pose, tag: f.tag.visible, say: f.bubble.visible }));
  }
}
