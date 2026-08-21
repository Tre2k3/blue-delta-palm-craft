# QA checklist

Do not delete a failing test to go green.

## Gauntlet

1. **Benji** — idle, walk, run, jump, four directions, always visible
2. **Apartment** — new game, collision, exit obvious
3. **Street** — traffic orientation, peds, no court driving
4. **HQ** — enter doors, K Blanco, shop, wardrobe, BUY IRL, exit
5. **Basketball** — possess, charge, make, miss, rebound, score 8, leave
6. **Commerce** — inspect, View product, BUY IRL, no secrets in bundle
7. **Chapter** — all 8 missions, save, reload, no double rewards

## Buttons that must exist

- ENTER MEMPHIS
- Leave court
- Back to streets
- `data-testid="buy-<apparelId>"`
- `data-testid="buy-irl-<productId>"`

## Hooks

`window.__gameTest` · `__controlsTest` · `__SACK_COMMERCE__` · `__SACK_ANALYTICS__` · `__SACK_BUILD__`
