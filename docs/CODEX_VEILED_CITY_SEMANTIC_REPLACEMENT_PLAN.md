# Veiled City — Semantic Language Robustness Implementation Plan

**Code baseline:** `4df506df7770862c25e39a0287c673653670a926` (`fix(narrative): reuse established identities and preserve independent publication`); branch HEAD verified at `87b2817b0ed017c3e1472ff406a4a3c99aa4543f` (docs/manifest-only follow-up), `codex/delegation-narrative-quality`. Reverify HEAD before editing.
**Proposed work branch:** `codex/semantic-language-robustness`.
**Scope:** Semantic interpretation of natural player language and narrative engagement. No redesign of native action authorization, character ownership, world-state mechanics, consent, or disclosure.
**Status:** Updated for October 15 live Discord transcript at 12:09–12:11 PM; not yet implemented. The hotfix is committed and pushed; its installation/live activation must be verified separately, not inferred.

## Objective

Remove or de-authoritize active phrase/regex shortcuts where ordinary paraphrases produce different *routing, capture, response, or narrative publication* outcomes. **Interpretation is a fallible proposal; native systems alone authorize and commit effects.** Preserve literal comparisons needed to prove that the *actual player* wrote a particular span, expressed exact terms, or selected an exact pending native request. Avoid adding model calls: leverage the existing router and combined GM structured-response calls.

The preceding Session 7 narrative-publication bug was addressed by `4df506d`; do **not** undo the hotfix's established-identity reuse, visibility isolation, NPC evidence, independent unit salvage, optional-health transaction isolation, outbox idempotency, or completeness reporting.

## P0 live-play addendum — 12:09–12:11 PM transcript (must fix before later semantic work)

The user observed three turns: (1) `Describe the scene to me` published strong Twenty-Four Spin laundromat prose **plus** `This location is nearby, but those visible details are not established in enough detail to report reliably.`; (2) `I head inside the Twenty-Four Spin` produced only `Tyrell Williams has arrived at twenty-four-spin.`; (3) `What is the inside like?` returned only the old `nearby` evidence-insufficient reply (preceded by `1.`). The transcript does not establish which exact creative draft/unit was held on turns (2) or (3); do not invent a hold reason.

**Confirmed source cause A — competing renderers, not necessarily a writer failure.** `bot/src/pvp-output.js:prepareAuthorizedTurnOutput()` constructs `queries=observationQueries(...)`, publishes approved creative `gm_narrative_unit` outputs, and **unconditionally appends** `observation_answer` rows for `queries`. Its `post_projection_answers` fallback guard excludes the legacy `scene_description` part when creative fiction exists but does **not** guard observation queries. `bot/src/character-observation.js:observationQueries()` maps typed `observe` targets (including location) to a read-side query, and `bot/src/world-observation.js:renderWorldObservation()` answers exclusively from narrowly sourced `world_visible_fact` records, not already accepted creative scene units. Thus one request can receive a legitimate new fictional scene **and** a contradictory "nothing is established" reply. The ordinary observational negative-result renderer is not globally wrong; it is inappropriate as a *duplicate* answer to an already fulfilled creative description task.

**Confirmed source cause B — contextual interior phrasing misses the fast-path.** `bot/src/scene-observation-route.js` exact phrase list omits `What is the inside like?`. Combined GM classification is allowed, but an `observe` target of the current location currently produces the evidence-insufficient old query output unless creative work is both accepted and reconciled. Normal pronouns/deictics (`inside`, `here`, `this room`, `around us`) must resolve from authenticated current scene + zone before narration; they confer no access or movement.

