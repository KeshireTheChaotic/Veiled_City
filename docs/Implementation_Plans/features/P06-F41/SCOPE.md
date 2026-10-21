# P06-F41 — Support the source-bound Mark the Variable cue

Status: FROZEN FOR ONE TARGETED BATCH. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `f525df56c482ef013ee38c4512701b36e732ed89`.

Exact occurrence: `adversary:aster-vale-occult-analyst:mark-the-variable`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#aster-vale-occult-analyst/features/0`; source SHA-256 `7a4b6412c0eff2dea7bd872a90e6cbed1ab8e2ba0d9fc2f3b6e3dd9db89c91a3`; template SHA-256 `e215752211a9503b2e643616c55d396b2511dff9bd4556c4e3b0e609ae4e61c5`.

Expose the exact source rule only in verified GM-private context for the current bound Analyst: mark Stress to study a PC within Far range; until the Analyst next takes Severe damage, one allied adversary gains +2 Difficulty against that PC's next action.

This cue adds no narrative/autonomy restriction and chooses no PC action. It commits no NPC Stress, target, ally, Difficulty modifier or duration. Source-bound action eligibility, NPC resource transaction, ally/target choice, PC action resolution and Severe-damage expiry/replay remain local holds.

Only fresh tests in `bot/tests/ai-gm-2026-10/`; one frozen mapped batch, changed-file syntax checks, no legacy tests, broad runner, provider spend, model judge or polling. Preserve saved readers, audiences and owner files.
