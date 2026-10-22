# Veiled City — P08 Corrective Integration Handoff

**For:** Codex (Luna, medium reasoning effort)  
**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Verified audit HEAD:** `47e93e7f05711ad8671408662cee2940b7c7e645` (branch comparison `identical` at handoff preparation)  
**Original P08 reference:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Work order:** Close the **existing Phase P08** integration gaps. **Do not** start P09, recreate P08, or rerun P00–P07.  
**Evidence grade at intake:** P08 code and 11 committed offline test passes exist, but integrated safety/lifecycle/restart acceptance is not established. This document is a **work order**, not a claim that the corrective changes have been made.

## Mission and authority

Make OpeningDirector a reliable coordinator of dramatic intent and post-check-in opportunities while Audience-First authors compelling situated fiction and native code enforces audiences, PC agency, Daggerheart outcomes, receipt integrity and persistence. Preserve the useful zero-attendee camera, independent owner-private entry, substantive NPC agency, emergent invention and acknowledged continuity. No player character's action, emotion, speech, consent, placement or party membership may be decided by orchestration.

**Mandatory repository reading before edits:**

1. `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` — **in full**, then `content/ENGINE/AI_GM_CONSTITUTION.md` (complementary, not a substitute).
2. `docs/Implementation_Plans/README.md`, `CODEX_START_HERE.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md`, `DECISION_GATES.md`.
3. `docs/Implementation_Plans/phases/P08/{SCOPE,LEDGER}.md`, `docs/Implementation_Plans/P08_SOURCE_CROSSWALK.md`, and the specific `features/P08-F0N/{SCOPE,LEDGER}.md` pair for each active correction.
4. Verify **actual HEAD, branch, dirty worktree**, and all relevant methods before changing them. Preserve user changes and saved-state readers. If source differs from this anchor, record an updated crosswalk and reconcile findings rather than blindly applying a patch.

### Nonnegotiable execution rules

- Single coordinating Codex agent, **zero subagents by default**; narrow context, sequential dependent work; do not burn cycles asking for test progress.
- Existing P08 feature scopes and ledgers remain the canonical records. Add a clearly labeled **Corrective Follow-up** section to P08 phase scope/ledger and the affected **F02–F07** feature scopes/ledgers. Retain earlier completed results as historical. Do **not** overwrite an original test pass with an unsupported new pass; update current status to corrective pending until qualified.
- Record per correction: source SHA/worktree fingerprint, affected production paths, contract change, source and test hashes, exact one-batch test command, terminal exit/results, any cost/call/cache evidence, privacy/agency/replay proof, rollback, local holds and decisions. Update `P08_SOURCE_CROSSWALK.md` only to record proven new disposition.
- **Only brand-new changed-code-only tests**, authored from scratch under `bot/tests/ai-gm-2026-10/` with distinct names such as `p08-f02-correction.test.mjs`. Do not copy, import, execute, adapt or modify historical tests/fixtures/golden outputs/suite registries. Do not run `npm test`, `npm run validate`, broad validation or existing CI. Import only actively changed production modules, Node standard libraries, and brand-new local fakes. Use disposable SQLite, deterministic clock/dice, fake Discord and mocked writer/planner.
- Freeze each feature implementation and tests; run its batch **once using one blocking invocation** with sufficient native timeout. No polling, watching, repeated wait/status/tail calls. On completion collect concise exit, count and failure details. One final frozen union of all new P08 corrective tests plus `node --check` of **changed** JS/MJS only. Rerun only after a batched repair; incomplete runs are `RUNNING / UNQUALIFIED`.
- Preserve native state, owner control, scoped disclosure, hidden GM Hooks/Relationships/canon proposals, old saved readers, outbox receipts and at-most-once send safety. No retry of uncertain/delivered publication without authorized exact reconciliation. Authoring is not mechanical/world authority.
- Before **new limits on creativity, NPC/faction autonomy, improvisation, natural prose or model quality**, ask the owner a concrete decision-gate question and hold only that restriction. Existing PC authority/privacy/rules/consent protections do not require permission to enforce.
- No push, merge, deploy, production database access, live Discord calls, paid provider/model-as-judge calls, CI trigger or service restart without separate owner authorization. Isolate noncritical holds; stop all work only for a critical blocker that prevents independent safe progress.

