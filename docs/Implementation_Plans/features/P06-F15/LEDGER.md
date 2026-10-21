# P06-F15 — Something in Imaging: ledger

Status: TARGETED PASS; COMMIT PENDING. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start HEAD `9f8c99239f17456f22f54b199d89dc01dc109e47`.

Exact occurrence: `environment:after-hours-emergency-department:something-in-imaging`; printed detail: `content/GM_PRIVATE/ENVIRONMENTS/environments.json#after-hours-emergency-department/features/2`; source hash `8971142f05e8a2af844d61e31f7aae5412c4bf6608a259397d49825c0fddec4f`; template hash `7a77c7ebfb53458509d6322389d8430d0e4b5204ea70311c1c3ffaeb010aef85`.

The feature adds an audience-scoped source-bound diagnostic record and clue. It does not invent a patient, diagnosis, treatment, PC response or mechanic. Owner behavior remains creative.

Changed production: `native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js`, new `native-environment-imaging.js`, `native-environment-dispatch.js`, `native-environment-scene.js`, `gm-arbitration-contract.js`, `gm-unified-arbitration.js`. Fresh batch `p06-f15-20261021-a` ran p06-f01 and p06-f03 through f15: 43 tests, 42 passed, 1 failed (one test-only source assertion). Only changed `p06-f15.test.mjs` reran in `p06-f15-20261021-a-repair-1`: 5/5 passed. Final unique affected coverage: 43/43. Changed JS/MJS syntax 10/10; JSON parses 2/2. Exact run, paths and hashes: [P06-F15 evidence](../../evidence/P06_F15_TARGETED.json). Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. Live DB replay/audience revalidation and same-turn narration remain unverified. No owner question or critical blocker; commit pending; release unauthorized.
