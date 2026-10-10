# Veiled City v10 — Codex Typed-Intent Refinement Plan v3

**Target branch:** [`codex/typed-intent-refinement`](https://github.com/KeshireTheChaotic/Veiled_City/tree/codex/typed-intent-refinement)
**Reviewed HEAD:** `7786d560c9d69483684692e039c6ce27d8da13e4` (2026-10-10)
**Comparison base:** `main` at `6c3167dbbf015739e1723272121552d60b9f2ec8` (branch ahead by two commits; behind by zero at review)
**Package version:** `10.0.0`
**Supersedes:** `CODEX_INTENT_REFINEMENT_PLAN.md` v2 *for work after the reviewed branch HEAD*. Preserve v2 for historical design context; do not repeat its completed T00/T05a work.
**Scope:** Readable, secure OpenAI-first player intent, native Daggerheart/rules arbitration, sequential GM action completion, semantic world identity, privacy-aware contextual memory.
**Status:** Design/implementation plan, **not code changes**. Review was static against connected GitHub branch and its own test report; no live bot or test execution was performed for this plan.

> **Authority contract (binding):** Human-authored declaration owns voluntary player intent. OpenAI generates fallible semantic proposals. Grounded and accepted typed intents are the canonical **inputs** to native arbitration, not permission for consequences. Native arbitration and verified transaction receipts own outcomes. Narration and memory represent only appropriate, source-backed results and observations.

---

## 1. Current branch state and decision

Codex correctly completed its limited initial assignment:

| Work item | State at reviewed HEAD | Evidence |
|---|---|---|
| T00: baseline, call graph, authority mapping | **Complete as an inventory** | `docs/TYPED_INTENT_BASELINE.md`, `docs/TYPED_INTENT_CONTRACTS.md`, `docs/TYPED_INTENT_PROGRESS.md` |
| T05a: party/character memory audience isolation | **Implemented; focused fixture reported green** | `bot/src/context-memory.js`, `bot/scripts/memory-audience-isolation-test.mjs` |
| Full offline validation | **Red, known baseline failures** | `docs/TYPED_INTENT_PROGRESS.md` |
| T01: proposed → accepted lifecycle | **Not started** | `docs/TYPED_INTENT_PROGRESS.md` |
| T02–T04, T05b, T06–T08 | **Not started** | `docs/TYPED_INTENT_PROGRESS.md` |

**Decision:** Keep the branch. Do **not** merge or deploy yet. Implement **T00.1 stabilization** as the next ticket, with an explicit authorization fix and green regression suite, then proceed to T01. No broad rewrite before these gates pass.

### Findings that determine the order

1. **P0 movement bypass.** In `bot/src/autonomous-world.js`, `currentTypedMovement(...)` is required only when `narrative.player_intents` is an array. Omitting that property in a legacy/direct mutation may therefore bypass typed movement authorization. The old `I look around.` → proposed `scene_actions.move` negative test must fail closed, including when `player_intents` is missing or `[]`.
2. **P0 intent-scope consistency.** A typed record labeled `blocked`/`roll_required` or ambiguously targeted must not gain an executable action merely because a corresponding `scene_actions` proposal exists. Validate action ↔ accepted intent ↔ specific authorized target independently of the LLM's self-reported `resolution`.
3. **P1 regression baseline.** Codex reported `production-regression-test.mjs` (unexpected second model call), `relax-end-to-end-test.mjs` (unexpected third call), and `autonomous-world-test.mjs` (unsourced action no longer rejected) failing under the supplied modified v10 baseline. These are not acceptable red tests to carry into T01.
4. **P1 semantic overreach.** `validatePlayerIntents(...)` currently proves literal span inclusion, closed schema, framing enumerations, and partial ownership. Literal inclusion alone cannot prove that **approach ≠ enter**, **consider ≠ do**, **speech ≠ consent**, or that `target_key` refers to the intended object. T01 requires an explicit native acceptance boundary with context and negative semantic fixtures.
5. **P1 memory identity and correction.** T05a fixes audience provenance, but `context_memory` keying principally by normalized name/kind/audience permits same-name collisions and first-record-wins staleness. Do not fix by widening retrieval or weakening privacy. T05b owns identity, versioning, promotion/expiry, correction and relevance.
6. **P1 compound actions.** One source message may contain moving to the clerk, taking a help-wanted sign, then speaking. The existing pipeline does not guarantee per-subaction ordering, NPC availability at the moment of dialogue, or a disposition/receipt for every actionable step.
7. **P2 verification.** No passing GitHub workflow evidence was returned for the reviewed HEAD. Branch-reported offline tests are not equivalent to full CI or live-model validation.

---

## 2. Product and safety invariants — never relax

**Player agency**

- Only the authenticated owner/authorized proxy controls that role's voluntary decisions. Role/proxy scope is checked at the source and at commit. Model interpretation never authorizes PC speech, money/hope/stress spending, item transfer, agreement, romance, disclosure, participation, or tactical choices by itself.
- *Approach* is not *enter*. *Look at* is not *take*. *Hold* is not *own*. *Offer* is not *agree*. *Consider* is not *act*. *Attempt* is not *success*. A quoted/hypothetical/reported action cannot become an immediate native action.
- The model should interpret any everyday phrasing without an action-verb whitelist. **Do not replace lexical parsers with disguised semantic keyword allowlists**. Native exact checks apply to source provenance and dedicated explicit authorization, never general English word choice.

**Rules and continuity**

- Native Daggerheart rules and saved GM rulings are binding. No fictional Hope/Fear die faces, rolled totals, costs, conditions, damage, ownership, or canon generated solely by narration/model output.
- On a required roll, the GM establishes the relevant mechanic, Difficulty, applicable traits/modifiers, stakes and participants before the native request/roll. The model cannot invent a roll receipt or bypass native Hope/Fear critical rules.
- A no-roll action may commit only when its prerequisites are established and the action is mundane/uncontested. Real restricted access, combat boundaries, distances, time, hazards, NPC control, cost and consent remain operative.
- Missing an ordinary location/NPC is usually an autonomous worldbuilding task, **not** a human approval gate. Creating a modest ordinary business or clerk is distinct from mutating canon.
- Every immediate executable intent has a **terminal or pending native disposition**, not just a model reason string or a repeated player declaration.

**Privacy, identity and history**

- Retain T05a's audience-aware writes and fail-closed reads. Never promote GM-private, player-private, character-private or recipient-private text into party/public records. Source ancestry must remain active and audience-compatible.
- Durable memory is scoped continuity, not automatic objective truth, player inventory, NPC observation, custody, consent or canon. Evidence and testimony retain epistemic labels and provenance.
- A named/targeted/actionable location or NPC, causally important object, pending reference, or recurring story anchor can be promoted to durable identity. Incidental rain, odors, anonymous crowds and throwaway details remain scene-only. Do not discard details while unresolved actions or downstream dependencies rely on them.
- Replay, network failure or Discord delivery failure cannot execute an action twice. Preview is rollback-only, consumes no RNG and publishes nothing. Commit emits stable receipts; outbox handles delivery retries without re-adjudication.

**Operations**

- Work only on `codex/typed-intent-refinement` (or an explicitly requested child branch); verify current HEAD and record SHA before edits.
- Never start/restart the live bot, deploy, alter `.env`, register Discord commands, or open/write production SQLite/`-wal`/`-shm` without explicit owner authorization. Use disposable fixture DBs; keep offline guards active.
- Preserve existing user data and schema compatibility. Migrations must be additive, versioned, reversible where feasible, and proven with a copy of fixture data. Do not silently delete older continuity records.
- No Python installer dependency. Existing Node.js/npm environment is sufficient.

---

## 3. Target lifecycle — exact meaning of “authoritative typed intent”

```text
AUTHENTICATED PLAYER MESSAGE  (player-authored words and agent/character authority)
  -> Immutable AuthoredTurnEnvelope (original text, offsets, provenance, audience)
  -> OpenAI semantic proposal (model confidence is advisory; no effects)
  -> SemanticIntentProposal[] (ordered clauses, explicit/non-action framing)
  -> Native acceptance and grounding (owner, source, actor, target, scope, meaning)
  -> AcceptedActionIntent[] (canonical adjudication INPUTS, not success)
  -> Rule arbiter (per-intent, dependency-aware, native state and saved rulings)
  -> Disposition[] (no-roll commit / roll pending / blocked / material clarify / non-action)
  -> Atomic receipts and scoped memory promotion
  -> Reconciled GM narration from verified disposition/state
  -> Durable, audience-scoped publication outbox
```

### 3.1 Data contracts to implement incrementally

**AuthoredTurnEnvelope v1** (immutable and independently persisted; captures what the human *actually* submitted):

```ts
type AuthoredTurnEnvelope = {
  envelope_version: 1;
  guild_id: string; session_id: string; scene_id: string;
  discord_message_id: string; source_event: string;
  actor_user_id: string; actor_character_id: string;
  control_role: 'owner' | 'authorized_proxy';
  audience: 'party' | 'player' | 'character'; subject_key: string | null;
  original_text: string; source_hash: string;
  principal_revision: string;
};
```

The envelope points to the **unchanged authenticated original**. If legacy native-span routing has removed text before the GM call, keep both the raw envelope and an explicit consumed-span ledger; never pretend trimmed/reassembled strings are the authoritative source. All spans and offset validation use the unchanged text. A committed native handler reports consumption/receipt, and a later GM pass may not re-execute it.

**SemanticIntentProposal v2** (model interpretation, inherently fallible; not mutation authority):

```ts
type SemanticIntentProposal = {
  intent_schema_version: 2;
  source_event: string;
  span_start: number; span_end: number; source_span: string;
  sequence_index: number; parent_action_id?: string;
  actor_ref: string; type: string; operation: string;
  framing: 'immediate' | 'conditional' | 'hypothetical' | 'quoted' | 'reported' | 'ooc';
  target: {kind: string; key?: string; phrase?: string; resolution: 'known'|'candidate'|'ambiguous'|'unknown'};
  destination_scope?: 'approach' | 'exterior' | 'interior' | 'local_zone' | 'none';
  exact_utterance?: string;
  preconditions?: Array<{kind: string; ref: string}>;
  explicitly_excluded_targets?: string[];
  proposed_disposition?: string; // advice only
};
```

Do not demand every optional field for every kind; use a closed, bounded union of per-intent variant schemas. An `ooc`/quoted item may be represented as a non-action or absent from executable intents, but should not be silently coerced to immediate. An actor-controlled NPC proxy must route to a permitted control lane, not implicitly acquire PC-owner authority.

**AcceptedActionIntent v1** (native validator's durable canonical **adjudication input**):

- Stable `intent_id = hash(envelope.source_event, actor, verified_start, verified_end, semantic_slot)`; an identical line repeated at two offsets produces two IDs. Idempotent retries produce the same IDs. `semantic_slot` must be stable across model retries; avoid using model array index alone as identity.
- `source_event`, `original_text_hash`, `span_start`, `span_end` and exact `source_span` reverified against the actual current envelope.
- `owner_user_id`, `actor_character_id`, `role_scope`, `session_id`, `scene_id`, `audience`, `target_key` and target identity revision.
- `status = accepted_for_adjudication`; `acceptance_basis` includes **what** permission was verified, not a model-generated assertion of success.
- A material ambiguity or apparent unauthorized escalation produces a **rejected / clarify** disposition. It never silently broadens the action to reach a valid-looking target.

**AdjudicationDisposition v1** (native ruling; no model-provided receipt):

```ts
type Disposition = {
  intent_id: string; source_event: string;
  status: 'resolved_no_roll' | 'committed' | 'roll_pending' |
          'blocked' | 'clarification_required' | 'non_action';
  rule_basis: {kind: 'RAW'|'saved_ruling'|'house_rule'|'homebrew'|'none'; refs: string[]};
  established_prerequisites: string[];
  blocked_reason?: string; clarification?: string;
  roll_request_id?: string; verified_receipts: string[];
  dependency_state?: 'satisfied'|'blocked'|'not_applicable';
};
```

The arbiter owns `status`, not the model. `roll_pending` requires a **real, persisted native roll request**; `committed` requires a native effect or valid no-effect completion receipt. `blocked` requires a verifiable rule/state obstacle, not merely model text. `clarification_required` is only for a material ambiguity that cannot safely be resolved from context. Conversational speech/observation can use a truthful no-effect or NPC interaction disposition; it must not be treated as a mechanical failure.

**ScopedMemoryCandidate / MemoryRecord**

- Candidate fields: `identity_kind`, `entity_key_or_proposed_identity`, `name/aliases`, `salience_reason`, `source_refs`, `source_span`, `epistemic_kind`, `audience`, `subject_key`, `retention = scene|durable`, `depends_on_intents`, `story_anchor_reason`.
- Native promotion checks causal relevance, source ancestry, audience compatibility, identity collisions, and outstanding dependencies. Retention is not a truth/ownership grant.
- A `memory_revision`, `supersedes`, `valid_from/to`, `location_scope` and `provenance` are needed for later corrections. Preserve earlier memories for audit and use the current valid version in retrieval.

### 3.2 Semantic acceptance is not a verb whitelist

Accepting a typed proposal means verifying its authenticated author, source, offsets, scope, actor, target and that the proposal **does not materially exceed the declaration**. Literal substring checks provide provenance, but cannot alone establish semantic fidelity. Codex should use contextual interpretation and bounded correction/clarification for uncertain overreach; keep invariant-specific native checks for operations involving access, consent, location, custody, money, resources, secrets and NPC control. No regular-expression allowlist of English movement/action words should determine whether an otherwise-grounded intent exists.

The engine must be able to answer: **Who authorized what? What was understood? Why was it accepted? Which rule applied? What receipt proves the result? What exactly was narrated and remembered to which audience?**

---

## 4. Ordered Codex work packages

Each ticket is a **separately reviewable commit series**, with a failing test first, a narrow implementation, green focused tests, a full offline run, and a dated entry in `docs/TYPED_INTENT_PROGRESS.md`. Do not silently roll a failed ticket into the next.

### T00.1 — Stabilize authority and full-suite compatibility (P0 — immediate, merge blocker)

**Goal:** Close the movement bypass, restore the baseline, and make source shape explicit without broad new behavior.

**Touch:** `bot/src/autonomous-world.js`, `bot/src/typed-intents.js`, `bot/src/gm.js` (fixture compatibility only if required), `bot/src/state.js`, `bot/scripts/autonomous-world-test.mjs`, `bot/scripts/production-regression-test.mjs`, `bot/scripts/relax-end-to-end-test.mjs`, and a new targeted security regression suite. Keep `bot/src/context-memory.js` T05a semantics intact.

**Implement:**

1. Record current git SHA, fixture dependencies and exact reproducible failing commands. Run the three known-red tests individually before edits. Capture provider-call counts and thrown errors; determine whether any failure occurs on all entry paths or only synthetic fixtures.
2. Remove the `!semantic && Array.isArray(narrative?.player_intents)` exemption from the authoritative movement path. For T00.1, require a matching **current, verified, source-backed `typed_intent` record** with `type=move` and immediate framing, not merely a model-authored `scene_actions.move` or `source_span` string. Keep its existing status/record contract for this stabilization ticket; **T01** adds the distinct native `accepted_for_adjudication` status. Distinguish current-turn moves from historical scene-entry revalidation.
3. Historical compatibility: implement an explicit `legacy_scene_entry` adapter that verifies the **previously persisted owner-authored source event, source text, session/scene, actor, target, current location, visibility and revalidation/expiry policy**. It can issue an adapter receipt and use native travel checks. It may **not** trust an omitted `player_intents` property. A generic narrative object lacking typed data must never get the adapter by default.
4. Ensure `target_key`, `target_name`, resolved native location and `scene_actions.entity_ref` agree; reject model target redirection when evidence is ambiguous or differs from the player's action. `approach/exterior` must not be auto-upgraded to `interior` by location state or model zone. A `blocked`/`roll_pending` intent cannot carry an executed move without a later native resolution.
5. Preserve bounded non-authoritative fallbacks only for genuine old *display/fixture* formats. If a live model omitted fields that strict schema requires, handle it as contract failure and correction, not as success. Synthetic tests should include the schema's required `player_intents`, `context_memories`, and other mandatory fields where they are testing unrelated recovery logic.
6. Diagnose recovery-call changes: keep the **one-call** optional post-turn-review quarantine behavior when no material or semantic failure exists. Do not change expected call counts to 2/3 without proving and explicitly approving a changed contract. Keep unsafe semantic proposals fail-closed even if this requires bounded correction.
7. Add a red→green test for a `scene_actions.move` on `I look around.` with `player_intents` **missing**, `[]`, `null`, or an observation-only intent. For all, no location mutation or world addition should survive a failed transaction.
8. Run `npm run validate` with offline guard. Record every failure, complete suite count and any environment limitation. Do not mark T00.1 complete while required tests are red.

**Pass gate:** No movement bypass; verified legitimate legacy pending entry still resolves; all three known failures repaired without weakened authority assertions; full offline `npm run validate` green. If the complete suite remains red for an unrelated reason, stop and document the blocker before T01.

### T01 — Immutable source envelopes, proposal and acceptance boundary (P0)

**Goal:** Accept meaning based on OpenAI context, with authoritative source and scope checks, separate from model suggestions.

**Touch:** `bot/src/index.js`, `message-span-ledger.js`, `typed-intents.js`, `narrative-context.js`, `gm.js`, `state.js`, `turn-attempts.js`, `conversation-principal.js`; add versioned intent-contract and fixture tests.

**Implement:**

1. Persist versioned immutable source envelope from the original Discord message **before** any native span consumption. Keep exact offsets and audience scope. Do not regress channel routing, explicit mention preferences or authorized NPC proxy controls.
2. Distinguish these native lifecycle states explicitly: `proposed` → `source_validated` → `accepted_for_adjudication` → `awaiting_native_resolution` → `resolved/blocked/clarification_required` (with concrete outcome receipt). Model output cannot write a later status.
3. Introduce `acceptTypedIntent(envelope, proposal, resolvedContext)` returning either an accepted record with `acceptance_basis` or a *typed rejection requiring correction/clarification*. It validates ownership, source offset/span, framing, actor/proxy limits, target, scope, current session and known source revisions. This is not a regex action parser.
4. Normalize same-turn repeated identical utterances using verified offsets and stable semantic-slot IDs. A repeated sentence at two positions is **two distinct actions**; identical retry or reordered model output must never apply twice.
5. Preserve consumed native-mechanical spans via a receipt-linked ledger. A mixed message can run its authorized native part and forward unconsumed roleplay **with their original offsets**, preventing a roll/spend from rerunning in the GM pass.
6. Require model-proposed intent coverage for material action clauses, but validate against authenticated source and narrative context; allow ordinary expressive roleplay to have non-action classification without fabricated intent. Fail/repair cases of substantial omitted action content, especially compound sentences.
7. Make `gm.js` report proposal-vs-accepted counts and accepted source spans in bounded GM-only diagnostics. A source-span match is not a blanket semantic approval; ambiguity or overreach is narrowed/corrected instead of silently escalating authority.
8. Keep T05a memory privacy and `context_memory` exclusions unchanged. No new world/mechanical effects in this ticket.

**Pass gate:** Original-text source offsets valid across punctuation, emojis, Markdown, quotes and native-span processing; cross-owner/proxy rejects; repeated spans deterministic; semantic overreach prevented; no change to native effects yet; all offline tests green.

### T02 — Convert legacy phrasing gates to typed adapters (P0/P1)

**Goal:** Language is interpreted by semantic type and context, not by a fixed phrase inventory.

**Touch:** `bot/src/player-language.js`, `movement-language.js`, `location-language.js`, `scene-entry.js`, `roll-language.js`, `consent-language.js`, `message-span-ledger.js`, `authored-candidates.js`, `dialogue-continuity.js`, `gm.js`, `index.js`.

**Implement:**

1. Inventory each remaining export/import and classify as **a)** cheap non-authoritative routing hint, **b)** semantic parsing gate, **c)** native irreversible authorization. Only category **b** is removed/replaced; category **c** remains native but consumes typed explicit authorizations rather than arbitrary freeform regex templates.
2. Convert movement, local zones, searches, looks, NPC dialogue, props, invitations and scene entry to `AcceptedActionIntent`. Freeform speech is copied exactly from the player with validated source offsets. Lexical handlers must not override or veto accepted semantic intent.
3. Keep `/commands` and explicit native roll/consent identifiers supported. For natural-language consent/spending, require the principal's **unambiguous affirmative act toward current exact terms, payee, amount, recipient, and revision**; model interpretation alone never satisfies this. If ambiguous, use nonbinding offer/counteroffer/clarification, not resource spending.
4. Make existing `location-language.js` an **identity resolution** service (names, aliases, visible source refs, deictic referents, cardinality), not a phrase parser; separate identity resolution from legal movement and access.
5. Maintain backward compatibility for old source/events with read-only historical adapters and deprecation warnings; count runtime uses before deleting exports. No historic record upgrades merely because its text happens to resemble a current phrase.

