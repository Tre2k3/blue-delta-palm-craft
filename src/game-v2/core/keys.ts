/** Where the device keeps the game's progress, and what it last agreed with the account. */
export const SAVE_KEY = "sack-v2-save-4";
export const SYNC_KEY = "sack-v2-account";

/**
 * A short mark of what a save holds that counts as progress: money, respect, what he owns, the
 * story, records. Where he is standing and how long the game has been open are left out, so a
 * device that only sat open has nothing new to say.
 */
export function signature(save: unknown): string {
  if (!save || typeof save !== "object") return "";
  const text = JSON.stringify({ ...(save as Record<string, unknown>), played: 0, x: 0, z: 0, heading: 0, car: null });
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}:${h >>> 0}`;
}

/** Jookin: how many beats ahead a move is shown coming down the screen. */
export const JOOK_LEAD = 2;
