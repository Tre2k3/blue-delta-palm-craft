# Claude handoff — graphics and feel

Project rules for a Claude coding session on this repo. Base branch: `feat/benji-basketball-outfit-sprites` (ART_REV 91).

## How to run it

1. New Claude chat per phase. Paste the rules block once.
2. Start at **Phase 1**. Do not ask it to “make the whole game look better” in one shot.
3. In the game: **KIT** or **F3** → warp to that spot → screenshot → **Report → COPY BUG DUMP**.
4. Send the phase template with the dump and screenshot.
5. If it offers to redraw Benji, key out black, or kick Veli/Brothers off Welkome — stop that chat.

**Order that won’t wreck the game:** light and ground, then one district, then interiors, then traffic, then feel. Phase 6 (more props and people) only after the street isn’t flickering and the phone isn’t stuck at 20fps on “high.”

Phase 1 is light and ground only — no district. HQ block is Phase 2.

## Rules block (paste first)

```
You are coding on $ackReligious: Memphis, a Three.js 2.5D open-world Memphis fashion/culture game (build 0.9.7, ART_REV 91).

Your job: upgrade GRAPHICS and FUNCTIONALITY.
Keep the approved Benji, the approved walk cycle, the decide-then-animate shot, and the existing partners.
Stylized illustrated / cel-shaded 2.5D. Not GTA. Not photoreal. Not a new character.
Brand green #1db954 and gold #d4af37 are ACCENTS only.

READ IN THIS ORDER before writing code:
docs/ARCHITECTURE.md
docs/GAME_DESIGN.md
docs/ASSET_GUIDE.md
docs/WORLD.md
docs/BASKETBALL.md
docs/VEHICLES.md
docs/QA_CHECKLIST.md
docs/CLAUDE_HANDOFF.md
src/game/types.ts
src/game/data.ts
src/game/config.ts
src/game/chroma.ts
src/game/playerCharacter.ts
src/game/basketballSprites.ts
src/game/outfitSprites.ts
src/game/characterController.ts
src/game/graphics.ts
src/game/materials.ts
src/game/memphisEnvironmentPass.ts
src/routes/index.tsx

Then open ONLY the files for the one phase I named. List them before you edit.

HARD RULES (failed upgrade if you break these)
- Do NOT redesign Benji. Do NOT generate Benji from a text prompt. Do NOT img2img or “upscale” his walk.
- Canonical walks: public/game/benji/walk-{front,back,left,right}-{1..4}.webp and jump-1..4.webp. Byte-identical unless I explicitly hand you new plates.
- Outfits = overlays / pre-dressed plates on the SAME Benji. Basketball poses = overlays. Ball is a SEPARATE Three.js mesh (empty hands).
- One visible Benji card. cardB hidden except a real crossfade.
- Feet-bottom anchor: CARD_H=1.78, geo.translate(0, CARD_H/2, 0). Yaw-only billboard via alignToCamera. No full billboard.
- packScale from opaqueHeightRatio. starter_tee is default. Never show the green shirt when another fit is on.
- Walk/jump sheets: cleanSprite() = punchStudioPlate (magenta/raspberry edge flood). NEVER global black key. NEVER key maxRGB>=20.
- Outfit plates public/game/benji/outfits/** and basketball packs public/game/benji/basketball/** are already punched. plateMat/cardMat only. NEVER dressBenji, NEVER cleanSprite, NEVER chroma black.
- NPC plates: preparePeoplePlate() only. Chroma punches eyes, teeth, and K Blanco’s hair.
- CUTOUT_ALPHA=0.12. Character cards: LinearFilter, NO mipmaps, ClampToEdge. Ground textures in materials.ts may use mipmaps. Do not copy that onto Benji.
- Veli’s Wings and Brothers Wingz N Things KEEP their Welkome slots. RCM WORX is its own lot west of HQ on Union, not a Welkome slot.
- Civilian cars stay ordinary. Do not brand-wrap the whole city.
- Do not rebuild the engine, turn basketball into physics, or replace Benji with a GLB unless I ask in this session.
- BASKETBALL-SPEC.md is FUTURE. Current shot is decide-then-animate in engine.releaseShot(). Keep it.
- Do not merge git. Do not add auth. Do not touch src/lib/auth, src/lib/db.ts, src/lib/multiplayer, vite.config.ts, migrations/.
- Integrity passes in src/routes/index.tsx stay installed.
- After public/game or world-bake edits, bump ART_REV in src/game/data.ts. GameApp remounts on key={ART_REV}.
- npm run typecheck must pass. No empty-string replace on carRig.ts or world3dCore.ts.
- A prettier frame that sits at ~20fps labeled “high” is a failed upgrade.

WHAT “BETTER GRAPHICS” MEANS
Upgrade the CITY, LIGHT, MATERIALS, INTERIORS, and VEHICLE FINISH. Do not upgrade Benji by replacing him.
- Light/time: memphisEnvironmentPass.ts + dayCycle.ts (DAY_START_HOUR=12). Noon reads as day. Night windows glow. River reads as water. Court reads as a court.
- Ground: materials.ts already maps public/game/materials/01–20. Use them. Don’t smear asphalt, sidewalk, brick, court wood.
- Street props already in memphisEnvironmentPass (hydrants, benches, cans, dumpsters). More of that language. Do not block doors, lanes, or the court.
- Special buildings stay special and are MESH_SKIP: HQ, apartment, 901 Court, 901 Lanes, RCM WORX. No generic box on top of them.
- K Blanco talks INSIDE HQ at the desk. Opaque eyes. Full body. Not a sidewalk bust.
- Court venues (courtPlay.ts): 901_day, sackrow, rooftop, classic. Indoor light indoors. Outdoor stays outdoor.
- 901 Lanes: pink neon, camera on the pins at impact.
- RCM lot: asphalt, gold stanchions, flyer public/game/ads/rcm-worx.png, parked Sprinter + Escalade ESV.
- Traffic finish only: bind wraps ONCE. No per-frame black material. No blinker strobe. No ground clip.
- HUD must not cover Benji, the shot meter, or the fishing meter. Wardrobe must scroll to Confirm on a phone width.
- graphics.ts noteFrame drops quality from FPS (dt>0.042), NOT isHandheld() — preview UA is desktop.
  High: pixelRatio cap 1.5, PCF soft 2048, far 420. Medium: 1.25 / far 220. Low: dpr 1, far 110.

WHAT “BETTER FUNCTIONALITY” MEANS
Tighten loops that exist. Do not add a new genre.
- A=left, D=right under chase cam. Walk 168, run 268, accel 940.
- Court: charge green window → releaseShot() decides make/miss → arc agrees → rim shake → rebound → shoot again FAST. bb-ready/bb-drive/bb-shot, NEVER the jump cycle. No sparkler VFX.
- 901 Strip vs Cam: on asphalt, not through buildings. Arrow on time = boost, miss = slow. Leave = DNF.
- Fishing: meter visible, line reels in while the fish shows.
- Bowling: camera on the pins. Not the tag line “in the sack we roll”.
- Food trucks: person in the window takes the order. Veli video only when close. Benji bops while listening.
- RCM: book Sprinter or Escalade, chauffeur can drive. Do not remove Veli/Brothers.
- Compass points at the active mission step only. Save sackreligious-memphis-v3. completeStep is idempotent.
- BUY IRL stays a handoff to 10letters.store. No card checkout in the client.

LOOP
GameApp.tsx → GameEngine (engine.ts) → World3D/World3DCore → PlayerCharacter + traffic/life passes.
Keep installed from src/routes/index.tsx: gameplayIntegrity, apartmentLayoutPass, interiorCollisionPass, worldHazardPass, courtWorldIntegrity, memphisEnvironmentPass, streetSanitationPass, vehicleVisualPass.

WHERE TO GO
Graphics: graphics.ts, materials.ts, memphisEnvironmentPass.ts, dayCycle.ts, world3dCore.ts, world3d.ts, polygonOffset.ts, city/ads.ts, city/signage.ts, public/game/materials/, facades/, store/, ads/
Function: engine.ts, characterController.ts, input.ts, courtPlay.ts, race.ts, fishing.ts, bowling.ts, rcmWorx.ts, dropRun.ts, foodTrucks.ts, progression.ts, commerce.ts, audio.ts
Sprites (only for a real bug, not a beauty pass): playerCharacter.ts, outfitSprites.ts, outfitCompositor.ts, outfitLook.ts, basketballSprites.ts, chroma.ts, cutout.ts, public/game/benji/, public/game/people/
Cars: carRig.ts, vehicleWraps.ts, vehicleVisualPass.ts, worldLifePass.ts, worldTopology.ts, public/game/wraps/
  public/game/cars/*.webp are leftover cards. Do NOT bind them as driving cars.
UI: GameApp.tsx, playtest.ts, ui/PlaytestKit.tsx

ASSET TRUTH — public/game/ is what the player sees.
Walks CANONICAL. Outfits: public/game/benji/outfits/<id>/{front,back,left,right}.png
Basketball: public/game/benji/basketball/<id>/{ready,drive,shot-front,shot-back}.png
Packs exist for starter_tee, tour_red/white/black, jersey_black_fresh, jersey_white_224, black_sackrow_11, blue_901_day.
PENDING: jersey_blue_fresh (falls back to outfit plates).
K Blanco: public/game/people/k-blanco-*.png — inside HQ.
Traffic is 3D hulls + public/game/wraps/. CAR_RIDE=0.093. kind van|car|sprinter|escalade.
World: 64×48 tiles, TILE=48. Apartment west, HQ + RCM midtown, 901 Court + 901 Lanes south, Beale, Pyramid, river.

TRAFFIC CONTRACT (a graphics pass already rebroke this)
- Bind wrap textures once. Never new black MeshStandardMaterial every frame.
- Blinkers only if turnTo OR real yaw delta. Never Math.abs(car.yaw)>0.
- One yaw owner: vehicleVisualPass lerp. world3dCore must not cardinal-snap civilians.
- Skip smoothCarVisuals when vehicleRig exists.
- isRoadPoint pad ≈ 24. Tighter snaps cars at Front & Poplar.
- Never through buildings, never across the court, never in the ground.

UPGRADE ORDER — one phase per chat
1. Light and ground. memphisEnvironmentPass, dayCycle, materials, graphics. No Benji files.
2. Streets and landmarks, ONE district: HQ block, then Beale, then 901 Court exterior, then river. Doors walkable. Court punched out of the road.
3. Interiors: apartment exit, HQ desk (K full body), 901 Lanes pin camera, RCM lot both cars + flyer, court venue actually changes light.
4. Traffic finish. Obey the traffic contract. Zero blink, jitter, ground clip, building clip.
5. Core feel, in order: back-to-back shots, fishing meter, race on asphalt, wardrobe scroll-to-confirm, food-truck window.
6. Life density only after 1–5 don’t regress: sidewalk props, peds that don’t block lanes, existing ad slots.

PLAYTEST
KIT / F3 / backtick → COPY BUG DUMP. Treat dump + screenshot as ground truth.
If fps is ~20 and quality says high, fix noteFrame before adding lights.
window.__gameTest: teleport, getState, setBallScore, enterCourt, beginCharge, releaseShot, enterHQ, startRace, startFishing, enterLanes, enterRcm, bookRcm.
A=left, D=right.

KNOWN SHARP EDGES — do not reintroduce
Headless/torso plates from dark-flood. Jump used as the shot. Hat missing on starter_tee. Two Benjis. Front St flicker. K Blanco transparent eyes or half a body. Cars through HQ/court/ground. Fishing caption over the meter. Wardrobe that can’t scroll. Welkome eviction.

When done: list files, ART_REV if the bake changed, typecheck, and what I should see at the named place.
```

## Phase template (send one per chat)

```
Follow the $ackReligious rules I pasted. One phase only.
Do not redesign Benji. Do not replace walk sprites. Do not chroma black.
Do not touch Veli’s or Brothers’ Welkome slots. Do not turn releaseShot() into physics.

This session is PHASE <1|2|3|4|5|6>:
1 light and ground
2 one district’s streets (name it)
3 one interior (apartment / HQ / 901 Lanes / RCM / court venue)
4 traffic finish under the traffic contract
5 one feel bug (shots / fishing / race / wardrobe / food truck)
6 density only if 1–5 are solid

Place:
<HQ block | Beale | 901 Court | river | 901 Lanes | RCM lot>

DUMP:
<paste KIT dump or “none”>

List files you will open, list files you will not touch, then edit.
When done: files changed, ART_REV if needed, typecheck, what I should see at that place.
```
