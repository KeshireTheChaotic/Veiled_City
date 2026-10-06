# Veiled City Multiplayer Discord v3.3.2 — Validation Report

Validation date: 2026-10-05

## Result

**PASS**

## Verified

- JavaScript syntax checks passed for all application modules exercised by `npm run check`.
- Discord command schema validator passed with **19 root commands**.
- Largest command definition remains `/vc-encounter` at **1649 / 8000** Discord command characters.
- Updated `/vc-canon` definition is **1017 / 8000** command characters.
- Offline smoke test passed under Node **22.16.0** with built-in SQLite.
- v3.3.1 → v3.3.2 SQLite migration test passed against an actual v3.3.1 schema.
- Legacy v3.3.1 `canon_suggestion` hooks backfill into `canon_proposals` automatically.
- Legacy suggestions whose value already matches current canon are recognized as **accepted** during backfill.
- Imported v3.3.2 canon suggestions enter the proposal queue as **pending** and do not become canon at import time.
- Pending/conflicted canon suggestions are excluded from normal AI-GM character-hook context.
- Proposal **accept** writes through the authoritative canon ledger.
- Proposal **reject** closes the proposal without creating canon.
- Proposal **accept edited value** uses the GM-edited value while preserving original proposal provenance.
- Accepting a contradictory proposal creates a linked normal canon conflict instead of overwriting current canon.
- Resolving a linked conflict synchronizes the originating proposal to **accepted** or **rejected**, including when `/vc-canon resolve` is used directly.
- Campaign snapshots/rollback include `canon_proposals`.
- GM `GM_CANON_character` exports include proposal history/status and linked event/conflict IDs.
- Existing v3.3.1 character-context, GM-hook, relationship, handout, aftermath, combat, canon, downtime, level-up, export, and NPC-proxy regression tests still pass.
- Bundled Veiled City content validator passed: **84 domain cards, 51 Markdown files, 10 JSON files**.

## New commands checked

```text
/vc-canon proposals [status] [character]
/vc-canon proposal-resolve proposal_id:<id> resolution:<accept|reject|custom> [custom_value] [visibility] [note]
```

## Notes

The build environment did not perform a live Discord registration or live OpenAI request because production credentials are intentionally not present. Command-schema validation used a temporary local API-shape stub solely to execute the offline validator. The shipped package contains no test stubs or `node_modules` directory.