**Pass gate:** “I bolt”, “I make for”, “we head over”, third-person character prose and pronouns behave consistently with explicit player intent; hypothetical/quoted/OOC do not mutate; consent and roll resource checks remain exactly-once; no English verb whitelist remains a state-mutation gate.

### T03 — Complete native Daggerheart and action arbitration (P0)

**Goal:** Every accepted executable intent gets a real, rule-supported disposition; model `resolution` is advisory only.

**Touch:** `bot/src/rules-arbitration.js`, `typed-mechanics.js`, `roll-requests.js`, `roll-collaboration.js`, `ai-intents.js`, `owner-consent.js`, `state.js`, `turn-orchestration.js`, `gm.js`.

**Implement:**

1. Define a registry of native adapters for `move`, `local_zone`, `observe`, `search`, `interact`, `speak`, ordinary `use/take/offer`, `roll`, `help`, `experience`, `tag-team`, `damage`, `consent` and supported tactical/scene mechanics. Unsupported consequential types must return an explicit *unsupported rule/clarify* disposition, not an invented success.
2. Each adapter accepts only an `AcceptedActionIntent` and the current authoritative scene, rules and actor scope; it returns a **previewable decision** and a deterministic commit operation when possible.
3. Implement exact pre-roll contracts: rules/saved ruling basis, difficulty, traits, modifiers, stakes, participants; a real native pending request is the only basis for `roll_pending`. Never fabricate Hope/Fear dice or execute RNG in preview.
4. Authorization for Hope, Stress, resource costs and other binding choices must be independently verified against an authenticated current owner declaration and exact pending request/terms; model-type `consent` cannot spend. Preserve revision checks, controls and collaboration eligibility.
5. Separate `blocked` (actual access/encounter/state/rule obstacle), `clarification_required` (material ambiguity), `roll_pending` (native request ID exists), `resolved_no_roll` (truthful ordinary completion), and `committed` (receipt exists). Do not accept `reason` strings alone as evidence.
6. Prove preview/commit eligibility equivalence with deterministic fixtures, excluding RNG sampling itself. Revalidate state revision at commit; roll exactly once, record operation key, publish only after the transaction.
7. Ensure failed native adapter leaves independent subactions eligible and does not cause duplicate costs/dice upon retry or publication recovery.

