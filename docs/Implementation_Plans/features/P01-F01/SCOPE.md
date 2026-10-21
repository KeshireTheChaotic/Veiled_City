# P01-F01 — Natural language engagement

**Phase:** [P01](../../phases/P01/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Interpret player questions, indirect comments, declared attempts and ordinary silence contextually; do not mistake interpretation for PC consent or achieved outcomes.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/gm.js; bot/src/gameplay-intake.js; bot/src/semantic-engagement.js; bot/src/index.js

## Acceptance
New interaction tests for indirect inquiry, responses, silence, and no PC impersonation.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p01-f01.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
