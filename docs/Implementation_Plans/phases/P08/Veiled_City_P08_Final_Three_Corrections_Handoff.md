# Veiled City — P08 Final Focused Corrective Handoff

**For:** Codex Luna Medium (one coordinator; no subagents by default)  
**Task:** Implement exactly three outstanding Phase 08 corrections under the existing P08-F03 and P08-F04 contracts, with F07 recording qualification evidence.  
**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target checkout:** `codex/clean-ai-gm-2026-10`  
**Verified baseline (2026-10-22):** `c03fd5dbdaa8d0570e59f83d71060285cb7eec07` — at handoff creation, the branch was identical to this commit. **Recheck actual local HEAD/worktree before editing; do not reset or overwrite changes.**  
**Authority:** `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` (read in full) plus `content/ENGINE/AI_GM_CONSTITUTION.md`, and repository implementation/test protocols.  
**Release:** NOT AUTHORIZED / NOT CERTIFIED. Handoff only; no repository changes have been made by the author of this handoff.

## 0. Exact mandate and non-goals

Resolve:

1. **P08-F03 — Specific but authorized dramatic throughline:** OpeningDirector plans an actual shared incident, while audience-first authoring currently sees an optional generic direction and existing world cue refs. Introduce a useful **specific, source-qualified scene direction** without exposing GM/private raw planner prose, asserting unearned world facts, inventing PC choices, or imposing a prose template.
2. **P08-F04 — Monotonic cohort delivery truth:** The `save()` path in `opening-cohort-runner.js` checks only `attempt_id`, then uses an unconditional upsert. Competing writers can regress job status behind actual outbox acknowledgments. Make terminal/status transitions conditional and derive transport truth from authoritative publications.
3. **P08-F04 — Pause must not downgrade acknowledged completion:** A Director pause currently can replace `delivered` with `held_paused`. Preserve acknowledged terminal state and expose pause as an operational hold for **outstanding unsent work only**.

Do **not** create P10 or another general AI GM phase. Do **not** rebuild assembly, change Daggerheart rules, weaken confidentiality, force PC participation or add a mandatory storytelling template. Do **not** interpret this task as permission to perform the remaining broad release/staging/provider qualification from the prior review. Record those as distinct unresolved holds.

## 1. First read / execution discipline

1. Inspect `git status`, checked-out branch, HEAD, and untracked user files. Preserve all unrelated P06/P07/P08/P09 work and user handoffs. Resolve any drift since the verified baseline based on **current source**, not line-number assumptions.
2. Read fully: `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md`, `content/ENGINE/AI_GM_CONSTITUTION.md`, `docs/Implementation_Plans/README.md`, `CODEX_START_HERE.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md`, and `DECISION_GATES.md`.
3. Read P08 `SCOPE.md`/`LEDGER.md`, **both** F03 and F04 `SCOPE.md`/`LEDGER.md`, and F07's ledger for reporting. Keep their existing history; **append** a narrowly scoped dated correction and observed outcome.
4. Inspect only relevant implementation paths: `bot/src/assembly-context.js`, `gm.js`, `opening-world-bridge.js`, `opening-cohort-state.js`, `narrative-authority-context.js`, `narrative-authority.js`, `pvp-output.js`, `opening-cohort-runner.js`, `db.js`, `publication-outbox.js`, `publishing.js` and associated writer-input source contracts. Edit only what new behavior requires.
5. Carry out the three repairs in small traceable changes, then newly author tests under `bot/tests/ai-gm-2026-10/`. Never copy/import/execute any older test, fixture, golden case, inherited registry or broad `npm test`/`npm run validate` command.

### Source-grounded starting observations (not a proposed implementation)

