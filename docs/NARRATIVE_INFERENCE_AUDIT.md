# Narrative inference / authoritative state audit

Principle: infer ordinary fictional context freely from audience-appropriate
conversation, but validate consequential persistent changes separately. Understanding
what a player means is not evidence that their proposed action succeeded. This is
an implementation audit, not a claim of unrestricted model language understanding.

Scope: development worktree. Original findings below are retained as the historical
audit; implementation status and remaining limits are recorded here for 9.4.0.
Online rules retrieval is implemented separately in `RULES_ONLINE_SRD.md`.

## Implementation — 9.4.0

The ten recommendations have bounded native implementations and regression coverage,
not a certification of unrestricted language understanding. No live feature flags,
delegation policy, campaign records or Discord registrations are changed by this release.

| Finding | Implementation |
| --- | --- |
| 1 | Nullable closed `narrative_interpretation` separates references, intent, acknowledgements and material questions from consequential claims. Authenticated message sources and owner-private interpretation records carry no world authority. |
| 2 | Source-backed named clarifications attach candidate locations to the original pending attempt, preserving its text and owner. Native review checks the new revision, active clarification ancestry, session, scene and prior position. Older interpretation retrieval uses scoped keyword searches plus recent context, bounded to 6,000 characters of whole records. |
| 3 | `scene.enter` resolves only a current owned attempt under explicit delegation and a saved GM-approved zero-cost adjacency policy for this session/scene. Locked, restricted, contested, hazardous, unknown, travel-cost/time and encounter movement cannot use this resolver. Conflicting nonliteral candidates require review. |
| 4 | Gameplay and world-director generation preview the same native resolver inside an always-rolled-back transaction. Commit stages operations and receipts, then checks consequential claims against staged position/access/status/custody/obligation/disclosure/canon. Damage checks actual before/delta receipts. Rejection rolls back before publication. Safe prose is no longer universally erased whenever an intent exists. |
| 5 | AI fact/clue proposals persist typed hypothesis/testimony/observation metadata, perspective and source ancestry. Missing metadata defaults to hypothesis. Observations must repeat committed observations; AI cannot establish truth. Human establishment creates an independent GM ruling. Retrieval, briefs and discovery preserve evidence type and source activity. |
| 6 | AI memories and knowledge both require witnessed, recipient-delivered or actor-owned inferred evidence, even when optional language flags are off. Inferences and reports cannot become `known`. Unknown profiles require authorized authoring/review; cognition cannot create them. Retracted ancestry blocks fresh authority; historical subjective records remain. |
| 7 | Assisted routing considers bounded audience-scoped conversation focus when answering the GM's latest question, excluding the current incoming transcript row. Mention-only mode, OOC and player-to-player silence remain. No additional interpretation provider call. |
| 8 | Nonbinding consent discussion is recorded without consent/spending and continues to ordinary GM handling, without a mandatory clarification response. Exact terms/revision/owner authorization still governs binding operations. |
| 9 | Advisory `uncertainty` means unresolved mechanical outcome. Separate `referent_uncertainty` and `fictional_uncertainty` permit ordinary narration while a consequential action stays pending. |
| 10 | Required `narrative-inference-test.mjs` exercises paraphrases, private/foreign scope, source-backed aliases, stale revisions, real GM generation/production commit, rollback, replay/restart, locked/encounter entry, compound uncertainty, hypotheses, delivery/inference and scoped routing. Existing end-to-end publication/restore/consent suites remain required. |

### Operator enablement

No new flag is introduced. Context capture/routing uses `natural_language`;
entry resolution also uses `scene_continuity`; advisory guidance uses
`decision_advisory`. Consequential commit/evidence protections are not optional.

```text
/vc-city flags json:{"natural_language":true,"scene_continuity":true,"decision_advisory":true}
/vc-story scene json:{"op":"entry-policy","location_key":"silver-moon","from_locations":["diner-frontage"]}
/vc-story delegation json:{"mode":"routine_delegated","allow":["scene.enter"],"max_operations":1,"max_cost":0,"expires_minute":1440}
/vc-gm fact-promote fact_id:<fact ID> target:established
```

Both locations must already exist. Configure adjacency only after reviewing actual
access: this explicitly declares a zero-cost mundane connection, not a city travel
route. Policies are session/scene-specific; create a fresh policy when the scene
changes. Delegation replaces the campaign allowlist: merge other desired operations
and choose an expiry after the current fictional minute. Human entry review remains
`/vc-story scene` with `op:review-entry` and the current review fingerprint.
`fact-promote target:established` preserves visibility; public promotion is separate.
New AI canon likewise needs committed observation ancestry; unsupported inference
must use explicit human promotion. Legacy AI obligation patches are rejected:
binding terms must use native negotiated/owner-consented workflows.
Register the updated slash schema to expose the new `established` choice; JSON scene
operations use the existing command. Restart the bot to load changed runtime code.

