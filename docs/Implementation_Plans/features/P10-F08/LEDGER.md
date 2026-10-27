# P10-F08 — execution ledger

**Feature:** Frozen acceptance, rollback and release boundaries  
**Status:** OFFLINE DELTA PASS / 9 FINAL-UNION CASES + 1 CORRECTIVE RACE CASE
**Planning branch / SHA:** `codex/clean-ai-gm-2026-10` / `08e965bbfb1920ac2492a2350a17e5f9785d253a`  
**Release:** NOT AUTHORIZED

## Populate only after actual execution

| Evidence | Actual result |
|---|---|
| Current checkout HEAD / dirty worktree / user edits preserved | Intake 08e965bbfb1920ac2492a2350a17e5f9785d253a; unrelated untracked owner handoffs preserved |
| Source inspected / observed gap / risk revision | Source-confirmed seams and bounded tested fixes below; production incident cause unproven |
| Changed production modules | Exact feature paths below; full manifest ../../evidence/P10_FINAL.json |
| Migration / historical reader compatibility | Additive record fields, no schema migration; manual2 and version1 orientation readers retained |
| Fresh affected-code tests and exact input/test SHA256 | Final evidence manifest, only newly authored P10 tests/fixtures |
| Run ID, command, terminal exit, tests passed/failed/skipped | p10-final-20261022-01; exit0; union27/27; no skipped/cancelled; command in evidence |
| Stage time/model calls/tokens/cost | Union22595.7921ms; mock invocations in evidence; paid providers0/0/$0; live latency/Codex cost UNMEASURED |
| Commit(s), reversible boundaries and rollback | Source/test commit079ab386c23aca1876a436bfe609e31907f2b633; reader-preserving rollback below |
| Local holds / critical blockers | Stale committed/uncertain artifacts held; live/semantic qualification held; no critical blocker |
| Owner decisions affecting narrative restrictions | NONE; no new creative-output restriction or model downgrade |
| Offline and live qualification | Bounded offline delta PASS; live/semantic behavior NOT QUALIFIED; RELEASE NOT AUTHORIZED |

Record meaningful implementation checkpoints append-only. Never claim the planning package ran code or proved Discord/provider behavior.

## Implementation evidence — 2026-10-22

- Actual branch/base HEAD: codex/clean-ai-gm-2026-10 / 08e965bbfb1920ac2492a2350a17e5f9785d253a. Owner-supplied P10 files reconciled in place; unrelated P07/P08 handoffs preserved unstaged. One serial worker; no subagents.
- Cross-boundary additions: writer-await rebase, pre-send source drift, delivering restart, isolated SQLite workers, stale-worker fencing, pause/review, manual2 compatibility, actual model-adapter error classes and nested privacy. No release qualification.
- Changed production paths under bot/src/: publishing.js pre-send not-sent guard; final epoch/manual2/diagnostic refinements in existing P10 modules; fresh p10-f08 tests and worker.
- Fresh terminal evidence: Initial F08 slice: 5 pass/0 fail exit0, 4823.2724ms. Expanded final slice awaits the one final union. Each batch was blocking and executed once, with repairs only after changed source/fixture. No polling or legacy suite/fixture use.
- Final current source/test SHA256, tested worktree fingerprint, exact command, terminal union counts/duration and mock invocation counts: ../../evidence/P10_FINAL.json (created at F08 terminal completion). Earlier targeted source hashes were not captured separately; final union certifies the final manifest, not intermediate states.
- Provider requests/tokens/spend: 0 / 0 / $0. Mock calls measured in final evidence; no cache savings claimed. Codex tokens/cost, live latency, model quality and production recovery: UNMEASURED / NOT QUALIFIED.
- Owner questions/new creative limits/model changes: none. Local holds: uncertain/in-flight/committed-stale artifacts remain exact-state reviewed; further epoch churn is bounded; unavailable proof is held. No uncontainable critical blocker established.
- Rollback: reverse this slice's call-site changes together with dependencies; retain additive epoch/manual2 and orientation-v2 readers for any persisted P10 rows. Never delete ACKs, units, mutations, sources, uncertain parts or player outcomes. No production rows were accessed by this run.
- Implementation commit is recorded in the phase closeout after final tests. RELEASE NOT AUTHORIZED; no push/merge/CI/restart/deploy/live provider/production DB access.

