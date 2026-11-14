# Astra connected HQ — verification checkpoint

Date: 2026-10-04. Repository: `Tre2k3/blue-delta-palm-craft`.
Branch: `feat/astra-production-rebuild`; target: `feat/halloween-after-dark`. Draft PR only; no merge.

Base: `3c89d942c7748c10a8a5823b92865a151590f61f`.
Preceding foundation checkpoint: `3e77c467561fec35ddfb563cb425517d7c40d414`.
Implementation: `abe4b80409d7cf513370f2e6fb097523221bba56`.
Verified source and browser harness: `30ba1718367c80217ad61781c7b58beaba83add8`.

## Result

Physical HQ entry, K Blanco briefing, showroom, three delivery interactions and court shot/recovery pass through the real engine. This is an incremental functional checkpoint, not the full production visual, traffic or release gate.

The forced HQ ejection and automatic doorway storefront handoff are removed. Door, furniture, K Blanco and showroom anchors are shared by rendering, collision and interaction. The exterior shell gives way to the interior while the player is inside. The floor and actor baselines agree; one canonical female K Blanco desk actor is visible. Her repaired cutout preserves black clothing and comes from the Character Bible; see [asset provenance](ASTRA_K_BLANCO_ASSET.md).

The showroom opens the virtual wardrobe. “Open real store” explicitly opens the existing commerce confirmation; cancelling keeps the player in HQ. Nine product paths now point to their actual WebP assets. The nearby Culture Spot takes interaction priority over the broad riverfront fallback, so its delivery can complete at its physical location.

## Verification

[Production-build CI run](https://github.com/Tre2k3/blue-delta-palm-craft/actions/runs/37234385220) tested the exact source checkpoint above. Both new browser suites passed against the built production preview, using Chromium and software WebGL.

| Check | Result |
| --- | --- |
| Locked dependency install | Passed |
| Typecheck | Passed |
| Lint | Passed: 0 errors, same 4 existing warnings |
| Production build | Passed |
| Foundation safety | Passed |
| Connected HQ route | Passed |
| Everyday traversal | New Game → home exit → authored sidewalks → front HQ door → K Blanco → showroom → same exit |
| Interior solids | Bed and checkout counter blocked; apartment and HQ door lanes remained open |
| HQ interaction | Prompt agreed with K's physical anchor; real interact opened dialogue and advanced to pickup |
| Virtual/real commerce | Local thumbnails loaded; showroom opened wardrobe; explicit real-store confirmation could be cancelled |
| HQ save/reload | Position remained inside; pickup progress, equipped outfit and dollars preserved |
| Van | Actual pickup interaction entered van; forward A/D steering changed yaw with the correct chase-camera sign; parking returned on foot |
| Deliveries | Neighborhood, downtown and culture interactions advanced and paid once; arrival alone did not pay; repeat interaction did not duplicate dollars |
| Court | Physical approach → court menu → PLAY; hold/release produced one shot; normal flight/recovery restored separate-ball possession |
| Maximum-charge court shot | Released once; normal flight/bounce/recovery restored possession |
| Halloween/mobile browser | Fresh 390×844 mobile/touch context walked home → HQ → K; DOM touch pointer interaction opened dialogue |
| Runtime/asset errors | No uncaught/hydration errors or HTTP asset failures in the connected suite |

The route uses real engine movement and shared input with controlled simulation frames. It does not write player positions, scores, mission steps or rewards, and does not use QA warp or noclip. Test navigation favors existing sidewalks and waits for moving traffic. This is deterministic functional coverage, not a live human playthrough or performance benchmark.

## Overall CI remains red

The same run subsequently failed the existing `Game smoke` suite at `court interact enters basketball`: its snapshot remained in world mode with the `E · After Dark hoop` prompt. That script expects a direct transition; the new route instead explicitly chooses PLAY in the physical court menu and passes. The legacy suite also logged screenshot timeouts. Its assertion/harness needs reconciliation before the complete workflow can be called green.

Previous runs [37219978248](https://github.com/Tre2k3/blue-delta-palm-craft/actions/runs/37219978248) and [37233568007](https://github.com/Tre2k3/blue-delta-palm-craft/actions/runs/37233568007) already failed the same legacy suite, earlier at the ENTER MEMPHIS click timeout. The latest failure is different; this report does not attribute every legacy failure to that prior timeout.

Because the workflow stops after Game smoke, its later traffic, mission, DOM visual and pixel-variance steps were skipped. Uploading QA evidence succeeded. No full-workflow pass is claimed.

## Evidence

The run's [sackreligious-qa artifact](https://github.com/Tre2k3/blue-delta-palm-craft/actions/runs/37234385220/artifacts/11314779717) contains:
- `connected-slice/home.png`
- `connected-slice/hq-exterior.png`, `hq-interior.png`, `k-blanco.png`
- `connected-slice/neighborhood.png`, `downtown.png`, `culture.png`
- `connected-slice/court.png`, `court-max-charge.png`
- `connected-slice/halloween-hq-mobile.png`
- `connected-slice/checkpoints.json`, `failed-responses.json`
- Foundation portrait, landscape and HQ approach captures

Artifact SHA-256: `52105bb75c83558f57507841ce5f078dec946f12e10abf13849551d0ddf2c983`. GitHub retention expires 2027-01-02; rerun the checked-in suites to reproduce after expiry.

The screenshot helper advances the actual engine update/draw camera path, submits the final real WebGL frame, then copies that frame in place before the drawing buffer is discarded. The HUD is captured from the page. Earlier update-only accelerated navigation left the render camera behind, so earlier unsynchronized phone/court captures were superseded. Final synchronized images were produced in CI; this checkpoint does not claim a complete visual review of that final image bundle.

## Remaining gates

Live civilian traffic can move into an on-foot road position and block the walker. The sidewalk-biased test route does not repair or certify traffic turns, static penetration, pedestrian avoidance or intersections. One dependable street corridor is the next production gate.

HQ still needs the complete reference floor plan, rear loading entrance, fitting/office/storage zones, camera zones and authored material/signage/lighting polish. This functional room is not a claim of full reference fidelity. Canonical Benji was preserved; K's additional directional/action animation coverage remains ahead.

The full 8-point court challenge, missed-shot loose-ball pickup scenario, return to HQ and full mission completion/reload remain separate gates. Two shots and normal recovery do not certify those scenarios. Halloween room puzzles, the rest of the city/activity locations, physical mobile/controller devices, safe areas and target-device frame-time/memory budgets are also unverified here.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm run lint
npm run build
npm run test:foundation
npm run test:slice
```

The browser suites start a loopback development server by default. To reproduce CI's production verification, start `npm run preview -- --host 127.0.0.1 --port 8080` after the build and set `GAME_URL=http://127.0.0.1:8080/` for both suites. Screenshots default to ignored `artifacts/foundation/` and `artifacts/connected-slice/`; override with `FOUNDATION_SCREENSHOTS` and `SLICE_SCREENSHOTS`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an installed compatible browser. Read-only production diagnostics require explicit `?qa=1`.
