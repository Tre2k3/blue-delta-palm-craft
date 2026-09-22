# $ackReligious — Memphis 901

A browser game starring Benji: complete Drop Day, explore Memphis, play the 901 Court, collect apparel, and drive the drop van after collecting the shipment.

## Controls

| Action           | Keyboard / mouse                                   | Controller           |
| ---------------- | -------------------------------------------------- | -------------------- |
| Move / drive     | WASD or arrows                                     | Left stick / D-pad   |
| Look             | Mouse after clicking the world, right-drag, or Q/R | Right stick          |
| Sprint           | Shift                                              | Y / left-stick click |
| Interact         | E                                                  | A                    |
| Shoot / brake    | Hold Space (or F to shoot), release in green       | X / right trigger    |
| Camera           | V / C                                              | Right-stick click    |
| Map              | M                                                  | Select / View        |
| Enter / exit van | G                                                  | Left bumper          |
| Pause / back     | Escape / P                                         | Start / B            |

Touch devices have a movement stick, look buttons, sprint, and context actions. The toolbar provides the map, menu, camera, and van controls. Touch controls can also be enabled in Settings.

## Gameplay and saves

- Follow the mission panel or choose a destination on the map. Its dashed line indicates direction, not a calculated road route.
- Pick up the shipment to unlock the van. Slow down before exiting.
- On the court, face the hoop and release your shot in the green window. Rebounds return automatically; the results card shows the run's payout and best streak.
- Progress saves on this device after rewards and periodically during play. Existing version 1 and 2 saves migrate to version 3 while retaining the original storage key.
- The pause menu includes **Return to apartment** for recovery without resetting progress. **New game** requires confirmation.
- Settings include volume, camera, sensitivity, rumble, screen shake, graphics quality, and touch controls.

## Development

Use Node 24 and the lockfile:

```sh
npm ci
npm run dev
```

`startup.sh` starts the development server on port 8080 and can be rerun safely. Production uses `npm run build` followed by `npm run preview`.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
# In another terminal: npm run preview
SMOKE_HEADED=0 npm run test:game
```

The upgrade smoke test exercises actual keyboard and pointer input, mission interactions, physical basketball shots, van steering, payouts, reloads, and mobile layouts. Deterministic simulation steps avoid dependence on CI rendering speed. QA hooks are available in development and on an explicit `?qa=1` URL; normal production URLs do not expose them.

CI also runs the existing game, mission, DOM, and screenshot checks. Failed screenshot captures fail verification rather than creating placeholder images. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` supports an installed browser; `SMOKE_SINGLE_PROCESS=1` supports constrained software-rendering hosts.
