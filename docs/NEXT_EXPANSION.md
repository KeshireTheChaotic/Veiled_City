# AI-GM correctness roadmap (4.5 onward)

These releases extend existing cognition, city state, canon, clocks and backups.
No Daggerheart/Veiled City mechanics change. Constitution and Rules Desk retain
their separately documented scopes. Required gates: `cd bot; npm run validate`.
The runner denies network access and uses dummy credentials. Passing mocks is
not live-model or Discord coverage. No live campaign data is rewritten.

## Phase A — 4.5.0

Gap: reviews, atomic mutations, dice, receipts, queues, backups and migrations
existed; freeform consequential assertions needed a local contract. GM/director
responses now carry bounded narrative_claims: actor/entity, prior/proposed state,
visibility, source span/reference, certainty and matching event index. Unsupported
damage, movement, secrets, obligations, lifecycle, canon and model dice fail
before commit. Uncertain speech must be framed explicitly; it cannot launder
real secrets. Cosmetic descriptions remain valid. No new verification AI call.
Normal turns reuse their existing bounded correction path.

Failures expose sanitized category/recovery messages plus a GM diagnostic object
with entity/source references, not full prompts or secret text. Inspect source
IDs through existing GM fact/ledger commands. Validation is read-only. It cannot
guarantee semantic detection of every undeclared claim in arbitrary prose;
conservative tripwires supplement the typed contract. Binding changes that need
another mechanical/GM workflow are refused, never invented to fit narration.

`test:contract` uses hand-authored synthetic Responses API fixtures, actual
GMService parsing/schema/retries/router, mock Discord permissions, serialized
queues and seeded privacy cases. Existing suites retain deterministic dice,
commit/publication-failure, restart, backup and migration coverage. All required
suites run behind a network-denial preload. No schema migration is necessary.
Upgrade: back up, stop the old bot, restart. Register commands when they change.

## Phase B — 4.6.0

Reuse: scoped facts, NPC cognition, reports, history, goals, contact actions,
resources, relationships and channels. New ContextPlanner filters by actor and
scope before ranking/budgeting, preserves source/status/confidence and explains
omissions. No AI selection call. `/vc-story context json:{"actorType":"npc",
"actorKey":"alice","query":"quay"}` is GM-only/read-only, as is `diagnose`
(JSON result/scope). Context token counts are conservative estimates, not a
provider tokenizer. Plans cap at 6000 estimated tokens; adaptive main-turn
requests additionally refuse inputs over 120000 characters.

Enable `/vc-city flags json:{"adaptive_context":true,"conversations":true}`.
Both default off. Adaptive context replaces the main turn's unranked global-fact
selection and adds an explainable source plan; immutable operating instructions,
roster, encounter and existing bounded cognition remain separate prompt inputs.
NPC packets never include global GM facts. No persistent second knowledge store.

`/vc-story conversation` takes JSON key/source_event/from/to/from_goal/to_goal,
opportunity (round/scene/downtime/manual), optional information_key or bounded lie.
Two available non-proxied NPCs need active compatible goals and an established
directed channel. One exchange per fictional tick; stable keys replay without
cost. Existing deterministic contact mechanics/costs decide success and share
only the sender's actual knowledge. Durable refusal policy stops contact without
spending. Lies remain explicitly unverified speech, not new canon/knowledge.
Positions and pre-contact packets are retained; no agreement is bound. Further
commitments use the existing explicit-consent workflow. This is on-demand, not
an always-running model conversation loop. No new schema; city records already
participate in backups. Register commands after upgrade. Offline fixtures cover
old clues beyond 120 records, role switching, contact/refusal and duplicate cost.

## Phase C — 4.7.0

Reuse: session/director scene, transcript/presence, fixed canon, facts and saved
Duality rolls. New scene cues and mystery links use existing private city_records
with source_event, transaction/ledger and backup support; no new schema or clock.
`/vc-city flags json:{"pacing":true}` opts in to local dialogue silence, held
background round passes, repetition/length guards and scene continuity cues.
No initiative/action limit, combat insertion, mechanics or forced PC choice.
`/vc-story pacing` JSON supplies source_event, stakes, dramatic_question,
objective, pressure, unresolved_beats and optional allow_transition:false or
pause_background:true. `/vc-story pacing-status` returns strictly read-only
advice. Cues apply only to their saved scene. Recent speaker counts are
descriptive, not a measure of actions or a mandatory spotlight queue.

