# Veiled City — P07 Third Corrective Completion Handoff
## Codex Luna Medium · P07-F19 through P07-F25 · 22 October 2026

**Repository:** https://github.com/KeshireTheChaotic/Veiled_City  
**Working branch:** `codex/clean-ai-gm-2026-10`  
**Independently verified remote HEAD at handoff:** `c03fd5dbdaa8d0570e59f83d71060285cb7eec07`  
**Most recent P07 source/test implementation:** `9bf6f71fac5a4f0c7f1f02270d0b3c00735eef3f` (HEAD includes a later P07 evidence-ledger update).  
**Execution mode:** Codex **Luna Medium** / medium reasoning; **one coordinator, zero subagents by default**.  
**Purpose:** Complete the remaining P07 integration and acceptance obligations, not start another audit-only cycle or rewrite the AI GM.

> **Intake instruction:** Check actual `git branch --show-current`, `git rev-parse HEAD`, `git status --short`, and current source/feature ledgers. Treat the SHA above as a reference, NEVER as a reset target. Preserve unrelated tracked/untracked work, especially concurrent P06/P08/P09 changes. If HEAD has advanced, reconcile changes before editing and record the new baseline.

## 1. Executive decision

P07-F07..F09 fixed duplicate mappings, comparator consistency and mandatory-response separation. P07-F13 proved that two owner-authenticated, same-NPC conversation opportunities pass through the real native SQLite source, World Director request, stored source revalidation and audience-bound writer **context** when there is free beat capacity. P07-F16 made the real test-runner coverage parser reject duplicate root keys. F17 tested speech scope and current-source revocation.

**Still NOT demonstrated:** (1) correct optional selection under meaningful competition and 0/1/3/4 occupied downstream beat slots; (2) a non-conversation optional narrative opportunity supported by independently validated cross-PC sources; (3) stale saved-Director rejection across database close/reopen, control/scene changes; (4) real narrative writer output accepted through native authority and mocked publication/outbox behavior; (5) honest omitted/held accounting for overflow.

**New audit defect requiring explicit repair:** `bot/src/world-narrative-bridge.js` `worldDirectorBridgeBeats()` stops its established narrative-unit loop when `beats.length >= 4` without recording remaining omitted/held candidate proofs. Later loops count omissions. Prove and repair the precise intended count (eligible omitted vs unvalidated candidates) without inventing validated work or increasing provider/DB costs.

**Mission:** deliver a character-driven world where individual PC arcs remain worthwhile and independently authenticated optional cross-character opportunities can compete fairly. The AI can *suggest* a common scene opportunity but may never force cooperation, co-location, shared knowledge or PC decisions. Native mechanics, actual causality and required responses ALWAYS outrank optional hooks.

### Hard invariants

- Player control of PC movement, speech, choices, feelings, thoughts, consent, resource expenditures and dice is absolute. A GM offer is not PC participation or success.
- No new truth, canonical fact, NPC knowledge, effect, mechanical outcome, Fear expenditure, attendance, scene presence, audience entitlement or publication authority from rank metadata or a model assertion.
- Preserve Daggerheart 2.0 spotlight, native mechanics, pending adjudication, current privacy and source-binding, stable IDs/hashes, at-most-four **bridge signals**, and at-most-four **writer-facing bridge beats**. Existing Director cadence remains; no fixed turns or mandatory common plot.
- Native consequences/observations are not optional just because another PC shares an event or location; their established order is protected. Backlog remains unresolved when bounded out.
- Existing GM secrets/character hooks are **not** automatically owner knowledge; owner-private evidence cannot promote public visibility. A common location/name/roster check-in/shared-NPC presence alone is not independent evidence of shared causation.
- NPCs/factions act independently, including justified no-op. Prefer genuinely interesting personalized fiction without word-count caps, templated dialogue, forced twists or model-as-judge loops.
- **No extra paid model request, provider dependency, native DB schema migration, or background scan** without a documented necessity and separate approval. Prefer narrow existing readers and source-bound read-only metadata. Existing model call count must remain unchanged for comparable flows.

