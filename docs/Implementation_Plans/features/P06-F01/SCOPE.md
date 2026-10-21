# P06-F01 — Special native features by occurrence

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** SOURCE PASS / LOCAL ADAPTER HOLDS. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Current catalog 153 occurrences = 23 supported + 130 review_only after source-qualified Sirens Outside, Upload in Progress, Too Loud to Think, Emergency Cascade, Code Blue, VIP Threshold and owner-authorized Automatic Correction adapter expansion. Source-qualify each new handler individually; create additional occurrence-level scope and ledger pairs. Missing rules block that occurrence only. No generic fallback.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/native-feature-definitions.json; bot/src/native-feature-catalog.js; bot/src/native-group-features.js; bot/src/native-environment-*.js

## Acceptance
New positive + negative native owner/source/cost/target/replay tests for each newly implemented occurrence.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p06-f01.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.

## Frozen implementation delta

Source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: SOURCE PASS / LOCAL ADAPTER HOLDS. Scope is the changed contracts recorded in this feature ledger; unchanged live behavior is not recertified. No new creative restriction. Final evidence: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json).
