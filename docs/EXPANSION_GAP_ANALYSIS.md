# Expansion gap analysis (October 8, 2026)

Source: `C:\Users\Keshi\Downloads\SUGGESTIONS.md` (new v5.1–v6.0 specification).
Initial audited HEAD: `dc80bf7` (Seed Update), clean `main`, package/manifest 5.0.0.
Schema 440. No live campaign databases, GM rulings, production files or providers
are accessed for implementation/testing. Applicable saved rulings remain runtime
authority; new descriptors do not change SRD/house-rule mechanics.

## Capability matrix

| Proposal | Existing implementation and observed evidence | Verdict / uncovered edge | Minimal extension and acceptance evidence planned |
| --- | --- | --- | --- |
| P01 dynamic motivations | `npc-cognition.js:seedNpcCognition`, `db.js:upsertNpcGoal`, `simulation.js:goalsFor/applySimulationUpdates/commitNpcDirector`; cognition/simulation suites exercise manual/dossier goals, dependencies and costs | PARTIAL: no sourced transition history or bounded event-driven formation for all actor types | Extend simulation goal handling; actor-source verification, immutable transition history, opt-in opportunity processing; withheld evidence, proxy, conflicting goals, replay and restore tests |
| P02 consequences | `city-civic.js:applyNpcServiceOutcome/recalculateInfrastructure/transmitCityBelief`, `simulation.js:executeNpcAction`, `city-calendar.js:processCityDue`, ledger/world links and publishing receipts | PARTIAL: physical service propagation exists; typed cross-domain subscriptions/receipts need coordination | Reuse service/transmission/goal validators in bounded subscriptions; pending review, causal/source checks, exactly-once handler/entity version receipts; no global information broadcast |
| P03 scene presence | `city-constraints.js:assertNpcAvailability`, `npcAvailability`, `cityEdges(route)`, combat state, session roster, narrative integrity | PARTIAL: actual whereabouts and routes exist, not scene-scoped actor-relative witness/evidence occupancy | Extend physical continuity with sourced presence/departure/barriers; hidden and believed presence separated; no combat state edits; remote hearing, exit and export tests |
| P04 groups | `city-civic.js:updateCityCivic(community/personnel)`, relationships, channels, `negotiations.js:negotiateAgreement` | PARTIAL: membership records exist, no consensual lifecycle/schism proposals | Reviewed community transitions, member acceptance/decline and history; major transformations remain pending; no implicit information/resources |
| P05 strategy | `simulation.js` goals/actions/resources/delays, institutional procedures and `outcome-preview.js` | PARTIAL: single-step pursuit, no durable prerequisite graph or sourced replan history | Extend existing actor goals with bounded plans/alternatives, material-source replans and stopping conditions; execute via existing action resolvers only |
| P06 personal arcs | `character-narrative.js`, `story-continuity.js`, private facts/threads, commitments, relationships and `ContextPlanner` | PARTIAL: sourced components exist, not a player-established scoped arc index | Reuse private city records/source facts; owner-authenticated input and nonbinding callbacks; decline without costs, character-switch/privacy tests |
| P07 discovery | `/vc-intel`, `db.js:contextFacts`, `ContextPlanner`, `story-continuity.js:mysteryView`, handout scopes | PARTIAL: visible facts available, no unified character-relative changed/open/witness query | Read-only evidence-backed lookup; authorize actor/character before ranking; no alias joins or state/receipt writes |
| P08 long projects | downtime cycles/projects, schedules, commitments, NPC goals, existing finite resource checks | PARTIAL: per-cycle projects, no persistent phased dependency/time state | Extend downtime with private phased projects referencing existing adjudicated results; explicit consent and fictional time; interruption/restart tests, no new currencies |
| P09 mediation | `assertNpcAvailability`, overlapping commitments, institution delegation, serial queues and atomic action execution | PARTIAL: resource conservation/overlaps covered, pending travel/concurrent plan reservations need arbitration | Extend shared constraints/precommit checks; deterministic defer/review, contested claims never resolved as fact; last-unit/retry/travel tests |
| P10 consolidation | `npc_memories`, salience retrieval, `historyContext`, source-linked summaries, `ContextPlanner` | PARTIAL: originals and old-clue search exist; no reversible actor-relative cluster lifecycle | Existing history/memory source pointers with revision/correction; visibility before selection; old evidence retrievable, originals unchanged |
| P11 density | `simulationCandidates`, active/supporting/background/dormant, 1/3/4 director budgets, context bounds | PARTIAL: bounded actions exist; actor/packet selection still scans large eligible sets | Deterministic affordability/relevance ranking, cold-state retention and known-event wakeups; hard work/packet/proposal caps, no extra provider calls |
| P12 offline benchmark | `validate-offline.mjs`, offline guard, contract/context/continuity/negotiation/endurance/authoring suites | PARTIAL: extensive synthetic coverage; no consolidated golden/mutation benchmark metrics for this roadmap | Reuse real validation/commit paths with malicious fixture categories and compatibility fixture; report fixture results, not live-model guarantees |
| P13 integration | backups/restore/export, `provenance.js:explainWhy`, typed DB access, safe flags, deployment docs | PARTIAL: foundations satisfied; new lifecycle/flag/backfill contracts require integrated diagnostics | Consolidate shared contracts; audit-based explanations, flag/migration/rollback matrix and old-campaign regression; no parallel managers or tables |

