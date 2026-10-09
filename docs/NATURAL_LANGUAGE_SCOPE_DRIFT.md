# Natural-language scope drift — follow-up review

Reviewed after the narrative-inference implementation, 2026-10-09. The original
findings below are retained as the rationale. The follow-up implementation and its
bounded acceptance criteria are recorded here; this is not a claim of unrestricted
live-model language reliability.

## Follow-up implementation (9.5.0)

| Finding | Implemented boundary | Verification |
| --- | --- | --- |
| D1 | Existing gameplay response can extract exact source-span-backed action, entry and speech candidates. Fragments and multiword/unquoted dialogue no longer require the legacy parser. Native listeners and owned entry policy still decide durable consequences. | Fragment entry stages the same native record; preview rolls back; native entry commits once; actual listener hears exact words; OOC, hypothetical, quoted/report and invented-span negatives. |
| D2 | Read-only scoped query planning expands ordinary retrieval vocabulary and authenticated visible aliases; SQL authorizes before matching/limits. Recall variants use the no-model/no-director path. Facts, events and artifacts retain source/coverage information. | Older diner clue found by cafe question behind 170 hidden records; hidden solution excluded; SQLite total_changes unchanged. |
| D3 | Revalidated session/control principal separates owner, PC proxy and NPC proxy. Proxy conversation uses a controller/role-specific context namespace, not owner character-private memory. Role selection reaches the router; private transcript storage uses that namespace. | PC and NPC proxy interpretation, owner-private exclusion, revoked/released role denial. Owner-only consent/personal workflows remain owner-only. |
| D4 | Separate `private_allow` grants audited native world operations. Private turn audience stays private; causal annotations and receipts remain GM-private. Native actor/source/revision/budget/lifecycle checks still run. | Explicit private NPC-goal reaction, replay once, undelegated denial; separately reviewed public observation excludes private cause. |
| D5 | Source-linked typed referents are queried by matching terms before limits, with recent focus as a fallback. A second-stage scoped fact query follows selected aliases/referents inside a separate whole-record 4,000-character budget. | Older implied-place retrieval, scoped references, source retraction, explicit omissions and existing prompt-budget tests. |
| D6 | An attended controlled actor's indirect messages reach the existing addressee/world-reaction router instead of being rejected by action grammar or pacing lexicon. No second interpretation call. Mention-only and OOC silence stay native gates. | Synthetic indirect action=true / player banter=false / OOC=false / mention=false matrix; exactly two router requests for the two eligible inputs. |
| D7 | Versioned application policy is projected into every structured request's instructions and the recap request. Constitution and Rules Desk agree on saved rulings and rules hierarchy; model dice permission removed. | Actual assembled request instructions and constitution checked; native RNG/regression suites retained. |
| D8 | Relationship/artifact drafts carry typed perspective and ancestry. PC-outgoing feelings and any debt/obligation score change become nonbinding interpretation records, not authoritative graph changes. Unsupported canonical artifact facts remain proposed metadata and presentation is illustrative. Recaps are non-authoritative synthesis. | Nonbinding PC score, source-backed and unsupported artifact cases, original-preserving review, restart/retraction, recap not objective evidence; exports/context retain epistemic labels. |

Implementation: `authored-candidates.js`, `conversation-principal.js`,
`scoped-query.js`, `authority-policy.js`, `presentation-evidence.js`, and the existing
GM/state/native domain boundaries. Acceptance: `bot/scripts/natural-language-scope-test.mjs`
plus the required offline regression gate. Tests use temporary SQLite databases and
fake model responses; no Discord or paid provider requests.

### Operations and compatibility

Existing flags remain opt-in. Natural interpretation needs `natural_language`;
durable speech also needs `dialogue_history` and `scene_continuity`; recall needs
`discovery`; native entry needs `scene_continuity`, a saved adjacency policy and
explicit `scene.enter` delegation. No live campaign flags were changed by this work.

