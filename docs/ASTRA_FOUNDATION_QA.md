# Astra production foundation — verification checkpoint

Repository: `Tre2k3/blue-delta-palm-craft`. Branch: `feat/astra-production-rebuild`.
Base: `feat/halloween-after-dark`, `3c89d942c7748c10a8a5823b92865a151590f61f`.
No merge. This checkpoint covers foundation repairs; it does not certify the complete game or connected slice.

## Changes

Centralized existing pixel/render scale and Benji height. Extracted the 129-entry boot catalog without changing paths or runtime lookup keys. Recorded actual load outcomes. Added read-only player/asset, traffic and location snapshots through a direct lifecycle call, gated to development or explicit `?qa=1`.

Input now clears keyboard, touch, controller and queued actions on focus/visibility interruption, emits one shoot release, and rearms interrupted controllers after neutral. Named listeners are removed on teardown. Controller Y sprint and one-press camera view behavior now match the advertised mappings; stick magnitude is clamped. Shared touch hold buttons release on lost pointer capture.

Maximum basketball charge uses the existing release/flight path once. Saved positions are checked against grounded collision and deep water even while jumping, driving or using QA noclip, then recovered nearby or at home. Other v3 save fields remain owned by the existing save implementation. Seasonal SSR uses the same initial server/client state before applying the URL override.

The world-life diagnostic now uses the same clipped lane IDs as engine traffic. This repairs diagnostic lookup, not the traffic turn model.

## Results

| Check | Result / evidence |
| --- | --- |
| Locked dependency install | `npm ci --no-audit --no-fund` passed |
| Production build | `npm run build` passed; database migration intentionally skipped by existing script without `DATABASE_URL` |
| Type checking | `npm run typecheck` passed |
| Lint | `npm run lint` passed: 0 errors, the same 4 baseline warnings |
| Foundation browser suite | `npm run test:foundation` passed in actual Chromium with software WebGL |
| WASD | Real keyboard events moved in the expected directions and set left/right/up/down facing; one Benji card visible |
| Walk/run/stop/jump | Shift increased travel from 98.36 to 142.68 gameplay pixels over 40 simulation frames; releases settled locomotion; jump landed |
| Basketball releases | Tap, maximum hold, key-up after auto-release and focus loss each produced one shot; max hold entered flight with charging false |
| Touch interruption | Shared touch action state cleared and emitted one release; this is not hardware touch signoff |
| Controller | Synthesized Gamepad API input verified sprint, neutral rearm, shoot edge and bounded diagonal sticks; physical controller not tested |
| Solid save | A confirmed solid bed position while airborne/noclip saved at a free grounded point; equipped outfit, dollars and Respect preserved |
| Water reload | Invalid `(960, 2100)` recovered to a valid pier `(1048.69, 2063.26)`; no solid/deep-water collision and equipped outfit preserved |
| Catalog | All 129 IDs unique and loaded on normal boot; one deliberately blocked optional phone sprite was recorded missing without preventing startup |
| Seasons | Everyday and Halloween loaded with no uncaught JavaScript or React hydration errors |
| Production diagnostic gate | Built production page had none of the three new diagnostic globals during ordinary play; explicit `?qa=1` exposed the catalog |
| Responsive viewport | No horizontal document overflow at 390×844 and 844×390; images visually inspected |

The focused suite drives real browser input and the real engine update path with controlled simulation frames for timing-sensitive assertions. Screenshot capture resumes the live render loop: screenshots from a stopped WebGL loop showed only the HUD because its drawing buffer is discarded, and were replaced.

## Visual evidence and limits

- [HQ approach](qa/astra-foundation/hq-approach.png): Benji, ambient people, road and civilian vehicle visible. This is exterior evidence, not an HQ interior pass.
- [Portrait viewport](qa/astra-foundation/mobile-portrait.png)
- [Landscape viewport](qa/astra-foundation/mobile-landscape.png)

These are desktop-browser viewport tests. Physical touch controls, device rotation, safe-area hardware, controller disconnect/reconnect and target-device performance remain separate acceptance gates. The screenshots retain the baseline's oversized poster, striped ground and simplified buildings; they do not match the production reference quality yet.

## Historical blocker — repaired in the connected HQ checkpoint

`GameEngine.updateProximity()` forcibly moves a player inside HQ to the south exterior and requests the storefront handoff at the doorway. The physical-HQ installer/test helper therefore cannot establish a persistent walkable interior. Live-render QA exposed this after a paused-loop placement initially appeared to be inside HQ. **Do not mark HQ entry, K Blanco interaction or the connected slice as passing.**

The warning above records the original foundation run. The physical entry and explicit commerce repair, plus the subsequent route verification, are documented in [ASTRA_CONNECTED_SLICE_QA.md](ASTRA_CONNECTED_SLICE_QA.md). Turn tangents/static collision, full mission/reward reload, activity location production, all canonical mentors and the remaining screenshot scenarios still need work.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm run test:foundation
npm run typecheck
npm run lint
npm run build
npm run preview
```

The foundation suite owns a loopback Vite server by default; set `GAME_URL` to use an existing development preview. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an installed compatible browser. Screenshots default to ignored `artifacts/foundation/`; `FOUNDATION_SCREENSHOTS` selects another output directory. Everyday preview: `?season=none`; Halloween: `?season=halloween_2026`; read-only diagnostics in production: `?qa=1`.
