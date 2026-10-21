# P03-F01 — Ordinary world invention

**Phase:** [P03](../../phases/P03/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
GM invents plausible incidental people, places and connective fiction independently. Distinguish provisional invention from formal canon. Ask before new compulsory human approval of ordinary fiction.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/autonomous-world.js; bot/src/world-authorship.js; bot/src/world-background-identities.js

## Acceptance
New creation/collision/reuse and player-claim quarantine tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p03-f01.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
