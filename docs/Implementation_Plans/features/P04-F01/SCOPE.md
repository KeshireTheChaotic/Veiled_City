# P04-F01 — Concurrent intents and spotlight

**Phase:** [P04](../../phases/P04/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Support simultaneous PCs and independent children, contested resources and organic spotlight rather than round-robin initiative.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/scene-intent-board.js; bot/src/scene-action-window.js; bot/src/window-coordinator.js

## Acceptance
New multiple actor/dependency/overlap tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p04-f01.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
