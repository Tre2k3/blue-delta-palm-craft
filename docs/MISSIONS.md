# Chapter 1 — The Drop Day

Eight missions. IDs are stable for tests and saves. Labels are the player-facing chapter titles.

| # | ID | Title | Kind | Target |
| --- | --- | --- | --- | --- |
| 1 | `wake` | Wake Up | goto | apartment |
| 2 | `link_k` | Link Up | talk | store (K Blanco) |
| 3 | `pickup` | Get the Drop Ready | pickup | drop van |
| 4 | `hood` | Take the drop — Neighborhood | deliver | neighborhood |
| 5 | `dt` | Get fresh — Downtown | deliver | downtown |
| 6 | `culture` | Build Respect — Culture Spot | deliver | culture |
| 7 | `ball` | Own the 901 Court | basketball | court (score 8) |
| 8 | `return` | The Drop | return | store |

Delivery IDs stay `hood` / `dt` / `culture` so `dropRun` grading does not break. Teleport locations remain `neighborhood` / `downtown` / `culture`.

## Flow

1. Apartment spawn. South doorway. Leave the building to complete Wake Up.
2. Walk to HQ. Enter the real doors. Talk to K Blanco. Tonight is Drop Day.
3. Secure the branded van.
4. Three city drops. Combo timer grades the run.
5. Downtown also teaches the fit: HQ wardrobe is always available after Link Up.
6. Culture Spot pays Respect as reputation, not a second cash pile.
7. 901 Court. Score the target. Leave court. Return is optional until you are ready.
8. HQ again. K Blanco closes the chapter. Drop Live + free roam.

`completeStep` no-ops if the step is already done. Reloading never double-pays.

Side jobs: Pickup Kings, Full Fit, City Tour, Sunset at the River, Pyramid Flex, Beale After Dark.
