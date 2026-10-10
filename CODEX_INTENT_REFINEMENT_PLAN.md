# CODEX IMPLEMENTATION PLAN — Veiled City v10 Typed-Intent Refinement (v2: Authority-Precise)

**Purpose:** Continue the transition from phrasing-driven language handlers to a single, source-backed, type/intent-driven engine for roleplay, narration, worldbuilding, memory and Daggerheart rules arbitration. **Precise authority statement:** Authenticated player declarations are authoritative over their *voluntary intended actions*; accepted validated typed intents are the **canonical representation presented to adjudication**, not a substitute for those declarations; native rules and committed receipts are authoritative over outcomes. Model interpretation and proposed prose are never independently authoritative.

**Revision:** v2, 2026-10-09. Supersedes the earlier version of this plan. The implementation baseline remains the modified `Veiled_City_10.0.0_Typed_Intents_FULL_SOURCE.zip`; this document is not a claim that any described feature is already operational. See the authority matrix and phase gates below.

**Working source reviewed:** `Veiled_City_10.0.0_Typed_Intents_FULL_SOURCE.zip`, extracted as `Veiled_City-main/`, built from the user-supplied 10.0.0 repository snapshot. Historical upstream reference: `KeshireTheChaotic/Veiled_City` commit `5b04fbee0aafce59c0bead15806245de513a9ea9` (2026-10-09). **The modified ZIP is the working baseline; do not silently replace it with an unmodified GitHub checkout.** Verify the actual local checkout and changes before starting.

**Audience:** OpenAI Codex CLI running locally on Windows in `D:\Library\Veiled City` (or another explicitly chosen repository root).

**Type:** Execution plan, implementation tickets, regression matrix and Codex kickoff instructions. **This document does not change the bot or claim runtime tests passed.**

---

## 0. Non-negotiable product contract

1. **Veilkeeper is the GM.** It may invent and establish ordinary surroundings, accessible locations, minor NPCs, speech, interactions and harmless details without a human GM. Human escalation is for a *specific* incompatible canonical source, a human-owned decision, missing explicit consent, or an unsupported high-impact rule—not for missing data, unknown names or imperfect wording.
2. **Player-authored meaning, not verb lists.** “I bolt toward the Spin,” “I make for the laundromat,” and “Tyrell crosses to its entrance” are interpreted semantically. No predefined verb, pronoun, sentence form or first-person prefix is a requirement for normal roleplay.
3. **Three different authorities must not be conflated.** The authenticated player declaration is the source of voluntary PC intent; the model's interpretation is an untrusted semantic proposal; **only a grounded, scope-validated typed intent is canonical input to native adjudication**. Acceptance does not grant success, consent, spending, item custody, disclosure, NPC knowledge or dice outcomes. The native rules and transaction receipts determine those results.
4. **Every actionable, immediately attempted intent gets an accountable disposition.** `resolved_no_roll` with a verified state/result receipt when consequential, `committed`, `roll_pending` with a real native request, `blocked` with a real rule/state reason, or `clarification_required` for material ambiguity; additionally classify genuinely nonbinding dialogue, hypothetical, OOC and reported actions as `non_action`/`acknowledged` without fabricating mechanics. Repeating “you declared an attempt” is not an outcome. Independent subactions still proceed when a dependency is blocked.
5. **Conserve continuity without hoarding atmosphere.** The model may invent mundane fiction, but **the native memory policy decides retention**. Persist stable identities for a location/NPC/prop if the player identifies it by name or intent, interacts with it, it carries consequences/evidence/possession, or the GM designates it as a causally important recurring anchor. A detail named only by the GM is not *automatically* durable; it becomes durable when interactable/revisit-relevant or explicitly designated important. Other atmosphere can expire with the scene. Durable world identity is **not** canon-ledger authority or automatic PC knowledge.
6. **Daggerheart mechanics stay native.** No LLM-generated Hope/Fear faces, costs, hit points, hit checks or free resource changes. Explicitly authorized spending and actual native dice/roll requests remain deterministic/auditable. A roll request must declare the rule basis, difficulty/modifiers/stakes before any roll, according to active campaign rules and saved rulings.
7. **Never seize PC agency.** No fabricated PC dialogue or emotions, no choosing PC promises, romance, attendance, PvP, expenditures or hidden disclosures. A human-operated NPC proxy retains its native control privileges.
8. **Privacy is structural.** Public/party, player, character and GM-private contexts cannot be merged into the wrong audience. Do not promote private narration into party-scoped memory or allow one player's role to inherit another's secrets.
9. **Idempotency / transaction truth.** A single authored action commits at most once. Preview may simulate tentative outcomes in an isolated rollback transaction, but **must not consume randomness, spend, publish or permanently save**. Final commit must recheck revisions/consent and use stable intent IDs. Publication failure after commitment uses outbox replay, not a second adjudication or re-rolled dice.
10. **Safe development operations.** Work on a branch and a development SQLite database. Never edit a production `.env`, live `bot/data/*.sqlite`, `-wal`/`-shm`, or run the Discord bot without explicit operator instruction. Avoid Python as an installation prerequisite. Do not disable validation to make tests green.

### Architectural destination

```text
Authenticated Discord message / owner-selected PC / source ID
      |
      v
Immutable authored-message envelope + exact source offsets
    (human-authoritative voluntary declaration; role and audience)
      |
      v
OpenAI contextual interpretation => *proposed* typed intents, ordered
subactions, referenced entities, conditions, proposed memory salience
      |  [no permissions, state changes or objective truth from this step]
      v
Native intent validation / grounding / authorized-principal checks
    => *accepted* typed intents = canonical adjudication inputs
      |  [not proof the model got meaning right; conservative overreach checks]
      v
Native rule arbitration with dependency-aware sequencing
    => no-roll | pending native roll | actual obstacle | clarification
      |  [preflight is side-effect-free; rule/state/consent checks apply]
      v
Transaction: commit state and verified receipts exactly once
    => durable entity / scoped memory promotion when warranted
      |
      v
Reconcile or render GM narration **from receipts and accessible scene state**
    => validate disclosure, movement, access, fact and claim boundaries
      |
      v
Durable outbox -> audience-scoped narration; retry delivery only
      |
      v
Scene-only context / scoped durable memories / evidence / audit history
```

**Do not replace the legacy modules in one destructive rewrite.** Introduce typed adapters, prove equivalence and coverage, cut consumers over in stages, then deprecate obsolete parsing exports when callers and tests have migrated. Preserve old on-disk records with explicit readers/migrations.

### 0.1 Authority and trust matrix — binding interpretation of this plan

