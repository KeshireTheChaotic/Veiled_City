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

## V9.4 B.2 output and observation authority

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

| Interface | Permitted authority | Not authorized |
|---|---|---|
| Mixed turn composer | Exact validated private owner clause to its current owner, separately bound from party parts | Copying a private clause to another recipient or attaching private proof to public output |
| Simulation hook publisher | Exact existing current native-rendered part at a compatible audience; native source scene remains relevant after delay | Raw hook prose certifying a PC response; escaping proof through a new scene or a remote DM |
| Visible condition disclosure | Current native incoming-damage receipt plus affected owner's exact `visible_condition: injured` source and explicit audience | Inferring public injury from private HP, invented wounds/scars, or a stale/healed/remote condition |
| Selected world descriptions | Authenticated GM-selected weather/exposure and unproxied NPC greeting; observer-scoped source revalidation | A proxy's voluntary action, arbitrary NPC profile prose or a PC's response |
| Delivered archive certificate | Live-validated public output and dependency hashes, sealed by an in-process capability after successful delivery; read-time source/owner checks | Undelivered/private output, raw legacy summaries, forged certificate JSON, new state changes or current-observation claims |
| Session-end/recap/brief/concept adapters | Explicit historical excerpts rendered from still-valid delivery certificates; generated synthesis remains GM-private | Storing quarantined recap prose as shared campaign facts or trusting session closure as authorship |

No SQL migration. Additive GM-private `pvp_delivered_archive` hashes contain no newly public private text. Output parts now record observation evidence references. Existing uncertified deliveries are not retroactively certified: use original verified sources for a fresh projection or reviewed recovery. Old hooks lacking native source context are held when relevant history makes their scope unverifiable. A transport error on a protected simulation hook is uncertain and is never blindly reposted. Pending native outcomes remain committed; publication holds never reroll or undo them.

Archive rendering is a receipt-grounded excerpt, not a freeform AI summary. Revocation or changed evidence holds the affected excerpt; original campaign records and characters remain. Source-closure snapshots are bounded and conservatively reject missing/changed dependencies. General publishing recovery and final matrix/release replay remain later gates.

Actual channel/member lookup is an asynchronous authority boundary: revalidate again immediately before sending, including direct play, journal and aftermath adapters. A private authority can never authorize a public play post. Personal observation parts cannot be relabeled as a different private recipient's own perception. Fixed encounter journal headings require a real same-guild native encounter; arbitrary headings do not gain authority. Authentication/provenance failures are not transport errors and must not fall through to a second private delivery route.

Visible injury disclosures require the latest native HP-effect identity, not merely an equal HP number; healing followed by a private new injury never resurrects old public consent. Current appearance uses the latest valid field before audience selection; a private replacement does not leak its value or leave conflicting old clothing presented as current. Actual prior witnesses may still recall previously disclosed attire as historical. Hidden NPC fallbacks do not print undiscovered profile identities. The native bounded field-history lookup is conservative: missing evidence yields an unknown answer, not a fabricated field.

### Owner ruling (2026-10-11)

The owner's exact response was **"Disable critical Stress clear; leave cap and features vanilla rules"**. All PvP criticals must grant neither Hope nor Stress clear; ordinary non-PvP critical behavior remains unchanged. Do not add the proposed last-HP cap or invent domain-feature PC-target mappings. Damage profiles must retain vanilla mechanics unless a separately approved house rule applies. This overrides the plan's proposed critical Stress bonus and recommended cap; it does not silently authorize nonlethal last-HP substitutions, forced death moves, or arbitrary feature effects. Profile-specific acceptance and any remaining policy conflict must be resolved before enabling those consequences.

The follow-up exact ruling is **"Keep vanilla; disable guaranteed-nonlethal damage tiers"**. Therefore `nonlethal_no_incapacitation` and `nonlethal_incapacitation` are unavailable for executable damage profiles. Harmless narrative-only agreements remain no-harm. Damage-enabled consent must disclose vanilla HP and affected-owner death-move risk; it never promises nonlethality, automatically caps damage or substitutes a nonlethal fall. Tests for the superseded positive tiers must instead prove explicit rejection with no effects. All other source, consent, disclosure and native-receipt requirements remain binding.

