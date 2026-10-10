# Veiled City v10 — Typed Intent, Rules, Memory and Multi-Actor GM Refinement (Codex Plan v5)

**Repository:** https://github.com/KeshireTheChaotic/Veiled_City
**Development branch:** `codex/typed-intent-refinement`
**Inspected HEAD:** `0e770f6c60de2546a561340dd16149a6b0e9df3c` (2026-10-10)
**Comparison base:** `main` / `6c3167dbbf015739e1723272121552d60b9f2ec8`; branch four commits ahead, zero behind at inspection
**Application:** Veiled City / Veilkeeper bot v10.0.0
**Plan version:** v5; replaces v4 for *future* work. Preserve older plans as historical context.
**Goal:** Free-form player intent → semantic GM understanding → source-backed accepted intents → setting- and rules-grounded arbitration → native Daggerheart/house-rule outcomes → reconciled narration → audience-scoped durable memory. Support multiple actions and competing players without inventing player consent, fictional success, or simultaneous history.

> **Plan, not implementation:** This document is an instruction set for Codex. No changes have been made to this repository by generating it. Codex must verify the working branch and current code again before edits; if HEAD has advanced, reconcile the plan with the actual diff and progress ledger rather than resetting work.

## 0. Actual branch state and decision

At the inspected HEAD:

| Ticket | Status | Evidence / caveat |
|---|---|---|
| T00 — baseline/source inventory | **Done** | `docs/TYPED_INTENT_BASELINE.md`; initial test report |
| T05a — audience-isolated descriptive memory | **Done** | `bot/src/context-memory.js`; `bot/scripts/memory-audience-isolation-test.mjs` |
| T00.1 — movement authority stabilization | **Done** | `docs/TYPED_INTENT_PROGRESS.md` reports commit `c5242a490183d70f8d9d15b8bcbb716b85075b4c`, verified legacy adapter and 76/76 offline suites passing |
| T01 through T08, including **new T04.1** | **Not started** | progress ledger explicitly marks the next ticket as T01 |

The prior v4 plan called T00.1 the next step. **That is now obsolete. Start at T01**. The 76/76 result is a **branch-reported** validation result, not a claim that this plan author reran it locally. Require Codex to re-run the baseline before editing.

**Current source facts that constrain the design:**

- `bot/src/typed-intents.js` currently uses `player_intents[]` with exact string spans and `status=interpreted`; it has no first-class proposal/acceptance lifecycle, source offsets, outcome-claim metadata, causally linked subactions or cross-actor conflict references.
- `bot/src/autonomous-world.js` now requires a verified current typed movement or specifically revalidated `legacy_scene_entry_adapter`. **Preserve T00.1 fail-closed behavior.** It still includes a lexical prefix guard and a `worldRequirements` fallback for some non-movement flows.
- `bot/src/message-span-ledger.js` splits at literal punctuation, pronouns and movement verbs, before the GM sees the remaining text. That is not sufficiently robust for semantic compound actions; do not discard or erase native-consumed source offsets.
- `bot/src/rules-arbitration.js` currently has a narrow sourced adjudication envelope and a movement helper. `bot/src/roll-requests.js` and `bot/src/roll-collaboration.js` have more substantial but explicitly authenticated native roll/collaboration controls.
- `bot/src/turn-orchestration.js` atomically applies one GM mutation bundle and executes typed native rolls only at final commit. There is not yet a shared-scene action-window coordinator with multi-actor revision/conflict handling.
- `bot/src/context-memory.js` enforces T05a provenance/audience isolation; `bot/src/entity-memory.js` makes a coarse name-based durable/ephemeral selection. Same-named objects and superseded descriptions need an explicit lifecycle.
- Existing `docs/RULES_GROUNDING.md` and `docs/RULES_ONLINE_SRD.md` describe the current rules desk, local SRD references, house rules and provisional rulings. Their documented precedence must be reconciled with **actual explicit override semantics** before writing the T03 arbiter. Do not silently flip rule priority based on an unsupported assumption.

**Mandatory strategy:** One independently verifiable ticket at a time. Complete, test, commit and document each ticket before continuing automatically to the next. Do not require user approval between successful phase gates. Stop on unresolved safety, authorization, irreversible migration or failed-test blockers; never claim blocked phases complete.

## 1. Binding product behavior and authority boundaries

### 1.1 The authority chain

```text
Authenticated player-authored message(s) with preserved raw text, control scope and scene provenance
  → OpenAI semantic proposal(s), including actor, action, exact source offsets, claimed outcome, timing/dependencies
  → Native source/actor/referent/framing acceptance (CANONICAL ADJUDICATION INPUT — not a success)
  → Rule arbitration (grounded Daggerheart SRD, house-rule overrides, saved rulings, fictional state)
  → Native no-roll / executable roll request / blocked / conflict-pending / material clarification
  → Atomic, exactly-once receipts for actually resolved outcomes; pending actions persist without fictional success
  → GM narration derived from verified receipts plus permitted setting lore and epistemic perspective
  → Scoped continuity with source ancestry, significance, corrections, expiry and separate canon/knowledge boundaries
```

