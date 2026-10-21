# P06-F47 — Support the source-bound Snatch a Link cue

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `cde49c2606e1d0c8f37cbc9150b9d07a7225a758`; implementation commit `7c2116fdaa1d85c4fc093848eb888dfff37d2ded`.

Exact occurrence: `adversary:hexbound-familiar:snatch-a-link`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#hexbound-familiar/features/1`; source SHA-256 `15c41c45de84456c7b2d146cb81c43d3f164888877d94bd8f139694400ddb6bc`; template SHA-256 `0a5f3ad656065cd58170d87898c31d2b67baa4929d63796fadd97c82a510878a`.

Expose the exact Action cue in current verified GM-private Familiar context. This adds no narrative/autonomy restriction and commits no actor/target attack roll, damage, exposed-object finding, theft, or inventory change. Source event and native attack/effect receipt remain local holds.

Only fresh tests in `bot/tests/ai-gm-2026-10/`; one frozen mapped batch and changed-file syntax checks. No legacy tests, broad runner, provider spend, model judge or polling. Preserve saved readers, player agency and audience privacy.

## Qualification

Frozen run `p06-f47-20261021-a` passed 168/168 cases across 45 fresh files, with no repair or rerun. Changed JS/MJS syntax 5/5 and JSON parse 2/2 passed. See [targeted evidence](../../evidence/P06_F47_TARGETED.json).
