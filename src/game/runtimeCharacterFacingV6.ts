// @ts-nocheck
/**
 * Character Facing V6
 *
 * Stable facing layer for the legacy/logistics Benji renderer.
 *
 * IMPORTANT: visual facing follows the PLAYER'S INPUT, not camera-relative
 * world velocity. That keeps the contract intuitive even when the camera yaw
 * changes:
 *   A -> visibly LEFT
 *   D -> visibly RIGHT
 *   W -> BACK / moving away
 *   S -> FRONT / moving toward camera
 */

function installEngine(GameEngine) {
  const p = GameEngine?.prototype;
  if (!p || p.__characterInputFacingV6Installed) return;
  p.__characterInputFacingV6Installed = true;

  const previousUpdatePlayer = p.updatePlayer;
  p.updatePlayer = function characterInputFacingV6(dt, mx, my, runHeld) {
    const result = previousUpdatePlayer.call(this, dt, mx, my, runHeld);

    const ax = Math.abs(Number(mx) || 0);
    const ay = Math.abs(Number(my) || 0);
    if (ax > 0.05 || ay > 0.05) {
      if (ax > ay) this.facing = mx < 0 ? "left" : "right";
      else this.facing = my < 0 ? "up" : "down";
      this.dir = this.facing;
    }
    return result;
  };
}

function installWorld(World3D) {
  const p = World3D?.prototype;
  if (!p || p.__characterFacingV6Installed) return;
  p.__characterFacingV6Installed = true;
  const previousSync = p.sync;

  p.sync = function characterFacingV6Sync(frame) {
    previousSync.call(this, frame);
    if (!this.sprite || !frame?.images) return;

    const facing = frame.facing || "down";

    // QA confirmed the current runtime image map already has LEFT and RIGHT in
    // the correct visual direction. Do NOT swap them here.
    let img = null;
    let key = "v6-front";
    if (facing === "left") {
      img = frame.images.left ?? frame.images.right ?? frame.images.front;
      key = "v6-left";
    } else if (facing === "right") {
      img = frame.images.right ?? frame.images.left ?? frame.images.front;
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

    if (typeof window !== "undefined") {
      window.__SACK_CHARACTER_V6__ = {
        installed: true,
        visible: this.sprite.visible,
        facing,
        px: frame.px,
        py: frame.py,
        mode: frame.mode,
        renderer: "stable legacy/logistics",
        facingSource: "raw player input",
        horizontalMapping: "direct left->left, right->right",
      };
    }
  };
}

setTimeout(async () => {
  try {
    const [{ World3D }, { GameEngine }] = await Promise.all([
      import("./world3d"),
      import("./engine"),
    ]);
    installEngine(GameEngine);
    installWorld(World3D);
  } catch (err) {
    console.error("Unable to install Character Facing V6", err);
  }
}, 750);
