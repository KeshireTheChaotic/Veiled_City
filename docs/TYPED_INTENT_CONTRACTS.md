# Typed Intent Authority Contracts

## V9-02 native coordination lifecycle

- Native scene/location/resource identity, not model beat text, groups source-bound occurrences. Private scopes do not merge. Closed occurrences reject late participation; genuinely new source occurrences can open a later beat.
- Explicit GM completion or complete current native participation consent closes entry. No deadline grants absent-player authority. Consent may be revoked after lock, with neutral closure, never invented fictional punishment.
- A scarce-resource win requires the matching native physical custody receipt, exact accepted source, reviewed resource provenance and actual current holder. Other claims receive truthful blocked-attempt receipts. No second item or fabricated success.
- PvP staging records bilateral consent separately from typed action declarations. Actual story-stakes winners require the V9-PVP-B opposed-total receipt; ordinary attack/damage is never a substitute. Native lifecycle logs/CAS and GM-only neutral cancellation provide recovery without erasing imported characters or history.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## V9.2 PvP authorship contract — draft integration, NOT release-qualified

- The owner's v9.2 ruling replaces the WIP whole-paragraph `private_account` authority model. Only immutable native story-stake receipts plus independently authenticated per-player material clauses may be authoritative. Disclosure approval and preview access never authorize another PC's reaction.
- Draft `pvp-authorship.js` accepts closed `stake_success`, `reaction_apology`, `reaction_glare` and `withhold` templates. The generic success template grants only the unchanged native stake, never arbitrary success wording or additional effects. Unverified freeform text is retained privately as `pvp_narrative_draft/needs_scope_review`; an attributed quote is not proof.
- A version-1 `pvp_narrative_clause` binds exact UTF-16 source occurrence, immutable source details hash, active current owner/principal, proposal, result receipt/hash, terms, effect, role and audience. A version-2 narrative bundle/projection is rendered only from those clauses. Legacy raw `private_account` and versionless public projections are inert to the new services.
- Cross-owner suggestions require the actual affected owner to ratify the exact invited draft span using a closed own-reaction template and a separate authenticated source. GM review is author-invited and audited but never authorizing; GM cannot impersonate the affected owner, alter stakes, or reroll. Withholding does not reopen a native result.
- **Unresolved P0:** the draft AI/output guard uses the triggering actor's proposal membership. An unrelated player's party turn can still emit the affected PC's unverified reaction through `validateNarrativeClaims` and the real `queueTurnPublications` boundary. Blocking every generated sentence for the whole scene instead would strand independent roleplay; this is not an acceptable repair. Keep the new cross-actor PVP30q regressions mandatory and red until output-surface/content ownership is proved independently from triggering principal, with recoverable private quarantine and independent native actions preserved.
- This section documents the current draft and binding target, NOT a V9-PVP-B completion claim. D08 remains BLOCKED. Do not use the draft live.

## V9-01 action-bound consent

- Version-1 `action_consent_request` is a closed immutable digest of exact accepted source occurrence/hash, actor, resources, operation, location, required current owners/principals, session/scene, audience, consequences, window revision and fictional expiry. It authorizes no result or cost.
- Version-1 `action_consent` is a character-private native response. Only the current affected owner can explicitly accept, decline or revoke through an authenticated adapter; model text and legacy `accepted` flags cannot create approval.
- Use-time validation re-reads source status, exact text/hash/offsets, active assignment/principal, accepted action, source audience, current window, expiry and separate reply provenance. Identical retries preserve the signature; revocation cannot be bypassed by participant replay or a new interaction ID.
- Generic cooperation consent **never** qualifies for PvP. Direct PC conflict fails closed until the distinct V9-PVP-A immutable bilateral narrative agreement is locked and verified; no consent-to-damage adapter is provided.
- Requests are GM-private coordination metadata; individual decisions are character-private. They do not copy the raw declaration or permit cross-character memory retrieval. No SQL migration is required; legacy unsafe consents remain readable historical data but inert for new participation.

