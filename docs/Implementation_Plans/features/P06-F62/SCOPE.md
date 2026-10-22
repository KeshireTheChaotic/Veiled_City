# P06-F62 — Support Pale Court Fixer Call Security

Status: SUPPORTED; TARGETED DELTA PASS. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `671b695bff4279401b4408748f53dfe3177df4e7`; implementation `20f1e117a1330f4b054d6fd1c971aaa7e82ad066`.

Exact occurrence: `adversary:pale-court-fixer:call-security`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#pale-court-fixer/features/1`; source SHA-256 `f7f8a79df4ae31e3838293f15af2d8f40dd221de5b7a1cc4bddca1ec1f9199e2`; template SHA-256 `af98ed2fad3b9caa86fc9353a5409779ce9df91b38597b4f8ce6795837ebc325`.

Expose the exact source-bound Action cue in current GM-owned Fixer context. Preserve the authored Fear cost, pair-at-Far description, and security acting toward the Fixer's objective without treating them as suicidal pawns. The cue itself spends no Fear and introduces no NPCs or actions. This implements the existing authored behavior without an additional NPC/faction-autonomy restriction.

Changed modules: descriptor/catalog, Call Security projector and adversary context. Fresh test `bot/tests/ai-gm-2026-10/p06-f62.test.mjs` plus mapped tests for changed shared modules. Frozen `p06-f62-20261022-a` passed 225/225 across 59 fresh files; changed JS/MJS syntax 5/5 and JSON parse 2/2. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No legacy tests/fixtures/registries, broad validation or paid provider tests.

Local hold: Fear spend, pair creation, range validation, objective-bound action and replay receipts are not implemented in this cue adapter. Roll back only the occurrence-scoped changes; preserve history/state and user-created P07–P09 files.
