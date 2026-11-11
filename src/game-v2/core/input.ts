import { clamp } from "./util";

/** What the game asks for. Keys, touch buttons and pads all land on these. */
export type Action = "interact" | "action" | "run" | "map" | "pause" | "time" | "back" | "brake" | "left" | "right" | "up" | "down" | "horn" | "camera";

const KEYMAP: Record<string, Action> = {
  KeyE: "interact",
  Enter: "interact",
  Space: "action",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyM: "map",
  Escape: "pause",
  KeyP: "pause",
  KeyN: "time",
  KeyQ: "back",
  Backspace: "back",
  KeyX: "brake",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyH: "horn",
  KeyC: "camera",
};

/**
 * Standard gamepad layout. On foot the right trigger is the action button; in a car the
 * triggers are gas and brake, so they are left out of the car map and read as analogue values.
 */
const PAD_FOOT: Partial<Record<number, Action>> = {
  0: "interact",
  1: "back",
  2: "action",
  3: "map",
  5: "run",
  6: "run",
  7: "action",
  8: "time",
  9: "pause",
  10: "horn",
};
const PAD_CAR: Partial<Record<number, Action>> = {
  0: "interact",
  1: "back",
  2: "action",
  3: "map",
  5: "run",
  8: "time",
  9: "pause",
  10: "horn",
};

/** What a pad sends to a menu. */
export type Nav = "up" | "down" | "left" | "right" | "accept" | "back" | "init";
const DIRS = ["up", "down", "left", "right"] as const;

/**
 * One input surface. Edges (`hit`) last exactly one simulation frame, so a tap is never
 * missed and never counted twice. Everything is cleared when the tab loses focus.
 */
export class Input {
  private held = new Set<Action>();
  private edges = new Set<Action>();
  private queued = new Set<Action>();
  private padHeld = new Set<Action>();
  private stickX = 0;
  private stickY = 0;
  private padX = 0;
  private padY = 0;
  private lookDX = 0;
  private gas = 0;
  private brakeAmt = 0;
  private nav: Nav[] = [];
  private repeat: Record<string, number> = { up: 0, down: 0, left: 0, right: 0 };
  private aWas = false;
  /** Set by the game: in a car the triggers are pedals. */
  driving = false;
  /** Set by the game: in an activity the A button is also the action button. */
  actionOnA = false;
  /** True while the last thing touched was a gamepad. The HUD shows pad buttons. */
  pad = false;
  /** Blocks game input while a menu owns the keyboard. */
  locked = false;
  /** Set while something else on the page (a game in a cabinet's browser) is using the pad. */
  padOff = false;
  /** True once the player has touched the screen: the HUD shows touch controls. */
  touch = false;
  private off: (() => void)[] = [];