**Pass gate:** No model-only mechanical outcomes; preview consumes zero RNG; one native roll per authorized source/operation; verified request or legitimate obstacle for every mechanically pending/blocked state; native critical and resource rules preserved; all offline tests green.

### T04 — Sequential worldbuilding, movement, props and NPC interactions (P1)

**Goal:** Allow Veilkeeper to progress naturally through compound actions, building ordinary fiction and resolving dependencies in order.

**Touch:** `bot/src/autonomous-world.js`, `typed-intents.js`, `scene-continuity.js`, `scene-entry.js`, `location-language.js`, `entity-memory.js`, `dialogue-continuity.js`, `npc-cognition.js`, `gm.js`, `state.js`.

**Implement:**

1. Build a dependency graph from accepted intents, e.g. `create/reuse shop` → `arrive at shop` → `enter accessible interior` → `approach clerk` → `speak` → `clerk reacts`. Do not commit downstream effects when a prerequisite genuinely fails; unrelated actions may proceed.
2. Distinguish `approach(exterior)`, `enter(interior)` and `local_zone` with native location/zone updates. Do not allow a nearby business to teleport the PC across a city map or bypass locks/encounter action economy.
3. New ordinary locations and NPCs are created only when needed for action/revisit relevance and verified for collisions, visibility, adjacency and plausible ordinary status. Reuse existing identities before creating duplicates. Canon/conflict review is reserved for genuine authoritative contradictions.
4. An object like a **help-wanted sign** is initially descriptive; picking it up does not confer inventory ownership. If it is manipulated, taken, broken, kept, used as evidence or referenced later, promote it to a stable prop identity with appropriate custody/evidence handling only through native mechanisms.
5. Split speech into separate source-backed utterance IDs (one per action offset), not just message ID; record only actual listeners with scene/audio access **after** movement and NPC introduction. Never write memories for offscreen listeners or speak for active human NPC proxies.
6. Produce a native per-action disposition ledger and dependencies before narration. The AI narrates results that are supported by receipts; players are not forced into a second turn merely to complete an unobstructed movement or NPC response.