## V9.4 B.3 separate v3 consent authority

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

`pvp_encounter_contract` / `pvp_encounter_terms` version 3 are separate from existing version-2 narrative terms. Closed damage-profile terms permit only explicitly disclosed vanilla lethal/death-move risk under the owner amendment. Every independently controlled affected owner privately reviews and signs the same immutable hash, including exact actor→target attack edges, boundaries, spending, feature references, audience, stop rule, expiry and no-Hope/no-critical-Stress policies. Native target-edge proofs cite the offer source and all signatures; no proxy or GM approval replaces any affected owner. Review/acceptance is not authority for a dice result, damage, death-move choice, appearance or voluntary reaction.

The early native dispatcher retains every PC conflict outside ordinary adversary damage. A signed typed attack may become `pvp_attack_intent` with `awaiting_native_attack`; reconciliation must verify its accepted source, owner, current contract and edge before calling it pending. Other PC operations remain attempts, not damage. Multiple matching contracts require scope clarification. Missing/stale/withdrawn permission never selects an ordinary damage fallback. V3 history joins the same publication/privacy guards as v2, independently of the triggering player.

Private authenticated command operations: `/vc-roll pvp json:{"op":"damage-inbox"}`, `damage-propose` with `accepted_intent,terms`, `damage-review` with `contract`, `damage-respond` with `contract,expected_revision,decision` (`accept|decline|withdraw`), and `damage-revise` with `contract,expected_revision,terms`. Command user/interaction identity cannot be supplied by JSON. Revisions reset all reviews/signatures and are forbidden after attack staging; new/joined owners require new unanimous approval. Withdrawal disables that owner's future edges without fictional forfeit or undoing committed history. Group scheduling, native attack/damage/death effects and pending terminal recovery remain subsequent phases; this interface grants none of those outcomes.
## V9.4 B.4 native attack and source-triggered reaction boundary

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

- V3 signed damage consent only stages an attack input. Authenticated GM reviews actual current equipped weapon or unarmed rules; both affected owners privately review and separately authorize their own mechanics. Only current attacker owner rolls. Native Duality attack meets target's current Evasion or natural Critical; no automatic opposed defender roll, HP effect, generic Hope, critical Stress or campaign Fear.
- `rollTraitBreakdown()` is shared pure modifier/source validation, not a roll request or target authority. Ordinary/adversary interfaces retain their original serialized breakdown and validations. Native result identity protects saved PvP dice even after presentation labels are removed.
- Internal `pvp_attack_request`, mechanics-source and `pvp_attack_roll_receipt` are GM-private because they contain both sides' mechanical evidence. Owner review projections disclose only the reader's own mechanics; Discord attacker result omits defender Evasion/other private sheet values. No party sharing is implied.
- `pvp_defense_option_receipt` records affected-owner base-Evasion confirmation, not a free reaction roll or later Armor spend. Unmapped spells/features/conditions hold; neither a name nor a human prose ruling creates an unimplemented native effect mapping.
- A separately human-established local hazard with exact source/ruling, trait/Difficulty and normal/Critical protection can use `pvp_reaction_offer` and the existing native owner roll service. Critical protection is source-bound; ordinary reactions grant no Hope/Fear/Stress clearing or GM move. `pvp_reaction_roll_receipt` is outcome evidence only, not HP, movement or PC narration authority. It does not change the independent PC attack.
- `completedActionSource()` verifies native terminal action/source/roll ancestry read-only. It cannot be passed as a currently accepted declaration to new mechanics. Withdrawal blocks future action; it does not delete already committed dice or immediate Fear obligations. V2 narrative gates and V3 damage-action gates remain distinct ancestry shapes within the same Fear service.
- B.5 owns actual PC damage/Armor/death effects; B.6 owns group execution/locks/fair opportunities; V9-03 owns complete durable continuation/recovery. No migration rewrites prior agreements or dice. Overall V9-PVP-B/D08 is not qualified by the attack gate alone.
- Party-authored intent does not approve sharing private native reaction results. Native `private_result:true` only narrows derived outcome/adjudication/DAG audiences to the owner; the original party declaration stays unchanged. Private descendant status is not promoted during DAG rebuild, and independent sibling actions retain their own audience. Public intent metadata says only `private_roll_resolved`, not the private success/failure or die values. An existing incompatible receipt audience requires reviewed recovery; it is not silently rewritten or blessed.

