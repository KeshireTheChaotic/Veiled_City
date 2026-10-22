# Veiled City — P07 Second Corrective Handoff
## Codex Luna Medium | P07-F13 through P07-F18 | Source-to-Director completion

**Target repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Read-only verified remote HEAD at handoff (2026-10-22):** `78dc7f159592f4904a5faafc91fb457c661873e5`  
**Execution profile:** Codex Luna Medium, medium reasoning; one coordinating agent, **zero subagents by default**; small sequential changed-code deltas.  
**Authorization:** Implementation and offline, fresh changed-contract tests only. **NO push, merge, release, deploy, service restart, CI trigger, production DB access, or paid provider calls** without separate explicit approval. Local commits only if consistent with repository owner instructions; preserve user edits.

## Mission

**Close the remaining P07 gaps rather than restarting or reimplementing P07.** The earlier follow-up repaired (F07) duplicate registry mappings, (F08) opportunity-comparator consistency, and (F09) mandatory/causal noninterference. Preserve those corrections. F10's *non-conversation optional intersection* and F11's *native candidate → Director → writer projection* remain genuine holds; F12 tested only a narrower synthetic contract. A remaining secondary gap is that the coverage loader can still silently parse future duplicate JSON keys unless its source text is validated in the loading path.

Deliver a source-backed demonstration that a character-driven, independently justified optional opportunity can influence the **existing** World Director and **existing** audience-bound narrative writer when it should, without displacing required responses, mechanical consequences, native observations or protected personal stories. Extend beyond same-NPC speech only if genuinely authoritative optional evidence exists; never misclassify resolved causal outcomes as optional to manufacture a passing scenario.

### Source-verified current behavior

At the handoff SHA:

- `bot/src/narrative-opportunity-policy.js`: `rankWorldNarrativeOpportunities()` sorts mandatory response → causal consequence → autonomous world → personal opportunity → ambient → unknown; overlap is used only as a tie-break within the same **optional** class and urgency, and two qualified overlaps retain input order.
- `bot/src/world-narrative-bridge.js`: `rankEligibleWorldSignals()` can prove party overlap only for verified current party-visible conversations by distinct PCs with the same NPC. `worldNarrativeBridgePacket()` authorizes, validates, deduplicates and selects at most four signals. `revalidateWorldNarrativeSignal()` rebuilds the current packet and compares source hashes.
- `bot/src/narrative-director-source.js`: `bindDirectorNarrativeSource()` snapshots the current bridge; `directorBriefForAudience()` reads `worldDirectorBridgeBeats()`.
- `worldDirectorBridgeBeats()`: selects up to four **beats**, validating narrative units and native consequences/observations/encounter candidates before bridge pacing hints. Hence a selected optional signal can have no place in the writer-facing `director_brief.world_bridge.beats` even though the World Director's planning prompt received the signal packet.
- `bot/src/narrative-authority-context.js` passes `directorBriefForAudience()` into the current scoped writer packet as `director_brief`. `bot/src/gm.js` contains existing soft character-driven guidance in the World Director request. Keep both roles distinct: planning access does **not** prove final writer inclusion.
- `bot/tests/ai-gm-2026-10/coverage.json` currently has **81 unique root mappings**, including the corrected P07 map unions. `bot/scripts/ai-gm-delta.mjs` still calls `JSON.parse()` directly on the coverage text; that loading path has no duplicate-key rejection.
- P07 ledger explicitly calls **F10 and F11 LOCAL HOLD**, **F12 PARTIAL**, with offline tests *reported* passed but no production SQLite/Discord or live semantic validation. Do not reinterpret local holds as complete.

**Key references:**
- `docs/Implementation_Plans/phases/P07/SCOPE.md`, `LEDGER.md`
- `docs/Implementation_Plans/features/P07-F10/{SCOPE,LEDGER}.md`
- `docs/Implementation_Plans/features/P07-F11/{SCOPE,LEDGER}.md`
- `docs/Implementation_Plans/features/P07-F12/{SCOPE,LEDGER}.md`
- `docs/Implementation_Plans/phases/P07/Veiled_City_P07_Correction_Handoff_Luna_Medium.md`

## Authority and operating contract

