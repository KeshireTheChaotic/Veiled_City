# Database roles beyond campaign and setting memory

Code/schema audit, 2026-10-09; follow-up release 9.5.0. This inventory describes the
application, not the contents of a live production database. No production data was
queried, rewritten or exported for this audit. Sources: `bot/sql/schema.sql`,
`bot/src/db.js`, and the consumers cited below.

## Conclusion and design boundary

SQLite is not used only as fictional memory. It also persists native mechanics,
identity/privacy/control grants, configuration, proposals/consent, scheduling,
publication/idempotency, diagnostics, provenance and recovery. These are generally
appropriate application-state responsibilities. Removing them would lose restart
safety, privacy, deterministic rules or replay protection. The GM interprets language;
JavaScript native resolvers adjudicate consequences; SQLite persists their inputs,
state and receipts. A failed lookup is not inability to understand a sentence.

This request documents non-memory uses; it does not authorize deleting them,
replacing native mechanics with model judgments, purging audit logs or altering the
live database. Operational records can contain private player text and hidden GM
material even when their purpose is not fictional memory.

## Complete physical-table inventory

Tables are grouped by primary role; many mix memory and application state. The
generic JSON stores are expanded in the next section rather than treated as fiction
merely because they live in a campaign database.

| Tables | Uses beyond fictional memory | Main consumers |
| --- | --- | --- |
| `campaigns` | Discord channel/GM-role mapping, response mode, director pause, active-session pointer; also native Fear/Veil Exposure and party state. | `commands.js`, `index.js`, `publishing.js`, `db.js` |
| `players` | Discord identity, private-channel routing, accessibility/render preferences. Not PC knowledge. | `discord/privacy.js`, `publishing.js`, `continuity-routing.js` |
| `characters` | Owner/lifecycle/guest authorization, native character sheets, resources, equipment and advancement, alongside fiction. | `character-system.js`, `combat.js`, `state.js`, `roll-requests.js` |
| `sessions` | Lifecycle, assembly workflow, director cadence/queued passes; recap is non-authoritative narrative memory. | `index.js`, `director.js`, `gm.js`, `session-briefs.js` |
| `session_presence`, `session_characters`, `npc_proxies` | Attendance and current authenticated control/owner/proxy grants. NPC proxy packets are curated knowledge, not full cognition. | `roster.js`, `conversation-principal.js`, `index.js`, `city-constraints.js` |
| `facts`, `clocks`, `threads`, `reference_entries` | Primarily scoped campaign memory. Clocks also drive deterministic progress; fact visibility/provenance supports authorization, retrieval and evidence validation. Recaps/hypotheses must not become objective truth. | `epistemic.js`, `context-planner.js`, `narrative-integrity.js`, `state.js` |
| `published_messages` | Discord message IDs for edit/upsert/reconciliation. Operational delivery mapping, not evidence that an actor learned something. | `publishing.js` |
| `messages` | Audience-scoped transcripts and Discord source IDs, routing/focus, prompt assembly and recap synthesis; also source-authored context. A transcript assertion is not an adjudicated outcome. | `index.js`, `gm.js`, `narrative-context.js` |
| `rolls` | Native dice results and mechanical roll receipts. Models read results; they never supply RNG. | `dice.js`, `commands.js`, `roll-collaboration.js` |
| `audit_log`, `mutation_ledger` | Actor/source attribution, before/after images, error refs, command/turn auditing and source-authorship proof. Not player-visible by default; may contain sensitive prompts/text. | `db.js`, `provenance.js`, `publishing.js`, `state.js` |
| `encounters`, `encounter_combatants` | Native combat/spotlight, Battle Point budgets, HP/status/armor, lifecycle, roster snapshots and outcome reconciliation. | `encounter.js`, `combat.js`, `commands.js` |
| `character_drafts`, `levelup_drafts` | Pending sheet generation/review/advancement workflows, not approved character state. | `character-system.js`, `commands.js` |
| `campaign_snapshots`, `campaign_backups` | Logical recovery/restore copies, administrative rollback and validation. These contain mixed private fiction and operational state. | `db.js`, `commands.js` |
| `canon_events`, `canon_conflicts`, `canon_proposals` | Canon memory plus authenticated promotion/conflict/review workflows. A proposal is not canon. | `state.js`, `commands.js` |
| `downtime_cycles`, `downtime_projects` | Project acceptance, progress, resolution and time/accounting workflows as well as project fiction. | `commands.js`, `gm.js`, `long-projects.js` |
| `rules_rulings` | Rules authority: saved human rulings, source/query lookup and explicit adjudication. Rules memory is not setting fiction; native resolvers still enforce mechanics. | `gm.js` Rules Desk, `roll-language.js`, `roll-requests.js` |
| `relationships`, `relationship_hook_imports` | Directional continuity plus derived numeric dimensions/milestones and one-time import bookkeeping. Scores are never PC feelings, consent or binding debt. | `relationship-state.js`, `state.js`, `simulation.js` |
| `handouts` | Artifact memory, reliability/presentation, custody/status metadata and delivery/export payloads. Canonical source facts are separate from decorative prose. | `handout.js`, `evidence-custody.js`, `concept-context.js` |
| `encounter_aftermath` | Pending/resolved aftermath drafts and review lifecycle, not a second combat resolver. | `commands.js`, `gm.js` |
| `character_gm_hooks`, `character_narratives` | Imported/background memory plus permissions, audience classification, source hashes, import/update workflow. A hook is not permission to choose a PC's action. | `character-narrative.js`, `concept-context.js`, `gm.js` |
| `operation_receipts` | Durable Discord-interaction idempotency, response caching and completed/failed command state. Not fictional testimony. | `commands.js`, `db.js` |
| `director_history` | Model/director cadence, triggers, acted/skipped/failed diagnostics, proposal/mutation summaries and rationale. Rationale does not establish a fictional fact. | `director.js`, `index.js`, `db.js` |
| `npc_profiles`, `npc_memories`, `npc_knowledge`, `npc_goals` | Primarily subjective NPC memory/agency; also activity selection, evidence gating, lifecycle, confidence/salience/recall counters and goal progress. Recall bookkeeping is a write made during some context retrieval. | `npc-cognition.js`, `simulation-motivation.js`, `scene-continuity.js` |
| `seed_runs`, `seed_documents`, `seed_catalog` | Content archive/index plus import hashes, actor/run summaries, idempotency and unmapped-content review. Imported files/metadata are untrusted reference data, not runtime instructions or automatic truth. | `seed-data.js`, `seed-drafts.js`, `content.js` |
| `simulation_entities`, `simulation_records`, `simulation_clock` | Fictional entities/history plus native actor resources, travel/actions/results, relationship projections, scheduler/work budgets and deterministic fictional time. | `simulation.js`, `simulation-strategy.js`, `city-core.js` |
| `city_calendar`, `city_schedule` | Epoch/timezone and optional flags; scheduled fictional work, due ticks/minutes, approval and fired/cancelled receipts. No wall-clock permission to choose PC actions. | `city-calendar.js`, `activity-density.js` |
| `world_events`, `world_event_links` | Fiction/evidence ancestry plus source attribution, visibility, retraction/supersession and causal routing. An indexed asserted event is not necessarily an observation. | `city-calendar.js`, `epistemic.js`, `city-consequences.js` |
| `city_records` | Shared typed store for fiction AND configuration/workflow/operational records; see below. | Civic, story and AI/native domain modules |
| `district_locations`, `city_edges` | Setting topology plus authoritative travel duration, adjacency and information-network routing. Understanding “there” does not authorize traversal. | `city-core.js`, `city-civic.js`, `scene-entry.js` |

