# P06-F34 — Support Dead Platform Last Train Rules

Status: SUPPORTED / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `4503f529b3521ff8f584aa0ae94caa899da60b67`.

Exact occurrence: `environment:dead-platform:last-train-rules`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#dead-platform/features/0`; source SHA-256 `1558a02d3c5af80ab4454d1c60262a2b53a129c06d528c6f9cb277d4fee70bfd`; template SHA-256 `dc290c7974aa110f61545ba78c61e9a78aa0f7362ee41bb0b7d7f9ae83bf2011`.

Printed rule: “Every departure requires a destination, a fare, and a stated reason. Lying to the platform increases Difficulty by 2.” The exact current environment source will be projected to the scoped GM. The GM determines whether the player's own statement is a lie and chooses the base Difficulty; the player's declaration, speech, feelings, dice and resources remain player-owned. Native action-roll code remains the sole committer of roll Difficulty.

This feature adds only source-qualified rules context. It does not infer deception, rewrite player speech, choose a destination/fare/reason, or impose a new narrative restriction. The adapter establishes current scoped environment identity, source/template integrity and passive projection. The live roll route does not automatically apply +2; actual GM ruling application and integrated saved-reader behavior remain unverified.

Freeze production implementation before one mapped fresh test batch. Tests must be new, feature-specific, in `bot/tests/ai-gm-2026-10/`; no historical fixtures, prior suites or provider calls. Changed-file syntax checks only. Do not run broad validation or poll a test runner.

Changed modules, test results, input/test hashes, run id, cost/cache evidence, questions, blockers and exact SHAs are recorded in the paired ledger and targeted JSON evidence. No release certification is implied.
