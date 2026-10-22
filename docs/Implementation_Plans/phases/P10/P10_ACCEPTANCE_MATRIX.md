# P10 — Fresh changed-code acceptance matrix

All tests must be **new** files under `bot/tests/ai-gm-2026-10/`; avoid inherited suites and fixtures. Use disposable SQLite, mocked Discord and model, exact waiting barriers rather than sleeps, and at least one assertion against the actual changed production function per test. Use `node --test` in one blocking frozen feature batch without polling. File names below are suggestions; add new tests only if the corresponding production code changed.

| ID | Scenario (minimum) | Required proof |
|---|---|---|
| A01 | `/vc-session start` with 0 registrations | One durable original start job and authorized public camera opportunity, no PC placed, no duplicate send |
| A02 | 0→1 check-in during unresolved planner await | New roster revision handled as safe precommit rebase or fenced child; original retained; no permanent `needs_review` solely from ordinary attendance |
| A03 | 0→1→2 check-ins while planner and writer are running | Bounded rebase; one private entry per owner; at most one authorized shared camera per unique opportunity; no wrong-audience messages |
| A04 | Authenticated source tampered / fake GM start | Hard hold without inventing receipt or retrying |
| A05 | Native scene unit committed before source changes | No regeneration that overwrites or reattributes committed fiction |
| A06 | Discord send is `delivering`/unknown after simulated process crash | No duplicate resend or reauthor; exact part remains reviewable |
| A07 | Demonstrably unsent, committed outbox payload after restart | Exact payload delivered if current source/recipient valid, without second provider call |
| A08 | Auth/character control revoked during writer await | Reject stale write/output and private send to old or unrelated recipient |
| A09 | Writer exception, provider deadline, zero units and native held-unit paths | Categorized redacted diagnostics and truthful `fallback_delivered` vs `VERIFIED_SCENE_DELIVERED` |
| A10 | Billy-style private `entry_hooks` (two lines) | Hook is guidance rather than verbatim recitation in successful authored scene; no hidden GM hook in user output |
| A11 | No initial camera confirmed, then two owners arrive | New source-bound shared camera pathway reachable with no initial `completed` status; no automatic co-location |
| A12 | Two owners remain in different known locations | Public camera reveals no private placement or inferred collective perception |
| A13 | Unknown initial PC location, scene setup has no safe locations | Reasoned owner-only message and viable independent world scene; no inferred travel |
| A14 | Existing location history conflicts with requested reset | Preserve history; owner/GM review without false 'just chose initial location' |
| A15 | Repeated `/vc-session present`, `/vc-session assemble`, restart, overlapping workers | Exactly-once proofs using durable transactional fence, not only WeakMap; no lost existing acknowledgment |
| A16 | Director paused between generation and publish | Zero unauthorized sends, no state mutation, resume only from authenticated safe state |
| A17 | Narration invents ordinary NPC/sign/atmosphere without an existing canon fact | Permitted in correct audience as provisional fiction, no fabricated mechanical consequence or PC response |
| A18 | Secret canary: GM-only hook, other PC hook, nested export metadata | Never enters public/other-owner packet, accepted unit, fallback or publication |
| A19 | End-to-end mocked Discord command: Session start → check-in → private entry → shared scene | User sees playable story; GM sees actionable status only, no ritual `assemble` prerequisite |
| A20 | Performance comparison of changed hot path | Record actual stage duration and provider-call totals or explicitly `UNMEASURED`; no unapproved model swap or routine progress spam |

## Required quality rubric (not automatically provable by snapshot tests)

A successful authored private or public scene should contain concrete sensory/environmental information, an independently acting world element (NPC, faction signal, unfolding event or comparable dynamic), and a nonbinding invitation/tension or information to respond to; it must not be a checklist of character hooks or administrative warnings. Prefer assertions on authored unit types and returned structure over brittle adjective/keyword matching. Naturalness, semantic secrecy, humanlike pacing and live model quality require separately authorized qualitative review; mark those **UNQUALIFIED** in offline completion.

## Success / failure accounting