**Arrival explanation is not yet fully proven.** `bot/src/gm.js` already coordinates a creative narrative request whenever a typed automatic move/scene action is present and attempts a staged post-move viewpoint via `previewAuthoritativeMutation()`. The native `verified_action` renderer independently announces arrival. The fact that only the arrival sentence was delivered means no destination scene made it into that output; it does **not** tell us whether the writer was skipped, the staged view failed, a unit was held, or a prepared publication excluded it. Instrument and replay this path before changing adjudication. `bot/src/autonomous-world.js` persists an explicit `zone` (`interior`/`exterior`/`scene`), and same-place zone changes must not be confused with remote travel or invented arrival. In `bot/src/narrative-completeness.js`, `destination_fiction_missing` detection exists but is not itself a guaranteed repair; flag state might still suppress persisted metrics.

### New S1 P0 acceptance contract

1. **Answer arbitration after native projection:** map each candidate `observation_answer` to its authenticated source-span/target/operation and the same-turn creative unit subject/location/task. If a verified, audience-valid creative description satisfies that precise request, omit only the duplicative evidence-insufficient location observation answer. Preserve distinct NPC/PC visual observations, resolved facts, truthfully negative remote checks, investigation results and any separate multi-clause inquiry. Never use generated prose to certify native mechanics or disclosure. Avoid naive suppression of *all* observation parts whenever *any* creative unit exists.
2. **Destination fiction on verified movement:** preserve the independent native arrival receipt and queue one contextual interior/destination description **when the verified viewpoint and creative result permit**. For a valid entrance to a familiar `location_key`, distinguish `(location, zone='interior')` from exterior/saved coarse location; describe the existing place without recreating it. If creative output cannot be published, retain mechanical arrival but mark missing destination fiction as a *diagnosable degraded turn*, not a successful descriptive answer. Never conjure new PC movement, unlock access, or duplicate arrival receipts.
3. **Read-only follow-up to current interior:** `What is the inside like?`, `What's it like in here?`, `Describe the room`, `What am I looking at?` and `Describe the scene to me` need the same task class when actually read-only; use native current location/zone and entitled prior fiction. An unplaced camera must not imply PC witnessing, and privately known details cannot be promoted to party narrative.
4. **Proof of delivered text:** assert the *exact queued outbox payload* with creative prose, and absence of `nearby, but ... not established` when a valid creative answer already covers the same question. For arrival test, assert both native arrival receipt and a separate accepted destination narrative unit OR an explicit correctly classified missing-creative diagnostic if a modeled writer intentionally fails. For successful writer fixture, the interior description is mandatory. Verify once on fake transport after staged movement and once after idempotent restart/replay.

### Diagnosis only if the arrival test is still red

Inspect exact `scene_authoring_attempt`, `narrative_draft`, `narrative_unit_fates`, `narrative_unit_review`, publication outbox and `narrative_completion` source-bound to the 12:10 turn. Compare staged `binding.location`, `binding.viewpoint`, `binding.placement`, `zone` and source hash to final committed equivalents. Do not mass replay historical live turns, change the production DB or assume a particular rejection category from the Discord transcript alone.

## Verified production-code inventory at baseline

| Area | File and key behavior | Priority | Change boundary |
|---|---|---:|---|
| Scene/situation routing | `bot/src/scene-observation-route.js` uses `includes(value)` literal phrase arrays. `gm.js` calls it in `shouldRespond()` and `runTurn()` to choose single-writer read-only optimization. | P0 | Semantic request kind, native read-only eligibility |
| Narrative delegation engagement | `bot/src/narrative-delegation.js` derives most tasks from typed `player_intents` but falls back to `responseObligation()`/literal observation lookup. | P1 | Derive from authoritative-in-scope *semantic proposals*, never keyword coverage |
| Optional authored candidates | `bot/src/authored-candidates.js` calls whole-message and candidate-clause `interpretAuthoredText()` and scans preceding text for words like *might/would/could*. One hypothetical clause can reject a separate immediate action. Stored candidates are non-authorizing, but can stage compatibility records. | P1 | Per-clause framing and verifiable source offsets; preserve hypothetical/quoted exclusions |
| Character utterance capture | `bot/src/typed-intents.js:persistTypedDialogue()` passes semantic target IDs, but `bot/src/dialogue-continuity.js:captureDialogue()` resolves targets with exact NPC name/key, and the old regex `interpretAuthoredText()` fallback remains. | P1 | Typed target/referent identity + actual hearing/presence/ownership proof |
| Response heuristics | `bot/src/player-language.js:responseObligation()` recognizes only certain verbs, quoted formats, question marks, pronouns and reflective words. `gm.js` also has a separate `semanticResponseObligation` based on accepted intent spans. | P1 | Single source-bound engagement contract shared by planning and writer, with no phrase whitelist as final gate |
| Director pacing | `bot/src/story-continuity.js:pacingAdvice()` suggests silence via opening text regex. `bot/src/simulation.js:quietOpportunity()` consumes it. | P2 | Existing classified communication context; default to no suppression on uncertainty |
| Prose validation | `bot/src/narrative-integrity.js` uses a literal `contextualEntryAcknowledgement()` exception and lexical tripwires for uncertainty, predetermined choices and material claims. `bot/src/narrative-authority.js` has separate PC-name/material text guards. | P2 / guarded | Structured claim roles and native source proof; retain conservative tripwires wherever typed proof cannot replace them safely |