All extensions reuse `city_records`, world events/links, simulation records,
existing NPC goals/memories and ledger. These already provide guild keys, source
links, visibility, backups and restore; no new table or migration is justified.
New autonomous behavior defaults off. Only existing GM-authorized command
boundaries may review administrative proposals. PC-facing workflows authenticate
the actual controlling owner and never accept an input JSON identity as authority.

## Phase record

| Phase | Fresh audit HEAD | Version | Status |
| --- | --- | --- | --- |
| A: P01–02 | dc80bf7 | 5.1.0 | EXTENDED; baseline and phase-specific zero-token gates pass |
| B: P03 | ecfe238 | 5.2.0 | EXTENDED: occupancy and actor-relative access; offline gates pass |
| C: P04–05 | pending | next minor | Pending fresh audit |
| D: P06–07 | pending | next minor | Pending fresh audit |
| E: P08–09 | pending | next minor | Pending fresh audit |
| F: P10–11 | pending | next minor | Pending fresh audit |
| G: P12 | pending | next minor | Pending fresh audit |
| H: P13 | pending | next minor | Pending fresh audit |

Each accepted phase is validated and committed before starting the next. User
version policy takes precedence over roadmap labels: bump one minor per accepted
phase, rolling `.9` to the next major `.0`; do not jump to 6.0 merely for Phase H.
Quota stop: pause on a reported remaining account usage of 5% or less. Current
tools expose no account quota meter, but the current thread's local token-count
telemetry includes rate-limit percentages; recheck it throughout implementation.

### Phase A accepted extension

P01 EXTENDED: `simulation-motivation.js` adds source-verified proposals for NPCs,
factions and institutions, all seven transition operations, constraints, prior
state and immutable transition history. `db.js` overlays the existing goal-status
CHECK constraint using small `goal_state` metadata records; paused/superseded
goals remain retrievable without rebuilding the table or duplicating objectives.
Director opportunities generate bounded pending investigations; approval is a
GM authorization, not arbitrary human goal seeding. All later actions continue
through existing cost/method/personality/commitment validation.

P02 EXTENDED: `city-consequences.js` adds three typed handlers, explicit
subscriptions, durable candidate receipts, causal paths and human review.
Existing physical service dependency propagation is reused, not reimplemented.
Blocked effects have recorded reasons, no partial costs, and can be retried after
correcting prerequisites. Subscription cancellation stops future candidates.

Evidence: `scripts/expansion-a-test.mjs` invokes actual source checks, three actor
types, goal transitions, service effects, negative knowledge/guild/PC cases,
pending/replay/restart/restore and unchanged canon. Existing network-denied suites
cover NPC proxies, absence, resource costs, publishing, migration and exports.
No live-model/provider/Discord behavior was tested or claimed. Detailed commands
and rollback are in `EXPANSION_RELEASES.md`.

### Phase B audit and extension

Fresh ecfe238 audit: `assertNpcAvailability` still guards established travel and
commitments; `combat.js`, encounter combatants, roster and NPC positions remain
authoritative. Phase A motivation/causal records are reused, not replaced.
P03 EXTENDED in `scene-continuity.js`, with `setDirectorState` atomic archive
integration and optional in-person checks in existing NPC conversations.
`expansion-b-test.mjs` checks unknown/remote/hidden witnesses, sound barriers,
private source disclosure refusal, absent PC agency, zero-write views, player
export, scene transition, restart and restore. Source/visibility/subject metadata
use existing city tables, so no new schema or parallel physical/combat engine.