## V9.4 B.5 native damage and owner death/recovery authority

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

- `pvp_damage_roll_receipt` requires an actual native hit, attacker owner, current equipment and fresh signed permission before native proficiency dice. Critical adds maximum damage dice only; no Hope or Stress bonus. No narrative score is a damage source.
- Authenticated GM review locks distinct native simultaneous sources to one target/session/scene and exact saved rules/defenses. The target alone reviews incoming totals and chooses their own Armor. Resistance/immunity requires active owned damage-type metadata covering every source; Armor lowers severity, never subtracts raw damage. Unknown mappings/conditions hold. All source membership, rules, owner/principal and sheet CAS checks precede effects.
- `pc_effect_authority`, owner Armor source, mutation and private `pc_effect_receipt` commit atomically with exact resource arithmetic. Replays validate immutable native ancestry, never roll/apply again. Internal damage evidence is GM-private; target projection contains their own defenses and incoming totals, not opponent traits. No public injury, reaction or voice disclosure follows automatically.
- Vanilla final HP creates a v2 owner-private `pc_death_move_request` and pending character execution state. Only the current affected owner may privately review and choose. Native unmodified saved death dice, choice and mutation own outcomes. Hope-higher Risk It All awaits exact owner HP/Stress allocation, bounded by actual marks; matching death dice retain vanilla full recovery, distinct from disabled PvP action Critical bonuses. Fear-higher records selected death, not another Fear move. Avoid Death records unconsciousness and permanent Hope-slot loss without inventing scar fiction; loss of the last slot ends the journey. Unsupported death-feature mappings hold before dice rather than silently ignore optional vanilla rules.
- Blaze requires the owner's exact independently accepted final action and authenticated GM saved-rule approval. Native automatic Critical uses an explicit rule receipt, not fabricated die faces. The existing native action/attack service resolves the final effect before native death, once only. Derived final-action outcomes default private even when the declaration was party-visible. Generic handlers recognize saved death/damage/final-action dice independent of stripped labels and cannot award resources again.
- `historicalOwnerPrincipal` and `historicalActionSource` are distinctly read-only receipt ancestry, not live participation/consent. Current assignment, source, scene and principal still validate. Dead/unconscious PCs cannot gain fresh mechanical authority; unrelated PCs and conversational interpretation are not frozen. A full-HP sheet is held unless the exact current native Risk It All all-Stress allocation proves standing recovery. Further damaging hits replace that exception with a fresh pending death request.
- Avoid Death wakes only through a committed supported native ally HP clear: exact party-visible healer declaration, active owned fixed/free healing mapping and range, authenticated GM applicability review, private healer authorization and separate recipient approval. `pc_consciousness_receipt` binds the original unconscious outcome, native healing and mutation. Heal and wake roll back together. No self-activation while unconscious, forced response, private source promotion or automatic rest is inferred. Unsupported rest/paid/rolled healing mappings require native implementation/review; no generic GM rest narration is a recovery receipt.
- PvP Fear remains an independent immediate gate after saved damage. Owner death workflow and Fear must finish before dependent terminal; saved damage never changes. Group scheduling/target locks remain B.6, full output qualification B.7 and durable pending recovery V9-03. Only B.8 may complete V9-PVP-B; D08 release stays BLOCKED until V9-08.

