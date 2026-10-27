# P10 — phase execution ledger

**Branch:** `codex/clean-ai-gm-2026-10`  
**Planning snapshot:** `08e965bbfb1920ac2492a2350a17e5f9785d253a`  
**Status:** OFFLINE DELTA PASS / EXPLICIT LIVE AND SEMANTIC HOLDS
**Release:** NOT AUTHORIZED; no live proof

The original planning intake below is retained as history. The final execution record and evidence manifest supersede its unobserved fields. P08/P09 historical outcomes are unchanged.

| Feature | Status | Evidence / next action |
|---|---|---|
| P10-F01 | SOURCE AUDIT COMPLETE | Source/receipt matrix; production incident cause UNPROVEN |
| P10-F02 | OFFLINE PASS | 3 final cases: revision drift, bounded replan, cross-connection claim, pause/source rejection |
| P10-F03 | OFFLINE PASS | 3 final cases: reopened SQLite exact payload, uncertainty hold, authenticated unsent recovery |
| P10-F04 | OFFLINE PASS | 3 final cases: zero-attendee camera, failed-original independent camera, uncertain original hold |
| P10-F05 | OFFLINE PASS | 5 final cases: private authoring, exception/zero/held fallback, control/source fence |
| P10-F06 | OFFLINE PASS | 2 final cases: typed setup/history/decline, unplaced provisional camera |
| P10-F07 | OFFLINE PASS | 2 final cases: actual start/present handlers, redacted status/metrics; repeated present |
| P10-F08 | OFFLINE PASS | 9 final cases: writer race, committed stale, delivering restart, worker isolates, stale worker, pause/card, provider classes, manual2, nested privacy |

## Original planning intake (superseded by final execution below)

- Current checkout branch / SHA / dirty-state / encountered P10 file collisions: **NOT OBSERVED**.
- Current findings and incident repro/trace IDs / stage / recorded commitment evidence: **NOT OBSERVED**.
- Modified source / migrations / backward readers / generated assets: **NONE BY PLAN**.
- Fresh P10 test paths, source/test SHA256, run IDs, commands, terminal exits, counts: **NONE / NOT RUN**.
- Provider calls/tokens/spend: **NO P10 PROVIDER WORK PERFORMED BY PLAN**; implementation measurements **UNMEASURED**.
- Opening latency and 0→2 concurrency outcome: **UNMEASURED / UNQUALIFIED**.
- Known uncertain Discord receipts, committed outputs and rollback safety: **NOT AUDITED ON LIVE DATA**.
- Owner questions (new creative restrictions/model downgrade only), local holds, critical blockers: **NO QUESTIONS RAISED BY PLAN**.
- Independent feature commit IDs and rollback matrix: **PENDING IMPLEMENTATION**.
- Release qualification: **FALSE**. Authorization to push/merge/deploy/production access: **NOT GRANTED BY PLAN**.

At F08 completion, append the final actual status matrix. Never turn `PLANNED` into `PASS` based on a design or detached test run without terminal evidence.

## Current execution checkpoint — 2026-10-22

Actual branch/HEAD: codex/clean-ai-gm-2026-10 / 08e965bbfb1920ac2492a2350a17e5f9785d253a. Initial tracked tree clean; P10 package and five unrelated P07/P08 owner handoffs were untracked. No collisions with P10 runtime/test names. Owner files reconciled in place. Full owner specification and complementary ENGINE authority read. One serial worker, no subagents. Production incident cause remains unverified; no production database/log/provider/Discord access.

F01 source trace and commitment matrix completed. F02 targeted 3/3 after one repair; F03 3/3; F04 3/3 after a fixture-reference repair and native serialization-order repair; F05 5/5; F06 2/2 after a fixture source-field repair; F07 2/2; initial F08 5/5. Exact durations/failure history are in individual ledgers. Later source/test refinements are covered only by the pending final P10 union. Every invocation blocked to a terminal exit; no polling, watching or inherited suites/fixtures. Provider usage 0 requests/0 tokens/$0; no cache savings claimed; Codex cost unavailable.