## 2. Mandatory preflight and source map

Read, in this order, **current exact files**:

1. `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` in full and `content/ENGINE/AI_GM_CONSTITUTION.md`.
2. `docs/Implementation_Plans/README.md`, `CODEX_START_HERE.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md`, `DECISION_GATES.md`.
3. `docs/Implementation_Plans/phases/P07/SCOPE.md` and `LEDGER.md`; feature ledgers `P07-F14`, `P07-F15`, `P07-F17`, `P07-F18` (and F07–F13/F16 when changes affect them).
4. `bot/src/world-narrative-bridge.js`: `rankEligibleWorldSignals`, `worldNarrativeBridgePacket`, `revalidateWorldNarrativeSignal`, `worldDirectorBridgeBeats`.
5. `bot/src/narrative-opportunity-policy.js`, `narrative-director-source.js`, `narrative-authority-context.js`, `narrative-delegation.js`, `narrative-writer-v9.js`, `narrative-authority.js`, `audience-native-v9.js`.
6. For real delivery only: `bot/src/publication-outbox.js`, `publishing.js`, `narrative-tasks.js` and their real current call sites.
7. For potential non-speech native evidence: `world-simulation-receipts.js`, `world-encounter-beats.js`, `scene-intent-board.js`, `scene-continuity.js`, `city-calendar.js`, `world-authorship.js`, `db.js`.
8. Existing **new** test fixture `bot/tests/ai-gm-2026-10/p07-native-fixture.mjs` plus F13/F14/F17. Extend it rather than recreating fake world-event receipts. Read source before guessing API signatures.

Create `docs/Implementation_Plans/features/P07-F19/` through `P07-F25/`, each containing `SCOPE.md` and `LEDGER.md`. Append a *clearly separated* third corrective section to phase scope/ledger; never erase historical P07-F01..F18 work. Update `coverage.json` for every changed production module with unique deduplicated root keys; keep earlier test mappings intact.

## 3. Phase plan (implement sequentially; isolate only true blockers)

### P07-F19 — Baseline contract and measurable competition fixture
**Goal:** Remove guesswork about which pieces are authoritative and build realistic fixtures before changing priority.

1. Record exact HEAD, worktree, changed modules, runtime environment and P07 F14/F15/F17 pending obligations. Map one real optional candidate from `worldNarrativeBridgePacket()` through Director source binding, `worldDirectorBridgeBeats()`, `packet.director_brief.world_bridge`, native writer grant and publication request. Document which steps **select**, **hint**, **author**, **commit**, **publish**; do not conflate them.
2. Extend the existing disposable SQLite fixture (do not add production fixtures or use real Discord) with independently owned PCs, optional same-NPC speech, independently sourced single-PC speech, required narrative task where possible, current native scene observations, and actual native consequence/proposal sources. Respect the current source writer/receipt validation; if a category cannot be produced safely, name the exact missing producer/API and hold **that fixture category only**.
3. Add an explicit matrix for established-beat capacities 0, 1, 3, 4; each should include eligible selected optional and a comparable isolated optional candidate. Also test 5–8 source bridge candidates before the four-signal cap, where an overdue mandatory response remains included.
4. Record stable source hashes, revisions, actor, session, scene, scope, producer, class and whether each source is *committed*, *required* or *optional*—derived only from actual native types. Do not infer from the model's prose.
5. Define test method to count `held` vs `omitted` correctly: `held` for source-invalid/revoked/ineligible; `omitted` for source-eligible candidates excluded for capacity, with explicitly documented exceptions if native scan constraints prevent exact eligible count.

**Exit:** A repeatable, current-code fixture or exact local holds for **specific** missing native source classes. No change in production ranking yet. Feature-local fresh test `p07-f19.test.mjs` only where modified production contract justifies it; fixture self-verification can live in F20 tests.

### P07-F20 — Protect beats, fix overflow accounting, prove the cap
**Goal:** Resolve the concrete omission-reporting bug and protect required consequences while maximizing lawful optional capacity.