## V9-PVP-A immutable narrative agreements

- Direct PC targeting is resolved from actual campaign character identity, independent of model `coordination.reason` or `interact`/attack labels. The state boundary stages the attempt before ordinary roll preparation; no opponent response, success, HP/Armor/Stress or cost follows from an attempt.
- `pvp_terms_revision` hashes a closed version-1 snapshot: source occurrence/hash, exact two current owners/principals, scene/session/location, both best/worst/tie stakes, all seven mandatory hard boundaries, mode, explicitly allowed owned traits, option policy, Hope/Fear, audience, authorship, tie/withdrawal/stall policies and fictional expiry. Prose stakes cannot execute mechanical effects.
- `pvp_terms_review` is a private review surface, not consent. Each owner must explicitly approve the same digest through the native response boundary. A foreign/GM/proxy user cannot review/sign for another owner. Changing any terms before dice supersedes the old agreement and clears both approvals; after native dice, retroactive edits are forbidden.
- A `pvp_agreement` locks only from two distinct live character-scoped `pvp_consent` replies. Every use re-reads current owner assignments, principal revisions, active original/counteroffer/reply source ancestry, position, scene, expiry and immutable digest. Participation consent never qualifies for standard attack damage.
- Refusal/withdrawal yields a neutral `pvp_resolution_receipt` with no winner or rolls. Mechanical adjudication and narrative authorship are deliberately separate; no response is fabricated. PvP dice/strike completion is V9-PVP-B work, not enabled by this phase.
- `/vc-roll pvp` provides private `inbox`, `review`, `propose`, `revise`, `respond` operations. Full plain-language terms use bounded ephemeral follow-ups without truncation. Native adapters override interaction identity; no model input can impersonate a decision. Other owners review in their own inbox; nothing is broadcast publicly.

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

## D04 alternate traits and sharing

- An alternate trait is offered only by an active human-reviewed request/character/scene source backed by a saved campaign ruling. Choosing it recomputes the native breakdown against the current sheet and current modifier sources; it never silently chooses the highest trait or changes Difficulty/stakes.
- Alternate trait selection precedes paid options. A fresh private menu exposes only Experiences whose structured applicability matches the recalculated trait/operation/roll kind.
- Experience application remains an explicit owner operation with exact reviewed relevance and a transactional 1 Hope receipt. Preview, trait choice, rejection and menu refresh do not spend Hope.
- Roll attempts and results remain private by default. Party sharing is a distinct affirmative owner operation against an actual saved result and produces an audience-scoped disclosure source.
- The party projection is redacted to character name, authored attempt, native total/duality and request status. It never includes undisclosed traits, cards, Experiences, other sheet options or GM-only facts.
- Party publication has its own stable delivery receipt. Retry cannot reroll, duplicate a cost or retract an already published result; private aid and participant consent continue to use their existing native gates.

## D05 live multiplayer coordination

- Coordination is an optional closed typed-intent envelope, not inferred from Discord timing or word matching. It is valid only for an explicit meaningful shared beat and exact bounded read/write resource identities at the actor's authoritative current location.
- Ordinary movement near another PC, dialogue and independent actions omit coordination and execute normally. Scarce-resource contention, explicit cooperation, reaction opportunities, combat spotlight, direct PC conflict and GM-declared beats may open a window.
- Joining revalidates the current accepted intent, source/session/scene, audience/location, voluntary participation and native consent receipts. Model-supplied participant or consent identifiers grant no authority.
- Missing direct-conflict or cooperative consent produces an `awaiting_consent` attempt-only record and suspends only that action. It cannot choose the target's response, roll, spend, move, damage or narrate a completed consequence.
- Window revision compare-and-set, explicit reaction state, exclusive-winner rules and native outcome receipts remain mandatory. Late arrivals cannot undo a closed result, and Discord timestamps never establish precedence.
- Coordination updates compound dependency state before autonomous scene effects are filtered, so a pending contested node cannot leak a model-described consequence while unrelated ready nodes continue.

