# MASTER IMPLEMENTATION PROMPT FOR GROK — SPLIT ASSET PACK EDITION

You are upgrading the existing **$ackReligious KLOTHING Memphis** game workspace I provided. Do not start over unless a subsystem is irreparably broken. Treat the existing React + TypeScript + Three.js game as the codebase of record, then replace weak visuals and logic systematically.

## IMPORTANT: THIS ASSET LIBRARY IS SPLIT ACROSS 8 ZIP FILES

The former single image pack has been split so every archive stays manageable. The eight files are additive parts of one library:

1. `SackReligious_PART01_START_HERE_OPENING_GAMEPLAY.zip`
2. `SackReligious_PART02_MATERIALS_SET1.zip`
3. `SackReligious_PART03_MATERIALS_SET2.zip`
4. `SackReligious_PART04_CHARACTERS.zip`
5. `SackReligious_PART05_VEHICLES.zip`
6. `SackReligious_PART06_SCENE_REFERENCES.zip`
7. `SackReligious_PART07_EXISTING_GAME_ASSETS.zip`
8. `SackReligious_PART08_ORIGINALS_SCREENSHOTS.zip`

### Extraction rule
Extract every archive into the **same parent directory** and merge the shared top-level folder `sackreligious_game_asset_pack/`. Do not rename or flatten the files. Do not treat any one part as a complete pack. Read `SPLIT_PACK_MANIFEST.md` after PART01 is extracted.

### If the files must be uploaded to you in stages
Maintain the same workspace between uploads. Extract each part as it arrives, preserve everything already extracted, and do **not** begin the final implementation audit until all 8 parts are present. You may inspect the code and plan beforehand, but do not claim missing assets or replace them with placeholders merely because a later part has not arrived yet.

### Asset-part ownership
- PART01 = opening/title art + gameplay targets + documentation.
- PART02 + PART03 = runtime material skins.
- PART04 = character canon, including Benji and **K Blanco**.
- PART05 = car models, drop van, traffic and livery canon.
- PART06 = extra scene/composition references.
- PART07 = current runtime game images/sprites that must be audited, including the mislabeled left/right Benji sprites.
- PART08 = source uploads and current screenshots for comparison/regression checks.

The source game workspace ZIP is separate from these asset parts. Open the existing game workspace first, then merge/copy the appropriate assets from this split library into the workspace.

---

## FIRST: read the workspace skills and inspect the code
Before changing code, read the relevant local skills in `.grok/skills/`, especially:
- `building-games/SKILL.md`
- `building-games/references/threejs-foundational.md`
- `building-games/references/collision-physics.md`
- `building-games/references/ai-pathfinding.md`
- `building-games/references/game-feel-juice.md`
- `building-games/references/input.md`
- `building-games/references/save-persistence.md`
- `game-animation-frames/SKILL.md`
- `game-character-consistency/SKILL.md`
- `game-tilesets/SKILL.md`
- `design-ui/SKILL.md`
- `threejs/SKILL.md`

Then inspect at minimum:
- `src/game/GameApp.tsx`
- `src/game/engine.ts`
- `src/game/world3d.ts`
- `src/game/input.ts`
- `src/game/data.ts`
- `src/game/types.ts`
- `public/game/`

Use all eight extracted split-pack parts together as the new visual source of truth. Never infer that an asset is absent until you have checked the correct part listed in `SPLIT_PACK_MANIFEST.md`.

---

# 1. NON-NEGOTIABLE BRAND LOCK

The brand must always read exactly:

**$ackReligious**
**KLOTHING**

Rules:
- First character is a **$ sign**, not a normal S.
- `$ackReligious` is a slightly upward-arched flagship wordmark.
- `KLOTHING` sits directly below it in clean uppercase.
- Never invent alternate spellings.
- No gibberish text, AI-looking pseudo-words, fake signage, or placeholder copy in the shipping build.
- All visible copy must come from centralized string constants/data, not generated at runtime.

Use `docs/BRAND_LOCK.txt` as the exact brand reference.

---

# 2. OPENING SCREEN — REPLACE CURRENT TITLE IMAGE

From **PART01**, use this image as the full-bleed opening/title background:

