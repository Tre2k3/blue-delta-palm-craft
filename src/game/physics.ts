export const FIXED_STEP = 1 / 60;
export const GRAVITY = 780;
export const SHOT_GREEN = { min: 0.54, max: 0.76 } as const;
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const wrapAngle = (n: number) => Math.atan2(Math.sin(n), Math.cos(n));
/** Solve a ball arc through the rim; aim assist uses the shortest angular path. */
export function shotVelocity(
  x: number,
  y: number,
  yaw: number,
  power: number,
  hoop: { x: number; y: number; z: number },
) {
  const distance = Math.hypot(hoop.x - x, hoop.y - y);
  const perfect = power >= SHOT_GREEN.min && power <= SHOT_GREEN.max;
  const good = power >= 0.42 && power <= 0.88;
  const error = wrapAngle(Math.atan2(x - hoop.x, y - hoop.y) - yaw);
  const assist = Math.abs(error) < 0.8 ? (perfect ? 1 : good ? 0.8 : 0.25) : 0;
  const angle = yaw + error * assist;
  const duration = clamp(0.66 + distance / 620, 0.7, 1.25);
  const accuracy = perfect ? 1 : good ? 1 + (power - 0.65) * 0.16 : 1 + (power - 0.65) * 0.65;
  const speed = (distance / duration) * accuracy;
  return {
    vx: -Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed,
    vz: (hoop.z - 42 + 0.5 * GRAVITY * duration ** 2) / duration,
    duration,
    distance,
    grade: perfect ? "PERFECT" : good ? "GOOD" : power < 0.42 ? "EARLY" : "LATE",
  } as const;
}
/** Swept crossing prevents both tunnelling and scoring the same basket twice. */
export function crossesHoop(
  before: { x: number; y: number; z: number },
  after: { x: number; y: number; z: number },
  hoop: { x: number; y: number; z: number },
) {
  if (before.z <= hoop.z || after.z > hoop.z) return false;
  const t = (before.z - hoop.z) / (before.z - after.z);
  return (
    Math.hypot(
      before.x + (after.x - before.x) * t - hoop.x,
      before.y + (after.y - before.y) * t - hoop.y,
    ) < 11
  );
}
export function driveStep(
  speed: number,
  yaw: number,
  steer: number,
  throttle: number,
  brake: boolean,
  dt: number,
) {
  const target = throttle > 0 ? 470 * throttle : 170 * throttle;
  const response = brake ? 7 : Math.abs(throttle) > 0.01 ? 1.5 : 1.1;
  speed += ((brake ? 0 : target) - speed) * (1 - Math.exp(-response * dt));
  if (Math.abs(speed) < 0.5) speed = 0;
  yaw -= steer * 1.8 * Math.min(1, Math.abs(speed) / 100) * Math.sign(speed) * dt;
  return { speed, yaw: wrapAngle(yaw), vx: -Math.sin(yaw) * speed, vy: -Math.cos(yaw) * speed };
}
