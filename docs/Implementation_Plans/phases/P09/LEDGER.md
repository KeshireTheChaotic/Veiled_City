# P09 — AI-first feature interpretation: ledger

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** IN PROGRESS — baseline reconciled; implementation not yet qualified.

**Planning evidence:** Read `README.md`, `CODEX_START_HERE.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md`, `DECISION_GATES.md`, owner behavior specification, P06-F40/occurrence source, existing `pack_pressure` and `feedback` descriptors, and current catalog at the pinned SHA. **No P09 runtime code or tests changed/executed during authoring of this plan.**

| Feature | Initial status | Evidence / next action |
|---|---|---|
| [P09-F01](../../features/P09-F01/LEDGER.md) | COMPLETE / DOC-ONLY | Current source/authority audit and three-pilot migration matrix; commit pending. |
| [P09-F02](../../features/P09-F02/LEDGER.md) | COMPLETE / TARGETED DELTA | Exact current-template rule retrieval; 2/2 fresh tests passed; commit pending. |
| [P09-F03](../../features/P09-F03/LEDGER.md) | PLANNED / UNQUALIFIED | Inspect actual HEAD; execute scoped acceptance only; log exact source/tests. |
| [P09-F04](../../features/P09-F04/LEDGER.md) | PLANNED / UNQUALIFIED | Inspect actual HEAD; execute scoped acceptance only; log exact source/tests. |
| [P09-F05](../../features/P09-F05/LEDGER.md) | PLANNED / UNQUALIFIED | Inspect actual HEAD; execute scoped acceptance only; log exact source/tests. |
| [P09-F06](../../features/P09-F06/LEDGER.md) | PLANNED / UNQUALIFIED | Inspect actual HEAD; execute scoped acceptance only; log exact source/tests. |
| [P09-F07](../../features/P09-F07/LEDGER.md) | PLANNED / UNQUALIFIED | Inspect actual HEAD; execute scoped acceptance only; log exact source/tests. |
| [P09-F08](../../features/P09-F08/LEDGER.md) | PLANNED / UNQUALIFIED | Inspect actual HEAD; execute scoped acceptance only; log exact source/tests. |

## Baseline verification before implementation

- Planning SHA: `81569d08699343e401fc11ba1eaed0f10b4fd37a`; execution branch `codex/clean-ai-gm-2026-10`.
- Actual execution baseline: `bc3a3b9036b6aa2365a7c3887c33c24f0b5246a2`.
- Tracked worktree was clean. Preserved pre-existing untracked P07/P08/P09 plan files.
- Current catalog baseline: 153 = 77 supported + 76 review-only + 0 needs-authoring. Current status is not proof of full mechanical execution.
- P07/P08 were absent at the original planning SHA; both were subsequently supplied and completed on this branch. P09 is additive and does not rewrite their histories.

## Tests and measured evidence

- Frozen P09 batch/run ID: **NOT RUN**.
- Commands, code/test hashes, test totals, failures, skipped, exit codes: **NOT RUN / NOT VERIFIED**.
- Native dice/provider/Discord simulations: **NOT RUN**.
- Latency/call-count/token evidence: **NOT MEASURED**.
- Paid provider calls/tokens/spend from plan creation: **NONE REQUESTED; NO TEST SPEND AUTHORIZED**.
- Whole-product or live Discord qualification: **NOT QUALIFIED**.
- P09-F01 is documentation-only; no runtime test applies. Subsequent features are unstarted.

## Decisions / local holds

- Do **not** automatically claim contextual cue == executable consequence.
- `Professional Entry`: P06-F40 explicitly holds prepared-position proof, one-use tracking and native Advantage application; must be resolved or truthfully kept local.
- `Pack Pressure`: existing supported native attack modifier remains available pending parity test.
- `Feedback`: existing supported owner-choice reaction and equipment effect remains available pending parity test.
- Owner restrictions: **NONE PROPOSED** in this plan. Any new restriction requires owner gate when introduced.
- Current critical blocker: **NONE IDENTIFIED IN DOCUMENT-ONLY PLANNING**. Runtime blockers unverified.
- Push/merge/deploy/release/production/provider authorization: **NOT GRANTED**.

## Execution update template

For each milestone, append date, actual branch/HEAD, dirty worktree, exact changed production/test/docs paths, source/revision hashes, run_id, one frozen command, terminal exit code, passed/failed/skipped, test hashes, cost and observed call counts, user-visible behavior result, local holds, owner decisions, rollback and next safe independent feature. Never overwrite historical evidence to claim stronger guarantees than were tested.