**Do not expend time rewriting obsolete freeform intake handlers.** `bot/src/index.js:routeNativeSpans()` now calls `routeGameplayIntake()`, preserving the whole message. `continuity-routing.js`, `roll-language.js`, `consent-language.js` and legacy `scene-entry.js` phrase adapters are not normal player-message interceptors. Exact native consent terms/revisions, roll request IDs, source spans, audience/ownership keys, session/scene IDs, source hashes, and mechanical receipts must remain exact.

## Architecture: one semantic interpretation, multiple guarded consumers

1. **Observe the whole authenticated authored input.** Keep the immutable original input, offsets, message ID, actor, session, scene, scope and principal revision. Do not split/rewrite the owner's message as authoritative source.
2. **Interpret once in an existing model call.** Prefer extending the existing router's `{respond,reason}` result with a bounded, non-authorizing classification such as `engagement_kind` (`scene_description`, `current_situation`, `conversation`, `action`, `rules`, `no_response`, `uncertain`) and `observation_only`. Where the router is intentionally skipped (direct mentions/private turns), use the existing combined GM `player_intents` and narrative task proposals—no extra classifier call.
3. **Pass the decision explicitly.** Transport an immutable, request-local interpretation envelope through the turn pipeline (avoid mutable guild-global state, stale cross-message caches or a second provider call). The intent proposal is *not* action permission, arrival, NPC knowledge, player speech, or a model-generated consent receipt.
4. **Native proof stays separate.** Read-only fast writer is eligible only after authenticated current source, viewpoint, scope, location/camera and protected-scene checks. Typed immediate actions go to existing native validators. A mixed inquiry/action goes through the combined GM path, not the observation-only shortcut.
5. **Response obligation is contextual.** A valid scene question or authentic in-character cue must receive a substantive GM answer, a truthful scoped hold or an actionable diagnostic—not generic “nothing established” prose. Conversely, OOC/table chatter need not receive a response. A rejected writer is not repaired by unsourced effects or secret knowledge.
6. **No broad semantic safety bypass.** Model-proposed classifications can *request* native evaluation or supply evidence for diagnostics. They cannot override privacy, PC/proxy agency, native effects, exact user authorization or a verified source. Conservative lexical tripwires may remain as secondary alarms; measure false holds rather than disabling them wholesale.

## Phase S0 — Focused baseline + red cases (small commit)

- Verify HEAD includes `4df506d`; inspect `docs/NARRATIVE_PUBLICATION_HOTFIX_10_2.md` and identify current branch/working tree before editing.
- Inventory *actual runtime consumers*, distinguishing live routing from dormant compatibility helpers. Do not assume all code matching a regex is a language router.
- Add one minimal test file, `bot/scripts/semantic-language-robustness-test.mjs`, with ~18–24 table-driven cases (including the three live transcript cases; consolidate overlapping paraphrases; do not create another test module) built on existing fake-provider and disposable SQLite fixtures. Keep one compact fixture table and no new broad harness.
- Red-test the specific paraphrases below; retain precise failure descriptions. No paid API/Discord calls, no live DB writes, no tests that depend on a fixed private guild ID.
- Commit the baseline and red tests. Do not block on making the whole historical suite pass before Phase S1.

