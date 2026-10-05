# Veiled City Multiplayer Discord v3.3.1 — Validation Report

Validation date: 2026-10-05

## Result

**PASS**

## Verified

- JavaScript syntax check passed for all `bot/src/*.js` and `bot/scripts/*.mjs` files.
- Discord command schema validator passed with **19 root commands**.
- Largest command definition: `/vc-encounter` at **1649 / 8000** Discord command characters.
- `/vc-character` including the new context/hook commands: **1211 / 8000** command characters.
- Offline smoke test passed under Node 24's built-in SQLite implementation.
- v3.3.0 → v3.3.1 SQLite migration test passed with an existing character preserved and the new GM-hook table created additively.
- Player-safe character-concept context excludes GM-only and character-private facts in regression testing.
- Character-concept ZIP generation passed and includes AI instructions, current campaign context, Player Compendium, import examples, and GM import instructions.
- External `GM_HOOKS` import persistence passed.
- Imported GM-hook relationship edges are stored with GM visibility.
- Canon suggestions from external character creation remain proposals and are **not** automatically entered into authoritative canon.
- Imported GM-only hooks are available to Veilkeeper's normal GM context, party assembly, and late/replacement arrival planner.
- GM-only hook records are included in campaign snapshots/rollback and future GM character exports.
- Existing v3.3.0 relationship, handout, aftermath, combat, canon, downtime, level-up, export, and NPC-proxy regression tests still pass.
- Bundled Veiled City content validator passed: **84 domain cards, 51 Markdown files, 10 JSON files**.

## New commands checked

```text
/vc-character context-export [history_sessions]
/vc-character import-gm-hooks file:<json> [character]
```

`history_sessions` accepts 1–25 and defaults to 10.

## Notes

The build environment did not perform a live Discord registration or a live OpenAI request because production credentials are intentionally not present. Command-schema validation used a local API-shape stub solely to execute the offline validator; the shipped ZIP contains no test stubs or `node_modules` directory.
