# P03-F02 — Weighted continuity and canon

**Phase:** [P03](../../phases/P03/SCOPE.md). **Status:** TARGETED PASS. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Cause-backed salience influences recall, decay and promotion eligibility, never creates standalone truth. Keep private and GM-only memories properly scoped.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/narrative-salience.js; bot/src/narrative-memory.js; bot/src/memory-lifecycle.js; bot/src/world-identity-persistence.js

## Acceptance
New deduplicated evidence, prompt-retirement, secrecy and native-promotion tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p03-f02.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.

## Frozen implementation delta

Source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: TARGETED DELTA PASS. Scope is the changed contracts recorded in this feature ledger; unchanged live behavior is not recertified. No new creative restriction. Final evidence: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json).