SQLite's foreign keys, transactions, WAL/checkpoints, indexes, `rowid` cursors and
`PRAGMA user_version` are storage/migration mechanisms, not campaign memory.
The startup compatibility migration adds missing columns and relationship
projections; it is not a free-form language interpreter. Snapshots/backups have
explicit inclusion/exclusion rules in `db.js`; do not assume a logical restore
replaces all diagnostic logs, Discord messages or operational receipts.

## Mixed/generic stores: important non-memory examples

- Delegation/configuration: `city_records.kind=ai_delegation`, entry policies,
  pacing/portrayal/mystery controls and other saved policies. Flags are in
  `city_calendar.flags_json`; session orchestration is in `sessions.director_state_json`.
- Proposals/reviews: `ai_intent`, `world_draft`, `seed_draft`, `goal_transition`,
  `group_transition`, `encounter_proposal`, `arc_candidate`, invitations,
  `organization_request`, `project_draft`, and presentation reviews. Their status,
  fingerprint, source and expiry matter; existence is not acceptance or execution.
- Consent/collaboration: `consent_reply`, commitment/project/organization offers,
  `roll_request`, roll contributions/adjudications, tag-team usage and partner/helper
  workflows. Exact native terms/revision/owner checks authorize spending or binding
  participation; natural discussion does not.
