# P06-F51 — Support the source-bound Blank Spot cue

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `bbcf67af0d01d6ffa63884f3aa5e918aca148033`; implementation commit `d9014fcc839415e25a658689e7d6a2578158417f`.

Exact occurrence: `adversary:memory-leech:blank-spot`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#memory-leech/features/0`; source SHA-256 `c872fbbcf0242e6575af470a070cf641ee5ebade82b3f3643d7d5b9c888fd4f6`; template SHA-256 `a906b9fd4344bc9506b68079108ad467733de538e46547897f221dbc01ff4b1e`.

Expose the exact Reaction cue in current verified GM-private Memory Leech context. This adds no narrative or player-choice limitation. The damage event, PC Knowledge Reaction Roll, difficulty, Experience selection/temporary access state, and expiry are not committed here and remain native-mechanics holds.

Only fresh tests in `bot/tests/ai-gm-2026-10/`; one frozen mapped batch and changed-file syntax checks. No legacy tests, broad runner, provider spend, model judge or polling. Preserve player agency, private audiences and saved readers.

## Qualification

Frozen run `p06-f51-20261022-a` passed 181/181 cases across 48 fresh files, with no repair or rerun. Changed JS/MJS syntax 5/5 and JSON parse 2/2 passed. See [targeted evidence](../../evidence/P06_F51_TARGETED.json).
