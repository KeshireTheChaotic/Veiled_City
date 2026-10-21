# P04-F03 — Hooks, assembly and proxies

**Phase:** [P04](../../phases/P04/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Create hidden GM hooks/relationships/canon prospects independently; provide private player hooks; preserve voluntary arrivals/party choices and proxy ownership.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/assembly-planning.js; bot/src/assembly-publications.js; bot/src/session-opening.js; bot/src/gm-hook-import.js

## Acceptance
New late entry, absent PC, GM-private data and proxy scenarios.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p04-f03.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
