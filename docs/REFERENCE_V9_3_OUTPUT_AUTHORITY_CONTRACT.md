# v9.3.1 P0 supplemental contract: cross-actor GM output authority and observational compatibility

**Supersedes:** only the V9-PVP-B output authorization and publication subsections of v9.2. It retains v9.1 bilateral stakes, non-damaging duality/three-strikes, and v9.2 separately authenticated clause ownership.

## 1. Threat model and mandatory rule

A party/world-director model turn can be triggered by *any* player, including one who is not in the narrative PvP contest. The model can say `Choso apologizes for losing.` even if Choso authored/ratified nothing, and can omit `narrative_claims`. No aspect of the triggering actor's identity gives another PC narrative agency. **Every player-visible output surface must be authorized by its material content, true source, affected character, and audience.** A GM may review wording but may never ratify another player's character response. **Ordinary questions or source-backed observations about other PCs are allowed; not-yet-described appearance is answered gracefully without authorizing invented new traits or actions.**

## 2. Two separate authorities

**State authorization:** Native owner declarations, signed PvP terms, current scene/action receipts, rolled dice, score, Hope receipts and authorized non-PvP state transitions. This is completed independently of rendering success. A verified Jaxon/Choso native duel can remain terminal even if prose is quarantined.

**Narrative publication authorization:** Each *material* PC statement, action, emotional reaction, concession, injury, movement, item/secret disclosure, obligation or chosen response must be separately supported by (a) an exact existing native stake/outcome where the stake itself already authorizes it, or (b) that PC owner's current separately authored/ratified source-bound clause. A receiver's consent to share content is a later visibility gate only. No arbitrary model passage is automatically evidence of any PC's response.

## 3. Protected scope, NOT triggering-owner lookup

Select relevant source-backed PvP agreements/resolution receipts by **campaign, active session, native scene/location, affected PC identities, status/history, and proposed output audience**. Include every party-visible PvP participant within that audience—even if the current turn's `actorUserId` is Billy and Billy is not a participant. Private audiences must be resolved by actual recipient/control scope. A previous/current PvP receipt remains relevant to a claim about that interaction even after the native window closes; do not treat closure as narrative authority. Avoid global campaign-wide freezing: unrelated session/scene or private audience with no access to the protected interaction should preserve ordinary existing behavior.

Do not derive protected identity from model-provided aliases/claims. Derive it from authoritative PvP agreement/receipt/PC ownership and audience. If scope cannot be determined, fail closed for publishing, without invalidating unrelated committed native actions.

## 4. Output preparation / render contract

Use **one canonical source of truth** (illustrative API, not a required exact export name), including an observation-answer part supported by actual visible evidence or a deterministic unknown response:

```text
prepareAuthorizedTurnOutput(db, guild, session, result, scope)
 -> { approved_parts, quarantined_parts, diagnostics }

approved_part = {
  kind: receipt_stake | owner_clause | verified_action | approved_neutral | observation_answer,
  source_ref, proof_refs[], audience, recipient?, content_hash, render_version
}

quarantined_part = {
  source_event?, origin_surface, origin_hash, audience, reason,
  status: needs_scope_review, audit_ref
}
```

- The **canonical renderer**, not the language model, constructs publishable text from verified native receipt fields, signed-stake summary, per-player clauses or explicitly bounded neutral templates.
- Model-written arbitrary `narration`, `public_narration`, `player_summary`, `private_messages` and unstructured connector prose are *candidates*. In a protected output scope, no arbitrary material prose is admitted simply because the model omitted claims or chose a harmless label.
- A model cannot mint an `approved_part`, set `verified=true`, or copy a raw paragraph under the identity of a legitimate receipt. Every part is independently reloaded from database-proven source/receipt/visibility, rendered and hashed by trusted code.
- Preserve exact source-verified own-action clauses, a separately ratified opponent reaction and the exact signed PvP result. Quarantine ambiguous, mixed-owner, or unsupported generated text as **noncanonical, private scoped review material**, with no party/other-player leakage. Do not split arbitrary English on punctuation and assume the remainder is safe.
- For an independently valid movement/search or other action in the same turn, **keep its authoritative native receipt** and publish a separately rendered, safely worded acknowledgement from the receipt. A tainted narrative paragraph must not force an otherwise safe sibling action to disappear or automatically rerun its mechanics.
- **Questions/observations are not forbidden PC agency.** A target-PC query can produce an `observation_answer` composed from actual observer-visible appearance, clothing, position, condition, witnessed speech or activity; source missing/partial gives a fixed truthful unknown or partial answer. The mere absence of a player-authored appearance description must not raise a security exception or block the turn. The inquiry must not create appearance, emotion, voluntary reaction, speech, whereabouts or secret evidence. Detailed rules are in `V9_3_1_OBSERVATION_CONTRACT.md`.
- If a caller invokes `validateNarrativeClaims` or `queueTurnPublications` *directly* with an unprepared raw result while a protected scope applies, reject before any player-visible publication or database enqueue. At the high-level orchestration boundary, explicitly prepare and quarantine untrusted prose first so the rest of the valid turn can continue.
- Store optional private candidate content only where the authorized user/GM may review it; avoid placing raw unsupported PC reactions into shared `context_memories`, public narration snapshots, vector indexes, voice queues, history, world facts, journals or NPC cognition.