| Layer / evidence | What it authorizes | What it **never** authorizes by itself | Implementation owner |
|---|---|---|---|
| **Authenticated human declaration** (including an authorized proxy acting within its role) | Voluntary PC/proxy actions, explicit conditions, spoken words, and separately verified affirmative consent | Automatic success, infinite reach/resources, rules exceptions, unintended interior entry | Discord/principal/source ledger |
| **OpenAI semantic proposal** | A candidate explanation of meaning, targets, framing, action order and memory relevance | Any mutation, consent, claim of objective truth, fabricated player speech or outcome | GM structured-output producer |
| **Validated typed intent** | The **canonical, structured input that native adjudication must process**, replacing phrase/verb allowlists | Mechanical resolution, spending, actual arrival, NPC knowledge, canon or irreversible agreement | Intent validator, source/actor/referent grounding |
| **Native arbitration** | Applicable rule basis, accessibility, required roll, verified obstacle or need for clarification | Spending or outcomes not represented by native receipts; reinterpretation that contradicts player-authored scope | Rule adapters + prospective transaction |
| **Committed native receipt** | The authoritative fact that a *specific action outcome* happened in game state | Other unrelated facts, NPC omniscience, secrets outside authorized audience | DB transaction + idempotency ledger |
| **Memory record** | Scoped continuity: what was introduced, seen, said, inferred, promised, or retained | Objective canon solely because a description was saved; ownership without custody | Memory policy + epistemic/audience service |
| **Narration** | Player-facing depiction of verified resolution and permissible descriptive fiction | A new mechanical effect merely because the GM described it | Narration reconciliation + outbox |
| **Canon ledger / saved GM rulings** | Established high-authority setting/rule constraints within applicable scope | Retroactive consent or alteration without allowed human process | Existing canon/ruling services |

**Language rule:** Use **“canonical adjudication input”**, not **“authoritative player intent”**, for accepted typed intents. The player owns intent; a validated intent remains a potentially fallible *representation* of it. A machine can verify source offsets, authorship, actors, scope, target identity and constrained consistency, **but it cannot guarantee a model's freeform semantic reading is correct**. For conflicting or materially uncertain readings, preserve a narrower interpretation or ask one targeted question. Never accept a more consequential interpretation just because its JSON is valid.

### 0.2 Semantic intent lifecycle (required state machine)

`captured → proposed → grounded → accepted_for_adjudication → adjudicated → committed / native_roll_pending / blocked / clarification_required / nonbinding`

- **Captured:** immutable authenticated message; content and offsets are the source of truth. No model may extend the declaration or substitute another actor.
- **Proposed:** one or more OpenAI hypotheses may describe the action; each is *untrusted data*, not an action request executable by itself.
- **Grounded:** verify every proposed action's exact source slice, principal, audience, actor control, framing, ordering, known/same-turn entities and permitted scope. This is not a return to verb lists; it is proof of provenance and permission boundaries.
- **Accepted for adjudication:** the chosen typed representation becomes the *only normal gameplay path* into the rules engine. When two equally plausible readings have different consequential outcomes, mark material ambiguity instead of choosing one silently.
- **Adjudicated:** native rules decide feasible outcome or pending roll, produce a structured decision with rule/evidence references, and recheck prerequisites affected by preceding subactions.
- **Committed:** only the transaction can issue an authoritative outcome receipt. Pending rolls refer to actual saved requests; blocked/clarified outcomes are accounted for without falsely committing movement or inventory.
- **Nonbinding:** descriptions, questions, thoughts, examples, reported actions, conditional proposals whose conditions are not met, and OOC text may receive narrative engagement but cannot trigger PC mutations. An actionable conditional action *may* proceed if the explicit authored condition is verifiably met—do not blanket-ban all `if` clauses.

**Anti-escalation rule:** `approach` ≠ `enter`; `consider` ≠ `offer`; `say` ≠ `agree`; `handle` ≠ `own`; `attempt` ≠ `succeed`; `hear testimony` ≠ `know objectively`; `remember` ≠ `canon`; `model-resolved` ≠ `committed`. Scope, action granularity, and conditional intent must not be broadened in normalization.

### 0.3 Memory is continuity, not another authority lane

Treat each significant detail as one of: **ephemeral scene description**, **temporary scoped context**, **durable scoped memory**, **durable world entity**, or **existing canon/fact/evidence**. The model can propose relevance and ordinary fiction; the native memory policy owns promotion/retention. Persist named/used/action-targeted/causally important anchors, but do not convert every named atmospheric noun into an NPC/location or every narrative claim into canon. A GM-created business that the player is directed to and can revisit should get a stable identity by the time it becomes actionable, even when the player has not yet acted on it. Scene-only details may be discarded, but **never** while a pending action, referent, consequence, promise, evidence chain, possession or open thread depends on them. Preserve scoped access and information ancestry on promotion, reads and summaries.

---

## 1. Audited baseline: what exists and what remains

This section separates **static source findings** from *behaviors that require runtime fixtures*.

| Key | Verified in supplied modified v10 source | Change to investigate / implement | Priority |
|---|---|---|---|
| B01 | `bot/src/typed-intents.js` contains `playerIntentSchema`, `validatePlayerIntents`, `persistPlayerIntents`, `autoCompleteOrdinaryMovements` and `validateIntentResolutions`. | Separate **proposed** and **accepted-for-adjudication** intents and native outcomes. Create actionable-clause coverage tests and per-intent receipts, while recognizing that JSON/source spans cannot prove semantic completeness on arbitrary text. | P0 |
| B02 | `index.js` invokes `routeNativeSpans`; `message-span-ledger.js` uses regex boundaries, while `roll-language.js` and `consent-language.js` still recognize exact phrases before the model turn. | Remove *ordinary* grammar from native pre-routing. Preserve explicit `/commands` and verified irreversible authorization. Make mixed messages source-offset-safe and exactly-once. | P0 |
| B03 | `player-language.js` still exports lexical `worldRequirements`, `interpretAuthoredText`, `responseObligation`; `scene-entry.js` imports lexical `entryTarget`; `autonomous-world.js` still calls legacy fallback checks. | Replace interpretation gates with typed `kind/framing/intent` records. Narrow old functions to legacy compatibility/cheap non-authoritative routing; never veto validated semantic intent because a verb is absent. | P0/P1 |
| B04 | `typed-mechanics.js` supports typed `roll` and `damage` operations on a uniquely owned request **during final commit**, not preview. | Expand to native roll/help/experience/tag/damage-choice/consent decision envelopes. Ensure mechanical authorization comes from validated owner-authored evidence, not model `resolution` alone. Preview and commit must agree on eligibility and fail truthfully. | P0 |
| B05 | `validateIntentResolutions()` checks that automatic movement has `scene_actions.move`, but for `roll_required`/`blocked` mainly requires a `reason`; ordinary interaction checks only for nonempty narration. | Require native-grounded dispositions for immediate actionable intents, distinguish nonbinding speech/description, and refuse model-only `blocked`, `roll_required` or `auto` claims. No pending-roll narration without an actual request. | P0 |
| B06 | `context-memory.js` computes persistence eligibility from **player text + public narration + all private_messages** and `saveContextMemories` scopes new records by the *turn* mode. | **Privacy risk:** a private-message-only detail may influence a party-scoped memory record. Split candidate sources by audience, support `visibility`/subject provenance and enforce audience checks before promotion/retrieval. Create a leakage regression test. | P0 |
| B07 | `entity-memory.js` promotes a proposed addition when its name appears in GM narration or it is targeted by a scene action/intent. `context-memory.js` stores durable details; temporary details are omitted from durable tables. | Replace implicit text containment as the sole significance test with a typed causal `memory_disposition` and enforce replay, alias reuse, retention/expiry and explicit promotion. Avoid auto-saving every decorative proper noun. | P1 |
| B08 | `typed-intents.js` calls `captureDialogue` after world application; `dialogue-continuity.js` writes a speech event keyed by **message + character**. | Test *multiple separate utterances in one message* and sequential movement→approach→speech. Revise idempotency to include intent/span identity so one utterance doesn't suppress another. Preserve exact player speech and listener proximity. | P0/P1 |
| B09 | `location-language.js` resolves saved keys/names/aliases primarily by normalization and exact equivalence; `autonomous-world.js` performs strict local access checks and actor location reconciliation. | Typed referent resolver should use actor-visible context, stable keys and causal adjacency, not demand player phrasing match. Never teleport; preserve locked, hazarded and distant-travel barriers. | P1 |
| B10 | `gm.js` adds typed schema and corrective retries, but still uses lexical `responseObligation`, a fixed deferral regex and legacy fixture fallback. | Move response obligation/coverage/completeness into a typed GM-turn contract. Retain backward-compatibility adapter outside the normal live path. Prevent “declared action still pending” in a successful output. | P1 |
| B11 | `narrative-context.js` still stores legacy `intended_actions` metadata and `authored-candidates.js` remains optional; `movement-language.js` remains in archive. | Define authoritative *meaning representation* and non-authoritative legacy reader. Remove unused path dependencies only after caller/test inventory; migrate historical rows lazily. | P1/P2 |
| B12 | `turn-orchestration.js` stages GM mutations before `resolveTypedNativeRolls` during final commit; `publication-outbox.js` exists. | Validate that roll eligibility, action outcomes, narration and outbox are reconciled in the same transaction with no preview-induced RNG and no post-commit roll narration mismatch. | P0/P1 |
| B13 | Prompt-retrieved continuity includes `context_memory` via `autonomousWorldContext`, currently bounded by latest 40 and audience filter; `narrative-context` retrieves other scoped sources separately. | Retrieval must be relevance/source/scene-aware, recheck exposure and evidence validity, detect stale/contradictory memories and record omissions rather than silently lose older important anchors. | P1 |
| B14 | `bot/scripts/typed-intents-regression-test.mjs` covers two movement phrases and basic entity retention. Offline validation lists this suite, while full bundle testing was not completed during prior packaging. | Extend exhaustive mixed-action, memory, security, failure-injection and rule tests; measure natural language robustness. Do not equate model mock success to live-model quality. | P0-P2 |