## Final frozen result

Implementation commit: 079ab386c23aca1876a436bfe609e31907f2b633. Run p10-final-20261022-01 completed once, blocking: exit 0, 27 passed / 0 failed / 0 skipped / 0 cancelled, 22595.7921ms; 26 changed JS/MJS syntax checks passed. This feature contributes 9 passing cases in the final union. Exact command, all production/test SHA256 values and case names: ../../evidence/P10_FINAL.json. Tested baseline HEAD was 08e965bbfb1920ac2492a2350a17e5f9785d253a plus frozen manifest fingerprint 28b915d6d4f087973179cf42eb93659bcdfc8427abee9bda5f863041efffb162; that exact tested code/test delta was committed above. No production/test change followed the final union.

Measured mock totals across the union: 33 planner invocations, 37 writer invocations, plus 3 mocked model-adapter requests; real provider calls/tokens/spend 0/0/$0. No model configuration or creative-output limit changed. Native acceptance is not semantic quality proof. The phase acceptance/hold/rollback matrix bounds this result; live Discord, provider speed, full OS-process crash recovery and production recovery remain NOT QUALIFIED. No owner question or critical blocker outstanding. Release NOT AUTHORIZED.

## Corrective delta — durable prepared-refresh ownership (2026-10-22)

- Review finding: two independent SQLite connections could both read a `prepared_refresh` job before either writer changed its status. The in-memory flight map does not coordinate those connections.
- Implementation: `bot/src/session-opening-runner.js` now transactionally compares the exact `prepared_refresh` status and source event, transitions the winner to `publishing`, and returns the live row for a losing claimant before authoring starts. No schema or publication receipt changes.
- Fresh regression: `bot/tests/ai-gm-2026-10/p10-f08-prepared-refresh-race.test.mjs` starts two worker-thread isolates on separate SQLite connections, barriers both after reading `prepared_refresh`, releases the race together, and asserts one writer invocation, one acknowledged send and a completed job. New worker: `bot/tests/ai-gm-2026-10/p10-prepared-refresh-worker.mjs`.
- Run `p10-f08-prepared-refresh-race-20261022-01`: one blocking invocation from `bot/`: `node --test --test-concurrency=1 --test-reporter=tap tests/ai-gm-2026-10/p10-f08-prepared-refresh-race.test.mjs`; **exit 0, 1 passed, 0 failed/cancelled/skipped, 10076.0856ms**. Both changed MJS files and the runner passed `node --check`. No prior passing test was rerun.
- Tested base HEAD: `738cd6082b12a42bfedbc98d5ae39f73eef99328`; working tree contains this local corrective delta. SHA256: runner `229206d89eca5872042ab4adabacaf8e0c04783981e2161f4a82a4363c128665`; test `d8e868764d6b05376dd9844d12fff8bdde3e310e30cdebf38214bc9d31b15e5c`; worker `505a6783be6efcf09ba5ee5c5d291fdb9da1c326288f75d85adc3265107bbddb`. Structured evidence: `../../evidence/P10_F08_PREPARED_REFRESH_RACE.json`.
- Mock usage: one writer and one Discord acknowledgment; paid provider requests/tokens/spend `0/0/$0`. Real Discord behavior and live multi-process crash recovery remain unqualified. Rollback: revert the runner claim and remove only the new test/worker/evidence; no schema or runtime data migration exists. Release remains NOT AUTHORIZED.

## Current-checkout worker-fixture correction — 2026-10-26

