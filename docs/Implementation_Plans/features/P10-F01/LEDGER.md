# P10-F01 — execution ledger

**Feature:** Source audit, incident reproduction and commitment-state taxonomy  
**Status:** SOURCE AUDIT COMPLETE / INCIDENT CAUSE UNPROVEN
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
- No runtime changes. Confirmed fingerprint/await, silent entry error, live-worker downgrade and camera-gate seams; deterministic reproduction design executed later in F02/F08. No production incident cause inferred.
- Changed production paths under bot/src/: None in F01; this feature documents source trace and proof tiers.
- Fresh terminal evidence: No F01 test: documentation-only; F02/F08 reproduce changed production seams. Each batch was blocking and executed once, with repairs only after changed source/fixture. No polling or legacy suite/fixture use.
- Final current source/test SHA256, tested worktree fingerprint, exact command, terminal union counts/duration and mock invocation counts: ../../evidence/P10_FINAL.json (created at F08 terminal completion). Earlier targeted source hashes were not captured separately; final union certifies the final manifest, not intermediate states.
- Provider requests/tokens/spend: 0 / 0 / $0. Mock calls measured in final evidence; no cache savings claimed. Codex tokens/cost, live latency, model quality and production recovery: UNMEASURED / NOT QUALIFIED.
- Owner questions/new creative limits/model changes: none. Local holds: uncertain/in-flight/committed-stale artifacts remain exact-state reviewed; further epoch churn is bounded; unavailable proof is held. No uncontainable critical blocker established.
- Rollback: reverse this slice's call-site changes together with dependencies; retain additive epoch/manual2 and orientation-v2 readers for any persisted P10 rows. Never delete ACKs, units, mutations, sources, uncertain parts or player outcomes. No production rows were accessed by this run.
- Implementation commit is recorded in the phase closeout after final tests. RELEASE NOT AUTHORIZED; no push/merge/CI/restart/deploy/live provider/production DB access.

## Final frozen result

Implementation commit: 079ab386c23aca1876a436bfe609e31907f2b633. Run p10-final-20261022-01 completed once, blocking: exit 0, 27 passed / 0 failed / 0 skipped / 0 cancelled, 22595.7921ms; 26 changed JS/MJS syntax checks passed. F01 is documentation-only; its specified race/recovery seams are exercised in F02/F08. Exact command, all production/test SHA256 values and case names: ../../evidence/P10_FINAL.json. Tested baseline HEAD was 08e965bbfb1920ac2492a2350a17e5f9785d253a plus frozen manifest fingerprint 28b915d6d4f087973179cf42eb93659bcdfc8427abee9bda5f863041efffb162; that exact tested code/test delta was committed above. No production/test change followed the final union.

Measured mock totals across the union: 33 planner invocations, 37 writer invocations, plus 3 mocked model-adapter requests; real provider calls/tokens/spend 0/0/$0. No model configuration or creative-output limit changed. Native acceptance is not semantic quality proof. The phase acceptance/hold/rollback matrix bounds this result; live Discord, provider speed, full OS-process crash recovery and production recovery remain NOT QUALIFIED. No owner question or critical blocker outstanding. Release NOT AUTHORIZED.

## Source audit — 2026-10-22

Actual branch `codex/clean-ai-gm-2026-10`, HEAD `08e965bbfb1920ac2492a2350a17e5f9785d253a`. Tracked tree clean; owner-supplied untracked P10 package and P07/P08 handoffs preserved. No P10 runtime/test name collisions. One serial worker; no production DB or provider access.

Confirmed source paths: `session-opening.js` authenticates the immutable start mutation/event and attempt-1/manual-attempt-2 receipts. `assemblyInputFingerprint` includes roster, control, owner material, scene and world inputs. `session-opening-runner.js` checks it after planner await; `assembly-publications.js` checks after writer await and before slots. Generic SESSION_OPENING hides the predicate. A second DB runner currently changes planning/publishing to held_interrupted despite a potentially live worker. `opening-entry.js` discards writer exceptions. `opening-cohort-runner.js` requires an acknowledged original camera, so failed uncommitted originals can starve shared fiction. These are SOURCE-CONFIRMED seams, not a proven production incident cause.

| Commitment tier | Evidence | Allowed transition |
|---|---|---|
| Unattempted | Authenticated immutable origin, attempts=0 | Transactional claim, original attempt 1 |
| Precommit draft only | No bound turn, accepted narrative/fiction, outbox, legacy ACK/uncertainty | Immutable supersession receipt, independent generation fence, one coalesced replan; attempts stays 1 |
| Native narrative or turn committed | Accepted unit or committed turn/outbox | Never regenerate/overwrite; retain exact source and hold stale payload |
| Known unsent prepared part | pending or failed NOT_SENT with prepared payload, current source/recipient | Exact payload only, no writer |
| delivering / uncertain | Durable transport claim or uncertain part | Hold; authenticated reconciliation only |
| Delivered | Durable Discord message ACK | Immutable history; no resend |
| Paused/revoked | Current native auth/pause failure | Fence commit/send, retain evidence |

F02 reproduction design: create disposable SQLite, authenticated zero-attendee start, suspend actual runner planner on promise barrier, check in owner(s) through native attendance/control records, release planner; assert one archived generation, unchanged attempt-1 event, bounded second plan, current owner-private/public slots and no duplicates. A separate connection invokes the runner while suspended and must not steal the claim. F05 injects writer exception/zero accepted units and checks redacted retained classification plus honest fallback. F04 tests failed original with no camera, then independent cohort publication. No reproduction executed in F01; incident cause remains UNREPRODUCED until F02 evidence. Runtime changes/tests/calls: none / NOT RUN / 0; live latency and Codex cost UNMEASURED. No owner question or critical blocker. Release NOT AUTHORIZED. Rollback: this audit entry only.
