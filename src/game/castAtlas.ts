export const CAST_ATLAS_URL = "/game/sprites/chapter1-cast-atlas.png";
export const CAST_ATLAS_COLS = 4;
export const CAST_ATLAS_ROWS = 8;

export const CAST_ROWS = {
  front: 0,
  back: 1,
  left: 2,
  right: 3,
  jump: 4,
  shoot: 5,
  peopleA: 6,
  peopleB: 7,
} as const;

export function cropCastFrame(
  img: HTMLImageElement,
  col: number,
  row: number,
): HTMLCanvasElement {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const cellW = Math.floor(width / CAST_ATLAS_COLS);
  const cellH = Math.floor(height / CAST_ATLAS_ROWS);
  const c = document.createElement("canvas");
  c.width = cellW;
  c.height = cellH;
  c.getContext("2d")!.drawImage(
    img,
    col * cellW,
    row * cellH,
    cellW,
    cellH,
    0,
    0,
    cellW,
    cellH,
  );
  return c;
}

export function loadCastAtlas(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${CAST_ATLAS_URL}`));
    img.src = CAST_ATLAS_URL;
  });
}
