# Runtime asset provenance

Live renderer is `src/game-v2` only. It does not load `public/game/` (legacy). A search of `src/game-v2` for `/game/` returns no matches.

Source labels:

- **NEW PRODUCTION PACK** — cut from the Character Bible or a production reference pack and actually loaded.
- **GENERATED** — drawn in code (canvas texture, procedural mesh) or an image made for this rebuild that is not a pack file.
- **LEGACY** — old `public/game` art. Not used by game-v2.
- **PLACEHOLDER** — stand-in geometry or a card that is not the finished asset.
- **UNUSED** — file exists, runtime never mounts it.

## Characters

| Asset | Runtime path | Source | Class | Used | Fallback | Known problem |
|---|---|---|---|---|---|---|
| Benji | `public/game-v2/characters/benji/{front,back,left,right,walk}.png` | Character Bible canonical identity, plus a front stride frame | NEW PRODUCTION PACK | Yes | None | Walk frame is front-only. Side/back stay on the standing view. Width pops when the stride frame swaps. `alphaTest` 0.5 can eat dark edges. |
| K Blanco | `public/game-v2/characters/k-blanco/*.png` plus portrait | Bible `02_Core_NPCs/01_K_Blanco_CANONICAL` | NEW PRODUCTION PACK | Yes | None | Card, not a performed scene. Interior staging is a box room. |
| Court OG | `public/game-v2/characters/court-og/*.png` | Bible Court OG sheet | NEW PRODUCTION PACK | Yes | None | Same card pipeline. |
| Mama Dee | `public/game-v2/characters/mama-dee/*.png` | Bible Mama Dee sheet | NEW PRODUCTION PACK | Yes | None | Porch placement can still clip a rail. |
| Unc J | `public/game-v2/characters/unc-j/*.png` | Bible Unc J sheet | NEW PRODUCTION PACK | Yes | None | Card. |
| Nitro | `public/game-v2/characters/nitro/*.png` | Bible Nitro sheet | NEW PRODUCTION PACK | Yes | None | Card. |
| Strike | `public/game-v2/characters/strike/*.png` | Bible Strike sheet | NEW PRODUCTION PACK | Yes | None | Card. |
| Pedestrians male/female 01–04 | `public/game-v2/characters/pedestrians/*` | Illustrated set made for this rebuild, same family as the cast | GENERATED | Yes | None. Old `public/game/people/walker-*` is not referenced | Front + one stride only. No side or back. Reused in more than one spot. |
| Legacy people | `public/game/people/*` | Old game | LEGACY | **No** | — | Still in the repo. Not the live cast. |

## Vehicles

| Asset | Runtime path | Source | Class | Used | Fallback | Known problem |
|---|---|---|---|---|---|---|
| Coupe, sedan, SUV, van | `public/game-v2/vehicles/{kind}-{front,back,left,right}.png` | Extracted and cut from vehicle reference boards in this rebuild | GENERATED | Yes | Procedural body is not the visible mesh; `carBody()` uses these cards | Cards. Undercarriage and blur were cut down in source art but are still flat billboards. No damage, no wheels animation. |
| Traffic | same cards, spawned in `runtime.ts` `spawnTraffic` | same | GENERATED | Yes | — | Constant speed. Two loops. |
| Benji coupe | parked coupe at (-35.4, 8.9) | same | GENERATED | Yes, as scenery | — | Cannot be entered. |
| Legacy cars | `public/game/cars/` | Old game | LEGACY | **No** | — | Present on disk only. |

## World surfaces

| Asset | Runtime path | Source | Class | Used | Fallback | Known problem |
|---|---|---|---|---|---|---|
| Benji home and neighbor houses | `world/kits/residence.ts` meshes inside `world/slice.ts` | Procedural boxes, canvas siding/shingles | PLACEHOLDER | Yes | The illustrated plates below are **not** mounted | Reads as a stylized blockout with trim, not the reference neighborhood. |
| House / HQ facade plates | `public/game-v2/kit/house_*.png`, `hq_front_*.png` | Generated facade images | UNUSED | **No.** `mountStreetKit()` in `world/kits/art.ts` is never called | Procedural houses stay visible | Dead art. Manifest lists them. Wiring was not connected. |
| Oak plate | `public/game-v2/kit/oak_01.png` | Generated | UNUSED | No. Not even in the slot list | Procedural trees | — |
| Trees / palms | `world/kits/trees.ts` | Procedural meshes | PLACEHOLDER | Yes | — | Not the kit oaks. |
| Roads / sidewalks | `slice.ts`, `districts.ts` box meshes, `materials.ts` | Procedural | PLACEHOLDER | Yes | — | No decals, no wear maps from the packs. |
| Street props | lamps, poles, bins, fences in `slice.ts` | Procedural | PLACEHOLDER | Yes | — | Sparse. |
| HQ exterior | `slice.ts` boutique massing | Procedural | PLACEHOLDER | Yes | Unused `hq_front_day/night.png` | Not the reference storefront. |
| HQ interior | `buildHqInterior` in `slice.ts` | Procedural | PLACEHOLDER | Yes | — | K Blanco card inside a simple showroom. |
| 901 court floor | `public/game-v2/places/court-floor.jpg` | Generated texture | GENERATED | Yes | — | Plane on simple geometry. |
| Court goals | `world/kits/hoop.ts` | Procedural mesh | PLACEHOLDER | Yes | — | Reads as a goal. Not a scanned or pack model. |
| Downtown | skyline boxes in `slice.ts` around z=-46 | Procedural | PLACEHOLDER | Yes, as backdrop only | — | Not a place. |
| Riverfront | `world/districts.ts` `river()` | Procedural | PLACEHOLDER | Yes | — | Pier, water block, bait shack. |
| Bowling | `districts.ts` `bowling()` | Procedural | PLACEHOLDER | Yes | — | Pink box building, lane strips, box pins. |
| Racing strip | `districts.ts` `meet()` | Procedural | PLACEHOLDER | Yes | — | Road and a start prompt. Foot race. |
| Food trucks | `districts.ts` `trucks()` | Procedural | PLACEHOLDER | Yes | — | Truck volumes and a window prompt. |
| Park | — | — | NOT STARTED | No | — | No assets. |
| Haunted exterior | `world/haunt.ts` plus `public/game-v2/places/haunt/facade.png` | Procedural massing + a facade image | GENERATED | Yes | — | Facade is a single plane on a box house. |
| Haunted rooms | `public/game-v2/places/haunt/*.jpg` | Photo plates mapped in `haunt.ts` | GENERATED | Yes | — | Interior is plate-on-geometry, not a full 3D haunt. |

## UI

HUD is DOM (`src/game-v2/ui/Hud.tsx`), not pack art. Minimap is an inline SVG. Dialogue portraits are the character PNGs.

## Accidental fallback check

- No game-v2 import points at `public/game`.
- No runtime branch substitutes a legacy walker if a bible PNG fails. A failed texture stays blank (`MeshBasicMaterial` with no map) until the load callback.
- `mountStreetKit` cannot silently fall back to plates, because nothing calls it. The visible world is the procedural one on purpose of the current code, not because plates failed to load.
