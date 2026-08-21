# $ackReligious: Memphis

Stylized third-person Memphis fashion/culture adventure. Play as Benji on Drop Day: walk the city, link with K Blanco, move the drop, ball the 901 Court, earn $ackdollars and Respect, wear virtual fits, and discover real SackReligious clothing.

**Build:** `0.9.0-rc`  
**Chapter 1:** The Drop Day (8 missions)

## Run

```bash
npm install
npm run dev
```

Open the preview. Press **ENTER MEMPHIS**.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Live game |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `node scripts/mission-test.mjs` | Chapter 1 mission flow |
| `node scripts/commerce-smoke.mjs` | BUY IRL / catalog |
| `node scripts/save-smoke.mjs` | Save versioning / no double rewards |

## Controls

**Desktop:** WASD move · Shift run · Space jump · E interact · Q/R or mouse look · V camera · Esc pause · F / hold shoot on court

**Mobile:** left stick, camera drag, interact, run, jump, shoot. Landscape preferred. Portrait shows a rotate prompt.

## What this is

A vertical-slice commercial game that can be embedded from the SackReligious site. The game is the discovery layer. Real checkout stays on the storefront. The client never collects cards or holds commerce secrets.

## Config

See `.env.example` for public variables only:

- `VITE_STORE_BASE_URL`
- `VITE_PRODUCT_CATALOG_URL`
- `VITE_ALLOWED_PARENT_ORIGIN`
- `VITE_ANALYTICS_ENABLED`
- `VITE_GAME_BUILD_VERSION`

Catalog for development: `public/config/store-products.json`

## Docs

- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)
- [docs/MISSIONS.md](docs/MISSIONS.md)
- [docs/WORLD.md](docs/WORLD.md)
- [docs/BASKETBALL.md](docs/BASKETBALL.md)
- [docs/VEHICLES.md](docs/VEHICLES.md)
- [docs/COMMERCE.md](docs/COMMERCE.md)
- [docs/LOVABLE_INTEGRATION.md](docs/LOVABLE_INTEGRATION.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/ASSET_GUIDE.md](docs/ASSET_GUIDE.md)
- [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md)
