import type { OutfitLook, View } from "./outfitLook";

const cache = new WeakMap<object, Map<string, HTMLCanvasElement>>();

function luma(r: number, g: number, b: number) {
  return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
}

function sat(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function isGreenFabric(r: number, g: number, b: number) {
  if (g < 40) return false;
  if (g <= r + 10) return false;
  if (g <= b + 2) return false;
  if ((r + g + b) / 3 > 210) return false;
  if (Math.max(r, g, b) - Math.min(r, g, b) < 16) return false;
  return true;
}

function isGold(r: number, g: number, b: number) {
  if (r < 150 || g < 105) return false;
  if (r < g) return false;
  if (r - g > 60) return false;
  if (b > g * 0.7 || b > 130) return false;
  return r + g > 240;
}

function isSkin(r: number, g: number, b: number) {
  if (r < 70 || g < 28) return false;
  if (r < g) return false;
  if (r < b + 10) return false;
  const L = (r + g + b) / 3;
  return L > 45 && L < 230;
}

function isWhiteCap(r: number, g: number, b: number, ny: number) {
  if (ny > 0.24) return false;
  const L = (r + g + b) / 3;
  return L > 155 && sat(r, g, b) < 0.22;
}

function isShorts(r: number, g: number, b: number, ny: number) {
  if (ny < 0.56 || ny > 0.88) return false;
  if (isGreenFabric(r, g, b) || isSkin(r, g, b) || isGold(r, g, b)) return false;
  const L = (r + g + b) / 3;
  const blue = b > r + 8 && g > r - 4 && b > 48;
  return L < 92 || blue;
}

function recolor(r: number, g: number, b: number, target: [number, number, number]): [number, number, number] {
  const srcL = luma(r, g, b);
  const tgtL = Math.max(0.04, luma(target[0], target[1], target[2]));
  const shade = srcL / tgtL;
  return [
    Math.max(0, Math.min(255, target[0] * shade)),
    Math.max(0, Math.min(255, target[1] * shade)),
    Math.max(0, Math.min(255, target[2] * shade)),
  ];
}

function liftShirt(r: number, g: number, b: number, target: [number, number, number]): [number, number, number] {
  const srcL = Math.max(0.08, luma(r, g, b));
  const wrinkle = Math.min(1, Math.pow(srcL / 0.4, 0.75));
  const k = 0.48 + wrinkle * 0.62;
  return [
    Math.min(255, target[0] * k + 28 * wrinkle),
    Math.min(255, target[1] * k + 28 * wrinkle),
    Math.min(255, target[2] * k + 28 * wrinkle),
  ];
}

function dyeShirt(r: number, g: number, b: number, target: [number, number, number], light: boolean): [number, number, number] {
  const srcL = Math.max(0.06, luma(r, g, b));
  const wrinkle = Math.max(-0.35, Math.min(0.45, (srcL - 0.28) * 1.6));
  if (light) {
    const k = 0.92 + wrinkle * 0.1;
    return [
      Math.max(180, Math.min(255, target[0] * k + 18)),
      Math.max(180, Math.min(255, target[1] * k + 18)),
      Math.max(180, Math.min(255, target[2] * k + 18)),
    ];
  }
  const k = 0.82 + wrinkle * 0.4;
  return [
    Math.max(0, Math.min(255, target[0] * k + wrinkle * 22)),
    Math.max(0, Math.min(255, target[1] * k + wrinkle * 18)),
    Math.max(0, Math.min(255, target[2] * k + wrinkle * 16)),
  ];
}

function isHoodieFabric(r: number, g: number, b: number) {
  const L = (r + g + b) / 3;
  if (g < 36 || L > 200) return false;
  if (g <= r + 12) return false;
  if (g <= b + 8) return false;
  return true;
}

function isCapOrShoes(ny: number, nx: number) {
  if (ny > 0.80) return true;
  if (ny < 0.22 && nx > 0.18 && nx < 0.82) return true;
  return false;
}

function isFace(ny: number, nx: number) {
  return ny < 0.38 && nx > 0.20 && nx < 0.80;
}

function opaqueBBox(data: Uint8ClampedArray, w: number, h: number) {
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! < 40) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0) return { x0: 0, y0: 0, x1: w - 1, y1: h - 1 };
  return { x0, y0, x1, y1 };
}

