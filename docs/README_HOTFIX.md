# Veiled City v3.3.3 — Character Narrative Markdown Hotfix

Use this over an existing **v3.3.2** installation.

## Adds

- `PLAYER/PLAYERS/<Character_Name>.md` player-safe narrative storage/export.
- `GM_PRIVATE/PLAYERS/GM_PRIVATE_<Character_Name>.md` GM-private narrative storage/export.
- `/vc-character narrative-import`
- `/vc-character narrative-export`
- Optional narrative `.md` attachments on `/vc-character import` and `/vc-character import-gm-hooks`.
- Runtime use of custom narrative in GM turns, assembly, arrivals, encounter aftermath, and relevant downtime.
- Snapshot/rollback support for narrative Markdown.

## Upgrade

Preserve your existing `bot/.env` and `bot/data/veiled_city.sqlite`, overlay this hotfix, then run from `bot/`:

```text
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc-character` changed.
