# P02-F01 — Player authorship and consent

**Phase:** [P02](../../phases/P02/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Only authenticated players or authorized human proxies decide PC actions, speech, thoughts, feelings, resource choices and consent; player world assertions are attempts, not truth.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/typed-intents.js; bot/src/action-consent.js; bot/src/scene-intent-board.js; bot/src/narrative-integrity.js

## Acceptance
New wrong-owner, quotation, hypothetical and forged-action tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p02-f01.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