1. Using F19 fixtures, exercise `worldDirectorBridgeBeats()` with 0, 1, 3 and 4 already authorized nonoptional beats, plus at least two optional candidates of comparable urgency where possible. Preserve committed narrative units, native Fear-clock effects and verified simulation observations ahead of optional pacing hints. Never move an unverified proposal ahead of committed outcomes.
2. Repair the established-narrative-unit `if (beats.length >= 4) break` omission accounting; avoid counting held/invalid proofs as eligible omissions. The `dramatic_brief.events` list is bounded (currently eight), so validate bounded remaining proofs if required for accurate counts; do not create unbounded scans. Ensure results are stable on repeated reads.
3. Under four committed beats, optional pacing hints may be omitted with **correct** omitted counts and **no** claim that work was delivered or resolved. Under free capacity, source-validated hints survive in the stable ranking order. A required response may not be displaced by an optional bridge hint. Distinguish the four-signal selector limit from the four-beat projection limit.
4. If the downstream ordering already satisfies these properties, leave it intact and test it. Modify only the minimal source path necessary; do not rewrite a general director scheduler, alter native outcome order, widen caps, or add model calls.
5. Cover source invalidation and replay, repeated result IDs, private source exclusions, and exact `held`/`omitted` counts. Add tests for incomplete underlying proof records and stale revisions.

**Exit:** Fresh `p07-f20.test.mjs` demonstrates exact capacity and overflow semantics with native-source fixtures; no mandatory or committed work is reclassified as optional. Document any capacity fixture that remains impossible due to a missing approved producer.

### P07-F21 — Implement the native optional-opportunity provenance contract
**Goal:** Remove F15's indefinite source hold by delivering a **real authorized producer** when an existing native route allows it. Do not manufacture cross-character causation.

1. Inspect *producer paths*, not just readers. Find one already established, party-visible **public incident or world consequence** with **two distinct authenticated player source events independently and explicitly linked to its exact incident ID**. A PC exploring the same place or merely hearing about the same NPC does NOT suffice. The common-root linkage must already exist in native source ancestry or be established by an authorized native process; never take a similarity claim from model text as proof.
2. Design the smallest narrow **optional-opportunity provenance record** (or read-only deterministic projection) with: version, stable ID, native producer, `optional` disposition, exact session/scene, audience, original incident/source root, two distinct PC owners/character IDs, per-PC current source refs plus hashes/revisions, origin/event proof, creation/revocation lifecycle, and execution/publication authority explicitly false. Expose to writers only entitled references/IDs, never GM-private backing text.
3. Prefer a derived ephemeral/read-only packet from already committed source records; use the existing generic city-record mechanism only if the validated producer requires persistence and the current authority contract permits it. A newly introduced producer must have an explicit call site, input authority, deduplication, bounded scope, and current-reader revocation check. Do **not** introduce a schema migration or an API that lets the model declare two PCs 'interested'.
4. The producer offers an *optional GM opportunity to react* to a verified incident; it does **not** establish a new fictional event, publish evidence, force a group scene, resolve a task, or mark a PC interested. Privately known incidents must remain owner-private/GM-private and cannot boost a public candidate.
5. Implement a source-validatable non-speech case (for example **only if actual native proof exists**: separate PC investigations explicitly anchored by independently validated source refs to one already published infrastructure incident). Test one valid pair, same owner repeated, different incidents, public/private mix, coincidental location, absent controller, split scene, stale revision, revoked origin, replay and duplicate/forged ID. Keep character-only opportunities intact.
6. **Explicit gating:** If exhaustive targeted inspection proves no current authorized producer can create the necessary independent public incident linkage, do not fake a passing test. Deliver a precise *upstream contract implementation proposal* naming the best producer, its required source writers and owner/privacy gates. Mark F21 `LOCAL HOLD — MISSING AUTHORIZED LINKAGE PRODUCER`, with necessary follow-up work and a minimal fixture. Do not claim F21 complete. Continue F22 only on existing valid speech proof; do not block F23–F25.

