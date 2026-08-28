# Chapter 1 — The Drop Day

Eight missions. IDs are stable for tests and saves. Labels are the player-facing chapter titles.

| # | ID | Title | Kind | Target |
| --- | --- | --- | --- | --- |
| 1 | `wake` | Leave Home | goto | apartment |
| 2 | `link_k` | Link Up | talk | store (K Blanco) |
| 3 | `pickup` | Get the Drop Ready | pickup | drop van |
| 4 | `hood` | Take the drop — Neighborhood | deliver | neighborhood |
| 5 | `dt` | Get fresh — Downtown | deliver | downtown |
| 6 | `culture` | Build Respect — Culture Spot | deliver | culture |
| 7 | `ball` | Own the 901 Court | basketball | court (score 8) |
| 8 | `return` | The Drop | return | store |

Delivery IDs stay `hood` / `dt` / `culture` so `dropRun` grading does not break. Teleport locations remain `neighborhood` / `downtown` / `culture`.

## Flow

1. Apartment spawn. Already inside the room. South doorway. Walk out to complete Leave Home.
2. Walk to HQ. Enter the real doors. Talk to K Blanco. Tonight is Drop Day.
3. Secure the branded van.
4. Three city drops. Combo timer grades the run.
5. Downtown also teaches the fit: HQ wardrobe is always available after Link Up.
6. Culture Spot pays Respect as reputation, not a second cash pile.
7. 901 Court. Score the target. Leave court. Return is optional until you are ready.
8. HQ again. K Blanco closes the chapter. Drop Live + free roam.

`completeStep` no-ops if the step is already done. Reloading never double-pays.

Side jobs: Pickup Kings, Full Fit, City Tour, Sunset at the River, Pyramid Flex, Beale After Dark, Cover Shot, Gold Alley, Night Route.

# Chapter 2 — After Hours

Starts the moment Drop Live fires. Does not rewrite Chapter 1 IDs.

| # | ID | Title | Kind | Target |
| --- | --- | --- | --- | --- |
| 1 | `flash` | Cover Shot | talk | photographer outside HQ |
| 2 | `alleywalk` | Gold Alley | goto | alley (25 Respect) |
| 3 | `nightball` | Sackrow Night Court | basketball | court (score 10) |
| 4 | `nightvan` | Night Route | pickup | drop van |
| 5 | `afterparty` | Close with K | return | store |

After Hours steps can be done in any order. Closing with K Blanco finishes the chapter and unlocks the After Hours trophy. Free roam and side jobs stay live.
