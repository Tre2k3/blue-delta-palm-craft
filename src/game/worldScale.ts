/** Existing world units, centralized without changing the authored city. */
export const GAME_PIXELS_PER_UNIT = 16;
export const WORLD_UNITS_PER_PIXEL = 1 / GAME_PIXELS_PER_UNIT;
export const BENJI_HEIGHT_UNITS = 1.78;
export const PLAYER_GROUND_RADIUS_PX = 14;
export const worldUnits = (pixels: number) => pixels * WORLD_UNITS_PER_PIXEL;
export const gamePixels = (units: number) => units * GAME_PIXELS_PER_UNIT;
