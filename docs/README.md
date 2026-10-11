# Veiled City v9.3.2 — revised implementation plan (NO CODE CHANGES)

This package is the **dependency-ordered planning amendment** for the existing v9.3.1/V9-PVP-B blocker, not a new branch, gameplay implementation or D08 release qualification.

## Verified source / current stop

- GitHub branch `codex/typed-intent-refinement` at **`355269d28e6e6aa370c0e5ab0b159adef5db3e45`**, owner-authorized **known-red WIP checkpoint** (no V9-PVP-B completion commit). The local development checkout may still have unpublished differences; Codex must inspect `git status` before resumption.
- `docs/TYPED_INTENT_PROGRESS.md:582–657` reports OBS21 ordinary Station Attendant **blue-coat** NPC description blocked by the protected output composer. The original two cross-actor PVP30q regressions pass; PC observation compatibility 14/14 passes. Full offline validator last recorded **105 suites passed, 1 failed**; `npm run check` and `git diff --check` passed. This ChatGPT review did not execute Node tests.
- Completed: V9-00, V9-01, V9-PVP-A, V9-02. **V9-PVP-B and D08 BLOCKED; V9-03–V9-08 not started.** No rollout authorization.

## Binding change

- **PvP Hope: never generated**, including Hope/Critical, regardless of duel mode or winner. No generic award leakage; normal **non-PvP** Hope still works.
- **PvP Fear: every Fear roll leads to one immediate consequential native GM move**, within the same exchange before dependent progression. Never bank in `campaigns.fear`, never defer into later spotlight. Both Fear dice results => two separately tracked move/effect receipts. Do not let missing evidence become a free fictional consequence; hold a scoped GM recovery obligation instead.
- GM moves cover NPC/adversary actions, investigations, threats, clues, countdowns, location access/doors, etc., **not just cosmetic lighting**. They are bounded by consent, native consequences, player agency, current evidence and publication audience.
- **OBS21 first**: maintain safe, evidence-backed GM-owned NPC/scenery descriptions without allowing raw NPC paragraph to inject an unauthorized PC reaction. Preserve previous output authority and PC observation guarantees.

## Files

- `V9_3_2_IMPLEMENTATION_PLAN.md` — main updated dependency-order plan and source-level change list, V9-PVP-B substeps through V9-08.
- `V9_3_2_PVP_HOPE_FEAR_CONTRACT.md` — native trigger/move/effect/round gate receipt schemas and lifecycle.
- `V9_3_2_SOURCE_AUDIT.md` — latest GitHub source findings, precise existing functions and unresolved gaps.
- `V9_3_2_REGRESSION_MATRIX.csv` — **191 planned scenarios**: original 137 + 54 new FH cases (not implemented test count).
- `V9_3_2_CODEX_RESUME.md` — implementation instructions to use later when explicitly resuming Codex.
- `REFERENCE_V9_3_OUTPUT_AUTHORITY_CONTRACT.md`, `REFERENCE_V9_3_1_OBSERVATION_CONTRACT.md`, `REFERENCE_V9_2_AUTHORSHIP_CONTRACT.md` — carried forward authority requirements, not superseded by Hope/Fear rules.
- `TEST_MATRIX_COUNTS.txt` — automated CSV row counts.

**Scope:** documentation and test design ONLY; no repo writes, branch push, production pull, bot process, production DB, `.env`, native tests or paid calls were performed here. The status remains BLOCKED.