**Before implementation**, check actual `git branch --show-current`, `git rev-parse HEAD`, `git status --short`, remote/tracking status *read-only*, and current file content. The SHA above is a verified reference, **not** permission to reset the checkout. Preserve all preexisting P08/P09/native feature work and untracked plans. Reconcile any newer HEAD before editing.

Read in full:

1. `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md`
2. `content/ENGINE/AI_GM_CONSTITUTION.md`
3. `docs/Implementation_Plans/{README.md,CODEX_START_HERE.md,TEST_PROTOCOL.md,TEST_EXECUTION_NO_POLL.md,DECISION_GATES.md}`
4. P07 phase scope and ledger, previous corrective F07–F12 scopes/ledgers, and **only** the active new feature's relevant sources.

**Non-negotiable behavior:** PC actions, thoughts, feelings, speech, resource spending, consent, movement and cooperation belong to players. Native Daggerheart mechanics and receipts own mechanical effects; narrative selection metadata has **no truth, effect, canon, knowledge, salience, publication or NPC epistemic authority**. Audience entitlement is checked before selection and again at consumption. GM-private facts may inform authorized GM planning but must never become party/PC knowledge merely because they were scored. Do not force party membership, co-location, shared hooks or scene convergence. NPC/faction motives, ordinary invention, personal arcs, quiet scenes and a justified World Director `act=false` remain available. Preserve spotlight-based Daggerheart action cadence.

**Resource limits:** Reuse the existing Director/writer calls; no new model judge, background actor scans, fixed creative templates, mechanical changes, migrations or increased mandatory output length. Preserve current four-signal cap and four-beat cap unless an unavoidable contract change receives an owner decision. Do not add creative/autonomy restrictions without an exact owner question; isolate that specific restriction rather than stopping unrelated safe work.

**Testing rules:** New feature-local Node tests under `bot/tests/ai-gm-2026-10/` only. New tests may use Node standard libraries, production modules **being modified**, and new disposable mocks/SQLite fixtures. Do not run/import/copy/modify old `bot/scripts/*-test.mjs`, golden suites, broad `npm run validate`, legacy workflow or paid providers. For every frozen feature, launch one blocking test batch with adequate timeout, capture one terminal result, **NEVER POLL or watch session/logs**. Re-run only a specific repaired failing subset after edits. Record actual commands, code/test hashes, exit codes and limitations. A source/read-only static review or passing pure unit test is not an end-to-end certification.

**Documentation:** Use feature IDs `P07-F13` through `P07-F18` and individual `SCOPE.md` / `LEDGER.md` pairs at `docs/Implementation_Plans/features/P07-FNN/`. Update the P07 phase append-only closeout, without modifying F01–F12 historical facts. Only mark a phase `COMPLETE` when its full exit gates pass. If a safe native evidence source cannot be proven, record a precise **LOCAL HOLD** and continue independent features.

---

## P07-F13 — Build the native end-to-end offline fixture FIRST

**Goal:** Replace synthetic signal-array assertions with an inspectable, source-entitled reproduction of the actual current Director bridge path. **Do not change production prioritization yet.**

**Inspect:** `bot/src/world-narrative-bridge.js`, `narrative-director-source.js`, `narrative-authority-context.js`, `scene-fiction-context.js`, `narrative-authority.js`, `audience-native-v9.js`, current disposable DB factory and tests already used by the *current initiative*. Read only; no inherited test execution.

1. Build **new** `bot/tests/ai-gm-2026-10/p07-f13.test.mjs` and a small fresh fixture helper if essential (example `p07-native-fixture.mjs`). Use ephemeral disposable SQLite if the currently supported native DB constructor permits it; otherwise narrowly stub the real reader/writer contract at its official seams and explicitly identify the reduced coverage. Never fabricate receipt hashes to stand in for native proof when testing native validation itself.
2. Construct current session, two authenticated/checked-in PC owners, actual scene/presence where warranted, party and character-private sources, a real eligible conversation (accepted speech typed intent, authored speech, NPC presence and witnessed memory), and a separately entitled required task and native consequences. Use current persisted writers/reader contracts if available.
3. Assert the path: `worldNarrativeBridgePacket()` → `bindDirectorNarrativeSource()` → `directorBriefForAudience()` / `worldDirectorBridgeBeats()` → audience-bound writer context `director_brief`. Test **both**: free optional capacity and full beat capacity.
4. Record exact difference between (a) a selected signal in the Director planning packet, (b) a validated `pacing_hint` in writer-visible beats and (c) delivered playable narration. Do **not** claim (c) solely from (a) or (b).
5. Capture expected current limitations as failing assertions (or an explicitly isolated, non-executed reproduction) before making behavioral corrections. Avoid committing a permanently red suite.

