# P08-F04 — Start/check-in cohort assembly and immutable receipts: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **IMPLEMENTED — FINAL OFFLINE UNION PASSED; END-TO-END DISCORD UNVERIFIED** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | Baseline `860ba47e42231b304ef0162b70f920c7d5fec883`; branch `codex/clean-ai-gm-2026-10`; F04 source/tests frozen before final union. |
| Source crosswalk / finding revision | Initial plan/job remain immutable; new plan/job/source/slot state is separate and keyed to session, roster/control revision and input fingerprint. Initial camera must have acknowledged substantive public narrative. |
| Changed production/docs paths | `bot/src/opening-cohort-state.js`, `opening-cohort-runner.js`, `narrative-authority-context.js`, `pvp-output.js`, `gm.js`, `commands.js`; fresh F04 test; F04 scope/ledger. No schema migration. |
| New test files / source and test hashes | cohort state `b8d493f0a5373b71d1b89619734e89f9cbfd8983`; runner `63d4386973e16dd31705d9a355bad2c1128fd248`; commands `31bba0f549ae04933449c5c9013c050494cf21d1`; authority context `b4ac048e38ada8faff9b83b5e01aa3f09c1f4ac4`; pvp `ee603eef9205226c41c8b92aed771e1c9940c955`; GM `f0dd71feb064337cce26a9844b85e6730cb3b156`; assembly context `e03786b13b740d0a93113b58cd53876969eaaf36`; F04 test `54b7224b7f5d0aeafd01b29b053dfed76a726db2`. |
| Test batch run ID, command, exit, counts | `p08-final-delta-20261022-02`; one frozen union: `node --test tests/ai-gm-2026-10/p08-f02.test.mjs tests/ai-gm-2026-10/p08-f03.test.mjs tests/ai-gm-2026-10/p08-f04.test.mjs tests/ai-gm-2026-10/p08-f06.test.mjs tests/ai-gm-2026-10/p08-f07.test.mjs`; exit 0; 11 passed, 0 failed/cancelled/skipped/todo; 0.758s. Changed-file `node --check` passed. No rerun. |
| Provider calls/tokens/expense | Zero in tests; $0. Runtime planner+writer calls, token usage and provider cost not observed; unknown. |
| Cache/latency evidence | No cache introduced; local test duration 0.758s is not end-to-end/Discord latency. |
| Proposed new creative restriction / owner decision | None proposed by the plan; add exact question if encountered |
| Local holds / unknowns | Stale/interrupted jobs, no accepted prose and uncertain sends are held. Cross-process simultaneous startup and actual DB/Discord/restart delivery remain untested. No legacy data rewritten. |
| Critical blockers | None yet established; assess in worktree |
| Rollback | Revert F04-specific source, F04 test and feature commit; no session rows or existing receipt changed by implementation/tests. |
| Release | NOT AUTHORIZED / NOT CERTIFIED |


## Execution entries — append after real work, never fabricate

For each implementation batch record: date/time if available; current branch/HEAD and dirty-tree fingerprint; exact file diff and the authoritative input/source revision; scope decisions; source/test hashes; one frozen feature test batch and *terminal* result; failure repair/rerun if performed; call/token/expense evidence; any source or rule hold; confidentiality and agency assertions checked; rollback boundary. Attach links to freshly created evidence files only when they exist.

### Feature execution

Added a separate GM-private job and public narrative scope. A session-level duplicate key prevents repeated cohort publication; source/roster/scene/input checks run before planner commit, writer output and outbox commit. Pending delivery reuses the same turn; uncertainty, failure and interruption do not trigger a new plan or blind send. The `/present`/`arrive` flow still delivers owner-private entry independently, while GM `/assemble` may invoke the additive follow-up. Manual/resume and pre-registered-start paths are excluded. Fresh tests cover owner distinctness, control revision invalidation, pre-registered exclusion, manual/resume exclusion and safe status text. Tests use fakes and do not execute provider/Discord/database flows; staging and cross-process races remain unverified.
