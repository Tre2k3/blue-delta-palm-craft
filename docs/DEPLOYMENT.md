# Deployment

Static / browser game. Compatible with iframe embed from Lovable.

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run build` is the Vercel path (vite + db migrate). Preview uses relative `/game/...` and `/config/...` assets — no localhost URLs.

## Cache

Game art under `public/game/` can be long-cached. `public/config/store-products.json` should stay short-cache or no-store so merch updates land.

## Embed

- HTTPS parent + child
- `VITE_ALLOWED_PARENT_ORIGIN` exact match
- SPA fallback to `/` for deep links
- Viewport: `width=device-width, initial-scale=1, viewport-fit=cover`

## Version

Settings footer shows `0.9.0-rc` (`VITE_GAME_BUILD_VERSION`). Not shown during normal play HUD.