**Pass gate:** Billy's entire `enter shop → handle sign → approach clerk → say exact words → clerk responds` sequence progresses in one turn wherever each prerequisite is supported; Tyrell's `bolt toward Twenty-Four Spin` stays exterior unless player explicitly enters; blocked subaction does not erase or fabricate the others; no duplicate NPC or dialogue history.

### T05b — Memory identity, revision, retrieval and lifecycle (P1)

**Goal:** Finish memory design **without reopening T05a privacy**.

**Touch:** `bot/src/context-memory.js`, `entity-memory.js`, `memory-clusters.js`, `scoped-query.js`, `autonomous-world.js`, `epistemic.js`, `npc-cognition.js`, and additive DB schema/migration files only if necessary.

**Implement:**

1. Keep T05a's surface-specific provenance and fail-closed read policy unchanged as a baseline. Add native memory identity using `kind + scoped location or entity ID + audience + owner source`, plus explicit aliases and collision handling. Two different “Back Door” objects in separate locations cannot silently merge.
2. Introduce `scene_only → candidate_for_promotion → durable` when causal anchors arise: the player names/targets/uses it, it is actionable/revisitable, it becomes a consequential clue/prop, or the GM flags an evidenced recurring anchor. **Salience is a proposal; native retention policy decides**.
3. Add revised/superseded/retired memory states rather than returning an outdated `prior` unconditionally. Changes must reference what source supersedes the old description and which audience is allowed to know the correction.
4. Temporary context expires at scene/clock boundaries, except when referenced by an outstanding action, open scene entry, pending NPC conversation, roll, evidence, possession or other durable dependency. TTL is an optimization, not permission to lose active continuity.
5. Retrieval should rank by scene, entity/reference overlap, pending action, participant, recency and source authority, and include old important anchors within bounded token limits. Provide transparent omission counts for GM diagnostics. Keep character-private information out of party narration/model data; no GM-only source accidentally turns into NPC knowledge.
6. Legacy rows lacking the T05a audience marker remain inaccessible by default. Any migration must establish trusted original source provenance and exact audience; otherwise archive/quarantine, **never infer visibility from a loose name or current user**.
7. Facts, rumors, suspicions, testimony, actual observations, narrator flavor, player knowledge and canon must remain distinguishable. Durable identity does not confer objective truth or possession.

