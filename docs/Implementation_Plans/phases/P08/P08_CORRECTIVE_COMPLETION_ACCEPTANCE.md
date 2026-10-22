# P08 corrective completion — fresh acceptance matrix

**Status at handoff:** Not executed. These are mandatory *proposed* acceptance scenarios, not evidence. Run **new** tests only against production modules actually modified by this work order. Keep one frozen final union and do not poll.

| Case | Required fresh scenario | Passing evidence (not a helper-only assertion) | Owner of remediation |
|---|---|---|---|
| A1 | Object declares `visibility:'party'` AND `audience:'gm_private'` (and inverse), nested secret and owner-safe text | GM-private canary absent from real owner/private/public writer, prepared fallback and publication; owner-safe material preserved | F02 |
| A2 | Existing secret GM hook + malicious `convergence_goal` + unrelated other-owner clue | GM-only planner may see its seed; public and owner writer packets and committed payload never contain secret; cross-owner isolation remains | F02/F03 |
| A3 | Current NPC goal and faction objective with prior public clue and NPC subjective false belief | Real `GM.planAssembly()` provider request contains bounded sourced GM agenda; speaker/public packet only has actor-/audience-entitled material; no world-state mutation | F05/F03 |
| A4 | Two independent owner threads, one meaningful public overlapping opportunity | Typed/source-bound brief is *specifically about planned incident* without raw planner prose; public has no private motivations, owner receives only own thread; accepted writer unit still native-validated | F03 |
| A5 | No native world beats, zero attendance, creative camera | Planner/writer have a nonbinding yet specific allowable scene affordance (not fixed generic slogan), owner choice remains open, ordinary fiction_delta remains possible | F03 |
| A6 | Empty-roster start → real authored camera → ACK → owner A/B check in | Exactly one additive authored public cohort and distinct optional owner-private threads; original camera ACK retained; no PC arrival or party formation invented | F04 |
| A7 | Initial roster has one legitimate owner → public opening ACK → second owner check-in | Second owner is eligible; exactly one public shared opportunity; old one-owner private/presence untouched | F04 |
| A8 | Both owners in initial roster; manual mode; established-party resume; owner withdraw/proxy | No unauthorized duplicate follow-up; resume preserves saved positions/knowledge and existing initial receipt history | F04 |
| A9 | Two independent DB connections/workers contend over queued/prepared/authoring/send states | Exactly one authoritative attempt for revision, one planner/writer claim, at most one queued and one ACKed public send; loser never authoring/publishing | F04/F07 |
| A10 | Planner/writer await + source/roster/control changes; Director pause/resume | Stale writer cannot commit or send; unsent refresh retains old attempt; pause blocks new action; committed status remains intact | F04/F02 |
| A11 | Crash before native commit; crash after commit; uncertain send; confirmed NOT_SENT; restart | Exactly-once identity, no blind unknown resend; only proven unsent retries; delivered ACK/message ID retained; manual review for uncertainty | F04/F07 |
| A12 | Writer unavailable/quarantined/private fallback, prior acknowledged memory, stage telemetry | Truthful orientation/review, no fabricated hook/coverage or duplicate delivery; `dramatic_coverage` remains unverified absent actual proof; measure observed calls/latencies only | F06/F07 |

## Mandatory test harness assertions

- Use temporary SQLite files and true independent connections; for cross-process test use real child Node processes with event-driven IPC, **single finite terminal watchdog**, `error`, `exit` and `disconnect` rejection, and unconditional `finally` cleanup. No sleeps, external process checking or polling to await tests.
- Mock the provider boundary to capture the exact native GM planning packet and audience-filtered writer packet. Distinguish `GM planner saw agenda` from `writer saw authorized dramatic cue`.
- Use the native `queueTurnPublications()`/`deliverQueuedTurn()` and *actual persisted* publication rows where the production delta affects delivery. Fake only external Discord endpoints and provider output; do not replace core state/authority with a fake “delivered” label.
- Verify original turn, publication and Discord ack identities after changed current viewpoint and after simulated fresh DB connection/restart. No historical state rewrite or forced co-location.
- Capture accepted authored unit reference, source audience, payload hash, recipient identity, and message ACK, but do not store GM-secret canary content in player-facing logs/metrics.
- Distinguish deterministic synthetic offline proof from live model quality and real Discord network uncertainty. The semantic creativity of scenes remains an unqualified live/staging requirement without separately authorized evaluation.

## No-poll final qualification procedure

1. Freeze **new** completion-delta code, tests and fixtures. Document diff/modified source hashes.
2. Run each required changed-feature test batch once using the local blocking runner with sufficient native timeout. Do **not** repeat still-running tests. If the tool itself has a hard time limit, use the documented supervised detached completion protocol and collect the final exit at a natural checkpoint, not by watching.
3. Repair confirmed failures as a set; freeze again before a targeted rerun. A nonterminal batch is **RUNNING / UNQUALIFIED**, even if most test lines show `ok`.
4. Run **one final frozen union** containing only freshly authored completion tests that exercise modified production; check syntax of changed `.js` / `.mjs`; log actual run ID, terminal exit and counts.
5. Record explicit source/test hashes, invocation, provider costs, ACK counts, uncertainty rows, and local holds in P08 phase + each changed F02–F07 ledger. Never declare release, staging, live provider or real Discord certified from mocks.

## Ledger closure template

`C# | status: FIXED+VERIFIED / IMPLEMENTED+UNQUALIFIED / HELD | source SHA(s) | changed paths | fresh test/run/exit/count | audience/source proof | actual ack/attempt counts | cost/latency observed | remaining hold | rollback`

A1–A11 failures on privacy, player agency, irreversible state, or unsafe replay are critical to the affected feature; isolate that feature and continue only demonstrably safe independent work. Do not downgrade severity to finish the phase.
