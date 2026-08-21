# Architecture

Do not rebuild from scratch. The live loop is:

`GameApp` → `GameEngine` → `World3D` / `World3DCore` → `PlayerCharacter` + traffic/life passes.

Integrity passes (`gameplayIntegrity`, apartment, interiors, hazards, court, memphis, street, vehicles) wrap engine methods. They must stay installed from `src/routes/index.tsx`.

## Character split (future GLB)

| Piece | Today |
| --- | --- |
| PlayerState | `GameEngine` px/py/yaw + mission/economy |
| CharacterController | `characterController.ts` locomotion |
| CharacterVisual | `playerCharacter.ts` 2.5D cards |
| AnimationState | idle / walk / run / jump / shoot on the controller |
| CharacterSkin | equipped apparel id + color ring/badge |

Gameplay must not hard-depend on PNG filenames. Engine loads a map; `PlayerCharacter.applyApprovedTextures` consumes it.

## Production modules

`src/game/config.ts` · `commerce.ts` · `analytics.ts` · `ui/ErrorBoundary.tsx` · `ui/RotatePrompt.tsx`

## Untouchable

`src/lib/auth` · `src/lib/db.ts` · `src/lib/multiplayer` · `vite.config.ts` · `migrations/`

## Save

`sackreligious-memphis-v3`. Reads v2 then v1. `completeStep` is idempotent.
