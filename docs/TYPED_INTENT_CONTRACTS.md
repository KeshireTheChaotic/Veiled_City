# Typed Intent Authority Contracts

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## T03 rules-grounded adjudication

- Native arbitration accepts only a current accepted typed intent whose authenticated source, owner principal revision, active session and scene still match.
- Conflict precedence is: applicable saved ruling, exact `override:` campaign override, verified `srd:` RAW, compatible `house:` or `homebrew:` extension, then an explicitly provisional result. Provisional knowledge cannot silently create a risky roll.
- `roll_required` structured output is incomplete unless it contains bounded risk, stakes, Difficulty, trait, roll kind, explanation and namespaced rule sources. The state transaction converts it into a real pending `roll_request`; merely narrating or labeling a roll has no effect.
- Straightforward no-roll completion produces an idempotent `action_outcome_receipt`. Risky resolution produces no outcome receipt until the existing native roll/encounter services commit it. Player-authored success claims remain unverified and never substitute for either receipt.
- Replay uses stable adjudication/request/receipt keys. Preview follows the same transaction path and rolls back without drawing dice. Existing native Daggerheart dice, Hope/Fear, critical, collaboration, reaction, damage, consent and resource checks remain the only outcome authority.

## T04 compound-action dependencies

- An enriched intent may identify only unique earlier action indices as prerequisites. Acceptance converts those indices to stable proposal identities tied to exact source occurrences; missing dependencies, forward references and cycles are rejected.
- Compound nodes share one authenticated actor, source, session and scene. They persist ordered `ready`, `pending`, `suspended`, `resolved`, `failed`, `blocked` or `clarification` status independently from narration.
- A pending prerequisite suspends only its dependents. A failed/blocked/clarification prerequisite blocks its causal descendants, while an independent ready action remains executable and can receive its own native receipt.
- State application omits suspended/pending scene actions and rejects scene effects attached to blocked nodes. Terminal compare-and-set transitions require a native receipt and replay only when that same receipt already owns the result.

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