An AI proposal is not an action. An accepted intent is **not** a completed action. A model's `resolution="auto"` or narrated past tense is **not** a receipt. Human-authored declarations authorize only the player's voluntary attempted action within actual control, never an impossible outcome, another player's decision, GM-only information, resource expenditure without required explicit authority, or future commitments.

### 1.2 Player-authored claimed outcomes — always distinguish attempt from success

Extract and retain `attempted_action`, `desired_outcome` and `authored_outcome_claim` separately. `claimed_by` is the actual speaker and `claim_status` begins `unverified`. A player can narrate confidently or in past tense; such prose may communicate what they *want* to have happened. It does not establish combat damage, undetected entry, stolen inventory, an NPC's agreement or discovered secrets. Check a pre-existing native receipt when the player accurately recounts earlier success; acknowledge it without rerolling. Do **not** force dice because of successful-sounding language. Difficulty and stakes come from fiction and governing rules.

Examples:

| Player declaration | Native interpretation / response |
|---|---|
| “I sit on the bench.” | No meaningful risk: commit a no-roll action if access and timing permit; narrate sitting |
| “I glide unseen past the guards into the vault.” | Attempt stealth + desired unnoticed entry; apply risk, access and roll/consent gates before asserting arrival |
| “I tell the clerk I accept the offer.” | Authenticated speech; binding agreement requires applicable explicit offer/term/consent verification |
| “I slam the door and lock it before she enters.” | Door mutation competes with another character's possible action; scene revision/conflict checks first |
| “I found the hidden ledger yesterday.” | Retrospective assertion; require previously verified evidence or mark as testimony/claim, not newly established possession |
| “I cut the vampire's head off.” | Intended attack/result; native combat/target, damage and consequence workflow decides whether the result happens |

### 1.3 Rule selection and world/lore grounding

The **AI GM chooses** whether a check is needed, the relevant fictional capability and rule, situational Difficulty, modifiers, participants, and stakes; this is explainable *adjudication*, not a hardcoded verb-to-check table. It must quote/source applicable saved rulings, explicit Veiled City exceptions, house/homebrew rules, and local/official Daggerheart SRD materials where available. The **native engine validates** the selection's authority, verifies capabilities and current state, creates/executes native rolls, applies Hope/Fear/critical/resource semantics, and commits effects. When neither supported RAW nor a documented override resolves an unusual situation, issue a visibly provisional GM ruling, bounded by ordinary safety/consent rules; never invent a RAW citation or fake roll.

The repo's rules-desk documentation currently lists an order that may not express explicit house-rule overrides cleanly. During T03, inspect implementations and record a single, tested *conflict-resolution algorithm*: saved scoped ruling if applicable; exact explicit campaign override where applicable; otherwise verified SRD RAW; compatible house/homebrew extensions; identified provisional ruling as fallback. Preserve any intentionally stronger existing manual review requirements, particularly those in `roll-requests.js` and `roll-collaboration.js`, unless changed through an explicit reviewed authorization design. A rule change is not implicitly approved by this document.

### 1.4 Multiplayer/consent, temporal order and agency

- A Discord timestamp/order is **not** proof of in-fiction initiative or simultaneity. Nor is a wall-clock threshold (e.g. “within five seconds”).
- Fictional timing comes from a declared/GM-opened **scene beat/action window**, spotlight, outstanding rolls and source-backed dependencies. An already committed action cannot be retroactively erased because another message arrives later.
- Independent compatible actions may resolve separately; incompatible changes to one door, item, route, NPC obligation, location, attack target or limited opportunity require a shared conflict arbitration before *either competing irreversible effect* commits.
- Owner or properly assigned NPC-proxy authority never transfers between users. Direct PC-vs-PC conflict and unwanted control of another PC must follow the applicable Daggerheart/Veiled City consent and safety requirements. The GM cannot decide another player's voluntary reaction, consent, speech, emotions or resources.
- Reactions, cooperative Help/Group/Tag Team and opposed tests must follow verified rules and existing native collaboration contracts; do not manufacture a generic PvP algorithm if the SRD gives a more specific treatment.
- Multiple submitted actions from one PC have causal ordering; one failure can invalidate dependent actions without discarding unrelated ones. Shared-scene conflicts require causal/revision checks at the *commit* boundary, not only an AI summary.

### 1.5 Privacy, permanence and operational invariants

- T05a audience binding remains fail-closed: party/public narration cannot acquire character/private/GM-only details; retrieval checks exact audience plus active source lineage; NPCs only learn by native witness/delivery evidence.
- An important named, addressed, consequential or recurring person/place/object may become persistent scoped continuity when source-backed. A temporary scent, rain, anonymous bystander, or disposable decor need not. Memory != canon, inventory, custody, an NPC's knowledge or proof of a player outcome.
- Every action has stable identity and single-use finalization across retries, process restarts, duplicate Discord delivery, concurrent handlers and network/publication failures.
- Previews never spend resources, roll dice, emit messages or permanently mutate state. Use fixture databases, no production `.env` or SQLite/WAL access. No bot start, deployment, remote migration, Discord command registration or paid-model calls unless independently authorized.
- Do not weaken tests to get a green suite. Schema migration must be additive, source-backed and safe for old sessions; preserve `legacy_scene_entry_adapter` receipts and old records.

