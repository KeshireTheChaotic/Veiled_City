# P06-F44 — Support the source-bound Peripheral cue

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `d1770cf120cea917fd8eda958a779da73f7bb3a5`; implementation commit `df75716530ffadff4a51bd52735696021217e3bc`.

Exact occurrence: `adversary:veil-burned-stalker:peripheral`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#veil-burned-stalker/features/0`; source SHA-256 `b0989706dfbf8c416c1c260d896cf5b0e206e9e797c9d11d0575ea679839fa27`; template SHA-256 `0ae33d49879a2139badd60f4c571e12313bbe135be7d0b5c679e51be489e8945`.

Expose the exact passive rule in current verified GM-private Veil-Burned Stalker context. This creates no narrative limitation and commits no attack, speaking trigger, search state, roll modifier or outcome. Whether an event qualifies, who is noticing, and the Daggerheart roll remain local holds.

Only fresh tests in `bot/tests/ai-gm-2026-10/`; one frozen mapped batch and changed-file syntax checks. No legacy tests, broad runner, provider spend, model judge or polling. Preserve saved readers and audience privacy.

## Qualification

Frozen run `p06-f44-20261021-a` passed 156/156 cases across 42 fresh files, with no repair or rerun. Changed JS/MJS syntax 5/5 and JSON parse 2/2 passed. See [targeted evidence](../../evidence/P06_F44_TARGETED.json).