`00_OPENING/03_USE_THIS_opening_final_dollar_S_arched_SackReligious_Klothing.png`

Replace `/game/title-key.jpg` on the title screen with this asset.

Important:
- Do NOT stretch it. Use `object-fit: cover` with responsive focal positioning so Benji remains visible on desktop and mobile.
- The left side was intentionally composed darker for UI. Keep title/menu controls there.
- Do not place a second incorrect SackReligious logo over the storefront sign.
- If a small brand identifier is needed in UI, use the exact canonical `$ackReligious` / `KLOTHING` text.
- Preserve clean controls for New Game / Continue / Settings / Enter Memphis.
- Add a loading/preload transition so the world is ready before the player enters.

---

# 3. THE WORLD MUST STOP LOOKING LIKE A STATIC BACKGROUND

The target look is a cinematic, premium third-person open-world game with a stylized semi-realistic Memphis identity. Think of the *game feel* of a dense urban third-person adventure, but use only our original SackReligious assets and world.

Do NOT use `01_GAMEPLAY_REFERENCE/*.png` as giant wallpapers behind the player. Those images are visual targets only.

The world must be built from:
- real Three.js geometry
- tileable material textures
- independent cars
- independent pedestrians/NPCs
- independent props
- dynamic lighting
- actual collision
- camera depth/parallax from geometry, not image panning

The current `world3d.ts` uses procedural `makeNoiseTex()` and `makeWindowTex()` for many surfaces. Replace those flat/noise materials with real loaded textures from **PART02 and PART03**:
- `02_MATERIAL_SKINS_SET1/`
- `03_MATERIAL_SKINS_SET2/`

Copy production textures into a sensible runtime folder such as:
`public/game/materials/`

Create a material manager / texture cache with `THREE.TextureLoader` so the same file is loaded once and reused.

For repeating textures:
- set `wrapS = wrapT = THREE.RepeatWrapping`
- set appropriate repeat values based on geometry size
- use `SRGBColorSpace` for base color
- use anisotropy when available
- generate mipmaps
- cap texture size on mobile if necessary

Recommended physical values are in `docs/ASSET_MANIFEST.md`.

---

# 4. LIGHTING — MAKE THE SAME CITY LOOK EXPENSIVE

Upgrade Three.js lighting instead of faking everything in images:

Golden-hour daytime:
- warm directional sun from west / low angle
- ACES tone mapping
- soft PCF shadows
- hemisphere fill light
- subtle ambient fill
- contact-darkening near feet/cars/buildings
- building windows with emissive warm sodium light
- storefront interior practical lights
- street-lamp pools on asphalt
- gentle volumetric-looking fog/haze so distant buildings fall off

Night/rain mode:
- darker sky/environment
- wet-road specular response
- emissive windows/signage
- headlight/tail-light accents
- streetlight pools
- subtle reflection look without expensive full ray tracing

Do not overdo neon. Brand green may glow in designated SackReligious fixtures, but the city should still feel grounded.

---

# 5. FIX BENJI LEFT/RIGHT ORIENTATION FOR REAL

This is a known bug and MUST be fixed before anything is considered done.

Current workspace assets are mislabeled visually:
- `public/game/benji-left-norm.png` visually faces SCREEN-RIGHT.
- `public/game/benji-right-norm.png` visually faces SCREEN-LEFT.

Preferred fix:
1. Swap/rename the actual files so the filenames become truthful.
2. Use canonical mapping after that:
   - facing left -> screen-left sprite
   - facing right -> screen-right sprite
   - up -> back sprite
   - down -> front sprite
3. Determine facing from **world movement velocity**, not camera yaw, while moving.
4. Preserve last facing while idle.

Use this logic (adapt to coordinate conventions if necessary):

```ts
if (Math.abs(vx) > Math.abs(vy)) {
  facing = vx < 0 ? "left" : "right";
} else if (Math.abs(vy) > 0.001) {
  facing = vy < 0 ? "up" : "down";
}
```

Do not call `applyYawToFacing()` when the player stops if that causes the character to flip toward camera direction. Idle should retain the last move-facing unless in explicit first-person aim mode.

