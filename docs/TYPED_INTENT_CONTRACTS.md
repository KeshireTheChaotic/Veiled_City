# Typed Intent Authority Contracts

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## H01 exact occurrence recovery

- Model intent text is rebound only to exact UTF-16 occurrences in the immutable authenticated message. Repeated identical phrases retain distinct start/end identities.
- Missing or overlapping optional clauses become character/party-scoped `semantic_intent_diagnostic` records containing only category, index, bounded offsets and source hash. Fabricated model text is not persisted, accepted or executed.
- A malformed independent clause cannot discard a separately valid clause. A dependent clause is quarantined when its prerequisite was rejected; dependencies are remapped only across retained source-valid clauses.
- Actor/principal forgery, stale source ancestry and native-consumed span reuse remain fatal authority failures. Recovery is not fuzzy matching and never creates consent, movement, dice, spending or outcome authority.

## H02 referent and clarification lifecycle

- Ambiguous, candidate or unknown material movement targets persist as `awaiting_referent`; they are not accepted typed intents and cannot produce scene actions.
- Clarification candidates are bounded audience-visible native identities. Grounding a name never grants entry, bypasses a lock/ward, changes an exterior receipt into interior presence, or resolves encounter movement.
- A clarification must be a new authenticated owner source in the same active session, scene and principal revision. The selected target must be one of the saved candidates; replay or redirection fails closed.
- Resolution creates a new accepted typed intent owned by the clarification source and links it to the clarified proposal. The old proposal becomes `clarified`, preserving provenance without retroactive mutation.
- Replaying one source occurrence with a changed target or semantic payload is rejected instead of silently returning the earlier interpretation.

## H03 deterministic post-turn review

- `state_review` supplies a bounded reason and confidence explanation; its `changed`/`no_change` flag is not mutation authority.
- Review flags are deterministically derived from the validated structured event, relationship, handout and NPC-cognition collections. `references` changes only for `npc_update` or `location_update`; world additions and scene actions retain their separate native receipts.
- A mismatched model flag is normalized in place before preview, so it cannot trigger regeneration or cause a valid independent response to disappear. Invalid review shape, missing reasons, invalid confidence and malformed scene transitions still fail closed.
- A committed normalized player turn stores one idempotent GM-private `post_turn_review_audit` record tied to the authenticated source event. Preview rolls it back; it has no world-state or consequence authority.

## H04 narrative claim evidence

- New claim annotations separate exact `authored_source_span` input evidence from exact `output_claim_span` published prose. A legacy `source_span` remains output evidence only and is never reinterpreted as a player declaration.
- An authored span must exist in active owner-authored source ancestry for the current principal. An output span must occur exactly once on exactly one narration, public-summary or recipient-bound private surface; private claim visibility cannot be attached to party output.
- Input evidence proves only what a player declared or attempted. Completed movement and access additionally require an active matching native arrival/travel receipt; possession, damage, disclosure and obligation retain their native custody/event/fact/commitment gates.
- Unsupported committed prose remains a recoverable narrative-integrity failure. The validator never fabricates a receipt, movement, witness, NPC knowledge, player dialogue or authoritative state to make an annotation pass.

## H05 Discord delivery

- All potentially long text uses the shared 1,900-code-unit chunk policy. It avoids split UTF-16 surrogate pairs and Discord mentions, and closes/reopens Markdown code fences so each individual message is renderable and remains below Discord's 2,000-character limit.
- A slash command sends exactly one initial reply/edit and uses follow-ups for remaining parts. Session assembly status and session-end recap follow this contract; private channels and DM fallback use the same chunker.
- Assembly plan generation is reused after it is saved. Public opening and per-player private hooks have stable payload-hashed part identities and durable `delivery_state` in the existing session plan JSON.
- Each assembly part is marked `delivering` before Discord I/O and `delivered` afterward. An interrupted or ambiguous send becomes `uncertain` and is not automatically duplicated; a later resync must inspect Discord before forcing that part.
- Discord output failure never rolls back committed campaign state or reruns model generation, native mechanics, dice, costs or consent.

## T03 rules-grounded adjudication

