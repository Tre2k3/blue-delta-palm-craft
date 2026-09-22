import {
  APPAREL,
  DEFAULT_SETTINGS,
  NPCS,
  POIS,
  TROPHIES,
  WORLD_PX_H,
  WORLD_PX_W,
  createDropDayMission,
  createSideMissions,
} from "./data";
import type { GameSettings, SaveData } from "./types";
function record(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
function number(v: unknown, fallback: number, min: number, max: number) {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
}
function ids<T extends string>(v: unknown, allowed: readonly T[]): T[] {
  return Array.isArray(v)
    ? [...new Set(v.filter((x): x is T => typeof x === "string" && allowed.includes(x as T)))]
    : [];
}
export function sanitizeSettings(value: unknown): GameSettings {
  const v = record(value);
  return {
    master: number(v.master, DEFAULT_SETTINGS.master, 0, 1),
    music: number(v.music, DEFAULT_SETTINGS.music, 0, 1),
    sfx: number(v.sfx, DEFAULT_SETTINGS.sfx, 0, 1),
    shake: typeof v.shake === "boolean" ? v.shake : true,
    rumble: typeof v.rumble === "boolean" ? v.rumble : true,
    cameraView: v.cameraView === "first" ? "first" : "third",
    quality: v.quality === "low" ? "low" : "high",
    sensitivity: number(v.sensitivity, 1, 0.25, 2),
    showTouch: v.showTouch === true,
  };
}
/** Validate local data, migrate older saves, and normalize sequential objectives. */
export function parseSave(raw: string): SaveData | null {
  try {
    const v = record(JSON.parse(raw));
    if (
      !Object.keys(v).length ||
      (v.version !== undefined && ![1, 2, 3].includes(v.version as number))
    )
      return null;
    const owned = ids(
      v.owned,
      APPAREL.map((a) => a.id),
    );
    if (!owned.includes("starter_tee")) owned.unshift("starter_tee");
    const mission = createDropDayMission(),
      progress = record(v.missionProgress);
    let contiguous = true;
    for (const s of mission.steps) {
      contiguous = contiguous && progress[s.id] === true;
      s.done = contiguous;
    }
    const first = mission.steps.findIndex((s) => !s.done),
      p = record(v.position),
      vehicle = record(v.vehicle),
      side = record(v.sideProgress);
    return {
      version: 3,
      sackdollars: Math.floor(number(v.sackdollars, 25, 0, 9999999)),
      respect: Math.floor(number(v.respect, 0, 0, 999999)),
      owned,
      equipped: owned.includes(v.equipped as (typeof owned)[number])
        ? (v.equipped as (typeof owned)[number])
        : "starter_tee",
      missionProgress: Object.fromEntries(mission.steps.map((s) => [s.id, s.done])),
      missionActiveStep: first < 0 ? mission.steps.length : first,
      missionComplete: first < 0,
      basketballHighScore: Math.floor(number(v.basketballHighScore, 0, 0, 99999)),
      tutorialDone: v.tutorialDone === true,
      trophies: ids(
        v.trophies,
        TROPHIES.map((t) => t.id),
      ),
      sideProgress: Object.fromEntries(
        createSideMissions().map((s) => [s.id, side[s.id] === true]),
      ),
      worldHour: number(v.worldHour, 16.2, 0, 23.999),
      settings: sanitizeSettings(v.settings),
      position: {
        x: number(p.x, 288, 62, WORLD_PX_W - 62),
        y: number(p.y, 558, 62, WORLD_PX_H - 62),
        yaw: number(p.yaw, -Math.PI / 2, -Math.PI * 2, Math.PI * 2),
      },
      vehicle: {
        x: number(vehicle.x, 1896, 62, WORLD_PX_W - 62),
        y: number(vehicle.y, 1068, 62, WORLD_PX_H - 62),
        yaw: number(vehicle.yaw, -Math.PI / 2, -Math.PI * 2, Math.PI * 2),
      },
      talked: ids(
        v.talked,
        NPCS.map((n) => n.id),
      ),
      visited: ids(
        v.visited,
        POIS.map((p) => p.id),
      ),
    };
  } catch {
    return null;
  }
}
