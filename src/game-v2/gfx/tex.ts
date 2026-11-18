import * as THREE from "three";
import { rng } from "../core/util";

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

export function canvas(w: number, h: number, draw: Draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  return c;
}

export function tex(w: number, h: number, draw: Draw, opts: { repeat?: boolean; srgb?: boolean; aniso?: number } = {}) {
  const t = new THREE.CanvasTexture(canvas(w, h, draw));
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat !== false) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = opts.aniso ?? 4;
  return t;
}

function speckle(g: CanvasRenderingContext2D, w: number, h: number, seed: number, count: number, lo: number, hi: number, alpha: number, size = 2) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const v = Math.round(lo + (hi - lo) * r());
    g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    g.fillRect(r() * w, r() * h, 1 + r() * size, 1 + r() * size);
  }
}

/** Asphalt, 8 m tile. Kept dark so wet reflections and neon read on it. */
export function asphaltTex() {
  return tex(512, 512, (g, w, h) => {
    g.fillStyle = "#26272a";
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 11, 9000, 20, 70, 0.5);
    speckle(g, w, h, 12, 500, 90, 130, 0.35, 1);
    const r = rng(5);
    g.strokeStyle = "rgba(10,10,12,0.5)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      let x = r() * w;
      let y = r() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (r() - 0.5) * 90;
        y += (r() - 0.5) * 90;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const grd = g.createRadialGradient(r() * w, r() * h, 4, r() * w, r() * h, 120);
      grd.addColorStop(0, "rgba(12,12,14,0.35)");
      grd.addColorStop(1, "rgba(12,12,14,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
  });
}

