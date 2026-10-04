# $ACKRELIGIOUS: MEMPHIS — production audit

Audit date: 2026-10-04. This is a production entry audit, not a release certification.

## Repository and preservation decision

- Game: `Tre2k3/blue-delta-palm-craft`.
- Production branch: `feat/astra-production-rebuild`.
- Base: `feat/halloween-after-dark`, `3c89d942c7748c10a8a5823b92865a151590f61f`.
- Reference authority: private `Tre2k3/SackReligious-Game/reference-packs/`.
- Main was `cb27a2a620dcdf9ccd79669a0c7b5949a77fff7f` when inspected.
- No merge into main or any existing feature branch is authorized by this work.

The Halloween branch is the newest functional-content line: its October 1–3 changes include physical haunted-room traversal, doorway returns, room illumination, foreground occlusion, and the missing court texture. It retains the production RC, commerce, apartment/HQ, character, traffic and activity modules. Resetting to main or the old V8 branch would lose that content.

Important ancestry caveat: Halloween is **not** a descendant of every other feature branch. The September 21 Codex upgrade and September 23 sprite/vehicle and Claude racing branches contain separate changes. Similar behavior in exported source is not proof that those commits are integrated. Review those diffs individually before selectively importing improvements. Do not merge these branches blindly.

## Evidence and baseline

Installed exact locked dependencies with `npm ci --no-audit --no-fund`.

| Check | Baseline result |
| --- | --- |
| `npm run build` | Passed, including preflight and local migration skip |
| `npm run typecheck` / `tsc --noEmit` | Passed |
| `npm run lint` | Passed with 0 errors, 4 warnings |
| Literal `/game/` asset paths in game source | No missing literal files found; computed URLs require runtime inspection |
| Browser load | Actual Chromium browser loaded the game and exposed engine/test hooks |
| Visual inspection | Home, downtown, HQ area, court, riverfront and bowling captured; additional gameplay acceptance remains pending |
| Everyday-city override | Reproduced React hydration mismatch with `?season=none` |
| Full gameplay/certification | Not complete; no claim that all activities, controller hardware or mobile performance pass |

Existing lint warnings: missing `yielded` effect dependency in `GameApp.tsx`; unused local in `chroma.ts`; unused import in `commerce.ts`; unused parameter in `riverDetailPass.ts`.

Browser QA required a scratch-only test browser because the usual browser download returned an invalid archive. Vite bound to loopback for this environment because enumeration of network interfaces fails when binding all interfaces. These are test-environment limitations, not game-source fixes. Do not change deployment configuration to work around them.

## Current architecture and rendering

React 19, TypeScript, TanStack Start/Router, Vite 8, Tailwind 4 and Three.js. Main route lazily mounts `GameApp`, which creates `GameEngine`; `World3D` extends `World3DCore`. Gameplay uses pixel coordinates, rendered into Three.js X/Z coordinates at `S = 1/16`. A canvas overlay renders prompts, markers and activity effects; React renders menus and HUD.

`engine.ts` is approximately 5,100 lines, `GameApp.tsx` 2,400 and `world3dCore.ts` 2,400. A large amount of behavior remains coupled to these classes.

Eleven installer calls in `src/routes/index.tsx` modify engine/world prototype methods for gameplay integrity, apartment layout, interior collision, hazards, court, environment, river detail, sanitation, vehicles and visual detail. They already affect active collision, saves and camera behavior. Preserve their observable behavior while migrating responsibilities into explicit modules in small reviewed steps. **Do not add another prototype wrapper or side-effect boot patch.** Do not remove them all at once.

Protected integration surfaces: auth, database, multiplayer, migrations and deployment configuration. This first milestone does not redesign them.

## System audit

