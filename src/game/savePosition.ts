import { WORLD_PX_H, WORLD_PX_W } from "./data";
import { PLAYER_GROUND_RADIUS_PX } from "./worldScale";

export type SavedPosition = { x: number; y: number; yaw: number };
export type PositionBlocked = (x: number, y: number, radius: number) => boolean;

export function readPosition(value: unknown): SavedPosition | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<SavedPosition>;
  if (typeof p.x !== "number" || typeof p.y !== "number" || typeof p.yaw !== "number") return null;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.yaw)) return null;
  if (p.x < 62 || p.y < 62 || p.x > WORLD_PX_W - 62 || p.y > WORLD_PX_H - 62) return null;
  return { x: p.x, y: p.y, yaw: p.yaw };
}

/** Keep valid saves exact; recover invalid positions locally before home fallback. */
export function safePosition(value: unknown, blocked: PositionBlocked, fallback: SavedPosition): SavedPosition | null {
  const source = readPosition(value);
  const free = (p: SavedPosition) => readPosition(p) && !blocked(p.x, p.y, PLAYER_GROUND_RADIUS_PX);
  if (source && free(source)) return source;
  if (source) {
    for (let radius = 24; radius <= 144; radius += 24) {
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8;
        const p = { x: source.x + Math.cos(angle) * radius, y: source.y + Math.sin(angle) * radius, yaw: source.yaw };
        if (free(p)) return p;
      }
    }
  }
  return free(fallback) ? { ...fallback } : null;
}
