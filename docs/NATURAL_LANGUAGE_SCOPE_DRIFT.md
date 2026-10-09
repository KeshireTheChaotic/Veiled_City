# Natural-language scope drift — follow-up review

Reviewed after the narrative-inference implementation, 2026-10-09. This is an
evidence-backed backlog, not additional features implemented by this document.

## Baseline and interpretation

The initial repository README (`455f37f`, v3.1.3) states: Discord is the interface,
SQLite authoritative state, and the model is the GM, not the database. The original
engine constitution describes a GM, adjudicator, world simulator, NPC actor and
continuity manager. `content/ENGINE/MULTIPLAYER_GM_RULES.md` requires low-friction
fiction, contextual play and legitimate private scenes while preserving agency,
knowledge boundaries and native mechanics. The current README retains that concept.

Findings below are gaps between that intended experience and current code. They are
not proof that live language quality declined in a particular release: no historical
player transcripts or controlled before/after model evaluation were supplied.
Consent, dice, access, source checks and ownership are intentional safety boundaries,
not restrictions to remove. Understanding a request and authorizing it must remain
different operations.

## Remaining instances

### D1 — Durable speech/actions still depend on command-shaped language (P1)

Evidence: `bot/src/player-language.js:interpretAuthoredText` recognizes a small
first-person verb list and quoted speech with a single slug-shaped addressee.
`scene-entry.js:entryTarget` only stages a few initial entry phrasings.
`dialogue-continuity.js:captureDialogue` requires that extraction and, privately,
an explicit target. “Heading inside,” indirect dialogue, unquoted speech and a
multiword NPC name can be understood by the GM without becoming native speech or
an actionable entry record. The new interpretation envelope does not claim to
remove these native capture limits.

Proposed: source-span-backed utterance/action candidates from the existing gameplay
call, with exact authored text, scoped alias resolution and native listener checks.
Separate inferred intent from explicit authorization for consent/costs. Maintain
OOC, quotation, hypothetical and mixed-message negatives. Test grammatical variants
against the same native consequence, not just successful acknowledgements.

### D2 — Discovery fast paths use literal grammar and literal retrieval (P2)

Evidence: `continuity-routing.js:discoveryQuestion` recognizes fixed question
patterns; `personal-continuity.js:discoverPersonal` explicitly uses bounded literal
queries without alias expansion. Synonyms such as “What was the lead at that cafe?”
may miss an older diner record or take the paid GM route instead of read-only
discovery. An empty result means not retrieved, never disproven.

Proposed: a read-only scoped query planner with visible aliases, source IDs and
omission reporting. Keep the zero-write/no-director fast path. Semantic retrieval
must filter privacy before ranking and must not invent discoveries or hidden answers.

### D3 — Proxy conversation does not share owner-context affordances (P2)

Evidence: interpretation and personal continuity call `personalCharacter`, which
requires the actual owner and active assignment. Production intentionally skips
owner context capture for NPC proxies. A legitimate PC proxy or NPC proxy therefore
does not automatically receive the new owner-specific referent memory/routing path.

Proposed: an application-authenticated control principal with explicit session scope
and the already granted knowledge boundary. Do not impersonate the owner or expose
their player-private memories. Test proxy expiry, switches, revoked control and
multiple controlled roles before broadening capture or interpretation access.

### D4 — Private-world effects are more restricted than private understanding (P1)

Evidence: the original multiplayer policy says private scenes can change the world
while discoveries remain scoped. `ai-intents.js:preflight` blocks most world-domain
intents from private scope; 9.4.0 only adds owned mundane `scene.enter` to the narrow
exceptions. `state.js:privateVisibility` and legacy event blocks also deliberately
constrain private global effects. This can turn a private NPC/world reaction into a
human-review dependency even when the meaning is already clear.

Proposed: separate actor/world authority from output audience. Allow explicitly
delegated native operations with private causal receipts and independently validated
public projections. Never solve this by relabelling a private turn as party scope.
Preserve every other PC's consent, attendance and knowledge boundaries.

### D5 — Lexical/recent context selection still loses older implied referents (P2)

Evidence: `context-planner.js` uses bounded token overlap; `GMService.buildContext`
uses recent messages plus bounded fact/canon/handout packets. The new interpretation
store improves owner references with keyword lookup, but does not index all historical
fiction semantically. A pronoun about an older omitted clue can still appear
underspecified even though the database contains it.

Proposed: typed, source-linked conversational focus plus scoped entity/alias indexing
and targeted second-stage retrieval within the existing input budget. Keep whole
records and explicit omissions. Do not expand every prompt indefinitely or replace
missing context with fictional assertions.

### D6 — Assisted routing remains a coarse gate outside active GM questions (P2)

Evidence: `GMService.shouldRespond` retains the original action-shaped regex; the
9.4.0 bypass is specifically a bounded answer to the latest GM question.
`story-continuity.js:pacingAdvice` also classifies some silence lexically before
routing. Indirect environmental reactions without a question or mention may still
be ignored. Mention-only silence and player-to-player banter are intentional.

Proposed: scoped focus/intended-addressee classification within the existing router,
with a measured silence/needless-interruption matrix. Avoid an unconditional second
model call. Add controlled live evaluation only with separate spending authorization.

### D7 — Packaged policy contains conflicting authority instructions (P1)

Evidence: `content/ENGINE/AI_GM_CONSTITUTION.md` still permits model-generated dice
if needed, while multiplayer/runtime policy forbids them. Its priority list is also
not identical to the Rules Desk's saved-ruling/source hierarchy. Runtime safeguards
win, but contradictory instructions can cause avoidable proposals/retries or rigid
clarification. This is an instruction consistency risk, not measured live degradation.

Proposed: one versioned application authority policy, with aligned human-facing and
model-facing projections. Remove obsolete model-dice permission; preserve native RNG
and saved human rulings. Test the assembled prompt, not only individual documents.

### D8 — Relationship and artifact interpretation need their own epistemic boundary (P1)

Evidence: `state.js:applyRelationshipDrafts` persists directional relationship
scores/notes; handouts have reliability and `canonical_facts` fields. The 9.4.0
typed-evidence change covers fact/clue records and cognition, not a full migration
of relationship notes, artifacts or past summaries. An inferred attitude or dramatic
artifact detail can look more settled when retrieved later than its source warrants.

Proposed: extend typed perspective/source ancestry to those records. PC feelings,
debt and agreement must not follow from a score or NPC interpretation. Canonical
artifact details need authorized sources; presentation can remain creative without
creating secret truth. Preserve originals and use reviewed corrections, not rewrites.

## Proposed follow-up phases

1. Align policy instructions (D7) and add source-span action/speech candidates (D1).
2. Improve read-only scoped discovery, old references and silence routing (D2/D5/D6).
3. Introduce explicit proxy/private authority principals and audience projections
   (D3/D4), retaining all native mechanics and owner consent.
4. Extend epistemic provenance to relationships/artifacts/summaries (D8).

In every phase, measure unnecessary clarification separately from false authority
acceptance. Require synthetic integration, restart/retraction/stale/replay and atomic
publication tests. These follow-ups are documented only; they were not silently
implemented or enabled in a live campaign.
