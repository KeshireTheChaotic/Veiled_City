# Upgrade v3.3.1 → v3.3.2

Preserve these deployment-specific files:

```text
bot/.env
bot/data/veiled_city.sqlite
```

Overlay the v3.3.2 application/content files, then from `bot/` run:

```bash
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc-canon proposals` and `/vc-canon proposal-resolve` were added.

The database change is additive: v3.3.2 adds `canon_proposals`. Existing v3.3.1 `canon_suggestion` hooks are automatically backfilled when the GM opens the proposal queue; no manual migration command is required.

No new Discord channel, permission, API key, or `.env` setting is required.
