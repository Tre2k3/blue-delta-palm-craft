import { PLAYER_RUN, PLAYER_SPEED } from "./data";
import type { Dir } from "./types";

export type LocomotionState = "idle" | "walk" | "run" | "turn" | "interact" | "shoot" | "jump";

function approach(current: number, target: number, maxDelta: number) {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function dampAngle(current: number, target: number, rate: number, dt: number) {
  const delta = wrapAngle(target - current);
  const t = 1 - Math.exp(-rate * dt);
  return current + delta * t;
}

export class CharacterController {
  vx = 0;
  vy = 0;
  vz = 0;
  air = 0;
  heading = 0;
  speed = 0;
  lean = 0;
  turnLean = 0;
  state: LocomotionState = "idle";
  animT = 0;
  interactT = 0;
  shootT = 0;
  grounded = true;
  jumped = false;
  landed = false;
  private coyote = 0;
  private jumpBuffer = 0;

  readonly walkSpeed = PLAYER_SPEED;
  readonly runSpeed = PLAYER_RUN;
  readonly accel = 940;
  readonly decel = 1520;
  readonly turnIdle = 11.5;
  readonly turnWalk = 8.2;
  readonly turnRun = 4.05;
  readonly jumpVel = 6.15;
  readonly gravity = 15.4;

  triggerInteract() {
    this.interactT = 0.38;
  }

  triggerShoot() {
    this.shootT = 0.42;
  }

  tryJump() {
    this.jumpBuffer = 0.14;
  }

  reset(heading = 0) {
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.air = 0;
    this.heading = heading;
    this.speed = 0;
    this.lean = 0;
    this.turnLean = 0;
    this.state = "idle";
    this.animT = 0;
    this.interactT = 0;
    this.shootT = 0;
    this.grounded = true;
    this.jumped = false;
    this.landed = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
  }

  update(dt: number, wishX: number, wishY: number, runHeld: boolean, jumpPressed = false, jumpHeld = false) {
    this.jumped = false;
    this.landed = false;
    if (jumpPressed) this.tryJump();

    const wishLen = Math.hypot(wishX, wishY);
    const sprint = runHeld && wishLen > 0.18;
    const maxSpeed = sprint ? this.runSpeed : this.walkSpeed;
    let tx = 0;
    let ty = 0;
    if (wishLen > 0.01) {
      tx = (wishX / wishLen) * maxSpeed;
      ty = (wishY / wishLen) * maxSpeed;
    }
    const hasWish = wishLen > 0.01;
    const rate = hasWish ? this.accel : this.decel;
    this.vx = approach(this.vx, tx, rate * dt);
    this.vy = approach(this.vy, ty, rate * dt);
    this.speed = Math.hypot(this.vx, this.vy);

    if (this.speed > 10) {
      const desired = Math.atan2(-this.vx, -this.vy);
      const turnRate = this.speed > this.walkSpeed * 0.88 ? this.turnRun : this.turnWalk;
      this.heading = dampAngle(this.heading, desired, turnRate, dt);
      this.turnLean = wrapAngle(desired - this.heading);
    } else if (hasWish) {
      const desired = Math.atan2(-wishX, -wishY);
      this.heading = dampAngle(this.heading, desired, this.turnIdle, dt);
      this.turnLean *= Math.exp(-8 * dt);
    } else {
      this.turnLean *= Math.exp(-6 * dt);
    }

    const wishSpeed = hasWish ? maxSpeed : 0;
    const accelAmt = (wishSpeed - this.speed) / Math.max(maxSpeed, 1);
    const targetLean = accelAmt * 0.16 + this.turnLean * 0.28;
    this.lean += (targetLean - this.lean) * (1 - Math.exp(-10 * dt));

    if (this.grounded) this.coyote = 0.11;
    else this.coyote = Math.max(0, this.coyote - dt);

    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= dt;
      if (this.grounded || this.coyote > 0) {
        this.vz = this.jumpVel;
        this.air = Math.max(this.air, 0.02);
        this.grounded = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.jumped = true;
      }
    }

    if (!this.grounded) {
      if (!jumpHeld && this.vz > 2.1) this.vz *= Math.exp(-6 * dt);
      this.vz -= this.gravity * dt;
      this.air += this.vz * dt;
      if (this.air <= 0) {
        this.air = 0;
        this.vz = 0;
        this.grounded = true;
        this.landed = true;
      }
    }

    if (!this.grounded || this.air > 0.03) {
      this.state = "jump";
    } else if (this.shootT > 0) {
      this.shootT -= dt;
      this.state = "shoot";
    } else if (this.interactT > 0) {
      this.interactT -= dt;
      this.state = "interact";
    } else if (this.speed < 14) {
      this.state = Math.abs(this.turnLean) > 0.55 ? "turn" : "idle";
    } else if (sprint && this.speed > this.walkSpeed * 0.9) {
      this.state = "run";
    } else {
      this.state = "walk";
    }

    const cadence = this.state === "run" ? 11.2 : this.state === "walk" ? 7.4 : this.state === "jump" ? 6 : 1.7;
    this.animT += dt * cadence * (0.55 + Math.min(this.speed / this.runSpeed, 1) * 0.7);
  }

  facing(): Dir {
    const a = ((this.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (a >= Math.PI * 1.75 || a < Math.PI * 0.25) return "up";
    if (a < Math.PI * 0.75) return "right";
    if (a < Math.PI * 1.25) return "down";
    return "left";
  }
}