## Priority 1 — Confidentiality and audience authorization

### P08-F02 corrective: finish the owner/GM knowledge firewall — **HIGH**

**Confirmed source problem:** `bot/src/assembly-context.js` now excludes top-level `gm_hooks` from `assemblyHookSources()`, but `ownerText()` does not exclude `value.export_meta.visibility`. `bot/src/character-export.js::playerCharacterProjection()` explicitly treats `export_meta.visibility` as an exclusion criterion. Some nested objects may therefore be player-export-invisible yet enter owner writer inputs. Existing `p08-f02.test.mjs` did not test this condition.

**Implement:**
1. Locate the canonical owner-entitlement/disclosure predicate; create or reuse one small consistent classifier for sheet subobjects, including `visibility`, `export_meta.visibility`, nested GM-only flags/fields and applicable audience labels. Do not depend on string scrubbing of secret *content* or indiscriminately strip ordinary background. Maintain player-visible narrative access where actually authorized.
2. Apply consistently to `assemblyHookSources()`, `openingEntryProjection()` and any derived private/public writer packet and fallback. Keep GM-only hook seeds accessible only to authorized GM planning. Preserve GM-private material and historical readers without rewriting already delivered fiction.
3. Check principal/owner/source revision after writer awaits and before commit/send. Current in-flight source revocation must not publish an old privately authorized part.
4. Record whether other owners, public scopes, GM-only relationships/canon or nested notes can enter either planner-to-writer projection. Any disclosure must be independently source-authorized, not inferred from planner text.

**Fresh tests:** `p08-f02-correction.test.mjs`: nested `export_meta.visibility='gm_private'` canary; nested `visibility='gm'` and explicit `hidden`; legitimate owner text; GM seed only in GM planner; both initial and late owner projections; stale principal and source revocation; no unauthorized canary in prepared or fallback payload. These tests must exercise modified pipeline code, not just a standalone filter.

**Exit:** No unauthorized owner/public packet or render can contain the canaries through changed paths, and GM-only planning remains functional. Other historical records, if uninspectable, become explicit holds.

### P08-F03 corrective: replace prompt-only safety for dramatic intent — **HIGH**

**Confirmed source problem:** `gm.js::planAssembly()` receives GM-only secrets and generates `convergence_goal`; `assemblyWriterBrief()` forwards that raw freeform goal to **public and private** authoring packets. An instruction saying “public-safe” is not deterministic source proof. The current F03 test uses a clean benign goal and does not try a generated secret.

**Implement:**
1. Distinguish **GM-private dramatic coordination** from **audience-eligible writer guidance**. Treat arbitrary planner-authored prose as untrusted for disclosure. Do not simply regex/filter the goal or assume a structured JSON schema implies audience authorization.
2. Build/version a small `AssemblyNarrativeBrief` or equivalent bounded projection using *already entitled source refs/observed public cues*, and their native source/visibility checks. A verified public incident can be a creative objective; the GM-only explanation remains internal. Private owner brief gets only that owner's legitimately known material. If no safe common goal can be proven, provide a compelling **generic non-factual dramatic objective** and allow the writer to invent permissible ordinary details via existing native `fiction_delta` validation.
3. Revalidate session, scene, roster/assignment, fingerprint, audience and evidence revision on build, after authoring and at acceptance/publication. Keep source refs diagnostic and non-executing. Never silently promote `public_opening`, `private_hook`, `bonds`, `stay_reason` or GM notes to observable truth.
4. Preserve the existing Audience-First authoring route and NPC voice; the objective is a flexible inspiration, not a required narrative template or forced PC relationship.

**Fresh tests:** `p08-f03-correction.test.mjs`: planner inserts `GM_ONLY_GOAL_CANARY` directly into `convergence_goal`; no canary may reach public or either owner writer packet; separate private clue stays in one owner's packet; a source-authorized public cue is included; no-safe-cue fallback is non-factual; stale/revoked sources fail closed; raw planner parts never publish; writer can still use narrative units and minor invention.

