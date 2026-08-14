# $ackReligious KLOTHING Memphis — Split Asset Pack Manifest

These archives replace the single large COMPLETE_GAME_IMAGE_PACK zip. They are additive parts of one asset library.

## Upload / extraction order
1. `SackReligious_PART01_START_HERE_OPENING_GAMEPLAY.zip`
2. `SackReligious_PART02_MATERIALS_SET1.zip`
3. `SackReligious_PART03_MATERIALS_SET2.zip`
4. `SackReligious_PART04_CHARACTERS.zip`
5. `SackReligious_PART05_VEHICLES.zip`
6. `SackReligious_PART06_SCENE_REFERENCES.zip`
7. `SackReligious_PART07_EXISTING_GAME_ASSETS.zip`
8. `SackReligious_PART08_ORIGINALS_SCREENSHOTS.zip`

Extract every archive into the same working parent directory. Each archive preserves the same top-level folder: `sackreligious_game_asset_pack/`. Allow folders to merge. Do not rename files while extracting.

### What each part contains
- PART01: approved opening backgrounds, gameplay visual targets, docs, revised Grok master prompt, manifests.
- PART02: material skins set 1.
- PART03: material skins set 2.
- PART04: Benji, K Blanco, NPC, crowd, mission and court character maps.
- PART05: drop van, traffic, car skins/liveries and customization references.
- PART06: additional scene/composition references.
- PART07: assets already used by the current Grok game workspace, including Benji directional sprites and K Blanco/store assets.
- PART08: original uploads plus current screenshots for regression comparison.

The approved title background is:
`00_OPENING/03_USE_THIS_opening_final_dollar_S_arched_SackReligious_Klothing.png`

Known directional sprite bug in the current game assets:
- `benji-left-norm.png` visually faces screen-right.
- `benji-right-norm.png` visually faces screen-left.
Read `docs/DIRECTION_FIX.txt` and the master prompt before implementation.
