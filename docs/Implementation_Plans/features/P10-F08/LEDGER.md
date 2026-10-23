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