Private commands: `/vc-roll pvp` JSON `damage-roll` (`attack_receipt`), GM `damage-prepare` (`damage_receipts,ruling,defenses`), target `armor-review` (`damage`), `armor-choose` (`damage,expected_revision,armor`). `/vc-roll effect` JSON `death-review` (`request`), `death-choose` (`request,expected_revision,move`), `death-allocate` (`request,expected_revision,hp,stress`), GM `blaze-approve` (`request,accepted_intent,ruling`), healer `healer-review` (`authority`), `healer-authorize` (`authority,expected_revision`), then recipient's existing `review/approve`. Identity/GM role comes only from authenticated adapters, never JSON. The inbox lists private death requests; native keys/revisions are mechanical references, not compelled roleplay.

Persistence is additive city records and existing native dice/mutation tables, no SQL schema migration or rewriting old choices/history. Legacy v1 final-HP requests lack v2 proof and remain held for reviewed recovery. Rollback must preserve committed dice, damage, ownership and choices; hold unfamiliar pending records, disable new execution, and never replay effects or synthesize upgrades. Permanent Hope caps constrain ordinary later gains without changing normal non-PvP generation. Direct PvP/death sources cannot generate Hope; an independently accepted own-feature clause and separately reviewed native effect may still grant legitimate ordinary Hope in a compound message.

The owner explicitly confirmed vanilla matching-dice Risk It All recovery (all HP and Stress), separately from disabled PvP action Critical Stress clearing. After a Hope-higher death roll, private `death-review` returns the verified outcome revision, actual marked HP/Stress and bounded allocation budget only to the current affected owner. It refuses a changed sheet rather than inventing a new allocation or revision. `death-allocate` consumes that exact native revision through the existing owner-choice/CAS transaction; command replay supplies no new mechanical authority.

## V9.4 B.6 multiplayer coordination authority

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

- New group v3 terms explicitly sign `spotlight_policy: fair_opportunities_native_target_locks`. Legacy group terms remain inspectable but inert; no signatures/history are rewritten. Reissue or revise an unstarted offer and obtain every current affected owner's fresh approval. A started contract needs neutral withdrawal and a new contract for late joins; saved dice/damage remain immutable. Bilateral narrative/duel contracts do not acquire this field or group effects.
- `pvp-brawl` reserves one elective opportunity per actual independently authored attack, with a GM-authenticated immutable `native_pvp_opportunity` source. Eligible current owners may act in any order; an actor ahead of ready peers cannot reserve again. Counts derive from source-verified reservations/rolls/passes, not narrative spotlight, Hope/Fear or a model turn label. Only the owner's private reviewed `spotlight-pass` relinquishes their own opportunity without fictional surrender/effects. A separately owner-selected, GM-approved native Blaze final action is an urgent exception, not a generic override or extra elective attack.
- Existing native `scene_action_window` records hold exact target/resource snapshots and immutable reservation membership; `pvp_target_lock` points to the active target window. Distinct attackers can reserve the same target before dice. First native dice close further entry. Every actual same-window hit must supply its distinct saved damage before one target-owned Armor/application transaction; no hidden member, forged cancellation, duplicate source or partial aggregation. Generic window APIs cannot sign or resolve these locks. Current equipment/Evasion, source, actor, target, ownership and resource CAS remain mandatory at use time.
- Only already reserved, independently owner-authorized actions in the same simultaneous native target window can finish a batch after its first Fear. This supplies no permission to reserve a new attack, roll a later turn or finish another window. Each actual attacker Fear retains its own immediate obligation, resolved in native reservation order. No next elective attack/dependent completion until all due consequences finish; saved hits/HP stay fixed and both completed actions reconcile after the last move. GM NPC/environment moves are not extra player elective opportunities and never bank Fear.
- Neutral withdrawal cancels only uncommitted affected group actions with an exact owner withdrawal source/stop receipt; committed effects and genuine Fear remain. Living peers retain unrelated signed edges when a participant withdraws/leaves or dies. Historical owner/declaration checks establish original contract ancestry only; withdrawn/dead PCs are excluded from fresh participants and native effect/eligibility gates remain authoritative. No automatic re-enrollment, narration, target switching, revenge, forfeiture or restoration of a retracted source follows.
- `/vc-roll pvp` JSON `spotlight-review` (`contract`) returns only the current owner's bounded private status/revision; `spotlight-pass` (`contract,expected_revision`) records an authenticated idempotent private decision. Existing attack/reaction/damage/Armor/death commands own mechanics unchanged. No opponent confidential stats/sealed dice are added to these views.

