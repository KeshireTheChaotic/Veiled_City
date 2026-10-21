# P06-F03 — Changed-delta freeze and reporting

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** PLANNED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Freeze touched source paths, run new tests only for those changed paths, log exact SHA and observed outcomes, explicitly do not claim broad release qualification.

## Source entrypoints (inspect current HEAD; not all need editing)
docs/AI_GM_2026_RECONCILIATION/; bot/tests/ai-gm-2026-10/

## Acceptance
Final union of fresh changed-code tests only; report incomplete/unverified areas and separately gated release.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p06-f03.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.