## 2. Target persisted contracts (evolve incrementally; use JSON-schema strictness)

The following names are **design contracts**, not claims that modules already exist. Codex may integrate these with existing database record kinds rather than create a duplicate persistence stack; document any alternate shape.

```ts
// Exact untouched original player message: ownership and offsets can be checked natively.
type AuthoredTurnEnvelope = {
  version: 1; source_event: string; discord_message_id: string;
  guild_id: string; session_id: string; scene_id: string;
  user_id: string; character_id: string; control_role: 'owner'|'authorized_proxy';
  principal_revision: string; visibility: 'party'|'player'|'character'; subject_key: string|null;
  raw_text: string; raw_hash: string;
  native_consumed_spans: Array<{start: number; end: number; receipt_ref: string}>;
};

type SemanticIntentProposal = {
  version: 2; proposal_id: string; source_event: string;
  start: number; end: number; source_span: string;
  actor_character_id: string; sequence_index: number; dependencies: string[];
  type: string; operation: string;
  target: {kind: string; key: string|null; phrase: string; grounding: 'known'|'candidate'|'ambiguous'|'unknown'};
  framing: 'immediate'|'conditional'|'hypothetical'|'quoted'|'reported'|'ooc';
  destination_scope: 'approach'|'exterior'|'interior'|'zone'|'none';
  attempted_action: string; desired_outcome: string|null;
  authored_outcome_claim: {text: string; claimed_by: string; status: 'unverified'|'prior_verified'|'contradicted'}|null;
  temporal_relation: 'sequential'|'parallel'|'reaction'|'unspecified';
};

type AcceptedActionIntent = {
  id: string; proposal_id: string; source_event: string; actor_ref: string;
  actor_principal_revision: string; target_ref: string|null;
  audience: string; accepted_scope: string; source_hash: string;
  scene_revision: string; dependencies: string[];
  status: 'accepted'|'blocked'|'clarify';
  // Meaning has been grounded. Nothing has succeeded, spent or moved yet.
};

type NativeAdjudication = {
  action_id: string; source_refs: string[]; rule_basis_refs: string[];
  disposition: 'no_roll'|'roll_pending'|'resolved'|'blocked'|'clarify'|'conflict_pending';
  difficulty: number|null; modifier_refs: string[]; stakes: string;
  roll_request_ref: string|null; receipts: string[];
  explanation: string; expected_revisions: Record<string,string>;
};

type SceneActionWindow = {
  id: string; session_id: string; scene_id: string; beat_id: string;
  state: 'open'|'locked'|'resolving'|'partially_resolved'|'resolved'|'cancelled';
  base_scene_revision: string; actors: string[];
  pending_action_ids: string[]; spotlight_or_trigger_ref: string|null;
  // The window groups only *actually overlapping fictional opportunities*.
};

type ConflictGroup = {
  id: string; window_id: string; action_ids: string[];
  overlapping_resources: string[]; read_revisions: Record<string,string>;
  category: 'exclusive_resource'|'opposed_action'|'direct_pc_conflict'|'shared_hazard'|'contradictory_claim';
  disposition: 'independent'|'cooperative'|'pending_agreement'|'roll_pending'|'resolved'|'blocked';
  consent_refs: string[]; adjudication_refs: string[];
};

type ActionOutcomeReceipt = {
  idempotency_key: string; action_id: string; window_id: string|null;
  source_event: string; actor_ref: string; outcome: string;
  state_mutations: string[]; native_roll_refs: string[]; rule_refs: string[];
  observed_by: string[]; audience: string; scene_revision_after: string;
};
```

All schema data is **bounded**, uses actual persisted source/actor IDs and native revisions, and is enforced server-side. A model may propose `dependencies` and `temporal_relation`; it cannot forge control, current revisions, other players' participation, consent, a completed result or a source receipt. When multiple extracts reference identical literal text, offsets/occurrence identity disambiguate them. Do not silently change a blocked intent to auto. In strict JSON-schema generation, prefer required nullable fields to unsupported optional structures as necessary.

## 3. Execution protocol for Codex — automatic phase-by-phase progression

Codex should execute phases **sequentially**, not work on all files in parallel. At each boundary:

1. `git status --short`, confirm branch, capture HEAD, review `docs/TYPED_INTENT_PROGRESS.md`, read this plan and relevant rules/architecture. Re-evaluate whether another change has already implemented part of the ticket.
2. Write *red-first* tests and record failure mode. Design minimal changes; do not rewrite unrelated systems or relax an authority check to pass a fixture.
3. Implement code and any schema/docs changes. Validate scoped source/actor/audience and receipt invariants independently of the AI model.
4. Run focused offline tests; run `npm run check` and `npm run validate` from `bot/` with network denied. Any failure not proven unrelated to the ticket blocks progression. Record failing command, exact test, evidence and corrective commit.
5. Update `docs/TYPED_INTENT_PROGRESS.md` with ticket status, commit SHA, files changed, new record contracts, tests, risk, migration/rollback and deferred debt. Add/update `docs/TYPED_INTENT_CONTRACTS.md` for new binding interfaces. Track source manifest if repository policy requires it.
6. Commit a coherent, reviewable change scoped to one ticket; no history reset, force push, merge into `main` or deployment. **Automatically begin the next ticket only after every gate passes.** If interrupted, resumable status tells the next Codex session where to restart.
7. For an unresolvable blocker (e.g., required human ruling, genuine rules conflict, production credentials, inaccessible fixture, non-additive migration), stop safely. Leave code/tests/docs and a clear `BLOCKED` progress entry; do not replace a safety test with a permissive stub.

