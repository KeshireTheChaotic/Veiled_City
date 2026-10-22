# P06-F50 — Support the source-bound Drag Down cue

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `5c6e9e6f70488282ef62ffb529494866b9cace29`; implementation commit `25ad4cc74929ad248eff3940e043459c72dc4b88`.

Exact occurrence: `adversary:river-hound:drag-down`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#river-hound/features/1`; source SHA-256 `ab4fd58eea112dcd07cd4a890d85c0b70a0a80edb42e791b3fa60815635bdba2`; template SHA-256 `3f7e7cc1ce17c16b7e50d3e1b86822d11f57c60ac97ff49f066df2cae91da9cd`.

Expose the exact Action cue in current verified GM-private River Hound context. This adds no narrative/autonomy restriction and commits no Fear spend, triggering attack result, PC Strength Reaction Roll, movement, Vulnerable state, or footing recovery. Each native mechanical choice and result remains independently authoritative.

Only fresh tests in `bot/tests/ai-gm-2026-10/`; one frozen mapped batch and changed-file syntax checks. No legacy tests, broad runner, provider spend, model judge or polling. Preserve player agency, saved readers and privacy.

## Qualification

Frozen run `p06-f50-20261022-a` passed 177/177 cases across 47 fresh files with no repair or rerun. Changed JS/MJS syntax 5/5 and JSON parse 2/2 passed. See [targeted evidence](../../evidence/P06_F50_TARGETED.json).
