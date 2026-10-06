# Upgrade v3.3.2 → v3.3.3

v3.3.3 adds persistent freeform character Markdown for narrative that is not represented by the structured character JSON.

Preserve your existing:

```text
bot/.env
bot/data/veiled_city.sqlite
```

Overlay the v3.3.3 files, then from `bot/` run:

```bash
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc-character` gains `narrative-import` and `narrative-export`, and the existing import commands gain optional Markdown attachments.

The SQLite migration is additive. `character_narratives` is created automatically at startup; no manual migration command is required.

Existing characters do not require conversion. Import narrative only when a character has prose that is useful to Veilkeeper but is not already represented adequately by JSON/hook/canon state.
