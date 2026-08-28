# Lovable / 10letters.store integration

The game at the Grok preview origin embeds in an iframe on `https://10letters.store` (and Lovable previews).

## Security

- Parent may only message from:
  - `https://10letters.store`
  - `https://www.10letters.store`
  - `https://sackreligious.lovable.app`
  - any `https://*.lovable.app` preview
- Game posts to `window.parent` with an explicit target origin (from `SR_INIT.payload.origin` or `document.referrer`). Never `"*"`.
- Ignore envelopes that are not `{ source, version: 1, type, payload }`.
- Do not set `X-Frame-Options: DENY` or a CSP `frame-ancestors` that blocks 10letters.store / `*.lovable.app`.

## Boot

On load the game posts:

```
{ source: "grokgame", version: 1, type: "GG_READY",
  payload: { gameId: "blue-delta-palm-craft", capabilities: ["rewards","cart","identity"] } }
```

Parent should reply `SR_INIT`, then `SR_PLAYER`, then `SR_CATALOG`.

## Real purchase rewards

Do **not** have the browser tell the game “purchase complete.”

1. Customer BUY IRL → game posts `GG_ADD_TO_CART`
2. Store checkout + webhook confirms the order
3. Backend posts to the iframe:

```
{ source: "sackreligious", version: 1, type: "SR_REWARD",
  payload: {
    orderId: "ord_...",          // unique, stable
    verified: true,
    productId: "sr-moneybag-hoodie",
    grants: {
      sackdollars: 120,
      respect: 8,
      colorway: "gold_drop",
      badge: "irl_family"
    }
  }
}
```

## Pause

`SR_PAUSE` / `SR_RESUME` plus `document.hidden` both freeze the loop.

## Mobile

Portrait and landscape both play. Touch HUD: MOVE stick, RUN, JOOK, JUMP, SHOOT (hold), PARK/interact. Landscape is recommended, not required.

## Env

See `.env.example`. All values are public. Catalog fallback is `public/config/store-products.json`.
