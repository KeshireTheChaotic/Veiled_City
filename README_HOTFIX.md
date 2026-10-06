# Veiled City v3.3.2 Canon Proposal Review Hotfix

Overlay this package onto an existing **v3.3.1** installation.

Preserve your existing:

```text
bot/.env
bot/data/veiled_city.sqlite
```

Then from `bot/` run:

```bash
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc-canon proposals` and `/vc-canon proposal-resolve` were added.

The SQLite change is additive. The new `canon_proposals` table is created automatically, and existing v3.3.1 `canon_suggestion` hooks are backfilled on first proposal review.