- Native arbitration accepts only a current accepted typed intent whose authenticated source, owner principal revision, active session and scene still match.
- Conflict precedence is: applicable saved ruling, exact `override:` campaign override, verified `srd:` RAW, compatible `house:` or `homebrew:` extension, then an explicitly provisional result. Provisional knowledge cannot silently create a risky roll.
- `roll_required` structured output is incomplete unless it contains bounded risk, stakes, Difficulty, trait, roll kind, explanation and namespaced rule sources. The state transaction converts it into a real pending `roll_request`; merely narrating or labeling a roll has no effect.
- Straightforward no-roll completion produces an idempotent `action_outcome_receipt`. Risky resolution produces no outcome receipt until the existing native roll/encounter services commit it. Player-authored success claims remain unverified and never substitute for either receipt.
- Replay uses stable adjudication/request/receipt keys. Preview follows the same transaction path and rolls back without drawing dice. Existing native Daggerheart dice, Hope/Fear, critical, collaboration, reaction, damage, consent and resource checks remain the only outcome authority.

## D01 request identity, rule sources and lifecycle

- A typed roll request is identified by its authenticated source event, accepted proposal occurrence, action type, roll kind and stable accepted-source revision. Two occurrences in one Discord message cannot alias; replay of one accepted occurrence returns its existing request. Source-only keys remain a legacy-read shape and are not used for new typed requests.
- A namespace is classification, not evidence. `srd:` references must exist in the versioned local SRD catalog and apply to the requested roll kind. `override:`, `house:` and `homebrew:` references must resolve to an active exact-campaign saved ruling; unrepresented scene scope and unknown references fail to provisional review.
- `pending` means a request is actionable. `needs_review` means its trait, feature or other provenance remains unresolved and the owner receives a private, explicitly non-actionable explanation. `awaiting_selection` and later native outcome/reconciliation states remain separate persisted lifecycle stages.
- Publication starts only from a committed native request referenced by `mutation.nativeAdjudications` (or the bounded legacy receipt adapter). It re-reads that record and uses request/revision/recipient delivery receipts; model prose cannot publish, roll or spend anything.
- Unsupported risky adjudication creates neither a difficulty event nor a roll request. Actual native dice, resource costs, consent and outcomes remain owned by their existing transactional services.

## D02 private roll-option arbitration

- Candidate discovery first authenticates the request owner and reads that character's current sheet plus current reviewed roll sources. It never accepts a model-supplied option name as evidence of ownership, bonus value, relevance or availability.
- Structured applicability is matched against the accepted operation, prepared trait and roll kind. Prose card text and names are not converted into mechanics. Missing applicability or a missing native application path requires additional authorization; invalid or inactive sources are blocked.
- Candidate states are `available`, `requires_owner_choice`, `requires_additional_authorization`, `blocked` and `applied`. Existing reviewed modifiers and the prepared trait are applied; optional choices remain inert until a later authenticated native operation.
- Costs, mutual-exclusion groups and frequency limits are disclosure metadata, not mutations. Discovery and rejection cannot spend Hope/Stress, select a bonus, amend a request, roll dice or authorize another player.
- Help and Tag Team expose only generic rule requirements. Other characters' sheet options remain private. Net-disadvantage Help remains blocked unless an exact request-bound human-GM exception is separately established.
- A persisted `roll_option_registry` is character-private, source-bound and fingerprinted. It is reconstructable advisory state; native operation receipts remain the sole authority for applied options and costs.

## D03 private interactive controls

- A roll-menu token is opaque and bound to one guild, active session, owner user, character, request, source registry and exact request revision. A custom ID carries no sheet data and cannot be transferred to another user or request.
- Menu rendering is ephemeral and owner-private. Select options contain only that owner's applicable choices; foreign users fail authorization before labels, values or state are returned.
- Selection is a zero-cost preview. Confirm revalidates the current registry and performs supported choices through existing native operations in one transaction. `applying`/`used` token states and native operation receipts prevent double-click costs or dice.
- Request revision is compare-and-set authority. GM stakes changes, sheet changes, another contribution or an old control make the menu stale; the player must open a fresh view. Restart reconstruction creates a new token from persisted native state.
- Closing a menu does not cancel the request or refund/reverse an already committed effect. Additional-authority features, alternate traits and multiplayer invitations stay inert until their dedicated native prerequisites are satisfied.
- `/vc-roll contribute` remains the explicit JSON/accessibility fallback; buttons are convenience controls, not required player phrasing or independent mechanics.