- Delivery/replay: `roll_publication`, AI intent receipts, scheduler/work-slot
  bookkeeping and counters. Publication failure does not roll back committed
  mechanics or authorize retrying the same consequence.
- Retrieval/maintenance: `narrative_context`, `authored_candidate`, `scene_entry`
  candidates, `memory_cluster`, `memory_cursor`, activity/relevance selection and
  source indexes. These persist interpretation or processing position, not new truth.
  `npc_memories.recall_count/last_recalled_at` are operational salience telemetry.
- Native world execution: strategies, action/result records, consequence
  subscriptions/receipts, infrastructure service state, travel/arrival, scene
  occupancy, long-project phases and resolved world encounters. These are
  consequential state/workflow, not merely prose memory.
- Presentation: `relationship_interpretation`, `presentation_review`,
  `effect_projection` and portrait/diction guidance. Store perspective and the
  authority boundary; review does not retroactively rewrite an original source.

Names above illustrate current consumers; a generic store permits new `kind` values,
so a fixed enumeration alone is not an exhaustive future governance policy. All new
kinds must declare authority, audience, lifecycle, retention and replay behavior.

## Adjacent issues and recommendations (documented, not silently removed)

1. Some GM context retrieval calls `retrieveNpcCognition(...recordRecall:true)` and
   increments recall counters before a turn commits. Keep this explicitly separate
   from zero-write discovery; consider post-commit telemetry or a separate metrics
   store. A rejected draft must not be interpreted as a witnessed NPC memory.
2. Numeric relationship dimensions/milestone names and historical simulation
   projections remain legacy continuity signals. New AI PC-feeling/debt drafts no
   longer mutate the graph; read-time epistemic labels do not erase old projections.
   Relationship bootstrap now skips inferred/retracted relationships rather than
   converting them into new NPC profiles or trusted seeded memories.
   Review legacy records before using them to drive consequential decisions. Native
   obligations/consent remain the only binding authority, regardless of “debtor” labels.
3. JSON bags mix fiction, configuration, pending intent and delivery state. Add typed
   repositories or separate logical namespaces over time; do not let a generic
   `status=active` imply a uniform kind of truth. All SQL stays inside `VeiledDB`.
4. Literal/alias ranking and source limits are retrieval aids, not language authority.
   Unreturned records are omissions, not disproof. The follow-up fixes bounded paths;
   it does not add an exhaustive embedding index or prove all live paraphrases.
5. Logs/receipts/transcripts/backups may retain personal text beyond the fictional
   memory purpose. Define an operator retention/redaction policy and test that
   purging logs does not break indispensable consent/replay/source ancestry. No
   automatic purge or retention-period change was implemented in this request.
6. Stored imported rules/house rules and online SRD excerpts are reference material,
   never prompt instructions or permission to change the engine's rules edition.
   Versioned application authority and native rules code take precedence over
   accidental policy text in a seeded document.
7. Saved recap prose and legacy artifact presentation may contain earlier inference
   errors. They now carry conservative perspective labels; originals are preserved
   and corrections are additive GM reviews. No blanket historical rewrite was made.
8. Presence, attendance, consent, travel, actor knowledge and resources are necessary
   persistent authority checks, not ordinary-reference comprehension gates. A model
   may understand a player before these records authorize the requested consequence.

## Not database uses

OpenAI/Discord credentials remain environment configuration, not stored campaign
secrets. The serialized GM-turn queue, voice connection/playback queue and the
online SRD service's bounded fetch/cache state are runtime concerns, not additional
SQLite fictional memory. Packaged content and release manifests remain files.
Voice diction may read saved portrayal guidance; that does not itself spend TTS
credits or authorize narration when playback conditions are not satisfied.

## Verification scope

Static schema/consumer inspection covers all declared application tables and mixed
stores above. Offline D1-D8 tests check zero-write discovery, source/privacy,
interpretation versus native consequences, original preservation and replay/restart.
This is not a production-data compliance audit, a retention-policy implementation,
or a controlled live-language quality evaluation.