/** Patchy roughness so the street reads as rain-wet in puddles, damp elsewhere. */
export function wetRoughTex(seed = 3) {
  return tex(
    256,
    256,
    (g, w, h) => {
      // An even wet sheen with soft variation. Hard-edged puddles read as spots at a low sun.
      g.fillStyle = "rgb(0,200,0)";
      g.fillRect(0, 0, w, h);
      const r = rng(seed);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(0,${150 + Math.floor(r() * 90)},0,0.5)`;
        g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
      }
      for (let i = 0; i < 22; i++) {
        const x = r() * w;
        const y = r() * h;
        const rad = 26 + r() * 60;
        const grd = g.createRadialGradient(x, y, 2, x, y, rad);
        grd.addColorStop(0, "rgba(0,110,0,0.5)");
        grd.addColorStop(0.5, "rgba(0,130,0,0.3)");
        grd.addColorStop(1, "rgba(0,200,0,0)");
        g.fillStyle = grd;
        for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
          g.beginPath();
          g.ellipse(x + ox, y + oy, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    },
    { srgb: false },
  );
}

/** Sidewalk slab, 3.5 m tile with scored joints. */
export function sidewalkTex() {
  return tex(256, 256, (g, w, h) => {
    g.fillStyle = "#8f8a82";
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 21, 5000, 100, 170, 0.28);
    g.strokeStyle = "rgba(40,38,36,0.7)";
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.strokeStyle = "rgba(40,38,36,0.35)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.lineTo(w / 2, h);
    g.stroke();
  });
}

/** Dark stone pavers for the riverfront plaza in the concept art. */
export function plazaTex() {
  return tex(512, 512, (g, w, h) => {
    g.fillStyle = "#1c1d20";
    g.fillRect(0, 0, w, h);
    const r = rng(77);
    const n = 4;
    const s = w / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 24 + Math.floor(r() * 18);
        g.fillStyle = `rgb(${v},${v + 1},${v + 4})`;
        g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
      }
    }
    speckle(g, w, h, 31, 9000, 14, 70, 0.35);
    g.strokeStyle = "rgba(4,4,6,0.9)";
    g.lineWidth = 4;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * s, 0);
      g.lineTo(i * s, h);
      g.moveTo(0, i * s);
      g.lineTo(w, i * s);
      g.stroke();
    }
  });
}

export function grassTex() {
  return tex(256, 256, (g, w, h) => {
    g.fillStyle = "#2f5a2a";
    g.fillRect(0, 0, w, h);
    const r = rng(41);
    for (let i = 0; i < 5200; i++) {
      const v = r();
      g.fillStyle = v > 0.6 ? "rgba(74,128,58,0.55)" : v > 0.25 ? "rgba(30,74,34,0.55)" : "rgba(96,140,62,0.4)";
      g.fillRect(r() * w, r() * h, 1.5, 2 + r() * 3);
    }
  });
}

export function brickTex(base: string, mortar: string, seed = 1) {
  return tex(256, 256, (g, w, h) => {
    g.fillStyle = mortar;
    g.fillRect(0, 0, w, h);
    const r = rng(seed);
    const bh = 16;
    const bw = 32;
    const c = new THREE.Color(base);
    for (let y = 0; y < h / bh; y++) {
      for (let x = -1; x < w / bw + 1; x++) {
        const k = 0.78 + r() * 0.4;
        g.fillStyle = `rgb(${Math.round(c.r * 255 * k)},${Math.round(c.g * 255 * k)},${Math.round(c.b * 255 * k)})`;
        g.fillRect(x * bw + (y % 2 ? bw / 2 : 0) + 1, y * bh + 1, bw - 2, bh - 2);
      }
    }
    speckle(g, w, h, seed + 9, 2500, 0, 60, 0.18);
  });
}

export type FacadeStyle = {
  /** Wall colour between windows. */
  wall: string;
  /** Second wall tone for piers and spandrels. */
  trim: string;
  /** Glass colour by day. */
  glass: string;
  /** Lit window colours at night. */
  lit: string[];
  /** Bays across and floors up in one tile. */
  bays: number;
  floors: number;
  /** Window size as a fraction of its cell. */
  winW: number;
  winH: number;
  /** Share of windows lit after dark. */
  litShare: number;
  brick?: boolean;
  arched?: boolean;
  /** Curtain-wall towers: glass fills the cell, thin mullions. */
  curtain?: boolean;
};

/**
 * One facade tile and its night light map. The tile repeats across a wall, so a handful of
 * windows are lit in a pattern that does not read as a grid.
 */
export function facadeTex(style: FacadeStyle, seed: number) {
  const W = 512;
  const H = 512;
  const r = rng(seed);
  const lit: boolean[] = [];
  const tint: string[] = [];
  for (let i = 0; i < style.bays * style.floors; i++) {
    lit.push(r() < style.litShare);
    tint.push(style.lit[Math.floor(r() * style.lit.length)] ?? "#ffd9a0");
  }
  const cw = W / style.bays;
  const ch = H / style.floors;
  const cell = (fn: (x: number, y: number, w: number, h: number, i: number) => void) => {
    for (let f = 0; f < style.floors; f++) {
      for (let b = 0; b < style.bays; b++) {
        const ww = cw * style.winW;
        const wh = ch * style.winH;
        fn(b * cw + (cw - ww) / 2, f * ch + (ch - wh) * 0.42, ww, wh, f * style.bays + b);
      }
    }
  };
  const map = tex(W, H, (g) => {
    if (style.brick) {
      g.drawImage(brickTex(style.wall, "#2a1f1c", seed).image as HTMLCanvasElement, 0, 0, W, H);
    } else {
      g.fillStyle = style.wall;
      g.fillRect(0, 0, W, H);
      speckle(g, W, H, seed, 2600, 0, 255, 0.035, 3);
    }
    g.fillStyle = style.trim;
    for (let f = 0; f <= style.floors; f++) g.fillRect(0, f * ch - 3, W, style.curtain ? 4 : 7);
    if (!style.curtain) for (let b = 0; b <= style.bays; b++) g.fillRect(b * cw - 4, 0, 8, H);
    cell((x, y, w, h, i) => {
      const grd = g.createLinearGradient(x, y, x, y + h);
      const base = new THREE.Color(style.glass);
      const top = base.clone().multiplyScalar(1.25);
      grd.addColorStop(0, `#${top.getHexString()}`);
      grd.addColorStop(1, `#${base.getHexString()}`);
      g.fillStyle = grd;
      if (style.arched) {
        g.beginPath();
        g.moveTo(x, y + h);
        g.lineTo(x, y + w / 2);
        g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
        g.lineTo(x + w, y + h);
        g.closePath();
        g.fill();
      } else g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(255,255,255,0.10)";
      g.fillRect(x, y, w * 0.38, h);
      g.strokeStyle = style.curtain ? "rgba(10,14,20,0.8)" : "rgba(20,16,14,0.85)";
      g.lineWidth = style.curtain ? 2 : 3;
      if (!style.arched) g.strokeRect(x, y, w, h);
      g.beginPath();
      g.moveTo(x + w / 2, y);
      g.lineTo(x + w / 2, y + h);
      if (!style.curtain) {
        g.moveTo(x, y + h / 2);
        g.lineTo(x + w, y + h / 2);
      }
      g.stroke();
      if (!style.curtain && !style.arched) {
        g.fillStyle = style.trim;
        g.fillRect(x - 4, y + h, w + 8, 5);
      }
      void i;
    });
  });
  const glow = tex(W, H, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    cell((x, y, w, h, i) => {
      if (!lit[i]) {
        g.fillStyle = "rgba(40,56,84,0.22)";
        g.fillRect(x, y, w, h);
        return;
      }
      const grd = g.createLinearGradient(x, y, x, y + h);
      grd.addColorStop(0, tint[i]!);
      grd.addColorStop(1, "#7a4a1c");
      g.fillStyle = grd;
      g.fillRect(x + 2, y + 2, w - 4, h - 4);
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.fillRect(x + w / 2 - 1.5, y, 3, h);
      if (r() > 0.5) {
        g.fillStyle = "rgba(0,0,0,0.42)";
        g.fillRect(x + 2, y + 2, w - 4, h * (0.2 + r() * 0.35));
      }
    });
  });
  return { map, glow };
}