Current implementation: immutable attempt receipts plus independent epoch; no-commit proof; transactional claims/fencing; exact outbox recovery; independent camera after failed original; private authored unit path and truthful versioned fallback; typed location diagnostics; command continuation and redacted operator review. Source/test hashes, complete paths, command, timings and actual mock counts will be frozen in ../../evidence/P10_FINAL.json. An offline pass cannot qualify real Discord, semantics, provider speed or production recovery. RELEASE NOT AUTHORIZED.

## Final execution — 2026-10-22

Implementation/source-test commit: `079ab386c23aca1876a436bfe609e31907f2b633`. Tested base was `08e965bbfb1920ac2492a2350a17e5f9785d253a` plus the frozen manifest; no source/test changed after testing. Manifest fingerprint: `28b915d6d4f087973179cf42eb93659bcdfc8427abee9bda5f863041efffb162`.

Run **p10-final-20261022-01**: one blocking, explicit fresh-only union, **exit 0; 27 passed, 0 failed/cancelled/skipped/todo; 22595.7921ms**. Changed-file syntax **26/26 passed**; source/test frozen hash comparison and tracked diff whitespace check passed. [Exact command, per-file SHA256, case names, terminal summary and real/mock cost accounting](../../evidence/P10_FINAL.json). The test inputs are disposable SQLite and original P10 fixtures only. Targeted run failures and repairs remain recorded, including the F02 null-hash defect and F04 serialized proof field-order defect. No legacy test, golden, inherited fixture, broad validator, CI, production command or paid provider was used.

Changed production paths (all under `bot/src/`): `session-opening.js`, `session-opening-runner.js`, `session-opening-recovery.js`, `assembly-publications.js`, `db.js`, `gm.js`, `opening-cohort-state.js`, `opening-cohort-runner.js`, `opening-entry.js`, `opening-entry-context.js`, `opening-entry-evidence.js`, `pvp-output.js`, `publishing.js`, `scene-setup.js`, `commands.js`, new `opening-flow.js`, new `opening-diagnostics.js`. Fresh tests: `p10-f02.test.mjs` through `p10-f08.test.mjs`; new `p10-fixture.mjs` and `p10-worker.mjs`. No F01 runtime test because F01 is documentation-only.

Measured mock totals: **33 planner invocations, 37 writer invocations, 3 additional mocked model-adapter requests**. Real provider requests/tokens/spend **0/0/$0**. Local test stage timings and elapsed durations are measured; real check-in-to-Discord latency, provider speed/tokens, cache benefit, semantic quality and Codex account cost are **UNMEASURED / NOT QUALIFIED**. No model selection/output budget was changed. Worker-thread isolates with independent SQLite connections prove the durable native claim does not depend on shared WeakMaps; this is not live OS-process crash certification.

### Holds and known unknowns

| Surface | Disposition / next authorized action |
|---|---|
| Repeated revision churn after epoch1 | Narrow review; explicit manual attempt2 remains source-bound; no unbounded regeneration |
| Existing committed/established fiction with changed inputs | Preserve all receipts/units; exact-state source review; no replacement or rewritten history |
| delivering / uncertain Discord part | Hold exact part; authenticated reconciliation only; no resend from missing ACK |
| Crashed uncommitted worker | Current GM may use revision-bound recovery card; no timer-based claim stealing |
| Missing no-commit proof or unrelated committed session work | Conservative original-opening hold; independently entitled owner/camera paths can continue |
| Narrative quality / semantic secrecy / live pacing | Native structural acceptance tested; model/human qualitative review NOT QUALIFIED |
| Production incident causality / live recovery / OS-process crash / real Discord | NOT QUALIFIED; no production DB even read-only was accessed |
| Baseline speed improvement / cache savings | NOT MEASURED; no same-context baseline or provider spend |

Owner questions/new restrictions: **none**. Critical blockers: **none established**. No push, merge, CI trigger, restart, deploy, production DB access or live model test. **RELEASE NOT AUTHORIZED / NOT CERTIFIED.**

### Rollback