## Phase S1 — Scene answers, arrival fiction, and semantic situation routing (P0)

- First reproduce and fix the confirmed creative+legacy **duplicate-answer composition** from the P0 addendum. Reconcile only same-task/same-subject duplicate negative observation rows; retain independent observations and native effects. Then test post-arrival interior fiction with the actual native movement/preview/commit/outbox path.
- Make the existing semantic router able to classify **response kind** in the *same model request* it uses to decide `respond`; avoid a new model round-trip. Keep the router response small, strict, and backward/failure tolerant; routing decisions expire with their specific message/controlled principal.
- Replace literal admission to the optimized scene writer with an explicitly `observation_only` semantic category *plus* existing source/viewpoint/native availability checks. Preserve direct-mode safe shortcut if desired as a purely optional performance optimization; it must not be the only path for paraphrases.
- Cover `Set the scene please`, `Describe the scene to me`, `What's happening around us?`, `What is going on in the scene?`, `Describe Twenty-Four Spin`, `What is the inside like?`, `What's it like in here?`, `Give me a sense of the place`, `What is my current situation?` and reformulations. Correctly distinguish `I examine the locked safe`, `I enter Twenty-Four Spin`, `Could I enter?`, `Imagine I enter`, and quoted examples: only true read-only descriptive questions may use no-effects fast writer.
- When an actual verified arrival is present, ensure any generated and accepted interior scene is published together with (not replaced by) the receipt; distinguish saved coarse location from verified zone. Never treat the `verified_action` text alone as full creative coverage. Capture bounded authoring hold reason on absent scene instead of retrying provider calls.
- Preserve one creative writer request per logical turn, one native source and one exactly-once outbox publication. No extra provider calls on the normal path, no duplicate response from both direct and combined routes. Router errors fall back to existing safe combined turn without claiming read-only authorizations.
- Focused local test group S1; commit.

## Phase S2 — Clause-scoped authored actions (P1)

- Stop `authored-candidates.js` whole-message `planning_or_ooc` classification and scans of earlier unrelated text from vetoing independently valid *immediate* clauses. Replace with a typed per-clause framing proposal from the current combined GM response and verifiable immutable offsets, or re-use the existing accepted `player_intents` instead of duplicating semantic classification.
- Source-span *membership* is not sufficient when repeated text or mixed quotes are present. Bind clause provenance to start/end offsets and the current owner/principal; enforce exact raw-text matching and replay idempotency. Historical closed-schema candidates must remain readable or be migrated additively only if justified.
- Examples: `If I climbed the stairs I'd make noise. Instead, I inspect the envelope.` → only inspect; `He says “I stab the guard.” I ask what happened.` → only actual player-authored inquiry; `I would open it` → no completed attempt; `I inspect the cabinet and tell Inez “Something is missing.”` → independent typed action/speech, neither lost nor doubled.
- Preserve native movement and uncertainty/consent/dice checks. Tests must confirm *no* authorization on hypothetical/quoted/reported branches and no false rejection on valid later clauses.
- Focused S2 cases; commit.

## Phase S3 — Contextual NPC address and persistent conversation (P1)