Persistence adds city-record/event kinds and target-window metadata only; no schema migration or production access. Rollback must preserve immutable dice/effects/ownership, hold unfamiliar reservations and block group execution without its native service, never replay damage or force a new signature. Pending retractions/current-owner switches remain held for source-bound reviewed recovery; no fabricated replacement. General durable continuation/recovery belongs to V9-03; B.7/B.8 and release D08 qualification are still separate mandatory gates.

Same-window Fear admission revalidates the actual saved native attacker roll, exact deterministic trigger identity, owner/principal, source and scene/session before sibling RNG. A mutable trigger label is never sufficient. `native_pvp_*` source events, including reservations authored by a GM who also owns a PC, cannot be laundered into ordinary Hope features. This does not block independently authored and accepted non-PvP feature clauses with their own native entitlement.

## V9.4 B.7 native incoming Fear consequence

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Context and selection proof bind the complete immutable GM-authored material to the indexed source hash, authenticated author, scene/session and audience metadata. Read-side Fear accounting additionally matches the exact selected context revision, target, move kind, before digest, single native mutation, proposal/terms and character-private audience; rehashing a mutable receipt cannot promote its audience or relabel its consequence. These checks apply before fresh NPC dice/HP and again before publication. Malformed historical metadata is held, never silently corrected or newly authorized.

`npc_attack` context is character-private and binds an actual prepared `pc_incoming_attack` using the exact damage-action Fear source, current scene/session and affected damage-profile participant. Narrative hard boundaries are not relaxed. Fresh GM selection precedes native dice; no unrelated/completed attack can be adopted as a consequence. Before RNG and new HP, exact current trigger/decision/context/gate/source/owner proof is rechecked. Existing NPC encounter/Evasion/equipment/range/defense/damage/Armor rules remain authoritative.

Pending native defense/dice/Armor raises expected `NATIVE_EFFECT_PENDING` without consuming/waiving the selected Fear obligation. Only an actual verified hit+native effect or saved miss produces the separate Fear accounting receipt. Accounting records native references; it cannot apply HP, reroll, choose a PC death move, generate Hope, bank Fear or narrate a reaction. Failed accounting rolls back together while separately committed native damage survives for exact retry. Revoked native proof invalidates the output part and is quarantined by the existing composer; unrelated authorized observations/actions survive. Native outcome stays private unless separately authorized disclosure exists. Additive records only; rollback holds unfamiliar contexts and preserves every committed native result and character. Detailed coverage and owner-policy exceptions: `V9_4_QUALIFICATION.md`. General durable recovery remains V9-03; B.8 and D08 release are separate gates.

## V9-03 native continuation authority

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

`action_continuation_signal` is a durable wake-up only. `action_continuation` binds the original immutable accepted input, exact predecessor receipts and private owner audience. Native ordinary roll results, costless no-roll receipts, window custody or neutral closure, exact paired PvP stake/neutral results and settled native damage remain separate authorities. A declined/withdrawn PvP never unlocks a winner-dependent action; unresolved immediate Fear and native interruptions remain blocking prerequisites. No model label, narration, task status or fabricated source authorizes consequences.