For this undeployed local delta, revert source/test commit `079ab386c23aca1876a436bfe609e31907f2b633` and the accompanying P10 documentation commit; never reset/clean owner edits. No database migration or production mutation occurred. If P10 data has subsequently been created elsewhere, first disable new scheduling/rebase/entry-authoring call sites and retain additive `epoch`, `previous_epoch`, immutable manual2 and `entry_orientation_version:2` read/validation paths until exact-state reconciliation; a raw downgrade must not turn a historical receipt into new publication authority. Never delete or rewrite source events, native effects, accepted units, delivered ACKs or uncertain outbox rows. Feature-level path/dependency boundaries remain in each ledger.

## Corrective F08 delta — prepared-refresh cross-connection claim — 2026-10-22

At base HEAD `738cd6082b12a42bfedbc98d5ae39f73eef99328`, review identified that two processes could both enter the `prepared_refresh` branch before either status write. `session-opening-runner.js` now uses `transitionCityRecord` in a transaction to claim `prepared_refresh → publishing` against the exact source event before calling the writer. A fresh two-worker, two-SQLite-connection barrier test proved one writer invocation and one acknowledged send. Run `p10-f08-prepared-refresh-race-20261022-01`: one blocking targeted test, exit 0, 1/1 passed, 0 failures/skips/cancellations, 10076.0856ms; changed JS/MJS syntax checks passed. Exact SHA256 values and environment/cost boundaries are in `../../evidence/P10_F08_PREPARED_REFRESH_RACE.json`; per-feature rollback and evidence are in `../../features/P10-F08/LEDGER.md`. No old test was rerun. This does not qualify live Discord or production process-crash recovery. **RELEASE NOT AUTHORIZED.**

### P10-F08 current-checkout race-fixture repair — 2026-10-26

The isolated P10-F08 rerun initially confirmed the historical second-worker mismatch. Root cause was fixture-only: the worker omitted production's Session–World startup composition. Added the bootstrap to the fresh worker and ran all nine cases in `p10-f08.test.mjs` once at current HEAD `ee5f5f24ff8ceec2a25292ce6ecc5030a69253e8`: exit 0, 9/9 passed, 0 skipped/cancelled, 7,506.9373 ms. Changed worker syntax check passed. No production module or behavior changed. Source/test/log hashes and the exact command are in `features/P10-F08/LEDGER.md`. Measured test runtime is not live latency; provider invocation totals for this rerun are UNMEASURED, paid provider spend is $0. This resolves only the fixture discrepancy and supports the exercised worker-thread/SQLite claim path. Live Discord, OS-process recovery, narrative quality, and full P10 certification remain unqualified. Existing owner edits and unrelated dirty files were preserved. RELEASE NOT AUTHORIZED.

### P10-F08 rerun after GM contract import change — 2026-10-26

Because RF05-F04 C14 changed the `gm.js` module imported by this feature's tests, the complete fresh F08 file was rerun once at HEAD `61dabd3dac4254a085f4be1b0af8ad5be879bd33`: exit 0, 9/9 passed, 7,657.4165 ms. Exact hashes and cost accounting are in `Framework_Refactor/phases/RF04/rf04-f07-full-union-triage.json`. This refresh supports only the exercised offline test cases and does not qualify live Discord or OS-process recovery.

### P10-F08 rerun after Narrative v9 public import — 2026-10-26

The complete fresh F08 file was rerun once after C15 changed the GM's v9 writer-contract import. At HEAD `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`, exit 0, 9/9 passed, 7,653.6422 ms. Test/worker/log hashes and actual cost limits are recorded in the RF04 F07 triage JSON. This offline refresh does not establish live Discord, OS-process recovery or semantic narrative quality.

## P10-F08 shared-GM requalification after RF05-F04 C17

The current `gm.js` bytes were exercised by the fresh P10-F08 test in the RF05 shared-GM batch: **9/9 passed** (part of 11/11, 8,521.2785 ms, exit 0). Evidence path and hash are recorded in the P10-F08 feature ledger. This offline test does not qualify live Discord or production recovery; release remains NOT AUTHORIZED.

## P10-F08 shared-GM refresh after RF05-F04 C18

