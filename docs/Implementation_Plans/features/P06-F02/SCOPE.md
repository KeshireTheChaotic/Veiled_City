# P06-F02 — Daggerheart and hidden character data

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Reconcile authoritative SRD/house extensions without inventing mechanics. Keep AI GM-only hooks/relationships/canon prospects separate from player-visible imports and exports.

## Source entrypoints (inspect current HEAD; not all need editing)
content/ENGINE/AI_GM_CONSTITUTION.md; content/CARDS/; bot/src/character-export.js; bot/src/gm-hook-import.js

## Acceptance
New modified importer/exporter and visibility tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p06-f02.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