Acceptance test that must be visibly verified:
- A / left-stick-left = Benji moves left AND faces left.
- D / left-stick-right = Benji moves right AND faces right.
- W = back sprite.
- S = front sprite.
- Release controls = retain last direction.

Add a dev-only orientation diagnostic if useful.

---

# 6. CHARACTER SYSTEM — USE THE CHARACTER MAPS CORRECTLY

From **PART04**, use `04_CHARACTER_MAPS/` as the character canon.

Core characters:
- Benji: `02_Benji_character_map.png`
- K Blanco: `03_K_Blanco_character_map.png`

K Blanco is essential. Keep her consistent:
- white/blonde sculpted hair
- black-and-gold boutique-owner style
- confident mentor/owner presence
- same face/body identity throughout dialogue, store, missions, court cameos

Other packs provide:
- neighborhood kids
- boutique crew
- 901 Court cast
- Memphis street NPCs
- mission cast
- crowds
- portraits / expressions

Do NOT put a full character-map sheet into the game as a billboard.
Instead:
- crop/extract clean individual characters from the sheets, OR
- use the local sprite-generation skills to create transparent consistent sprites from these reference maps
- maintain front/back/left/right/idle/walk/run/talk/interact variants

NPCs should not be primitive stick figures or colored capsules in the shipping build.

Build an NPC definition system such as:
```ts
NPCDef {
  id,
  name,
  spriteSet,
  worldPosition,
  collisionRadius,
  interactionRadius,
  wanderPath,
  schedule,
  dialogueId,
  missionFlags,
}
```

Ambient NPC behavior:
- walk sidewalk/nav routes
- stop at corners
- idle/talk/use phone/sit
- avoid player and vehicles
- lightweight LOD / despawn outside useful range
- deterministic enough not to break missions

---

# 7. VEHICLES — NO MORE PRIMITIVE BOX TRAFFIC

From **PART05**, use `05_VEHICLE_MODELS_AND_SKINS/` as the vehicle canon.

At minimum ship:
- SackReligious drop van
- Memphis sedan
- black SUV
- classic green/gold car
- generic traffic sedan variants

The drop van is mission-critical.

Implement vehicles as simple but believable 3D meshes (boxy low-poly is acceptable if proportioned correctly) with:
- body mesh
- windows
- wheels
- headlights/tail lights
- shadows
- vehicle material/livery
- correct yaw aligned with velocity

Traffic logic:
- lane splines / waypoint graphs, not random world wandering
- stop/yield at selected intersections
- speed limits by road type
- spawn/despawn around player radius
- collision separation
- never spawn directly on player
- mission van can reserve a route/parking spot

Use `04_traffic_and_street_ride_map.png` for route behavior reference.

Add vehicle customization only after the core world is stable; use `05_vehicle_customization_garage.png` as future/UI reference.

---

# 8. CAMERA — THIRD-PERSON GAME, NOT FLOATING WALLPAPER

Third-person camera goals:
- smooth spring follow
- player framed in lower-center third
- camera follows world movement with slight lag
- camera can rotate independently
- collision/obstruction handling so it does not pass through buildings
- short zoom-in for interactions
- basketball camera gets its own tuned framing
- camera shake is event-based and subtle

Do not rotate Benji's facing merely because the camera rotates.

First-person can remain optional, but third-person is the primary experience.

---

# 9. INTERACTION SYSTEM — MAKE IT PHYSICAL AND CONTEXTUAL

Interaction prompts should never look like random floating UI disconnected from the target.

Implement:
- interaction radius
- nearest valid interactable selection
- line-of-sight/occlusion check when practical
- prompt anchored near the target using world-to-screen projection
- hide prompt when out of range
- target highlight/ring only at close range
- gamepad / keyboard / touch button glyph from active input device

Examples:
- K Blanco: `E TALK TO K BLANCO`
- van: `E SECURE THE DROP`
- store display: `E BROWSE`
- court: `E PLAY 901 COURT`

Do not show two prompts for the same target.

---

# 10. BASKETBALL — REBUILD IT AS A REAL GAME MODE

The court must not be a static image containing a baked player, ball, shot arc, spectators, or scoreboard.

