# Brand Territory — system spec

The one mechanic in SackReligious Memphis that no other game can copy, because
copying it means owning a real streetwear brand.

Today Respect is a number in the HUD. This turns it into something you can walk
through: work a block and that block visibly becomes yours. The city becomes a
record of where the brand has spread.

Build this **after** the release candidate is on `main`. Not before.

## The loop

Do brand work in a block → that block's influence rises → at thresholds it
visibly changes → changed blocks pay better and unlock harder work.

Progression you can see from inside the world is the whole point. A number going
up is a spreadsheet. A street that looks different when you come back is a game.

## Data model

The city is already cut into blocks by `STREETS` in `worldTopology.ts`. Reuse
that grid rather than inventing a second one.

```ts
export type BlockId = string;              // "b:<col>,<row>" from the STREETS grid

export interface BlockState {
  id: BlockId;
  influence: number;                       // 0..1
  tier: 0 | 1 | 2 | 3;                     // derived, see thresholds
  firstClaimedAt: number | null;           // epoch ms, null if never claimed
  lastActionAt: number;
  ownerId: string | null;                  // null = unclaimed, else user id
}

export interface TerritoryState {
  blocks: Record<BlockId, BlockState>;
  version: 1;
}
```

Thresholds: tier 0 below 0.20, tier 1 at 0.20, tier 2 at 0.55, tier 3 at 0.85.
Derive `tier` from `influence` every read — never store it as the source of
truth, or the two drift apart and you get blocks rendering at a tier their
influence doesn't justify.

Influence decays slowly toward 0 (about 0.02/day) so the map stays alive and
old ground has to be revisited. Decay is computed lazily from `lastActionAt` on
read, not on a timer — a timer means a background loop that has to keep running
and that you have to test.

## What raises influence

| Action | Delta | Notes |
| --- | --- | --- |
| Delivery completed in block | +0.12 | already emitted by the drop run |
| Basketball run won at 901 | +0.20 | court block only |
| NPC seen wearing your gear | +0.02 | passive, capped per block per session |
| Contract completed in block | +0.15 | |
| Mural placed | +0.25 | one per block, permanent |

Cap gains at +0.35 per block per session so a single grind can't paint the whole
city in one sitting.

## What tier changes look like

This is the part that has to be legible in a screenshot. Everything here already
has a home in `worldLifePass.ts`, which is why this system is cheap to build.

**Tier 1 — noticed.** A tag appears on one wall. One NPC on the block wears a
SackReligious tee. Streetlight tint warms slightly.

**Tier 2 — established.** Mural on the largest facade. Roughly a third of block
NPCs in brand gear. A storefront sign swaps to brand signage. Ambient audio
picks up the block's music bed.

**Tier 3 — owned.** Full facade wrap on the anchor building. Most NPCs in gear.
Block lighting shifts to brand green/gold. A parked car on the block carries the
brand wrap. Idle crowd audio.

Transitions animate over about 2 seconds when the player is present, and apply
instantly when they aren't. A block that pops while you're standing in it is the
reward moment — do not skip the animation.

## Where it plugs in

- `worldTopology.ts` — add `blockIdAt(px, py)` and `blockBounds(id)`. The grid
  already exists; this is the lookup that turns a world position into a block.
- `worldLifePass.ts` — owns NPC sprites, cars, facades, signage. It gains
  `applyTerritory(state)` which sets per-block visual tier. **This is where the
  work belongs. Do not create a new pass module.**
- `engine.ts` — emit `territoryAction(blockId, kind)` at the existing mission,
  delivery, and basketball completion points. Nowhere else.
- `src/lib/db.ts` — a `territory` table keyed by `(user_id, block_id)`.

## Persistence and sharing

Local first. Ship single-player territory, persisted in the existing save, and
confirm it is fun before any of the multiplayer work.

Then: because the app already has better-auth, Neon, and WebRTC, shared territory
is a smaller step than it looks. Other players' claimed blocks render in a
neutral rival treatment — different palette, their tag, not yours. A world-state
fetch on load plus a periodic delta is enough; this does not need realtime.

Contested blocks are a v2 idea. Do not build them in the first pass. Two players
fighting over one block introduces conflict resolution, and that is a whole
system pretending to be a feature.

## Build order

1. `blockIdAt` + `blockBounds` in `worldTopology.ts`, with unit tests.
2. `TerritoryState` in memory, influence maths, decay-on-read, derived tiers.
3. Wire the five existing actions to `territoryAction`.
4. Tier 1 visuals only. Play it. **Stop here and judge whether it feels good.**
5. Tier 2 and 3 visuals.
6. Persist to the save file.
7. Persist to Neon per user.
8. Render other players' blocks.

Steps 1–4 are the whole hypothesis. If a block turning tier 1 in front of you
isn't satisfying, more tiers won't fix it — the system is wrong and it's better
to learn that after four steps than after eight.

## Acceptance

- `blockIdAt` returns a stable id for every walkable position in the world.
- Influence never exceeds 1 or drops below 0, and tier always matches influence.
- A tier change while the player is present animates; offscreen changes are
  instant.
- Territory survives reload.
- Frame time does not regress with all blocks at tier 3 — check this early, it
  is the most likely performance cliff.
- QA screenshots at tier 0, 1, 2, 3 of the same block, for visual review.

## Scope discipline

Fishing and food trucks are half-built systems already competing for attention.
Finish one or cut it before starting this. Twelve prototype systems read as
unfinished; four polished ones read as a game — and territory only lands if it
is clearly the spine rather than the thirteenth thing on the menu.