function paintGraphic(
  ctx: CanvasRenderingContext2D,
  look: OutfitLook,
  view: View,
  box: { x0: number; y0: number; x1: number; y1: number },
  icon?: HTMLImageElement | HTMLCanvasElement | null,
) {
  if (look.graphic === "none" || look.graphic === "starter") return;
  if (view === "left" || view === "right") return;
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  const cx = box.x0 + bw * 0.5;
  const cy = box.y0 + bh * (view === "back" ? 0.42 : 0.44);
  const stampW = bw * (look.hoodie ? 0.28 : 0.32);
  const stampH = bh * 0.16;

  ctx.save();
  ctx.translate(cx, cy);
  if (look.graphic === "jersey") {
    ctx.fillStyle = "rgba(248,250,252,0.94)";
    ctx.font = `900 ${Math.max(10, stampW * 0.28)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(view === "back" ? "38127" : "FRESH", 0, -stampH * 0.18);
    ctx.font = `800 ${Math.max(9, stampW * 0.22)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(view === "back" ? "FRESH" : "38127", 0, stampH * 0.32);
    ctx.restore();
    return;
  }

  if (look.graphic === "classic") {
    ctx.fillStyle = "#d4af37";
    ctx.font = `900 ${Math.max(11, stampW * 0.34)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$ACK", 0, 0);
    ctx.restore();
    return;
  }

  if ((look.graphic === "moneybag" || look.graphic === "midnight" || look.graphic === "chain") && icon) {
    const w = stampW * (look.graphic === "chain" ? 0.7 : 1);
    const h = stampH * (look.graphic === "chain" ? 0.9 : 1.15);
    ctx.globalAlpha = look.graphic === "midnight" ? 0.72 : 1;
    ctx.drawImage(icon, -w / 2, -h / 2, w, h);
    if (look.graphic === "chain") {
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = Math.max(2, bw * 0.012);
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.9, w * 0.55, h * 0.7, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (look.graphic === "worldwide" && icon) {
    const w = stampW * (view === "back" ? 1.25 : 1.15);
    const h = stampH * (view === "back" ? 1.35 : 0.9);
    ctx.drawImage(icon, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }
  ctx.restore();
}

function overlayRect(box: { x0: number; y0: number; x1: number; y1: number }, view: View) {
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  if (view === "left") {
    return { x: box.x0 + bw * 0.02, y: box.y0 + bh * 0.30, w: bw * 0.80, h: bh * 0.34 };
  }
  if (view === "right") {
    return { x: box.x0 + bw * 0.18, y: box.y0 + bh * 0.30, w: bw * 0.80, h: bh * 0.34 };
  }
  return { x: box.x0 + bw * 0.04, y: box.y0 + bh * 0.30, w: bw * 0.92, h: bh * 0.34 };
}

function paintGarment(
  ctx: CanvasRenderingContext2D,
  overlay: HTMLImageElement | HTMLCanvasElement,
  box: { x0: number; y0: number; x1: number; y1: number },
  view: View,
) {
  const r = overlayRect(box, view);
  ctx.drawImage(overlay, r.x, r.y, r.w, r.h);
}

function shirtBand(view: View) {
  if (view === "back") return { lo: 0.22, hi: 0.72 };
  return { lo: 0.20, hi: 0.74 };
}

function paintCleanStamp(
  ctx: CanvasRenderingContext2D,
  icon: HTMLImageElement | HTMLCanvasElement,
  box: { x0: number; y0: number; x1: number; y1: number },
  view: View,
) {
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  if (view === "left") {
    const tw = bw * 0.22;
    const th = bh * 0.11;
    ctx.drawImage(icon, box.x0 + bw * 0.52 - tw / 2, box.y0 + bh * 0.46 - th / 2, tw, th);
    return;
  }
  if (view === "right") {
    const tw = bw * 0.22;
    const th = bh * 0.11;
    ctx.drawImage(icon, box.x0 + bw * 0.48 - tw / 2, box.y0 + bh * 0.46 - th / 2, tw, th);
    return;
  }
  const cx = box.x0 + bw * 0.5;
  const cy = box.y0 + bh * (view === "back" ? 0.48 : 0.46);
  const tw = bw * (view === "back" ? 0.28 : 0.34);
  const th = bh * (view === "back" ? 0.14 : 0.14);
  ctx.drawImage(icon, cx - tw / 2, cy - th / 2, tw, th);
}

export function dressBenji(
  src: HTMLImageElement | HTMLCanvasElement,
  look: OutfitLook,
  view: View,
  icon?: HTMLImageElement | HTMLCanvasElement | null,
  overlay?: HTMLImageElement | HTMLCanvasElement | null,
): HTMLCanvasElement {
  const w = src instanceof HTMLImageElement ? src.naturalWidth || src.width : src.width;
  const h = src instanceof HTMLImageElement ? src.naturalHeight || src.height : src.height;
  const innerKey = `${look.id}:${view}:v6`;
  let bag = cache.get(src);
  if (!bag) {
    bag = new Map();
    cache.set(src, bag);
  }
  const hit = bag.get(innerKey);
  if (hit) return hit;

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const box = opaqueBBox(p, w, h);
  const bw = Math.max(1, box.x1 - box.x0);
  const bh = Math.max(1, box.y1 - box.y0);
  const band = shirtBand(view);

  for (let i = 0; i < p.length; i += 4) {
    const a = p[i + 3]!;
    if (a < 40) continue;
    const r = p[i]!;
    const g = p[i + 1]!;
    const b = p[i + 2]!;
    const idx = i / 4;
    const x = idx % w;
    const y = (idx / w) | 0;
    const nx = (x - box.x0) / bw;
    const ny = (y - box.y0) / bh;

    if (isGold(r, g, b)) {
      const chestLogo = look.graphic === "worldwide" && ny > 0.40 && ny < 0.58 && nx > 0.30 && nx < 0.70 && !isFace(ny, nx);
      if (chestLogo && look.shirt) {
        const muted = dyeShirt(r, g, b, look.shirt, !!look.lightShirt);
        p[i] = muted[0];
        p[i + 1] = muted[1];
        p[i + 2] = muted[2];
        continue;
      }
      if (look.graphic !== "starter" && look.graphic !== "none" && look.graphic !== "worldwide" && ny > band.lo && ny < band.hi && look.shirt) {
        const muted = recolor(r, g, b, look.shirt);
        p[i] = muted[0];
        p[i + 1] = muted[1];
        p[i + 2] = muted[2];
        continue;
      }
      if (look.chain) {
        const lit = recolor(r, g, b, [212, 175, 55]);
        p[i] = lit[0];
        p[i + 1] = lit[1];
        p[i + 2] = lit[2];
      } else if (look.shirt) {
        const muted = recolor(r, g, b, look.shirt);
        p[i] = muted[0];
        p[i + 1] = muted[1];
        p[i + 2] = muted[2];
      }
      continue;
    }

    if (look.cap && isWhiteCap(r, g, b, ny)) {
      const next = recolor(r, g, b, look.cap);
      p[i] = next[0];
      p[i + 1] = next[1];
      p[i + 2] = next[2];
      continue;
    }

    if (look.shorts && isShorts(r, g, b, ny)) {
      const next = recolor(r, g, b, look.shorts);
      p[i] = next[0];
      p[i + 1] = next[1];
      p[i + 2] = next[2];
      continue;
    }

    const fabric = look.graphic === "worldwide" ? isHoodieFabric(r, g, b) : isGreenFabric(r, g, b);
    const inShirt = look.graphic === "worldwide"
      ? !isCapOrShoes(ny, nx) && !isFace(ny, nx) && ny > 0.28 && ny < 0.70
      : ny > band.lo && ny < band.hi;
    if (look.shirt && fabric && !isSkin(r, g, b) && inShirt) {
      const next = look.graphic === "worldwide"
        ? dyeShirt(r, g, b, look.shirt, !!look.lightShirt)
        : look.lightShirt
          ? liftShirt(r, g, b, look.shirt)
          : recolor(r, g, b, look.shirt);
      p[i] = next[0];
      p[i + 1] = next[1];
      p[i + 2] = next[2];
    }
  }

  ctx.putImageData(img, 0, 0);
  if (look.graphic === "worldwide" && icon) {
    paintCleanStamp(ctx, icon, box, view);
  } else if (overlay && look.graphic !== "worldwide") {
    paintGarment(ctx, overlay, box, view);
  } else {
    paintGraphic(ctx, look, view, box, icon);
  }
  bag.set(innerKey, c);
  return c;
}

export function clearOutfitCache() {
  /* WeakMap entries drop with the source canvases. */
}
