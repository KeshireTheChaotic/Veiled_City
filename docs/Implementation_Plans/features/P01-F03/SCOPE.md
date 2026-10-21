# P01-F03 — Safe creative recovery

**Phase:** [P01](../../phases/P01/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Isolate malformed optional proposals; preserve independent valid actions; recover with meaningful authorized narrative, not mechanical invention or empty status messages.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/gm.js; bot/src/turn-recovery.js; bot/src/narrative-completeness.js; bot/src/turn-orchestration.js

## Acceptance
New fake-provider/parser failures preserve source-safe output and exactly-once committed effects.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p01-f03.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
