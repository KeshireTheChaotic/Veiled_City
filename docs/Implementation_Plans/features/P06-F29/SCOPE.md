# P06-F29 — Support the source-bound Three Vectors clue prompt

Status: SUPPORTED / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `3a27718e0a06292dcc9f8cc4a94b379b457bdb06`; implementation/tested source SHA `f7c5ac3f8ff185b9a130dfeb9f183b94d4d97a95`.

Exact occurrence: `environment:occult-crime-scene:three-vectors`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#occult-crime-scene/features/1`; source SHA-256 `f13ec7906cebddae5670f1d51109a36b2fa6ec160e5ce901f40f690d033d2dbd`; template SHA-256 `1071538ee24df905ae15f67823f9478a619871b4dd30ab23d3b7d317535b602f`.

The exact source-bound clue prompt reaches the scoped GM. The GM creates three concrete approaches across the printed evidence domains; the PC chooses one. A Fear result may prompt the GM to move another interested party along another vector. Context commits no clue, PC choice, roll result or faction movement. No Daggerheart mechanic changes.

Changed modules: `bot/src/native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js`, `native-environment-scene.js`, new `native-environment-three-vectors.js`, coverage mapping, and fresh F01/F29 tests. Full paths and SHA-256 values are in [targeted evidence](../../evidence/P06_F29_TARGETED.json).

Fresh mapped run `p06-f29-20261021-a` and repairs are fully reported in evidence. Final unique affected cases: 96/96 passed; six changed JS/MJS syntax checks and two changed JSON parses passed. Code commit: `f7c5ac3f8ff185b9a130dfeb9f183b94d4d97a95`. Provider calls/tokens/spend 0/0/$0; no cache savings claimed; Codex usage unavailable.

No creative/autonomy restriction or owner question introduced; no critical blocker. Local holds: 111 other review-only occurrences, actual clue fiction/choice and faction actions, live delivery/provider behavior, and complete release qualification. Roll back only this occurrence's adapter/catalog changes while preserving saved readers and native receipts. Release authorization: false.