**Exit:** No model-generated GM-only text is trusted as disclosed context simply because it occupies `convergence_goal`; writer still receives useful safe creative direction.

## Priority 2 — Cohort lifecycle correctness

### P08-F04 corrective A: unblock GM `/vc-session assemble` — **HIGH**

**Confirmed source problem:** `bot/src/commands.js` returns from the `/vc-session assemble` handler when `runSessionOpening()` returns the existing initial job. The `runOpeningCohort()` call is below that return and is therefore skipped on normal initialized sessions.

**Implement:** After describing/resolving the initial job, *independently* evaluate cohort eligibility and invoke the cohort only if authorized. Do not replay initial opening, silently bypass review/paused/manual states, or have the handler fall through into obsolete fresh assembly. Return a combined truthful initial/cohort status.

**Test:** Drive the actual changed command routing with a **completed** initial opening plus two eligible post-start owners; assert one cohort attempt is invoked. Separately assert no cohort for manual, resume, no initial substantive acknowledgement or no eligible cohort.

### P08-F04 corrective B: use immutable original camera acknowledgement — **HIGH**

**Confirmed source problem:** `opening-cohort-runner.js::initialCameraAcknowledged()` calls `assemblyDeliverySummary()`; `assemblySlots()` recomputes the public slot scope using *current* visible scene presence. After check-in, that viewpoint can differ from the neutral original camera, producing a different slot key and concealing the original published acknowledgement.

**Implement:** Resolve the original public opening from its immutable start-job/slot/turn provenance and real outbox ack, not a newly derived current-viewpoint key. Verify actual `discord_message_id`, entitled public visibility, source validity at original commitment and native narrative evidence. Preserve historical neutral and pre-registered starting viewpoints. Never invent a receipt or opportunistically select an unrelated public message.

**Test:** Start empty → acknowledge original neutral public opening → check in a character and establish legitimate party-visible presence → verify the original camera is still recognized → second eligible owner produces one additive opportunity; different current slot or changed source cannot forge initial acknowledgement.

### P08-F04 corrective C: recover stale and interrupted **unsent** cohorts — **HIGH**

**Confirmed source problem:** Cohort job identity is session-keyed; stale/review/held states are terminal with no revision-specific authorized refresh. A valid player joining or changing character control during a model await may strand the only cohort opportunity.

**Implement:**
1. Create an explicit, auditable revision-bound **unsent refresh/replan** transition. Prove no native turn/outbox publication is committed before abandoning an old plan. Retain old records as immutable attempt history and distinguish a new attempt from a resend. If there is any uncertain, delivering, failed-with-unknown-send or delivered publication, hold for human reconciliation instead of automatically re-planning.
2. Add database-transactional ownership/claim handling to protect against simultaneous check-ins and separate bot workers. The current `WeakMap` single-flight only deduplicates inside one process. Use existing DB invariants and unique keys rather than adding unproven distributed infrastructure.
3. Revalidate current eligible owners, source revisions, session, scene and Director operational state before planning, **after every await**, before native commit, and before eligible send. Never alter attendance, PC position or party membership.
4. Preserve one acknowledged additive shared opportunity per session unless an explicit future workflow authorizes another. Ensure queued/committed work resumes only via existing safe outbox semantics.

**Fresh tests:** Add `p08-f04-correction.test.mjs` exercising a disposable SQLite + mocked planner/writer/outbox/Discord path (changed modules only): duplicate simultaneous check-ins; stale roster/control during planner await; interrupted-before-commit refresh; interrupted after committed turn; uncertain send and restart; exactly one acknowledged public cohort opportunity; no early or duplicate public delivery; changed current viewpoint; manual/resume exclusions.

**Exit:** A fresh eligible cohort is not stranded by an **unsent** stale attempt, and an uncertain/acknowledged attempt cannot be resent or rewritten.

### P08-F04 corrective D: honor Director pause — **MEDIUM–HIGH**

