# Deploying SackReligious Memphis

Verified against `main` @ `cb27a2a` on 2026-08-17: typecheck clean, eslint clean
(0 errors, 0 warnings), production build succeeds, production preview boots and
serves valid SSR HTML on port 8080.

`main` is technically deployable today. It is not *correctly configured* for
production yet, for one reason.

## The one thing that will lose player data

`src/lib/db.ts` picks its backend from a single variable:

```ts
export const dbSource: DbSource = databaseUrl ? "neon" : "pglite";
```

With `DATABASE_URL` unset it constructs `new PGlite({...})` with **no data
directory**. That is an in-memory Postgres. On Vercel, every cold start gets a
fresh empty database — accounts, saves, `$ackdollars`, mission progress, and
wardrobe all vanish at intervals nobody can predict.

Nothing catches this. The build succeeds. The smoke tests pass, because CI
*should* run on PGLite. Only players notice, and they notice by losing
everything.

**Fix: set `DATABASE_URL` to a Neon connection string.** No code change is
needed — the backend swap is that one line.

## The interlock that will take the site down

`src/lib/auth/verify.server.ts` throws when `DATABASE_URL` is set and
`VITE_AUTH_ENABLED=false`. That is deliberate and correct — the alternative is
silently serving every request as the shared dev user against a real database.
But it means setting only half the config takes production down on its first
request.

**Set both together, or neither.**

## Required Vercel environment variables

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres connection string | Required. Without it, all data is ephemeral. |
| `VITE_AUTH_ENABLED` | `true` | Required whenever `DATABASE_URL` is set. |
| `VITE_STUN_URLS` | e.g. `stun:stun.l.google.com:19302` | Optional. Multiplayer may fail behind symmetric NAT without it. |

Note that `npm run build` runs `db:migrate`, which connects to `DATABASE_URL`.
The Vercel build environment needs network access to your Neon host, and the
variable must be present at **build** time, not just runtime.

## `scripts/preflight.mjs`

Added to turn both traps into loud, early failures. It is wired into `build`:

```json
"build": "node scripts/preflight.mjs && vite build && npm run db:migrate"
```

Behaviour, all four paths verified:

| Environment | Result |
| --- | --- |
| Local / CI, no `DATABASE_URL` | passes with a warning — PGLite is correct here |
| Deployed, no `DATABASE_URL` | **blocks** — explains the data-loss failure mode |
| Deployed, `DATABASE_URL` set + auth disabled | **blocks** — explains the interlock |
| Deployed, both set correctly | passes |

"Deployed" is detected via `--deployed`, `VERCEL=1`, or `NODE_ENV=production`,
so Vercel triggers it automatically and CI does not.

Run it standalone any time with `npm run preflight`.

## Also changed

Removed an unused `eslint-disable` directive in
`src/lib/auth/use-current-user.ts`. Verified the rule does not fire without it,
so lint is now 0 errors and 0 warnings. `npm run lint` does not use
`--max-warnings=0`, so this was never failing CI — it was noise that would have
hidden a real warning later.

## Branch consolidation — do this before shipping anything else

There are **nine unmerged branches carrying 241 commits**, and they are the
real obstacle:

| Branch | Commits | Files changed | Files with `@ts-nocheck` |
| --- | --- | --- | --- |
| `feature/full-game-overhaul-v8` | 87 | 33 | **15** |
| `feat/world-life-pass` | 55 | 77 | 0 |
| `fix/world-collision-road-traffic` | 35 | 18 | **5** |
| `fix/camera-occlusion` | 14 | 64 | 0 |
| `feat/hq-interior-clean` | 13 | 65 | 0 |
| `feat/apartment-interior` | 11 | 65 | 0 |
| `feat/hq-interior` | 9 | 64 | 0 |
| `fix/clean-sprites-jump-actions` | 9 | 63 | 0 |
| `feat/chapter1-feel` | 8 | 64 | 0 |

Two things to read from that table.

**`@ts-nocheck` came back.** Twenty files across the two oldest branches. Those
are the same two branches that produced the `runtimeV2`–`V7` patch stack.
Neither should be merged. Cherry-pick anything worth keeping, retype it, and
delete the branches.

**Six branches each touch 63–65 files.** They are overlapping rewrites of the
same files, developed in parallel, none of them rebased on the others. They
cannot all be merged — whichever lands second faces a conflict across sixty
files, which in practice means someone regenerates it and loses work.

Suggested order, one at a time, each rebased on `main` and each passing CI
before the next starts:

1. `feat/world-life-pass` — largest clean branch, sets the shape of the world
2. `fix/camera-occlusion` — small, and camera work touches everything
3. `feat/hq-interior-clean` — pick one of the two HQ branches, delete the other
4. `feat/apartment-interior`
5. `fix/clean-sprites-jump-actions`
6. `feat/chapter1-feel`

Then delete `feature/full-game-overhaul-v8`, `fix/world-collision-road-traffic`,
`feat/hq-interior`, and `cleanup/world-topology-only`.

Going forward: rebase on `main` daily, and never run two branches that touch the
same sixty files at once.