**Pass gate:** Cross-player/character leakage fixtures still green; distinct same-name props resolve correctly; corrected details supersede but do not erase audit history; temporary memory expires only when safe; retracted source invalidates derived retrieval; pending significant details survive scene transitions.

### T06 — Mandatory GM narrative/outcome reconciliation (P1)

**Goal:** Turn completion means something actually happened (or a real, legible reason why it did not).

**Touch:** `bot/src/gm.js`, `typed-intents.js`, `rules-arbitration.js`, `narrative-integrity.js`, `turn-recovery.js`, `turn-orchestration.js`, `publishing.js`, `publication-outbox.js`.

**Implement:**

1. Require an adjudication disposition for each accepted immediate material intent. A model-generated `resolution='blocked'`, `roll_required`, or a nonempty narration field does not count as proof of completion. Validate disposition ↔ native receipt ↔ narrative claims.
2. Distinguish `attempted`, `committed`, `blocked`, `roll_pending`, `non_action`, `clarification_required`, `delivery_failed`. Player-facing narration must not claim a future pending roll was resolved or an uncommitted move already happened.
3. On any failed action, run a bounded corrective pass that preserves valid independent subactions and source spans; do not silently replace an entire turn with `scene_actions=[]` and repeated “declaration unresolved” when some steps could commit.
4. Narration should include the NPC response when a non-proxied NPC is present and able to answer, without requiring a follow-up input. Never fabricate PC speech or private facts to keep a scene moving.
5. Commit validated state and reconciliation metadata atomically; queue audience-scoped narration in an outbox. On Discord delivery failure, replay the outbox without rerolling or reapplying effects.

