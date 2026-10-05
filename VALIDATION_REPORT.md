# Veiled City Multiplayer Discord Engine v3.3.0 — Validation Report

## Result
**PASS**

## Static validation
- All bot `src/*.js` and `scripts/*.mjs` pass `node --check` under Node 22.16.0.
- Discord command schema preflight passes with **19 root commands**.
- Largest command is `/vc-encounter` at **1,649 / 8,000** counted Discord command characters.
- No required-after-optional slash-command ordering errors were detected.

## Offline runtime validation
`bot/scripts/offline-smoke-test.mjs` passes with provider/Discord dependencies stubbed only to prevent live network calls. Tested areas include:
- campaign/session/character persistence
- automatic new-character hook relationship seeding
- one-time legacy hook relationship import and repeat-safe skipping
- relationship mutation
- handout persistence and JSON/Markdown/DOCX export
- encounter PC start-state capture
- encounter aftermath draft/status primitives
- character export and existing v3.2 systems exercised by the smoke suite
- structured JSON retry behavior without a live provider call

## Migration validation
A database created from the v3.2.4 schema was opened by v3.3.0 and verified to preserve legacy character data while adding:
- `relationships`
- `relationship_hook_imports`
- `handouts`
- `encounter_aftermath`
- `encounters.pc_start_state_json`

The legacy hook backfill created relationship edges on the first run and created none on the second run.

## Content validation
`content/ENGINE/validate_package.py` passes:
- Domain cards: **84**
- Markdown files: **51**
- JSON files: **10**

## Not exercised live
The validation environment did not connect to a real Discord guild or OpenAI API. Live handout generation, live aftermath generation, Discord attachment delivery, and live command registration require the operator's credentials and billing configuration.
