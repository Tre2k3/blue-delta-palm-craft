# First production slice

Runtime: `src/game-v2/`. The live route mounts this instead of the legacy renderer.
Branch name for the work: `feat/grok-reference-driven-rebuild`. This sandbox has no `.git` directory, so the branch was not created on GitHub. Do not merge.

## Renderer

New Three.js scene. Layered geometry, one shadow-casting sun, hemisphere fill, night lamps, fog, follow camera. No legacy world pass, no full-screen reference board.

## World

One block only: Benji's house and two neighbors, lawns, sidewalks, a two-lane avenue, one cross street, turnaround pads, SackReligious HQ, and the 901 court at the end of the block.

## Roads

Asphalt is a connected surface: avenue, cross street, and end pads. Lane polylines in `roads/lanes.ts` stay on that asphalt. Cars sample the polyline. Yaw is the step they just moved.

## Traffic

Avenue loop yields at the junction. The cross-street loop waits while an avenue car is in the intersection. Stopped cars keep the lane heading. They do not use the old car rig.

## Buildings

HQ is a brick-and-black storefront with a gold crown, authored `$ACKRELIGIOUS` / `HQ` text, glass, a front door, and a rear service box. The interior is a separate showroom: racks, register, office block, K Blanco. Home is a separate room with a couch, bed, and kitchen counter. Doors return outside the same door.

## Player

Benji cutouts from the Character Bible identity. A faces left, D faces right, W shows the back, S shows the front, all relative to the camera. Feet sit on the ground. A blob shadow marks contact.

## References for the screenshots

| Shot | Source |
| --- | --- |
| Home and street | `activity-locations/.../02_neighborhood_reference.png` |
| HQ day | `hq/.../01_front_exterior_day.png` |
| HQ night | `hq/.../02_front_exterior_night.png` |
| K Blanco | `character-bible/.../k_blanco_CANONICAL_reference.png` |
| Court | `activity-locations/.../02_901_Basketball_Court/01_court_reference.png` |

These are targets, not textures. The slice is still simpler than the boards: no interior floor-plan completeness, no hero-coupe drive model, and K's pendant on the ported cutout still reads as X.