- Make native dialogue capture consume a verified semantic NPC `target_key` or scoped referent resolution rather than exact display-name spelling. Referents may include `the attendant`, `the woman at the counter`, previously mentioned `Inez`, and tightly grounded pronouns.
- Resolve only among actually present, current, NPC-controlled, sound-accessible local actors with valid owner/audience scope. Distinguish NPC profile from active scene presence. For ambiguous referents, preserve the GM response and avoid attributing player speech to the wrong listener or writing NPC memory; ask only when the ambiguity affects a material action.
- Preserve verbatim owner utterance, current message/source offsets, actual hearing, per-NPC knowledge limits, and no proxy speech/consent inference. Speech to an absent/hidden NPC is never retroactively heard.
- Tests include one visible attendant, two similar attendants, privately visible NPC, human-controlled proxy, remote NPC, quoted speech versus actual PC utterance, player-to-player speech, and saved conversation continuity across restart.
- Focused S3 cases; commit.

## Phase S4 — Unified response obligation and Director pacing (P1/P2)

- Consolidate `player-language.js` legacy `responseObligation` and `gameplay-intake.js:semanticResponseObligation` into a request-scoped derived obligation using accepted typed clauses and read-only engagement classification. Do not use an English vocabulary list as a semantic accept/reject gate.
- Differentiate `needs_world_response`, `does_not_need_world_response`, and `uncertain`; preserve authenticated OOC and mention-only settings, multi-role ambiguity and other-player banter. `Another empty shift. That's the third this week.` should invite meaningful open-ended world engagement when context supports it; `We're just planning next week` should not invent work/arrival/commitments.
- Use the same derived interaction class for `narrative-delegation.js` task selection and the Director's `quietOpportunity`/pacing hint. GM-set pause cues retain priority. Unknown classification should not assert that the scene is silent, nor force an autonomous event.
- Refuse to turn a fallback observation acknowledgment into successful creative coverage. Keep hotfix truthfulness and receipt-independent prose salvage.
- Focused S4 cases; commit.

## Phase S5 — Guarded prose interpretation and false-positive reduction (P2)

- Audit literal `contextualEntryAcknowledgement`, predefined choice prompts, uncertainty markers and `materialParaphrases`, plus narrative PC address safeguards. Replace lexical *sole authorization criteria* with existing source-bound typed classifications and native receipts where possible. Keep a deterministic secondary high-risk assertion scan and all private/canon/agency/native checks.
- Distinguish NPC dialogue mentioning a PC, a sign quoting a choice, a GM offering **open** options, and an unauthorized forced player response. Protect against `you agree`, uncommitted death/damage/movement, secret disclosure, unsupported canon, inventory, rolls and accepted obligations irrespective of creative phrasing.
- Any ambiguously consequential sentence remains held/reviewable, not auto-published by a fallible model classification. Do not add a model-based “safety judge” or model call.
- Focused S5 cases; commit. If replacing a particular lexical guard cannot be done with *equivalent or stronger* provable native protection, document it as deliberate defense-in-depth and leave it intact; do not force a risky refactor.

## S6 — Lean acceptance and handoff

- **During implementation:** run only new S1–S5 focused tests (including the three 12:09–12:11 live transcript regressions), and the one or two directly impacted existing suites when a module is changed. Never run the entire 121-suite default matrix at every phase. Keep per-phase run evidence compact (command, exit status, key case counts, SHA). Avoid repeat tests for doc-only commits.
- **At completion:** run `npm run check` once, the focused semantic test, affected HOT/D08 privacy/agency/typing/publication checks, and **one** `npm run validate` complete mandatory pass on the final executable tree, with offline/network-denied provider doubles. CI once on pushed head. If failing, rerun only the failing suite after fixes, then one final complete gate for the *changed* executable tree.
- No live model calls, no paid tokens, no production database mutation, no synthetic Discord posts. Reuse the Session 7 publication fixtures and existing reusable database fixtures; no redundant sprawling fixtures or new external libraries.
- Preserve all existing mandatory checks and all 39 optional matrices. Do not waive failing D08, ownership, consent, private knowledge, native roll, PvP or exactly-once publication checks. If a test is slow, make the focused suite lean; do not silently remove a security gate.
- Report before/after runtime counts for router/GM/writer requests by category, response-to-first-substantive-payload timing in fake-transport tests, no extra calls on standard paths, all negative safety results, and remaining semantic limitations. Synthetic timing is not proof of live latency.
- Update implementation ledger and release notes with exact scope, source SHA, tests, net-new calls, residual risk, migration/rollback. Commit by phase; push after qualification. Make no assumption that pushed code is installed in production.
- **Production changes only when separately authorized.** Before any authorized installation: verify production tree and existing hotfix status, preserve `.env`, credentials, DB, flags and delegations; take fresh WAL-aware backup and disposable restore; install code without automatically starting Veilkeeper or toggling flags. Rollback is code-only unless a documented migration demonstrably requires otherwise.