`/vc-story mystery` takes key/source_event/anchor_key/question/routes/hypotheses.
Routes have key/method/fact_id and optional witness/information_key. At least
three distinct facts and methods must already exist. Truth references existing
canon and cannot be swapped by deductions; hypotheses stay unverified. No new
evidence is invented or private fact promoted by this command.
`/vc-story clues` is read-only with key/userId/characterId/optional gm; actor views
omit hidden anchors and unrelated evidence. Existing fact authority/confidence
is preserved. New investigation methods can be configured against established
facts by the GM; newly authored evidence still needs normal human review.

`/vc-story attempt` JSON: key/source_event/mystery/route/roll_id/character_id/
difficulty. The human sets Difficulty under existing rules; the resolver reads
an existing action roll, never generates/selects dice. Failure records a clarity/
timing adjudication need, keeps all accessible routes viable, and never applies
automatic costs or new modifiers. This assists adjudication, not a replacement
for the Rules Desk or full semantic interpretation of every mystery. Register
commands after upgrade. `test:continuity` covers silence, scene preservation,
three routes, failed-roll reachability, fixed truth and unrelated-private refusal.

## Phase D — 4.8.0

Reuse: actors, finite resources, goals, delegation, knowledge/reports, existing
obligations and review/audit primitives. New private negotiation records keep
every revision and stable step identity. `/vc-city flags json:{"negotiations":true}`
opts in. `/vc-story negotiate` JSON: key/step/source_event/op. First offer also
includes participants [{type,key,goal_key,personnel_key,awareness_keys}] and terms
{statement,deadline,jurisdiction,costs,major,supernatural,recognized_terms,obligation}.
Costs: [{party:"npc:key",resource:"materials",amount:1}]; optional obligation:
{debtor,creditor,content}. Participants need established goals or delegated
institutional procedure/jurisdiction. Referenced knowledge must actually be held.
The state machine supports offer/counteroffer/concede/refuse/approve/accept.
Terms changes invalidate approval; originals remain in history. Deadlines and
resource totals are checked again before acceptance. Accept requires accepted_by
mapping each endpoint to its authorized identity (PC owner ID or NPC/faction/
institution endpoint), recorded by the human GM. Major agreements need approval
for that revision before any expense. Active proxies cannot be auto-committed.

PC expenses are not supported here. Human consent is attested by the GM, not
inferred from freeform model text. Acceptance records an existing-style obligation
and bounded NPC/institution expenses atomically; it does not execute territorial,
secrecy, canon, legal or supernatural consequences. Those remain separate reviewed
workflows. This is not a universal law engine or automatic adjudicator of wishes.

`/vc-story forecast json:{"query":"pump"}` or {event_key:...} is GM-only and
strictly read-only, deriving bounded possible branches from existing event links,
due schedules, weather, commitments and infrastructure. Dependencies, mitigations
and uncertainty accompany every branch. No unrolled PC outcomes or new mechanics.
No new schema; existing backup/restore covers records. Register commands after
upgrade. `test:negotiation` covers revisions, pending/no-cost review, authority,
consent, unavailable resources, retry conservation and snapshot/ledger equality.

## Phase E — 4.9.0

Reuse: sourced events, causal links, approvals/consents and mutation ledger. New
`/vc-story why json:{"event_key":"schedule:day-100"}` (or mutation_id) is a
GM-only, read-only explanation. It shows source lifecycle, bounded causal links,
ledger IDs/changed fields, recorded resource/approval metadata, authority-source
paths, non-established claims and existing inspection/recovery commands. Actor
attribution remains interpretation; a source link is not independent proof.
Missing validation detail stays unknown. No explanatory AI call or state writes.

`npm run test:endurance` is mandatory through validate: seed 490, 100 fictional
days, 300 NPC actions, multiple seeded factions/institutions, 100 deadline replays,
100 clue-reachability checks, private actor isolation, unchanged absent PC/canon,
resource conservation, bounded context, backup/restore/restart and failed publish
repair. Metrics are deterministic counts, not paid benchmarks or evidence that
arbitrary real-model language is perfect. The dedicated scenario suites continue
covering proxy/travel/combat/consent/negotiation refusals. Long-run testing found
and fixed capped goal lookup: action validation now retrieves the requested
goal/dependency directly before applying any budget; faction ownership is checked.
No schema change or live-data rewrite. Register the added why command on upgrade.