After the GM contract import changed again, the complete fresh P10-F08 test passed **9/9** inside the RF05 C18 36/36 union, exit 0, 17,868.0517 ms. See the C18 RUN record for current source/test hashes and log. Live Discord/production recovery remains unqualified; release is NOT AUTHORIZED.

## P10-F08 shared-GM refresh after RF05-F04 C19

P10-F08 passed **9/9** in the complete current 19-file GM-dependent union, exit 0, 17,944.705 ms. See RF05-F04 C19 evidence for current source/test hashes and the terminal log. Live service behavior remains unqualified; release is NOT AUTHORIZED.

## P10-F08 shared-GM refresh after RF05-F04 C20

The current GM bytes were exercised by the complete fresh P10-F08 suite: **9/9 passed** inside the 20-file RF05 shared-GM union, exit 0, 18,370.7892 ms. Exact source/test hashes and terminal log are in the C20 RUN record. Live behavior remains unqualified; release is NOT AUTHORIZED.

## P10-F08 shared-GM refresh after RF05-F04 C28

The nine fresh P10-F08 cases passed inside the frozen 27-file RF05-F04 shared-GM union: **32/32 total**, exit **0**, 14,950.2107 ms. C28 changed schema import paths while retaining the same compatibility schema values; this refresh covers the exercised offline opening/recovery cases. It does not establish live Discord behavior or production process recovery. See `Framework_Refactor/features/RF05-F04/C28-RUN.json` for hashes and the terminal log. Release remains NOT AUTHORIZED.

## P10-F08 refresh after RF05-F04 C29

Because C29 changed a public schema import in `gm.js`, the complete fresh P10-F08 regression file was run once against that code: **9/9 passed**, exit **0**, TAP 8,323.4975 ms (wall 8,566.6051 ms). Log SHA256 `6D6B8AFAEA259BD822A4C9B7FD2E7670CE46616905EF27DAA303870979DF7918`, at `Framework_Refactor/phases/RF05/rf05-f04-c29-p10-f08-refresh.log`. This remains offline-only evidence; live Discord and process-crash recovery are not qualified. Release is NOT AUTHORIZED.

## P10-F08 refresh after RF05-F04 C30

The frozen C30 batch included the fresh P10-F08 suite after `gm.js` switched its review-validator import: **12/12 total**, including **9/9 P10-F08**, exit **0**, 8,387.2657 ms. This confirms the exercised offline opening/recovery behaviors with the updated import. No live Discord or production recovery qualification follows. See `Framework_Refactor/features/RF05-F04/C30-RUN.json`; release remains NOT AUTHORIZED.

## P10-F08 refresh after RF05-F04 C31

The initial frozen batch ran the fresh C31 contract test with P10-F08 after `gm.js` switched its history-context import. P10-F08 passed **9/9** in that batch, although the overall 12-case invocation exited 1 because one new C31 test assertion was too strict. The C31 failure was corrected and only that failed case reran. P10-F08's passing cases were not rerun because their code was unchanged. This offline result does not qualify live Discord or production recovery. See `Framework_Refactor/features/RF05-F04/C31-RUN.json`; release remains NOT AUTHORIZED.

## Current-checkout opening requalification — 2026-10-27

After committed refactor change `7ae4d26` repaired the P08 worker fixture and after current RF05-F04 changes altered GM prompt/schema imports, the focused P08-F04 and P10-F08 suites were each run once from the shared checkout. P08-F04: exit 0, 7/7, TAP 7,850.8497 ms. P10-F08: exit 0, 9/9, TAP 10,010.8834 ms. Exact commands, dirty-checkout boundary, hashes and case coverage are in `../../features/P08-F04/LEDGER.md` and `../../features/P10-F08/LEDGER.md`. This refresh confirms the changed test harness and current imported opening paths under SQLite and mocked Discord/provider boundaries. P10 remains **OFFLINE DELTA ACCEPTED**; live Discord, provider behavior/latency, OS-level crash recovery, semantic quality and production incident cause remain unqualified. No source files were edited for P08/P10 in this turn; framework migration edits were preserved. **Release NOT AUTHORIZED.**