Current branch `codex/clean-ai-gm-2026-10`, HEAD `ee5f5f24ff8ceec2a25292ce6ecc5030a69253e8`. A current isolated run had 8/9 pass because `p10-worker.mjs` did not initialize the Session–World composition that production initializes in each process. Added that bootstrap to the fresh test worker; no production code changed. Then ran the complete `p10-f08.test.mjs` file once against final bytes from `bot/`: `node --import ./scripts/offline-guard.mjs --test --test-concurrency=1 --test-reporter=tap tests/ai-gm-2026-10/p10-f08.test.mjs`; **exit 0, 9 passed, 0 failed/skipped/cancelled, 7506.9373 ms**. `node --check bot/tests/ai-gm-2026-10/p10-worker.mjs` passed. Worker SHA256 `4DBBCBB2730335E7D5D3EE1E8E6D507267B75AF17FE4E1D61D71FC15E7E1EB2F`; test SHA256 `89CE662BE023382D1FB1BD89B7120E28A2A0D63D5A89DE3C09655E60CDD1F1F9`; log `../../phases/P10/p10-f08-worker-bootstrap-rerun.log`, SHA256 `6BD513980CB2CC721901321EDF53FC1FF0960041FF396463C12158F3469CF5FF`. The isolated SQLite worker race is qualified for the exercised bootstrap path; OS-process crash recovery, live Discord and semantic quality remain unqualified. Provider calls were mocked/absent and spend was $0; invocation totals for this run were not emitted and remain UNMEASURED. Rollback only this test-fixture bootstrap and this paragraph; no production state was changed. RELEASE NOT AUTHORIZED.

## Post-C14 affected-code refresh — 2026-10-26

C14 changed a Knowledge contract import in `gm.js`, which the P10-F08 test imports, so the complete file was rerun once at HEAD `61dabd3dac4254a085f4be1b0af8ad5be879bd33`. Result: **exit 0, 9/9 passed, 0 skipped/cancelled, 7657.4165 ms**. The frozen test SHA remains `89CE662BE023382D1FB1BD89B7120E28A2A0D63D5A89DE3C09655E60CDD1F1F9`; worker SHA is `4DBBCBB2730335E7D5D3EE1E8E6D507267B75AF17FE4E1D61D71FC15E7E1EB2F`; log is `p10-f08-after-c14-rerun.log`, SHA256 `EA9F7604A7D921E51A086FD9EB383609B5349583A8E1EFA3901D1E13D2C10FE3`. The runner and session-opening production code did not change. Mock invocation totals were not emitted; real provider calls/tokens/spend were 0/0/$0, and per-run invocation totals remain UNMEASURED. This refresh verifies the current imported GM module bytes in the exercised offline paths only; live Discord, OS-process crash recovery and semantic quality remain unqualified. RELEASE NOT AUTHORIZED.

## Post-C15 affected-code refresh — 2026-10-26

C15 changed the GM's v9 writer contract import, which is exercised by P10-F08's actual GM adapter case. The complete fresh F08 file was run once at HEAD `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`: **exit 0, 9/9 passed, 0 skipped/cancelled, 7653.6422 ms**. Test SHA256 `89CE662BE023382D1FB1BD89B7120E28A2A0D63D5A89DE3C09655E60CDD1F1F9`; worker SHA256 `4DBBCBB2730335E7D5D3EE1E8E6D507267B75AF17FE4E1D61D71FC15E7E1EB2F`; log `p10-f08-after-c15-rerun.log`, SHA256 `6E37F05807BE33E68B8DCB6770655EC37A748DACF9AD30EE6D08C4F08E6B4D02`. Mock invocation totals were not emitted; paid provider calls/tokens/spend were 0/0/$0. OS-process recovery, live Discord and narrative quality remain unqualified. See RF04 F07 triage JSON for the concise terminal record. RELEASE NOT AUTHORIZED.