**Important:** Some B-rows are risks inferred from code paths rather than observed production incidents. Codex must create a failing reproduction test before changing a pathway, and document whether the failure was reproduced or a preventative hardening measure.

### Relevant source map

| Responsibility | Current files |
|---|---|
| Discord intake, context and split routing | `bot/src/index.js`, `message-span-ledger.js`, `conversation-principal.js`, `turn-attempts.js` |
| Semantic intent and legacy adapters | `typed-intents.js`, `player-language.js`, `movement-language.js`, `roll-language.js`, `consent-language.js`, `authored-candidates.js` |
| GM, semantic scope, claims and recovery | `gm.js`, `narrative-context.js`, `narrative-integrity.js`, `turn-recovery.js`, `director.js`, `prompt-budget.js` |
| World creation, identity and scene continuity | `autonomous-world.js`, `location-language.js`, `scene-entry.js`, `scene-continuity.js`, `dialogue-continuity.js` |
| Native mechanics and authority | `rules-arbitration.js`, `typed-mechanics.js`, `roll-requests.js`, `roll-collaboration.js`, `ai-intents.js`, `state.js` |
| Narrative memory, factual epistemics, context retrieval | `context-memory.js`, `entity-memory.js`, `memory-clusters.js`, `epistemic.js`, `npc-cognition.js`, `scoped-query.js` |
| Atomic commit and delivery | `turn-orchestration.js`, `publication-outbox.js`, `publishing.js`, `db.js` |
| Offline suites and fixtures | `bot/scripts/validate-offline.mjs`, `typed-intents-regression-test.mjs`, `gm-recovery-regression-test.mjs`, `natural-language-scope-test.mjs`, `narrative-contract-test.mjs`, `relax-end-to-end-test.mjs` |

---

## 2. Data contracts Codex should converge on

Implement these **conceptual types** as bounded, versioned JavaScript/JSON-schema contracts; refine naming to fit current code. They are targets, **not claims that these exact fields already exist**.

### 2.1 `AuthoredTurnEnvelope` — immutable player declaration (source authority)

- `guild_id`, `session_id`, `scene_id`, `discord_message_id`, `principal`, `owner_user_id`, `character_id`, `audience`, `role_control`, `source_event`, `original_text`, `source_hash`, `captured_at`.
- Every extracted action uses a `span_start`/`span_end` offset into the **unchanged** original text and preserves `source_span` exactly. Do not create a new player source by joining trimmed clauses, removing punctuation, or replacing Markdown/mentions.
- `intent_id = stable_hash(message_id, actor, start, end, semantic_slot)`; reorder/retry must not create a new intent ID. Duplicate identical utterances at different offsets remain distinct intents.
- Distinguish `player_authored | proxy_authored | gm_inferred | ooc | quoted_example`. Only current authenticated owner/proxy source authorizes its controlled role's voluntary actions; a GM-inferred action may drive **ordinary NPC/world reactions**, never fictional PC choices.
- Keep native explicit-consent evidence separate from general typed intent (proposal ID, exact current terms/amount, human principal, revision, affirmative decision). Interpreting an `offer` or `consent_reply` does not create assent.

### 2.2 `ActionIntentV2` — semantic representation, **not a grant of authority**

Suggested fields: `schema_version`, `intent_id`, `source_ref`, `source_span`, `start`, `end`, `actor_ref`, `type`, `operation`, `target_ref?`, `target_description?`, `target_kind`, `destination_scope?`, `framing`, `constraints`, `dependencies`, `sequence`, `speech_text?`, `uncertainty`, `interpretation_status`, `model_proposed_resolution?`, `validation_provenance?`.

- `type` examples: `move`, `observe`, `search`, `interact`, `speak`, `use_ability`, `attack`, `roll`, `resource_request`, `offer`, `consent_reply`, `remember`, `other`.
- `framing`: `immediate | hypothetical | conditional | quoted | reported | ooc`. Model classification is **provisional**, subject to source and control validation. A conditional can become eligible only if the actual authored prerequisite is proven; a hypothetical/planning thought is nonbinding.
- `interpretation_status`: `proposed | accepted_for_adjudication | rejected_overreach | clarification_required | non_action`; set `accepted_for_adjudication` only inside the native intent validator, **never** from model output. Treat `model_proposed_resolution` as advisory, not a permit to commit.
- `target_ref`: established audience-visible ID, same-turn proposed ID, or null. Missing referent is not by itself a reason to ask a human GM; attempt local resolution or mundane creation.
- `constraints`: typed conditions such as `avoid_location`, `stay_hidden`, `do_not_enter`, `requires_permission`, `cost_limit`, `if_then`. No fixed dictionary of phrases to express these conditions.
- `dependencies`: “enter store” → “take sign” → “speak to clerk” must be ordered; outcomes of earlier actions can affect later ones.
- Split **the player's authored attempted action** from model-proposed interpretation, **the validator's accepted canonical representation**, the arbiter's rule decision, and the DB's committed result. A model's claimed `resolution:auto` cannot itself commit anything.
- Material semantic overreach tests must reject or narrow unsupported interpretation: *toward*→*inside*, *thinking of an offer*→*agreement*, *grabbing a sign*→*permanent possession*. No regex-based verb whitelist should become the replacement verification gate; use source-grounded consistency, actor/scope/rule constraints, and targeted clarification for truly ambiguous consequences.
- Keep a bounded cap with explicit truncation reporting / second-stage segmentation for genuinely long messages. Do not silently drop action 13 or truncate quotes.