`/vc-story delegation json:` retains the existing fields and accepts optional
`private_allow`, a subset of `allow`. Audited private world domains are `goal`,
`consequence`, `scene`, `group`, `strategy`, and `encounter`. Other domains retain
their existing private owner-safe operations or review requirements. Example:

```text
/vc-story delegation json:{"mode":"routine_delegated","allow":["goal.reprioritize"],"private_allow":["goal.reprioritize"],"max_operations":2,"max_cost":0,"expires_minute":1000}
```

Use a fictional expiry later than the campaign's current minute. This replaces the
saved policy, not merges with it: include other operations you intend to retain.
Existing policies have no newly delegated private world authority by default.
Private operations cannot rewrite existing public annotations. World state can
change while its private causal history remains private. A GM can independently
establish an observable party projection, without copying private causal text:

```text
/vc-story scene json:{"op":"project-effect","key":"<accepted private intent receipt>","expected_revision":"<current receipt fingerprint>","projection_key":"unique-observation","observation":"An independently reviewed observable effect."}
```

This writes an observation and GM-only causal linkage; it does not itself send a
Discord message. Normal later narration/discovery still validates audience knowledge.

Original-preserving presentation reviews use the existing GM-only memory command:

First inspect the target and obtain its current fingerprint through the read-only
existing scene-view command (GM-private JSON attachment):

```text
/vc-story scene-view json:{"op":"presentations","kind":"handout","key":"<full ID>"}
```

Omit `key` to list up to 12 recent targets. The same presentation kinds work for
inspection and review. Inspection writes no receipts or campaign data.

```text
/vc-story memory json:{"op":"review-presentation","kind":"handout","key":"<full ID>","expected_revision":"<current target fingerprint>","decision":"reject","reason":"Decorative inference is not proof.","source_refs":[]}
```

Kinds: `handout`, `relationship`, `relationship_interpretation`, `recap` (session ID).
Decisions: `approve` / `reject`. Reviews are additive annotations, not content rewrites,
canon promotion, owner consent or a PC-emotion override. GM context includes review
history and pending relationship interpretations. Existing originals remain intact.
The relationship provenance column is added idempotently on DB startup; legacy
AI records receive conservative read-time labels, not a silent historical rewrite.
Control grants also gain durable revision nonces, so revocation and regrant within
the same second cannot revive an old proxy context. Inferred/retracted relationship
records are excluded from trusted NPC cognition bootstrap.

### Deliberate limits, not unresolved command gates

Semantic candidates and router judgments still depend on the model; exact source
spans prove authorship, not universally correct semantic classification. Native
guardrails and bounded quotation/hypothetical negatives are not a universal parser.
Ambiguous entry targets remain understood context until separately resolved; they
do not become movement. Proxies do not gain owner-private sheets/memories or owner
consent merely by gaining interpretation. Search is bounded alias/vocabulary
expansion, not embeddings or an exhaustive semantic index; omissions are explicit.
Public projection remains a human-reviewed observation, not an automatic disclosure.
No paid live quality evaluation was authorized. Measure unnecessary clarification
separately from false-authority acceptance before claiming live-model quality.

See [database usage audit](DATABASE_USAGE_AUDIT.md) for non-memory persistence and
remaining adjacent interpretation/authority risks.

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

## Original findings (retained; addressed above)

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

## Original follow-up phases (completed as bounded native changes)

1. Align policy instructions (D7) and add source-span action/speech candidates (D1).
2. Improve read-only scoped discovery, old references and silence routing (D2/D5/D6).
3. Introduce explicit proxy/private authority principals and audience projections
   (D3/D4), retaining all native mechanics and owner consent.
4. Extend epistemic provenance to relationships/artifacts/summaries (D8).

In every phase, measure unnecessary clarification separately from false authority
acceptance. Require synthetic integration, restart/retraction/stale/replay and atomic
publication tests. Implementation is described above. No optional feature or new
delegation was silently enabled in a live campaign.