**Exit:** At least one actually executable non-conversation optional source + negative cases, OR an evidence-based typed local hold identifying the exact absent writer. **A documentation-only restatement of the prior F15 hold without investigating/attempting the producer is not acceptable.**

### P07-F22 — Integrate optional-opportunity candidates end-to-end
**Goal:** Make F21's verified optional producer (if supported) compete correctly without inventing any fact or starving primary responses.

1. Add the narrowest adapter into `worldNarrativeBridgePacket()` **after source authentication/entitlement and before deduplication/ranking and four-signal cap**, or document why a separate currently authorized channel is required. Do not reuse `resolved_player_intent` as optional. Preserve schema identity or version source envelopes explicitly and provide backward-safe saved readers.
2. Classify only explicitly native-authenticated, still-current optional opportunities (`personal_opportunity` or `autonomous_world` as justified by source). Same-class/same-urgency overlap remains a stable deterministic tie-break. Different validated overlap sets are equal and retain source order; mandatory/causal never gain overlap bonus.
3. Verify single-character optional candidate remains valid and can win when urgent/stronger; cross-PC proof wins only a comparable optional tie. Backlog/omissions are honest; no preference for roster count, same place or shared anonymous rumor.
4. Re-bind native Director source and enforce current-read source revocation (including restart). Writer-facing scope contains bounded audience-entitled references only. No raw secret connections or mechanical entitlements are upgraded.
5. If F21 held, run tests against supported same-NPC source and keep this feature `PARTIAL — NON-SPEECH PRODUCER BLOCKED`; do not manufacture new production path.

**Exit:** Fresh `p07-f22.test.mjs` exercises competition and source validation in the actual disposable native pipeline. No extra paid provider request or production migration.

### P07-F23 — Persistence, control revision, scene and private-audience replay
**Goal:** Close known F17 holes using real native readers, not solely in-memory rebuilding.

1. In fresh disposable SQLite, persist a real Director source for a selected signal; save its exact source/ID/hash, **close and reopen the DB** and reinitialize the native service/readers. Assert current same-scope source remains valid without resurrecting expired authority. Audit timing and test fixture session recovery semantics.
2. Retract the underlying authored origin **after** binding (or revise its source hash), then assert the saved Director source is revalidated as held/invalid and cannot reappear in the writer packet. Do not merely build a fresh Director source after revocation.
3. Test owner-control revision changes, attendance/current scene change, independent PC departure/split location, private source in party packet, another owner's private request, outdated scope binding and mismatched session. Reject stale or cross-audience opportunities without declaring PC movement.
4. Test required-response overflow (5–8 eligible bridge candidates) and correct `eligible`/`omitted` under active task + optional pressure. Test no-op Director choice does not synthesize a world result.
5. Explicitly distinguish soft selection hints from authoritative saved writer grants, which must be regenerated/revalidated by the existing native grant mechanism.

**Exit:** Fresh `p07-f23.test.mjs` proves persisted replay and source revocation, split-party scope and backlog handling. Document any unsupported fixture with exact current API/proof gap rather than assuming success.

### P07-F24 — Real writer acceptance and mocked exactly-once publication
**Goal:** Finally exercise the behavioral last mile without using live OpenAI or Discord.

1. Follow the **real existing** `GMService.runWorldDirector()` → `authorNarrativeRequests()`/`compileWriterV9()` → native narrative-unit validation/commit path. Inject a **deterministic provider stub** returning a valid, nonbinding, audience-entitled scene or NPC response. Use current schema and actual unit references/typing; do not directly insert fabricated accepted narrative receipts.
2. Prove that writer context receives the justified optional hint, the generated response leaves PC decisions open, and accepted output is native-authorized. A hint is not a mandate: if the Director legitimately returns `act:false`, preserve the no-op and test that separately. Reject unsupported factual claims, private disclosures, invented PC dialogue, or mechanical outcomes.
3. Exercise `queueDirectorPublications`/`queueTurnPublications` and `deliverTurnOutbox` or the existing `deliverQueuedTurn` seam with a **mock Discord transport**, stable cycle/turn keys, deterministic acknowledgements and disposable DB. Assert one committed publication is delivered at most once on a successful retry/read; no rerun of model or mechanics.
4. Simulate known `not_sent` vs uncertain transport completion, recovery/reconciliation, crash/reopen between commit and acknowledgement, duplicate delivery requests and private-vs-party recipients. **Do not automatically replay uncertain sends**; preserve operator reconciliation policy.
5. Reject model-authored fake grants/receipt IDs; author only valid native-backed output. Do not bypass or weaken outbox safety and privacy merely to make the fixture pass. Reuse the real source functions and mock only external API/transport boundary.
6. Measure requests for equivalent mocked workflows (baseline vs candidate): no extra provider request, bounded context size and no added unbounded queries. Offline timings are not live Discord latency.