**Pass gate:** Full-action completion coverage for Tyrell, Billy, player dialogue, ordinary searches and compound actions; material narration supported by receipts; no false success/arrival/consent; retry idempotence and scope preservation.

### T07 — Decommission obsolete phrase authority carefully (P1/P2)

**Goal:** One semantic action pipeline, without breaking legacy saves or commands.

**Touch:** All `*-language.js` consumers, old scene-entry/declaration readers, `authored-candidates.js`, test fixtures, README/architecture documentation.

**Implement:**

1. Produce a full import/call graph and classify each remaining parser: compatibility, non-authoritative hint, identity resolver, or native explicit authorization. Never remove rules/consent security because its file name ends in `-language`.
2. Remove any **authoritative** movement/action phrase pattern from the normal player path once typed coverage and performance are demonstrated. Keep explicit format-specific interfaces (`/commands`, owner consent IDs) where native exact terms matter.
3. Deprecate unused exports and records with versioned readers; avoid destructive schema updates and preserve replay. Add warnings/metrics for fallback use; after zero legitimate use under tests, remove dead code in small commits.
4. Document the authority chain, privacy surfaces, ordinary world-memory policy and operator diagnostics.

**Pass gate:** Normal roleplay uses typed intent for action meaning; explicit consent/roll legality stays native; no legacy fallback grants world mutation solely because a typed field is missing; all offline tests green.

### T08 — Release hardening, evaluation and merge (P2)

**Goal:** Measure correctness, false positives, security and cost before deployment.

1. Restore/maintain full `npm ci`, `npm run check`, `npm run validate`, unit/integration suites with offline guard. CI must publish green status on the exact branch commit proposed for merge.
2. Evaluate ≥60 curated fixtures across phrasing, context, negation, pronouns, repeated clauses, multiple PCs/proxies, environments, rolls, consent, memory scope, hidden evidence and restart/replay. Count false execution, missing action, unnecessary clarification, roll duplication, NPC knowledge leakage, continuity loss and output-delivery recovery.
3. Add instrumentation: source ID, proposal count, accepted/rejected intents, per-intent status and native receipt ID, correction count, memory promotion/revision reason, retrieval omissions, audience-scope assertion outcomes, and approximate model tokens/calls. Never log private content into public telemetry.
4. With explicit operator authorization only, perform a staged live-model evaluation on a disposable campaign and bounded API budget; label it separately from offline fixture results. No production bot deployment or database changes as part of automated acceptance.
5. Review schema migration/backup/rollback, privacy/canon/consent invariants, and docs. Merge only after all hard gates below pass.

**Pass gate:** No known P0/P1 authority or audience failures; full CI green; explicitly measured semantic coverage and human-review of failure samples; clean rollbacks; operator approves staging/deployment separately.

---

## 5. Must-have regression matrix (add, do not delete existing fixtures)

Every case should assert: exact authored source; accepted typed intent or justified non-action; correct actor/target/audience; native disposition and receipt when applicable; committed world state; no unauthorized side effect; no duplicate action on replay; truthful narration. Negative cases must verify **state rollback** (not merely a thrown exception).

