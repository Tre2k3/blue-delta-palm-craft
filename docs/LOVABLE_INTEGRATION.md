# Lovable integration

Two modes.

## Mode A — iframe embed

Set `VITE_ALLOWED_PARENT_ORIGIN` to the exact store origin (no `*`).

Parent listens for:

```
{ ns: "SACK", type: "SACK_GAME_READY", version }
{ ns: "SACK", type: "SACK_PRODUCT_VIEW", productId, slug, name }
{ ns: "SACK", type: "SACK_PRODUCT_BUY", productId, slug, name, storeUrl }
{ ns: "SACK", type: "SACK_MISSION_COMPLETE", missionId, stepId }
{ ns: "SACK", type: "SACK_CHAPTER_COMPLETE", chapter }
```

On `SACK_PRODUCT_BUY`, route the customer to the real product page / checkout on the store.

## Mode B — separate routes

Leave `VITE_ALLOWED_PARENT_ORIGIN` empty. BUY IRL / View product open `VITE_STORE_BASE_URL` + `/product/{slug}` (or the catalog `storeUrl`).

## Env

See `.env.example`. All values are public. Catalog schema is `public/config/store-products.json`.

## Mobile

Landscape first. Portrait shows **Rotate your phone**. Touch stick + interact + jump + shoot ship with the HUD.
