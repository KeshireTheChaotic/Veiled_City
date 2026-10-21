# P06-F10 — Automatic Correction: ledger

Status: TARGETED PASS; OCCURRENCE SUPPORTED.

Baseline audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; freeze HEAD `e69009f57d8d12e9e405f77dc6bf2439763edaa8`; implementation commit `95e21990e740d17cda5f4386ffbeb35a6070516a`.

Owner decision: broaden the native adapter to honor the source's single mundane-detail rewrite. Retain native one-Fear, scene, audience, owner-authority, replay and historical receipt guarantees; PC response remains unselected.

Changed production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`, `bot/src/native-environment-scene.js`. Fresh test: new `p06-f10.test.mjs`; P06-F01/F04/F05/F06/F07/F08/F09 test files are affected by shared catalog/capability modules.

Run ID `p06-f10-20261021-a`. The frozen batch passed 17/19 initially; a stale local count and a misapplied keyed catalog edit were corrected. Repair batch reran only the two failed files and passed 6/6; unique coverage is 19/19 after repair. All five changed JavaScript/module syntax checks passed. Exact hashes/results: [P06_F10_TARGETED.json](../../evidence/P06_F10_TARGETED.json).

Current catalog: 23 supported / 130 review-only / 0 needs-authoring. Cost/cache: no paid provider call or test; $0 provider spend; no cache claim; Codex usage unavailable.

No owner question, new narrative restriction or known critical blocker. Release authorization: none. Full runtime and release behavior remain outside this contract delta.