| System | Current implementation and useful foundation | Repair / verification needed |
| --- | --- | --- |
| Player | `CharacterController` acceleration, deceleration, turn smoothing, jump, locomotion states; `PlayerCharacter` cutout cards | Verify visual A-left/D-right/W-back/S-front using real key events at multiple camera headings; validate run/action assets per outfit |
| Grounding | Feet pivot, yaw-only billboard, native aspect calculations, single visible card | Confirm feet/contact through activities, rooms and all outfits; no new character redesign |
| World | Continuous 64×48 tile city, named POIs, explicit street definitions, river exclusion and piers | Runtime is much simpler than reference targets; repeated slab buildings and striped green ground need production materials and depth |
| Collision | Rect/circle tests, building shells, street blockers, interior furniture and river/court exclusions | Collision state depends on installed wrappers; ensure visible layout and blocker footprint use one source; save positions do not currently check solids |
| Traffic | Clipped lanes, per-car lane ID, stop-line phasing shared with visual signals, following distance, controlled turn targets | Turn movement interpolates position and velocity separately; verify actual path tangent, blockers throughout turns, vehicle bounds and lane endpoint recovery; race mode relocates civilian cars abruptly |
| NPCs | `spawnCityPeds`, sidewalk routes/jobs, independent named NPCs and prepared transparent character textures | Pedestrians visible in baseline street images; density, adult scale, approach/dialogue and missing-art fallback still need acceptance; dead crowd helper includes solid-color card fallback |
| Camera | Third-person follow, ray-based obstruction adjustment, interior and activity overrides | Baseline shows a large change in framing between home and city; validate continuity and line of sight; no wholesale camera replacement yet |
| Basketball | Separate ball state/mesh; possession, dribble, charge, release delay, airborne path, scoring contact, bounce and return; existing shot grading | Charge is clamped at 1 but does not auto-release; missing focus/touch release can remain active; retain shot decision and animation behavior while repairing release safeguards |
| Fishing | Separate state module, casting, bite, reel/tension, depth-weighted fish tables, catches, payout and cooler | `startFishing()` accepts current coordinates; current shoreline activation is broader than the explicit authored spots required by the pack; confirm separate equipment and catch visuals |
| Bowling | Separate ten-frame scoring/state, pin status, power/hook, gutters, payout; lane constants shared with rendered geometry | Existing skill-based pin resolution is not rigid-body pin physics; preserve scoring, verify state/geometry alignment, full tenth-frame rules and release recovery |
| Racing | Authored east-side route and checkpoints, countdown, cruise/cues, rival, lap and reward state | Preserve route/mission behavior; compare separate Claude branch; verify collision-free samples, tangent-consistent visuals and traffic restoration after race |
| Wardrobe | `outfitSprites`, `basketballSprites`, compositor and lookup/fallback modules; equipped and owned apparel saved | Verify action packs bypass normal compositing; ensure no double clothes, identity changes, mirrored text or black plates |
| Economy / missions | Engine-owned money, Respect, ownership, stable step IDs, idempotent completion, Drop Day and After Hours | Preserve current rewards; further separate state from UI; confirm deliveries require interactions and payout does not duplicate on reload |
| Save/load | v3 localStorage with v2/v1 migration, outfit/economy/mission/cooler/seasonal puzzle persistence; additive saved position/autosave wrapper | Position validation only checks finite numbers and outer bounds, not solids; world hour resets to start on load; discovery and activity resume contracts are incomplete |
| Input | `InputManager` emits shared movement/action state across keyboard, gamepad and touch | Blur clears only keys; touch/gamepad/queued actions can survive interruption; no visibility reset; gamepad prompt advertises Y sprint but pad sprint is never assigned; radial stick values can exceed unit range |
| Mobile | Touch stick/action buttons, pointer capture/cancel, safe-area padding, reduced rendering quality and responsive menus | Add lost-capture release; verify 390×844 and landscape input, actual touch targets and menu fit; no hardware FPS claim from software-rendered browser |
| UI | Black/gold/green HUD, mission tracker, minimap, map/pause tabs, wardrobe, shop, dialogue, activity overlays | Production pack is reference, not artwork to paste over game; UI art contains an incorrect male K Blanco that Character Bible explicitly overrides |
| Buildings/interiors | Physical apartment, HQ and bowling volumes; interior/exterior visibility; haunted-house rooms have normalized walk bounds and authored doorway graph | HQ needs production room topology, rear loading entrance and door return contract; boutique currently shares the HQ concept and is not a separately productionized full location |
| Seasonal | Query override/default Halloween layer, shared lighting and activity variants, room puzzles and completion save | Query-dependent `halloweenOn()` in SSR JSX causes hydration mismatch; preserve room navigation and reversible base geometry |
| Asset loading | Central maps for city art/materials/outfit packs, boot sprite map inside engine, graceful optional-load catches, cutout cleaning | IDs/paths split across modules, missing loads silently swallowed; introduce catalog and load status before replacing visuals |
| Performance | Quality/DPR limits, auto quality downgrade, texture reuse and basic distance considerations | Many geometry/material objects and large eager sprite boot; measure real device CPU/GPU, draw calls, textures, memory and frame-time before claiming console/mobile quality |

