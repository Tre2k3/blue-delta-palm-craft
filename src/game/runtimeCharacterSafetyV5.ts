// @ts-nocheck
/**
 * Character Safety V5
 *
 * Sprite Pack V4 assets stay in the repo, but its generated-atlas render path
 * is currently producing invisible actors in the live build. This safety layer
 * runs AFTER V4 and restores the proven player/NPC renderers so the game never
 * becomes unplayable while atlas extraction is debugged.
 *
 * It also fixes Benji's visual direction from ACTUAL world movement rather
 * than trusting the previous facing label:
 *   A / dx < 0 -> visually LEFT
 *   D / dx > 0 -> visually RIGHT
 *   W / dy < 0 -> BACK view
 *   S / dy > 0 -> FRONT view
 *
 * The legacy left/right image filenames are known to be visually reversed, so
 * V5 deliberately swaps them when choosing the visible sprite.
 */

const worldState = new WeakMap();

function hideBrokenV4Actors(world) {
  world.scene?.traverse?.((obj) => {
    // Do not touch world.sprite itself; it is the stable child of world.player.
    if (obj === world.sprite || obj === world.player) return;
    if (obj.userData?.spritePackV4) obj.visible = false;
  });
}

function stableFacing(f, state) {
  const x = Number(f.px) || 0;
  const y = Number(f.py) || 0;
  let facing = state.facing || "down";
  if (state.prevX != null && state.prevY != null) {
    const dx = x - state.prevX;
    const dy = y - state.prevY;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax > 0.02 || ay > 0.02) {
      if (ax > ay) facing = dx < 0 ? "left" : "right";
      else facing = dy < 0 ? "up" : "down";
    }
  }
  state.prevX = x;
  state.prevY = y;
  state.facing = facing;
  return facing;
}

function playerImageForFacing(f, facing) {
  if (!f.images) return null;
  // Existing left/right source filenames are visually reversed.
  if (facing === "left") return { img: f.images.right ?? f.images.left ?? f.images.front, key: "v5-left" };
  if (facing === "right") return { img: f.images.left ?? f.images.right ?? f.images.front, key: "v5-right" };
  if (facing === "up") return { img: f.images.back ?? f.images.front, key: "v5-back" };
  return { img: f.images.front ?? f.images.back, key: "v5-front" };
}

function restorePlayer(world, f, state) {
  if (!world.sprite) return;
  const visible = f.cameraView === "third" && f.mode !== "shop";
  const facing = stableFacing(f, state);
  const chosen = playerImageForFacing(f, facing);
  if (chosen?.img && typeof world.matFor === "function") {
    world.sprite.material = world.matFor(chosen.img, chosen.key);
  }
  world.sprite.visible = visible;
  world.sprite.scale?.set?.(1.15, 1.85, 1);
  world.sprite.position.y = 0.95 + (Number(f.bob) || 0) * 0.02;

  window.__SACK_CHARACTER_V5__ = {
    installed: true,
    playerVisible: visible,
    facing,
    px: f.px,
    py: f.py,
    mode: f.mode,
    note: "Stable player/NPC rendering active while generated V4 atlas is quarantined",
  };
}

function restoreLegacyPeople(world, f) {
  // Restore the existing 3D pedestrian rigs so streets cannot become empty.
  if (Array.isArray(world.peds)) {
    for (let i = 0; i < world.peds.length; i++) {
      const obj = world.peds[i]?.root ?? world.peds[i];
      if (!obj?.isObject3D) continue;
      obj.visible = !!f.peds?.[i] && f.mode === "world";
    }
  }

  // Restore named NPC sprites/rigs created by the proven renderer/logistics
  // layer. These are temporary until the V4 character atlases pass QA.
  if (world.npcSprites?.values) {
    const active = new Set((f.npcs || []).map((n) => n.id));
    for (const [id, sprite] of world.npcSprites.entries()) {
      sprite.visible = f.mode === "world" && active.has(id);
    }
  }

  // Logistics V3 creates articulated NPC rigs. V4 hid them recursively; make
  // those rigs visible again when their parent render path wants them visible.
  world.scene?.traverse?.((obj) => {
    if (obj.userData?.spritePackV4) return;
    if (obj.userData?.leftArm && obj.userData?.rightArm && obj.userData?.leftLeg && obj.userData?.rightLeg) {
      obj.visible = f.mode === "world";
    }
  });
}

function install(World3D) {
  const proto = World3D?.prototype;
  if (!proto || proto.__characterSafetyV5Installed) return;
  proto.__characterSafetyV5Installed = true;
  const previousSync = proto.sync;
  proto.sync = function characterSafetyV5Sync(f) {
    previousSync.call(this, f);
    let state = worldState.get(this);
    if (!state) {
      state = { prevX: null, prevY: null, facing: "down" };
      worldState.set(this, state);
    }
    hideBrokenV4Actors(this);
    restorePlayer(this, f, state);
    restoreLegacyPeople(this, f);
  };
}

setTimeout(async () => {
  try {
    const { World3D } = await import("./world3d");
    install(World3D);
    window.__SACK_CHARACTER_V5__ = {
      ...(window.__SACK_CHARACTER_V5__ || {}),
      installed: true,
      status: "ready",
    };
  } catch (err) {
    console.error("Unable to install Character Safety V5", err);
  }
}, 0);
