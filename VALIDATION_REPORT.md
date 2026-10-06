# Veiled City Multiplayer Discord v3.3.3 — Validation Report

Validation date: 2026-10-06

## Result

**PASS**

## Verified

- JavaScript syntax checks passed for all application modules and scripts exercised by `npm run check`.
- Discord command schema validator passed with **19 root commands**.
- Largest command definition is now `/vc-character` at **1661 / 8000** Discord command characters.
- `/vc-encounter` remains **1649 / 8000** command characters.
- Offline smoke test passed under Node **22.16.0** with built-in SQLite.
- v3.3.2 → v3.3.3 SQLite migration test passed against an actual v3.3.2 schema/database.
- New `character_narratives` table is additive and preserves existing character/campaign rows.
- Player-safe and GM-private Markdown narratives persist independently per character.
- GM-private narrative is excluded when querying player-safe narrative state.
- Narrative ZIP export passed integrity testing and preserves the exact portable paths:
  - `PLAYER/PLAYERS/<Character_Name>.md`
  - `GM_PRIVATE/PLAYERS/GM_PRIVATE_<Character_Name>.md`
- Missing narrative scopes export an editable scaffold rather than silently disappearing.
- `/vc-character import` supports an optional player narrative Markdown attachment.
- `/vc-character import-gm-hooks` supports an optional GM-private narrative Markdown attachment.
- `/vc-character narrative-import` enforces ownership/GM scope rules and `.md` input.
- `/vc-character narrative-export` enforces player/GM visibility rules and returns a path-preserving ZIP.
- Imported narrative is included as supplemental AI context for normal GM turns, party assembly, character arrival planning, encounter aftermath, and relevant downtime.
- Structured character JSON remains authoritative for mechanics/resources; canon-ledger instructions remain authoritative for durable world truth.
- Campaign snapshots/rollback include `character_narratives`; rollback preservation was verified.
- Full CLI campaign export includes character narratives for GM/full exports and omits them from generic player-safe campaign export.
- External character-context package now documents both narrative Markdown paths and updated v3.3.3 GM-hook schema.
- Existing relationship, handout/evidence, encounter aftermath, combat, canon proposal, downtime, level-up, export, and NPC-proxy regression tests still pass.
- Bundled content JSON parsed successfully: **84 domain cards, 53 Markdown files, 10 JSON files**.

## New/changed commands checked

```text
/vc-character import file:<json> [narrative:<md>]
/vc-character import-gm-hooks file:<json> [character] [narrative:<md>]
/vc-character narrative-import character:<name> scope:<player|gm_private> file:<md>
/vc-character narrative-export [character] [scope:<player|gm_private|all>]
```

## Notes

The build environment did not perform a live Discord registration or live OpenAI request because production credentials are intentionally not present. Command-schema validation used temporary local API-shape stubs solely to execute the offline validator; those stubs and `node_modules` were removed before packaging.
