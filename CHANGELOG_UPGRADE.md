# $ackReligious KLOTHING Memphis — Upgrade changelog

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