Use actual world pieces:
- textured court plane from the court materials
- hoop/backboard/rim geometry
- Benji as the actual player
- separate basketball entity
- spectators as NPCs
- score HUD only once

Basketball state machine:
- free movement inside court bounds
- pickup/possess ball
- dribble state
- charge shot
- release shot
- ballistic arc
- rim/backboard collision
- swish/make detection
- miss/rebound
- score update
- shot clock/session timer if enabled
- reset only after play resolves

Shot system:
- hold input to charge
- ideal green window with skill timing
- distance modifies target power/window
- optional slight aim assist on touch/gamepad
- perfect release gets satisfying sound/flash/rumble

The ball must originate from Benji's hand position, not from a baked background coordinate.

Do not duplicate Benji.

---

# 11. MISSION LOGIC — NO SOFTLOCKS

The Drop Day campaign should be a proper finite-state mission system.

Each mission step needs:
- unique ID
- start condition
- target
- completion condition
- reward
- one-time reward guard
- next step
- save persistence

Do not advance a mission from simply entering a scene unless that is the actual objective.
Do not allow interaction spam to duplicate rewards.

Recommended mission progression:
1. Meet K Blanco at HQ.
2. Secure the drop van / new drop.
3. Deliver or stage the first drop.
4. Move through downtown / culture district.
5. Meet mission contact / crew.
6. Visit or play 901 Court.
7. Return / collect / shop / upgrade outfit.
8. Final merch delivery / Drop Day completion.

Make every step recoverable after save/reload.

Create a mission debug menu in development builds only so each state can be tested.

---

# 12. SAVE / ECONOMY / WARDROBE

Persist at minimum:
- mission state
- SackDollars
- Respect
- owned apparel
- equipped apparel
- trophies
- basketball high score
- world time if needed
- settings
- last safe spawn / location

Never respawn player inside geometry.

Economy rules:
- purchases are atomic
- cannot spend below zero
- cannot buy same item twice unless it is intentionally consumable
- rewards are idempotent

Wardrobe must actually alter Benji visually (at least color/layer/sprite variant) rather than only adding a tiny HUD dot.

---

# 13. GAME FEEL / WORLD LIFE

Add independent ambient life:
- moving cars
- walkers
- seated NPCs
- cyclists/skaters where suitable
- storefront lights
- window glow
- subtle tree sway
- birds/particles only if cheap
- traffic signals
- puddle/wet-surface variation in rain
- mission-specific crowd density
- court spectators who react to makes

Audio zones:
- city ambience
- traffic
- boutique interior hum/music
- court bounce/crowd
- rain when active
- UI cues

Do not make the world noisy just for the sake of noise. Every ambient system must have a performance budget.

---

# 14. INPUT / MOBILE / GAMEPAD

Support and test:
- keyboard WASD + E + Shift + Esc
- gamepad analog movement + interact + sprint + pause
- touch virtual stick + contextual action button

Input device should switch automatically based on last-used device.
Prompt glyph should match device.

Mobile requirements:
- safe areas
- orientation handling
- no text cutoffs
- no tiny buttons
- cap DPR and expensive effects
- preserve playable 30-60 FPS on mainstream devices

---

# 15. UI QUALITY

The UI visual target is the gameplay reference set:
- dark translucent panels
- SackReligious green accent
- warm gold for court/rare/important highlights
- clean typography
- minimal but premium
- no giant opaque debug boxes

HUD layers should never overlap duplicate data.
Use one scoreboard, one mission panel, one minimap.

Opening, mission, map, shop, basketball, pause, and wardrobe should all feel like the same game.

---

# 16. PERFORMANCE / ARCHITECTURE

Do not rebuild all world objects every frame.
Use:
- cached geometries/materials
- texture cache
- object pools for traffic/peds/particles
- fixed or semi-fixed simulation step
- render interpolation where useful
- delta-time clamp after tab switching
- frustum/distance culling
- LOD for distant NPCs/cars
- dispose resources on teardown

Target:
- desktop: 60 FPS where possible
- mobile: stable 30+ FPS

