import type { InputDevice } from "./types";

export type Actions = {
  mx: number;
  my: number;
  lookX: number;
  lookY: number;
  run: boolean;
  interact: boolean;
  interactPressed: boolean;
  backPressed: boolean;
  pausePressed: boolean;
  shoot: boolean;
  shootPressed: boolean;
  shootReleased: boolean;
  viewPressed: boolean;
  jump: boolean;
  jumpPressed: boolean;
  jook: boolean;
  jookPressed: boolean;
  arrowTap: "left" | "right" | "up" | null;
};

const DEAD = 0.16;

function radial(x: number, y: number, dz = DEAD) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = ((Math.min(m, 1) - dz) / (1 - dz)) / m;
  return { x: x * scale, y: y * scale };
}

export class InputManager {
  keys = new Set<string>();
  touch = { mx: 0, my: 0, shoot: false, lookX: 0, jump: false, jook: false, run: false };
  device: InputDevice = "keyboard";
  private prevShoot = false;
  private prevInteract = false;
  private prevBack = false;
  private prevPause = false;
  private prevView = false;
  private prevJump = false;
  private prevJook = false;
  private padInteract = false;
  private padBack = false;
  private padPause = false;
  private padShoot = false;
  private padRun = false;
  private padJump = false;
  private padMx = 0;
  private padMy = 0;
  private padLookX = 0;
  lastPad: Gamepad | null = null;
  private mouseDX = 0;
  private mouseDY = 0;
  private pointerLocked = false;
  private padLookY = 0;
  private padView = false;
  private padNeedsNeutral = false;
  private bound = false;

  private queuedInteract = false;
  private queuedPause = false;
  private queuedBack = false;
  private queuedShootPress = false;
  private queuedShootRelease = false;
  private queuedView = false;
  private queuedJump = false;
  private queuedJook = false;
  private queuedArrow: "left" | "right" | "up" | null = null;