### 2.3 `AdjudicationReceiptV2` — native ruling and evidence, not model confidence

Suggested fields: `intent_id`, `input_source_ref`, `status`, `rule_basis`, `target_resolution`, `preconditions`, `risk`, `stakes`, `difficulty?`, `modifiers?`, `native_request_ref?`, `mutation_refs`, `evidence_refs`, `reason`, `new_state_revision`, `continuation_status`.

- `status`: `resolved_no_roll | committed | roll_pending | blocked | clarification_required | declined_as_non_action | superseded`.
- `roll_pending` **must** reference a real pending native roll request. If a roll must be requested before a new request record can be created, return a validated `roll_request` intent with exact ownership/stakes, not unbounded narration.
- `blocked` must identify an actual authoritative barrier (locked access, ongoing encounter restriction, incompatible canon, missing explicit consent, etc.). “Model not sure” is not a barrier.
- `clarification_required` must identify the material ambiguity (multiple equally plausible player-owned actors/destinations, conflicting conditional instruction, etc.) and allow independent nonblocked subactions to proceed.
- `committed` requires persisted mutation receipt IDs. `resolved_no_roll` must be justified by a native no-change/action-complete decision, and requires a state receipt whenever the action actually changes tracked state. `declined_as_non_action` or `acknowledged` covers speech, thoughts and descriptive acts without forcing fake state writes. A failed or skipped mutation never produces “you arrived” narration.
- Split **ruling** from **execution**: deterministic preflight returns a prospective judgment; transaction commit issues actual receipts, performs authorized expenditures, and executes dice once at the appropriate roll-execution step. A model-produced ``resolved`` status is not a native receipt.
- Rolls use saved Daggerheart rulings, actual character mechanics, declared Difficulty/traits/modifiers/stakes and native Hope/Fear dice. Never invent roll faces; matching natural faces remain critical according to active rules.

### 2.4 `MemoryCandidateV2` — relevance policy, provenance and epistemic boundaries

Suggested fields: `memory_id`, `kind`, `entity_ref?`, `name?`, `summary`, `audience`, `owner_scope`, `scene_ref`, `source_refs`, `evidence_level`, `retention`, `promotion_reason`, `referenced_intent_ids`, `known_to`, `created_at`, `last_accessed`, `expires_at?`, `supersedes?`, `status`.

- `retention`: `scene_only | session | durable_memory | durable_entity`. **Do not expose `canonical` as a model-selected retention value**; canon/evidence is an independent authority workflow, not the next stage of importance. If an older record uses `canonical`, read and route it through existing canon-aware APIs without silent promotion.
- `promotion_reason`: `player_named | player_targeted | used_in_consequence | evidence_or_possession | actionable_gm_lead | recurring_gm_anchor | significant_open_thread`. Generic “AI mentioned a proper noun” alone does not produce a permanent world entity; **a GM-introduced actionable shop/NPC must have a stable ID before a later player's attempt can depend on it**.
- `evidence_level`: `observed | testimony | rumor | inferred | gm_private`. A memory summarizes what is known to an audience; it is not necessarily truth.
- `scene_only` may remain in in-memory/scene-summarized context; never write it as a permanent world entity. `session` details may expire/compact on transitions, but **retain source-bound pending-action references, evidence lineage and materially consequential facts** until their dependencies close. Eviction of disposable scene texture must not invalidate an adjudication source.
- Promotion is *dependency-aware*: create/reuse ordinary actionable location or NPC **provisionally within the same transaction** before movement/interaction so native references resolve; only commit the entity and receipts if the turn validates. Do not precreate player-accessible inventory or secrets from a blocked hypothetical; retain non-authoritative pending referents only when needed for clarification.
- `public/party` candidates cannot be sourced solely from `private_messages` or GM secrets. Enforce origin and destination visibility on every save, read, promotion and summary.
- A real, usable named location/NPC becomes a stable world entity when **player-named/targeted, interacted with, actionable as a GM lead, or causally important**; otherwise keep incidental description temporary, even if decorative prose includes a proper noun. Reuse aliases; distinguish identity, observed description, rumor, NPC belief and canon. Anonymous background clutter can stay temporary.

### 2.5 Distinct entity / prop / fact / canon authority

| Item | Model may invent? | Persistence | Native rule |
|---|---|---|---|
| Weather, crowd texture, flickering lamp | Yes | Scene-only | No world ID unless consequential |
| Help-wanted sign seen on a shop window | Yes | Scene-only or descriptive durable memory if handled/revisited | Physical handling ≠ automatic inventory ownership |
| Player-targeted shop **Night Owl Copy & Parcel** | Yes, if no conflict | Durable location entity, alias and adjacency | Enter only after access check and authentic attempt |
| Shop clerk who hears Billy | Yes | Durable NPC if introduced/used; location and presence receipts | Cannot know secrets or speak for active human proxy |
| Player takes a sign off a window | Interpret and adjudicate | Scene prop interaction receipt; inventory only if actual native custody | Check accessibility/consequences; preserve player wording |
| Claim “the clerk knows the assassin's identity” | Only as conjecture/rumor unless grounded | Scoped testimony/hypothesis or authorized fact | Epistemic source and NPC knowledge validation |
| Locked campaign canon | No silent edit | Existing canon ledger | Human reconciliation only for material contradiction |
| Daggerheart resource spend/roll | No fictitious commit | Native resource/roll ledger | Actual owner authorization + native rules engine |

---

## 3. Ordered Codex work packages (one reviewable PR/commit series each)

### T00 — Establish a reproducible baseline (P0, prerequisite)

**Files:** `bot/package.json`, `bot/package-lock.json`, existing test runners, `docs/` report.

**Tasks:**
- Verify the working tree is the **modified typed-intent v10 bundle** and log version, hash, local differences, Node/npm versions and branch. Do **not** silently overwrite it with upstream main.
- Create a branch `codex/typed-intent-refinement` and avoid modifying live DB or secrets. Preserve local content customizations.
- Run `npm ci` and `npm run validate` where dependencies are available; capture baseline failures and their causes. Run `node --check` for modified files.
- Create `docs/TYPED_INTENT_BASELINE.md`: current source inventory; call graph and sinks; each `*-language.js` consumer; existing data record kinds, tests, and baseline failure log.
- Add targeted failing fixtures for **Billy's multi-action shop interaction** and **Tyrell's bolt toward a named location** plus all confirmed P0 risks.

**Exit gate:** Exact starting revision recorded; a red/green target suite can be executed without network calls; independent failures are catalogued, not masked.

### T01 — Stable source-span intake and one semantic interpretation (P0)

**Files:** `bot/src/index.js`, `message-span-ledger.js`, `typed-intents.js`, `narrative-context.js`, `gm.js`, tests.

