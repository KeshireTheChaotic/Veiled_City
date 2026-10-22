# P08-F06 — Truthful story coverage, entry fallback and review states: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **ORIGINAL PASS RETAINED; CORRECTIVE STATUS DELTA PASSED; DELIVERY FLOW UNQUALIFIED** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | Baseline `f2d7ba5c902abebf97795939d43d9bafd209a4a3`; feature diff frozen before batch. |
| Source crosswalk / finding revision | Existing accepted prose/fallback and hook evidence were independent; late entry previously threw on empty accepted prose. |
| Changed production/docs paths | `bot/src/pvp-output.js`, `opening-entry.js`, `session-opening-runner.js`, new `opening-entry-evidence.js`, `assembly-evidence.js`, fresh `p08-f06.test.mjs`, F06 scope/ledger. |
| New test files / source and test hashes | pvp `0076d6db9087b4abedc42e2bbc8af501d144211e`; entry `6087bb6a3ec70b472dd27f3409bdf97ed74a2fdd`; runner `5e43ac212925f20e395b2eb373d85a2c412c9fbb`; entry evidence `e8fa70b836e7028c8f21b7a8ffd2c35f08b994b9`; assembly evidence `422e51b518771224ce3b9a932571eeee895cdcfa`; test `b9ec4bd051f05cfca5efae1dda5fa55e521a320c`. |
| Test batch run ID, command, exit, counts | `p08-f06-20261022-01`; `node --test tests/ai-gm-2026-10/p08-f06.test.mjs`; exit 0; 3 passed, 0 failed/skipped; 0.065s. `node --check` all five changed JS files passed. No rerun. |
| Provider calls/tokens/expense | Zero provider calls/tokens; $0 provider expense. |
| Cache/latency evidence | No cache/provider latency measured; local batch 0.065s. |
| Proposed new creative restriction / owner decision | None proposed by the plan; add exact question if encountered |
| Local holds / unknowns | None yet established; investigate at implementation |
| Critical blockers | None yet established; assess in worktree |
| Rollback | Revert only F06 status/evidence helpers and native entry fallback; no historical rows/receipts modified. |
| Release | NOT AUTHORIZED / NOT CERTIFIED |


## Execution entries — append after real work, never fabricate

For each implementation batch record: date/time if available; current branch/HEAD and dirty-tree fingerprint; exact file diff and the authoritative input/source revision; scope decisions; source/test hashes; one frozen feature test batch and *terminal* result; failure repair/rerun if performed; call/token/expense evidence; any source or rule hold; confidentiality and agency assertions checked; rollback boundary. Attach links to freshly created evidence files only when they exist.

### Feature execution

Added a source-bound `opening_entry_orientation` renderer using the current owner-only projection if accepted prose is absent or authoring is unavailable. It claims neither authored narrative nor hook verification; delivery status becomes `fallback_delivered` only with actual Discord message acknowledgements, and uncertain/failed/empty publications remain distinct. Assembly evidence v4 carries an intent revision and explicitly `dramatic_coverage=unverified`; the opening status surface reports that limitation. Offline helper tests cover fallback truth, delivery classification, and nonsemantic assembly coverage only. End-to-end Discord, restart, stale-principal and provider-failure behavior were not exercised and remain unverified.

### Final post-F04 union regression

F04 changed the shared `pvp-output.js` writer/output paths after F06's feature batch, so the fresh F06 test was included in `p08-final-delta-20261022-02`: exit 0, 11 P08 fresh tests passed, 0 failed/skipped, 0.758s. Final hashes include `pvp-output.js` `ee603eef9205226c41c8b92aed771e1c9940c955`; F06 test remains `b9ec4bd051f05cfca5efae1dda5fa55e521a320c`. No live writer failure, outbox, Discord acknowledgement, or restart was exercised.

## Corrective Follow-up — 2026-10-22

| Field | Actual result |
|---|---|
| Baseline / changed production SHA256 | Baseline `d52c5ac52f7a993e642af7d11a93101351717ea1`; `opening-cohort-runner.js` `d0520902e22c4432c22058ffbc082d4f5d384b1020b2cded5fd2411dd7136edd`. |
| Fresh test / SHA256 | `bot/tests/ai-gm-2026-10/p08-f06-correction.test.mjs` `22f9f301326b8e24284a47545eb61f20f913789b407565a60ac6b2b12d09bd1f`. |
| Batch | `p08-corrective-delta-20261022-01`; final union exit 0; 7 passed, 0 failed/skipped/todo; 1.524s; changed-file syntax checks passed. |
| Proven boundary | Cohort status reports acknowledged transport and unverified dramatic fulfillment separately; pause/review labels remain distinct. Native acceptance is not semantic proof. |
| Holds / cost | Full fallback, stale-owner, hook disclosure, uncertain/restarted outbox and late-entry orchestration are not exercised end-to-end. Zero provider calls/tokens, $0; no cache/latency evidence. No keyword-based coverage, compelled template, quota or model self-judgment was added. |
| Rollback / release | Revert only scoped cohort status/evidence and F06 fresh test/docs; no persisted state. Release NOT AUTHORIZED / NOT CERTIFIED. |

### Corrective verification addendum — 2026-10-22, supersedes prior corrective batch result

The earlier passing union was invalidated by finding that `world_context.requests` could change when the opening job moved from queued to planning, staling the attempt's own fingerprint. `assembly-context.js` now fingerprints only stable audience-filtered beats and their bounds/authority. Fresh regression `p08-f05-correction.test.mjs` asserts scheduling then beginning an opening leaves the fingerprint unchanged. Final frozen union run ID `p08-corrective-delta-20261022-02` ran once after that change: exit 0; 8 passed, 0 failed/cancelled/skipped/todo; 1.655 s; `node --check` passed for all 11 changed JS/MJS paths. No legacy or broad suite ran. No provider calls/tokens, $0; no cache or live latency measurement. Exact final source/test SHA256 values are recorded in the P08 phase ledger. This is local delta evidence only; acceptance holds remain and release is NOT AUTHORIZED / NOT CERTIFIED.