The sequence is: **T01 → T02 → T03 → T04 → T04.1 → T05b → T06 → T07 → T08**. T00, T05a and T00.1 are already complete on this branch and must be regression-protected, not reimplemented.

## 4. Phased work packages

### T01 — Authenticated source envelopes and semantic acceptance boundary (P0)

**Files:** `bot/src/typed-intents.js`, `bot/src/narrative-context.js`, `bot/src/gm.js`, `bot/src/index.js`, `bot/src/message-span-ledger.js`, `bot/src/state.js`, `bot/src/ai-intent-contracts.js`; relevant SQLite/city records and tests.

**Implement:**
- Persist the original authenticated message *before* any native routing; preserve offset ranges for clauses that native handlers consume. Model interpretation is source-linked, but cannot rewrite or authorize a player's words.
- Versioned `SemanticIntentProposal` with offsets, true actor, framing, destination scope, temporal relation, dependency IDs, attempted action and **separate player-authored claimed/desired outcome**.
- `validateProposal` and `acceptIntent` with distinct statuses and audit records. Acceptance checks ownership/proxy, scene, principal revision, raw source hash/span/occurrence, referent identity and audience; it does not infer physical success or dice results.
- Semantic checks against overreach (approach vs entry, speaking vs agreeing, looking vs taking, “I might” vs actual attempt) without lexical verb whitelists. Introduce material clarification when grounding is genuinely ambiguous rather than fabricating a target.
- Prevent a previously native-consumed span from executing again through the GM; preserve the original text for context and exact NPC dialogue. Order multiple proposals within a message.
- Versioned adaptation for older valid typed records and existing legacy entry receipts. No new mechanical effects yet.

**Gate:** Red/green cases for verb-free action, varied idioms, indirect references, duplicate identical spans at different offsets, combined speech/actions, OOC/quoted/conditional/framed inputs, claimed successes, wrong actor, stale source, forged offsets, target redirection, dropped/consumed clauses and replay. All 76 pre-existing suites remain green.

### T02 — Replace authoritative phrase parsing with typed routing (P0/P1)

**Files:** `bot/src/player-language.js`, `bot/src/roll-language.js`, `bot/src/consent-language.js`, `bot/src/scene-entry.js`, `bot/src/autonomous-world.js`, `bot/src/dialogue-continuity.js`, `bot/src/message-span-ledger.js`, `bot/src/index.js`, `bot/src/authored-candidates.js`.

**Implement:**
- Route ordinary scene movement, search, NPC address, interaction, conversation and indirect intent through accepted typed inputs; keep exact original source/offset and previous native handler receipts.
- Remove hardcoded verb, pronoun, punctuation and phrase matching **as authorization** for general roleplaying actions; optional cheap heuristics may only serve nonbinding UI/routing hints. Preserve strong native explicit consent/spend authorization checks.
- Turn legacy roll/consent text interpretation into an adapter that *proposes* structured operations to the same native owner-authorization gate; never interpret politeness, suggestion, roleplay agreement or GM inference as an irreversible spend/contract.
- Correct both public and private intake, NPC proxy scope and command fallback without requiring a user to memorize phrasing.

**Gate:** Equivalent intent in multiple syntactic forms routes identically, without “I” prefix, special verbs or punctuation. Legacy consent/collaboration operations still cannot charge Hope, disclose private rolls, sign terms or move a PC without their original independently verified authority.

### T03 — Rules-grounded AI GM adjudication, claimed outcomes and native receipts (P0)

**Files:** `bot/src/rules-arbitration.js`, `bot/src/rules-srd.js`, `bot/src/roll-requests.js`, `bot/src/roll-collaboration.js`, `bot/src/typed-mechanics.js`, `bot/src/combat.js`, `bot/src/gm.js`, `bot/src/ai-intents.js`, `bot/src/turn-orchestration.js`; rules sources/docs.

**Implement:**
- GM produces sourced adjudication: fiction-based risk/uncertainty/stakes; no-roll if straightforward and permitted; otherwise grounded SRD + applicable house/homebrew/saved ruling and verified mechanically feasible Difficulty, traits/modifiers and participant set **before** a native roll.
- Reconcile conflicting precedence descriptions in docs/code and test explicit house-rule overrides vs default RAW without downgrading protections around manually reviewed roll sources.
- Create real native roll requests or appropriate existing encounter/reaction request, not merely `resolution="roll_required"` + free-form reason; record pending state with stable request IDs.
- Native Hope/Fear natural faces, doubles critical, resources, reaction differences, advantages, thresholds, Fear and damage follow the verified SRD/house-rule layer; preview consumes no RNG. Native commit alone produces applied receipts; no inferred success from narration.
- A player claiming to have succeeded, wounded someone, obtained a secret/item, or secured an NPC promise cannot bypass the native resolver. Previously committed result is reused rather than rerolled.
- Preserve GM improvisation for rules not covered: label `provisional`, source what is known, allow a scoped reviewed ruling as policy permits; no fake RAW references.

