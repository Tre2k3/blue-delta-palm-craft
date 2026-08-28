# $ackReligious KLOTHING Memphis — Upgrade changelog

## 0.9.0-rc brand skins
- Sackrow Ballers court floor (gold chain, diamond, moneybag ball) replaces the old wood/green deck
- Traffic cars wear full $ackReligious / Sackrow wrap sheets on every body panel
- Drop van uses the Sackrow Ballers van wrap
- K Blanco in-game sprite + dialogue portrait from the approved character map (blonde, black jumpsuit)

## 0.9.0-rc — production vertical slice

- Chapter 1 titles mapped onto existing mission IDs (wake → return)
- Commerce layer: catalog JSON, BUY IRL, View product, iframe postMessage bridge
- AnalyticsService events (start, missions, HQ, products, basketball, chapter)
- Save schema v3 with v2/v1 migration; rewards stay idempotent
- Respect gate on Moneybag Chain; equipped fit shows as color ring + badge
- Error boundary, rotate-phone overlay, staged loading copy, version in settings
- Settings: sensitivity, quality, reduce motion, fullscreen, restart, main menu
- Docs: README + architecture, missions, world, basketball, vehicles, commerce, Lovable, deploy, QA
- Tests: commerce-smoke, save-smoke (mission-test IDs/buttons preserved)

## Visual
- Title uses approved opening `opening-title.png` (`$ackReligious` / `KLOTHING`, Benji + storefront)
- Left-side UI, loading bar, ENTER MEMPHIS / CONTINUE / NEW GAME / Settings
- 20 tileable material skins on roads, sidewalks, brick, windows, roofs, court, fence, cars
- Golden-hour lighting: low western sun, ACES, soft shadows, emissive windows, streetlamp pools
- Cars have body, cabin, wheels, headlights, taillights, contact shadows
- Drop van is a distinct 3D vehicle with brand stripe
- 901 Court: wood floor, line decal, chain-link, 3D hoop (no baked Benji / ball)

## Controls
- Swapped `benji-left-norm.png` / `benji-right-norm.png` at the source
- Facing comes from world velocity (A left, D right, W back, S front)
- Camera look no longer turns Benji
- Idle keeps last facing

## Systems preserved
- Drop Day mission, $ackdollars, shop, save, basketball physics
- ENTER MEMPHIS, Leave court, Back to streets, `data-testid=buy-*`
- `__gameTest` / `__controlsTest`

## Results
- typecheck: pass
- eslint src/game: pass
- production build: pass
- mission-test.mjs: SUCCESS true, 0 console errors
- Facing probe: A=left, D=right, W=up, S=down
