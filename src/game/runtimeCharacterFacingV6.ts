// @ts-nocheck
/**
 * Character Facing V6
 *
 * Runs only on the stable legacy/logistics character renderer. It does not
 * create or hide characters. Its job is to correct Benji's visible facing from
 * actual world movement while preserving the proven visible sprite path.
 */
const states = new WeakMap();

function chooseFacing(frame, state) {
  const x = Number(frame.px) || 0;
  const y = Number(frame.py) || 0;
  let facing = state.facing || frame.facing || "down";
  if (state.x != null && state.y != null) {
    const dx = x - state.x;
    const dy = y - state.y;
    if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) {
      facing = Math.abs(dx) > Math.abs(dy)
        ? (dx < 0 ? "left" : "right")
        : (dy < 0 ? "up" : "down");
    }
  }
  state.x = x;
  state.y = y;
  state.facing = facing;
  return facing;
}

function install(World3D) {
  const p = World3D?.prototype;
  if (!p || p.__characterFacingV6Installed) return;
  p.__characterFacingV6Installed = true;
  const previousSync = p.sync;
  p.sync = function characterFacingV6Sync(frame) {
    previousSync.call(this, frame);
    if (!this.sprite || !frame?.images) return;

    let state = states.get(this);
    if (!state) {
      state = { x: null, y: null, facing: "down" };
      states.set(this, state);
    }
    const facing = chooseFacing(frame, state);

    // The existing left/right filenames are visually reversed.
    let img = null;
    let key = "v6-front";
    if (facing === "left") {
      img = frame.images.right ?? frame.images.left ?? frame.images.front;
      key = "v6-left";
    } else if (facing === "right") {
      img = frame.images.left ?? frame.images.right ?? frame.images.front;
      key = "v6-right";
    } else if (facing === "up") {
      img = frame.images.back ?? frame.images.front;
      key = "v6-back";
    } else {
      img = frame.images.front ?? frame.images.back;
      key = "v6-front";
    }

    if (img && typeof this.matFor === "function") this.sprite.material = this.matFor(img, key);
    this.sprite.visible = frame.cameraView === "third";
    this.sprite.scale?.set?.(1.15, 1.85, 1);
    this.sprite.position.y = 0.95 + (Number(frame.bob) || 0) * 0.02;

    window.__SACK_CHARACTER_V6__ = {
      installed: true,
      visible: this.sprite.visible,
      facing,
      px: frame.px,
      py: frame.py,
      mode: frame.mode,
      renderer: "stable legacy/logistics",
    };
  };
}

// Logistics V3 installs asynchronously. Delay this wrapper so it becomes the
// outermost sync layer without competing with the old experimental V4/V5 code.
setTimeout(async () => {
  try {
    const { World3D } = await import("./world3d");
    install(World3D);
  } catch (err) {
    console.error("Unable to install Character Facing V6", err);
  }
}, 750);
