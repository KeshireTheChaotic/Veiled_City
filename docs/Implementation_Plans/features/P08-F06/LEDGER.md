# P08-F06 — Truthful story coverage, entry fallback and review states: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **COMPLETE — 3 FRESH TESTS PASSED; LIVE DELIVERY UNVERIFIED** |
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