## D06 terminal receipts and continuation

- A typed request becomes an action outcome only when the native roll request reaches a terminal resolved state with a saved roll ID and result. The stable action receipt records that native roll, actual total/duality, stored Difficulty and derived success/failure.
- Accepted intent, native adjudication, outcome receipt and compound transition update in the same transaction. Preview never draws dice, and replay reuses the same receipt without repeating a cost or transition.
- Resolution/failure changes only the completed node. Rebuilding its same-source dependency graph resumes newly authorized descendants, blocks causal descendants of failure and retains independent ready work without rerunning completed ancestors.
- Attack actions remain pending through damage and damage-type phases. A pending/review request is not an outcome and cannot resume consequence-dependent work.
- Production consequence reconciliation is strict. Every immediate consequential accepted action must cite an actual resolved receipt/request/review or explicit native blocked/clarification state; model narration and player-authored success claims cannot fill a missing state.
- Party and private projections retain their original scope and stable reconciliation record. Delivery retry reuses the committed projection and never reopens mechanics.

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

## D07 live scoped-memory integration

- `scopedSceneMemory()` is the only live GM projection of lifecycle and compatibility context memories. It is bounded, checks the current audience again, retains each lifecycle epistemic label and supplies only active source-backed evidence.
- Current-location parent identity, current source, pending causal references and query relevance determine ordering. Alias matching never merges same-name identities under different parents; an unresolved tie remains ambiguous.
- Current accepted non-movement targets may use one audience-visible memory identity or one native co-located position as referent grounding. This identifies the adjudication subject only; it never grants access, presence, consent, knowledge, canon or an outcome.
- Compound-action nodes persist bounded `memory_identity_refs`. Pending, suspended, clarification, selection and review records protect those identities from fictional-tick expiry until the causal action is terminal.
- Native character location and active party/public scene-presence receipts may identify Tyrell, Choso or another current target. Narration alone cannot create a position, and the projection never chooses or authorizes an action for another PC.
- Party projections cannot retrieve character-, player- or GM-private revisions. Character-private evidence remains attached to that character across controller character changes. GM prompt visibility never creates NPC witnessed/told/inferred evidence.

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

The base matrix records T00/T05a boundaries. The following sections record the implemented authenticated-intent and scoped-memory lifecycles.

## T01 authenticated-source and acceptance contracts

- `authored_turn` is the immutable version-1 owner-authored source event. It binds the Discord message, guild, session, scene, user, character, principal revision, audience, raw UTF-8 text and SHA-256 hash before native routing.
- `authored_turn_envelope` is an additive annotation record containing only verified native-consumed raw offset ranges and their receipt references. It cannot rewrite the source event. Overlapping, out-of-range or receipt-free annotations are rejected.
- `semantic_intent_proposal` version 2 is fallible model interpretation. Its stable identity is derived from the authored source event, exact start/end occurrence, actor, type and operation. It stores attempted action, desired outcome and any owner-attributed outcome claim separately. Every new claim begins `unverified`.
- `typed_intent` with status `accepted_for_adjudication` is the native acceptance record. Acceptance rechecks active owner ancestry, principal and scene revisions, exact raw hash/span offsets, audience, immediate framing, consumed-span exclusion and resolved target identity. It has no outcome receipt at acceptance.
- The pre-T01 flat `player_intents` model shape is adapted additively into the version-2 proposal contract. Existing `interpreted` records and `legacy_scene_entry_adapter` receipts remain readable, but historical text never becomes fresh authority.

The authenticated raw source remains available to contextual reasoning even when native handlers consume a clause. The GM receives a separate unconsumed-input view and span ledger; a consumed source occurrence cannot be accepted or executed again. Identical text at distinct offsets is distinct intent, while replay of the same occurrence returns the same proposal and acceptance records.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## V9.3.1 output and observation draft — NOT phase-qualified

