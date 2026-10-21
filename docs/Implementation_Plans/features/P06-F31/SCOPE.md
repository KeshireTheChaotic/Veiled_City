# P06-F31 — Support the source-bound Contaminated Scene rule cue

Status: SUPPORTED / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `d1d406e42e2dbcc5bdd86627d37b291a5dc2c246`; implementation/tested source SHA `f2e9f9b35f9f5f219b3e2b63bd7b0cf6f05adb3d`.

Exact occurrence: `environment:occult-crime-scene:contaminated-scene`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#occult-crime-scene/features/0`; source SHA-256 `0179a99660fbf070aeff4517dc113d273e254aaab397a963acaa8d04731d450a`; template SHA-256 `1071538ee24df905ae15f67823f9478a619871b4dd30ab23d3b7d317535b602f`.

The scoped GM receives the exact trigger and +1 Veil Exposure consequence when mundane investigators are present. Existing native state/privacy gates remain the only campaign-change route; this context adapter applies no delta. No Daggerheart dice or player choices change.

Changed modules: `bot/src/native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js`, `native-environment-scene.js`, new `native-environment-contaminated-scene.js`, coverage map, fresh F01/F31 tests. Full input/test SHA-256 values: [targeted evidence](../../evidence/P06_F31_TARGETED.json).

Run `p06-f31-20261021-a`: 104/104 fresh tests passed across 29 mapped files, no repair/rerun, 2523.10 ms. Changed JS/MJS syntax 6/6 and JSON parse 2/2 passed. Code commit: `f2e9f9b35f9f5f219b3e2b63bd7b0cf6f05adb3d`. Provider calls/tokens/spend 0/0/$0; no cache savings claimed; Codex usage unavailable.

No new creative restriction or owner question; no critical blocker. Local holds: 109 other review-only occurrences, whether the source trigger occurs in play, actual campaign-state change, live delivery/provider behavior and full release qualification. Roll back only this occurrence adapter/catalog change while preserving saved readers and receipts. Release authorization: false.
