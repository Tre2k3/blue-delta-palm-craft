/** Punch studio background. Seal and fill the body so clothes stay opaque. */

export function keyMagenta(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  return punchStudioPlate(img, w, h);
}

export function keyedTexture(img: HTMLImageElement): HTMLCanvasElement {
  return keyMagenta(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
}

function chroma(r: number, g: number, b: number) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function luma(r: number, g: number, b: number) {
  return (r + g + b) / 3;
}

/** Classic chroma magenta plus the raspberry plates on walk-back (~#c81070). */
function isStudioBackdrop(r: number, g: number, b: number, a: number) {
  if (a < 20) return true;
  if (r > 140 && b > 100 && g < 120 && r > g + 40 && b > g && (r + b) * 0.5 - g > 30) return true;
  if (r > 160 && g < 80 && b > 80 && r > b + 40 && b > g + 50) return true;
  return false;
}

function isCheckerCell(r: number, g: number, b: number) {
  return chroma(r, g, b) < 14 && luma(r, g, b) > 75 && luma(r, g, b) < 220;
}

function isCharacter(r: number, g: number, b: number, a: number, y: number, h: number) {
  if (a < 40) return false;
  if (isStudioBackdrop(r, g, b, a)) return false;
  const L = luma(r, g, b);
  // Cap / visor sit at the top of the plate. Gray-white there is fabric, not checker.
  if (y < h * 0.36 && L > 88) return true;
  if (isCheckerCell(r, g, b)) return false;
  return true;
}

function morph(src: Uint8Array, w: number, h: number, dilate: boolean, times: number) {
  const n = w * h;
  let cur = src;
  for (let t = 0; t < times; t++) {
    const next = new Uint8Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let any = false;
        let all = true;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const on = yy >= 0 && yy < h && xx >= 0 && xx < w && cur[yy * w + xx] === 1;
            if (on) any = true;
            else all = false;
          }
        }
        next[y * w + x] = (dilate ? any : all) ? 1 : 0;
      }
    }
    cur = next;
  }
  return cur;
}

function floodStudio(p: Uint8ClampedArray, w: number, h: number) {
  const n = w * h;
  const back = new Uint8Array(n);
  const stack: number[] = [];
  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (back[i]) return;
    const o = i * 4;
    if (!isStudioBackdrop(p[o]!, p[o + 1]!, p[o + 2]!, p[o + 3]!)) return;
    back[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i / w) | 0;
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }
  return back;
}

/** Fill holes in the cap / visor by spanning between the silhouette edges. */
function sealHeadSpan(closed: Uint8Array, w: number, h: number) {
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < closed.length; i++) {
    if (!closed[i]) continue;
    const x = i % w;
    const y = (i / w) | 0;
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  if (x1 < x0) return;
  const headBottom = Math.min(h - 1, y0 + Math.floor((y1 - y0 + 1) * 0.34));
  for (let y = y0; y <= headBottom; y++) {
    let left = -1;
    let right = -1;
    const row = y * w;
    for (let x = x0; x <= x1; x++) {
      if (!closed[row + x]) continue;
      if (left < 0) left = x;
      right = x;
    }
    if (left < 0 || right - left < 6) continue;
    for (let x = left; x <= right; x++) closed[row + x] = 1;
  }
  for (let x = x0; x <= x1; x++) {
    let top = -1;
    let bot = -1;
    for (let y = y0; y <= headBottom; y++) {
      if (!closed[y * w + x]) continue;
      if (top < 0) top = y;
      bot = y;
    }
    if (top < 0 || bot - top < 4) continue;
    for (let y = top; y <= bot; y++) closed[y * w + x] = 1;
  }
}

export function punchStudioPlate(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const p = data.data;
  const n = w * h;
  const edge = floodStudio(p, w, h);

  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (edge[i]) {
      mask[i] = 0;
      continue;
    }
    mask[i] = isCharacter(p[o]!, p[o + 1]!, p[o + 2]!, p[o + 3]!, (i / w) | 0, h) ? 1 : 0;
  }
  const closed = morph(morph(mask, w, h, true, 8), w, h, false, 6);
  sealHeadSpan(closed, w, h);

  let holes = 1;
  let guard = 0;
  while (holes && guard++ < 24) {
    holes = 0;
    for (let i = 0; i < n; i++) {
      if (!closed[i] || (p[i * 4 + 3] === 255 && mask[i])) continue;
      if (mask[i]) {
        p[i * 4 + 3] = 255;
        continue;
      }
      const x = i % w;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let c = 0;
      const sample = (j: number) => {
        if (!closed[j]) return;
        const o = j * 4;
        if (p[o + 3]! === 255 && mask[j]) {
          sr += p[o]!;
          sg += p[o + 1]!;
          sb += p[o + 2]!;
          c++;
        }
      };
      if (x + 1 < w) sample(i + 1);
      if (x > 0) sample(i - 1);
      if (i + w < n) sample(i + w);
      if (i >= w) sample(i - w);
      if (!c) {
        holes++;
        continue;
      }
      const o = i * 4;
      p[o] = (sr / c) | 0;
      p[o + 1] = (sg / c) | 0;
      p[o + 2] = (sb / c) | 0;
      p[o + 3] = 255;
      mask[i] = 1;
    }
  }

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (closed[i] && !edge[i] && !isStudioBackdrop(p[o]!, p[o + 1]!, p[o + 2]!, p[o + 3]!)) {
      p[o + 3] = 255;
    } else if (closed[i] && !edge[i]) {
      p[o + 3] = 255;
    } else {
      p[o] = 0;
      p[o + 1] = 0;
      p[o + 2] = 0;
      p[o + 3] = 0;
    }
  }

  ctx.putImageData(data, 0, 0);
  return c;
}

export function normalizeCharacterPlate(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const p = ctx.getImageData(0, 0, w, h).data;
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (p[(y * w + x) * 4 + 3]! < 40) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0) return src;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const targetH = h * 0.97;
  const targetW = w * 0.96;
  let scale = targetH / Math.max(1, bh);
  if (bw * scale > targetW) scale = targetW / Math.max(1, bw);
  if (Math.abs(scale - 1) < 0.03) return src;
  const dw = bw * scale;
  const dh = bh * scale;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const o = out.getContext("2d")!;
  o.imageSmoothingEnabled = true;
  o.imageSmoothingQuality = "high";
  o.drawImage(src, x0, y0, bw, bh, (w - dw) / 2, h - dh - h * 0.012, dw, dh);
  return out;
}

export function cleanSprite(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width;
  const h = img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height;
  return normalizeCharacterPlate(punchStudioPlate(img, w, h));
}