### Explicit limits

Interpretation records are nonbinding contextual annotations, not proof of a correct
model interpretation. Native initial attempt/speech capture and discovery fast paths
still have conservative syntax; ordinary GM understanding is not limited to that
syntax. Alias auto-resolution only accepts source-backed named existing locations,
not arbitrary model-created places. Newly resolved aliases change the pending
fingerprint, so a subsequent native proposal must use the refreshed revision.
Existing untyped AI facts are treated conservatively as hypotheses when read; they
are not silently rewritten or promoted. Seeded legacy knowledge retains explicit
native seed trust. Historical summaries are not automatically rewritten.

Prose omission/framing tripwires are bounded, not a universal semantic verifier.
The compound-clause test closes the measured laundering case, not every possible
paraphrase. Synthetic passing fixtures measure these specific cases, not live-model
false-positive/negative rates. No paid evaluation was run. Further scope drift and
proposed follow-up phases are documented in `NATURAL_LANGUAGE_SCOPE_DRIFT.md`.

## Findings and required changes

### 1. P1 — Generalize the interpretation boundary

Evidence: `bot/src/player-language.js` uses a coarse regex `kind` classifier;
`bot/src/scene-entry.js` adds scoped reference context; `bot/src/narrative-integrity.js`
still needs a narrowly worded acknowledgement exception for the reported failure.

Required: introduce a read-only interpretation envelope for contextual referents,
intended actions, conversational acknowledgements and materially unresolved questions.
The envelope must have no mutation authority and must not become NPC knowledge or
canon. Generate consequential mutation proposals separately. Do not expand phrase
whitelists indefinitely or treat an `unclear` language tag as an action blocker.

Acceptance: varied ordinary paraphrases and pronouns resolve naturally with no world
writes; identical text claiming an actual arrival, binding obligation or disclosure
still needs native authorization and audience checks.

### 2. P1 — Stop conflating unresolved names with unresolved permission

Evidence: `entryTarget` captures a literal destination; `locationMatches` accepts only
normalized exact keys/names/titles; `reviewSceneEntry` compares against the original
pending target. A later “I meant the Silver Moon diner” is understood in conversation
but does not revise the pending target's resolution. Pending packets are bounded to
recent entries in the current scene and are not a general referent memory.

Required: track owner-scoped candidate referents/aliases separately from the submitted
attempt, with original source and clarification provenance. Let review select a
source-supported resolved referent without changing the player's original intent or
automatically creating a place. Revalidate revision, owner, access and scene at commit.
Persist or retrieve relevant older scoped referents without promoting them to facts.

Acceptance: a follow-up name resolves the existing attempt without requiring the
player to repeat the whole sentence; conflicting candidates prompt one meaningful
question, and a private alias never resolves another player's reference.

### 3. P1 — Add policy-driven resolution for ordinary movement

Evidence: `prepareSceneEntry` only reconciles an already-saved public location;
other entries, including private ones, require `reviewSceneEntry` human adjudication.
Removing forced name questions did not remove this blanket human-review dependency.

Required: a native movement/access resolver should distinguish harmless movement in
an established accessible scene from travel, restricted access, contested entry and
encounter movement. An explicitly delegated policy may resolve the former; the latter
must retain native travel/combat checks or human review. Never move characters simply
because the GM inferred which building was intended.

Acceptance: authorized mundane entry can complete without repeated human intervention;
locked doors, travel costs/time, active encounters, unknown places and unwilling
participants cannot be bypassed by prose or inferred intent.

### 4. P1 — Validate consequences against staged authoritative deltas

Evidence: `validateNarrativeClaims` validates committed movement against the saved
position before mutations; only damage has a dedicated post-application result check
in `assertNarrativeApplied`. Uncertainty framing and omitted-claim detection are
bounded phrase tripwires, not complete semantic validation. `GMService.runTurn` and
`applyAuthoritativeMutation` validate narration before native changes are applied.

Required: validate proposed operations first, produce an authorized staged state/delta,
then verify consequential narration against that delta and publish after atomic
commit. Cover movement, access, status, custody, obligations and disclosure, not only
damage. Separate conversational formatting corrections from authority rejection;
never “repair” narration by manufacturing state. Preserve fail-closed behavior for
unsupported consequences and scope/knowledge breaches.

Acceptance: a legally resolved movement can be narrated as completed exactly once;
blocked or rolled-back movement cannot be published as arrival. Compound sentences
cannot launder consequences with a single “might” or “intends” keyword.

### 5. P1 — Keep inferred observations out of objective fact storage