**Confirmed source problem:** The original `session-opening-runner.js` checks `db.isDirectorPaused()`; `opening-cohort-runner.js` does not.

**Implement:** Apply the established Director pause contract to cohort planning, writer invocation, post-await commitment and publication/recovery as appropriate for the existing platform semantics. Pausing must never erase a committed turn, disguise uncertain delivery or trigger a retry when resumed. Provide an explicit truthful held status.

**Test:** Pause before check-in; pause while planner/writer is awaiting; resume without duplicate generation or a false delivery claim; existing pending outbox uncertainty remains safe.

## Priority 3 — World context and truthful narrative coverage

### P08-F05 corrective: demonstrate the living-world opening contract — **MEDIUM**

**Source-derived gap:** F05's ledger declares existing scoped signals/speaker cognition/acknowledged memory sufficient, but no opening-specific bounded synthesis or test proves the complete F05 goal (NPC objectives + faction pressures + competing incentives + epistemically filtered cues). Existing `openingWorldOpportunities()` returns up to three existing beats; NPC `speakerBrief()` is useful but not a substitute for the entire world-opening agenda.

**Implement:** Supply a read-only GM-internal agenda drawn from existing authenticated NPC/faction goals and world events, plus **audience-filtered observable signals** to public/owner writer packets. Never copy GM truth or an NPC's false private belief to a public fact. Continue using `selectDisclosedNarrativeMemory` / `rankNarrativeMemory`, actor-relative speaker knowledge and native invention/canon promotion; no additional paid provider step or clock mutation. If the source machinery already fully supports this in the actual changed path, demonstrate with direct changed-code tests and record explicit reconciliation instead of unnecessary refactoring.

**Fresh tests:** If production is changed, `p08-f05-correction.test.mjs` must demonstrate a currently motivated NPC, an active faction pressure, one public clue, one owner-only clue, a sincere NPC false belief, acknowledged vs unacknowledged memory, empty-world graceful invention, and zero context-read changes to clocks/effects/canon.

**Exit:** Opening authoring has grounded causal pressures and correct epistemic boundaries, not only a generic atmospheric prompt.

### P08-F06 corrective: separate delivered prose from dramatic fulfillment — **MEDIUM**

**Confirmed source problem:** `assemblyCoverageEvidence()` explicitly returns `dramatic_coverage:'unverified'`; `session-opening-runner.js` nevertheless uses accepted narrative delivery for opening `completed`. This can be valid for **transport** but must not be represented as proof of the planned dramatic objective or personal hook.

**Implement:** Make status semantics explicit and independently derived: `transport_acknowledged`, `native_narrative_accepted`, `dramatic_coverage` (possibly `unverified`), `hook_selected`, `hook_revealed` (only with independent disclosure proof), `fallback_delivered`, `needs_review`. Preserve versioned historical evidence and accepted prior messages. Do not add keyword-based coverage, self-evaluation by the model, hard scene quotas, or fixed narrative templates. A service can finish delivery while the dramatic goal remains unqualified; display that truthfully. Where an actual source-based positive coverage certificate can be justified, document its strict semantics; otherwise retain `unverified`.

**Fresh tests:** `p08-f06-correction.test.mjs`: accepted but off-topic atmosphere, relevant authored prose without claim of verified semantic goal, writer timeout/exception, late owner fallback, no hook source, stale owner, uncertain/restarted transport, and no false hook or dramatic-coverage success. Exercise changed orchestration/receipt flow, not just helper booleans.

**Exit:** GM status never equates accepted prose or fallback with a meaningfully completed personal/shared dramatic objective; authoring failure remains narratively useful and technically honest.

## Priority 4 — Full corrective qualification (P08-F07)

### Acceptance suite to author, freeze and execute

Create a **new** `bot/tests/ai-gm-2026-10/p08-f07-correction.test.mjs` and any strictly necessary brand-new focused tests for changed cross-boundary modules. Use real changed production functions with disposable SQLite and mocked external boundaries. Do not rely solely on predicates or fake a passing outbox.

Minimum acceptance matrix:

