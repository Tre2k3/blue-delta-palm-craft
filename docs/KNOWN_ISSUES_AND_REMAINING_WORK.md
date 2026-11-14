# Known issues and remaining work

Priority: P0 blocks normal play. P1 blocks calling this a production build. P2 is important polish. P3 is later.

## P0

None that stop booting, walking, or finishing the one delivery. The slice loads and the production build passes.

The GitHub branch `feat/grok-reference-driven-rebuild` on the remote was still `e419412` at the start of this audit. Everything after that lived only in this workspace. That is a delivery failure, not a gameplay failure. This audit's push is the fix, if the push succeeds.

## P1

1. **The world does not match the production packs.** Houses, HQ, streets, court, bowl, river, trucks, and the strip are procedural geometry. `public/game-v2/kit/*` facade plates exist and `mountStreetKit()` knows how to hide the box shells, but nothing calls it. Screenshots still read as a prototype next to the illustrated characters.
2. **Characters are cards.** Two frames, camera-facing or clamped yaw, `alphaTest: 0.5`. Clothes and hair can go transparent. The stride swap still reads as a pop. No body rig, no real walk cycle, no lip sync.
3. **No downtown, no park, no drivable car.** The city the packs describe is not in the runtime.
4. **Story ends at a four-item checklist.** After the K Blanco drop and fish/bowl/eat/race, the mission string says the block is open. There is no next chapter.
5. **Lint does not pass.** `useSpot` is flagged as a React hook (7 errors in `runtime.ts`). CI that treats lint as required will reject the branch. Typecheck and `npm run build` do pass.
6. **Save does not restore where you are.** Position, place, and time of day reset. A reload puts Benji back on the sidewalk with his money and mission flags.

## P2

- Basketball always shoots at the west hoop. Makes teleport the ball back into the hands. No rebound. Leaving the court freezes the ball in the air.
- Bowling is one locked lane and a scored roll, not a full alley.
- Racing is a foot sprint.
- Fishing is a timer.
- Wardrobe does not change Benji's art.
- Traffic is two loops and one distance check at (8, 0). Cars do not hit each other. Benji can walk through people and off the map.
- Minimap is a diagram, not the city.
- Dialogue is one line. The old "901 Bowl / 0 pins" line was a saved string with no expiry. Expiry is in now. Dialogue is no longer written to the save.
- Haunt rooms are plates. Narrow halls can trap the capsule.
- Pedestrians are duplicated (same eight drawings).
- Interior camera has no street-side occlusion. Buildings fill the lens.
- Mobile controls are untested on a real phone beyond a 390×844 frame.
- `GameV2.tsx` effect dependency is the literal `5` so the loop remounts. It is a hack and lint warns on it.
- Sandbox git history (`b1e87c1` and parents) does **not** share commits with GitHub. Do not force-push that history. It would orphan the real repo.

## P3

- Schedules, jobs, and a clock.
- Inventory and a real SackReligious shop.
- Seasonal 901 Day.
- Entering and driving the coupe.
- Park, downtown blocks, interiors for bowl and trucks.
- Pause, settings, audio.
- Distance LOD and a real shadow budget.
- Mount and art-direct the kit plates, or replace them with modular geometry that actually matches the boards. Do not paste the concept collages into the world.

## What is actually in good shape

- The live route is game-v2, not the legacy renderer.
- Named cast files are the Character Bible cuts, not `public/game/people`.
- WASD and arrows both move. Diagonal is normalized. Motion is delta-time based.
- Feet use a sole pivot and a ground-pad query.
- Money, Respect, mission flags, bait, and fit survive reload.
- Bowl result text no longer stays on screen out on the street.
- `tsc --noEmit` and `npm run build` succeed.
