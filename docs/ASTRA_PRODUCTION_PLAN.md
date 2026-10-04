# $ACKRELIGIOUS: MEMPHIS — incremental production plan

Base: `feat/halloween-after-dark` at `3c89d942c7748c10a8a5823b92865a151590f61f`.
Working branch: `feat/astra-production-rebuild`. Do not merge.

## Preserve first

Canonical Benji and female K Blanco, directional art, separate equipment, wardrobe ownership, mission/economy rewards, current shot grading, haunted-room doorway graph and seasonal saves. Keep existing integrity installers until their exact responsibilities have been migrated and regression-tested. Do not add prototype patches, `@ts-nocheck`, boot side effects or V-number runtime layers.

The production references control identity and layout. Their master boards are design inputs; author geometry, navigation, lighting, collision and interactables to reproduce them. They are not full-screen gameplay substitutes. Character Bible overrides conflicting UI/concept characters.

## Architecture approach

Use the existing engine as the orchestrator, extract small typed pure contracts, and explicitly call them from the current lifecycle. Keep gameplay coordinates stable while centralizing the conversion to rendered units. Retain existing asset maps while giving core boot assets stable catalog IDs and observable success/failure. Do not migrate all paths or all engine state in one commit.

Gradually separate: player movement/visuals; world topology/collision; traffic routing/state; location/door anchors; activity state; mission/economy/save; input actions; HUD presentation. No parallel environment rebuilds before the primary slice passes.

## Milestones and gates

| Milestone | Scope | Acceptance before completion |
| --- | --- | --- |
| 0 — audit | Repository/branch comparison, all reference ZIPs, source/runtime/build baseline | Audit and plan exist; observed vs source-only findings distinguished |
| 1 — foundation safety | Scale/catalog, shared input reset, shot timeout, safe persisted position, seasonal SSR, gated diagnostics | Build/type/lint; real key events, interruption/release, max hold, invalid save recovery, both seasons, mobile viewport |
| 2 — primary connected slice | Home → streets/traffic → HQ → K Blanco → delivery → court | Continuous traversal, blocked solids, correct face directions, visible NPCs, interact/payout/save and valid physical entrances |
| 3 — street/traffic production | One street corridor with lane graph/tangent turns/stop lines/static blockers/parking | Multiple cars/curves/intersections, headings agree with actual velocity, no penetration, debug bounds and transitions |
| 4 — HQ production | Reference floor plan, front/rear doors, sales/cashwrap/fitting/office/storage, delivery anchor | Walkable reference layout, door-specific return, camera zones, collisions matching furniture, shop/outfit persistence |
| 5 — city life | Named canonical mentors, ambient routes and anchor density | Pedestrian/K Blanco/Court OG approach, visible character cutouts, no blank cards, no blocked paths |
| 6 — activity locations | River/dock, bowling, race/start/meet and food zone | Authored entrances/anchors, independent equipment, geometry aligned to state, reward/save correctness |
| 7 — progression/UI/mobile | Remaining mission/economy split, inventory/map/phone/wardrobe, compact HUD | Real device mode prompts, touch targets/safe areas, 390×844 plus landscape, controller mappings, reload ownership/progression |
| 8 — seasonal/presentation | Halloween + 901 Day overrides, location intros, lighting/VFX/audio | Same base layout/solids, no room return regressions, no gibberish signage, daytime/nighttime evidence |
| 9 — performance/release QA | Profile target hardware, optimize measured bottlenecks | Frame-time/memory/load budgets plus all mandatory acceptance scenarios; no unresolved build/type errors |

## Exact first changes

1. Introduce `worldScale.ts` with existing 16 gameplay pixels per render unit and 1.78-unit Benji height; consume in current conversion, card height and interior furniture math. This formalizes existing behavior, not a mass rescale.
2. Move the boot asset map into a typed `assetRegistry.ts`, merge wardrobe/action entries through existing catalogs, and record loaded/missing IDs at the actual load path.
3. Fix `InputManager` lifecycle to clear keyboard/touch/gamepad/queued state on blur and hidden document; require held actions to return neutral before rearming after interruption; remove anonymous bind listeners; wire advertised controller sprint.
4. Keep `releaseShot()` as the shot owner. At maximum charge call it once; maintain tap/hold/release behavior and let normal ball flight/rebound/reset handle the outcome.
5. Validate restored/saved positions using the installed collision implementation at grounded scale; recover through a nearby valid location or safe home spawn. Preserve other save fields and reward idempotence.
6. Render the default season identically on server and initial client, then apply the query override after mount. Add pointer-lost-capture release for shared hold buttons.
7. Add gated read-only diagnostic snapshots directly from `GameEngine`; never expose new production cheats or an always-visible debug HUD.

## Testing and evidence

Keep separate audit and implementation commits. The foundation regression should exercise the actual browser engine, not duplicate its arithmetic. Check W/A/S/D, sprint, stop/start, real held shoot and lost release, touch interruption, maximum hold, invalid solid/water save, owned/equipped preservation, everyday/Halloween hydration, portrait/landscape bounds and normal-play debug gating.

Retain existing game/mission/commerce/save/traffic smoke suites as appropriate; some old scripts assume a previous title-button flow or removed diagnostics and may require harness maintenance before their assertions are valid. Do not replace failures with screenshot placeholders and call that visual proof.

Capture real PNGs for baseline and changed scenes. Performance measured in software-rendered QA is diagnostic only. Later gates require actual mobile/controller testing; no fabricated hardware signoff.

## Next slice scope

After foundation safety, improve **one** physical connection and corridor at a time. First use home exit, an authored safe sidewalk route, HQ entrance/K Blanco, the delivery pickup/drop interactions, and court entry/shot/rebound. Compare its street and HQ materials with the supplied boards. Apply accepted contracts to other locations only after this route works and looks coherent.

Every checkpoint reports the base/head commit, files changed, tests/evidence, known gaps and next measurable milestone. The target remains commercial polish; no checkpoint equates this foundation pass with completion of the full game.
