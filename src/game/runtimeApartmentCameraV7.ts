// @ts-nocheck
/**
 * Apartment Camera/Spawn V7
 *
 * Keeps the stable character renderer intact. This patch only owns apartment
 * camera/spawn behavior.
 */

const APARTMENT = { cx: -3200, cy: -3200, halfW: 112, halfD: 86 };
const S = 1 / 16;
const worldStates = new WeakMap();

function installEngine(GameEngine, POIS) {
  const p = GameEngine?.prototype;
  if (!p || p.__apartmentCameraV7Installed) return;
  p.__apartmentCameraV7Installed = true;

  const previousInteract = p.tryInteract;
  p.tryInteract = function apartmentExitSafetyV7(...args) {
    const wasInterior = this.mode === "interior" && this.__interiorKind === "apartment";
    const wasAtDoor = !!this.__interiorAtDoor;
    const result = previousInteract.apply(this, args);

    if (wasInterior && wasAtDoor && this.mode === "world") {
      const apt = POIS.find((q) => q.id === "apartment");
      if (apt) {
        // Put Benji far enough south of the facade that the follow camera has
        // clean street-side clearance.
        this.px = apt.x + apt.w / 2;
        this.py = apt.y + apt.h + 184;
        this.vx = 0;
        this.vy = 0;

        // Yaw 0 makes the third-person camera sit SOUTH of Benji, away from the
        // apartment behind him. The old PI yaw put the camera back toward the
        // building and caused the foreground/roof occlusion seen in QA.
        this.yaw = 0;
        this.pitch = -0.08;
        this.facing = "down";
        this.dir = "down";
        this.updateProximity?.();
        this.emitHud?.();
      }
    }
    return result;
  };
}

function installWorld(World3D) {
  const p = World3D?.prototype;
  if (!p || p.__apartmentCameraV7Installed) return;
  p.__apartmentCameraV7Installed = true;

  const previousSync = p.sync;
  p.sync = function apartmentCameraV7Sync(frame) {
    previousSync.call(this, frame);

    let state = worldStates.get(this);
    if (!state) {
      state = { previousMode: null, exitUntil: 0 };
      worldStates.set(this, state);
    }

    if (state.previousMode === "interior" && frame.mode === "world") {
      state.exitUntil = (Number(frame.clock) || 0) + 1.25;
    }
    state.previousMode = frame.mode;

    const x = (Number(frame.px) || APARTMENT.cx) * S;
    const z = (Number(frame.py) || APARTMENT.cy) * S;

    if (frame.mode === "interior" && frame.cameraView === "third") {
      // Keep the camera inside the room shell and behind Benji on the south
      // side while he walks toward the front door.
      this.camera.position.set(x, 2.32, z - 3.45);
      this.camera.lookAt(x, 1.18, z + 0.55);
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix?.();
    } else if (
      frame.mode === "world" &&
      frame.cameraView === "third" &&
      (Number(frame.clock) || 0) < state.exitUntil
    ) {
      // One-second clean establishing shot immediately after pressing E. This
      // bypasses any leftover facade/lot geometry while the normal follow
      // camera settles onto the new spawn.
      this.camera.position.set(x, 2.75, z + 5.1);
      this.camera.lookAt(x, 1.15, z);
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix?.();
    }

    if (typeof window !== "undefined") {
      window.__SACK_APARTMENT_V7__ = {
        installed: true,
        mode: frame.mode,
        cameraView: frame.cameraView,
        player: { x: frame.px, y: frame.py },
        exitCameraActive: frame.mode === "world" && (Number(frame.clock) || 0) < state.exitUntil,
        camera: this.camera ? {
          x: Number(this.camera.position.x.toFixed(3)),
          y: Number(this.camera.position.y.toFixed(3)),
          z: Number(this.camera.position.z.toFixed(3)),
        } : null,
      };
    }
  };
}

setTimeout(async () => {
  try {
    const [{ GameEngine }, { World3D }, { POIS }] = await Promise.all([
      import("./engine"),
      import("./world3d"),
      import("./data"),
    ]);
    installEngine(GameEngine, POIS);
    installWorld(World3D);
  } catch (err) {
    console.error("Unable to install Apartment Camera V7", err);
  }
}, 0);