Three.js renderer:
- cap pixel ratio (desktop <= 2, mobile preferably <= 1.5)
- shadows limited to important lights
- avoid dozens of shadow-casting point lights
- use emissive materials for most window/sign glow

---

# 16A. SPLIT-PACK COMPLETENESS GATE

Before final QA, verify all eight archive parts have been extracted and the following representative files exist:
- `00_OPENING/03_USE_THIS_opening_final_dollar_S_arched_SackReligious_Klothing.png`
- `01_GAMEPLAY_REFERENCE/05_901_court_sunset_gameplay.png`
- `02_MATERIAL_SKINS_SET1/01_asphalt_basecolor.png`
- `03_MATERIAL_SKINS_SET2/11_chain_link_fence.png`
- `04_CHARACTER_MAPS/02_Benji_character_map.png`
- `04_CHARACTER_MAPS/03_K_Blanco_character_map.png`
- `05_VEHICLE_MODELS_AND_SKINS/03_drop_van_delivery_set.png`
- `06_SCENE_REFERENCES/sunset_streetball_at_901_court.png`
- `07_EXISTING_GROK_PUBLIC_GAME/benji-left-norm.png`
- `07_EXISTING_GROK_PUBLIC_GAME/benji-right-norm.png`
- `08_ORIGINAL_UPLOADS/` contains source artwork

If one is missing, identify the missing part number and stop the asset-integration phase instead of fabricating a replacement.

---

# 17. DEPLOYMENT / QA — DO NOT SAY DONE UNTIL THIS PASSES

Run:
```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Then run the game and visually inspect it.

Create Playwright smoke tests for at least:
1. title loads
2. Enter Memphis works
3. player moves left/right/up/down
4. left/right facing is visually correct
5. K Blanco interaction opens dialogue
6. first mission step completes once
7. van objective can complete
8. court loads without duplicate Benji/background player
9. basketball shot can resolve to make/miss
10. save, reload, continue restores state
11. resize/mobile viewport does not break HUD

If tests reveal a bug, fix it before handing back the workspace.

For production/Vercel:
- confirm direct URL load works
- confirm refresh works
- no missing asset 404s
- asset paths are absolute/public-safe
- production console has no uncaught errors
- add PWA manifest/service-worker only if it is stable and does not cache broken versions

Use `docs/DEPLOYMENT_CHECKLIST.md` as final acceptance criteria.

---

# 17A. DEPLOYABLE-GAME HARDENING

Before release, also implement or verify:
- a first-run loading screen with progress and asset-error fallback
- pause/settings menus with audio, sensitivity, graphics quality, fullscreen and control help
- a safe-spawn system that can recover from invalid saved coordinates
- mission checkpoint recovery and a development-only reset-state tool
- deterministic reward guards so retries never duplicate currency/respect
- proper collision layers for player / NPC / traffic / mission props / basketball
- touch-safe UI hit targets and gamepad focus navigation
- a performance-quality preset (Low / Medium / High / Auto)
- capped device pixel ratio and reduced shadow/NPC/traffic budgets on mobile
- asset preloading by scene rather than loading the entire city at startup
- graceful image/texture fallback with console warnings instead of a crash
- no debug labels, placeholder stick figures, duplicate Benjis, duplicate HUD panels, or baked gameplay UI in shipping scenes
- basic accessibility: reduced-motion option, readable contrast, remappable or clearly documented controls, subtitles for important dialogue if audio is added
- title-to-game transition, pause/resume, game over/retry where applicable, save/continue, and clean return-to-title behavior
- production error boundary around the React game shell
- versioned save schema with migration/default handling so updates do not brick old saves
- no uncaught promise rejections or missing-asset 404s in a production build

---

# 18. REQUIRED FINAL HANDOFF

When you finish, give me:
1. a concise changelog
2. exact files changed
3. exact asset paths used
4. test results (`typecheck`, `lint`, `build`, Playwright)
5. known limitations, if any
6. a downloadable ZIP of the upgraded workspace

Do not claim something is fixed unless you actually verified it in the running build.

The final experience should feel like a coherent **$ackReligious KLOTHING Memphis open-world game**, not a slideshow with a sprite moving over screenshots.