**Exit:** A fresh deterministic, source-proven, bound-context fixture demonstrates actual current behavior and where signal inclusion is lost or preserved. If a test seam is unavailable, document the *exact* missing constructor/reader and pursue a minimal testability change in F14 without expanding authority.

## P07-F14 — Preserve justified opportunity preferences in the Director-to-writer path

**Goal:** Fix F11 only where verified by F13, respecting mandatory/causal/observation priority and current capacity limits.

**Inspect/modify only if necessary:** `world-narrative-bridge.js` `worldDirectorBridgeBeats()`, `narrative-director-source.js`, `narrative-authority-context.js`; review relevant source/canon/publication validators before touching their contracts.

1. Enumerate **required/committed** beats (validated native effects, resolved consequences, necessary response/recovery) versus **comparable optional** beats (nonbinding lead or offer, optional pacing hint, optional encounter proposal when actually optional by native rules). Classification must be justified by current validated native evidence, not by text sentiment.
2. Preserve all mandatory/committed precedence. Under limited **optional** capacity, apply current P07 deterministic tie-break (only if classes and urgency are equivalent), so selected optional signal can survive into the writer-visible context when capacity is genuinely available. The existing at-most-four cap remains authoritative. Do not displace established scene observations without proof they are optional and comparable.
3. If existing `dramatic_brief.world_bridge` already exposes the necessary entitled source to the writer without a beat, validate that and avoid unnecessary duplicate beats. Never bypass audience revalidation or pass raw GM-only metadata to a party reader.
4. Confirm stale/revoked sources, changed scene, owner control revision, different private audience, missing NPC presence or native receipt change cannot inherit an earlier saved preference. No new truth is persisted by the selector; output remains once-only and source-entitled.
5. Test: 0, 1, 3 and 4 mandatory/committed beat slots; 2–6 optional opportunities; a valid personal solo lead outranks an unsupported group link; verified optional overlap breaks only an eligible tie; omitted counts truthful. Cases with all four slots required may legitimately omit optionals and do **not** constitute an error.

**Exit:** A selected *entitled and still eligible* optional opportunity is usable in the actual existing writer-facing context whenever there is legitimately available optional capacity, with no missing/repeated committed consequences. If design does not safely permit this without a new authority or schema, document a narrower local hold **and the precise evidence needed**; do not claim F11 complete.

## P07-F15 — Introduce a source-qualified non-conversation OPTIONAL intersection (only if provable)

**Goal:** Resolve F10 *without* promoting causally resolved actions into optional ranking candidates.

**Potential evidence to inspect, not assumed supported:** currently accepted-established `lead` narrative units; native opportunity/encounter proposals; a current, party-entitled civic/world incident with two independently source-backed character hooks or direct interactions; verified faction-interest links. Inspect `world-encounter-beats.js`, `narrative-authority.js`, `world-narrative-bridge.js`, `world-private-seeds.js`, `world-simulation-receipts.js`, `scene-intent-board.js`, and authorized context readers. Do not read all of these if a narrower proven entrypoint exists.

1. Write an **evidence matrix** for each candidate source: record kind/status; source hash/revision; actual issuer; audience entitlement; current scene/session; **independent link to each distinct PC**; optional vs causal classification; NPC epistemic effect; authorized reader; revocation path; writer visibility. A common location, surname, roster, GM-only hook, shared NPC, inference from semantically similar text, or *same causal root for committed outcomes* is insufficient proof of an optional cross-character connection.
2. Prefer a read-only adapter from already validated **optional** native opportunities. The adapter may produce ephemeral selection metadata, not new fictional facts. Preserve existing signal envelope, source identity, hashes, revalidation and four-item caps; no DB migration or new model call. Only expose bounded identifiers supported by current proof, never private hook content.
3. If an authenticated, audience-safe non-conversation optional source exists, add the smallest caller integration and fresh tests showing one independently verified cross-PC incident/faction/investigation intersection is preferred over an equally urgent isolated **optional** candidate. Keep solo consequences and mandatory results ahead.
4. If no such source exists, **DO NOT FAKE COMPLETION**. Record the precise missing native producer/contract and a minimal next source-adapter proposal as a local hold, along with the source evidence that would make it safe. Do not invent a new lore-fact authority or weaken player privacy to pass a test.
5. Use Carl/Choso/Raven/Elias **hypothetical fixture names only** to exercise source causation, not to add canon, secret facts or PC consent. Examples: contract → infrastructure incident, forensic evidence → public disappearance, waterfront investigation → independently established salvage activity, NPC reacting to observable shadow tell. Disconnected or private-only variants must preserve independent story paths and not award a party bonus.