Execution revalidates original owner/principal, exact authored span/hash, active session/scene, audience, position, target/access and current causal receipts. Only the existing native world executor can complete deterministic costless movement. Other operations remain explicitly `needs_adjudication`; rolls for suspended descendants are not prepared early. Later genuine native adjudication closes the task without changing its original accepted-input digest. Independent siblings are preserved. `dependency_pending` / `dependency_blocked` are truthful non-success reconciliation dispositions citing the exact accepted DAG node, not outcome receipts.

Existing private `/vc-roll window` JSON operations `continuation-inbox` and `continuation-resume` (`task`) expose current owner task metadata only; authenticated GM retry cannot supply player authorship or waive native rules. Turn context receives at most twelve unresolved current-owner references. Notices use the existing verified output parts and transactional outbox, with source/owner/audience/input/native-result checks at send time. Post-commit command/message adapters automatically deliver only never-attempted own notice rows, serialized per owner; failed/uncertain sends stay in reviewed outbox recovery and never rerun effects. Original authored Discord source identity is unchanged; derived publication identities are never declarations.

Additive city records and existing outbox only, no schema migration. Transaction failures roll back new native effects/checkpoints/enqueue; previously committed outcomes are never erased or replayed. Rollback must hold unfamiliar tasks and preserve source, character, native dice/effects and history. Unverifiable/legacy causal proof stays explicitly held, never retroactively granted. Full release D08 is separate and remains BLOCKED until V9-08.

Continuation task/signal records and character-private compound plans are operational causal evidence, not general civic/lore sources. Generic `cityContext` excludes them before context composition; native owner/GM inbox authorization is the separate bounded inspection path. Knowing a record key grants no broader retrieval/disclosure authority.

## V9-04 native roll truth and source selection

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

`typedRollProof` supplies read-only verified native ancestry and an explicit verdict basis: active scoped grounded Difficulty, actual native NPC attack target and completed damage, natural matching Duality dice, or separately approved native Blaze automatic Critical. Narrative/damage PvP retains its separate locked native comparator and never enters ordinary absent-Difficulty success. Ordinary noncritical null/absent Difficulty yields `needs_review`, not success or failure: native dice/costs stay saved, accepted action and DAG remain pending, and strict reconciliation cites the exact neutral receipt. Current owned pending/result views disclose this status privately; no re-roll button is implied. Natural Critical/reaction and non-PvP SRD resources are unchanged.

Native Tag Team history requires both actual saved participant dice, exact owner-source/participation and initiation usage, and both selections of the same real roll; it does not require the chosen die to belong to the initiator or silently grant another PC consent. Read-side completion and dependent execution consume the same proof. GM missing-Difficulty review uses an existing scoped saved ruling/source, exact current request revision and authenticated adapter; it adds a separately audited classification over the original fixed dice, preserves the old neutral receipt and cannot change known outcomes, traits, modifiers, resources or PC intent. No generic override or history upgrade.

Typed rolling requires the current immutable owner envelope and exact accepted occurrence. A request is eligible only through that accepted occurrence's own prepared request or a literal owner-authored exact request ID with matching accepted target. Cardinality alone, model-selected IDs, foreign/private scope or stale actors grant nothing. A separate source authorizing an existing roll receives a character-private `native_roll_contribution` acknowledgment of that operation only; underlying native receipts own success/damage. Exact replay uses the saved native operation and immutable authorized clause, never RNG or repeated expenditure. Ambiguity stays explicit clarification, preserving independent actions. Additive data and existing queries only; no schema migration, production operation, old receipt rewrite or implicit disclosure. Rollback preserves all saved native effects and holds unfamiliar reviews; D08 release remains a separate V9-08 gate.

The shared direct native contribution `live` boundary also revalidates the exact accepted source/actor before any RNG or cost. Stale intent provenance must not rely only on post-roll transaction rollback. Already resolved dice use read-only ancestry for authorized sharing/history, never renewed action consent.

