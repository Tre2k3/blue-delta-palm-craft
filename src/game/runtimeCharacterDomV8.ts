// @ts-nocheck
import * as THREE from "three";

/**
 * Character DOM Renderer V8
 *
 * The supplied 2.5D sheets are visual art, not physical collision objects.
 * Rendering them as projected HTML sprite sheets avoids browser/WebGL texture
 * upload edge cases while still anchoring every actor to a true 3D world point.
 * Buildings, cars, physics, camera and collisions remain Three.js.
 */

const S = 1 / 16;
const GYM = { cx: -4300, cy: -3200 };
const HQ = { cx: -3700, cy: -3200 };
const URLS = {
  walk: "/game/sprites/benji_walk_4dir.webp",
  run: "/game/sprites/benji_run_4dir.webp",
  k: "/game/sprites/k_blanco_walk_4dir.webp",
  npc: "/game/sprites/memphis_npc_walk_4dir.webp",
  court: "/game/sprites/court_og_walk_4dir.webp",
};
const ROW = { down: 0, up: 1, right: 2, left: 3 };
const KROW = { down: 0, up: 1, left: 2, right: 3 };
const states = new WeakMap();

function wx(v) { return (Number(v) || 0) * S; }
function wz(v) { return (Number(v) || 0) * S; }

function makeEl(parent, kind) {
  const el = document.createElement("div");
  el.dataset.sackCharacterV8 = kind;
  Object.assign(el.style, {
    position: "absolute",
    left: "0px",
    top: "0px",
    width: "100px",
    height: "160px",
    pointerEvents: "none",
    transform: "translateX(-50%)",
    transformOrigin: "50% 100%",
    backgroundRepeat: "no-repeat",
    imageRendering: "auto",
    zIndex: "8",
    filter: "drop-shadow(0 8px 5px rgba(0,0,0,.34))",
    willChange: "left,top,width,height,background-position",
    display: "none",
  });
  parent.appendChild(el);
  return el;
}

function ensureState(world) {
  let s = states.get(world);
  if (s) return s;
  const parent = world.renderer?.domElement?.parentElement;
  if (!parent) return null;
  if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
  s = {
    parent,
    player: makeEl(parent, "benji"),
    peds: [],
    named: new Map(),
    gym: [],
    hqK: makeEl(parent, "k-blanco-hq"),
    prevPeds: [],
    prevNamed: new Map(),
  };
  states.set(world, s);
  return s;
}

function facing(vx, vy, fallback = "down") {
  const ax = Math.abs(Number(vx) || 0), ay = Math.abs(Number(vy) || 0);
  if (ax <= .01 && ay <= .01) return fallback;
  return ax > ay ? (vx < 0 ? "left" : "right") : (vy < 0 ? "up" : "down");
}

function setSheet(el, url, cols, rows, row, frame) {
  frame = ((frame % cols) + cols) % cols;
  row = Math.max(0, Math.min(rows - 1, row));
  el.style.backgroundImage = `url("${url}")`;
  el.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
  el.style.backgroundPositionX = cols <= 1 ? "0%" : `${(frame / (cols - 1)) * 100}%`;
  el.style.backgroundPositionY = rows <= 1 ? "0%" : `${(row / (rows - 1)) * 100}%`;
}

function project(world, x, z, worldHeight, el, aspect = .63) {
  const canvas = world.renderer.domElement;
  const width = canvas.clientWidth || canvas.width || 1;
  const height = canvas.clientHeight || canvas.height || 1;
  const foot = new THREE.Vector3(x, .03, z).project(world.camera);
  const head = new THREE.Vector3(x, worldHeight, z).project(world.camera);
  if (
    !Number.isFinite(foot.x) || !Number.isFinite(head.y) ||
    foot.z < -1 || foot.z > 1 ||
    foot.x < -1.3 || foot.x > 1.3 || foot.y < -1.35 || foot.y > 1.35
  ) {
    el.style.display = "none";
    return false;
  }
  const fx = (foot.x * .5 + .5) * width;
  const fy = (-foot.y * .5 + .5) * height;
  const hy = (-head.y * .5 + .5) * height;
  const h = Math.max(34, Math.min(height * .58, Math.abs(fy - hy)));
  const w = h * aspect;
  el.style.display = "block";
  el.style.left = `${fx.toFixed(1)}px`;
  el.style.top = `${(fy - h).toFixed(1)}px`;
  el.style.width = `${w.toFixed(1)}px`;
  el.style.height = `${h.toFixed(1)}px`;
  // Nearer actors paint over farther actors, while HUD retains a higher layer.
  el.style.zIndex = String(8 + Math.max(0, Math.min(90, Math.round((1 - foot.z) * 20))));
  return true;
}

function hideWebglCharacterSprites(world) {
  world.scene.traverse((obj) => {
    if (obj instanceof THREE.Sprite && (obj.userData?.v8Character || obj.userData?.v8HQK)) obj.visible = false;
  });
  // Legacy character cards/sprites are superseded as well.
  if (world.sprite) world.sprite.visible = false;
  if (world.npcSprites?.values) for (const sp of world.npcSprites.values()) sp.visible = false;
}

function syncPlayer(world, frame, engine, s) {
  const el = s.player;
  const visible = frame.cameraView === "third" && !["shop", "dialogue"].includes(frame.mode);
  if (!visible) { el.style.display = "none"; return; }
  const now = Number(frame.clock) || 0;
  const speed = Math.hypot(Number(engine?.vx) || 0, Number(engine?.vy) || 0);
  const run = frame.moving && speed > 155;
  const url = run ? URLS.run : URLS.walk;
  const col = frame.moving ? Math.floor(now * (run ? 11 : 8)) % 5 : 0;
  setSheet(el, url, 5, 4, ROW[frame.facing] ?? 0, col);
  project(world, wx(frame.px), wz(frame.py), 1.95, el, .62);
}

