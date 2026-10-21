# P03-F02 — Weighted continuity and canon

**Phase:** [P03](../../phases/P03/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

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