**Gate:** No-roll routine success, risky stealth, failed check, Hope/Fear and matching-face critical, damage and combat spotlight, reaction vs action, features/costs, missing/modified sheet, consent and no duplicate RNG. Every `roll_pending` disposition has an actual pending request; every `resolved` effect has a native receipt.

### T04 — One player's compound actions, causal dependencies and autonomous world (P1)

**Files:** `bot/src/typed-intents.js`, `bot/src/autonomous-world.js`, `bot/src/entity-memory.js`, `bot/src/scene-continuity.js`, `bot/src/dialogue-continuity.js`, `bot/src/state.js`, `bot/src/turn-orchestration.js`.

**Implement:**
- Stable ordered subaction IDs and a dependency DAG. Distinguish explicit “then,” implied prerequisites and truly independent simultaneous activities. Avoid inventing an action the player did not take.
- Evaluate in causal sequence and recompute state/referents before each dependent action; when a prerequisite is pending, suspend dependents with their original source/scene snapshot. On failure, block only dependent actions, preserving independent permissible acts.
- When a new ordinary location/NPC becomes relevant, introduce and source it transactionally at the correct moment; do not let a character talk to an unpresent NPC or obtain an item not discovered. Respect exact entry/exterior/zone travel and proxy control.
- Fix partial-success publication and failed multi-step rollback rules: commit safe completed prefix/independent actions with receipts only under a documented transaction design; never publish future dependent success prematurely.

**Gate:** Billy example (enter named shop → examine/take sign subject to ownership → approach clerk → say exact words); lock → enter → search → take → exit; locked door failure, incidental NPC, interrupted action, two dependent native rolls and independent action during wait. Every actionable substep has a real resolved/pending/blocked/clarification status.

### T04.1 — **NEW: Shared-scene multi-actor conflict and cooperative orchestration** (P0/P1)

**Files:** `bot/src/index.js`, `bot/src/scene-continuity.js`, `bot/src/turn-attempts.js`, `bot/src/turn-pipeline.js`, `bot/src/turn-orchestration.js`, `bot/src/state.js`, `bot/src/ai-intents.js`, `bot/src/rules-arbitration.js`, `bot/src/roll-collaboration.js`, `bot/src/combat.js`, plus an intentionally small new scene-beat/conflict module as warranted.

**Implement in this order:**

1. **Scene beat identity.** Introduce a scene-scoped, optional `SceneActionWindow` opened by meaningful overlap: active combat spotlight, cooperative/contested operation, an unresolved contested object, reaction opportunity or GM-declared fictional beat. It is **not** automatically opened for every Discord post and does not delay harmless conversations. Messages joining an open beat are tied to its known scene revision. Messages after a committed beat belong to the next beat unless a proper reaction window was explicitly still open.
2. **Native overlap detection.** Construct per-accepted-intent read/write sets (characters, items/custody, doors/access, NPC commitments, contested opportunities, zone, targets, encounter state). Compare against pending/accepted actions and expected entity revisions. Two searches can be independent; two exclusive custody mutations cannot both succeed. Do not use string-similar targets as authoritative collision keys without resolved identity.
3. **Conflict classification.** Distinguish `independent`, `sequential dependency`, `cooperative`, `same-scarce-resource`, `opposed action`, `direct PC conflict`, and `contradictory testimony`. A disagreement in what characters *believe* is not an exclusive world mutation. Attribute testimony; only verified evidence updates objective facts.
4. **Participation and consent.** Source each player's voluntary declaration separately; avoid AI-selected reactions, ally assistance, Hope spends, PvP choices or NPC-proxy actions. Collect an affirmative native/owned response where Daggerheart/Veiled City requires agreement; a player refusing PC conflict cannot be rolled against by fiat. Honor already-proven scene access, sight/sound and information sharing.
5. **Mechanics.** Use actual Daggerheart spotlight and applicable Group Action/Help/Tag Team or opposed/PC-conflict process from grounded rules, not arbitrary timestamp-based initiative or a fabricated contest formula. A pending reaction/roll must keep mutually dependent outcomes uncommitted.
6. **Atomic commit/revisions.** Lock and verify window status, actor/scene revisions, relevant resource versions, pending request statuses and consent in the native transaction. Resolve a conflict group to a *single consistent* set of receipts. If optimistic comparison fails, rebase pending proposals or seek clarification before mutating; never overwrite prior committed results. Define deadlock/time-out behavior in fictional/GM terms, not as silent player forfeiture.
7. **Delivery and recovery.** Publish coordinated consequences only after receipts exist; project private information per recipient. A publication retry, duplicated Discord event, model retry or reboot must resume the existing window and receipt, not reroll. Independent nonconflicting actions continue without waiting for unrelated players.

