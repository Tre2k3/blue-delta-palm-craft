// @ts-nocheck
import * as THREE from "three";

const HQ = { cx: -3700, cy: -3200, halfW: 142, halfD: 105 };
const S = 1 / 16;
const K_URL = "/game/sprites/k_blanco_walk_4dir.webp";
const worldStates = new WeakMap();

function wx(v) { return (Number(v) || 0) * S; }
function wz(v) { return (Number(v) || 0) * S; }

function enterHQ(engine) {
  engine.mode = "interior";
  engine.__v8Interior = "hq";
  engine.px = HQ.cx;
  engine.py = HQ.cy + HQ.halfD - 42;
  engine.vx = 0;
  engine.vy = 0;
  engine.yaw = 0;
  engine.pitch = -0.05;
  engine.facing = "up";
  engine.dir = "up";
  engine.nearNpc = null;
  engine.nearPoi = null;
  engine.updateProximity?.();
  engine.showToast?.("SackReligious KLOTHING · Find K Blanco inside.", 2.2);
  engine.emitHud?.();
}

function installEngine(GameEngine) {
  const p = GameEngine?.prototype;
  if (!p || p.__hqFlowV8Installed) return;
  p.__hqFlowV8Installed = true;

  const oldInteract = p.tryInteract;
  p.tryInteract = function hqDoorV8(...args) {
    // The store is a physical location first. Even if the old exterior K Blanco
    // proximity overlaps the doorway, entering the building wins over talking
    // through a wall/menu from outside.
    if (this.mode === "world" && this.nearPoi === "store") {
      enterHQ(this);
      return;
    }
    return oldInteract.apply(this, args);
  };
}

function makeKActor(world) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
  );
  sprite.center.set(0.5, 0.02);
  sprite.scale.set(1.22, 2.05, 1);
  sprite.position.set(wx(HQ.cx + 42), 0.025, wz(HQ.cy - 32));
  sprite.renderOrder = 30;
  sprite.userData.v8HQK = true;
  world.scene.add(sprite);

  const fallback = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x9f6546, roughness: 0.7 });
  const black = new THREE.MeshStandardMaterial({ color: 0x151412, roughness: 0.78 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.58, roughness: 0.28 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.48, 4, 8), black);
  torso.position.y = 0.95; fallback.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin);
  head.position.y = 1.48; fallback.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0xf3e7d0, roughness: 0.92 }));
  hair.position.y = 1.58; fallback.add(hair);
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 7, 18), gold);
  chain.rotation.x = Math.PI / 2; chain.position.set(0, 1.24, 0.16); fallback.add(chain);
  fallback.position.set(wx(HQ.cx + 42), 0, wz(HQ.cy - 32));
  fallback.visible = false;
  fallback.userData.v8HQK = true;
  world.scene.add(fallback);

  const state = { sprite, fallback, material: null, loaded: false };
  new THREE.TextureLoader().load(
    K_URL,
    (base) => {
      base.colorSpace = THREE.SRGBColorSpace;
      const tex = base.clone();
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(1 / 6, 1 / 4);
      // Front row, clean standing frame.
      tex.offset.set(0, 1 - 1 / 4);
      tex.needsUpdate = true;
      state.material = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.002,
        depthWrite: false,
        depthTest: true,
      });
      state.loaded = true;
    },
    undefined,
    () => { state.loaded = false; },
  );
  return state;
}

function stateFor(world) {
  let s = worldStates.get(world);
  if (!s) {
    s = { k: makeKActor(world) };
    worldStates.set(world, s);
  }
  return s;
}

function installWorld(World3D) {
  const p = World3D?.prototype;
  if (!p || p.__hqFlowV8Installed) return;
  p.__hqFlowV8Installed = true;
  const oldSync = p.sync;

  p.sync = function hqPresentationV8(frame) {
    oldSync.call(this, frame);
    const engine = this.__v8Engine;
    const hq = this.scene.getObjectByName("V8_HQ");
    const inHQ =
      engine?.__v8Interior === "hq" ||
      engine?.__v8DialogueReturn === "hq" ||
      engine?.__v8ShopReturn === "hq";

    if (hq) hq.visible = !!inHQ;

    const s = stateFor(this);
    const showK = !!inHQ && frame.mode !== "shop";
    if (s.k.loaded && s.k.material) {
      s.k.sprite.material = s.k.material;
      s.k.sprite.visible = showK;
      s.k.fallback.visible = false;
    } else {
      s.k.sprite.visible = false;
      s.k.fallback.visible = showK;
    }

    if (inHQ && frame.cameraView === "third" && ["dialogue", "shop"].includes(frame.mode)) {
      // Keep a tasteful boutique view behind UI overlays instead of dropping to
      // a black/empty scene while K Blanco or the shop interface is open.
      const px = wx(engine?.px ?? HQ.cx);
      const pz = wz(engine?.py ?? HQ.cy);
      this.camera.position.lerp(new THREE.Vector3(px + 2.6, 2.45, pz + 5.0), 0.25);
      this.camera.lookAt(wx(HQ.cx + 34), 1.2, wz(HQ.cy - 28));
      this.camera.fov = 58;
      this.camera.updateProjectionMatrix?.();
    }

    if (typeof window !== "undefined") {
      window.__SACK_HQ_V8__ = {
        installed: true,
        inHQ,
        mode: frame.mode,
        kVisible: s.k.sprite.visible || s.k.fallback.visible,
      };
    }
  };
}

setTimeout(async () => {
  try {
    const [{ GameEngine }, { World3D }] = await Promise.all([
      import("./engine"),
      import("./world3d"),
    ]);
    installEngine(GameEngine);
    installWorld(World3D);
  } catch (err) {
    console.error("HQ Flow V8 failed", err);
  }
}, 900);
