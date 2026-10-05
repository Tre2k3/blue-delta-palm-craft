# Astra Drop Day — completed functional route

Date: 2026-10-05. Repository: `Tre2k3/blue-delta-palm-craft`.
Branch: `feat/astra-production-rebuild`; base: `feat/halloween-after-dark` at `3c89d942c7748c10a8a5823b92865a151590f61f`.
Draft PR #10; no merge or release.

## Result and scope

This continuation closes the interrupted functional Drop Day route: New Game/home → streets → physical HQ → K Blanco → van pickup → neighborhood/downtown/culture deliveries → 901 Court → eight earned points → return to K → completion reward → outfit purchase → Continue with persisted progress.

It retains the preceding physical HQ/shared-anchor implementation and the Character Bible identity decision. Existing assets, shot grading, ownership and seasonal room navigation remain in place. Commercial reference fidelity, all city activities and target-device release acceptance remain later milestones.

## Corrections in this continuation

- Physical active delivery/pickup handoffs now outrank overlapping advertisements and activity POIs within their existing interaction radius. Arrival does not grant a reward; E/TAP still completes the handoff. The Neighborhood billboard had intercepted the first delivery.
- Leaving basketball settles a court session only while that session is active. A stale second leave call cannot award the score payout again.
- The court traffic guard now chooses actual clipped lanes, clamps the car into the selected segment and clears an obsolete turn. The old guard assigned `FRONT ST:south/north` IDs even though those roads were split into suffixed segments; the engine could no longer route those cars.
- Traffic diagnostics count actual completed engine turns. A car traversing an intersection is checked against roadway/blockers and its destination, rather than lateral distance from the lane it is leaving. Race actors retain their separate route.
- Wardrobe content uses a bounded vertical scroller, shrinkable cards and wrapping product text. Item names and purchase controls fit both desktop and portrait widths.
- Legacy smoke boot follows New Game/Continue and opts into existing QA diagnostics. Court smoke selects PLAY from the actual court menu. Screenshots contain the real rendered frame; capture failures fail the suite, with no placeholder fallback. Camera settling uses draw calls without advancing gameplay.
- The mission suite delegates to the continuous connected route instead of teleporting and injecting the court score. CI runs this route once and verifies all twelve mission captures plus pixel variance.

## Validation

Implementation commit: [`83f17c24`](https://github.com/Tre2k3/blue-delta-palm-craft/commit/83f17c24be627d56767681df8f4767f5bbd0ec68). Final source and browser harness: [`7bc87e73`](https://github.com/Tre2k3/blue-delta-palm-craft/commit/7bc87e73bc9a77df14c5b35f422621763111dcea). The following documentation commit changes only reports.

Local validation used the locked `npm ci` dependencies, the production build/preview and Chromium 153 with software WebGL. Hosted workflow status and downloadable CI evidence are linked in [draft PR #10](https://github.com/Tre2k3/blue-delta-palm-craft/pull/10).

| Check | Local result |
| --- | --- |
| Typecheck and production build | Passed |
| Lint | Passed: 0 errors, the same 4 baseline warnings |
| Foundation safety | Passed: movement/sprint/jump, max charge, interruption, controller neutral rearm, solid/water save recovery, both seasons and viewport bounds |
| Full connected Drop Day | Passed, including three paid-once deliveries, eight earned court points, real late miss/loose ball/Court OG recovery, single court payout, return reward, outfit purchase and Continue |
| HQ/commerce | Physical doors and K actor, showroom thumbnails, explicit commerce confirmation/cancel and interior save/reload passed |
| Shop widths | No horizontal scroller overflow at 1280×800 or 390×844 |
| Halloween mobile browser | Home → HQ → physical K anchor → DOM touch pointer interaction passed |
| Game smoke | Passed with court menu → PLAY |
| Traffic smoke | Passed: legal lane population/turns and court exclusion over 60 simulated seconds; wider traffic acceptance remains open |
| DOM visual smoke | Passed at desktop and portrait widths |
| Screenshot pixel checks | Passed for all 20 top-level captures, including the twelve required mission scenes |
| Connected runtime/assets | Zero uncaught/hydration errors and zero HTTP asset failures |

The final combined production run returned `traffic=0 slice=0 game=0 dom=0 frames=0`. Foundation safety also passed separately. The CI workflow repeats every suite against the pushed source.

The connected route drives shared movement through normal engine updates and collision, with controlled simulation frames and actual keyboard/DOM interactions. It does not assign position, score, mission progress or rewards; it does not use warp or noclip. The repeated court-leave call is a deliberate idempotence regression check. Foundation safety and legacy location smoke use their existing QA probes separately.

The delivery route walks between locations after exercising van pickup, steering and parking. It does not certify driving every delivery or human controller/touch acceptance. Software Chromium rendering and accelerated simulation are functional evidence, not a frame-time benchmark.

## Evidence and remaining gates

The suite writes twelve required mission PNGs in `artifacts/`, additional connected captures in `artifacts/connected-slice/`, and checkpoint/HTTP-failure JSON. CI uploads the bundle as `sackreligious-qa`. Reviewed scenes include the HQ actor and doorway, delivery handoffs, court, return reward, wardrobe and restored outfit. Screenshots establish functional presentation only; repeated street branding, court presentation and the unfinished reference HQ floor plan still need art/layout work.

The previous [connected HQ checkpoint](ASTRA_CONNECTED_SLICE_QA.md) remains historical evidence, including its red legacy-CI result. This continuation supersedes its open court-completion/return/purchase/reload gates once final validation below is recorded.

Still open: the full reference HQ floor plan/rear loading entrance and camera zones, dependable production street corridors and broader traffic/intersection behavior, all activity locations, Halloween room puzzles, complete character animation coverage, physical mobile/controller acceptance, safe areas and target-device frame-time/memory/load budgets. A short traffic smoke is not commercial traffic signoff.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm run lint
npm run build
npm run preview
```

In another terminal:

```sh
export GAME_URL=http://127.0.0.1:8080/
export SMOKE_HEADED=0
npm run test:foundation
npm run test:slice
npm run test:smoke
node scripts/traffic-smoke.mjs
node scripts/dom-smoke.mjs
node scripts/qa-frames.mjs artifacts
```

`npm run test:mission` invokes the same full route. Foundation/slice start Vite automatically when `GAME_URL` is omitted. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an installed compatible Chromium. Read-only production snapshots require `?qa=1`; the browser harness also opts into the existing `hauntdebug` engine probe.
