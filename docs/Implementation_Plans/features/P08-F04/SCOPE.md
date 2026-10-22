# P08-F04 — Start/check-in cohort assembly and immutable receipts

**Phase:** [P08](../../phases/P08/SCOPE.md)  
**Status:** LOCAL ARCHITECTURE HOLD — NO COHORT CODE CHANGED  
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

Create `bot/tests/ai-gm-2026-10/p08-f04.test.mjs`: session start empty → acknowledged camera → present A → present B → one additive shared incident with separate private opportunities; double B check-in must not duplicate. Cover pre-registered cohort, one attendee, manual, already-together resume, A absent/leave, owner-character switch, guest/proxy, source revocation between async steps, crash before/after commit, uncertain Discord send, no duplicate message/effect, and no forced placement or party state. Use changed code paths and fresh fakes.



## Current local hold

Current openings are bound to a session-singleton `getAssemblyPlan()` and the initial `session_opening_job`'s authenticated attempt/origin roster. `assemblySlots()` and delivery identity hash that plan. Replacing it after a check-in would generate new slot identities; reusing or reopening the start job would violate its immutable roster and one-attempt binding. A safe additive follow-up needs its own persisted plan, source/roster revision, authoring scope, delivery-state reader and status/recovery path. The present feature modules have no such separate plan contract. The existing assembly-refresh path is GM-reviewed replacement and explicitly refuses delivered/uncertain histories, so it is not a safe substitute for automatic cohort follow-up.

This is noncritical and isolated. Do not mutate the historic plan or receipts to simulate support. Continue independent P08 work. The requested second-check-in trigger and additive cohort publication remain unsupported pending that dedicated native contract.

## Acceptance / exit

A cohort joining after camera delivery can be offered a **coherent, agency-preserving common situation**. Initial job/owner entries stay immutable, and no publication idempotency, consent or audience safeguards are lost. Report any migration hold for historic session jobs.

## Scope, hold and rollback constraints

- Preserve native receipts and existing historical saved readers, principal/roster bindings, audience grants, uncertainties, acknowledged fiction and publication identity. Do not rewrite a delivered opening or send an uncertain part again.
- Use wholly new Node tests under `bot/tests/ai-gm-2026-10/` named for this feature, importing only **currently modified production code**, Node libraries, and newly written local fakes. No inherited tests, fixtures, golden outputs, broad validation or paid provider calls. For a documentation-only change, **no test is required or permitted solely to cover unchanged production**.
- Freeze source and fresh tests, run one targeted batch in one blocking call (or follow the repository's supervised no-poll alternative), collect the completed exit code, and document SHA/fingerprint, test hashes/counts, failures/skips and actual costs in [LEDGER.md](LEDGER.md). Rerun only after a batched repair; no watching.
- Before any *new creative limitation* (mandatory template, dialogue length cap, NPC invention ban, new fixed pacing, weaker model), ask the owner a concrete question and hold only that limitation. Enforcing existing player agency, privacy and mechanical authority does not require reapproval.
- If one item has missing source/rule or a noncritical hold, mark it locally and continue independent safe work. Stop unsafe critical work rather than fabricating proof. Reverse only this feature's scoped changes if rollback is necessary; retain owner edits and all authenticated history.
- Offline targeted passes are not release certification. No push, merge, deploy, service restart, production DB, provider spend or CI without separate approval.