  private kd = (e: KeyboardEvent) => {
    this.device = "keyboard";
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === "KeyE" || e.code === "Enter") this.queuedInteract = true;
    if (e.code === "Space") {
      this.queuedJump = true;
      this.queuedShootPress = true;
    }
    if (e.code === "Escape") {
      this.queuedPause = true;
      this.queuedBack = true;
    }
    if (e.code === "KeyP") this.queuedPause = true;
    if (e.code === "KeyF") this.queuedShootPress = true;
    if (e.code === "KeyV" || e.code === "KeyC") this.queuedView = true;
    if (e.code === "KeyJ") this.queuedJook = true;
    if (e.code === "ArrowLeft" || e.code === "KeyA") this.queuedArrow = "left";
    if (e.code === "ArrowRight" || e.code === "KeyD") this.queuedArrow = "right";
    if (e.code === "ArrowUp" || e.code === "KeyW") this.queuedArrow = "up";
  };
  private ku = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === "KeyF" || e.code === "Space") this.queuedShootRelease = true;
  };
  private blur = () => this.reset();
  private visibility = () => {
    if (document.hidden) this.reset();
  };
  private contextMenu = (e: Event) => e.preventDefault();
  private padConnected = () => { this.device = "gamepad"; };

  /** End every held action after a focus interruption; emit one shoot release. */
  reset() {
    const shooting = this.prevShoot || this.keys.has("Space") || this.keys.has("KeyF") || this.touch.shoot || this.padShoot || this.queuedShootPress;
    this.keys.clear();
    Object.assign(this.touch, { mx: 0, my: 0, shoot: false, lookX: 0, jump: false, jook: false, run: false });
    this.mouseDX = this.mouseDY = 0;
    this.padMx = this.padMy = this.padLookX = this.padLookY = 0;
    this.padInteract = this.padBack = this.padPause = this.padShoot = this.padRun = this.padJump = this.padView = false;
    this.padNeedsNeutral = true;
    this.prevShoot = this.prevInteract = this.prevBack = this.prevPause = this.prevView = this.prevJump = this.prevJook = false;
    this.queuedInteract = this.queuedPause = this.queuedBack = this.queuedShootPress = this.queuedView = this.queuedJump = this.queuedJook = false;
    this.queuedArrow = null;
    this.queuedShootRelease = shooting || this.queuedShootRelease;
  }

  private mm = (e: MouseEvent) => {
    if (this.pointerLocked || e.buttons === 2) {
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
      this.device = "keyboard";
    }
  };
  private lock = () => {
    this.pointerLocked = !!document.pointerLockElement;
  };

  queueJump() {
    this.queuedJump = true;
    this.touch.jump = true;
  }

  queueJook() {
    this.queuedJook = true;
    this.touch.jook = true;
  }

  queueArrow(dir: "left" | "right" | "up") {
    this.queuedArrow = dir;
  }

  bind() {
    if (this.bound) return;
    this.bound = true;
    window.addEventListener("keydown", this.kd);
    window.addEventListener("keyup", this.ku);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("mousemove", this.mm);
    document.addEventListener("pointerlockchange", this.lock);
    window.addEventListener("contextmenu", this.contextMenu);
    window.addEventListener("gamepadconnected", this.padConnected);
  }

  unbind() {
    this.bound = false;
    this.reset();
    window.removeEventListener("keydown", this.kd);
    window.removeEventListener("keyup", this.ku);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("mousemove", this.mm);
    document.removeEventListener("pointerlockchange", this.lock);
    window.removeEventListener("contextmenu", this.contextMenu);
    window.removeEventListener("gamepadconnected", this.padConnected);
  }

  poll(): Actions {
    let mx = 0;
    let my = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) my -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) my += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;
    mx += this.touch.mx;
    my += this.touch.my;
    if (Math.abs(this.touch.mx) + Math.abs(this.touch.my) > 0.05) this.device = "touch";
    if (this.touch.shoot || this.touch.jump || this.touch.jook || this.touch.run || this.touch.lookX) this.device = "touch";

    this.pollPad();
    mx += this.padMx;
    my += this.padMy;

    let lookX = 0;
    if (this.keys.has("KeyQ")) lookX -= 1;
    if (this.keys.has("KeyR")) lookX += 1;
    lookX += this.padLookX;
    lookX += this.touch.lookX;
    lookX += this.mouseDX * 0.045;
    const lookY = this.padLookY + this.mouseDY * 0.045;
    this.mouseDX = 0;
    this.mouseDY = 0;

    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    const interactHeld =
      this.keys.has("KeyE") || this.keys.has("Enter") || this.padInteract;
    const backHeld = this.keys.has("Escape") || this.keys.has("Backspace") || this.padBack;
    const pauseHeld = this.keys.has("Escape") || this.keys.has("KeyP") || this.padPause;
    const shootHeld = this.keys.has("KeyF") || this.keys.has("Space") || this.padShoot || this.touch.shoot;
    const run = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.padRun || this.touch.run;
    const jumpHeld = this.keys.has("Space") || this.padJump || this.touch.jump;
    const jookHeld = this.keys.has("KeyJ") || this.touch.jook;

    const interactPressed = (interactHeld && !this.prevInteract) || this.queuedInteract;
    const backPressed = (backHeld && !this.prevBack) || this.queuedBack;
    const pausePressed = (pauseHeld && !this.prevPause) || this.queuedPause;
    const shootPressed = (shootHeld && !this.prevShoot) || this.queuedShootPress;
    const shootReleased = (!shootHeld && this.prevShoot) || this.queuedShootRelease;
    const jumpPressed = (jumpHeld && !this.prevJump) || this.queuedJump;
    const jookPressed = (jookHeld && !this.prevJook) || this.queuedJook;
    const arrowTap = this.queuedArrow;
    this.queuedInteract = false;
    this.queuedBack = false;
    this.queuedPause = false;
    this.queuedJump = false;
    this.queuedJook = false;
    this.queuedArrow = null;
    this.queuedShootPress = false;
    this.queuedShootRelease = false;
    const viewHeld = this.keys.has("KeyV") || this.keys.has("KeyC") || this.padView;
    const viewPressed = (viewHeld && !this.prevView) || this.queuedView;
    this.queuedView = false;
    this.prevView = viewHeld;

    this.prevInteract = interactHeld;
    this.prevBack = backHeld;
    this.prevPause = pauseHeld;
    this.prevShoot = shootHeld;
    this.prevJump = jumpHeld;
    this.prevJook = jookHeld;

    return {
      mx,
      my,
      lookX,
      lookY,
      run,
      interact: interactHeld,
      interactPressed,
      backPressed,
      pausePressed,
      shoot: shootHeld,
      shootPressed,
      shootReleased,
      viewPressed,
      jump: jumpHeld,
      jumpPressed,
      jook: jookHeld,
      jookPressed,
      arrowTap,
    };
  }

  private pollPad() {
    this.padMx = 0;
    this.padMy = 0;
    this.padLookX = 0;
    this.padLookY = 0;
    this.padInteract = false;
    this.padBack = false;
    this.padPause = false;
    this.padShoot = false;
    this.padRun = false;
    this.padJump = false;
    this.padView = false;
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) {
      if (!p) continue;
      this.lastPad = p;
      if (this.padNeedsNeutral) {
        if (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > DEAD)) return;
        this.padNeedsNeutral = false;
      }
      const st = radial(p.axes[0] ?? 0, p.axes[1] ?? 0);
      this.padMx += st.x;
      this.padMy += st.y;
      if (p.buttons[12]?.pressed) this.padMy -= 1;
      if (p.buttons[13]?.pressed) this.padMy += 1;
      if (p.buttons[14]?.pressed) this.padMx -= 1;
      if (p.buttons[15]?.pressed) this.padMx += 1;
      this.padInteract = !!(p.buttons[0]?.pressed);
      this.padBack = !!(p.buttons[1]?.pressed);
      this.padShoot = !!(p.buttons[2]?.pressed || p.buttons[7]?.pressed);
      this.padJump = !!(p.buttons[5]?.pressed);
      this.padRun = !!(p.buttons[3]?.pressed);
      const look = radial(p.axes[2] ?? 0, p.axes[3] ?? 0, 0.2);
      this.padLookX += look.x;
      this.padLookY += look.y;
      this.padView = !!(p.buttons[11]?.pressed);
      this.padPause = !!(p.buttons[9]?.pressed);
      if (
        Math.abs(st.x) + Math.abs(st.y) > 0.2 ||
        p.buttons.some((b) => b.pressed)
      ) {
        this.device = "gamepad";
      }
      break;
    }
  }

  preferTouch() {
    this.device = "touch";
  }

  queuePause() {
    this.queuedPause = true;
    this.device = "touch";
  }

  rumble(ms: number, strong = 0.35, weak = 0.55) {
    const p = this.lastPad;
    const act = p?.vibrationActuator as
      | { playEffect?: (t: string, o: Record<string, number>) => Promise<void> }
      | undefined;
    if (!act?.playEffect) return;
    void act.playEffect("dual-rumble", {
      startDelay: 0,
      duration: ms,
      strongMagnitude: strong,
      weakMagnitude: weak,
    });
  }

  prompt(device: InputDevice): { interact: string; pause: string; run: string; shoot: string; jump: string } {
    if (device === "gamepad") {
      return { interact: "A", pause: "Start", run: "Y", shoot: "X", jump: "RB" };
    }
    if (device === "touch") {
      return { interact: "TAP", pause: "II", run: "RUN", shoot: "SHOOT", jump: "JUMP" };
    }
    return { interact: "E", pause: "Esc", run: "Shift", shoot: "Space", jump: "Space" };
  }
}
