# Legacy game inventory

Donor repository: `Tre2k3/blue-delta-palm-craft`.
Donor commit in this workspace: `995c3a8e0e9979c26967b43e7793c5595ccadff7` (`feat/astra-production-rebuild`).
Rebuild line: `feat/grok-reference-driven-rebuild`. Not merged.

The donor is logic, story, and a few character images. It is not the visual base. The new runtime is `src/game-v2/` and does not import the legacy world renderer.

| System | Class | Why |
| --- | --- | --- |
| SackDollars, Respect, ownership ideas | PORT | Economy rules, not the old HUD |
| Drop Day / K Blanco dialogue intent | PORT | Story. New speaker, new UI |
| Mission step ids and payout-once rules | PORT | Later, into `game-v2` missions. Not copied as a module |
| Wardrobe ownership and “don’t double-dress action frames” | PORT | Rule only. Old compositor stays in donor code |
| Basketball charge, release, flight, rim, rebound, reset | PORT | Math and rules. New court anchors |
| Fishing cast / bite / payout rules | REFERENCE ONLY | Not in the first slice |
| Bowling scoring | REFERENCE ONLY | Not in the first slice |
| Save schema v3 | REFERENCE ONLY | New slice uses its own key. Port fields later |
| Haunted-house puzzle state | PORT | Later. Do not port the old room presentation yet |
| Seasonal Halloween / 901 Day as overlays | PORT | Same geometry, later lighting and props |
| Benji directional cutouts | PORT | Identity matches the Character Bible. Not the old world |
| K Blanco HQ cutout | PORT | Canonical woman. Pendant letter still needs a K |
| Named NPC roles | PORT | Names and jobs only |
| Player acceleration feel | REFERENCE ONLY | New controller. Facing is screen-locked: A left, D right, W back, S front |
| Lane-graph idea (heading = motion tangent) | REFERENCE ONLY | Rebuilt. Old traffic meshes are not used |
| Diagnostics hooks | REFERENCE ONLY | New hook is `window.__SACK_V2__` |
| Old world renderer, streets, slabs, ground stripes | DISCARD | This is the old look |
| Old building shells and interiors | DISCARD | HQ and home are new geometry |
| Old court art and court coordinates | DISCARD | New court. Logic ports, layout does not |
| Old traffic cars and placement | DISCARD | New vehicles on a new road graph |
| Old HUD, minimap, phone chrome | DISCARD | New UI from the UI pack palette |
| Old camera and flat framing | DISCARD | New follow camera |
| Old pedestrian cards and color-plane crowds | DISCARD | New grounded figures |
| Prototype installers in `src/routes/index.tsx` | DISCARD | They only patch the old renderer. The live route no longer calls them |
| Auth, database, commerce checkout | REFERENCE ONLY | Not part of this visual slice |

## What the new runtime will not reuse

- `world3d.ts`, `world3dCore.ts`, `worldLifePass.ts`, `worldTopology.ts`
- `engine.ts` draw loop and its pixel-city camera
- `vehicleVisualPass.ts`, `carRig.ts`, `cityArt.ts` building textures
- `GameApp.tsx` HUD
- Street sanitation, console-look, and city-detail passes

Those files stay in the repo as donor source. The running game does not mount them.
