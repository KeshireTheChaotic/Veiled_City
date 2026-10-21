# P00-F01 — Code / documentation truth

**Phase:** [P00](../../phases/P00/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Map each AI GM behavior to actual code and evidence; update stale branch/SHA/count claims; do not assume documents certify runtime behavior.

## Source entrypoints (inspect current HEAD; not all need editing)
README.md; docs/Active_Implementation/; docs/Setup_and_Scope/; content/ENGINE/

## Acceptance
Documentation source crosswalk with explicit implemented/partial/unverified states.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p00-f01.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
