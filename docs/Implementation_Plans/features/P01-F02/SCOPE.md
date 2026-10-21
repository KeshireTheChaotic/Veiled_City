# P01-F02 — Expressive creative writing

**Phase:** [P01](../../phases/P01/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Produce lived-in descriptions, meaningful NPC dialogue, interesting complications and agency-open endings. Ask owner before introducing tighter schema limits, length caps, templates or limits on GM invention.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/narrative-delegation.js; bot/src/narrative-writer-v9.js; bot/src/narrative-authority.js; bot/src/npc-conversations.js

## Acceptance
New tests for coherent scene and dialogue without forced menus or PC choices.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p01-f02.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