function fitText(g: CanvasRenderingContext2D, text: string, maxW: number, size: number, font: string) {
  let s = size;
  g.font = font.replace("%", String(s));
  while (g.measureText(text).width > maxW && s > 8) {
    s -= 2;
    g.font = font.replace("%", String(s));
  }
}

/** Neon sign: glowing tube lettering on a dark board. White-hot core, coloured halo. */
export function neonTex(text: string, color: string, opts: { sub?: string; w?: number; h?: number; font?: string; board?: string; border?: boolean } = {}) {
  const W = opts.w ?? 512;
  const H = opts.h ?? 160;
  return tex(
    W,
    H,
    (g) => {
      g.fillStyle = opts.board ?? "#0b0b0d";
      g.fillRect(0, 0, W, H);
      if (opts.border !== false) {
        g.strokeStyle = color;
        g.shadowColor = color;
        g.shadowBlur = 14;
        g.lineWidth = 4;
        g.strokeRect(9, 9, W - 18, H - 18);
      }
      const font = opts.font ?? '900 %px "Bebas Neue", "Arial Narrow", Impact, sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      const y = opts.sub ? H * 0.42 : H * 0.54;
      fitText(g, text, W - 50, opts.sub ? H * 0.52 : H * 0.7, font);
      g.shadowColor = color;
      for (const blur of [26, 14, 6]) {
        g.shadowBlur = blur;
        g.fillStyle = color;
        g.fillText(text, W / 2, y);
      }
      g.shadowBlur = 0;
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.fillText(text, W / 2, y);
      if (opts.sub) {
        fitText(g, opts.sub, W - 60, H * 0.2, '700 %px "DM Sans", Arial, sans-serif');
        g.shadowColor = "#ffffff";
        g.shadowBlur = 8;
        g.fillStyle = "#fff6e4";
        g.fillText(opts.sub, W / 2, H * 0.8);
      }
    },
    { repeat: false },
  );
}

/** Painted sign board (street signs, awning boards, shop fascia). */
export function signTex(text: string, fg: string, bg: string, opts: { sub?: string; w?: number; h?: number } = {}) {
  const W = opts.w ?? 512;
  const H = opts.h ?? 128;
  return tex(
    W,
    H,
    (g) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = fg;
      fitText(g, text, W - 36, opts.sub ? H * 0.5 : H * 0.66, '900 %px "Bebas Neue", "Arial Narrow", Impact, sans-serif');
      g.fillText(text, W / 2, opts.sub ? H * 0.4 : H * 0.54);
      if (opts.sub) {
        fitText(g, opts.sub, W - 40, H * 0.22, '700 %px "DM Sans", Arial, sans-serif');
        g.fillText(opts.sub, W / 2, H * 0.8);
      }
    },
    { repeat: false },
  );
}

