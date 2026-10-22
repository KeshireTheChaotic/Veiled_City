# P08-F07 — Latency measurement and final changed-delta qualification: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **COMPLETE — FINAL OFFLINE FRESH DELTA PASSED; STAGING / RELEASE UNQUALIFIED** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | Baseline `cb848d9fad274cd223e75c1485f4065a1851c5fb`; branch `codex/clean-ai-gm-2026-10`; feature code/tests frozen for union batch. |
| Source crosswalk / finding revision | All six scoped stage boundaries are now measured in bounded local metrics: source selection, plan, authoring, native acceptance, commit and publish. |
| Changed production/docs paths | `operational-metrics.js`, `session-opening-runner.js`, `gm.js`, `assembly-publications.js`, `pvp-output.js`, `p08-f07.test.mjs`, this scope/ledger and `STAGING_ACCEPTANCE_NOT_EXECUTED.md`. |
| New test files / source and test hashes | metrics `98bd6bbf7eaf9ee882f0765a1bd3152858bb26ad`; runner `be0c0b9b9d118595515d019c4e4a62bddfee6e60`; gm `244951c9b2fe8f4fcbcf370766da3dab0b2b08cf`; publications `a557e75de34134e6b710b99cf26148ec1185f593`; pvp `6bfa20b91bc8080f81138ba3e4eec3c735f05bd0`; F02 test `38bd601a0e695bf04bde20b5799b60e5947757db`; F03 test `24356eb444b88fa6ebd1796c06f2fcc0f024f1e8`; F06 test `b9ec4bd051f05cfca5efae1dda5fa55e521a320c`; F07 test `9efc2e7b88a40d7375fa4d77a983d524cf2c3655`. |
| Test batch run ID, command, exit, counts | `p08-final-delta-20261022-01`; one frozen command `node --test tests/ai-gm-2026-10/p08-f02.test.mjs tests/ai-gm-2026-10/p08-f03.test.mjs tests/ai-gm-2026-10/p08-f06.test.mjs tests/ai-gm-2026-10/p08-f07.test.mjs`; exit 0; 6 passed, 0 failed/cancelled/skipped/todo; 0.366s. `node --check` on all five changed JS files passed. No rerun. |
| Provider calls/tokens/expense | Zero calls/tokens/$0; no model provider involved. |
| Cache/latency evidence | No cache introduced. Offline helper duration: 0.366s. No real opening/provider/Discord latency sample exists; metrics require a separately authorized staging run. |
| Proposed new creative restriction / owner decision | None. Concurrency/caching optimization deferred without evidence. |
| Local holds / unknowns | F04 additive post-check-in cohort flow remains held for a dedicated plan/job/receipt reader. Semantic dramatic coverage remains unverified. |
| Critical blockers | None yet established; assess in worktree |
| Rollback | Revert only scoped telemetry labels/wrappers and F07 docs/test; no data or receipt changes. |
| Release | NOT AUTHORIZED / NOT CERTIFIED |


## Execution entries — append after real work, never fabricate

For each implementation batch record: date/time if available; current branch/HEAD and dirty-tree fingerprint; exact file diff and the authoritative input/source revision; scope decisions; source/test hashes; one frozen feature test batch and *terminal* result; failure repair/rerun if performed; call/token/expense evidence; any source or rule hold; confidentiality and agency assertions checked; rollback boundary. Attach links to freshly created evidence files only when they exist.

### Feature execution

The instrumentation records aggregate durations only; existing model request telemetry holds reported token/cache fields. It does not retain content or raw references. No before/after provider comparison, cohort matrix, real writer timing, cache hit rate, Discord first-substantive delivery, restart, staging or release validation was executed. The checklist at `STAGING_ACCEPTANCE_NOT_EXECUTED.md` is explicitly a handoff only.