**Mandatory scenario fixtures:**
- Two players both grab the same ledger: at most one exclusive custody winner and no retroactive rewrite of a prior commit.
- One opens a door while another holds it shut: shared state and an applicable contested process, no two incompatible final door states.
- A rescuer acts while an attack is pending: legal reaction window, real spotlight/roll mechanics and no arbitrary Discord first-message win.
- Two PCs coordinate a Group Action, Help and Tag Team; consent/resources/participation individually verified, no helper auto-enrolled.
- Direct PC-versus-PC conflict with one player declining to participate: no forced PvP roll or outcome.
- One PC says “I hide the key,” another says “I saw you”: separate action vs testimony and legitimate perception, no unwarranted revelation.
- Two characters in different audience/private scenes cannot conflict over a supposedly shared item without established shared location/access.
- Two independent actions in the same beat both succeed with separate receipts; failure of one does not erase the other.
- Race condition with overlapping async generation and reversed completion order; compare-and-swap scene/item revisions reject stale effects.
- Pending conflict survives process restart; second publication, duplicate message and retry do not reroll or respent resources.
- A late message cannot retroactively “act first” in a closed beat; a declared still-open reaction window remains available according to governing rules.

**Gate:** All fixtures green with actual SQLite transactions, source/actor/consent checks and no time-based assumption of fictional simultaneity. Existing T00.1/T05a/T03/T04 regression suites remain green. Document what the bot counts as a beat; users should never be trapped in indefinite artificial waiting for unrelated players.

### T05b — Durable vs temporary memory, identities, epistemics and lifecycle (P1)

**Files:** `bot/src/context-memory.js`, `bot/src/entity-memory.js`, `bot/src/memory-clusters.js`, `bot/src/npc-cognition.js`, `bot/src/narrative-context.js`, `bot/src/context-planner.js`, `bot/src/autonomous-world.js`, source ancestry and migration tools.

**Implement:**
- Source-based entity identity scoped by location/scene/parent, aliases, audience and identity revisions, not simply normalized name. Two “back doors” are not the same object without verified equivalence.
- Importance/promotion: player-name, target, interaction, conflict group, causally pending object, recurring NPC/location, consequential world revelation. Do not discard an item another player's pending action references.
- Separate observation vs testimony vs inference vs attempted/claimed result vs native-established fact; never upgrade private text, a player's asserted victory or an NPC rumor to canon/possession/knowledge.
- Durable memory updates with corrections, retractions, supersession, recency, expiration and bounded retrieval; clear migration path for legacy unsafe records that remains fail-closed until proven audience-safe.
- Scope memory events to individual action and shared-beat receipts; conflict participants can legitimately know different facts based on perception, presence and disclosure. Summarization preserves each audience and epistemic source.

**Gate:** Same-name collisions, renamed locations, disputed custody, stale sign text, private-to-party isolation, leaked NPC witness claims, retracted source, deferred action references, repeated session context, correction and expiry tests. T05a test remains unchanged or stronger.

### T06 — Verified consequences and setting-grounded GM narration (P1)

**Files:** `bot/src/gm.js`, `bot/src/narrative-integrity.js`, `bot/src/turn-recovery.js`, `bot/src/turn-orchestration.js`, `bot/src/publication-outbox.js`, `bot/src/context-planner.js`, `bot/src/character-narrative.js`, cognition/scene projections.

**Implement:**
- Every *immediate actionable* accepted intent gets either native no-roll resolved receipt, committed roll resolution, an **actual pending native roll/contested window**, verified blocked condition, or specific needed clarification. A free-text reason does not substitute for executable pending state.
- Reconcile each player-authored outcome claim with receipts/prior evidence. Narrate no-roll success naturally, pending uncertainty without claiming outcome, Hope/Fear consequences appropriately, and failure without gratuitous agency theft.
- Use only relevant Veiled City setting lore, sourced canon, actual character continuity, factions, NPC motivations, present scene and audience-visible knowledge; new ordinary fiction allowed when lore leaves space. No automatic revelation of GM-only mystery answers.
- Generate a coherent shared event account after contested resolution, with character-specific lawful projections (different secrets/perceptions) derived from the same receipts. Avoid contradictory parallel narrations.
- Prefer field-level recovery and repair over dropping consequential actions. Never resolve a pending roll or shared conflict by rewriting narrative to an unsupported success or arbitrary “still declared” response.

**Gate:** Claimed stealth success becomes true only on verified resolution; benign completed act succeeds without roll; dangerous action requests real roll with declared stakes; conflicting PC custody described consistently; private information stays private; crash before publication recovers same receipt and same outcome. No inventing mechanical effects inside prose.

### T07 — Retire obsolete natural-language authority without breaking backward compatibility (P1/P2)

**Files:** remaining `*-language.js`, `bot/src/message-span-ledger.js`, `bot/src/scene-entry.js`, old tests and contracts.