### Current GM shared-module requalification after RF05-F04 C17

After the current `gm.js` change, the fresh P10-F08 suite passed **9/9** inside the C16/C17/P10 targeted batch (11/11 overall, exit 0, 8,521.2785 ms). It covered planner check-in races, committed/uncommitted recovery, uncertain delivery, pause recovery, and privacy-safe packets. Test and worker hashes are in `features/RF05-F04/C17-RUN.json`; the batch log is `Framework_Refactor/phases/RF05/rf05-f04-c17-final-test.log` (SHA-256 `1D9CC6A0AA72650AA66C677D92ACF396E641B31462D4757AEBB15306DD6F2DCA`). No provider/network/production DB/Discord/CI use. P10 remains unqualified for live behavior and release NOT AUTHORIZED.

### P10-F08 requalification after RF05-F04 C18

The fresh P10-F08 test passed **9/9** inside the 36/36 shared-GM union (18 files, exit 0, 17,868.0517 ms). Exact current test/worker hashes and batch log are recorded in `Framework_Refactor/features/RF05-F04/C18-RUN.json`. This offline evidence does not qualify live Discord or production recovery; release remains NOT AUTHORIZED.

### P10-F08 requalification after RF05-F04 C19

P10-F08 passed **9/9** in the 19-file fresh shared-GM union (37/37 total, exit 0, 17,944.705 ms). Current test and worker hashes and the result log are recorded in `Framework_Refactor/features/RF05-F04/C19-RUN.json`. This offline evidence does not qualify live Discord/production recovery; release remains NOT AUTHORIZED.

### P10-F08 requalification after RF05-F04 C20

P10-F08 passed **9/9** in the current 20-file fresh shared-GM union (38/38 total, exit 0, 18,370.7892 ms). Current test and worker hashes and the terminal log are in `Framework_Refactor/features/RF05-F04/C20-RUN.json`. This offline evidence does not qualify live Discord/production recovery; release remains NOT AUTHORIZED.

### P10-F08 requalification after RF05-F04 C22

P10-F08's nine cases passed in the C22 frozen shared-GM union: **27/27 overall across 22 files**, exit **0**, 14,098.6494 ms. The GM change routed only a data-only schema through Narrative public; the validator and P10 flow are unchanged. See `Framework_Refactor/features/RF05-F04/C22-RUN.json`. Live Discord, OS-process recovery and production recovery remain unqualified; release NOT AUTHORIZED.

### P10-F08 requalification after RF05-F04 C21

All nine P10-F08 cases passed in the C21 shared-GM run. The 21-file batch passed 38/39 (19,012.2857 ms); its sole failure was a stale C20 import-shape assertion. After correcting only that assertion, the C20 file passed 1/1 (450.5643 ms), giving 39/39 effective passes across two launches, not one all-green batch. See `Framework_Refactor/features/RF05-F04/C21-RUN.json`. This offline evidence does not qualify live Discord, OS-process crash recovery, or production recovery. Release NOT AUTHORIZED.

### P10-F08 requalification after RF05-F04 C26

All nine P10-F08 cases passed within the frozen 25-file shared-GM union: **30/30**, exit **0**, 14,511.683 ms. C26 changed only the GM's source for the post-turn review category constant; the validator and P10 flow were unchanged. See `Framework_Refactor/features/RF05-F04/C26-RUN.json`. This offline result does not qualify live Discord or production recovery. Release NOT AUTHORIZED.

### P10-F08 requalification after RF05-F04 C27

All nine P10-F08 cases passed inside the frozen 26-file shared-GM union: **31/31**, exit **0**, 14,716.6291 ms. C27 moved only authored-candidate schemas and instructions to Intent public; session-opening production code was not modified. See `Framework_Refactor/features/RF05-F04/C27-RUN.json`. The offline result does not qualify live Discord or production recovery. Release NOT AUTHORIZED.