**Tasks:**
- Introduce `AuthoredTurnEnvelope` preserving the original Discord message, principal and source offsets through native and GM paths. Keep native command parsing only for *explicitly identified* commands or already authorized pending actions; do not greedily consume natural speech before interpretation.
- Replace regex-first `messageSpans` as the ordinary splitter with model-proposed typed action boundaries; maintain original offsets, token spans and ordered operations. There must be no round-trip loss of punctuation, apostrophes, quotes, emotes or relative pronouns.
- Require the semantic pass to account for every **material/actionable** clause (including `type:other` for nonactions) with source offsets and a coverage ledger. **A mechanically checked span ledger proves accounting, not true semantic understanding.** Use adversarial/paired examples and human-reviewed evaluations to catch omissions and semantic overreach. Keep OOC/player-to-player chatter nonbinding.
- Add `ActionIntentV2` schema/version and adapters from older `player_intents`, `authored_candidates` and `narrative_interpretation` without modifying historical records. Introduce **two different API boundaries**: `proposeIntents()` (model/untrusted) and `acceptIntentForAdjudication()` (native provenance/semantic-scope checks). Consumers may not bypass the latter.
- Preserve the existing single GM OpenAI call where possible; **do not add an LLM call for each subaction**. Bound request size, costs and latency. A large message can be segmented, but only in a controlled replay-safe pipeline.

**Exit gate:** Mixed roll + observation + speech; two identical spoken phrases at different offsets; pronoun movement; `Tyrell bolts`; Markdown/third-person narrative; and hypotheticals all generate distinct, source-backed typed candidates. No new resources or locations are committed by interpretation alone.

### T02 — Phase out remaining phrasing gates, keep native authorization (P0/P1)

**Files:** `player-language.js`, `scene-entry.js`, `movement-language.js`, `roll-language.js`, `consent-language.js`, `location-language.js`, `authored-candidates.js`, `dialogue-continuity.js`, `index.js`.

**Tasks:**
- Inventory every import/caller of all five `*-language.js` files. Separate *semantic decoding* from *strict ownership/security checks*. Move the first into a typed service; preserve the second in native validators.
- Route normal movement/entry/search/dialogue through typed intent records, not fixed verb lists or first-person prefixes. For historical clients, keep thin deprecated adapters with tests until removal.
- Move roll and consent **intent recognition** away from canned exact phrases, **without turning conversational language into blank-check authorizations**. Keep current owner/role, native pending request/offer, exact terms or bounded amount, revision, explicit affirmative decision and any required human confirmation as independent authority checks. A model's `consent:true`, `roll:true` or extracted keyword is not sufficient.
- Replace speech capture's whole-message/one-event limitation with per-intent IDs and listener-specific evidence. Support multi-utterance turns without duplicate memories.
- Keep semantic location resolution distinct from actual travel, adjacency, hazards and door access. Do not transform “towards” into “inside” or “I look for a shop” into arrival.
- Use feature flags for optional legacy data capture, not to disable semantic roleplay. Maintain backward compatibility for existing saved records.

**Exit gate:** Tests prove “bolt,” “stumble,” “make for,” “drift closer,” “leave by the side door,” translated/third-person forms and ordinary dialogue are interpreted without a required dictionary. No loss of strict consent or native roll authority. No legacy path can intercept a meaningful message and silently drop remaining actions.

### T03 — Complete typed Daggerheart/native arbitration (P0)

**Files:** `rules-arbitration.js`, `typed-mechanics.js`, `roll-requests.js`, `roll-collaboration.js`, `ai-intents.js`, `state.js`, `turn-orchestration.js`, relevant rules modules and tests.

**Tasks:**
- Add a typed `AdjudicationReceiptV2` per immediate consequential intent; require native resolvers to return machine-verifiable statuses rather than accepting a model's `resolution` and `reason` as resolution.
- Define arbiter adapters: mundane no-roll, scene travel/access, social persuasion/contest, investigation, PC ability use, attack/defense, stress/HP/hope/armor changes, duality roll request, tag-team/help/experience, downtime, and explicit owner consent.
- Resolve cost, difficulty and stakes from actual Daggerheart/Veiled City rules and saved GM rulings. Give GMs freedom to narrate consequences but not to fabricate dice or override resource state.
- A `roll_required` result must create a native pending roll with provenance, pending request ID, stakes, participants and modifiers; otherwise it is an arbitration failure, not a successful reply.
- For `blocked` require a specific saved restriction or a validated world/mechanical obstacle; for `clarification_required` require actual target, authorization or consequential semantic ambiguity. Do not treat a missing parser keyword as a blocker. An unsupported ordinary action should use an appropriate no-roll scene adapter **if allowed by game rules**, never an improvised native permission bypass.
- Move preview-safe rules preflight ahead of commit, then **execute dice/spends only once** at the authorized final roll/execution step. Distinguish `request_created` from `roll_executed`; do not auto-roll when a roll was merely requested. Pair each actual receipt to `intent_id`, source event, rule/ruling and post-turn claims. Revalidate current state/revisions before any irreversible change.
- Ensure two actions sharing the same input cannot double-spend; replay/failed Discord delivery returns the existing receipt.

**Exit gate:** Exactly one valid native request/receipt for each rule-requiring action. No generated rolls, no phantom payment, no double-spend, no roll failure disguised as narration. Document no-roll decisions and cite real rule basis in internal diagnostics.

### T04 — Sequential autonomous world, travel, NPCs and props (P1)

**Files:** `autonomous-world.js`, `location-language.js`, `scene-continuity.js`, `dialogue-continuity.js`, `entity-memory.js`, `state.js`, tests.

**Tasks:**
- Resolve subactions in *authored sequence*, with explicit dependencies. After authorized entry, re-evaluate clerk co-presence and listener access before speech; do not resolve a conversation while outside a blocked building. When entry fails, mark dependent indoor speech `dependency_blocked` or give an outside-appropriate response only if actually audible; independent observations may still resolve. Do not invent an NPC's voluntary action for a human-controlled proxy.
- Add a typed spatial action `approach_exterior | enter_interior | move_local_zone | travel_remote | observe`. Reuse native adjacency, scene-presence, encounter and source checks. Do not use a generic new location to bypass a significant physical barrier.
- Create missing ordinary public entities when a player **names/targets** them, a GM **offers them as an actionable lead**, or they become consequential; apply stable key, aliases, duplicate resolution, public identity, saved local geography and visibility. Stage creation transactionally before dependent movement, then commit together; treat purely incidental GM background nouns as discardable.
- Treat signs, keys, letters, evidence, inventory and scene props differently. An observed sign is descriptive; interacting with it needs scene-level state; taking it away into possession may require a custody/handout/inventory mutation.
- Preserve existing NPC proxies, subjective knowledge, schedules, witness/access restrictions and character-private discoveries.
- Name/alias collision uses source-backed preflight: reuse, create distinct qualified entity or report a *real* conflicting source. “Unknown location” is not human review.

**Exit gate:** Billy's entire message can execute entrance → take sign if accessible → reach clerk → deliver exact quotation → NPC reaction (subject to access and proxy), with stable records and no implied job contract. Tyrell reaches the exterior of Twenty-Four Spin, not its interior. Same named venue/NPC persists and is reused next turn.

### T05 — Context and memory lifecycle (**T05a P0 privacy immediately; T05b P1 lifecycle later**)

