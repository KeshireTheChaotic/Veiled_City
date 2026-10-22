# P08-F04 — Start/check-in cohort assembly and immutable receipts

**Phase:** [P08](../../phases/P08/SCOPE.md)  
**Status:** IMPLEMENTED — SEPARATE ADDITIVE COHORT JOB; OFFLINE CONTRACT TESTED; DELIVERY UNVERIFIED
**Reference:** `KeshireTheChaotic/Veiled_City` · `codex/clean-ai-gm-2026-10` · `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Dependencies:** P08-F03

## Governing authority

Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` in full. Apply `README.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md` and `DECISION_GATES.md`. The owner behavior specification is authoritative for narrative intent; `content/ENGINE/AI_GM_CONSTITUTION.md` is complementary. Native state alone validates and commits rules; each player owns all PC choices, speech, thoughts, emotions, dice and resources. Source/audience proofs, secrets, canon and exactly-once delivery are nonnegotiable.

## Goal / deliverable

Keep the legitimate zero-attendee public camera but ensure authenticated **post-start check-ins can generate a coherent, additive ensemble opportunity**, not only isolated private entries. Preserve all delivered initial and owner-private outputs and source-bound outbox receipts.

## Source entrypoints — inspect HEAD; do not assume all require edits

`bot/src/commands.js`, `session-opening-runner.js`, `session-opening.js`, `session-opening-attendance.js`, `opening-entry.js`, `assembly-planning.js`, `assembly-state.js`, `assembly-publications.js`, `publication-outbox.js`

## Ordered implementation steps

1. Establish current lifecycle: `commands.js` session start immediately invokes the first opening planner (possibly zero roster); subsequent `present`/`arrive` calls trigger individual `deliverOpeningEntry()`, which explicitly does not plan or publish shared prose.
2. Model distinct statuses for initial camera displayed, check-in roster/cohort, owner entry acknowledged, later shared incident proposed, and any actual converged/party state. Attending alone never constitutes fictional placement or agreement.
3. Introduce a **distinct native additive cohort/follow-up job**, not a reopened initial job, erased history, made-up player declaration or silent replay of delivered source parts. Source-key it to session + stable roster/control/source revision; use existing opening identity and outbox conventions with crash-safe single-flight/idempotency.
4. Define a bounded triggering policy: initial camera can go out with zero roster; once a meaningful authenticated cohort exists (e.g. second distinct owner/check-in) or authenticated GM assembly action occurs, consider one shared opportunity. Do not wait forever on absent PCs; one-person entry remains playable. Do not automatically run for `manual` and do not override established-party `resume` continuity.
5. Use P08-F03's audience-filtered dramatic brief for cohort public and private tasks; reuse acknowledged entries without reciting/copying secrets. Keep source/current-principal checks before each async writer, native commit and send, including changed owner/assignment/proxy/withdrawal.
6. Preserve public-first scene ordering if it is necessary to anchor shared identity. Never alter actual native `converged`/`party` or move/place PCs merely because a scene provides a common invitation; never require everyone to share a location.
7. For interrupted/uncertain publications, retain review-needed state and do not resend until exact reconciliation. Add narrowly scoped status visibility without claiming completion for a still-unresolved cohort.

## Brand-new affected-code tests

`bot/tests/ai-gm-2026-10/p08-f04.test.mjs` uses fresh fakes to test distinct owner gating, pre-registered-start exclusion, roster/control revision changes, manual and established-party exclusion, and status wording. Full DB/outbox/Discord restart scenarios were not exercised; see the ledger's unverified work.



## Implemented additive contract

F04 adds a session-keyed GM-private `opening_cohort_job`, separate from the immutable start job and `assembly_plan`. It requires an acknowledged initial public narrative, assembly mode, a second distinct current owner-controlled attendee not present in the original start roster, and two eligible owners. One source-bound plan and one public writer opportunity are created per session. Manual mode, one attendee, pre-registered initial cohorts and established-party resume do not create a follow-up. Existing `/present` and `/arrive` still deliver each owner-private entry independently; authenticated GM `/assemble` can trigger the same follow-up after initial delivery is verified.

The new job binds current roster/control/source/scene fingerprints and its GM-only source event. It never updates the historic start plan, attendance, position, convergence phase or party membership. The writer receives the public source-filtered brief and commits through the existing native narrative validator, stable outbox and exact publication acknowledgements. Stale state, interrupted planning/authoring, missing accepted fiction, failed delivery or uncertain transport remains locally held; no source/send is blindly replayed. GM-facing status reports only transport state and preserves the no-arrival/no-party-choice authority.

## Acceptance / exit

A cohort joining after camera delivery can be offered a **coherent, agency-preserving common situation**. Initial job/owner entries stay immutable, and no publication idempotency, consent or audience safeguards are lost. Report any migration hold for historic session jobs.

## Scope, hold and rollback constraints

- Preserve native receipts and existing historical saved readers, principal/roster bindings, audience grants, uncertainties, acknowledged fiction and publication identity. Do not rewrite a delivered opening or send an uncertain part again.
- Use wholly new Node tests under `bot/tests/ai-gm-2026-10/` named for this feature, importing only **currently modified production code**, Node libraries, and newly written local fakes. No inherited tests, fixtures, golden outputs, broad validation or paid provider calls. For a documentation-only change, **no test is required or permitted solely to cover unchanged production**.
- Freeze source and fresh tests, run one targeted batch in one blocking call (or follow the repository's supervised no-poll alternative), collect the completed exit code, and document SHA/fingerprint, test hashes/counts, failures/skips and actual costs in [LEDGER.md](LEDGER.md). Rerun only after a batched repair; no watching.
- Before any *new creative limitation* (mandatory template, dialogue length cap, NPC invention ban, new fixed pacing, weaker model), ask the owner a concrete question and hold only that limitation. Enforcing existing player agency, privacy and mechanical authority does not require reapproval.
- If one item has missing source/rule or a noncritical hold, mark it locally and continue independent safe work. Stop unsafe critical work rather than fabricating proof. Reverse only this feature's scoped changes if rollback is necessary; retain owner edits and all authenticated history.
- Offline targeted passes are not release certification. No push, merge, deploy, service restart, production DB, provider spend or CI without separate approval.

## Corrective Follow-up — 2026-10-22

Make GM `/vc-session assemble` reach the additive cohort gate after a terminal initial opening. Resolve the original camera from immutable start-attempt/turn/assembly-delivery/outbox records rather than today's recomputed viewpoint. Claim one revision-bound attempt under SQLite `BEGIN IMMEDIATE`; keep unsent stale attempts in history and allow a new sourced attempt only before any turn/outbox exists. Pause before planning, authoring acceptance, commit or publication, retaining committed outbox state for safe resumption. Compatibility reads retain version-1 cohort records. Corrective tests are in `bot/tests/ai-gm-2026-10/p08-f04-correction.test.mjs`; actual acknowledged delivery, multi-process overlap, restart, positive stale refresh and pause during real transport remain local holds.

### Expanded lifecycle acceptance status — 2026-10-22

The F04 corrective suite now includes an acknowledged initial camera and additive cohort using native SQLite outbox plus mocked Discord; stale planner refresh, pause-during-planning, uncertain-send recovery, and separate-process contention are also included. Its current execution has no terminal result; mark RUNNING / UNQUALIFIED. No final union for the expanded suite has run. See F04 ledger for exact scope and holds.