- `assemblyWriterBrief()` in `assembly-context.js` currently creates `dramatic_intent.version=2` with the constant objective **“Explore an interesting shared opportunity without asserting a hidden cause, PC response, or outcome.”** Its `cues` come from `openingWorldOpportunities(...).beats`. The planner's particular `convergence_goal` is not passed to the writer. This prevents an unsafe raw prose crossing, but leaves a *causal/dramatic disconnect*.
- `gm.js::planAssembly()` is already given bounded GM-private NPC/faction agenda. It proposes `convergence_goal`, character entries, hooks and possible bonds. Those fields are not native publication proof. `narrative-authority-context.js` uses `assemblyWriterBrief(..., cohort?.plan || null)` for dedicated assembly and cohort writer requests.
- `opening-world-bridge.js` supplies currently audience-scoped existing beat references (`source_ref`, `signal_ref`, `reason`, etc.), typically up to three. Those references are **cues**, not authority to claim effects, NPC knowledge or unseen causes.
- `opening-cohort-runner.js::save()` checks same `attempt_id` and then calls `saveCityRecord()` unconditionally. `db.js::transitionCityRecord()` already provides a scoped status/attempt/roster/fingerprint compare-and-set for some transitions; it is not yet used consistently for final saves.
- `opening-cohort-runner.js::execute()` saves `held_paused` immediately if the Director is paused, including when the old cohort is already `delivered`. `publish()` and its catch/recovery paths can similarly write job statuses after async awaits.
- `publication-outbox.js` has atomic `claimPublication()`, and transport receipts in `publication_outbox` remain authoritative. Tests from the prior completion reported 7/7 passing offline, but did **not** prove the specific authorized dramatic throughline or every concurrent status interleaving.