## T04 compound-action dependencies

- An enriched intent may identify only unique earlier action indices as prerequisites. Acceptance converts those indices to stable proposal identities tied to exact source occurrences; missing dependencies, forward references and cycles are rejected.
- Compound nodes share one authenticated actor, source, session and scene. They persist ordered `ready`, `pending`, `suspended`, `resolved`, `failed`, `blocked` or `clarification` status independently from narration.
- A pending prerequisite suspends only its dependents. A failed/blocked/clarification prerequisite blocks its causal descendants, while an independent ready action remains executable and can receive its own native receipt.
- State application omits suspended/pending scene actions and rejects scene effects attached to blocked nodes. Terminal compare-and-set transitions require a native receipt and replay only when that same receipt already owns the result.

## T04.1 shared-scene action windows

- A scene action window is optional and opens only for combat spotlight, cooperative/contested work, a scarce resource, a reaction opportunity, direct PC conflict or a GM-declared fictional beat. A beat is the bounded fictional opportunity in which those actions can materially overlap; ordinary conversation never opens a window or waits for unrelated players.
- Each participant supplies a separate current accepted intent plus resolved read/write resource identities. Native overlap classification distinguishes independent, sequential, cooperative, scarce-resource, opposed and testimony cases; string similarity is not an identity.
- Private/different-location participants cannot be placed in one conflict. Direct PC conflict and Help/Tag Team/Group Action require separately persisted affirmative owner consent; refusal or missing consent creates no forced roll, spend or outcome.
- Lock and resolution use optimistic scene-window revisions. A stale completion rebases instead of overwriting, exclusive writes cannot have two winners, and every outcome must cite an existing native receipt.
- Closed windows reject late attempts. A deliberately opened reaction opportunity is explicit, never inferred from wall-clock delay. Duplicate resolution returns the same stored result and cannot reroll or respent resources.

## T05b memory lifecycle

- Durable identities are keyed by entity kind, explicit parent/location, audience and source-backed name. Same-name objects under different parents remain distinct; a rename preserves aliases and increments an identity revision without asserting cross-scope equivalence.
- Every revision is labelled as observation, testimony, inference, attempt, claimed result or native fact. Only `native_fact` can carry consequence authority, and it requires an existing committed native receipt.
- Corrections supersede rather than overwrite prior evidence. Retractions and inactive source ancestry remove a revision from retrieval. Expiration uses fictional campaign ticks, never wall-clock time; a causally pending action reference protects an otherwise expiring identity.
- Retrieval is bounded and independently enforces record audience, active identity, active source and expiry. Party retrieval cannot see character/player/GM revisions, and character-private memory never crosses characters even when one human controls both.
- Existing fail-closed `context_memory` records remain supported. Newly saved audience-bound context also creates the scoped identity/revision representation; unsafe legacy rows are not blessed by migration.

## T06 consequence reconciliation

- After native state commit and before publication enqueue, accepted actions are re-read from storage and reconciled to committed outcome receipts, active arrival/travel receipts, actual pending roll requests, verified blocks/clarifications or explicitly nonconsequential acknowledgement.
- An owner-attributed success claim stays `unverified` until a matching native receipt exists. Pending narration may describe stakes and uncertainty but cannot restate the claim as accomplished; resolved narration cites the same stable receipt on retry.
- Reconciliation stores one audience-scoped projection record. Party and private/character surfaces remain distinct, and Discord publication retry uses the existing outbox without rerunning mechanics or changing the reconciled outcome.

## T02 language-routing boundary

- `currentAcceptedIntent()` is the ordinary roleplay routing boundary. Autonomous reveal, local-zone and NPC-introduction actions must match a current accepted source occurrence, actor, structural type and resolved target; wording is not reparsed for authority.
- `player-language.js` classifiers and `message-span-ledger.js` boundaries are compatibility, response-obligation or nonbinding routing hints. They do not authorize movement, custody, consent, spending, rolls or another actor's participation.
- `authored_candidate` may stage a source-backed pending legacy review record, but cannot execute an effect. Historical `scene_entry` remains subject to its explicit source/scene/target/revision adapter.
- `roll-language.js` and `consent-language.js` remain narrow native adapters for exact current owner authorization. Politeness, reported agreement, suggestions and model inference cannot satisfy those gates.