Evidence: `applyGMEvents` writes `fact`/`clue` values after a nonempty-value check,
with provenance/confidence but no explicit distinction between an observation,
testimony, inference and objective truth. Narrative disclosure checks retrieve these
records as scoped facts. A cosmetic or tentative interpretation can therefore become
durable authoritative-looking evidence if emitted as a structured fact.

Required: typed epistemic records with source ancestry, perspective, uncertainty and
promotion rules. Inferences/testimony may persist as such; promotion to established
world truth needs an authorized resolver or GM approval. Preserve old testimony when
its source is retracted, but prevent its use as fresh objective authority.

Acceptance: “perhaps she is hiding upstairs” remains a hypothesis even across restart,
summarization and retrieval; it never establishes her presence or knowledge.

### 6. P1 — Close the NPC memory/profile authority gap

Evidence: in `applyNpcCognitionDrafts`, `knowledge` calls `assertNpcObservation`, but
`memories` do not. `ensureProfile` can create a durable profile for an unknown NPC.
Conversely, `assertNpcObservation` is tightly coupled to physical scene observation
for new knowledge, which is insufficient as a general model of inference or delivered
reports. Both excessive restriction and unsupported durable writes are possible.

Required: validate memories and knowledge against typed observation, delivery and
inference sources. Keep subjective impressions distinct from objective knowledge.
Create unknown NPC profiles only through an authorized creation/review path; memory
text must not implicitly establish attendance, powers or a canon identity.

Acceptance: an NPC can speculate from a legitimate clue without becoming omniscient;
an absent NPC cannot acquire a witnessed memory, and an invented name cannot silently
become a persistent actor through a cognition draft.

### 7. P2 — Route contextual follow-ups without requiring action-shaped syntax

Evidence: `GMService.shouldRespond` has an `assisted` regex gate and its router sees
the message/roster, not the active scoped conversational referents. A short follow-up
such as “That one.” can be ignored before the GM understands its context.

Required: feed a bounded scoped conversation focus/pending question into routing.
Allow relevant follow-ups while preserving player-to-player silence, OOC handling,
rate limits and response-mode semantics. Do not add an unconditional extra paid
interpretation pass or change all party banter into GM turns.

Acceptance: an answer to the GM's last meaningful question reaches the GM without a
forced mention; unrelated table conversation still remains silent.

### 8. P2 — Separate conversational replies from binding consent and spending

Evidence: `routeConsentMessage` returns a clarification prompt for all nonbinding
replies in its command-like grammar. `rollDeclaration` accepts a narrow set of exact
phrases; alternate natural phrasing is not native spending authorization. These are
appropriate safety limits at commit, not requirements for ordinary understanding.

Required: interpret discussion, counteroffers, corrections and desired help naturally
without applying consent, selecting another PC's dice or spending Hope. Ask for a
confirmation only when a consequential native operation needs it, with exact current
terms, revision, ownership and independently authenticated participant consent.

Acceptance: ordinary conversation proceeds without a repetitive “what did you mean?”
loop; ambiguous “sure” or quoted/hypothetical language never commits terms or costs.

### 9. P2 — Distinguish narrative uncertainty from mechanical uncertainty

Evidence: `decisionContext` says “underspecified clarify” and the advisory validator
rejects `narrate` whenever `uncertainty` is nonempty. That field can become a broad
blocker unless it means specifically unresolved outcome/adjudication uncertainty.

Required: separate uncertain outcome, unclear referent and merely uncertain fictional
color. Require clarification only when the unresolved part affects a consequential
operation; permit narration and contextual understanding while an action stays pending.

Acceptance: the GM can acknowledge intent and describe established surroundings while
travel/access remains unresolved, without pretending the pending action succeeded.

### 10. P2 — Expand end-to-end false-positive/negative regression coverage

Evidence: current tests are hand-authored bounded fixtures. The new entry-context
tests cover the reported acknowledgement, scoped referents and unchanged authority,
but do not establish general natural-language reliability.

Required: a paraphrase matrix spanning pronouns, mundane context, implicit references,
multi-clause statements, private/public surfaces, source retraction, stale revisions,
restart/replay and compound uncertainty. Exercise actual routing, native resolution,
commit/rollback and publication. Measure needless clarification separately from false
authority acceptance; use optional controlled live evaluation only with authorization.

## Suggested implementation order

1. Interpretation envelope + routing + source-backed referent resolution (1, 2, 7).
2. Native movement/access policy and staged consequence validation (3, 4).
3. Typed inferred evidence and NPC cognition provenance (5, 6).
4. Natural consent discussion and narrowly scoped adjudication uncertainty (8, 9).
5. Expand the end-to-end matrix throughout each phase (10).

Preserve existing privacy, PC ownership, saved GM rulings, consent, resource accounting,
idempotency, native travel/combat and atomic rollback protections in every phase.