**Files:** `context-memory.js`, `entity-memory.js`, `memory-clusters.js`, `epistemic.js`, `scoped-query.js`, `narrative-context.js`, `autonomous-world.js`, DB record APIs, tests.

**Tasks:**
- **T05a SECURITY GATE — execute immediately after T00, before general T01–T05 work:** derive memory candidates from **individually labeled** public, party, user, character and GM-private output surfaces. Do not concatenate private-message text into public/party significance checks; never broaden source visibility during promotion, retrieval, summarization or NPC cognition. Create fail-red cross-audience and cross-character fixtures first. This is a narrowly scoped security repair; it must not change unrelated narration mechanics.
- Implement `MemoryCandidateV2`, explicit model-proposed salience/promotion reason and **native** retention decision with causal provenance. Keep `scene_only` transient and `session` records bounded. Do not elevate memory to canon, inventory, player knowledge or NPC knowledge by naming it. A memory can truthfully record *what an NPC claimed* without asserting the claim is objectively correct.
- Promote to *durable entity* when a PC refers to or acts on it **by name or meaningful contextual intent**, or it is a GM-offered actionable place/person/recurring lead; otherwise retain only appropriately scoped descriptive memory. Assign stable aliases, scene provenance, last-seen and source-status tracking; support provisional references created in the same transaction as their first consequential use.
- Track memory changes as source-backed `introduced | referenced | corrected | superseded | expired`; never silently rewrite an established fact. Preserve prior history for reconciliation; allow human descriptive retcons without rolling back mechanically settled events.
- Retrieval: exact entity aliases + semantic candidates, actor/scene proximity, relevant player-visible evidence, active source ancestry, salience, recency, and deterministic bounds; return omission counters and reasons. Never expose inaccessible GM/private records.
- On scene/session transitions, expire temporary details but retain causal receipts, placed NPCs, prop custody, discovered leads and durable memories. Add opt-in compaction with no information leakage into a shared summary.

**T05a early exit gate:** No data from a private/GM-only output can broaden into party memory, NPC witness knowledge, context summaries or retrieval; fail-red tests demonstrate the original path, and fail-green tests verify the repair. **T05b full exit gate:** A fleeting wet newspaper disappears from durable world state; a sign Billy handles stays referenceable while needed; a clerk introduced as an actionable witness has durable bounded identity and evidence-scoped knowledge; a disproved rumor stays testimony and may be superseded without becoming canon.

### T06 — GM narrative completion and reconciliation (P1)

**Files:** `gm.js`, `narrative-integrity.js`, `turn-recovery.js`, `rules-arbitration.js`, `state.js`, `publishing.js`, tests.

**Tasks:**
- Add a `TurnCompletionContract`: every **accepted immediately actionable** intent must have a linked native disposition (`committed`, `resolved_no_roll`, real `roll_pending`, evidenced `blocked`, or material `clarification_required`). Nonbinding dialogue, hypothesizing and description are **accounted for without requiring fake mutations**. A model's `resolution`, narrative flourish or parser miss cannot itself satisfy this contract.
- Treat early generated narration as **provisional**; stage prospective **deterministic** rulings, then reconcile final player-facing prose against authoritative committed receipts or actual pending-roll requests. Preview cannot predict random roll faces. Check movement/access, speech/listeners, resources, custody, epistemic knowledge, secrets and handouts. If the model narrates success not supported by a receipt, repair/withhold that claim without erasing valid independent resolutions.
- If the model omits a meaningful action or broadens its scope, allow one **bounded targeted correction** of the interpretation/plan before commit, retaining grounded subactions. If correction remains semantically unsafe, give a precise, truthful unresolved-action notice; do not silently drop valid subactions, endlessly regenerate, or replace a blocked action with fictional success.
- Maintain the existing canon ledger guard; remove accidental `action:canon` classification for mundane places and signs, but never suppress actual incompatible canon evidence.
- Distinguish `SEMANTIC_OVERREACH`, `MISSING_ACTION_COVERAGE`, `UNRESOLVED_REFERENT`, `UNAUTHORIZED_INTENT`, `NATIVE_RULE_BLOCK`, `ROLL_REQUEST_FAILURE`, `SCOPE_LEAK`, `RETRYABLE_PROVIDER`, `PUBLICATION_FAILURE` and other existing native errors. Report the actual transaction/outbox status; never say “not committed” if a native receipt exists.
- Keep natural prose, tone, pacing and uncertainty about world outcomes, but never produce a response that only repeats the player declaration as though it were an end state.

**Exit gate:** Everyday movement and conversation complete naturally when native rules allow. All immediately actionable intents have native-supported dispositions; dependent blocked actions do not erase independent ones. Mandatory rolls create real requests; genuine consent is never inferred. Failures are truthful, traceable and recoverable without rewriting roleplay to match parser syntax.

### T07 — Migrate persistence and remove obsolete paths deliberately (P1/P2)

**Files:** `db.js`, migration/record helpers, typed modules and their callers, docs, tests.

**Tasks:**
- Introduce explicit contract `schema_version` and migration readers for `typed_intent`, `movement_candidate`, `narrative_context`, `authored_candidate`, `context_memory`, scene entries and native roll/consent receipts.
- Reconcile old pending entries and old identity aliases lazily. Preserve source events, evidence ancestry and authorized completion; no global scan that commits historical attempts as new actions.
- Remove an old handler only after search shows all production callers migrated and a compatibility test covers historical records. Retire the unused phrase allowlists; keep security-meaningful exact matching of IDs, revisions, current terms and amounts.
- Do not delete old campaign records or force irreversible schema changes without backup and migration/rollback documentation.

**Exit gate:** Old v10 sessions load and continue; replay of an old turn remains idempotent; no stale parser acts as an alternate authorization gate; migration leaves canonical facts and private scopes untouched.

### T08 — Instrumentation, scenario evaluation and release hardening (P2)

**Files:** `evaluation-harness.js`, `operational-metrics.js`, `bot/scripts/*`, `.github/workflows/offline-validation.yml`, docs.

**Tasks:**
- Add offline synthetic fixtures, property-based/adversarial fixtures and stateful multi-turn tests. Extend `npm run validate` and CI with the new suites, no paid/network model calls.
- Evaluate coverage and outcome: *interpretation accuracy*, *action completion*, *false clarification*, *unauthorized mutation*, *scope leakage*, *NPC response*, *memory reuse/promotion*, *duplicate resource spend*, *preview-vs-commit parity*, *delivery/replay recovery*.
- Count actual model retries/cost/latency separately from native state rejects; use privacy-safe aggregate telemetry, not raw GM secrets in logs.
- Add optional, cost-capped human-reviewed live evaluation only after the user explicitly authorizes provider charges; compare pinned prompts/model versions against the same fixtures.
- Record a release migration guide, updated system contracts, compatibility with existing character packages, and fail-safe rollback path.

**Exit gate:** CI green, synthetic acceptance complete, zero demonstrated unauthorized native effects or privacy leaks; new issue categories are measurable. Keep a documented list of limitations rather than claiming unlimited language understanding.

---

## 4. Hard test matrix Codex must implement

Create versioned fixtures under `bot/scripts/fixtures/typed-intents-v2/` plus focused runners (names below are suggestions). **All tests must be network-denied, deterministic and exercise production validators/DB code where possible.**

