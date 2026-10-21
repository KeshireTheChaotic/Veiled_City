# P05-F03 — Fast substantive Discord delivery

**Phase:** [P05](../../phases/P05/SCOPE.md). **Status:** TARGETED PASS. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Reduce redundant progress notices (default enabled at 20s), use typing where appropriate, deliver substantive safely, preserve uncertain delivery state across restarts.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/index.js; bot/src/turn-latency.js; bot/src/publication-outbox.js; bot/src/generation-feedback.js

## Acceptance
New fake-clock p50/p95, timeout, duplicate-delivery and progress scenarios.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p05-f03.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.

## Frozen implementation delta

Source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: TARGETED DELTA PASS. Scope is the changed contracts recorded in this feature ledger; unchanged live behavior is not recertified. No new creative restriction. Final evidence: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json).
