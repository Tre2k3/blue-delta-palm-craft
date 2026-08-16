// @ts-nocheck
import * as THREE from "three";

/**
 * Character Renderer V8
 *
 * WebGL fallback for the 2.5D character system. The player uses the same
 * verified standalone direction art as the final DOM renderer so a broken
 * animation atlas can never make Benji disappear. NPC atlases remain animated.
 */

const S = 1 / 16;
const GYM = { cx: -4300, cy: -3200 };
const URLS = {
  player: {
    down: "/game/benji-front-norm.png",
    up: "/game/benji-back-norm.png",
    left: "/game/benji-left-norm.png",
    right: "/game/benji-right-norm.png",
  },
  k: "/game/sprites/k_blanco_walk_4dir.webp",
  npc: "/game/sprites/memphis_npc_walk_4dir.webp",
  court: "/game/sprites/court_og_walk_4dir.webp",
};

const NPC_ROW = { down: 0, up: 1, right: 2, left: 3 };
const K_ROW = { down: 0, up: 1, left: 2, right: 3 };
const states = new WeakMap();
const texturePromises = new Map();
const materialCache = new Map();

function wx(v) { return (Number(v) || 0) * S; }
function wz(v) { return (Number(v) || 0) * S; }

function loadTexture(url) {
  if (texturePromises.has(url)) return texturePromises.get(url);
  const p = new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
  texturePromises.set(url, p);
  return p;
}

function frameMaterial(base, url, cols, rows, row, col) {
  row = Math.max(0, Math.min(rows - 1, row));
  col = ((col % cols) + cols) % cols;
  const key = `${url}|${cols}|${rows}|${row}|${col}`;
  if (materialCache.has(key)) return materialCache.get(key);
  const tex = base.clone();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1 / cols, 1 / rows);
  tex.offset.set(col / cols, 1 - (row + 1) / rows);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.002,
    depthWrite: false,
    depthTest: true,
  });
  materialCache.set(key, mat);
  return mat;
}

function staticTextureMaterial(url) {
  const key = `static:${url}`;
  if (materialCache.has(key)) return Promise.resolve(materialCache.get(key));
  return loadTexture(url).then((tex) => {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.002,
      depthWrite: false,
      depthTest: true,
    });
    materialCache.set(key, mat);
    return mat;
  });
}

function makeActor(scene, width = 1.15, height = 1.95) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0 }));
  sprite.center.set(0.5, 0.02);
  sprite.scale.set(width, height, 1);
  sprite.position.y = 0.025;
  sprite.renderOrder = 10;
  sprite.userData.v8Character = true;
  scene.add(sprite);
  return { sprite, facing: "down", prevX: null, prevY: null, staticDir: null };
}

function ensureState(world) {
  let s = states.get(world);
  if (s) return s;
  s = {
    player: makeActor(world.scene, 1.22, 2.04),
    peds: [],
    named: new Map(),
    gym: [],
    textures: {},
    loaded: {},
  };
  states.set(world, s);

  for (const [key, url] of Object.entries({ k: URLS.k, npc: URLS.npc, court: URLS.court })) {
    loadTexture(url)
      .then((tex) => { s.textures[key] = tex; s.loaded[key] = true; })
      .catch((err) => { s.loaded[key] = false; console.warn(`Character V8 fallback: ${key}`, err); });
  }
  return s;
}

function chooseFacing(vx, vy, fallback = "down") {
  const ax = Math.abs(Number(vx) || 0), ay = Math.abs(Number(vy) || 0);
  if (ax <= 0.01 && ay <= 0.01) return fallback;
  return ax > ay ? (vx < 0 ? "left" : "right") : (vy < 0 ? "up" : "down");
}

function atlasSpec(id) {
  if (id === "k_blanco") return { key: "k", url: URLS.k, cols: 6, rows: 4, row: K_ROW, w: 1.2, h: 2.02 };
  if (id === "court_coach") return { key: "court", url: URLS.court, cols: 6, rows: 4, row: NPC_ROW, w: 1.22, h: 2.03 };
  return { key: "npc", url: URLS.npc, cols: 6, rows: 4, row: NPC_ROW, w: 1.14, h: 1.95 };
}

function hideLegacySprites(world, ownSprites) {
  world.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Sprite)) return;
    if (ownSprites.has(obj)) return;
    obj.visible = false;
  });
}

function syncPlayer(world, frame, engine, s) {
  const a = s.player;
  const visible = frame.cameraView === "third" && frame.mode !== "shop" && frame.mode !== "dialogue";
  a.sprite.visible = visible;
  a.sprite.position.set(wx(frame.px), 0.025, wz(frame.py));
  a.facing = URLS.player[frame.facing] ? frame.facing : (a.facing || "down");
  if (a.staticDir !== a.facing) {
    a.staticDir = a.facing;
    staticTextureMaterial(URLS.player[a.facing]).then((mat) => { a.sprite.material = mat; });
  }
}