| Layer or evidence | Authorizes | Never authorizes by itself | Owner |
|---|---|---|---|
| Authenticated human declaration, including an authorized proxy within its role | Voluntary PC/proxy actions, explicit conditions, spoken words, separately verified affirmative consent | Success, unlimited reach/resources, rules exceptions, unintended interior entry | Discord principal and source ledger |
| OpenAI semantic proposal | Candidate meaning, targets, framing, order, and memory relevance | Mutation, consent, objective truth, fabricated player speech, or outcome | GM structured-output producer |
| Validated typed intent | Canonical structured input that native adjudication must process | Resolution, spending, arrival, NPC knowledge, canon, or irreversible agreement | Intent validator and source/actor/referent grounding |
| Native arbitration | Rule basis, accessibility, required roll, verified obstacle, or material clarification | Spending/outcomes without native receipts or scope broader than the declaration | Rule adapters and prospective transaction |
| Committed native receipt | The authoritative occurrence of one specific action outcome | Unrelated facts, omniscience, or secrets outside the authorized audience | DB transaction and idempotency ledger |
| Memory record | Scoped continuity for what was introduced, perceived, said, inferred, promised, or retained | Canon by retention alone, custody/ownership, or knowledge for a different audience | Memory, epistemic, and audience policy |
| Narration | Player-facing depiction of verified resolution and permissible descriptive fiction | A mechanical effect merely because prose describes it | Reconciliation and publication outbox |
| Canon ledger or saved GM ruling | Established setting/rule constraints in its applicable scope | Retroactive consent or alteration outside the allowed human process | Existing canon and ruling services |

## Binding boundaries

- An accepted typed intent is a potentially fallible representation of human-authored intent. Material ambiguity is narrowed or clarified, never silently escalated.
- `approach` is not `enter`; `say` is not `agree`; `handle` is not `own`; `attempt` is not `succeed`; testimony is not objective knowledge; memory is not canon; model resolution is not commitment.
- Preview uses the same native path but rolls back. Dice, costs, movement, consent, canon changes, and exactly-once outcomes require final native commit receipts.
- Memory visibility is inherited from the exact surface that supports persistence. A private/user/character/GM surface cannot be used to promote a public or party record, shared summary, or NPC observation.
- Retrieval must enforce both record audience and active source ancestry. Character-private continuity follows that character and must not leak to another character controlled by the same or another user.
- Narration and model-selected memory relevance never grant NPC witness status or knowledge.

The base matrix records T00/T05a boundaries. The following section records the implemented T01 lifecycle; the broader T05b memory model remains future work.

## T01 authenticated-source and acceptance contracts

- `authored_turn` is the immutable version-1 owner-authored source event. It binds the Discord message, guild, session, scene, user, character, principal revision, audience, raw UTF-8 text and SHA-256 hash before native routing.
- `authored_turn_envelope` is an additive annotation record containing only verified native-consumed raw offset ranges and their receipt references. It cannot rewrite the source event. Overlapping, out-of-range or receipt-free annotations are rejected.
- `semantic_intent_proposal` version 2 is fallible model interpretation. Its stable identity is derived from the authored source event, exact start/end occurrence, actor, type and operation. It stores attempted action, desired outcome and any owner-attributed outcome claim separately. Every new claim begins `unverified`.
- `typed_intent` with status `accepted_for_adjudication` is the native acceptance record. Acceptance rechecks active owner ancestry, principal and scene revisions, exact raw hash/span offsets, audience, immediate framing, consumed-span exclusion and resolved target identity. It has no outcome receipt at acceptance.
- The pre-T01 flat `player_intents` model shape is adapted additively into the version-2 proposal contract. Existing `interpreted` records and `legacy_scene_entry_adapter` receipts remain readable, but historical text never becomes fresh authority.

The authenticated raw source remains available to contextual reasoning even when native handlers consume a clause. The GM receives a separate unconsumed-input view and span ledger; a consumed source occurrence cannot be accepted or executed again. Identical text at distinct offsets is distinct intent, while replay of the same occurrence returns the same proposal and acceptance records.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.
