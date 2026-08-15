// @ts-nocheck
import * as THREE from "three";

const ASSETS = {
  benjiWalk: "/game/sprites/benji_walk_4dir.webp",
  benjiRun: "/game/sprites/benji_run_4dir.webp",
  benjiBasketball: "/game/sprites/benji_basketball_actions.webp",
  kBlanco: "/game/sprites/k_blanco_walk_4dir.webp",
  memphisNpc: "/game/sprites/memphis_npc_walk_4dir.webp",
  courtOg: "/game/sprites/court_og_walk_4dir.webp",
};

const DIR_ROW = {
  down: 0, // FRONT / toward camera
  up: 1,   // BACK / away from camera
  right: 2,
  left: 3,
};

const texturePromises = new Map();
const frameMats = new Map();
const worldStates = new WeakMap();

function loadTexture(url) {
  if (texturePromises.has(url)) return texturePromises.get(url);
  const p = new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
  texturePromises.set(url, p);
  return p;
}

function frameMaterial(base, url, cols, rows, row, frame) {
  const safeRow = Math.max(0, Math.min(rows - 1, row));
  const safeFrame = ((frame % cols) + cols) % cols;
  const key = `${url}|${cols}|${rows}|${safeRow}|${safeFrame}`;
  if (frameMats.has(key)) return frameMats.get(key);
  const tex = base.clone();
  tex.repeat.set(1 / cols, 1 / rows);
  tex.offset.set(safeFrame / cols, 1 - (safeRow + 1) / rows);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.035,
    depthWrite: false,
  });
  frameMats.set(key, mat);
  return mat;
}

function makeShadow() {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
}

function makeSpriteActor(scene, scaleX = 1.05, scaleY = 1.82) {
  const root = new THREE.Group();
  root.userData.spritePackV4 = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0 }));
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.position.y = scaleY / 2;
  sprite.renderOrder = 4;
  root.add(makeShadow(), sprite);
  scene.add(root);
  return { root, sprite, facing: "down", prevX: null, prevY: null };
}

function getWorldState(world) {
  let s = worldStates.get(world);
  if (s) return s;
  s = {
    loaded: false,
    textures: {},
    ambient: [],
    named: new Map(),
    playerPrev: null,
  };
  worldStates.set(world, s);
  Promise.all(Object.entries(ASSETS).map(async ([key, url]) => [key, await loadTexture(url)]))
    .then((pairs) => {
      s.textures = Object.fromEntries(pairs);
      s.loaded = true;
    })
    .catch((err) => console.error("Sprite Pack V4 asset load failed", err));
  return s;
}

function chooseDirection(vx, vy, fallback = "down") {
  if (Math.abs(vx) > Math.abs(vy) && Math.abs(vx) > 0.01) return vx < 0 ? "left" : "right";
  if (Math.abs(vy) > 0.01) return vy < 0 ? "up" : "down";
  return fallback;
}

function hideLegacyPeople(world) {
  if (Array.isArray(world.peds)) {
    for (const item of world.peds) {
      const root = item?.root ?? item;
      if (root?.isObject3D && !root.userData?.spritePackV4) root.visible = false;
    }
  }
  if (world.npcSprites?.values) {
    for (const sprite of world.npcSprites.values()) sprite.visible = false;
  }
  world.scene?.traverse?.((obj) => {
    if (obj.userData?.spritePackV4) return;
    if (obj.userData?.leftArm && obj.userData?.rightArm && obj.userData?.leftLeg && obj.userData?.rightLeg) {
      obj.visible = false;
    }
  });
}

function syncPlayer(world, f, s) {
  if (!s.loaded || !world.sprite) return;
  const now = f.clock || 0;
  let speed = 0;
  if (s.playerPrev) {
    const dt = Math.max(0.001, now - s.playerPrev.t);
    speed = Math.hypot(f.px - s.playerPrev.x, f.py - s.playerPrev.y) / dt;
  }
  s.playerPrev = { x: f.px, y: f.py, t: now };

  const tex = s.textures.benjiWalk;
  const cols = 5;
  const row = DIR_ROW[f.facing] ?? 0;
  const frame = f.moving ? Math.floor(now * (speed > 185 ? 11 : 8)) % cols : 0;
  world.sprite.material = frameMaterial(tex, ASSETS.benjiWalk, cols, 4, row, frame);
  world.sprite.scale.set(1.12, 1.92, 1);
  world.sprite.position.y = 0.96 + (f.bob || 0) * 0.008;
  world.sprite.visible = f.cameraView === "third" && f.mode !== "shop";
}

function syncAmbient(world, f, s) {
  if (!s.loaded) return;
  while (s.ambient.length < f.peds.length) s.ambient.push(makeSpriteActor(world.scene, 1.02, 1.78));
  for (let i = 0; i < s.ambient.length; i++) {
    const actor = s.ambient[i];
    const ped = f.peds[i];
    if (!ped || f.mode !== "world") {
      actor.root.visible = false;
      continue;
    }
    actor.root.visible = true;
    actor.facing = chooseDirection(ped.vx || 0, ped.vy || 0, actor.facing);
    const frame = Math.floor(((f.clock || 0) + (ped.t || i) * 0.07) * 7.5) % 6;
    actor.sprite.material = frameMaterial(s.textures.memphisNpc, ASSETS.memphisNpc, 6, 4, DIR_ROW[actor.facing], frame);
    actor.root.position.set(ped.x / 16, 0, ped.y / 16);
  }
}

