# P08-F07 — Latency measurement and final changed-delta qualification: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **CORRECTIVE UNION PASSED; FULL LIFECYCLE / STAGING / RELEASE UNQUALIFIED** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | Baseline `cb848d9fad274cd223e75c1485f4065a1851c5fb`; branch `codex/clean-ai-gm-2026-10`; feature code/tests frozen for union batch. |
| Source crosswalk / finding revision | All six scoped stage boundaries are now measured in bounded local metrics: source selection, plan, authoring, native acceptance, commit and publish. |
| Changed production/docs paths | `operational-metrics.js`, `session-opening-runner.js`, `gm.js`, `assembly-publications.js`, `pvp-output.js`, `p08-f07.test.mjs`, this scope/ledger and `STAGING_ACCEPTANCE_NOT_EXECUTED.md`. |
| New test files / source and test hashes | metrics `98bd6bbf7eaf9ee882f0765a1bd3152858bb26ad`; runner `be0c0b9b9d118595515d019c4e4a62bddfee6e60`; gm `244951c9b2fe8f4fcbcf370766da3dab0b2b08cf`; publications `a557e75de34134e6b710b99cf26148ec1185f593`; pvp `6bfa20b91bc8080f81138ba3e4eec3c735f05bd0`; F02 test `38bd601a0e695bf04bde20b5799b60e5947757db`; F03 test `24356eb444b88fa6ebd1796c06f2fcc0f024f1e8`; F06 test `b9ec4bd051f05cfca5efae1dda5fa55e521a320c`; F07 test `9efc2e7b88a40d7375fa4d77a983d524cf2c3655`. |
| Test batch run ID, command, exit, counts | Initial `p08-final-delta-20261022-01` passed 6 tests before F04. Final `p08-final-delta-20261022-02` ran one frozen union including F04: `node --test tests/ai-gm-2026-10/p08-f02.test.mjs tests/ai-gm-2026-10/p08-f03.test.mjs tests/ai-gm-2026-10/p08-f04.test.mjs tests/ai-gm-2026-10/p08-f06.test.mjs tests/ai-gm-2026-10/p08-f07.test.mjs`; exit 0; 11 passed, 0 failed/cancelled/skipped/todo; 0.758s. `node --check` all changed JS files passed. No further rerun. |
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

### Final post-F04 changed-delta union

Run `p08-final-delta-20261022-02` included the newly implemented F04 modules and reran the previously passing tests because their shared production paths (`assembly-context.js`, `gm.js`, `pvp-output.js`) changed. Exact command: `node --test tests/ai-gm-2026-10/p08-f02.test.mjs tests/ai-gm-2026-10/p08-f03.test.mjs tests/ai-gm-2026-10/p08-f04.test.mjs tests/ai-gm-2026-10/p08-f06.test.mjs tests/ai-gm-2026-10/p08-f07.test.mjs`; exit 0; 11 passed, 0 failed/cancelled/skipped/todo; 0.758s. All changed-file syntax checks passed. Current changed telemetry path hashes: `operational-metrics.js` `98bd6bbf7eaf9ee882f0765a1bd3152858bb26ad`, `session-opening-runner.js` `be0c0b9b9d118595515d019c4e4a62bddfee6e60`, `assembly-publications.js` `a557e75de34134e6b710b99cf26148ec1185f593`, plus final F04-shared hashes in its ledger. No live provider, cache, or Discord timing was observed.

## Corrective Follow-up — 2026-10-22

| Field | Actual result |
|---|---|
| Baseline / changed production and test paths | Baseline `d52c5ac52f7a993e642af7d11a93101351717ea1`; shared production hashes are listed in F02–F06. Fresh test hashes: fixture `4c2ad984a17eb29923df19d22a33123a450b40a13f055293bbfbe382a903b126`; F02 `86e9f7a182990c07359a4021cd757d4f7055f3268705b79a927715e6c22063d8`; F03 `4c04929b55dd78863a7c2d05db192aafb9f377d8c74272ab9db3d45a5eb18dfe`; F04 `48760a6934f22dafd57467424206209caf31badffda1d10bb6a424cdb7779781`; F05 `e763abb69275f23e99b4164120d6cafd7d3c43715db4284d320806f6f283c201`; F06 `22f9f301326b8e24284a47545eb61f20f913789b407565a60ac6b2b12d09bd1f`; F07 `9557262df1b840a9715d93f82317bae6142dd6b2b4c9d320c4f6681c2d538510`. |
| Final frozen union | Run ID `p08-corrective-delta-20261022-01`; exact union command in phase ledger; exit 0; 7 pass, 0 failed/cancelled/skipped/todo; 1.524s. `node --check` passed for all four changed production JS files and seven fresh MJS tests/helpers. No poll/watch. |
| Scenario/cost evidence | Actual command route used a mocked Discord interaction and disposable SQLite; no send was attempted. Zero provider calls/tokens; $0. No cache, real latency, token or savings measurement. |
| Holds | No successful native outbox delivery, initial camera/cohort end-to-end, concurrent workers, crash/restart, live stale-principal revocation, world-memory epistemic matrix or semantic narrative quality. |
| Rollback / release | Revert only corrective P08 modules/tests/ledger addenda; no DB data touched. Staging/release NOT AUTHORIZED / NOT CERTIFIED. |

### Corrective verification addendum — 2026-10-22, supersedes prior corrective batch result

The earlier passing union was invalidated by finding that `world_context.requests` could change when the opening job moved from queued to planning, staling the attempt's own fingerprint. `assembly-context.js` now fingerprints only stable audience-filtered beats and their bounds/authority. Fresh regression `p08-f05-correction.test.mjs` asserts scheduling then beginning an opening leaves the fingerprint unchanged. Final frozen union run ID `p08-corrective-delta-20261022-02` ran once after that change: exit 0; 8 passed, 0 failed/cancelled/skipped/todo; 1.655 s; `node --check` passed for all 11 changed JS/MJS paths. No legacy or broad suite ran. No provider calls/tokens, $0; no cache or live latency measurement. Exact final source/test SHA256 values are recorded in the P08 phase ledger. This is local delta evidence only; acceptance holds remain and release is NOT AUTHORIZED / NOT CERTIFIED.

### Expanded A1–A9 qualification state — 2026-10-22

The expanded F04 lifecycle test and worker are not yet terminally qualified; see the F04 ledger addendum. Existing earlier `p08-corrective-delta-20261022-02` evidence predates these test changes and is not the final frozen union for the expanded suite. F07 matrix acceptance remains **UNQUALIFIED** until a terminal changed-code-only union completes. Do not infer cross-process, full restart, owner DM fallback, writer-await revocation or semantic quality from the earlier passing delta.
