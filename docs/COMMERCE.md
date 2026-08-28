# Commerce

The game never checks out. Lovable / 10letters.store owns payment.

## Split

| Layer | What it is |
| --- | --- |
| Virtual item | Owned with $ackdollars, **worn on Benji** (recolor + product graphic on every walk/run/jump plate), saved locally |
| Real product | Live catalog entry. Inspect → Try on Benji → BUY IRL posts `GG_ADD_TO_CART` or opens the product URL |
| Verified IRL reward | Store backend confirms the order, then sends `SR_REWARD`. The game never trusts a client “purchase complete” |

Owning a virtual tee does **not** mean a real product was purchased.

## Catalog

Fallback JSON: `public/config/store-products.json` with unique product cards in `/game/products/`.

When embedded, parent `SR_CATALOG` replaces the fallback. Fields: `id`, `name`, `price`, `image`, `sizes`, `url`, `available`, `virtualOutfitId`.

`virtualOutfitId` must match an `ApparelId` (`starter_tee`, `classic_green`, `moneybag_hoodie`, `black_hoodie`, `fresh_jersey`, `white_cap`, `gold_chain`, `green_sweats`, `gold_drop`, `night_run`).

## postMessage envelope

Both directions:

```
{ source: "sackreligious" | "grokgame", version: 1, type: string, payload: object }
```

Parent source is `sackreligious`. Game source is `grokgame`. Never `*`.

### Game → parent

| Type | Payload |
| --- | --- |
| `GG_READY` | `{ gameId: "blue-delta-palm-craft", capabilities: ["rewards","cart","identity"] }` |
| `GG_REQUEST_CATALOG` | `{}` |
| `GG_ADD_TO_CART` | `{ productId, size, qty }` — ids from `SR_CATALOG` |
| `GG_RUN_COMPLETE` | `{ runId, score, durationMs, level? }` once per finished run |
| `GG_UNLOCK` | `{ rewardKey, label }` |

### Parent → game

| Type | Payload |
| --- | --- |
| `SR_INIT` | `{ origin, currency?, theme? }` |
| `SR_PLAYER` | `{ signedIn, userId, displayName, sackBucks }` — latest wins |
| `SR_CATALOG` | `{ products: LiveProduct[] }` |
| `SR_ACK` | `{ forType, ok, error?, granted?, sackBucks? }` |
| `SR_PAUSE` / `SR_RESUME` | `{}` |
| `SR_REWARD` | `{ orderId, verified: true, productId?, grants }` |

`SR_REWARD` is ignored unless `verified === true` and `orderId` is a unique string (≥ 6 chars). Duplicate `orderId`s are rejected. Grants may include `sackdollars`, `respect`, `apparelId`, `colorway`, `badge`, `vanSkin`.

If `signedIn` is false: play stays on, rewards stay off, HUD shows “Sign in to earn Sack Bucks”.

Sack Bucks HUD always reads `SR_ACK.sackBucks` / `SR_PLAYER.sackBucks`. The game never computes the real-money balance.

Gold chain virtual unlock is gated by **20 Respect**. IRL Gold Drop is granted only by `SR_REWARD`.
