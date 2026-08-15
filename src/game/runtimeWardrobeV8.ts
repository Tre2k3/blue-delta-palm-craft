// @ts-nocheck
import { APPAREL } from "./data";

/**
 * Wardrobe V8
 * Recolors the green clothing pixels in Benji's illustrated runtime sheets so
 * equipped tops/sets visibly change in every direction/animation. Basketball
 * automatically switches to the black/gold Sackrow #11 uniform treatment.
 */

const cache = new Map();
const pending = new Map();
const BASE_WALK = "/game/sprites/benji_walk_4dir.webp";
const BASE_RUN = "/game/sprites/benji_run_4dir.webp";

function hexColor(value, fallback = 0x166534) {
  const raw = String(value || "").replace("#", "");
  const n = Number.parseInt(raw, 16);
  return Number.isFinite(n) ? n : fallback;
}

function recolor(url, color) {
  const key = `${url}|${color}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (pending.has(key)) return pending.get(key);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
      try {
        const id = g.getImageData(0, 0, c.width, c.height); const d = id.data;
        const tr = (color >> 16) & 255, tg = (color >> 8) & 255, tb = color & 255;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 16) continue;
          const r = d[i], gg = d[i + 1], b = d[i + 2];
          const green = gg > 50 && gg > r * 1.13 && gg > b * 1.08;
          if (!green) continue;
          const lum = Math.max(.28, Math.min(1.12, (r + gg + b) / 360));
          d[i] = Math.min(255, tr * lum); d[i + 1] = Math.min(255, tg * lum); d[i + 2] = Math.min(255, tb * lum);
        }
        g.putImageData(id, 0, 0);
      } catch { /* same-origin assets should be canvas-safe; base art remains fallback */ }
      const out = c.toDataURL("image/webp", .92); cache.set(key, out); resolve(out);
    };
    img.onerror = () => resolve(url);
    img.src = url;
  }).finally(() => pending.delete(key));
  pending.set(key, p); return p;
}

function ensureJerseyBadge(el) {
  let badge = el.querySelector?.("[data-sack-jersey-v8]");
  if (badge) return badge;
  badge = document.createElement("div"); badge.dataset.sackJerseyV8 = "true";
  Object.assign(badge.style, {
    position: "absolute", left: "50%", top: "34%", transform: "translateX(-50%)",
    color: "#f7f2e7", WebkitTextStroke: "1px #9c7624", font: "900 13px/1 Arial Black,sans-serif",
    textShadow: "0 1px 4px #000", pointerEvents: "none", display: "none",
  });
  badge.textContent = "11"; el.appendChild(badge); return badge;
}

async function install(World3D) {
  const p = World3D?.prototype; if (!p || p.__wardrobeV8Installed) return; p.__wardrobeV8Installed = true;
  const oldSync = p.sync;
  p.sync = function wardrobeV8Sync(frame) {
    oldSync.call(this, frame);
    const engine = this.__v8Engine; const parent = this.renderer?.domElement?.parentElement;
    const el = parent?.querySelector?.('[data-sack-character-v8="benji"]'); if (!el || !engine) return;
    const badge = ensureJerseyBadge(el);
    const run = Math.hypot(Number(engine.vx) || 0, Number(engine.vy) || 0) > 155;
    const base = run ? BASE_RUN : BASE_WALK;
    let color = null;
    if (frame.mode === "basketball") color = 0x141414;
    else {
      const item = APPAREL.find((a) => a.id === engine.equipped);
      if (item && ["top", "set"].includes(item.category)) color = hexColor(item.color);
    }
    if (!color) { badge.style.display = "none"; return; }
    const key = `${base}|${color}`;
    const ready = cache.get(key);
    if (ready) el.style.backgroundImage = `url("${ready}")`;
    else recolor(base, color).then(() => {});
    badge.style.display = frame.mode === "basketball" ? "block" : "none";
    if (typeof window !== "undefined") window.__SACK_WARDROBE_V8__ = { installed: true, equipped: engine.equipped, basketball: frame.mode === "basketball", recolored: !!ready };
  };
}

setTimeout(async () => {
  try { const { World3D } = await import("./world3d"); install(World3D); }
  catch (err) { console.error("Wardrobe V8 failed", err); }
}, 1350);