| ID | Authored scenario | Required outcome / invariant |
|---|---|---|
| I01 | `I bolt from the shadows towards the Twenty-Four Spin.` | Typed move, destination **exterior**, correct location/presence receipt; no entering without intent. |
| I02 | `I head into Night Owl Copy & Parcel, grab the help wanted sign, approach the clerk. “I have computer skills,” I tell him.` | Ordered subactions, distinct target refs, truthful sign handling, clerk present, exact PC speech, NPC response if free. |
| I03 | `I search for an open public place away from Hollow Street.` | Search creates/reuses a plausible nearby location **without moving** the PC. |
| I04 | `I don't enter; I watch the door from the alley.` | Observation, no movement/access/entry receipt. |
| I05 | `If I can get through unnoticed, I'd enter.` | Conditional; no movement before authorized condition adjudication. |
| I06 | `“I could just steal that key,” I joke.` | Authored dialogue only; no theft, inventory transfer or consent. |
| I07 | `Tyrell makes his way to the back entrance.` | Third-person narrated owner movement is understood without fixed first-person grammar. |
| I08 | `I sprint there.` after one visible referent | Resolve deictic `there` to the correct actor-visible place; no invented target. |
| I09 | `I go there.` after two equally plausible referents | One targeted clarification; no wrong movement. |
| I10 | `I arrive at the locked archive and walk in.` | Native lock blocks entry; narration cannot claim free access. Other harmless observations can proceed. |
| I11 | `I enter the clinic; then I say “Need a doctor?”; then I tell the nurse “Please help.”` | Two distinct sourced utterances; no `speech:<message,character>` collision. |
| I12 | `I roll my pending check.` | Exactly one owner-scoped native roll, actual dice/receipt, never in preview. |
| I13 | `I might spend Hope if this goes badly.` | No resource spend; hypothetical framed intent. |
| I14 | `I spend one Hope to invoke my stated Experience.` | Only if native rule, exact resource/cost/ability/owner authorizes it; otherwise a truthful blocked/clarification receipt, no free ability. |
| I15 | Real player consent followed by `and I ask the clerk about hours` | Only explicitly authorized offer is accepted; remaining dialogue still reaches GM. |
| I16 | A public party reply mentions a character-only secret in a private_message | **No leakage** into party-scoped context memory, summary, GM-public narration or other PC knowledge. |
| I17 | Fleeting puddle, anonymous passerby, neon hum | Scene-only: no permanent world entity/canon record. |
| I18 | Player asks to return to **Night Owl Copy & Parcel** 3 scenes later | Resolve to same durable ID, not duplicate shop. |
| I19 | Clerk speculates that a suspect is guilty | NPC testimony/rumor only; no objective canon promotion. |
| I20 | Player handles an ordinary poster then later refers to `that sign` | Referent persists as scene prop/context if meaningful, but does not become owned inventory without a valid native custody event. |
| I21 | Player mentions an NPC with an identical name to a GM-private protected NPC | No accidental identity disclosure or covert reference collision. |
| I22 | The same Discord message is delivered twice | One set of typed receipts and one native consequence; safe publication replay. |
| I23 | Discord publication fails after movement commit | Position remains committed; outbox redelivers without rerunning roll or movement. |
| I24 | Native preview rejects an access issue | Transaction rolls back; no scene entity/presence/memory pollution. |
| I25 | A mechanical uncertainty is marked `roll_required` | Native pending request with stakes/difficulty/rule basis exists; bare reason-only answer is rejected. |
| I26 | 14 distinct authored subactions | No silent truncation of schema cap 12; explicit segmentation/truncation recovery without double processing. |
| I27 | Human-controlled NPC proxy is addressed | GM does not fabricate that proxy's voluntary reply; message is forwarded/queued through authorized proxy workflow. |
| I28 | Multiple PCs in party and parallel private scenes | Proper speaker ownership and scoped memories, no cross-character disclosure. |
| I29 | Source message includes bold/italics, curly quotes and escaped punctuation | Exact source offsets and utterances survive intake; no invented player speech. |
| I30 | Known shop is referenced by a nickname and context | Semantic alias reuse against a single stable location key. |
| I31 | Active encounter movement/attack | Adjudicate through actual encounter rules; never use local no-roll path to bypass combat. |
| I32 | GM only invents incidental location name in prose | Persist only if introduced as an actionable/recurring anchor; otherwise keep transient but do not forget a place the PC actually enters. |
| I33 | `I rush toward the clinic window to look inside.`; model proposes `enter_interior` | Reject or narrow semantic overreach; do not move the PC indoors. Authored approach/observation still resolve. |
| I34 | `I consider offering the clerk 50 gold.`; model proposes `offer + spend` | Nonbinding contemplation; no agreement, currency deduction or debt. |
| I35 | `I remove the help-wanted sign to show the clerk.` | Scene-prop handling may resolve; **no permanent inventory custody** absent a valid native receipt. |
| I36 | `I say, “I accept”` while discussing another topic and an unrelated pending offer exists | Speech is preserved; no binding consent absent a uniquely matched, currently authorized offer and explicit intent to accept *those* terms. |
| I37 | Open door and `If it is unlocked, I go inside.` | Model captures conditional intent; arbiter evaluates factual condition and can commit entry when satisfied, but not for an unmatched or hypothetical condition. |
| I38 | `I might go into the shop tomorrow.` | Hypothetical/future planning only; no present movement, no pending roll. |
| I39 | GM advertises a newly invented named shop as an actionable job lead; next turn player enters | Stable location ID already exists or is provisionally created within validated next turn; no ghost prose-only business and no canon proposal. |
| I40 | Only decorative GM prose mentions a made-up shop name; no player targets it | Remains scene-only unless a real recurring/actionable GM anchor is explicitly supported. |
| I41 | Movement into shop fails; player simultaneously notices a street notice board | Indoor clerk interaction remains dependent/blocked; independent street observation still resolves without fake indoor knowledge. |
| I42 | Model returns a valid JSON typed intent that incorrectly attributes an NPC’s speech to the PC | Validator rejects actor/source/speech mismatch; no fabricated PC quotation or consent. |
| I43 | Private character-only clue is included in a model memory candidate targeted to party | Native memory policy rejects/quarantines promotion and flags scope leak; future party retrieval does not expose it. |
| I44 | Same message retries after a committed native Hope/Fear roll or resource spend | Stable ID/revision and receipt replay; no reroll, second cost or duplicated narration. |
| I45 | Player asks a passerby their name and they become a recurring witness | Promote/reuse bounded NPC identity with scene location, evidence-scoped knowledge and correct audience; no automatic objective truth from their testimony. |
| I46 | Model marks an immediate risky leap as `resolved_no_roll` with only a reason | Native arbiter must require actual rule adjudication; cannot accept model-declared success. |

**Run all of:** source check; format/quality; `typed-intents-regression-test.mjs`; `gm-recovery-regression-test.mjs`; `natural-language-scope-test.mjs`; `narrative-contract-test.mjs`; `scene-entry-test.mjs`; `autonomous-world-test.mjs`; `relax-end-to-end-test.mjs`; `production-regression-test.mjs`; full `npm run validate`. Tests that require installed dependencies must be run in an environment with those dependencies; document setup failures separately.

