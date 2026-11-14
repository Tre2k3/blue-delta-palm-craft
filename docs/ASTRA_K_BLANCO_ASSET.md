# K Blanco HQ cutout — provenance

Runtime asset: `public/game/people/k-blanco-hq-cutout.png`.
SHA-256: `df3791ae0d7d83891635aa498d17029f3772e8fd71de0bf3609dd3642fc91651`.

Source authority: the Character Bible in `Tre2k3/SackReligious-Game/reference-packs/`, specifically `SackReligious_Character_Bible_AI_Reference_Pack/02_Core_NPCs/01_K_Blanco_CANONICAL/k_blanco_CANONICAL_reference.png`, top-left FRONT panel. The reference specifies canonical female K Blanco; conflicting UI concept characters are rejected.

The previous front cutout erased opaque black clothing along with its background. A new asset was produced with the built-in image-generation tool in background-extraction edit mode, using the canonical board as its reference and requesting a transparent background. The original front cutout and portrait files are retained.

## Edit constraints

Extract the single front-view full-body woman. Preserve the hand-on-hip pose, face and smile, Black skin tone, short platinum curls, gold hoops, K pendant and jewelry, black sleeveless wrap outfit with flared cropped pants, and gold/black heels. Retain the stylized cel shading and character proportions. Include the hair, both hands and both shoes with a clear foot baseline and small margins. Preserve opaque black clothing and eyes. Remove labels, borders, logos, other views, the separate portrait, background, ground shadow, text and props.

## Checks and use

The output is 1024×1536 RGBA. Background corners have alpha 0; sampled black clothing has alpha 253. Alpha ranges from 0 to 254, so the dark RGB background visible in some image previews does not become an opaque runtime rectangle.

The HQ desk mesh uses the image's native aspect ratio and the shared `HQ_K_BLANCO` anchor. Its 2.22-unit height keeps her at adult scale relative to 1.78-unit Benji. The old generic K sprite is hidden; the physical desk actor owns the visible character. This cutout supplies the front desk pose; additional NPC animation and action coverage remain later production work.
