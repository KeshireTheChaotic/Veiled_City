# P06-F63 — Support Thorn-Hound of the Green Urban Cover

Status: SUPPORTED; TARGETED DELTA PASS. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `ef0718e967fd6080275d7470c2fb58f3dd8a0571`; implementation `4556eab319ee91e92ab66d26bc1356948cc3a248`.

Exact occurrence: `adversary:thorn-hound-of-the-green:urban-cover`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#thorn-hound-of-the-green/features/0`; source SHA-256 `b070e02d7b77c2c798e43d35f034a5099cc8d847de9e62effca245104e9a4689`; template SHA-256 `635605d21fb6678134b9c6c825a216849d8ca4b8ec854ad719ccb1207103e861`.

Expose the exact Passive cue in current GM-owned Hound context. Do not invent or commit a live path, range proof, movement, or concealment result. This adds no limit to NPC autonomy or world invention.

Changed modules: definitions/catalog, Urban Cover projector, adversary context. Fresh test `bot/tests/ai-gm-2026-10/p06-f63.test.mjs` and changed shared-module coverage from `coverage.json`. Frozen run `p06-f63-20261022-a` passed 229/229 across 60 fresh files; changed JS/MJS syntax 5/5 and JSON parse 2/2. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No historical tests or broad validation.

Local hold: route/range qualification, hidden movement and observable concealment effect/replay are not implemented by this context cue. Roll back only this occurrence; preserve history/state and user-created P07–P09 plans.
