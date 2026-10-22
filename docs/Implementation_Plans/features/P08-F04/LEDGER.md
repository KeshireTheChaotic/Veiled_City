# P08-F04 — Start/check-in cohort assembly and immutable receipts: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **CORRECTIVE DELTA PASSED; POSITIVE OUTBOX / CROSS-PROCESS / RESTART ACCEPTANCE UNQUALIFIED** |
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

## Corrective Follow-up — 2026-10-22

| Field | Actual result |
|---|---|
| Baseline / changed production SHA256 | Baseline `d52c5ac52f7a993e642af7d11a93101351717ea1`; `commands.js` `09b5fdd7f99c36d606d417f96414e62aef62c04137e745d85ea2989bbc8e8ab2`; `opening-cohort-runner.js` `d0520902e22c4432c22058ffbc082d4f5d384b1020b2cded5fd2411dd7136edd`; `opening-cohort-state.js` `3139aea484e74ebd066f1597dcfe01d7a27579973304535d2a74ceb06ada3b55`. |
| Fresh test / SHA256 | `bot/tests/ai-gm-2026-10/p08-f04-correction.test.mjs` `48760a6934f22dafd57467424206209caf31badffda1d10bb6a424cdb7779781`. |
| Batch | `p08-corrective-delta-20261022-01`; final union exit 0; 7 passed, 0 failed/skipped/todo; 1.524s; changed-file syntax checks passed. The fresh test calls the actual `handleCommand` route with a mock Discord interaction and disposable SQLite. |
| Proven boundary | `/vc-session assemble` reaches cohort lookup after a valid terminal opening attempt; without the immutable camera receipt it does not plan or send. Camera lookup now keys through the saved original start/attempt/turn/publication chain rather than a current viewpoint. Claims use a transactional unique session record; attempt identity and retained v1 readers are explicit. Pause status and stale-unsent transition are in production code. |
| Holds / cost | No positive native camera/outbox ack, changed-viewpoint success with actual outbox, concurrent independent SQLite workers, stale planner/writer await refresh, after-commit crash, uncertain send/restart or pause during live transport was run. Atomic code path is not runtime-proven. Zero provider calls/tokens, $0. |
| Rollback / release | Revert the three scoped modules and F04 corrective test/docs; no native campaign state/receipts changed. Release NOT AUTHORIZED / NOT CERTIFIED. |

### Corrective verification addendum — 2026-10-22, supersedes prior corrective batch result

The earlier passing union was invalidated by finding that `world_context.requests` could change when the opening job moved from queued to planning, staling the attempt's own fingerprint. `assembly-context.js` now fingerprints only stable audience-filtered beats and their bounds/authority. Fresh regression `p08-f05-correction.test.mjs` asserts scheduling then beginning an opening leaves the fingerprint unchanged. Final frozen union run ID `p08-corrective-delta-20261022-02` ran once after that change: exit 0; 8 passed, 0 failed/cancelled/skipped/todo; 1.655 s; `node --check` passed for all 11 changed JS/MJS paths. No legacy or broad suite ran. No provider calls/tokens, $0; no cache or live latency measurement. Exact final source/test SHA256 values are recorded in the P08 phase ledger. This is local delta evidence only; acceptance holds remain and release is NOT AUTHORIZED / NOT CERTIFIED.