| ID | Scenario | Required invariant | Target phase |
|---|---|---|---|
| SEC-01 | `I look around` with forged `scene_actions.move`, no `player_intents` field | Reject; no arrival/entity saved | T00.1 |
| SEC-02 | Same forgery with `player_intents: []` / `null` / `observe` | Reject; no arrival | T00.1 |
| SEC-03 | Typed `move` says target A, `scene_actions` points to B | Reject target redirection | T00.1 |
| SEC-04 | Player says `approach the door`, model emits `enter interior` | No unintended interior entry | T00.1/T01 |
| SEC-05 | Player says `I consider going inside` | No movement | T00.1/T01 |
| SEC-06 | Quoted `"I enter the store"` in reported speech | No movement | T00.1/T01 |
| SEC-07 | Movement declared by wrong character/user/proxy or stale role revision | Reject | T00.1/T01 |
| SEC-08 | Old pending entry has valid saved source and current scene | Explicit legacy adapter, native checks | T00.1 |
| SEC-09 | Historical entry source is expired, revoked or mismatched | Reject, no implicit reauthorization | T00.1 |
| REG-01 | Optional state-review mismatch, otherwise valid old fixture | One GM call via optional quarantine | T00.1 |
| REG-02 | RELAX ordinary scene turn, model fixture uses current structured schema | No avoidable extra paid retry | T00.1 |
| REG-03 | Whole offline validator | Green before T01 | T00.1 |
| INT-01 | `I bolt from the shadows toward Twenty-Four Spin` | Exterior approach with ordinary native travel | T01/T04 |
| INT-02 | `I make for the Spin`, `Tyrell crosses to its entrance` | Same contextual move, no verb whitelist | T01/T02 |
| INT-03 | `I walk past the cafe`, not `enter` | No accidental interior entry | T01/T02 |
| INT-04 | `Not Hollow Street; find an open place in the shade` | Honor exclusions semantically | T01/T02 |
| INT-05 | Contextual `I go there` with one visible referent | Resolve exact target | T01/T02 |
| INT-06 | `I go there` with two equally plausible referents | Material clarification only | T01/T02 |
| INT-07 | Same authored sentence appears twice at different offsets | Two distinct source IDs when genuine | T01 |
| INT-08 | Same model result retried/reordered | Stable intent IDs; one commit | T01 |
| INT-09 | Markdown, apostrophes, unicode quotes, emoji, punctuation | Original source offsets exact | T01 |
| INT-10 | Multiple characters in a message, role ambiguity | Never choose an unauthorized actor | T01 |
| INT-11 | `If it is open, I will go in` with unknown condition | Not immediate unconditional entry | T01 |
| INT-12 | `I offered yesterday` and `Someone said I entered` | Reported history, no current effect | T01 |
| MIX-01 | `I roll ... and ask the clerk ...` | One native roll + surviving speech | T01/T02/T03 |
| MIX-02 | Explicit mechanical operation already consumed by native span handler | GM cannot replay spend/die | T01/T03 |
| MECH-01 | Roll needed for rooftop-to-truck jump | Real rule basis, Difficulty, modifiers, stakes, request | T03 |
| MECH-02 | Native roll preview executed repeatedly | Zero random draws until commit | T03 |
| MECH-03 | Roll commit then Discord publish failure | One roll, outbox resend | T03/T06 |
| MECH-04 | `I consider spending Hope` | No spend | T03 |
| MECH-05 | Offer/money/consent ambiguous or terms revised | No inferred agreement/payment | T03 |
| MECH-06 | Duplicate confirmation/replay same source | Exactly one binding operation | T03 |
| MECH-07 | Human NPC proxy is present | GM cannot commandeer proxy | T03/T04 |
| MECH-08 | Locked/warded/distant destination | Real block/travel rule rather than teleport | T03/T04 |
| WORLD-01 | Newly generated ordinary copy shop named as actionable lead | Persist/reuse stable place | T04 |
| WORLD-02 | Billy enters, handles sign, approaches clerk, speaks | Ordered receipts and natural clerk response | T04/T06 |
| WORLD-03 | Stop at shop exterior, look through window | No interior/possession mutation | T04 |
| WORLD-04 | Two separate utterances in one message | Two speaker events/actual listener evidence | T04 |
| WORLD-05 | NPC not in same scene / not hearing / human-controlled proxy | No invented NPC memory or forced reply | T04 |
| WORLD-06 | A blocked sign-taking attempt followed by independent spoken question | Continue safe independent step | T04 |
| MEM-01 | Private recipient detail present only in private message | Never create party memory | Preserve T05a |
| MEM-02 | Same human operates another character | Character-private memory does not follow user | Preserve T05a |
| MEM-03 | Recalled active source retracted | Derived memory not retrieved | Preserve T05a |
| MEM-04 | Legacy unmarked memory record | Fail closed; no implicit widening | T05b |
| MEM-05 | Two objects named `Back Door` in two buildings | Distinct stable identities | T05b |
| MEM-06 | Sign changes from HELP WANTED to CLOSED | Revised memory supersedes previous | T05b |
| MEM-07 | Rain / unidentified pedestrians, no story use | Scene-only, expire | T05b |
| MEM-08 | Unnamed object becomes targeted, evidence or recurring hook | Promote with source/custody boundaries | T05b |
| MEM-09 | Private rumor vs verified clue | Epistemic distinction and scope | T05b |
| MEM-10 | Ongoing scene entry references a temporary named item | Hold until dependency resolved | T05b |
| MEM-11 | Private character memory requested in party turn | No party prompt leakage | T05b |
| NAR-01 | Move has no native action, narration claims arrival | Reject or correct narration | T06 |
| NAR-02 | `blocked` model reason with no real obstacle | Reject/demand real disposition | T06 |
| NAR-03 | `roll_required` without persisted roll request | Reject false pending roll | T06 |
| NAR-04 | Consequential interaction resolved, GM repeats declaration only | Reject incomplete turn | T06 |
| NAR-05 | Native partial commit blocked dependency + unrelated valid action | Preserve valid receipt and truthful summary | T06 |
| NAR-06 | Discord output failure after commit | Do not rerun effects; outbox delivery | T06 |

**Expansion rule:** These 55+ cases are a floor, not a claim of live-model coverage. Add negative cases whenever a code path discovers an additional authority-bearing assumption. Offline mocks test deterministic policy; separately measure model interpretation with authorized staging before release.

---

## 6. Review gates and evidence required from each Codex ticket

Every ticket report in `docs/TYPED_INTENT_PROGRESS.md` must include:

