# P06-F61 — Support Pale Court Fixer Reputation Attack

Status: SUPPORTED; TARGETED DELTA PASS. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `a5e867cdca2d916e0735c7da5ba4889838f9666d`; implementation commit `b272b6129dcdc72f31ab6e73a92bc3c5e9a4f58c`.

Exact occurrence: `adversary:pale-court-fixer:reputation-attack`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#pale-court-fixer/features/0`; source SHA-256 `71a92b466bb5be9e0f1aea589e22222a86689989c26257f8b48a8bea6ec7e5af`; template SHA-256 `af98ed2fad3b9caa86fc9353a5409779ce9df91b38597b4f8ce6795837ebc325`.

Expose the exact Action cue only in current GM-owned Fixer context. Preserve the source's one-NPC-Stress cost, PC-relevant institution requirement, disadvantage scope and end conditions in the cue; do not choose the institution, spend Stress, create a misunderstanding, apply disadvantage or decide how it is resolved. No new narrative/autonomy restriction is proposed.

Changed modules: native definitions/catalog, Reputation Attack projector and adversary context. Fresh test `bot/tests/ai-gm-2026-10/p06-f61.test.mjs` plus fresh tests mapped to changed shared modules. Frozen `p06-f61-20261022-a` passed 221/221 across 58 fresh files; changed JS/MJS syntax 5/5 and JSON parse 2/2. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No legacy tests/fixtures/registries, broad validation or provider calls.

Local hold: target validation, Stress spending, institution proof, roll disadvantage state, clear/leverage event handling and replay receipt are not implemented in this context cue. Roll back only this occurrence's adapter/descriptor/test/docs; preserve history, state and user-created P07–P09 planning files.
