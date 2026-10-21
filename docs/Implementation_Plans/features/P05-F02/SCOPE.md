# P05-F02 — Versioned safe caches

**Phase:** [P05](../../phases/P05/SCOPE.md). **Status:** TARGETED PASS. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Cache stable rule and source indexes, immutable prompt prefixes and safe deterministic projections only. Include tenant, version, source-hash and audience/owner revision keys; never replay mutable outcome/dice/PC choice/secret across users.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/gm.js; bot/src/prompt-budget.js; bot/src/npc-cognition.js; bot/src/narrative-context.js

## Acceptance
New warm/cold/invalidation/cross-audience poisoning tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p05-f02.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.

## Frozen implementation delta

Source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: TARGETED DELTA PASS. Scope is the changed contracts recorded in this feature ledger; unchanged live behavior is not recertified. No new creative restriction. Final evidence: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json).