**Exit:** Fresh `p07-f24.test.mjs` proves at least one accepted writer response reaches the mocked publication path and obeys exactly-once/uncertain-send behavior, while a no-op remains a valid alternative. Any truly missing native call seam is a precise typed hold, not a fabricated integration pass.

### P07-F25 — Final changed-contract regression, evidence and signoff
**Goal:** A reliable owner-reviewable completion record, not another broad 'done' claim.

1. Freeze source/test set, update `coverage.json` with one unique mapping per modified module (existing duplicate-safe parser must accept it), run `node --check` on changed JS/MJS, `git diff --check`, and **one blocking fresh test union** covering new F19–F24 contracts. Include previous fresh P07 tests only where they cover actively modified production modules; do not invoke historic tests.
2. Ledger every test batch honestly: run ID, exact command, exit, pass/fail/skip, SHA/working-tree fingerprint for inputs, logs/evidence path, model-call counts (0 live), costs and caveats. Failed first runs remain recorded; passing later runs do not erase them.
3. Provide owner-facing matrix of: source→optional candidate→rank→Director request→bound reader→writer acceptance→publication; optional contention at 0/1/3/4 capacity; non-speech source; private/public access; revoked/reopened/control/scene replay; underflow/overflow and omitted/held; and independent NPC/no-op behavior.
4. Append P07 phase ledger status without rewriting F01–F18 evidence. Use `COMPLETE — OFFLINE CHANGED-CONTRACT ACCEPTANCE` **only if all target offline contracts pass and no F21/F22/F23/F24 hold remains**. Even then label **NOT LIVE VERIFIED / NOT RELEASE QUALIFIED** until separate authorized live qualification. If holds persist label `PARTIAL` with exact missing producer or test seam. No generic 'no critical blockers' as a substitute for coverage.
5. Report exact commits, changed files, rollback command sequence preserving concurrent P06/P08/P09 work, remaining owner decisions, and evidence boundaries. Do not push, merge, deploy or trigger CI unless separately authorized.

**Exit:** A truthful final status supported by current-source tests and an actionable residual dependency list. F25 documentation completion is not automatically P07 feature completion.

## 4. Required offline acceptance scenarios

| ID | Scenario | Expected behavior |
| --- | --- | --- |
| T01 | One urgent solo response plus two comparable party optional hints, >4 candidates | Mandatory/causal wins; no party bonus displaces it; truthful backlog |
| T02 | Two independent character-only opportunities with different urgencies | Stronger source/urgency wins; overlap not fabricated |
| T03 | Verified same-NPC overlap competes with single-PC optional speech | Overlap wins only when class and urgency match; stable order otherwise |
| T04 | Independent non-speech sources linked by exact native incident | Optional preference only if F21 producer validates both sources; never from same location/name |
| T05 | Source-bound prior beats at capacities 0, 1, 3, 4 | Eligible opportunities included only with lawful capacity; no established native consequence displaced |
| T06 | Five+ established narrative unit proofs | `omitted`/`held` reflect actual validated capacity semantics; no quiet undercount |
| T07 | Old saved Director binding after source retract + DB restart | Reject stale signal; no revival, disclosure or duplicate send |
| T08 | PC becomes absent, changes control, or leaves original scene | No inferred participation or widened audience |
| T09 | Private hook/speech, other PC present | Party and other-private packets cannot observe private-origin text/links |
| T10 | Valid writer result from deterministic stub | Native authority accepts safe scene/NPC response; no fabricated PC decision/outcome |
| T11 | Mock transport delivered / known not-sent / uncertain | At-most-once, valid retry only when proven unsent, uncertain requires reconciliation |
| T12 | Director chooses no-op | No invented beat/effect/publication; no artificial filler required |
| T13 | Deterministic repeated fresh read with no state change | Stable signal IDs, ranking, source hashes and omission counts |
| T14 | Invalid/forged incident ID or GM-only source | No native optional bonus or publication entitlement |

