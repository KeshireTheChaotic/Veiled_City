# P00-F02 — Fresh change-only validation

**Phase:** [P00](../../phases/P00/SCOPE.md). **Status:** TARGETED PASS. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Create a separate fresh test namespace and selector; NEVER invoke, import, copy or re-enable legacy tests/fixtures; preserve old files only as history.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/scripts/validation-selection.mjs; bot/scripts/validate-offline.mjs; .github/workflows/offline-validation.yml

## Acceptance
Selector proves changed files resolve only to new tests; unknown shared changes trigger newly written cross-boundary tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p00-f02.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.

## Mandatory no-poll execution
Read [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md). Codex must not watch/test-poll while the batch runs. Prefer one blocking invocation. For detached jobs, log the terminal result at a natural feature/phase milestone only; do not loop on process status.

## Frozen implementation delta

Source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: TARGETED DELTA PASS. Scope is the changed contracts recorded in this feature ledger; unchanged live behavior is not recertified. No new creative restriction. Final evidence: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json).