### Mandatory authority-chain assertions (apply across every test suite)

For each consequential test, assert: **(1)** immutable original source and true actor/role; **(2)** model intent remains proposed until native validation; **(3)** accepted semantic type cannot amplify the author's voluntary scope; **(4)** native adjudicator records its actual rule evidence, status and preconditions; **(5)** any real game-state mutation is represented by one transaction receipt tied to the intent ID; **(6)** player-facing narration and memory contain no consequential fact that lacks a committed/pending native basis; **(7)** role/audience filters hold for saved, retrieved and summarized memories; **(8)** replay does not duplicate effects.

A full pass of *schema validation* or source-span substring matching **does not count** as proof of semantic accuracy. Use paired counterfactual fixtures in which a one-word or contextual change flips authorization (approach vs enter; think about agreeing vs agree to the exact offer; report a rumor vs objective discovery). Track both false-positive mutations and false-negative failures to resolve ordinary player actions.

### Minimum release thresholds

- **0** unauthorized PC decisions, roll inventions, unapproved spending, GM/private information leaks, cross-guild mutations or duplicated native receipts in the acceptance suite.
- **100%** tested **accepted immediate actionable** intents have one truthfully grounded disposition and its native receipt, no-roll rule evidence, actual pending roll request or justified obstacle/clarification. Nonbinding intents receive a nonaction disposition. Unextracted actions remain a measured model-quality risk rather than being declared impossible by schema validation.
- **100%** tested `roll_pending` cases have a stored request with rule/difficulty/stakes metadata as applicable, not just prose; `roll_executed` cases have actual native dice receipts from the permitted execution boundary.
- **100%** privacy-negative fixtures demonstrate no narrower-to-broader memory promotion, retrieval, summarization or disclosure; include role-switching and same-named protected entities.
- No degradation in existing offline suite; any intentional contract change must include documented fixture/schema migration, not test deletion.
- Release notes identify where model behavior is still probabilistic, and require operator-approved live testing before declaring real-world language accuracy.

---

## 5. Execution protocol for Codex CLI

### Preparation

Open the directory that contains `bot/`, `content/`, `docs/` and `README.md`, not the inner `bot/src` directory. If that folder is not a Git working tree, establish a proper checkout/branch **without replacing the modified source or discarding local changes**. Make an independent backup first. Use Node.js >=22.16.0; follow the project's actual lockfile.

```powershell
cd 'D:\Library\Veiled City'
git status --short
node --version
npm --version
cd .\bot
npm ci
npm run validate
cd ..
```

If Git does not recognize the directory, use a backup and set up an appropriate development checkout before making edits. A failing `npm ci` is an environment/dependency blocker, not a reason to skip validation silently. Never run `npm start` against live Discord during offline phases.

### Cadence for each ticket

1. Inspect implementation and relevant tests, then document the expected invariant and entry/exit points.
2. Reproduce the defect using an automated regression fixture **before modifying code**; note source evidence if a risk cannot be reliably reproduced.
3. Implement the narrowest coherent typed migration and keep interfaces backward compatible until tests pass.
4. Run the focused suite, then the full offline suite. Make no network/provider calls unless the operator explicitly authorizes cost and scope.
5. Record modified files, dependency/migration impacts, tests run and unresolved issues in `docs/TYPED_INTENT_PROGRESS.md`.
6. Commit a reviewable logical change/PR after tests pass; do not bundle the whole roadmap into an unreviewable mega-commit.
7. Advance only after the previous ticket's exit gate passes. If blocked, return the failing command and smallest reproducible error; do **not** weaken permissions or asserts as a workaround.

### Suggested implementation order

`T00` baseline → **`T05a` immediate memory audience-isolation/security gate** → `T01` typed intake/source provenance → `T02` remove lexical gates → `T03` native arbiter → `T04` autonomous scene sequencing → `T05b` memory salience/lifecycle → `T06` GM/narration completion → `T07` migration/cleanup → `T08` evaluation/release.

If a P0 security or idempotency issue blocks other phases, fix its narrowest safe aspect first in a separately tested commit.

### Continuous output requested from Codex

Keep these files up to date as work progresses:

- `docs/TYPED_INTENT_BASELINE.md`: audited baseline, call graph, known failures, test setup.
- `docs/TYPED_INTENT_PROGRESS.md`: milestone checklist, change log, tests/results and blocked items.
- `docs/TYPED_INTENT_CONTRACTS.md`: versioned schema definitions, authority boundaries, compatibility/migration semantics.
- `docs/TYPED_INTENT_RELEASE.md`: preflight, backups, migration, rollback and operator acceptance checklist.

These are *planned outputs* for Codex; they are not already present simply because this plan names them.

---

## 6. Copy/paste Codex kickoff instruction

> **TASK:** Continue Veiled City's typed intent migration from the modified 10.0.0 source, using `CODEX_INTENT_REFINEMENT_PLAN.md` in the repository root as the implementation contract. First inspect `bot/src/typed-intents.js`, `typed-mechanics.js`, `context-memory.js`, `entity-memory.js`, `gm.js`, `state.js`, `autonomous-world.js`, `message-span-ledger.js`, `player-language.js`, `roll-language.js`, `consent-language.js`, `narrative-context.js`, `narrative-integrity.js`, `turn-orchestration.js` and the existing offline tests. Do not reset to the unmodified upstream main. Preserve all human control, canon, privacy, Daggerheart and exactly-once invariants.
>
> **FIRST IMPLEMENTATION:** Execute **`T00` and the narrow `T05a` memory audience-isolation security gate only**. Inventory the source/receipts, establish offline red/green tests, remove private-to-party memory promotion/retrieval/summarization risk, and document remaining findings. Then **stop for review**. Create/update `docs/TYPED_INTENT_BASELINE.md`, `docs/TYPED_INTENT_CONTRACTS.md` (the authority matrix above) and `docs/TYPED_INTENT_PROGRESS.md`; run focused + full offline validation. Do not start a live bot, deploy, spend OpenAI API credits, or modify production campaign databases. Do not start general T01–T08 until this gate passes.

**After T00 + T05a are verified**, commission T01 separately: stable source envelopes, `proposeIntents()` versus `acceptIntentForAdjudication()`, and typed intent coverage without changing native effects. Then issue successive Codex instructions using the next ticket ID only. Avoid commissioning all phases concurrently because the data/authority contracts depend on upstream milestones. **Required language in every Codex task:** “Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.”

---

## 7. Definition of done for the full initiative

Veilkeeper may accept unrestricted natural roleplay, **propose and natively ground fallible semantic interpretations** into canonical adjudication-input intents sourced to the real player, identify relevant world actors/locations/props, resolve ordinary actions automatically when permitted, request native rolls only when warranted, preserve meaningful continuity and NPC knowledge, and narrate only supported committed/pending outcomes. Players do not have to type phrases from a verb whitelist or repeat valid actions to trigger arbitration. GM-invented background details remain temporary unless named/used or materially important. All durable memories are scoped, source-backed and retrospectively correctable. No model interpretation can grant PC consent, leak private information, fabricate dice or bypass true canon and mechanical restrictions. Every failed or delivered turn is replay-safe and diagnosable.

**Do not call the initiative complete until T00–T08 gates and the release test matrix pass.**