## 5. Commit, revalidation and recovery

1. Identify and verify independent native actions and their real receipts under existing transactional authority; unsupported *state mutations* still fail/rollback as appropriate.
2. Independently prepare the safe publication parts and private quarantine records in the authoritative transaction. Use one exact source envelope (including output surface), versioned part keys, text hashes and visibility.
3. Revalidate each output part's native source/receipt/owner/terms/audience at **enqueue and delivery**, especially after restart, revocation or principal switch. A stale part becomes `needs_review/uncertain`, not a blind rerender of raw text.
4. Reconcile ordinary `narrative_claims` and native PvP clause proofs against the **approved** output, not the discarded raw draft; empty model claims do not bypass authorizing proofs.
5. Preserve idempotent delivery receipts and the V9-05 crash-safety requirements. No replay may regenerate rolls, spend Hope, duplicate publications or reveal a withdrawn reaction.
6. Quarantined content must never be used as input for a later automated `GM turn` that can reproduce it as a fact. A human GM may request revision, confirm bounded non-character neutral scenery or seek the affected owner's separately authenticated approval; GM-only review is nonauthorizing.

## 6. Sinks that share the same boundary

Mandatory: `GMService.runTurn()` post-generation, `applyAuthoritativeMutation` / `commitGmTurn` / `validateNarrativeClaims`, `queueTurnPublications` / `deliverTurnOutbox`, direct `runPendingDirectorPass` and `runPrivateSceneDirector` narration/private messages, other director/manual-generated player-facing payloads, any native PvP projection paths, public/private summaries and journal/handout surfaces generated from the unsafe text, and `voice.narrate`. Human-authored manual notes are a different trust/approval channel, not an AI mechanism to assign player actions.

**Voice requirement:** source only from already approved, audience-correct, persisted output parts; do not pass raw `result.narration` after a successful outbox delivery.

## 7. Acceptance predicates

- PVP30, PVP30a–t and BOTH PVP30q cross-actor negative cases pass unchanged.
- Billy triggers model prose `Choso apologizes for losing.`; `validateNarrativeClaims()` rejects raw, unprepared output; `queueTurnPublications()` enqueues **zero** unauthorized parts.
- Equivalent high-level mixed turn preserves Billy's independently authorized action and emits a truthful safe acknowledgement while the forged reaction is retained only as scoped noncanonical review data.
- Jaxon/Choso's separately authorized winner/reaction clauses + both applicable disclosure approvals render and enqueue once; omission/withhold remains neutral and does not synthesize a loser reaction.
- Source retraction, audience mismatch, version-1 records, changed principal or agreement, fake `verified` metadata, model claims `[]`, alias/pronoun rewrites and restart cannot launder an unsupported PC reaction.
- Director, private surface, voice and replay are independently exercised. Ordinary unrelated interactions outside affected PvP audience/scene continue normally.
- An otherwise valid `Choso: What does Jaxon look like?` inquiry is accepted with sourced visible attributes when available, otherwise a truthful nonblocking unknown; an optional private invitation to Jaxon does not create forced consent, new canon, or a failed turn.
- The same query cannot be used to publish an unsourced `Choso apologizes`, an invented scar, unseen private activity or a GM-only character secret; exact facts and perception govern any answer.
- No PvP HP/Armor/Stress mutation, no changed native result/dice/strike/Hope receipt, no skipped security gate, no hidden paid request.

## 8. Design limitation (deliberate)

An arbitrary English paragraph cannot be formally certified as harmless by a name scan, a blacklist, a generic LLM judgment or a zero-claim schema. This contract therefore permits rich creative drafts for review, but allows *canonical player-visible PvP material* only through saved, independently authorized **structured facts/clauses** and deterministic rendering. If a completely arbitrary model paragraph contains multiple actions, quarantine that paragraph; salvage its valid actions through their independent native receipts, not by slicing out words and guessing semantics.

## 9. Observation and character-description exemption — evidence-aware, not content-free

This v9.3.1 amendment is **mandatory before implementing v9.3**. A question about another PC's appearance, clothing, visible condition, prior observable speech/actions, or location is a permitted **information request** rather than an attempt to control that PC. It does not require bilateral PvP consent or a present description record. The response still requires native referent/scene, character-owner description provenance, observer visibility/witness evidence and destination-audience permission **for facts it asserts**.

When evidence is absent, render a fixed, truthful `not_established` / `not_visible` / `not_known_to_observer` acknowledgement; optionally invite the affected owner in a private, nonblocking, idempotent way to supply a description. Never invent durable appearance, reveal hidden character-sheet/GM-only material, answer unobserved private activity, or claim an inferred emotional/voluntary response. Source-backed physical observations are not equivalent to claiming the target has voluntarily acted in response to PvP. See the full `V9_3_1_OBSERVATION_CONTRACT.md` and OBS01–OBS22 matrix.