  constructor(target: Window = window) {
    const down = (e: KeyboardEvent) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (e.code === "Space" || e.code.startsWith("Arrow") || e.code === "Backspace") e.preventDefault();
      if (!this.held.has(a)) this.queued.add(a);
      this.held.add(a);
      this.pad = false;
    };
    const up = (e: KeyboardEvent) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      // Two keys can map to one action; only release when neither is down.
      this.held.delete(a);
    };
    const clear = () => this.clear();
    const vis = () => {
      if (document.hidden) this.clear();
    };
    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    target.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", vis);
    this.off.push(
      () => target.removeEventListener("keydown", down),
      () => target.removeEventListener("keyup", up),
      () => target.removeEventListener("blur", clear),
      () => document.removeEventListener("visibilitychange", vis),
    );
  }

  clear() {
    this.held.clear();
    this.queued.clear();
    this.edges.clear();
    this.stickX = 0;
    this.stickY = 0;
  }

  /** Call once at the top of each frame. */
  begin() {
    this.pollPad();
    this.edges = this.queued;
    this.queued = new Set();
  }

  down(a: Action) {
    return !this.locked && (this.held.has(a) || this.padHeld.has(a));
  }

  hit(a: Action) {
    return !this.locked && this.edges.has(a);
  }

  /** Menus read edges even while the game is locked out. */
  hitRaw(a: Action) {
    return this.edges.has(a);
  }

  /** Movement, right and forward positive, length capped at 1. */
  move() {
    if (this.locked) return { x: 0, y: 0 };
    let x = (this.held.has("right") ? 1 : 0) - (this.held.has("left") ? 1 : 0) + this.stickX + this.padX;
    let y = (this.held.has("up") ? 1 : 0) - (this.held.has("down") ? 1 : 0) + this.stickY + this.padY;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /**
   * Gas and brake for anything with wheels, -1..1. Keys and the touch stick, or the pad's
   * triggers. The pad's stick only steers, so leaning on it in a corner never lifts the gas.
   */
  throttle() {
    if (this.locked) return 0;
    const keys = (this.held.has("up") ? 1 : 0) - (this.held.has("down") ? 1 : 0) + this.stickY;
    return clamp(keys + this.gas - this.brakeAmt, -1, 1);
  }

  /** Menu presses from the pad since the last call. */
  takeNav() {
    const n = this.nav;
    this.nav = [];
    return n;
  }

  /** Shake the pad, if it can. */
  rumble(strength = 0.5, ms = 120) {
    if (!this.pad || typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pad = [...navigator.getGamepads()].find((p) => p && p.connected) as (Gamepad & { vibrationActuator?: { playEffect?: (kind: string, o: object) => Promise<unknown> } }) | undefined;
    try {
      void pad?.vibrationActuator?.playEffect?.("dual-rumble", { duration: ms, strongMagnitude: clamp(strength, 0, 1), weakMagnitude: clamp(strength * 0.7, 0, 1) })?.catch(() => undefined);
    } catch {
      /* no rumble on this pad */
    }
  }

  /** Camera drag accumulated since the last call. */
  takeLook() {
    const v = this.lookDX;
    this.lookDX = 0;
    return v;
  }

  // Touch and UI entry points.
  setStick(x: number, y: number) {
    this.touch = true;
    this.stickX = clamp(x, -1, 1);
    this.stickY = clamp(y, -1, 1);
  }

  press(a: Action) {
    this.queued.add(a);
  }

  hold(a: Action, on: boolean) {
    this.touch = true;
    if (on) {
      if (!this.held.has(a)) this.queued.add(a);
      this.held.add(a);
    } else this.held.delete(a);
  }

  look(dx: number) {
    this.lookDX += dx;
  }

  private pollPad() {
    this.padX = 0;
    this.padY = 0;
    this.gas = 0;
    this.brakeAmt = 0;
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected);
    const now = new Set<Action>();
    if (this.padOff) {
      // Not ours right now. Remember what is held, so nothing counts as a fresh press later.
      pad?.buttons.forEach((b, i) => {
        const a = PAD_FOOT[i];
        if (b.pressed && a) now.add(a);
      });
      this.padHeld = now;
      this.aWas = !!pad?.buttons[0]?.pressed;
      const t = performance.now() + 380;
      for (const d of DIRS) this.repeat[d] = t;
      return;
    }
    if (pad) {
      const dead = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      this.padX = dead(pad.axes[0] ?? 0);
      this.padY = -dead(pad.axes[1] ?? 0);
      const look = dead(pad.axes[2] ?? 0);
      this.lookDX += look * 0.045;
      let used = this.padX !== 0 || this.padY !== 0 || look !== 0;
      const map = this.driving ? PAD_CAR : PAD_FOOT;
      pad.buttons.forEach((b, i) => {
        if (!b.pressed) return;
        used = true;
        const a = map[i];
        if (a) now.add(a);
      });
      const a = !!pad.buttons[0]?.pressed;
      if (this.actionOnA && a) now.add("action");
      if (this.driving) {
        this.gas = pad.buttons[7]?.value ?? 0;
        this.brakeAmt = pad.buttons[6]?.value ?? 0;
      }
      if (pad.buttons[12]?.pressed) this.padY = 1;
      if (pad.buttons[13]?.pressed) this.padY = -1;
      if (pad.buttons[14]?.pressed) this.padX = -1;
      if (pad.buttons[15]?.pressed) this.padX = 1;
      if (used) this.pad = true;

      // Stick and d-pad as direction presses, repeating while held: menus and the mole table.
      const t = performance.now();
      const on = { up: this.padY > 0.55, down: this.padY < -0.55, left: this.padX < -0.55, right: this.padX > 0.55 };
      for (const d of DIRS) {
        if (!on[d]) {
          this.repeat[d] = 0;
          continue;
        }
        if (this.repeat[d] === 0 || t >= this.repeat[d]!) {
          this.repeat[d] = t + (this.repeat[d] === 0 ? 380 : 150);
          this.queued.add(d);
          this.nav.push(d);
        }
      }
      if (a && !this.aWas) this.nav.push("accept");
      this.aWas = a;
    }
    for (const a of now) if (!this.padHeld.has(a)) this.queued.add(a);
    this.padHeld = now;
  }

  dispose() {
    for (const f of this.off) f();
    this.off = [];
  }
}