/** Shop window: warm interior, shelves and silhouettes, mullions. One 8 m bay. */
export function storefrontTex(seed: number, accent: string, dark = false) {
  const W = 512;
  const H = 256;
  const draw = (emissive: boolean) =>
    tex(
      W,
      H,
      (g) => {
        const r = rng(seed);
        g.fillStyle = emissive ? "#000" : dark ? "#141210" : "#2a2420";
        g.fillRect(0, 0, W, H);
        const door = 0.5 + (r() - 0.5) * 0.3;
        const panes: [number, number][] = [
          [0.04, door - 0.1],
          [door + 0.1, 0.96],
        ];
        for (const [a, b] of panes) {
          const x = a * W;
          const w = (b - a) * W;
          const grd = g.createLinearGradient(0, 30, 0, H - 30);
          grd.addColorStop(0, emissive ? "#ffd9a0" : "#5a4a34");
          grd.addColorStop(0.6, emissive ? "#e09a4c" : "#3c3022");
          grd.addColorStop(1, emissive ? "#7a4a22" : "#2a2218");
          g.fillStyle = grd;
          g.fillRect(x, 40, w, H - 70);
          for (let i = 0; i < 5; i++) {
            const sx = x + 10 + r() * (w - 40);
            const sh = 40 + r() * 80;
            g.fillStyle = emissive ? `rgba(60,30,10,${0.5 + r() * 0.3})` : "rgba(10,8,6,0.55)";
            g.fillRect(sx, H - 30 - sh, 14 + r() * 22, sh);
          }
          g.fillStyle = emissive ? "rgba(0,0,0,0.55)" : "#0e0c0a";
          for (let x2 = x; x2 <= x + w + 1; x2 += w / 3) g.fillRect(x2 - 2, 40, 4, H - 70);
          g.fillRect(x, 40, w, 4);
          g.fillRect(x, H - 34, w, 4);
        }
        const dx = (door - 0.08) * W;
        g.fillStyle = emissive ? "#3a2412" : "#17130f";
        g.fillRect(dx, 46, 0.16 * W, H - 46);
        g.fillStyle = emissive ? "#c8843c" : "#3a2f24";
        g.fillRect(dx + 8, 58, 0.16 * W - 16, H - 110);
        if (!emissive) {
          g.fillStyle = accent;
          g.fillRect(0, 0, W, 34);
          g.fillStyle = "rgba(0,0,0,0.35)";
          g.fillRect(0, 30, W, 6);
        }
      },
      { repeat: true },
    );
  return { map: draw(false), glow: draw(true) };
}

/** Soft round blob for contact shadows, light pools and reflection streaks. */
export function blobTex(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  return tex(
    128,
    128,
    (g, w, h) => {
      const grd = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      grd.addColorStop(0, inner);
      grd.addColorStop(1, outer);
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    },
    { repeat: false },
  );
}

/** Road paint atlas is avoided on purpose: each marking is its own tiny flat-colour quad. */
export function paintMat(color: number, opacity = 0.9) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

export function basketballTex() {
  return tex(
    256,
    128,
    (g) => {
      g.fillStyle = "#c8551f";
      g.fillRect(0, 0, 256, 128);
      const r = rng(8);
      for (let i = 0; i < 1800; i++) {
        g.fillStyle = `rgba(${90 + r() * 60},${30 + r() * 20},10,0.35)`;
        g.fillRect(r() * 256, r() * 128, 1.5, 1.5);
      }
      g.strokeStyle = "#17110e";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(0, 64);
      g.lineTo(256, 64);
      g.moveTo(64, 0);
      g.lineTo(64, 128);
      g.moveTo(192, 0);
      g.lineTo(192, 128);
      g.moveTo(0, 0);
      g.bezierCurveTo(50, 44, 78, 44, 128, 0);
      g.moveTo(128, 128);
      g.bezierCurveTo(178, 84, 206, 84, 256, 128);
      g.stroke();
    },
    { repeat: true },
  );
}

/**
 * A crop of an image as a texture. Draws nothing until the image arrives, then fills in.
 * Fractions are of the source image. `gain` brightens neon so it carries bloom.
 */
export function cropTex(url: string, fx0: number, fy0: number, fx1: number, fy1: number, w = 512, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const img = new Image();
  img.onload = () => {
    g.drawImage(img, fx0 * img.naturalWidth, fy0 * img.naturalHeight, (fx1 - fx0) * img.naturalWidth, (fy1 - fy0) * img.naturalHeight, 0, 0, w, h);
    t.needsUpdate = true;
  };
  img.src = url;
  return t;
}

const FONT: Record<string, string[]> = {
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
};

/** Cells of a block letter, origin bottom-left, for building solid sign lettering out of boxes. */
export function glyphCells(ch: string): [number, number][] {
  const rows = FONT[ch];
  if (!rows) return [];
  const out: [number, number][] = [];
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === "1") out.push([c, rows.length - 1 - r]);
  });
  return out;
}
