# Veiled City v3.3.3 — Character Narrative Markdown

- Added persistent freeform Markdown for character narrative not covered by structured JSON.
- Standard player path: `PLAYER/PLAYERS/<Character>.md`.
- Standard GM path: `GM_PRIVATE/PLAYERS/GM_PRIVATE_<Character>.md`.
- Added `/vc-character narrative-import` for updating player-safe or GM-private narrative.
- Added `/vc-character narrative-export` with `player`, `gm_private`, or `all`; exports preserve the standard paths inside a ZIP.
- `/vc-character import` now accepts an optional player narrative `.md` attachment.
- `/vc-character import-gm-hooks` now accepts an optional GM-private narrative `.md` attachment.
- Veilkeeper uses imported narrative in normal GM turns, party assembly, character arrivals, encounter aftermath, and relevant downtime.
- Structured JSON remains authoritative for mechanics/resources; the canon ledger remains authoritative for world truth.
- GM-private Markdown is protected from player output until discovered in play.
- Narrative state is included in snapshots/rollback.
- Character-concept context instructions now tell external AI how to create both standard narrative Markdown files.
- Run `npm run register` after upgrading.