## V9-05 delivery authority amendment

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Delivery acknowledgment certifies only an exact Discord message/channel/part, never consent, success, a PC reaction, a resource effect or a new fictional fact. Native notices are closed renderings of current source-backed native state; their source, scene, principal, revision and audience revalidate through the same output gate as narration. Private option/roll notices are recipient-bound; bilateral PvP terms/status do not record review or consent. Public PvP projection requires existing per-player claim proofs and bilateral disclosure; raw drafts cannot enter the delivery queue.

Mark `delivering` before I/O. Require actual message/channel IDs to mark delivered. Ambiguous sends, lost acknowledgments and post-send receipt-write failures are `uncertain`; no automatic resend, fallback or later-chunk overtaking. Only demonstrably unsent attempts can retry, and unknown older failed records are held. A configured private channel may fall back to DM only before any send attempt. Recovery changes delivery state, not mechanical state: authenticated GM review must verify the exact fetched bot message/body/audience or explicitly attest that the exact chunk was not sent, with an audit reason. No blind force retry, receipt fabrication or resource/dice replay. Legacy unacknowledged notifications without chunk receipts remain inert until inspected; preserve imported characters and saved outcomes.

Native transactions reserve notification identities as versioned source-reference checkpoints, not content authority; recovery may construct current verified parts but cannot execute effects. Stale earlier versions remain held. Native non-PvP party sharing defaults to actual saved dice/status only, never whole composite/private declarations or a claimed reaction. Exact request/roller/native result proof is required, not matching totals alone. Public disclosure source details must not copy unrelated private text. V9-06 may add only source-confirmed accepted-span or expressly reviewed redacted context. Private PvP status validates actual native round/terminal ancestry without revealing opposing sealed choices. `delivery-status` reconstructs bounded reservations without sending; authenticated `delivery-resync` revalidates their immutable scope, never rewrites sources or treats a notification as consent.

## V9-06 private choices and bounded disclosure

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Slash contributions and component confirmation/rolling share `finishRollOperation`: synchronously queue source-backed notices before a fallible interaction response, then deliver through the existing outbox. Native mutations remain separate and exactly once. Only the acting owner can inspect a full roll-option registry/menu; helpers/Tag Team partners retain their independently authorized, scoped native contribution and status paths, not another PC's private sheet or composite source. Tokens bind exact request, current owner, sheet and registry digest. Old/unbound tokens require a fresh menu; they cannot revive costs. Private pagination and complete text attachments preserve every cost, exclusivity, frequency and blocked reason. Selection is not payment or dice.

Optional party context requires a privately reviewed `roll_share_preview` for the exact current accepted owner occurrence, immutable raw-source hash/offsets, request, actual native result and audience. `share` must explicitly name that preview and confirm; no preview means dice/status only. Context is attributed attempted intent, never an outcome or another PC's reaction. PC-target/unverified outcome claims cannot supply generic context. In a protected PvP scene, generic prose previews cannot substitute for independent per-owner clause proofs; result-only ordinary sharing remains available and independent mechanics are not frozen. Pending per-character disclosure uses only a source-confirmed accepted span, or a truthful context-withheld notice for older unsegmented declarations. Neither whole private messages nor unrelated sibling actions are copied into disclosure sources. Private preview/menu/registry records are excluded from general civic retrieval. No existing history is silently republished or upgraded.
# V9-07 read-only Discord boundary amendment

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.
Discovery and inactive-session roll queries do not resume unrelated turns or write query output into campaign memory. `pendingRollRequests` returns an empty list without a session; pending/result commands explicitly report no active session, without guessing historical control. Current-owner result access remains required when a session exists.
Native discovery uses the shared private sender with no public fallback or query-output archival. Each chunk revalidates the authenticated conversational principal (including proxy restrictions) and the exact scoped evidence packet. Changed control, attendance, source, or permissions halts subsequent parts. Structured acknowledged/not-sent/uncertain receipts remain distinct; unknown transport returns never certify delivery. Long selected facts are paginated rather than silently truncated; retrieval/display row limits remain explicit. Slash discovery preserves its scoped attachment, suppresses mentions, and revalidates before follow-ups. Native private roll/discovery interactions acknowledge before queued work; deferred responses preserve files/components and existing native receipt capture. Ordinary public Duality and rules-question visibility are unchanged.