For each scenario record `PASS / FAIL / HELD / NOT RUN`, actual commit SHA, test file hash, execution command, terminal exit and meaningful assertion. Do not count tests targeting only fakes as engine qualification. Critical A04–A08, A12, A15, A16, A18 must never fail silently or be bypassed by a 'creative' recovery. Cases not exercised against a real provider, real Discord or production DB are not proof of those external integrations.

## Final offline acceptance — 2026-10-22

Implementation SHA `079ab386c23aca1876a436bfe609e31907f2b633`. Frozen run `p10-final-20261022-01`: **exit0; 27 passed, 0 failed/skipped/cancelled, 22595.7921ms; 26 syntax checks passed**. [Exact command, source/test SHA256 values, case names and cost/call records](../../evidence/P10_FINAL.json). Case numbers below refer to that manifest's 27 actual terminal test results. PASS applies only to the expressly tested offline contract.

| ID | Result | Production evidence / limits |
|---|---|---|
| A01 | PASS | Cases7,17: real runner and start handler; zero attendees; one durable job/public scene/ACK; no PC placed |
| A02 | PASS | Cases1,17: held planner barrier, native check-ins, source-bound epoch, exact original receipt retained |
| A03 | PASS | Cases1,2,19: two coalesced owners across planner/writer barriers; bounded sustained churn; current private audiences. Planner and writer barriers exercised in separate deterministic cases, not a live combined-duration benchmark |
| A04 | PASS | Cases3,6,24: tampered source and unauthorized/stale recovery rejected; no forged receipt |
| A05 | PASS | Case20: native accepted unit/committed turn blocks rebase; exact unit/part retained |
| A06 | PASS | Cases5,21: actual uncertain mock send and durable delivering claim on SQLite reopen cause zero resend/reasoning |
| A07 | PASS | Case4: close/reopen SQLite, same prepared payload/hash/ID delivered once with no additional model invocation |
| A08 | PASS | Case14: native control revision changes during writer; no old-recipient send or committed turn |
| A09 | PASS | Cases11–13,25: exception/zero/held distinct; actual adapter provider/parse/deadline categories; fallback is not a scene |
| A10 | PASS | Case10: actual owner packet contains only entitled personal guidance; accepted prose differs from hook text |
| A11 | PASS | Case8: authenticated failed original, no committed camera, two later owners, independent cohort source/turn/ACK |
| A12 | PASS | Cases8,27: separate saved private locations excluded from public packet, no witness/party/location inference |
| A13 | PASS | Cases15,16: no entitled safe location; actionable owner message and native provisional camera; PC data/resources unchanged |
| A14 | PASS | Case15: pre-existing placement-history marker blocks initial reset; decline and invalid owner preserve state. Full historical movement adjudication is outside this delta |
| A15 | PASS | Cases1,4,8,10,17,22,23: independent SQLite connections, worker-thread isolates, stale-worker fence, repeated present, exact ACK preservation; live OS-process crash/restart not qualified |
| A16 | PASS | Cases3,8,24: pause at planner/writer boundaries, no draft/send, version-bound resume; completed cohort ACKs unchanged after pause |
| A17 | PASS | Case16: native new provisional location from empty entitled setting; no PC placement or mechanical result |
| A18 | PASS | Cases1,10,27: other-owner hook and nested/contradictory GM-label canaries excluded from actual writer packets/output; semantic leakage by a live model remains unqualified |
| A19 | PASS | Case17: actual mocked-Discord start → concurrent present → shared/private ACKs with no assemble ritual or duplicate private publication |
| A20 | PASS | Case17/native stage metrics and manifest: durations, invocation totals, fallback classes observable. Same-context speed comparison, live provider/Discord latency, Codex cost and cache savings UNMEASURED |

**External/qualitative holds:** real Discord acknowledgment behavior, live provider output/speed, narrative naturalness/dramatic coverage/semantic secrecy, actual production incident cause, live OS-process crash recovery and production migration/recovery are **NOT QUALIFIED / NOT RUN**. Test counts do not certify untouched mechanics, all historical memories or all gameplay. No owner creative restriction/model-downgrade question is outstanding. **RELEASE NOT AUTHORIZED.**
