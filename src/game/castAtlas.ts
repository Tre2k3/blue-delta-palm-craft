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

/** Inset + dilate so linear filtering cannot sample the neighbouring cell. */
export function cropCastFrame(
  img: HTMLImageElement,
  col: number,
  row: number,
): HTMLCanvasElement {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const srcW = width / CAST_ATLAS_COLS;
  const srcH = height / CAST_ATLAS_ROWS;
  const sx = col * srcW + 1;
  const sy = row * srcH + 1;
  const sw = Math.max(1, srcW - 2);
  const sh = Math.max(1, srcH - 2);
  const dw = Math.max(2, Math.floor(sw));
  const dh = Math.max(2, Math.floor(sh));
  const pad = 2;
  const c = document.createElement("canvas");
  c.width = dw + pad * 2;
  c.height = dh + pad * 2;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, pad, pad, dw, dh);
  dilateEdge(ctx, c.width, c.height, pad);
  return c;
}

function dilateEdge(ctx: CanvasRenderingContext2D, w: number, h: number, pad: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]! > 8) continue;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let dy = -pad; dy <= pad; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -pad; dx <= pad; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = (yy * w + xx) * 4;
          if (src[j + 3]! < 160) continue;
          sr += src[j]!;
          sg += src[j + 1]!;
          sb += src[j + 2]!;
          n++;
        }
      }
      if (!n) continue;
      out[i] = (sr / n) | 0;
      out[i + 1] = (sg / n) | 0;
      out[i + 2] = (sb / n) | 0;
      out[i + 3] = 0;
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
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