The following boundaries describe the current uncommitted V9-PVP-B draft, not a release approval. The mandatory NPC/scenery compatibility gate is red; see the latest progress entry. V9-03–08 and D08 release qualification are not complete.

| Evidence / interface | May authorize | Does not authorize |
|---|---|---|
| Native PvP agreement, scene/participants and actual destination audience | Relevant protected output scope, independent of triggering poster | Excluding another participant because Billy triggered generation; a blanket campaign freeze |
| Saved current clause + independent affected-owner ratification + disclosure | Exactly its independently source-verified clause for the approved audience | A raw paragraph, extra response, private stake publication, or GM speaking for a PC |
| Current native arrival receipt with source/principal proof | Safe acknowledgement of that committed arrival | A new move, a forced opponent reaction, or unobserved private destination disclosure |
| Authenticated PC observation request | Read-side inquiry and truthful known/partial/unknown answer | A new appearance, injury, reaction, remote perception or private sheet access |
| Explicit owner-selected appearance fields and opted disclosure | Those bounded visible attributes for entitled observers | Promoting the rest of the private submission, hidden identity or unseen equipment |
| Source-bound native witness receipt | Exact legitimately heard speech / last witnessed activity | Truth of a quoted claim, OOC/private speech, unseen current whereabouts |
| Prepared output parts, outbox binding and use-time revalidation | Only the exact source-, owner-, terms- and audience-valid rendered payload | Model `safe/verified/prepared` flags; stale source or legacy prose; a second mechanical outcome |
| Private scope review / quarantine | Noncanonical review and rewrite/ratification requests | PC consent, objective memory, public cognition, canon, or automatic later model reuse |
| Delivered audience-correct saved output with current source proof | Protected TTS and cached replay of that same output | Raw generated shadow narration or revoked cached audio |

State authorization and publication authorization are separate. Quarantining a generated paragraph does not undo an independently authorized native action; an unsupported parallel state mutation still fails transactionally. Missing PC appearance is a successful nonblocking answer, not a roll or consent failure. Questions and referent resolution never create evidence for their answers.

Current limitation: native NPC/environment projection and remaining sink/compatibility tests are incomplete. Do not treat the conservative generic fallback as acceptable normal GM narration, relax the security checks, or mark this draft green until those requirements pass their actual production-path tests. No SQL migration or historical narrative blessing is implied.

## V9.3.2 development amendment — NOT phase-qualified

The preceding V9.3.1 red OBS21 note is historical. The selected-field NPC/environment adapter now passes OBS21, but **V9-PVP-B remains blocked by the unreceipted PC-resource effect tests** recorded in progress. This amendment is not release approval.

| Evidence / interface | May authorize | Does not authorize |
|---|---|---|
| V2 bilateral fixed policies | Native opposed totals/strikes, zero generated PvP Hope, immediate Fear obligations | Reusing old policy approvals, Critical Hope/Stress clearing, banked Fear or future spotlight |
| Committed native Fear die + exact saved paired comparison | One trigger per qualifying roll, stable participant order and consequence gate | A model roll label, mutable resolved label, invented pair pointer or skipping the second obligation |
| Authenticated GM-selected live countdown/access/NPC context + CAS decision | The supported bounded native route and an actual effect receipt | PC reaction/control, PvP HP/Armor/Stress, arbitrary catastrophe, cosmetic discharge or private-source promotion |
| `fear-reconcile` with current owner/source/roll proof | Audited supersession/reselection of a stale decision | Waiving real Fear, restoring retracted consent, changing saved winner/score, rerunning a committed effect |
| Explicit GM-selected `world_visible_fact` | Selected NPC attire/hair or location weather under live visibility | Arbitrary NPC profile paragraphs, proxy voluntary action or embedded PC apology |
| Pre-movement native witness capture | Remembered departure from a visible origin | Destination omniscience, a later visitor's invented witness history or unseen private speech |
| Archive source guard and private recap quarantine | Withholding unsupported synthesis without promoting it to shared memory | Session closure certifying raw recap prose or GM review ratifying another PC |
| **Generic model `resource_delta` — v9.4 B.1 native eligibility** | Only an exact separately reviewed, owner-approved private native feature entitlement; otherwise scoped `needs_native_cause` | Safe rendered prose, no-actor director scope or self-target private scope substituting for a consequential receipt |

