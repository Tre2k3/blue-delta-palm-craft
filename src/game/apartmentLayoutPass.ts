import * as THREE from "three";
import { World3D } from "./world3d";

type PatchedWorld = World3D & { __apartmentLayoutPatched?: boolean };

function near(value: number, target: number, epsilon = 0.035) {
  return Math.abs(value - target) <= epsilon;
}

/**
 * Correct a layout mistake in the first playable room without duplicating the
 * whole apartment renderer. The dresser/shoe stack was originally placed right
 * beside the south doorway at local x=-3.65, z=2.65. With Benji's 14px radius
 * that turned the intended exit lane into an invisible collision trap.
 */
export function installApartmentLayoutPass() {
  const proto = World3D.prototype as PatchedWorld;
  if (proto.__apartmentLayoutPatched) return;
  proto.__apartmentLayoutPatched = true;

  const originalBuildCity = World3D.prototype.buildCity;
  World3D.prototype.buildCity = function correctedApartmentLayout(
    this: World3D,
    walls: { x: number; y: number; w: number; h: number }[],
    trees: { x: number; y: number }[],
  ) {
    originalBuildCity.call(this, walls, trees);
    const apartment = this.scene.getObjectByName("benji-apartment-interior");
    if (!apartment) return;

    let moved = 0;
    for (const child of apartment.children) {
      if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.BoxGeometry)) continue;

      // Dresser body.
      if (near(child.position.x, -3.65) && near(child.position.y, 0.48) && near(child.position.z, 2.65)) {
        child.position.set(4.35, 0.48, 2.45);
        moved++;
        continue;
      }
      // Two shoe boxes displayed on top of the dresser.
      if (near(child.position.x, -3.10) && near(child.position.y, 1.05) && near(child.position.z, 2.65)) {
        child.position.set(3.82, 1.05, 2.45);
        moved++;
        continue;
      }
      if (near(child.position.x, -3.85) && near(child.position.y, 1.05) && near(child.position.z, 2.65)) {
        child.position.set(4.55, 1.05, 2.45);
        moved++;
      }
    }

    (window as typeof window & { __SACK_APARTMENT_LAYOUT__?: { dresserMoved: boolean; movedMeshes: number } }).__SACK_APARTMENT_LAYOUT__ = {
      dresserMoved: moved >= 3,
      movedMeshes: moved,
    };
  };
}
