# Commerce

The game never checks out.

## Split

| Layer | What it is |
| --- | --- |
| Virtual item | Owned with $ackdollars, equipped on Benji, saved locally |
| Real product | Catalog entry with `storeUrl`. BUY IRL opens the store or posts to the parent iframe |

Owning a virtual tee does **not** mean a real product was purchased.

## Modules

- `StoreProduct` in `src/game/commerce.ts`
- `ProductCatalog` loads `public/config/store-products.json` (or `VITE_PRODUCT_CATALOG_URL`)
- `StoreBridge` posts `SACK_*` events to `VITE_ALLOWED_PARENT_ORIGIN` when embedded
- `CommerceService` is the only gameplay entry (`viewProduct`, `buyIrl`)

Missions and wardrobe reference `productId` / `virtualOutfitId`, not raw checkout URLs scattered in UI.

## Security

No Stripe secrets. No card fields. No trusted totals in the client. The storefront / backend creates any Checkout Session.

Gold chain virtual unlock is gated by **20 Respect**.
