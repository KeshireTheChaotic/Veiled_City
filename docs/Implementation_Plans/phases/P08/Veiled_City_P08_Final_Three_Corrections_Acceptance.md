# P08 Final Focused Corrective Acceptance Matrix

**Target:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` / audited baseline `c03fd5dbdaa8d0570e59f83d71060285cb7eec07`. Recheck current checkout.
**Required execution:** new changed-code-only tests under `bot/tests/ai-gm-2026-10/`, one frozen per-feature batch plus one frozen union, real SQLite, fake provider/Discord, no network, no broad/legacy suites, **no test polling**, terminal exits only.

| ID | Scenario / controlled fault | Required persisted result / negative assertion | Target |
|---|---|---|---|
| D01 | Two eligible public incidents with distinct native refs; OpeningDirector selects A | Actual writer context identifies a specific approved A; not generic, not accidentally B; binds exact session/scene/revision | F03 |
| D02 | GM planner includes unique GM-only hook, mystery solution and `convergence_goal` secret canaries | All canaries absent from public/owner writer prompts, typed output and fallback; GM-only planning still possible | F03 |
| D03 | Owners A/B have separate private source notes and one shared incident | Public packet carries shared incident only; each owner-private packet carries only that owner's entitled note | F03 |
| D04 | Selected shared incident/source revoked or scene/roster/principal revised during authoring await | Old brief held; no stale source reaches newly committed publication; previous ACK untouched | F03 |
| D05 | No existing source-backed shared incident | Playable camera and ordinary native invention remain; no invented *fact* or false claim of specific-goal fulfillment | F03 |
| D06 | Source-backed ordinary NPC offer and observed event, but hidden NPC belief/motive | Specific visible opportunity permitted; actor-private false belief not asserted as objective public truth; PC action/arrival not invented | F03 |
| D07 | Writer accepts evocative but off-topic prose | Transport/native narrative receipt honest; `dramatic_coverage` stays `unverified`; no mandatory keyword/length/template claim | F03/F07 |
| S01 | Worker A reads pending; worker B acknowledges exact committed outbox; worker A saves stale pending | Persisted cohort remains delivered; exact ACK message/channel IDs unchanged | F04 |
| S02 | Reversed worker scheduling and late failure/needs_review callback | Same authoritative status regardless of scheduling; no stale downgrade | F04 |
| S03 | Two-chunk public turn: chunk 1 acknowledged, chunk 2 uncertain | Effective status uncertain/needs review; never report entire cohort delivered; never auto-resend uncertain part | F04 |
| S04 | Separate Node processes/connections compete to finalize the same attempt/turn | CAS/transaction preconditions allow only valid final transition; one ACK set retained; no need for duplicate send | F04 |
| S05 | Obsolete attempt_id or same attempt with changed roster/source/turn_id | Old completion cannot replace newer job data, turn binding or publication evidence; old history retained | F04 |
| S06 | Writer/transport errors with outbox delivering/failed-not-sent/uncertain/delivered | Reconciliation derives truth from complete persisted rows; only proven non-send eligible for documented retry | F04 |
| S07 | Re-read cohort after worker race from fresh DB connection | Stored job display, `transport_acknowledged` evidence and outbox state agree; no imaginary ACK or semantic success | F04/F07 |
| P01 | Director pause after fully acknowledged cohort | Returned and stored cohort still delivered; zero planner/writer/transport replays; exact ACK IDs intact | F04 |
| P02 | Director paused before any cohort claim | No planner/writer/publication; truthfully held if applicable; existing initial camera history untouched | F04 |
| P03 | Director paused while writer is awaiting | No new native commit after pause; safely held unsent attempt or review, no source/agency bypass | F04 |
| P04 | Pause after outbox claim but before transport | No send until authorized/resumed; publishing status remains truthful; interrupted uncertainty handled conservatively | F04 |
| P05 | Resume with known-unsent committed part vs uncertain part | Only documented known-unsent path eligible; uncertain part remains reconciliation hold; no new planner turn | F04 |
| P06 | Repeated pause/resume of already delivered cohort | Immutable `delivered` and ACKs across repetitions; no added messages, hidden party state or character actions | F04 |

## Completion thresholds

**D01, D02, S01, S02, S03, S04, P01 and P06** are blocking for claiming *these three corrections* completed; all rows must be honestly executed or marked with exact local holds, and the implementation status must remain partial if blocking scenarios are not proven.

An offline test is **not** proof of real Discord reliability, arbitrary model semantic fulfillment, whole-runner cross-process safety, or full crash/restart qualification. Staging/release remain **NOT AUTHORIZED / NOT CERTIFIED**.

### Evidence format (append to existing F03/F04/F07 and phase ledgers)

`TEST ID | branch+HEAD | changed production SHA256 | new test SHA256 | executable/command | terminal exit | pass/fail/skipped | observed receipts/turn IDs and source revisions (sanitized) | provider calls/tokens/cost | hold | rollback`.

## Final three corrections observed disposition — 2026-10-22

| IDs | Result | Evidence / limitation |
|---|---|---|
| D01-D07 | HOLD | Native fixture created two accepted scene units and Director source cited both, but the bridge returned zero beats. No actual writer packet was verified. D02 canaries therefore were not evaluated in an actual packet. |
| S01-S03 | PASS (targeted) | Two SQLite connections; mixed ACK/uncertain persisted state; all ACKs restored; late stale needs-review callback could not downgrade delivered; exact message and payload hashes retained. |
| S04 | PARTIAL | Separate SQLite connections and stale snapshots were tested; no simultaneous full-runner competing processes. |
| S05-S07 | HOLD | Obsolete attempt/revision replacement, full restart/re-read truth display and complete error/retry status matrix not exercised by this delta. |
| P01, P06 | PASS (targeted) | After durable all-ACK delivery, paused run and two pause/resume cycles returned delivered with zero planner/writer calls and unchanged ACK IDs. |
| P02-P05 | HOLD | Pre-claim pause, in-flight author pause, claimed-before-send pause, and known-unsent vs uncertain resume paths not newly tested. |

F03 test terminal: exit 1, 2 failed, 0 passed; failure is bridge beat count 0 vs expected 2. F04 test terminal: exit 0, 2 passed, 0 failed; 1.082s. Targeted changed JS/MJS syntax checks and `git diff --check` passed. No live model/Discord, production DB or provider spend. The acceptance threshold is not met: D01/D02 and S04 remain blocking. P08 stays partial and release NOT AUTHORIZED / NOT CERTIFIED.

### Native camera provenance correction — current matrix result

D01 PASS (actual native assembly camera cue A reaches actual writer packet; distinct cue B is excluded); D02 PASS for prompt confidentiality canaries; D03 PASS for private recipient projection exclusion; D04 PASS for revoked source exclusion; D05 PASS as the generic no-selected-cue direction remains available; D06/D07 remain unverified for NPC hidden motives and semantic off-topic coverage. S01–S03 are targeted passes from the separate F04 batch. S04 remains partial because only two-connection stale callback ordering, not simultaneous full-runner process contention, was tested. P01/P06 pass in the separate F04 batch; P02–P05 remain held/unverified. F03 result is not inferred from F04. Phase/release qualification remains partial; release NOT AUTHORIZED / NOT CERTIFIED.