## V95-02 immediate Fear authority

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

`resolveAutonomousPvpFear` and its bounded restart coordinator consume exact current native Fear triggers, scene/terms/principal evidence and native obligation order. A module-private capability distinguishes automatic selection/application from authenticated human GM overrides and untrusted model fields. Explicit manual mode, existing human selections and `needs_review` are not automatically bypassed. A later simultaneous obligation remains pending behind its source-verified predecessor, without converting to campaign Fear or future spotlight.

New GM-owned NPC threats require separate immutable native identity/presence establishment and immediate progression receipts. Creation alone grants no combat template, knowledge, PC reaction or injury. Existing clocks need an explicit current scene/location/audience context. NPC preparation needs its accepted encounter, current native binding and unique goal. An automatic investigation hold is limited to current accepted unfinished searches of that exact changed NPC; native predecessors and independent actions retain their receipts and agency.

Closed proposal fields alone do not certify cross-character semantics. The new-NPC Fear adapter accepts only an exact supported source-grounded native venue projection after identity checks; arbitrary prose stays private scope review. Receipt-rendered consequence output never interpolates proposal `threat_label`, public identity, portrayal, role or a negotiated objective. No player-name keyword filter or model safety assertion grants PC authorship. Existing legitimate source-verified NPC narration elsewhere is unchanged.

Automatic NPC attack selection does not authorize encounter activation, invent a GM ruling or prepare a forged GM offer. It consumes an exact existing native incoming request tied to the action Fear source and damage consent profile. Only the affected owner confirms reviewed defenses and chooses Armor; a separately verified internal NPC-roll capability rechecks current native Evasion/template/source/target before RNG. Fear stays selected and `awaiting_owner` until terminal native attack/miss and (for hits) damage receipts exist. Fear accounting references those receipts, never repeats their damage. Private notices bind the actual effect subject/current owner, not necessarily the Fear roller.

Effect and publication reservation are transactional; creation, committed attack dice and owner damage may be earlier independent native transactions and remain immutable if later accounting/delivery fails. Stale output is held independently of saved mechanics. All delivery, stored output, journal, recap, summary/shared-memory and voice paths retain current source and audience checks. Unsupported native mappings remain GM-private review with bounded attempts. No SQL migration, historical outcome rewrite, PvP Hope/Critical Stress award or consent expansion is introduced. Offline qualification is not live-pilot authorization.

## V95-03 private interaction authority

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

`pvp_private_ui` defaults off. `pvp-menu.js` exposes existing native services only to the current authenticated controlled owner, never proxies, model-supplied flags or a human GM speaking for another PC. Opaque custom IDs bind server-persisted principal/character, scene/session, exact native reference/source digest, role, character audience, offered action and expiry. Native source/consent/effect checks remain independent of UI token validity. Review/notification never consents; counteroffers invalidate native prior approval; damage/death and disclosure each require their separate exact owner decision.

Native operation and token consumption are transactional. Rendering and transport happen afterward, so a failed reply cannot roll back/repeat dice, resources, death or Fear. Delivery identities are claimed before transport and retained as delivered/delivering/uncertain across restart. Final sends revalidate owner and native review ancestry, including private attachments; no public fallback or blind resending. `damagePvpOwnerContext` proves private status without recording Review; new damage notices use the existing source-validated native publication outbox.

UI checkpoints/tokens/delivery rows are noncanonical operational coordination, not setting memory, player declarations, receipts or new mechanics. All existing native history, lethal-risk/Evasion/Armor/death rules, immediate Fear, zero PvP Hope and independently authored PC clauses remain authoritative. See [V95-03 guide and coverage](V95_03_PRIVATE_PVP_CONTROLS.md) for supported prerequisites, recovery and rollback. No schema or production migration, new GM authority, live qualification or V95-04 implementation.
