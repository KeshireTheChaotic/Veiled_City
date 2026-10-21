# P02-F03 — Receipt and replay safety

**Phase:** [P02](../../phases/P02/SCOPE.md). **Status:** TARGETED PASS. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Commit valid mechanical outcomes exactly once. Current consumers recheck actor, source, scene, target and audience; no reroll, duplicate spend or uncertain resend.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/rules-arbitration.js; bot/src/state.js; bot/src/pc-incoming.js; bot/src/publication-outbox.js

## Acceptance
New disposable SQLite replay/invalid owner/outbox tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p02-f03.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.

## Frozen implementation delta

Source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: TARGETED DELTA PASS. Scope is the changed contracts recorded in this feature ledger; unchanged live behavior is not recertified. No new creative restriction. Final evidence: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json).