## Minimum realistic acceptance corpus (reuse as table-driven cases)

| Input | Required interpretation | Prohibited outcome |
|---|---|---|
| “Set the scene please.” | Read-only descriptive request; substantive authored environment | Blank/ledger-insufficient fallback, auto movement |
| “Describe the scene to me.” + an `observe` target of Twenty-Four Spin | One accepted creative scene response for the location | Appended `This location is nearby ...` legacy contradiction |
| “I head inside the Twenty-Four Spin.” | Native authorized arrival + interior-zone viewpoint + creative destination scene in one turn | Only `Tyrell Williams has arrived ...` despite an accepted valid writer scene; duplicate arrival |
| “What is the inside like?” immediately after arrival | Current interior context; accepted prose and entitled existing detail | Evidence-insufficient nearby response, loss of deictic referent |
| “What's going on at Twenty-Four Spin?” | Current situation; verified viewpoint/camera | NPC secret leak, invented PC arrival |
| “Describe the twenty-four-spin to me.” | Same description task as “describe the scene” | Exact-phrase-only routing |
| “I enter Twenty-Four Spin and look around.” | Movement attempt plus observation; combined native adjudication | Pure read-only fast path, unearned arrival |
| “If I went upstairs I'd be spotted. Instead, I examine the envelope.” | Only second clause immediate | Whole-turn rejection or imaginary upstairs movement |
| “She says ‘I attack.’ I ask the attendant about the noise.” | Reported quotation plus one inquiry | Attack mutation, lost inquiry |
| “I ask the woman behind the counter why she's nervous.” | NPC conversation, scene-grounded referent | Missing listener memory or attributed wrong NPC |
| “I ask her again.” (two possible listeners) | Scoped ambiguous referent | Guessing NPC knowledge |
| “Another empty shift. That's the third this week.” | Possible in-world engagement based on context | Unwanted employment/debt/PC choice |
| “OOC: My headset is broken.” | No RP effect | Narrative request, character action |
| “Could we leave if the door opens?” | Hypothetical question | Actual departure |
| “I roll the pending attack.” | Typed roll + native exact request ownership and adjudication | Dice execution based on phrase alone |
| “You agreed to the debt” (NPC alleges it) | Attributed unverified NPC claim | Binding PC debt |
| “Choose one of today's specials,” says the server. | Ordinary NPC line if valid locally | Forced PC choice or blanket prose quarantine |
| Party actor says a secret only in a private scene | Private speaker/listener and memory scope | Party leak |
| Re-send the same Discord message after a crash | Same accepted/published IDs | Duplicate rolls, costs or Discord prose |

## Done definition

Behavioral: no contradictory dual renderer for the same scene query; authorized successful interior arrivals yield substantive destination prose as well as the verified receipt; contextual interior follow-ups re-use verified scene/zone; all safe paraphrase variants converge on the same **task classification**; mixed authored messages keep independent clauses; character dialogue reaches only verified listeners; engaged scene requests publish substantive authorized fiction; lexical convenience rules do not veto validated semantic interpretation. Security: no unauthorized native effect, no secret promotion, no unconsented PC/proxy acts, no exact-proof degradation, no duplicate commit/delivery. Performance: standard flow adds **zero new provider round-trips**, with no second writer or semantic-judge request. Evidence: focused red→green regression artifacts, final mandatory validation once, CI, commit ledger, and explicit deployment status.
