/** Knock leftover #FF00FF chroma out of generated sprites. */

export function keyMagenta(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i]!;
    const gv = p[i + 1]!;
    const b = p[i + 2]!;
    const mag = (r + b) * 0.5 - gv;
    if (r > 165 && b > 155 && gv < 88 && mag > 55) {
      p[i + 3] = 0;
      continue;
    }
    if (mag > 38 && r > 110 && b > 110 && gv < 170) {
      const t = Math.min(1, (mag - 38) / 90);
      p[i + 3] = Math.round(p[i + 3]! * (1 - t));
      p[i] = Math.max(0, r - mag * 0.55);
      p[i + 2] = Math.max(0, b - mag * 0.55);
    }
    if (p[i + 3]! < 12) p[i + 3] = 0;
  }
  g.putImageData(data, 0, 0);
  return c;
}

export function keyedTexture(img: HTMLImageElement): HTMLCanvasElement {
  return keyMagenta(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
}