function syncPeds(world, frame, s) {
  while (s.peds.length < (frame.peds?.length || 0)) s.peds.push({ el: makeEl(s.parent, "memphis-ped"), facing: "down" });
  const now = Number(frame.clock) || 0;
  for (let i = 0; i < s.peds.length; i++) {
    const a = s.peds[i], p = frame.peds?.[i];
    if (!p || frame.mode !== "world") { a.el.style.display = "none"; continue; }
    a.facing = facing(p.vx, p.vy, a.facing);
    const col = Math.floor((now + (Number(p.t) || i) * .08) * 7.2) % 6;
    setSheet(a.el, URLS.npc, 6, 4, ROW[a.facing] ?? 0, col);
    project(world, wx(p.x), wz(p.y), 1.82, a.el, .62);
  }
}

function namedSpec(id) {
  if (id === "k_blanco") return { url: URLS.k, row: KROW, aspect: .62, height: 1.95 };
  if (id === "court_coach") return { url: URLS.court, row: ROW, aspect: .63, height: 1.94 };
  return { url: URLS.npc, row: ROW, aspect: .62, height: 1.82 };
}

function syncNamed(world, frame, s) {
  const seen = new Set();
  const now = Number(frame.clock) || 0;
  for (let i = 0; i < (frame.npcs?.length || 0); i++) {
    const n = frame.npcs[i]; seen.add(n.id);
    let a = s.named.get(n.id);
    if (!a) {
      a = { el: makeEl(s.parent, n.id), facing: "down", x: null, y: null };
      s.named.set(n.id, a);
    }
    if (frame.mode !== "world") { a.el.style.display = "none"; continue; }
    const dx = a.x == null ? 0 : n.x - a.x, dy = a.y == null ? 0 : n.y - a.y;
    a.facing = facing(dx, dy, a.facing);
    a.x = n.x; a.y = n.y;
    const spec = namedSpec(n.id);
    const moving = Math.hypot(dx, dy) > .03;
    setSheet(a.el, spec.url, 6, 4, spec.row[a.facing] ?? 0, moving ? Math.floor(now * 7) % 6 : 0);
    project(world, wx(n.x), wz(n.y), spec.height, a.el, spec.aspect);
  }
  for (const [id, a] of s.named) if (!seen.has(id)) a.el.style.display = "none";
}

function syncHQ(world, frame, engine, s) {
  const inHQ =
    engine?.__v8Interior === "hq" || engine?.__v8DialogueReturn === "hq" || engine?.__v8ShopReturn === "hq";
  if (!inHQ || frame.mode === "shop") { s.hqK.style.display = "none"; return; }
  setSheet(s.hqK, URLS.k, 6, 4, KROW.down, 0);
  project(world, wx(HQ.cx + 42), wz(HQ.cy - 32), 1.95, s.hqK, .62);
}

function syncGym(world, frame, s) {
  while (s.gym.length < 6) s.gym.push(makeEl(s.parent, `gym-${s.gym.length}`));
  if (frame.mode !== "basketball") { s.gym.forEach((el) => { el.style.display = "none"; }); return; }
  const now = Number(frame.clock) || 0;
  const spots = [[-55,-26],[52,-34],[-35,38],[42,30],[-82,48],[78,52]];
  for (let i = 0; i < s.gym.length; i++) {
    const el = s.gym[i]; const [ox,oy] = spots[i];
    const isK = i === 0; const url = isK ? URLS.k : URLS.npc;
    const rowMap = isK ? KROW : ROW;
    const px = GYM.cx + ox + Math.sin(now * (.55 + i*.03)) * 9;
    const py = GYM.cy + oy + Math.cos(now * (.50 + i*.04)) * 6;
    setSheet(el, url, 6, 4, rowMap.down, Math.floor(now * 5.5 + i) % 6);
    project(world, wx(px), wz(py), isK ? 1.95 : 1.82, el, .62);
  }
}

function install(World3D) {
  const p = World3D?.prototype;
  if (!p || p.__characterDomV8Installed) return;
  p.__characterDomV8Installed = true;
  const oldSync = p.sync;
  p.sync = function characterDomV8Sync(frame) {
    oldSync.call(this, frame);
    const s = ensureState(this);
    if (!s) return;
    const engine = this.__v8Engine;
    hideWebglCharacterSprites(this);
    syncPlayer(this, frame, engine, s);
    syncPeds(this, frame, s);
    syncNamed(this, frame, s);
    syncHQ(this, frame, engine, s);
    syncGym(this, frame, s);
    if (typeof window !== "undefined") {
      const display = getComputedStyle(s.player).display;
      window.__SACK_CHARACTER_DOM_V8__ = {
        installed: true,
        playerDisplay: display,
        playerFacing: frame.facing,
        pedsVisible: s.peds.filter((a) => a.el.style.display !== "none").length,
        namedVisible: [...s.named.values()].filter((a) => a.el.style.display !== "none").length,
        gymVisible: s.gym.filter((el) => el.style.display !== "none").length,
        hqKVisible: s.hqK.style.display !== "none",
      };
    }
  };
}

setTimeout(async () => {
  try {
    const { World3D } = await import("./world3d");
    install(World3D);
  } catch (err) {
    console.error("Character DOM V8 failed", err);
  }
}, 1150);
