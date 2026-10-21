# P06-F45 — Support the source-bound Steal the Focus cue

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `7db6e579f542b159f8819b54da0633b50e923afb`; implementation commit `bdfb7175c5d2aa2fb83e7b4bca1782d2c0f491ba`.

Exact occurrence: `adversary:veil-burned-stalker:steal-the-focus`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#veil-burned-stalker/features/1`; source SHA-256 `a98b2fb874771c97b73f6e1ac3458192b0e0309e2edcb6e3e06251074c9d92d1`; template SHA-256 `0ae33d49879a2139badd60f4c571e12313bbe135be7d0b5c679e51be489e8945`.

Expose the exact Action cue in current verified GM-private Veil-Burned Stalker context. This adds no narrative/autonomy restriction and commits no Fear spend, range transition, attack roll/damage or Hope reduction. Event qualification, native action resolution and once-only receipt remain local holds.

Only fresh tests in `bot/tests/ai-gm-2026-10/`; one frozen mapped batch and changed-file syntax checks. No legacy tests, broad runner, provider spend, model judge or polling. Preserve saved readers, player-owned choices and audience privacy.

## Qualification

Frozen run `p06-f45-20261021-a` passed 160/160 cases across 43 fresh files, with no repair or rerun. Changed JS/MJS syntax 5/5 and JSON parse 2/2 passed. See [targeted evidence](../../evidence/P06_F45_TARGETED.json).