**Implement:**
- Search all callers and record actual call graph. Move authoritative semantic routing to accepted typed intents; delete or demote lexical matchers **only once** all behavior and historical record paths have equivalent tested adapters.
- Maintain explicitly reviewed legacy entry/consent/roll receipts in the native engine; old historical player text does not become fresh authorization by falling through an adapter.
- Document migration/version support windows, rollback strategy, old record read behavior, and any intentional nonbinding UI heuristics.

**Gate:** Nonstandard natural language gets the same GM treatment; no new auto-consent/spend/entry; existing campaign files open safely; removed modules have no residual imports; module count and manifest are accurate.

### T08 — Release qualification, evaluation, hardening and merge readiness (P2)

**Files:** `bot/scripts/*`, fixture sets, CI workflow, `docs/TYPED_INTENT_PROGRESS.md`, release notes, operational metrics.

**Implement:**
- Expand synthetic evaluations, then optional owner-authorized live-model evaluation (cost capped and privacy-safe, no production campaign). Offline guard must stay the default.
- Add phase-owned tests to `validate-offline.mjs`, CI checks and migration/rollback fixtures. Track semantic omission and overreach separately; false success, false refusal, mis-scoped NPC knowledge, unnecessary roll, missing roll, duplicate receipt and invalid cross-player conflict are release-blocking.
- Capture optimistic concurrency, reordered async completions, reboot/replay, audience isolation, native receipt/oracle fidelity, consistent narration, prior lore resolution and prompt-budget/latency behavior.
- Produce release notes, files touched, migrations (if any), verified 76 baseline plus newly added suite counts, known bounded limitations and safe deployment/rollback steps. Leave deployment and merge into `main` to the user.

**Gate:** `npm ci`, `npm run check`, `npm run validate`, clean `git status`, reviewed diff vs `main`, no skipped security suites, no artificial passing fixtures and reproducible offline test evidence. Existing 76 suites must still run; do not hardcode their count after adding suites.

## 5. Cross-phase regression ledger (existing v4 cases + new multi-actor requirements)

The v4 scenario matrix is reproduced in Appendix A so this document stands alone. Treat those existing scenario requirements as a floor and add the multi-actor cases in this section. These are design requirements, not a claim that the cases are already implemented.

| Category | Required example and assertion |
|---|---|
| Semantic meaning | “I bolt,” “I drift toward,” “I enter,” and non-first-person prose do not rely on specific verb prefixes |
| Source identity | Two identical phrase occurrences have different offsets/IDs and neither executes twice |
| Overreach | “I approach” cannot become interior entry; “I look at” cannot become taking |
| Player success claim | “I slip unseen past the guards” yields attempt + claimed result; no self-verified arrival |
| No-roll success | Sitting on open bench commits without mandatory roll |
| Retrospective claim | “I took the relic earlier” checks prior receipt and does not rewrite historical custody |
| Sequential failure | Failure to open lock blocks entry/search/take but permits separate observation |
| Dependent suspense | Entry waits on an actual pending roll; “blocked” is not an arbitrary completed outcome |
| Compound dialogue | Clerk must be present to hear exactly authored words; no invented speech |
| Shared item | Only one final owner/holder of a contested unique ledger, one conflict group |
| Shared door | Open/hold-shut conflict has one committed final door state |
| Spotlight | Combat/reaction actions respect actual spotlight and opportunity rules, not posting order |
| Cooperative | Group action/Help/Tag Team require real participation, verified spends and native mechanics |
| Direct PvP | One player refusing an agreement stops forced voluntary PvP effects |
| Shared-object CAS | Later stale commit fails/rebases against latest item/scene revision |
| Async order | Reverse model completion of two messages does not imply reversed in-fiction timing |
| Closed beat | Late Discord message cannot retroactively supersede previously verified resolution |
| Open reaction | An actual still-open reaction opportunity can receive the owner response |
| Contradictory speech | “I saw the thief” is testimony until independently supported perception; not unconditional canon |
| Cross-audience | Secret private message cannot create shared memory or NPC knowledge |
| Persistence | Restart resumes pending shared conflict with same consent/roll request IDs |
| Delivery | Retried publication does not reroll, spend or duplicate a world-state effect |
| NPC proxy | Active proxy's dialogue, decision and movement never chosen by AI |
| Memory identity | Two “Back Door” instances in distinct buildings are distinct |
| Epistemics | A claimed past victory remains attributed unverified memory, never native injury/inventory/canon |
| Rules | Source-backed override documented and honored; unsupported ruling identified provisional |
| Lore | Narration is compatible with Pale Court facts and character-private knowledge boundaries |

Require tests that inspect persisted SQLite rows/receipts and emitted narration, not just whether a prompt contains the words “do not.”

## 6. Blockers, deferrals and anti-patterns

**Do not:**

- Treat AI `resolution` or completion narration as authoritative.
- Interpret a successfully narrated first-person past tense as prior native success without an existing receipt.
- Force every player action to roll; adjudicate stakes and fictional uncertainty.
- Permit two contradictory custody/door/scene mutations in separate transactions with no resource revision comparison.
- Use Discord ordering or a timer alone as fictional initiative/simultaneity, or indefinitely wait for uninvolved players.
- Infer PC-PvP consent, reaction, alliance, Group Action participation or Hope spending from another player's message.
- Make all first-person player narration canon or store all setting details forever.
- Delete existing campaign records/legacy adapters or widen privacy to fix a test.
- Open production data, launch the live bot, deploy, merge to `main`, force-push, or call paid APIs as an implicit part of an offline refactor.

