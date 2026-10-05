# Production reference pack index

Verified 2026-10-04 from the Drive production folder. Complete ZIPs only. Split `.part###` files and `github_parts_test*.part` were ignored and not concatenated.

Boards live in `production-reference/` and are gitignored. They are art direction, not runtime textures.

## 1. Archives used

| # | Exact filename | Bytes | `unzip -t` | Extracted to |
| --- | --- | ---: | --- | --- |
| 1 | `SackReligious_Character_Bible_AI_Reference_Pack.zip` | 33,296,971 | OK | `production-reference/character-bible/` |
| 2 | `SackReligious_Console_Quality_Game_Concepts.zip` | 16,616,650 | OK | `production-reference/console-concepts/` |
| 3 | `SackReligious_World_Buildings_Reference_Pack_v1.zip` | 63,984,880 | OK | `production-reference/world-buildings/` |
| 4 | `SackReligious_HQ_Production_Reference_Pack_v1.zip` | 41,220,864 | OK | `production-reference/hq/` |
| 5 | `SackReligious_Vehicle_Street_Systems_Production_Pack_v1.zip` | 29,668,906 | OK | `production-reference/vehicles-streets/` |
| 6 | `SackReligious_Gameplay_Props_Items_Production_Pack_v1.zip` | 17,070,012 | OK | `production-reference/props-items/` |
| 7 | `SackReligious_UI_HUD_Production_Pack_v1.zip` | 32,997,711 | OK | `production-reference/ui-hud/` |
| 8 | `SackReligious_Activity_Locations_Production_Pack_v1.zip` | 34,476,802 | OK | `production-reference/activity-locations/` |

Duplicates of the same filename were ignored. Newest complete copy was used when more than one full ZIP existed (vehicles, props, UI, activity locations). Drive `manifest.json` covers only the older split transfers of packs 1–4. It was read for context. The eight complete ZIPs above are the authority.

## 2. Docs read before images

- Character Bible: `CHARACTER_BIBLE_FOR_AI.txt`, `manifest.json`
- Console concepts: `README.txt`
- World: `WORLD_BUILDING_REFERENCE_GUIDE.md`, `world_location_manifest.json`, `file_manifest.json`
- HQ: `06_Docs/README.md`, `hq_implementation_spec.json`
- Vehicles: `README.md`, `vehicle_street_systems_spec.json`
- Props: `README.md`, `gameplay_props_items_spec.json`
- UI: `README.md`, `ui_hud_implementation_spec.json`
- Activities: `README.md`, `activity_locations_spec.json`

## 3. What each pack controls

| Pack | Authority for | Direct runtime? |
| --- | --- | --- |
| Character Bible | Benji face, tattoos, hair, proportions, wardrobe identity; female K Blanco; Court OG, Mama Dee, Unc J, Nitro, Strike | Identity lock only. Directional cutouts may be derived. Sheets are not sprite sheets. |
| Console concepts | Polish, lighting, density, camera, commercial target | Art direction only. Do not paste as backgrounds. |
| World buildings | Districts, street language, scale, haunted-house rooms | Geometry and layers. Haunted rooms that already play stay. |
| HQ | Exterior, sales floor, cashwrap, fitting, office, storage, loading, floor plan, seasonal lighting | Overrides generic HQ looks. Build spaces, do not ship the boards. |
| Vehicles / streets | Green/gold hero coupe, silver sedan, black SUV, branded van, classic coupe, sports car, lanes, curbs, parking | Lane logic stays in code. Paint language can follow the pack. |
| Props | Ball, hoop, rod, bobber, fish, pins, bags, money, keys, racks, street furniture | Separate gameplay objects. Never bake into Benji. |
| UI / HUD | Desktop, mobile, map, phone, missions, wardrobe, shop, activity HUDs | Design system. Do not screenshot the boards into the HUD. |
| Activity locations | 901 court, bowling, fishing, racing, food trucks, boutique, downtown, neighborhood, seasons | Entrances, bounds, anchors. Same collision across day/night/season. |

## 4. Conflicts and authority

| Conflict | Winner |
| --- | --- |
| Male K Blanco in older UI concepts vs the Character Bible sheet | Character Bible. Canonical K Blanco is the Black woman with platinum curls, black sleeveless jumpsuit, hoops, K pendant, heels. |
| Activity-pack boutique signage vs Character Bible | Character Bible owns her face and body. The location pack owns the building only. |
| Console concept scenes vs activity-location boards | Console pack is the quality target. Activity pack owns layout and anchors. |
| World-pack haunted house vs the playable room graph | Keep the working room traversal. Use the pack for room identity, not as slides. |
| Concept-board lettering (`$ACKRELIGIOUS` brush type, garbled neon) | Do not copy gibberish. In-game words are authored: `$ackReligious`, Memphis, 901, K Blanco. |
| HQ cutout pendant | Runtime `k-blanco-hq-cutout.png` matches the female front pose, but the pendant reads as **X**, not **K**. Bible wins. Repair the letter without regenerating the body. |