Source anchors at audited commit:
- [F03 writer brief](https://github.com/KeshireTheChaotic/Veiled_City/blob/c03fd5dbdaa8d0570e59f83d71060285cb7eec07/bot/src/assembly-context.js)
- [F04 cohort runner](https://github.com/KeshireTheChaotic/Veiled_City/blob/c03fd5dbdaa8d0570e59f83d71060285cb7eec07/bot/src/opening-cohort-runner.js)
- [Native CAS](https://github.com/KeshireTheChaotic/Veiled_City/blob/c03fd5dbdaa8d0570e59f83d71060285cb7eec07/bot/src/db.js)
- [Native outbox](https://github.com/KeshireTheChaotic/Veiled_City/blob/c03fd5dbdaa8d0570e59f83d71060285cb7eec07/bot/src/publication-outbox.js)
- [F03 ledger](https://github.com/KeshireTheChaotic/Veiled_City/blob/c03fd5dbdaa8d0570e59f83d71060285cb7eec07/docs/Implementation_Plans/features/P08-F03/LEDGER.md)

## 2. P08-F03 — Make the dramatic throughline specific, causal, authorized

### Required invariant

**The public writer can recognize and portray the same eligible shared incident/opportunity OpeningDirector selected, using entitled native source material.** The writer may creatively interpret, complicate and dramatize that opportunity, but may not receive raw GM-only plans as if they were public facts. The player controls if/how each PC engages. Owner-private packets can additionally connect *that owner only* to a source-authorized thread.

### Design direction (proposal; reconcile with native contracts before coding)

**A. Separate planning intent from disclosed facts.** Introduce or extend a compact, versioned `AssemblyNarrativeBrief`/`dramatic_coordination` artifact. Keep `plan.convergence_goal`, `public_opening`, `private_hook`, `bonds`, `stay_reason`, GM hooks, hidden motivations and unresolved mystery solutions in the GM planner layer. An instruction saying the planner text is "public-safe" is **not** authorization. A generated "visibility" label is **not** authorization.

**B. Select a concrete anchor using native evidence.** Have the plan select or refer to **exact native source identifiers** for its desired shared opportunity. Before including a particular cue in a writer packet, resolve it through current world/Director sources and audience projection, checking source status, scene, session, source kind, revision, visibility, owner/principal where relevant, and relationship to the chosen opportunity. Build the writer-visible incident label/observation/pressure only from the authorized projection, never by paraphrasing raw planner prose or copying a GM-only agenda row.

**C. Handle newly invented incidents legitimately.** If the intended dramatic incident does not yet have an eligible public source, reuse the existing typed native fiction/invention mechanism to **propose and independently authorize an ordinary public-scene opportunity** (an observed oddity, NPC offer, rumor, or environmental change) before using it as a disclosed anchor. Its hidden cause stays unresolved; no PC action, effect or new canon is assumed. Do not silently create a public source by stamping `visibility='party'` onto GM planner text. Prefer adapting native existing sources over new machinery or provider calls. If no safe source exists, retain useful open-camera authoring and mark **specific convergence unqualified**, instead of claiming the generic objective fulfills F03.

**D. Project by actual audience.** Public/party: only shared observable pressure, questions or opportunities and approved signal/source IDs. Owner-private: may include that owner's source-authenticated thread and their independently entitled observations; never another owner's hook or secret, or NPC private beliefs as objective truth. A public camera does not locate or act for PCs. Prior acknowledged fiction remains read-only and authoritative. No fixed prose words, hard quota, predetermined outcome, forced reunion, forced party membership, or compulsory player response.

**E. Version and revalidate.** Include session, scene, eligible audience, selected anchor IDs, source hashes/revisions, certified plan fingerprint/hash, roster/control revision where applicable, and a stable brief revision in the native packet. Revalidate before writer request, after authoring awaits, before accepting typed native output, and at outbox publication where existing paths permit. If a selected source changes or becomes hidden, invalidate that packet without disclosing old private content or modifying already acknowledged publications. Retain v2/historical readers and avoid a schema/data migration unless demonstrated necessary.

**F. Wire the actual writer path.** Trace the exact `gm.planAssembly()` → `certifyAssemblyPlan()` → `openingCohortNarrativeCandidate()` / `assemblyNarrativeCandidate()` → `buildNarrativeContext()` → `assemblyWriterBrief()` → `authorNarrativeRequests()` path. In a positive fixture, capture the **actual generated writer request packet**, not just the return value from a standalone adapter. It must contain a distinguishable incident anchor that came from a current authorized source, with source identity/continuity, and **must not** contain GM canaries or unauthorized owner material.

### Minimum F03 proof

- Two unrelated PCs have independent, legitimate private materials, plus unique GM secret canaries; the GM planner sees all authorized GM context but the public writer packet shows **one specific common public opportunity** and neither secret.
- Two different possible public incidents exist; the planner selects incident **A**. The writer packet clearly contains an authorized description/anchor for **A**, and does **not** ambiguously advertise **B** as the selected convergence plan. This distinguishes a real connection from generic scene inspiration.
- Owner A's packet may show A's selected thread but not B's; vice versa. The public packet shows neither private thread.
- No eligible shared incident: no fabricated claimed public fact, no leaked plan text, but ordinary descriptive invention and a playable scene remain available; record the missing specific anchor as **unqualified**.
- Source revocation, changed scene, changed owner/control, stale plan fingerprint, and GM-secret-in-direct-plan-goal canaries fail closed before any new publication.
- Native accepted story units remain normal creative output, with `dramatic_coverage` **unverified** unless some separate source-based coverage mechanism truly proves more. Don't use keyword checks, self-rated model success or narrative constraints as a substitute for authoring proof.

### Suggested production touch points

`assembly-context.js` (brief selector/shape), `gm.js` and plan certification/plan schema if exact anchor ref selection is needed, `narrative-authority-context.js` (packet wiring), plus a small new `assembly-narrative-brief.js` only if it reduces duplication. Keep `pvp-output` and source validation unchanged unless required by explicit, tested authority contracts. If the native plan schema cannot accommodate anchor refs without broader edits, document that limit and select an existing certified source binding rather than pretending a plan field is authorized.

## 3. P08-F04 — Race-proof final status and delivery evidence

### Required invariant

**No stale worker can downgrade or falsify durable publication truth.** Completion means that all relevant exact committed outbox parts have acknowledged Discord message/channel receipts. Failure, pending, pause and uncertain states are separate; a partially delivered multi-part turn is never shown as fully delivered. No extra send occurs just to repair a display status.

### Implementation sequence

1. **Inventory every write** to `opening_cohort_job`: `save()`, `execute()` pause path, `publish()` pending/recovery/authoring/commit catches, refresh/replan path, and any other legacy writer. Identify which writes can occur after an `await` and what immutable attempt/turn binding they hold.
2. **Introduce one authoritative transition/reconciliation helper** for current cohort job status. Inside a synchronous SQLite `BEGIN IMMEDIATE` transaction, reload the current row and its bound `turn_id`/publication rows, check exact `attempt_id`, `roster_revision`, `input_fingerprint`, `turn_id` and expected allowed state; derive final status from actual acknowledgments rather than an old caller snapshot. Use conditional `UPDATE ... WHERE` or equivalent existing `transitionCityRecord()` CAS, extended minimally if necessary. If the preconditions fail, return fresh current state **without overwriting**.
3. **Delivery precedence:** any complete, source-valid *acknowledged* outbox set must stay `delivered` and carry its original receipts; any `uncertain` or actively `delivering` part blocks delivered; an earlier acknowledged part plus an uncertain later part remains uncertain; known proven non-send may be eligible for documented safe retry; missing parts/receipts stay pending/review. Do not infer `delivered` from `row.status` or all entries being marked `delivered` without message IDs. Distinguish runtime delivery truth from semantic `dramatic_coverage`.
4. **Prevent stale updates:** test a callback that reads `pending`, blocks while another worker completes the exact outbox and marks `delivered`, then resumes with a stale `pending`/`failed`/`needs_review` save. Final persisted status and evidence must still agree with the durable outbox. Repeat with inverse ordering, same attempt but different source revision, and superseded unsent attempt. An obsolete attempt cannot overwrite the current one; an old job cannot erase a newer `turn_id`.
5. **Preserve ledger/history:** historical `opening_cohort_attempt`, source events, start camera receipt, publication records and native turn ID remain unchanged. Status reconciliation never reruns writer/planner or sends Discord merely to repair stale status.
6. **Monotonic status applies across the whole lifecycle:** ensure all catch paths and paused/recovery branches call the same guarded logic; do not patch only the top-level `save()` and leave a second unconditional upsert.

### State design guidance

Use the **outbox as authoritative evidence**, not a numeric ordering that incorrectly equates `uncertain` with a lesser value than `delivered`. For any exact committed turn, its full row set + receipt completeness defines effective transport status. Never change *uncertain* to *delivered* without exact acknowledgment/reconciliation; never return an optimistic `delivered` merely because no pending row is visible during a race. An uncommitted, demonstrably unsent plan may still use `planning`/`prepared`/`authoring`/`needs_review`/`held_paused`, with their own CAS and refresh rules. Review pre-existing stale status carefully, keeping legacy reader compatibility.

## 4. P08-F04 — Pause is not an undo action

### Required invariant

**A Director pause stops new discretionary work but does not undo a published, acknowledged cohort.** Completion is historical fact, not an active process to pause. `held_paused` describes *outstanding eligible work*, not a delivered past scene.

1. In `execute()`, inspect/reconcile the existing job and exact committed outbox **before** any pause-state mutation. If fully acknowledged, return `delivered` with original evidence/ACK IDs regardless of Director pause. No call to planner/writer/transport.
2. For an uncommitted/unsent job, holding the job while paused is permissible if it cannot erase attempt identity, accepted history or stale-revision review. A committed but still pending/unknown-send publication retains its actual outbox status and is blocked from new sends while paused; consider a separate operational `paused` projection or status annotation rather than overwriting a delivery truth.
3. Re-check pause after asynchronous planner/writer waits, after Discord channel/member lookup, and before transport—as already required by source and privacy policy. On resume, the same eligible native turn/outbox part may proceed **only if provably unsent**, never replan/resend an uncertain or delivered part.
4. Test pause **before plan**, **during writer await**, **after claim but before send**, **after ACK**, and repeated pause/resume cycles. Assert zero duplicate writes/Discord calls for delivered status and truthful holds for unsent/uncertain work.
5. Ensure `openingCohortStatus()` text and phase telemetry describe the actual acknowledged state, not an incorrect pause regression.

## 5. Focused acceptance matrix

See `Veiled_City_P08_Final_Three_Corrections_Acceptance.md` in this package. Required matrix IDs:

- **D01–D07:** real planner/actual writer packet, incident A vs B, GM/owner canaries, stale source, open-world invention, privacy, truthful dramatic coverage.
- **S01–S07:** competing async status writers, multi-chunk partial acknowledgments, retained receipts, attempt/turn ABA, uncertainty, process separation, status projection vs outbox truth.
- **P01–P06:** pause after delivered, pause before plan, pause during writer, pause before send, resume known-unsent vs uncertain, repeated pause/resume.

Use fresh disposable SQLite fixtures and deterministic gates, and mock external provider/Discord. At least one status-race test must use **two distinct `VeiledDB` connections** (ideally two independent Node processes), not only two promises over one `db` instance. Parent/child tests need a bounded **one-shot watchdog**, event-driven barriers, guaranteed cleanup, and final exit status. Do not poll, watch or repeatedly check running tests. Keep tests focused on changed production interfaces only.

### Test command discipline

Write entirely new tests, e.g. `bot/tests/ai-gm-2026-10/p08-f03-specific-throughline-20261022.test.mjs` and `p08-f04-status-monotonic-20261022.test.mjs`, plus a brand-new feature-local helper/worker only when needed. Never import pre-existing fixture modules or tests, nor run old `p08-correction-completion.test.mjs` as a substitute. Freeze source and tests, run one blocking per-feature batch, batch repairs if needed, and a final frozen union containing only these new tests. `node --check` changed JS/MJS only. Record exact commands, source/test SHA256, exit code, counts, skipped, durations, provider calls/tokens/cost and affected feature ledger status. An unfinished or timed-out run is **UNQUALIFIED**, not a pass.

## 6. Definition of done and non-certification

**Implementation complete** for these three corrections requires:

- A positive, **source-qualified specific-incident** authoring packet in the actual writer path, with cross-audience canaries excluded and stale bindings rejected.
- Every cohort job final/pause/recovery write path uses a status-safe strategy; stale workers cannot overwrite a newer acknowledged state, even if attempt IDs match.
- `delivered` remains `delivered` after pause/resume and after a lagging callback; exact outbox/Discord IDs and native turn identifiers remain intact.
- Fully deterministic fresh affected-code tests for D/S/P scenarios have **terminal passing** evidence, with at least one two-connection race and the appropriate mocked source/transport path.
- P08 phase and F03/F04/F07 ledgers truthfully record implementation and test results, all remaining holds and rollback instructions.

Do not infer from these targeted passes: product release certification; semantic quality of all generated fiction; real Discord transport stability; live provider latency/cost; long-duration load performance; completeness of previously untested private entry and crash/restart workflows; or universal whole-runner multi-process safety. Maintain those as separate holds until authorized and actually observed. Provider spend, CI, push, merge, deployment, process restart and production DB access remain forbidden without separate owner authorization.

## 7. Final Codex reporting contract

Return a concise table for F03-specific-brief / F04-monotonic-status / F04-paused-delivered showing **verified fixed**, **implemented but test hold**, or **unresolved**. Provide actual branch/HEAD, each changed production/test/doc path, data migrations (if any), exact new test command/result, proof IDs, failure repairs, source/test fingerprints, whether legacy receipts/readers were preserved, zero/nonzero provider usage with actual evidence, owner decisions, remaining noncritical holds, critical blockers, rollback and `RELEASE NOT AUTHORIZED / NOT CERTIFIED`.

If a new prose, pacing, NPC-autonomy or ordinary-world-invention restriction appears necessary, **ask the owner before implementing that new restriction**, hold only that restrictive proposal and finish independent privacy/state-safety work. Existing player agency, audience secrecy and authoritative Daggerheart validation remain mandatory without reapproval.
