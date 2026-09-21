# 901 Court — basketball as the spine

Basketball becomes the core loop: a rigged character, an opponent worth beating,
attributes that change how the ball feels, and turn-based games against real
people. The shop is the gear you wear in those games.

This supersedes `TERRITORY-SPEC.md` as the next system. Territory is the world
layer that wraps this later, not the spine.

Do not start until the release candidate is merged to `main`.

## The thing to understand before designing anything

`releaseShot()` in `engine.ts` decides the outcome **at release, before the ball
moves**:

```ts
this.ball.made = isGood || perfect;      // decided here
...
this.ball.pending = { vx, vy, vz };      // flight computed after
```

The grade comes from the power meter against a window derived from spot, heat,
difficulty, and `perfectHalfWidth`. The projectile is then nudged by `pwrMul` and
`noise` so the arc *agrees* with the already-chosen result.

This is decide-then-animate, not simulation. Three consequences drive everything
below:

1. **A defender cannot physically block a shot.** The outcome is fixed before the
   ball leaves Benji's hands. Contest has to be an *input to the window*, not an
   obstacle in the air. Design it that way rather than fighting the model.
2. **Multiplayer verification becomes easy**, because a make is a pure function
   of its inputs. A peer's claimed result can be recomputed and checked.
3. **The noise is currently non-deterministic.** `Math.sin(this.clock * 37.1 …)`
   is seeded off wall-clock time, so two clients replaying the same shot get
   different arcs. That must be fixed before any verified multiplayer — see
   Determinism below.

Keep decide-then-animate. It is the right model for a game where the shot meter
is the skill expression. Do not rewrite it into a physical simulation.

## 1. The rig

Benji is a 4-direction billboard card. No amount of animation work fixes weight
shift, follow-through, a defensive slide, or contact while he is flat. This is
the blocker on every animation improvement and it comes first.

Replace the placeholder group in `playerCharacter.ts`. Contract:

- Origin at the feet, **+Z is forward** (matches the existing controller yaw).
- Parented bone hierarchy: hips, spine, chest, neck, head, and per-side
  shoulder / upper arm / forearm / hand / thigh / shin / foot.
- Clips: `idle`, `walk`, `run`, `jump`, `land`, `dribble_idle`, `dribble_move`,
  `crossover`, `gather`, `shoot_release`, `follow_through`, `defend_slide`,
  `contest`, `rebound`.
- Blend on a speed parameter, as `characterController.ts` already does for lean.
  Do not add a second state machine — the controller already tracks `loco`.
- `shoot_release` must be **time-locked to the power meter** so the visual
  release lands on the same frame the grade is computed. If the animation and
  the meter disagree, the shot feels dishonest and every other tuning decision
  becomes untrustworthy.

Either a procedurally built low-poly rig or a rigged glTF with retargeted clips.
Both work. Keep `castAtlas` sprites as the fallback path for NPCs so this change
stays scoped to the player and the defender.

## 2. The defender

The single highest-value item here. It converts a shooting drill into a game and
it is a prerequisite for multiplayer being worth playing.

One opponent, five states:

| State | Behaviour | Exit |
| --- | --- | --- |
| `closeout` | Sprint to a contest position between player and hoop | within contest radius |
| `guard` | Mirror lateral movement, maintain spacing | player gathers, or beaten |
| `contest` | Raise arms, shrink the shot window | shot released |
| `recover` | Beaten — sprint back toward the hoop | regains spacing |
| `rebound` | Contest the miss | possession resolved |

**Contest is a window modifier, not a collision.** In `releaseShot()`, multiply
`half` by a contest factor before `perfectWindow()`:

```
contested (in face)   half *= 0.55
late contest          half *= 0.75
open                  half *= 1.0
wide open (beaten)    half *= 1.20
```

That slots into the existing chain beside `DIFFICULTY[...].window` and the
per-spot multipliers, so it needs no new machinery.

**Beating the defender** is the skill: a crossover input (double-tap lateral)
triggers `crossover`, and if the defender's lateral velocity is committed the
wrong way, it forces `recover` and you get a wide-open look. That is the
moment-to-moment decision the court currently lacks.

Difficulty scales closeout speed and recovery time, not the window directly —
`DIFFICULTY` already has `scramble`, which is the natural hook.

## 3. Attributes

Every attribute must change how the ball *feels*. A stat that only multiplies a
score is a spreadsheet entry.