**Exit:** At least one genuinely source-backed *non-speech optional* overlap reaches the same selection and Director path **or** is held accurately with proof that current native contracts cannot support it. F15's status must match the evidence; do not describe a held feature as implemented.

## P07-F16 — Fail-closed coverage registry loading

**Goal:** Extend F07 from a one-time JSON cleanup to a durable safety gate.

**Inspect/modify:** `bot/scripts/ai-gm-delta.mjs`, `bot/src/ai-gm-test-selection.js` only if needed, `bot/tests/ai-gm-2026-10/coverage.json`. Prefer a tiny dedicated local loader/validator rather than a broad parsing library.

1. Reject duplicate **root-level** mapping keys *before* `JSON.parse()` silently overrides them. Recognize legally valid JSON whitespace, escapes and alternative formatting, not only two-space line prefixes. A small state-machine scan of top-level keys is acceptable; no external dependencies or generic JSON framework required.
2. Use the duplicate-safe loader in the actual fresh changed-code runner path (including any other actual consumers found by targeted search). Keep existing coverage content and successful selector semantics unchanged.
3. Add a brand-new `p07-f16.test.mjs` with two real whitespace/escaped-key duplicate examples, valid unique mappings, malformed JSON fail-closed, and preservation of `gm.js` + `world-narrative-bridge.js` union after a normal parse. No test should depend only on formatting regex.
4. Do not make duplicate detection itself launch legacy tests, CI, or network activity.

**Exit:** Production runner test-selection input cannot silently lose mappings from duplicate keys, and exact existing mappings survive.

## P07-F17 — Fresh multiplayer, persistence and publication acceptance

**Goal:** Demonstrate the user-visible behavioral contract using fresh disposable native fixtures, not just pure sort tests.

**Fresh test:** `bot/tests/ai-gm-2026-10/p07-f17.test.mjs`, with the feature-local helper created in F13. Test changed production boundaries and current consumers they directly affect; mock Discord/provider; no real service.

Required positive and negative evidence:

- **Response & causal priority:** >4 candidates; opening/recovery + unresolved direct question remain before optional link; current packet `eligible`/`omitted` correct; five required items preserve truthful backlog without claiming all resolved.
- **Real party scope:** distinct owners, verified scene presence/NPC interaction where required, cross-character optional tie only with source proof, no roster-only or co-location-only bonus; scene-split participants not falsely reunited.
- **Private knowledge:** GM-only and character-private hooks do not enter a party packet/writer; a privately known connection may influence only the entitled GM planning scope, not a party-visible result. Wrong owner, wrong character, hidden NPC and private source must fail gracefully.
- **Native continuity:** revoke an origin, change a receipt hash, switch current scene/control revision or restart a disposable database; previously selected signal is rejected or revalidated, not replayed as accepted fiction.
- **No duplicate publication:** if publication is directly touched, test the existing outbox receipt/once-only contract; if not touched, exercise a mock writer acceptance boundary and state explicitly that real Discord/exactly-once was **not** proven. Do not turn ordinary narrative proposals into committed outcomes.
- **Creative behavior:** zero extra AI calls in P07 code; writer may use personal-only thread, an organic shared opportunity, NPC independent reaction, or no world move; never force PC dialogue, choices, emotions, membership or consent. Do **not** mistake policy text substring checks for model-semantic proof.
- **Four example fixtures:** Carl's contract, Choso's case, Raven's waterfront signal, and Elias's shadow tell are hypothetical tests of causation/privacy—not newly committed Veiled City facts. Record which specific scenario is truly supported by currently verified native inputs versus only illustrative.