## 5. Reference → runtime

| Reference | Runtime |
| --- | --- |
| Character Bible / Benji canonical front, back, left | `playerCharacter.ts`, `character.benji.*` in `assetRegistry.ts`, `/game/benji-*-norm.webp` |
| Character Bible / wardrobe sheets | `outfitSprites.ts`, `outfitCompositor.ts`. Pre-dressed action frames bypass the compositor. |
| Character Bible / K Blanco front | `public/game/people/k-blanco-hq-cutout.png`, HQ desk actor, `character.k_blanco` |
| Character Bible / Court OG, Mama Dee, Unc J, Nitro, Strike | Named roles are specified. Canonical mentor cutouts are still missing as distinct runtime actors. |
| Vehicle pack / Benji primary car | Dark green classic coupe, gold wheels. Not the delivery van. Hero car still needs that silhouette. |
| Vehicle pack / delivery van | `vehicle.delivery_van`, `DROP_VAN_WRAP` (`sackrow-van`) |
| Vehicle pack / traffic | `trafficMotion.ts`, `worldTopology.ts` lanes, `carRig.ts` paints |
| HQ pack | `hqLocation.ts`, physical interior, front door return |
| Activity pack / 901 court | `courtPlay.ts`, separate ball in `basketballSprites.ts` |
| Props / basketball, rod, ball | Existing activity modules. Do not fold equipment into the player card. |
| UI pack | React HUD in `GameApp.tsx`. Shared state, separate mobile layout. |
| IDs | `src/game/referenceCatalog.ts` |

## 6. Already matching

- Female K Blanco desk actor, adult scale against 1.78-unit Benji, black clothing preserved. Pendant letter is the remaining miss.
- Traffic heading follows lane tangent. Debug hook is `window.__SACK_TRAFFIC_DEBUG__`.
- Connected slice plays: home exit, sidewalks, HQ door, K briefing, van, three deliveries, court shot and recovery.
- Basketball, fishing rod, and bowling ball stay outside Benji's sprite.
- Haunted-house rooms walk, with doors and saved completion.
- Seasonal overlays reuse base locations instead of a second city.

## 7. Needs replacement or extension

| Item | Decision |
| --- | --- |
| K pendant X vs K | REPAIR the cutout letter only |
| Benji hero car vs green/gold coupe | REPLACE the player-car look; KEEP van for deliveries |
| Civilian paints | REPAIR. Palette now follows silver sedans, black SUVs, and rare coupes |
| HQ floor plan (rear door, fitting, office, storage) | EXTEND the working interior. Do not rebuild the shell |
| Named mentors other than K | EXTEND from their bible sheets |
| Fishing anywhere on the shore | REPAIR down to authored spots |
| UI boards | KEEP as design system. Do not paste |
| World slab buildings | REPLACE materials and depth over time, KEEP collision and POIs |
| Gibberish on reference boards | IGNORE as copy |

## 8. First vertical slice still in progress

Order, and only this order until it holds visually and in play:

1. Benji home
2. Neighborhood
3. Real street and traffic
4. SackReligious HQ exterior
5. HQ interior
6. Canonical K Blanco
7. Package / delivery mission
8. 901 court
9. Basketball

Functional traversal of that route already passes. The remaining work on the slice is visual: hero coupe, K pendant, HQ rooms from the floor plan, and street furniture from the vehicle pack. Fishing, bowling, racing, food trucks, and extra neighborhoods wait until that slice looks like the packs.

## 9. Keep / repair / replace / extend

| System | Call |
| --- | --- |
| Player controller and facing contract | KEEP. Recheck A left, D right, W back, S front when the camera yaws. |
| Outfit compositor | KEEP. Pre-dressed actions bypass it. |
| Traffic motion | KEEP the lane graph. EXTEND parking and intersection right-of-way. |
| Collision and door returns | KEEP. EXTEND rear HQ door. |
| Basketball | KEEP the separate ball. |
| Fishing | REPAIR activation to dock anchors. |
| Bowling / race / food | EXTEND later from the activity pack. |
| Haunted house | KEEP playable rooms. |
| UI | EXTEND toward the pack. Do not screenshot it. |
| Save | KEEP rewards. EXTEND solid-checked positions. |
