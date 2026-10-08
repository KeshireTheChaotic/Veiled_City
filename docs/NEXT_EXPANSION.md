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
pause_background:true. Without source_event it returns read-only advice (the
combined command retains a command receipt; use context for strictly read-only
diagnostics). Cues apply only to their saved scene. Recent speaker counts are
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

## OPTIONAL — MAY INCUR API COSTS

A human may choose a disposable campaign and explicitly run a real narration,
minor-NPC or TTS check with spending caps. This is never a required CI/release,
acceptance, versioning or deployment gate. This supersedes earlier Living City
documentation calling real-model smoke checks a deployment gate. Required tests
make no live API/Discord requests and do not deploy or push.
