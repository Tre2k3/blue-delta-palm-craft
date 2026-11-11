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

const PAD: Partial<Record<number, Action>> = {
  0: "interact",
  2: "action",
  1: "back",
  3: "map",
  9: "pause",
  5: "run",
  7: "run",
  6: "brake",
  8: "time",
};

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
  /** Blocks game input while a menu owns the keyboard. */
  locked = false;
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
    this.padHeld.clear();
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
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected);
    const now = new Set<Action>();
    if (pad) {
      const dead = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      this.padX = dead(pad.axes[0] ?? 0);
      this.padY = -dead(pad.axes[1] ?? 0);
      this.lookDX += dead(pad.axes[2] ?? 0) * 0.04;
      pad.buttons.forEach((b, i) => {
        const a = PAD[i];
        if (a && b.pressed) now.add(a);
      });
      if (pad.buttons[12]?.pressed) this.padY = 1;
      if (pad.buttons[13]?.pressed) this.padY = -1;
      if (pad.buttons[14]?.pressed) this.padX = -1;
      if (pad.buttons[15]?.pressed) this.padX = 1;
    }
    for (const a of now) if (!this.padHeld.has(a)) this.queued.add(a);
    this.padHeld = now;
  }

  dispose() {
    for (const f of this.off) f();
    this.off = [];
  }
}