**Exit:** Fresh offline source-to-writer tests pass; each unsupported segment has a named limitation and no false pass. If privacy or native truth fails in an affected path, stop that unsafe work and fix it before proceeding.

## P07-F18 — Corrective closeout and release handoff

**Goal:** Precise, auditable disposition. No quiet conversion of holds into passes.

1. Freeze source and fresh tests. Run **one explicit changed-contract union batch** of new P07-F13–F17 tests and only directly related fresh P07 tests (F02/F03/F06/F07/F08/F09/F10/F12, as applicable to modified modules). Do not run legacy suites; no watch or polling; capture one final result.
2. Update `coverage.json` with **deduplicated union** of all relevant fresh tests. Confirm F16 loader rejects duplicate keys. Record changed module/source/test SHA-256, tested working-tree fingerprint and final HEAD, exact command, exit, pass/fail/skipped and known non-exercised paths.
3. Append to `docs/Implementation_Plans/phases/P07/{SCOPE,LEDGER}.md`, add feature ledgers, update `docs/Implementation_Plans/README.md` if useful. Preserve F01–F12 history and P08/P09 source. Record rejected implementation approaches and why they were unsafe.
4. Produce a clear **A4/A5/A6/coverage** matrix: fixed + tested / implemented but unverified / local hold / blocked. Do not describe F10/F11 as resolved if F15/F14 didn't prove them, even when unit tests pass.
5. Confirm zero new model calls, unchanged Daggerheart authority, scope-safe routing, once-only output behavior insofar as actually tested, no production migration and rollback by isolated commits. If real runtime/Discord semantic testing is not authorized, say **NOT LIVE VERIFIED** and **NOT RELEASE QUALIFIED**.
6. **No push, merge, deployment or CI trigger.** Return local commit SHAs and explicit approval-required next actions. If a remote ref changes unexpectedly, report the observed SHA/ref status but do not infer cause or remediate remotely.

**Exit:** Source-cited evidence of the actual full pipeline and no hidden high-severity bug in changed contracts; open holds are explicit and contain actionable missing-proof contracts. A full release claim requires separately authorized test/deployment evidence.

---

## Acceptance matrix (must be in final Codex answer)

| Case | Required observed result |
| --- | --- |
| Two equal validated optional links | Tie-break favors source-backed party relevance, source-order stable on equal proof. |
| Mandatory opening + unresolved question + 5 optional candidates | Both required response obligations selected or truthful capacity backlog; no party bonus displacement. |
| Urgent isolated PC consequence vs multi-PC optional | Urgent causal consequence first. |
| Four native committed/required writer beats | Optional writer hint legitimately omitted; no false delivery claim. |
| Two required beats + comparable optional beats | Verified preferred optional appears in *writer-visible* context where capacity truly exists. |
| Different NPCs/same location/shared roster | No invented causal group link. |
| Two distinct PCs linked to public optional non-speech event | Preference occurs **only** if source-proven; else explicit local hold. |
| Private/GM-only proof + public reader | No disclosure, no forced group participation. |
| Stale source revision / scene change / revoked ownership | Saved preference not accepted by current reader. |
| Duplicate root JSON key with different whitespace or escapes | Runner rejects before parsing/selecting. |
| Restart / repeated request | No double effects or publications within actually tested contracts. |
| No justified World Director move | Existing `act=false` path remains possible. |

## Suggested final response format

1. **Branch + HEAD/worktree state** (and whether anything was pushed, merged, or deployed).
2. **Feature table F13–F18:** fixed, tested, partial/held, exact changed modules and local commit SHA.
3. **Native integration trace:** where the signal was generated, source-verified, bound, projected, presented to writer and eventually accepted (or exactly where it remains blocked).
4. **Fresh tests:** exact command, suite names, passed/failed/skipped, input fingerprints and any unverified runtime paths.
5. **Holds:** missing authoritative non-conversation optional evidence, model semantics, live Discord, production DB, etc.; distinguish permission holds from genuinely impossible source contracts.
6. **Rollback and release authorization:** no fabricated certification; explicit approvals required.

### Compact instruction

**Correct the pipeline, not the plot.** Veilkeeper should notice opportunities created by genuine personal choices and autonomous world causes; it must never manufacture shared history, knowledge, consent, location, or success for the sake of a party scene.