| ID | Fresh deterministic scenario | Required result |
|---|---|---|
| A1 | GM-private sheet + `export_meta.visibility` + direct secret `convergence_goal` | No GM-only canary in public/owner writer packets, accepted output or fallback |
| A2 | Start with zero present, deliver native camera, later owner A then owner B | Original camera persists; one additive public cohort; owner-private entries remain separated |
| A3 | GM runs `/vc-session assemble` after initial job completed | Eligible cohort path executes; existing initial job not resent |
| A4 | Legitimate public character presence changes camera viewpoint | Original acknowledged camera still discoverable by immutable proof |
| A5 | Initial camera with one owner; pre-registered cohort; manual; established-party resume | No incorrect additive new job; saved independent positions/knowledge remain intact |
| A6 | Two overlapping check-ins or two bot worker instances | Database claim/unique key prevents duplicate plan/pub; in-process `WeakMap` is not the sole guard |
| A7 | Planner awaits; roster/owner/proxy/source revision changes | Stale attempt held; safe *unsent* refresh works; no old private unit escapes |
| A8 | Crash/restart before turn commit, after turn commit, after uncertain send | Exact acknowledged send retained; unknown send held; no blind new publication |
| A9 | Director pauses before and during cohort work | No unauthorized planner/writer/commit/send after pause; no loss of committed receipts |
| A10 | NPC with sourced goal + faction move + secret knowledge + false belief | Writer context uses only audience-observable cues, actor-relative knowledge and acknowledged memories |
| A11 | Writer unavailable, quarantined prose, stale principal | Truthful fallback/review; no false verified dramatic goal or hook |
| A12 | 0 / 1 / 2 / 5 eligible owners; source/planner/writer/native/commit/publish stages | Record actual counts/durations where observed, no guessed latency/cost or unapproved downgrade |

**Corrective test boundary:** use only freshly written corrective tests for currently modified source. Existing P08 test results are historical evidence, not a substitute for new cross-boundary qualification and not a license to import/run old tests. Follow `TEST_PROTOCOL.md` and `TEST_EXECUTION_NO_POLL.md` literally.

**One final frozen union example (adjust only to actual created test paths):**

```sh
cd bot
node --test tests/ai-gm-2026-10/p08-f02-correction.test.mjs \
  tests/ai-gm-2026-10/p08-f03-correction.test.mjs \
  tests/ai-gm-2026-10/p08-f04-correction.test.mjs \
  tests/ai-gm-2026-10/p08-f05-correction.test.mjs \
  tests/ai-gm-2026-10/p08-f06-correction.test.mjs \
  tests/ai-gm-2026-10/p08-f07-correction.test.mjs
```

Omit files that were not created. Run changed `node --check` separately in one bounded batch. Capture exact source/test SHA256 hashes, test count, exit, skipped, provider calls/tokens/cost, and any withheld staging scenarios in P08's phase and relevant feature ledgers. Document any safe defect that remains a **local hold**, not a fabricated pass.

## Done / not done distinction

**Complete the corrective implementation** only when HIGH issues A1–A9 are closed by actual affected-code proof; F05/F06 are appropriately implemented or explicitly qualified as noncritical holds with accurate status; older receipts and readers are preserved; no known open confidentiality/agency/irreversible-replay defect remains. Corrective source/test status may be `TARGETED CORRECTIVE DELTA PASS` once evidence exists.

**Do not claim:** full semantic narrative quality, live Discord stability, provider throughput, cache savings, production readiness, release approval or correctness of untouched code without their own observed evidence. Staging checklist in `features/P08-F07/STAGING_ACCEPTANCE_NOT_EXECUTED.md` remains not executed unless separately authorized.

**Final Codex report:** branch and actual SHA; per-correction disposition (fixed/tested, contained hold, unresolved); changed files; exact fresh commands/results/hashes; confidential canary outcomes; cohort lifecycle/restart/idempotency outcomes; no-poll compliance; measured usage only; owner questions; critical blockers; rollback; staging/release authorization (`NOT AUTHORIZED` unless changed explicitly).