**Narrative quality limitation:** Deterministic fixtures establish wiring/safety, not model creativity. Live multi-user narrative evaluation is a *separate* authorized acceptance activity. Do not claim human-like storytelling proven by unit tests.

## 5. Test execution and cost discipline

- All new tests: `bot/tests/ai-gm-2026-10/p07-f19.test.mjs` ... `p07-f24.test.mjs` for production changes; new fixture helpers may be `p07-*fixture.mjs` without a test launcher. Add F25 test only if F25 changes production code.
- **Only fresh tests for production contracts modified in this initiative.** Never run/import/repurpose any old `bot/scripts/*-test.mjs`, old fixtures/golden outputs, `npm run validate`, `npm test`, inherited workflow or broad CI. The approved current `bot/scripts/ai-gm-delta.mjs` is a fresh selector/runner, not permission to run old suites.
- Freeze each feature, launch its focused batch **once** with a blocking process and sufficient native timeout; **NEVER WATCH, POLL, TAIL or repeatedly query status**. If detached, write one terminal exit-status artifact and collect once at a natural checkpoint while working on separate tasks. Failed runs may have one subsequent batched repair run. Record all actual outcomes.
- Mock model and Discord. No network, paid providers, production DB, real session restarts, push/merge/deploy or CI without separate express permission. Use temporary DB and clean it after test completion; ensure no test can point to production via environment variables.
- Keep the P07 model budget neutral: **no additional live model call** on the compared path; do not add expensive per-NPC scans. Record measured local runtime separately from claims about live latency.
- Source commits per supported feature; do not commit an unsupported fabricated claim. One coordinator, zero subagents by default.

## 6. Owner decision gates and prioritization

If a proposed change would restrict GM creativity, autonomous NPC/faction behavior, normal emergent invention, free dialogue, narrative length, or force group convergence, ask the owner an exact decision question **before** that restriction, and continue unrelated safe features. Existing privacy/consent/mechanics safeguards require no new owner approval.

Do not keep recycling unresolved F15/F21 as a generic 'prove optional source' local hold. Either implement an authorized, independently sourced minimal producer within current constraints or deliver a precise missing producer/linkage contract with evidence and a proposed phased patch. It is acceptable to end with `PARTIAL` if producing the required independent evidence is impossible without a genuine upstream change; it is not acceptable to mark P07 complete on the strength of same-NPC speech and writer-context tests alone.

**Priority under time/token pressure:** F19 native fixture → F20 omission/cap repair → F23 persisted replay → F24 writer/outbox acceptance → F21/F22 safe non-speech optional source → F25 evidence. The feature ledgers retain their F19–F25 names even if independent work is scheduled in this order. Never substitute documentation for a testable safe fix where the current code can support it.

## 7. Final handback format

Return a concise report including:

- Exact branch, intake SHA, final local HEAD and tracked/untracked diff status.
- F19–F25 feature disposition (`COMPLETE`, `PARTIAL`, `LOCAL HOLD`, `BLOCKED`) with reason and exact evidence.
- Table of production code changes, fresh test commands/exit/counts/fingerprints, coverage union and omission counts.
- Evidence for T01–T14 and any not executed; full source-to-authoring-to-outbox trace if successful.
- Measured new provider calls and unverified production latency, privacy, rollout and live narrative semantics.
- Rollback strategy preserving P06/P08/P09; no push, merge, deploy, CI or production DB operation claimed.
- Explicit **P07 status** (do not equate F25 closeout with release authorization).