function syncAmbient(world, frame, s) {
  const tex = s.textures.npc;
  while (s.peds.length < frame.peds.length) s.peds.push(makeActor(world.scene, 1.08, 1.9));
  for (let i = 0; i < s.peds.length; i++) {
    const a = s.peds[i], p = frame.peds[i];
    if (!p || frame.mode !== "world") { a.sprite.visible = false; continue; }
    a.sprite.visible = true;
    a.sprite.position.set(wx(p.x), 0.025, wz(p.y));
    a.facing = chooseFacing(p.vx, p.vy, a.facing);
    if (tex) {
      const col = Math.floor(((Number(frame.clock) || 0) + (Number(p.t) || i) * 0.07) * 7.2) % 6;
      a.sprite.material = frameMaterial(tex, URLS.npc, 6, 4, NPC_ROW[a.facing] ?? 0, col);
    }
  }
}

function syncNamed(world, frame, s) {
  const seen = new Set();
  for (let i = 0; i < (frame.npcs?.length || 0); i++) {
    const n = frame.npcs[i];
    seen.add(n.id);
    let a = s.named.get(n.id);
    const spec = atlasSpec(n.id);
    if (!a) {
      a = makeActor(world.scene, spec.w, spec.h);
      s.named.set(n.id, a);
    }
    const visible = frame.mode === "world";
    a.sprite.visible = visible;
    if (!visible) continue;
    const dx = a.prevX == null ? 0 : n.x - a.prevX;
    const dy = a.prevY == null ? 0 : n.y - a.prevY;
    a.facing = chooseFacing(dx, dy, a.facing);
    a.prevX = n.x; a.prevY = n.y;
    a.sprite.position.set(wx(n.x), 0.025, wz(n.y));
    const tex = s.textures[spec.key];
    if (tex) {
      const moving = Math.hypot(dx, dy) > 0.03;
      const col = moving ? Math.floor((Number(frame.clock) || 0) * 7) % spec.cols : 0;
      a.sprite.material = frameMaterial(tex, spec.url, spec.cols, spec.rows, spec.row[a.facing] ?? 0, col);
    }
  }
  for (const [id, a] of s.named) if (!seen.has(id)) a.sprite.visible = false;
}

function syncGym(world, frame, s) {
  while (s.gym.length < 6) {
    const spec = s.gym.length === 0 ? atlasSpec("k_blanco") : atlasSpec("gym_npc");
    s.gym.push({ ...makeActor(world.scene, spec.w, spec.h), spec });
  }
  if (frame.mode !== "basketball") {
    s.gym.forEach((a) => { a.sprite.visible = false; });
    return;
  }
  const t = Number(frame.clock) || 0;
  const spots = [[-55, -26], [52, -34], [-35, 38], [42, 30], [-82, 48], [78, 52]];
  for (let i = 0; i < s.gym.length; i++) {
    const a = s.gym[i], spec = a.spec;
    const [ox, oy] = spots[i];
    const swayX = Math.sin(t * (0.55 + i * 0.03)) * (i ? 11 : 8);
    const swayY = Math.cos(t * (0.50 + i * 0.04)) * (i ? 8 : 5);
    a.sprite.position.set(wx(GYM.cx + ox + swayX), 0.025, wz(GYM.cy + oy + swayY));
    a.sprite.visible = true;
    const tex = s.textures[spec.key];
    if (tex) {
      const row = spec.row.down ?? 0;
      const col = Math.floor(t * 5.5 + i) % spec.cols;
      a.sprite.material = frameMaterial(tex, spec.url, spec.cols, spec.rows, row, col);
    }
  }
}

function install(World3D) {
  const p = World3D?.prototype;
  if (!p || p.__characterRendererV8Installed) return;
  p.__characterRendererV8Installed = true;
  const previousSync = p.sync;

  p.sync = function characterRendererV8Sync(frame) {
    previousSync.call(this, frame);
    const s = ensureState(this);
    syncPlayer(this, frame, this.__v8Engine, s);
    syncAmbient(this, frame, s);
    syncNamed(this, frame, s);
    syncGym(this, frame, s);

    const own = new Set([
      s.player.sprite,
      ...s.peds.map((a) => a.sprite),
      ...[...s.named.values()].map((a) => a.sprite),
      ...s.gym.map((a) => a.sprite),
    ]);
    hideLegacySprites(this, own);

    const projected = new THREE.Vector3();
    s.player.sprite.getWorldPosition(projected);
    projected.project(this.camera);
    if (typeof window !== "undefined") {
      window.__SACK_CHARACTERS_V8__ = {
        installed: true,
        playerVisible: s.player.sprite.visible,
        facing: s.player.facing,
        playerStatic: true,
        atlas: { npc: !!s.textures.npc, k: !!s.textures.k, court: !!s.textures.court },
        playerNdc: { x: projected.x, y: projected.y, z: projected.z },
        ambientVisible: s.peds.filter((a) => a.sprite.visible).length,
        namedVisible: [...s.named.values()].filter((a) => a.sprite.visible).length,
        gymVisible: s.gym.filter((a) => a.sprite.visible).length,
      };
    }
  };
}

setTimeout(async () => {
  try {
    const { World3D } = await import("./world3d");
    install(World3D);
  } catch (err) {
    console.error("Character Renderer V8 failed", err);
  }
}, 500);
