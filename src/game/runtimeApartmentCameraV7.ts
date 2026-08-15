// @ts-nocheck
/**
 * Apartment Camera/Spawn V7
 *
 * Keeps the stable character renderer intact. This patch only fixes the two
 * apartment-specific camera problems exposed by QA:
 * 1) the third-person camera could sit outside the room and look through a wall;
 * 2) after exiting, Benji spawned too close to the exterior shell, so the
 *    follow camera could end up inside the apartment facade and occlude him.
 */

const APARTMENT = { cx: -3200, cy: -3200, halfW: 112, halfD: 86 };
const S = 1 / 16;

function installEngine(GameEngine, POIS) {
  const p = GameEngine?.prototype;
  if (!p || p.__apartmentCameraV7Installed) return;
  p.__apartmentCameraV7Installed = true;

  const previousInteract = p.tryInteract;
  p.tryInteract = function apartmentExitSafetyV7(...args) {
    const wasInterior = this.mode === "interior" && this.__interiorKind === "apartment";
    const wasAtDoor = !!this.__interiorAtDoor;
    const result = previousInteract.apply(this, args);

    // Logistics V3 performs the actual mission transition. We only move the
    // resulting world spawn farther from the building so the follow camera has
    // a full character-length of clear space behind Benji.
    if (wasInterior && wasAtDoor && this.mode === "world") {
      const apt = POIS.find((q) => q.id === "apartment");
      if (apt) {
        this.px = apt.x + apt.w / 2;
        this.py = apt.y + apt.h + 152;
        this.vx = 0;
        this.vy = 0;
        // Keep the initial view aimed out toward Memphis while the camera sits
        // safely south of the apartment facade rather than inside it.
        this.yaw = Math.PI;
        this.pitch = -0.06;
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

    // In the apartment, force the camera to remain INSIDE the room shell.
    // The room's north wall is roughly z=-205.375 while Benji starts around
    // z=-200, so this camera position gives a comfortable over-the-shoulder
    // view without ever looking through the exterior wall.
    if (frame.mode === "interior" && frame.cameraView === "third") {
      const x = (Number(frame.px) || APARTMENT.cx) * S;
      const z = (Number(frame.py) || APARTMENT.cy) * S;
      this.camera.position.set(x, 2.25, z - 3.75);
      this.camera.lookAt(x, 1.22, z + 0.35);
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix?.();
    }

    if (typeof window !== "undefined") {
      window.__SACK_APARTMENT_V7__ = {
        installed: true,
        mode: frame.mode,
        cameraView: frame.cameraView,
        player: { x: frame.px, y: frame.py },
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