1. Commit/base SHA, changed files, phase identifier, and unchanged invariants.
2. Reproduced red test(s), before/after observable state, and proof that a new test actually fails without the fix.
3. Native-effect diff, DB schema/migration diff (if any), source/audience implications, and rollback plan.
4. Exact shell commands run and pass/fail/skip counts, including `npm ci`, `npm run check`, focused suites and `npm run validate` (or precise environment blocker).
5. Per-action receipt examples and evidence that `previewAuthoritativeMutation` does not consume RNG or commit.
6. Negative authorization/memory test results, fixture compatibility and any intentionally unchanged historical behavior.
7. Remaining blockers and the **single next phase recommended**; no unsupported “full validation passed” claims.

**Hard gates before any merge:**

- Full offline test suite green at the exact proposed commit; no skipped security tests.
- SEC-01 through SEC-09 green; no missing typed-intent authorization path.
- No player agency, consent, resource, NPC proxy, private knowledge or canon violations.
- No model-only roll, spending, arrival or mechanical decision without native receipts.
- T05a privacy regression unchanged and green; no unproven legacy memory visibility promotion.
- Replay and publication failure are idempotent; no preview RNG.
- No production deployment, DB edit or paid live evaluation undertaken without separate explicit approval.

---

## 7. Developer workflow for Codex CLI (Windows)

From the checked-out branch:

```powershell
cd 'D:\Library\Veiled City'
git status --short
git branch --show-current
git rev-parse HEAD
cd bot
npm ci
npm run check
node --import ./scripts/offline-guard.mjs scripts/production-regression-test.mjs
node --import ./scripts/offline-guard.mjs scripts/relax-end-to-end-test.mjs
node --import ./scripts/offline-guard.mjs scripts/autonomous-world-test.mjs
node --import ./scripts/offline-guard.mjs scripts/memory-audience-isolation-test.mjs
npm run validate
```

Run fail-red tests before patching and fail-green tests after. Use source or lightweight in-process fixture DBs, never the production store. Ensure no untracked `.env`, database or secret is accidentally staged. Codex must commit only reviewed scope for the current ticket. Do not cherry-pick/unconditionally overwrite with an older full-source ZIP or reset to the historical upstream SHA: **the branch contains the modified v10 baseline and completed T05a privacy work.**

### Sequencing and stop rules

1. **First task:** T00.1 only. Do not start T01 until the full offline baseline passes and SEC-01–SEC-09 prove the authority bypass closed.
2. **Second task (separate review):** T01 only. Secure proposal/acceptance schema and source ledger; do not expand native effects until T01 tests pass.
3. Continue T02, T03, T04, T05b, T06, T07, T08 as independently accepted increments. Revisit order if a dependency requires a narrow prerequisite, but preserve every ticket's isolation and acceptance criteria.
4. If source changed since reviewed SHA, compare commits, rebase/reconcile deliberately, and update the progress report before editing. Never assume this plan's line numbers or snapshot are eternally current.
5. If a test reveals an authority/privacy regression, **stop expansion** and fix it before additional features. If an API/Discord integration lacks offline fixtures, add test scaffolding rather than testing on a live campaign.

---

## 8. Ready-to-paste Codex kickoff instruction

```text
You are continuing Veiled City v10 typed-intent work on codex/typed-intent-refinement.
Read CODEX_TYPED_INTENT_BRANCH_PLAN_v3.md and docs/TYPED_INTENT_BASELINE.md,
docs/TYPED_INTENT_CONTRACTS.md, docs/TYPED_INTENT_PROGRESS.md.

Check branch status and HEAD first. This plan reviewed commit
7786d560c9d69483684692e039c6ce27d8da13e4; compare if newer.
Preserve T00 and the completed T05a memory-audience security fix.

IMPLEMENT T00.1 ONLY in this run:
- Reproduce the three documented baseline failures.
- Close all scene movement acceptance paths when player_intents is absent,
  empty, invalid, or not a verified, source-backed immediate move. Keep a separately
  authenticated, source/scene/target-bound legacy pending-entry adapter.
- Add negative cases for observation-as-movement, approach-vs-enter,
  quoted/conditional statements, mismatched targets, wrong principal,
  stale source, rollback and replay.
- Restore the one-call optional review recovery fixtures and the full
  offline suite without weakening authorization or merely increasing
  accepted retry counts.
- Run focused suites and npm run validate. Update
  docs/TYPED_INTENT_PROGRESS.md with exact results and commit SHA.

Authority: Authored player intent > fallible model proposal;
validated typed intent = canonical adjudication input only;
native rules/receipts = authority for outcomes;
scoped memory/narration = evidenced representations, not new authority.

Do not start T01 or T02 in this run. Do not launch/deploy the bot,
run paid OpenAI calls, or touch production data/secrets. Stop and report
any blocker instead of declaring success or skipping a failed test.
```

---

## 9. Completion criteria for the whole initiative

Veilkeeper can understand unrestricted everyday character language, preserve exact actor/intent boundaries and semantic context, adjudicate freeform/compound actions correctly, invent reasonable ordinary scenery/people without bogus human approval, persist only significant audience-correct continuity, and narrate verified outcomes without stalling at declarations. Player agency, Daggerheart rules, canon, secrets, consent, rolls, custody, native receipts and exactly-once semantics remain stronger than the model's interpretation.

**Explicit non-goals:** making model interpretation canon; automatically executing hypothetical actions; granting arbitrary inventory ownership; silently exposing secrets; turning every noun into a permanent table; rewriting legacy records without a source-backed migration; eliminating legitimate native mechanical/consent gates; deployment without operator approval.