function namedAsset(id) {
  if (id === "k_blanco") return { key: "kBlanco", url: ASSETS.kBlanco, cols: 6, sx: 1.14, sy: 1.92 };
  if (id === "court_coach") return { key: "courtOg", url: ASSETS.courtOg, cols: 6, sx: 1.12, sy: 1.9 };
  return { key: "memphisNpc", url: ASSETS.memphisNpc, cols: 6, sx: 1.04, sy: 1.8 };
}

function syncNamed(world, f, s) {
  if (!s.loaded) return;
  const seen = new Set();
  for (const npc of f.npcs) {
    seen.add(npc.id);
    let actor = s.named.get(npc.id);
    const spec = namedAsset(npc.id);
    if (!actor) {
      actor = makeSpriteActor(world.scene, spec.sx, spec.sy);
      s.named.set(npc.id, actor);
    }
    actor.root.visible = f.mode === "world";
    if (!actor.root.visible) continue;
    const dx = actor.prevX == null ? 0 : npc.x - actor.prevX;
    const dy = actor.prevY == null ? 0 : npc.y - actor.prevY;
    const moving = Math.hypot(dx, dy) > 0.03;
    if (moving) actor.facing = chooseDirection(dx, dy, actor.facing);
    actor.prevX = npc.x;
    actor.prevY = npc.y;
    const frame = moving ? Math.floor((f.clock || 0) * 7.5) % spec.cols : 0;
    actor.sprite.material = frameMaterial(s.textures[spec.key], spec.url, spec.cols, 4, DIR_ROW[actor.facing], frame);
    actor.root.position.set(npc.x / 16, 0, npc.y / 16);
  }
  for (const [id, actor] of s.named) if (!seen.has(id)) actor.root.visible = false;
}

function installWorld(World3D) {
  const proto = World3D?.prototype;
  if (!proto || proto.__spritePackV4Installed) return;
  proto.__spritePackV4Installed = true;
  const originalSync = proto.sync;
  proto.sync = function spritePackV4Sync(f) {
    originalSync.call(this, f);
    const s = getWorldState(this);
    hideLegacyPeople(this);
    syncPlayer(this, f, s);
    syncAmbient(this, f, s);
    syncNamed(this, f, s);
  };
}

function installBasketball(GameEngine) {
  const proto = GameEngine?.prototype;
  if (!proto || proto.__basketballV4Installed) return;
  proto.__basketballV4Installed = true;

  const originalEnter = proto.enterBasketball;
  if (originalEnter) {
    proto.enterBasketball = function enterBasketballV4(...args) {
      const result = originalEnter.apply(this, args);
      this.mode = "basketball";
      this.ball.active = true;
      this.ball.held = true;
      this.ball.inFlight = false;
      this.ball.charging = false;
      this.ball.power = 0;
      this.ball.ballVx = 0;
      this.ball.ballVy = 0;
      this.ball.ballVz = 0;
      if (!Number.isFinite(this.ball.timeLeft) || this.ball.timeLeft < 10) this.ball.timeLeft = 50;
      this.emitHud?.();
      window.__SACK_BBALL_DIAGNOSTICS__ = { entered: true, mode: this.mode };
      return result;
    };
  }

  const originalBegin = proto.beginCharge;
  proto.beginCharge = function beginChargeV4(...args) {
    if (this.mode !== "basketball" || this.ball.inFlight || !this.ball.held) return;
    if (originalBegin) originalBegin.apply(this, args);
    this.ball.charging = true;
    this.ball.power = Math.max(0.015, this.ball.power || 0);
    window.__SACK_BBALL_DIAGNOSTICS__ = { action: "charge", held: this.ball.held, power: this.ball.power };
  };

  const originalRelease = proto.releaseShot;
  proto.releaseShot = function releaseShotV4(...args) {
    if (this.mode !== "basketball" || this.ball.inFlight || !this.ball.held) return;
    if (!this.ball.charging && (this.ball.power || 0) <= 0) {
      this.ball.charging = true;
      this.ball.power = 0.64;
    }
    const result = originalRelease?.apply(this, args);
    window.__SACK_BBALL_DIAGNOSTICS__ = {
      action: "release",
      held: this.ball.held,
      inFlight: this.ball.inFlight,
      shots: this.ball.shots,
      grade: this.ball.grade,
    };
    return result;
  };

  const originalUpdate = proto.updateBasketball;
  proto.updateBasketball = function updateBasketballV4(dt, ...args) {
    const result = originalUpdate?.call(this, dt, ...args);
    if (this.mode === "basketball" && this.ball.held && this.ball.charging && !this.ball.inFlight && this.ball.power >= 0.985) {
      this.releaseShot();
    }
    window.__SACK_BBALL_DIAGNOSTICS__ = {
      mode: this.mode,
      held: this.ball.held,
      charging: this.ball.charging,
      power: this.ball.power,
      inFlight: this.ball.inFlight,
      score: this.ball.score,
      shots: this.ball.shots,
      timeLeft: this.ball.timeLeft,
    };
    return result;
  };
}

setTimeout(async () => {
  try {
    const [{ World3D }, { GameEngine }] = await Promise.all([import("./world3d"), import("./engine")]);
    installWorld(World3D);
    installBasketball(GameEngine);
    window.__SACK_SPRITE_PACK_V4__ = {
      installed: true,
      directionRows: { ...DIR_ROW },
      assets: { ...ASSETS },
    };
  } catch (err) {
    console.error("Unable to install Sprite Pack V4", err);
  }
}, 0);