## Dead code and placeholders

- `WorldLifePass.ensureCourtCrowd()` is not called by active post-sync; its fallback creates colored planes, and the crowd is hidden. Do not revive that fallback as production NPC art.
- Separate traffic approach/destination helpers in world-life mirror engine/topology rules but the active pass now counts/lights traffic rather than owning movement. Consolidate only after confirming callers.
- Simplified procedural car rigs, building shells, block furniture, minimap districts and repeated material treatments remain visual placeholders relative to the supplied boards.
- No evidence that all activity mentor identities (Unc J, Nitro, Strike, Mama Dee) are implemented in their canonical roles. Generic NPC substitutions are not completion.
- Some older docs refer to PNG runtime frames where active loading uses WebP. Update documentation alongside registry migration.
- No deletion based only on a keyword search: verify imports/callers and dynamic use first.

## Reference inspection

All eight ZIPs downloaded from the authenticated repository contents and opened successfully. Their implementation docs and **126 images** were reviewed through per-pack contact sheets. References stay outside runtime assets; no concept board is used as an entire playable environment.

| Pack | Image count | Implementation authority / mapping |
| --- | --- | --- |
| Character Bible | 18 | Benji canonical body/face, separate wardrobe, canonical female K Blanco; maps to character/outfit/NPC modules |
| Console Quality Concepts | 6 | Target density, composition, depth and lighting for all activities; currently a large visual gap |
| World & Buildings v1 | 26 | Geometry/layers, entrances, district relationships, haunted rooms and seasonal reuse |
| HQ v1 | 21 | Front/rear access, showroom/cashwrap, fitting area, office/storage/restroom; existing HQ is incomplete against this topology |
| Vehicle & Street Systems v1 | 13 | Six vehicle identities, road markings, lane/heading/static collision/intersections/parking; preserve civilian vehicle variety |
| Gameplay Props & Items v1 | 13 | Independent equipment, stable object IDs, interaction/pickup and collider ownership |
| UI/HUD v1 | 16 | Shared state with device presentation, safe areas, center clearance and typography; reject its conflicting male K Blanco image |
| Activity Locations v1 | 13 | Entrance/return anchors, walk/collision/camera/activity/save contracts for each location |

Damaged source image: `SackReligious_HQ_Production_Reference_Pack_v1/03_Interior_References/12_management_office.png` is truncated. It partially decodes with permissive loading and has a missing lower region. Use the undamaged HQ master boards for office layout; do not treat this file as a runtime texture. ZIP file sizes matched repository metadata; other 125 images strictly decoded.

## First implementation milestone

Production foundation safety: centralized scale/boot asset catalog, load diagnostics, interruption-safe shared input, maximum-charge shot release, collision-aware saved spawn recovery, and deterministic seasonal first render. Add dev/QA-only read-only diagnostics directly at the engine lifecycle. No new patch layer, engine rewrite, character redraw or location mass-rebuild.

First files: `worldScale.ts`, `assetRegistry.ts`, `input.ts`, `engine.ts`, `playerCharacter.ts`, `world3dCore.ts`, `gameplayIntegrity.ts`, `GameApp.tsx`, `types.ts`, and a focused foundation regression script. Preserve the current route installers.

## Risks and remaining acceptance

1. Divergent branch improvements need explicit source comparison before transplanting.
2. Existing prototype order is a regression risk; new foundation functions must be direct calls.
3. Software-rendered browser timings are not representative of phones/consoles.
4. Reference assets are concepts/crops, not production models or animation-ready rigs.
5. The current app remains a web game. Console-style input does not imply console certification, packaging or distribution.
6. All manual movement/NPC/activity/traffic/building/mobile/save checks in the supplied brief remain release gates. Passing build alone does not satisfy them.

## Run and review

The checked-in scripts remain `npm ci`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`. In an ordinary supported development environment, existing smoke suites target `GAME_URL` or the default development server. Use `?season=none` for everyday Memphis and `?season=halloween_2026` for Halloween. Preserve both variants through every milestone.

Review this branch against **its Halloween base** for a small foundation diff; comparing directly to main also shows all existing unmerged content.
