# SackReligious Klothing — Game Asset Manifest

## Use first
- `00_OPENING/03_USE_THIS_opening_final_dollar_S_arched_SackReligious_Klothing.png` — approved opening/title background. It already contains the correct flagship `$ackReligious` + `KLOTHING` storefront sign.
- `01_GAMEPLAY_REFERENCE/` — target visual language for the playable game. These are design references, not flat backgrounds to place behind the player.
- `02_MATERIAL_SKINS_SET1/` and `03_MATERIAL_SKINS_SET2/` — use these as actual repeating materials on Three.js geometry.
- `04_CHARACTER_MAPS/` — character design references and animation/reference maps. Do not render an entire sheet in-game. Crop or generate clean transparent sprites/models from these maps.
- `05_VEHICLE_MODELS_AND_SKINS/` — vehicle model, livery, traffic, delivery van, and customization references.
- `07_EXISTING_GROK_PUBLIC_GAME/` — current images already present in the supplied Grok workspace.

## Material routing
| File | Use | Three.js recommendation |
|---|---|---|
| 02_MATERIAL_SKINS_SET1/01_asphalt_basecolor.png | roads / alleys | RepeatWrapping, roughness .90-.96 |
| 02_MATERIAL_SKINS_SET1/02_sidewalk_basecolor.png | sidewalks / plazas | roughness .88-.94 |
| 02_MATERIAL_SKINS_SET1/03_old_memphis_brick_basecolor.png | general building walls | repeat 2-8x depending wall size |
| 02_MATERIAL_SKINS_SET1/04_window_facade_emissive_reference.png | building facade/window sections | use base + emissive mask or separate lit-window material |
| 02_MATERIAL_SKINS_SET1/05_rooftop_tar_gravel_basecolor.png | rooftops | high roughness |
| 02_MATERIAL_SKINS_SET1/06_court_wood_basecolor.png | court floor base | roughness .70-.82 |
| 02_MATERIAL_SKINS_SET1/07_court_lines_and_clay_reference.png | court painted surface / line reference | use as court surface or line/decal source |
| 02_MATERIAL_SKINS_SET1/08_tree_canopy_topdown.png | foliage / tree canopy | use alpha/card geometry or foliage texture |
| 02_MATERIAL_SKINS_SET1/09_dark_car_body_metal_basecolor.png | generic dark vehicle finish | metalness .55-.75, roughness .30-.45 |
| 02_MATERIAL_SKINS_SET1/10_hq_beale_dark_brick_accent.png | flagship / premium facades | subtle green-gold bounce |
| 03_MATERIAL_SKINS_SET2/11_chain_link_fence.png | court / alley fencing | alpha/cutout plane or modeled wire |
| 03_MATERIAL_SKINS_SET2/12_asphalt_road_stripe.png | road-marking sections | decal / UV strip |
| 03_MATERIAL_SKINS_SET2/13_polished_warm_concrete.png | boutique floors / modern plazas | roughness .45-.65 |
| 03_MATERIAL_SKINS_SET2/14_dark_wood_panel.png | boutique interior panels | roughness .55-.75 |
| 03_MATERIAL_SKINS_SET2/15_rollup_metal_shutter.png | storefront/alley shutters | metalness .45-.65 |
| 03_MATERIAL_SKINS_SET2/16_weathered_stucco.png | secondary buildings | roughness .90 |
| 03_MATERIAL_SKINS_SET2/17_green_cinder_block_wall.png | court/alley accent walls | roughness .88 |
| 03_MATERIAL_SKINS_SET2/18_storefront_window_grid.png | glass/storefront facade | use as reference for pane layout; create actual transparent glass |
| 03_MATERIAL_SKINS_SET2/19_charcoal_metal_surface.png | doors / benches / trim | metalness .65-.8 |
| 03_MATERIAL_SKINS_SET2/20_green_gold_fabric_stripe.png | awnings / upholstery / merch details | cloth roughness .8-.95 |

## Character routing
- Benji: `04_CHARACTER_MAPS/02_Benji_character_map.png`
- K Blanco: `04_CHARACTER_MAPS/03_K_Blanco_character_map.png`
- Neighborhood kids: `04_CHARACTER_MAPS/04_neighborhood_kids_character_map.png`
- Boutique crew: `04_CHARACTER_MAPS/05_boutique_crew_character_map.png`
- 901 Court cast: `04_CHARACTER_MAPS/06_901_court_character_map.png`
- Street NPCs: `04_CHARACTER_MAPS/07_memphis_street_NPC_character_map.png`
- Mission cast: `04_CHARACTER_MAPS/08_mission_cast_character_map.png`
- Crowd / ambient people: `04_CHARACTER_MAPS/09_crowd_ambient_character_map.png`
- Portraits / expressions: `04_CHARACTER_MAPS/10_portraits_expressions_character_map.png`

K Blanco must remain a major named character and use the same white-blonde hair / black-and-gold boutique-owner visual identity throughout the game.

## Vehicle routing
- `05_VEHICLE_MODELS_AND_SKINS/01_vehicle_character_map.png` — core vehicle classes and views.
- `05_VEHICLE_MODELS_AND_SKINS/02_car_skins_and_liveries.png` — paint/livery direction.
- `05_VEHICLE_MODELS_AND_SKINS/03_drop_van_delivery_set.png` — mission van and delivery props.
- `05_VEHICLE_MODELS_AND_SKINS/04_traffic_and_street_ride_map.png` — traffic behavior and route ideas.
- `05_VEHICLE_MODELS_AND_SKINS/05_vehicle_customization_garage.png` — future customization system reference.

## Important implementation rule
The large `01_GAMEPLAY_REFERENCE` images are visual targets only. Do not put them behind Benji as static wallpaper. Recreate their look using actual 3D geometry + these material skins + dynamic lights + independent NPC/vehicle/prop layers.