| Attribute | Maps to | Effect |
| --- | --- | --- |
| `shooting` | `currentTier().perfectHalfWidth` | wider green window |
| `handle` | crossover speed, dribble recovery | beat the defender more often |
| `speed` | `PLAYER_SPEED` / `PLAYER_RUN` on court | create separation |
| `defense` | your own contest factor when guarding | matters in multiplayer |
| `stamina` | drains on sprint; low stamina widens `noise` | late-game shots wobble |

Range 1–20, starting 5. Earn through play: makes raise `shooting`, successful
crossovers raise `handle`, completed games raise `stamina`. Cap gains per session
so one grind session cannot max a stat.

Store on the existing save, and mirror to Neon per user once multiplayer lands —
attributes are what a ranked ladder is ranked on, so they cannot stay purely
client-side forever.

**Gear is cosmetic only.** The moment a purchased hoodie raises `shooting`, real
money buys competitive advantage and the ladder is worthless. Real products
unlock virtual fits; fits change how you look, never how you play.

## 4. Multiplayer: HORSE first

`p2p.ts` is full-mesh WebRTC with an unreliable `state` channel and a reliable
`reliable` channel, and its header states it is client-authoritative. That is
fine for co-presence and unacceptable for a competitive score.

**HORSE sidesteps the entire problem.** It is turn-based, so every turn is a
discrete verifiable event over the reliable channel, and `HORSE_CALLS` already
exists in `courtPlay.ts`. Real-time 1v1 needs a rework of the authority model;
build it only after HORSE proves people want to play each other.

### Turn protocol (reliable channel)

```
match_offer     { matchId, seed, calls[] }
match_accept    { matchId }
turn_call       { matchId, turn, call }              // "CORNER"
turn_shot       { matchId, turn, spot, power, contest, made, arc }
turn_verify     { matchId, turn, ok }                // recomputed by opponent
turn_letter     { matchId, turn, letter }            // H-O-R-S-E
match_end       { matchId, winner }
```

The shooter sends `turn_shot`. The opponent recomputes the make from
`(seed, turn, spot, power, contest, attributes)` using the same pure function and
replies `turn_verify`. A mismatch voids the turn and flags the match. No server
needed for v1 — the opponent is the referee, and the maths is cheap.

Attributes travel in `match_offer` and are pinned for the match, so nobody edits
a stat mid-game.

### Determinism (required, do this first)

The noise in `releaseShot()` is seeded from `this.clock`:

```ts
const n1 = Math.sin(this.clock * 37.1 + this.ball.shots * 4.2);
```

Wall clock differs per client, so verification is impossible. Replace with a
seeded PRNG keyed on `(matchSeed, turnIndex, shotIndex)`. `rng.ts` already
exists. Single-player behaviour is unchanged — the noise stays pseudo-random,
it just becomes reproducible.

Extract the whole grade computation into a pure function:

```ts
export function gradeShot(input: ShotInput): ShotResult
```

taking spot, power, heat, difficulty, contest, attributes, and seed; returning
grade, made, and arc velocities. `releaseShot()` becomes a thin caller. This is
the single change that makes verification, replay, and unit tests all possible,
and it should land before any networking work.

## 5. Commerce

`store-products.json` already carries real products, prices, sizes, and
`virtualOutfitId` linking each to an in-game fit. `engine.ts:2872` already frames
try-on then buy.

The only missing piece is that `storeUrl` points at `/product/<slug>` on this
domain. Point it at the live storefront and open it in a new tab.

**Do not build checkout inside the game.** Payments, PCI scope, tax, and
fulfilment are a business, not a feature. The storefront already solves them.

## Build order

1. `gradeShot()` extraction + seeded RNG. Pure, testable, unblocks everything.
2. Rigged character with the clip set.
3. Defender AI with contest-as-window-modifier.
4. Crossover input and the beat/recover exchange.
5. Attributes wired to the five physics parameters.
6. HORSE over the reliable channel, verified.
7. `storeUrl` repointed to the live store.

**Stop after 4 and play it.** If beating a defender for an open look is not
satisfying, attributes and multiplayer will not rescue it — and you will have
learned that in four steps rather than seven.

## Acceptance

- `gradeShot()` is pure: same inputs give identical output across processes.
- Contested and open shots from the same spot at the same power give
  measurably different make rates.
- The crossover can beat the defender, and a beaten defender visibly recovers.
- Every attribute has an observable effect with no HUD open.
- A full HORSE match completes between two browsers, and a tampered
  `turn_shot` is rejected by `turn_verify`.
- Purchased gear changes appearance and nothing else.
- QA screenshots: open shot, contested shot, crossover beat, HORSE turn.