## Phase F — 4.10.0 (roadmap's proposed 5.0 feature slice)

Version policy follows the user's explicit minor-release-per-phase instruction:
4.9.0 -> 4.10.0, not a major release. Reuse: persistent NPC portrayal/voice,
optional cost-capped VoiceNarrator, content-seeded identities, typed entity
materializers, canon anchors and private draft/review conventions. No new schema.

`/vc-story portray` JSON: npc/source_event/direction/public_voice_approved.
Direction fields: address, formality, humor, verbal_habits, emotional_tone,
pronunciation (each max 160 chars). Text-only GM guidance uses persistent
portrayal by default. `/vc-city flags json:{"voice_direction":true}` additionally
allows explicitly public-approved direction in `/vc-voice narrate text:... npc:key`.
Voice still requires the existing VOICE_ENABLED/configured channel; enabling a
city flag does not synthesize anything. One existing selected voice is reused,
not one paid voice per NPC. Direction is captured per queued request, never
drawn from private memories. Private scopes are refused before synthesis, even
with force:true. Public prose must still be intentionally player-safe.

`/vc-city flags json:{"authoring":true}` enables `/vc-story author` JSON
key/kind/source_event/data. Kinds: npc, faction, location, institution, mystery,
relationship. Drafts remain GM-private and do not alter canon or live entities.
Validation uses existing production materializers within a rolled-back savepoint;
temporary validation/audit writes do not survive. `/vc-story author-review`
JSON key/decision:approve|reject revalidates before atomic materialization.
Stable draft IDs/review replay do not duplicate state. Existing names/IDs and
packaged NPC names cannot be overwritten. Seed packaged content first using
`/vc-admin seed-data` to include all established faction/location identities.

Guided typed data (human supplied, no extra generation call):

| Kind | Required/allowed data |
| --- | --- |
| npc | name, occupation, public_identity, portrayal; no knowledge/goals |
| faction | name, description, personality, activity_tier |
| location | name, description, wards, entrances, hazards |
| institution | Existing institution schema: name/mandate/capacity/procedures/jurisdictions |
| mystery | anchor_key/question/routes; existing canon and three distinct sourced clues |
| relationship | fromType/fromKey/toType/toKey/relationshipType/score/note; existing non-PC endpoints |

This is an authoring/review workflow, not automatic campaign invention: no new
rules, character options, culprit swaps, domain cards, legal authority or public
discovery. Newly defined canon still uses the existing human canon/proposal
workflow before a mystery references it. Invalid drafts/refusals leave state
untouched; approved records remain in normal backup/restore and GM exports.
`test:authoring` covers all six kinds, duplicate/canon/mechanics refusal, review
idempotency, rolled-back validation, privacy and fake-TTS routing. Final hardening
also checks narration against actual committed resource deltas transactionally,
rejecting clamped/blocked changes rather than publishing unsupported injury.

## New flags and upgrade summary

All new runtime options default off. Use `/vc-city flags json:{"name":true}`
to enable one; false disables it and unspecified options are preserved.
Inspect `/vc-city status` attachment for the current server's flags.

| Flag | Runtime effect |
| --- | --- |
| adaptive_context | Ranked source plan for main-turn GM facts; no selection AI call |
| conversations | Explicit bounded NPC contact resolution |
| pacing | Local dialogue/continuity/held-background controls |
| negotiations | Reviewed offer/counteroffer/acceptance state machine |
| voice_direction | Explicitly public-approved optional NPC TTS diction |
| authoring | Typed private world drafts and human approval |

Back up and stop the old process, update code, restart, then `cd bot` and
`npm run register` to install story commands and the optional voice NPC argument.
Schema stays 440: no table rewrite or synthetic migration bump was necessary.
Restore uses existing safety snapshots/backups. Nothing auto-deploys, publishes
to Discord, pushes git or changes live campaign databases. Required offline
validation includes all previous suites and six new phase suites. The current
limits are deliberately bounded and diagnostics do not imply full natural-
language proof, universal legal simulation or live-provider certification.

## OPTIONAL — MAY INCUR API COSTS

A human may choose a disposable campaign and explicitly run a real narration,
minor-NPC or TTS check with spending caps. This is never a required CI/release,
acceptance, versioning or deployment gate. This supersedes earlier Living City
documentation calling real-model smoke checks a deployment gate. Required tests
make no live API/Discord requests and do not deploy or push.