**Human review exceptions:** If a rules ambiguity materially changes PvP safety, preexisting manual-GM approval, permanent canon, or non-additive migration, Codex records a concrete proposed policy and stops at that gate. Otherwise Codex can continue each verified development phase without repeatedly asking for permission.

## 7. Completion definition

The initiative is **complete** only when all phase checklists T01–T08 including T04.1 are marked passing with file/commit references in `docs/TYPED_INTENT_PROGRESS.md`, migrations have verified rollback/read compatibility, all required offline suites pass, no unauthorized roleplay action becomes an effect, all immediate actions receive a truthful disposition, disputed multi-player resources cannot reach contradictory final states, and merged audience-specific narration/memory respects the same native receipts.

**Do not conflate design completion with deployment.** Prepare merge/release readiness, but the owner chooses whether/when to merge, restart a bot, and apply a migration to production data.

## 8. Master kickoff and resumable phase commands

The companion file `CODEX_TYPED_INTENT_MASTER_KICKOFF_v5.md` contains the **single copy/paste instruction** to run this entire sequence and a compact resume instruction. Keep both documents at repository root before opening Codex CLI.

---
## Appendix A. Prior v4 regression matrix (retained as explicit acceptance floor) (add, do not delete existing fixtures)

Every case should assert: exact authored source; accepted typed intent or justified non-action; **any claimed/desired result kept nonbinding**; correct actor/target/audience; native disposition and receipt when applicable; committed world state; no unauthorized side effect; no duplicate action on replay; truthful, lore-grounded narration. Pair equivalent *attempt phrasing* and *asserted success phrasing* under the same state: their rule eligibility must match even though narration may differ. Negative cases must verify **state rollback** (not merely a thrown exception).

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
| CLAIM-01 | `I cross the empty room and sit down` | Player claims completion; ordinary verified **no-roll** movement if unobstructed | T01/T03/T06 |
| CLAIM-02 | `I try to cross the empty room and sit down` | Equivalent world state gives same no-roll decision as CLAIM-01 | T03 |
| CLAIM-03 | `I slip past the Pale Court guards unnoticed` | Claimed stealth success is *not* accepted; use actual stakes/difficulty/roll where warranted | T01/T03/T06 |
| CLAIM-04 | `I try to slip past the Pale Court guards unnoticed` | Same mechanics as CLAIM-03; phrasing alone changes no Difficulty or roll decision | T03 |
| CLAIM-05 | `I get through the barred archive door` | No access/arrival without established unlocked route or legitimate check | T01/T03/T06 |
| CLAIM-06 | `I persuade the magistrate to release the prisoner` | No forced NPC agreement from asserted success | T01/T03/T06 |
| CLAIM-07 | `I stab the vampire lord dead` | No victory, damage, death or combat bypass without native receipts | T01/T03 |
| CLAIM-08 | `I snatch the ledger; it belongs to me now` | No custody, handout or property change from assertion | T01/T03/T05b |
| CLAIM-09 | `I found the registry secret yesterday` | Match real prior verified discovery or preserve as unverified report; no retroactive clue grant | T01/T03/T05b |
| CLAIM-10 | `I already rolled and succeeded` without a matching roll receipt | No fictional dice, gain, damage, progress or reenacted roll | T01/T03 |
| CLAIM-11 | `I successfully open the drawer` vs `I attempt to open the drawer` under same mundane state | Equivalent no-roll result when accessible/uncontested; no needless roll | T03 |
| CLAIM-12 | Same drawer, mechanically trapped/locked | Both phrasings require same rules decision; no claim-driven bypass | T03 |
| CLAIM-13 | `I break the lock, enter the vault and take the artifact` | Ordered dependencies; don't invent broken lock, arrival or custody | T04/T06 |
| CLAIM-14 | Native stealth roll fails after a success-phrased input | Narration follows failure/complication, not the player-authored success | T03/T06 |
| CLAIM-15 | Claimed success repeated/retried after native committed result | Reuse existing receipt; no second roll, spend, damage or mutation | T01/T03/T06 |
| CLAIM-16 | Player claims they overheard an NPC's GM-private plan | Attribution/epistemic/audience-safe memory; no objective or NPC knowledge grant | T05b/T06 |
| CLAIM-17 | `I pour a glass of water and drink` | Usually no roll; no forced resource tracking for incidental action | T03/T06 |
| CLAIM-18 | A model marks a success claim as `committed` but no receipt exists | Native rejection/recovery; world and memory remain unchanged | T01/T03/T06 |
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

**Expansion rule:** These 75+ cases are a floor, not a claim of live-model coverage. Add negative cases whenever a code path discovers an additional authority-bearing assumption. Offline mocks test deterministic policy; separately measure model interpretation with authorized staging before release.

---