Current safe recap behavior is conservative: sessions with PvP history hold generated recap prose privately and report the hold; source-certified full archived recap rendering remains unqualified. Original session messages, characters and native receipts are retained. Native incoming NPC attack/reaction/damage eligibility must be integrated before closing the resource gate, while independently authorized native actions and ordinary non-PvP resources remain intact. Do not call broad resource-event suppression, a model cause label, fabricated receipt or an empty claim list a solution.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## V9.4 B.1 PC resource eligibility (implementation; qualification tracked in progress)

| Boundary | Authority and use-time checks | Explicitly not authorized |
|---|---|---|
| `pc-effects.reviewFeatureEffect` | Authenticated human-GM adapter selects exact owned feature, active saved ruling, owner-authored current scene source and bounded non-damage delta; snapshots target data/principal | AI interpretation, automatic feature-English parsing, HP damage, new cost from prose |
| Private `effect review` then `approve` | Current affected owner privately sees exact mechanics; hash-bound review precedes independently indexed owner choice | Foreign owner, GM proxy signature, a guessed key, party reuse of a private authority |
| `pc-effects.applyPcEffect` | Active immutable source, owned feature/ruling, owner/principal/session/scene and full-data CAS; effect + receipt in one transaction | Reapplying a consumed source, nonce-based repeat use, stale or revoked authority |
| `pc-incoming` | Real current NPC/combatant/binding/presence and saved human applicability ruling; no PC masquerade or active human NPC proxy; native standard d20 vs current PC Evasion and saved damage dice | Simulation's d20 economy, generated damage, narrative duel/strike as a hit, automatic defender rolls |
| Incoming defense review and Armor | Affected owner privately reviews the current offer before confirmation; native source-bound reviewed defense mapping; resistance/immunity before thresholds, owner-selected one Armor Slot (one or reviewed two severity steps) | Defaulting an absent defense mapping, inactive equipment, ignoring an unresolved special defense, forced Armor spending |
| Incoming effect commit | Native attack/damage ancestry, target CAS, exact owner choice; atomic HP/Armor receipt; a last-HP owner decision request only | Forced death move, auto-authored reaction, repeated damage after restart, PvP damage authorization |

The supported incoming route is a **human-reviewed standard attack**, not a general English-to-mechanics interpreter. `defenses` must explicitly name resistance (`none/half/immune`), Armor eligibility, severity reduction (`1/2`) and `source` (`base` or exact active owned feature/condition). Human ruling and affected-owner review establish applicability; unsupported extra reactions, costs, attack features and hazards must stay pending native review, not be silently discarded. Half damage rounds up per official SRD Additional Rules. Native feature sources are one use per authored event/feature/resource; another legitimate use requires a new owner-authored source. Incoming attacks similarly bind one source/NPC/combatant/target, not a command nonce. Existing receipt history is never rewritten.

Private native commands: `/vc-roll effect json:{"op":"inbox"}`, `review` with exactly one `authority` or `attack`, GM `review-feature`, owner `approve`, GM `incoming-prepare`, owner `incoming-defense`, GM `incoming-roll`, owner `incoming-armor`. All replies are ephemeral, mention-disabled and Discord-length bounded; no live command registration is part of this change. This gate does not qualify B.2 output/archive gaps, damage PvP, the selected death-move resolver, or D08.
