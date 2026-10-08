# Living-world expansion contracts

All additions are sourced administrative continuity, not new Daggerheart/SRD or
Veiled City house-rule mechanics. The constitution, saved rulings and existing
mechanical resolvers remain binding. Future ruleset portability needs a separate
architecture proposal. Offline synthetic tests do not prove live-model quality.

## Features and safe defaults

Flags are per-campaign stored city flags, not environment variables. All eleven
default off, including on upgraded campaigns. Enable only the features desired
with `/vc-city flags json:{"strategies":true}`; disable with false. Existing flags
are preserved. `/vc-story expansion-status` is GM-only/read-only and reports the
actual flag values, schema, lifecycle counts, work bounds and recovery guidance.
The runtime registry is `bot/src/expansion-contracts.js`; commands and examples
are in [release notes](EXPANSION_RELEASES.md).

| Flag | Records / authority | Disable and rollback behavior |
| --- | --- | --- |
| emergent_goals | goal_transition / goal_state; pending actor-owned goals | No new proposals or reviews; existing approved goals/actions persist |
| consequences | consequence_subscription / consequence; reviewed typed handlers | No new extension processing; candidates and receipts persist |
| scene_continuity | scene_presence / scene_residue; descriptors only | New occupancy/in-person extension checks stop; native movement/combat unchanged |
| emergent_groups | group_transition; explicit NPC responses + GM review | No new group transitions; established communities persist |
| strategies | strategy; subjective DAG through native actions | Plan opportunities stop; review/cancel already queued native actions separately |
| personal_arcs | arc / arc_beat; owner statements/nonbinding invitations | New statements/recall/invitations stop; private history persists |
| discovery | read-only scoped facts/events/arcs | Query disabled; no knowledge removed |
| long_projects | long_project; consented existing downtime results | Project transitions stop; native submissions/resolution remain separate |
| conflict_mediation | existing action/plan/source checks before costs | Extra exclusion checks stop; native resource/availability/review guards remain |
| memory_consolidation | memory_cluster; actor-relative source excerpts | Cluster recall stops; originals remain independently retrievable |
| activity_density | ephemeral bounded candidate/packet selection | Prior selection/ranking restored; no durable tier/history changes |

Disabling is not rollback and does not cancel a native scheduled/pending action.
Pause/abandon strategies to cancel their queued steps, or use native GM action
review. Disabling cannot refund already applied costs. GM snapshot/backup restore
is the explicit state-rollback path, with a pre-rollback safety snapshot.

## Data ownership and transitions

`VeiledDB` remains the only production SQLite boundary. Schema stays 440: existing
city records, world events/links, NPC goals/memories, simulation records, downtime
results and mutation ledger represent all additions. No new tables, generic
director, alternate rule engine, destructive backfill or campaign reset.

| Entity | Lifecycle | Source / commit contract |
| --- | --- | --- |
| Goal transition | pending → approved/rejected | Actor legitimately knows source; same prior goal and constraints rechecked; virtual paused/superseded metadata overlays existing NPC status CHECK |
| Consequence | pending/deferred/blocked → completed/rejected | Campaign/event/subscription/handler/entity/version receipt; typed handler validates causality; effects and receipt atomic |
| Scene presence | actual/believed/uncertain/departed → archived residue | Current session/scene, arrival and observer access; descriptors never move actors or change combat |
| Group transition | pending responses → approved/rejected | NPC choices, alive/non-proxy revalidation, unchanged membership snapshots; no implicit resources/knowledge |
| Strategy | pending → active/paused/blocked/completed/abandoned/rejected | Existing objective, own evidence, ordered prerequisites; one native action or reconciliation per opportunity; material-source reviewed replans retain history |
| Arc / invitation | owner statement revisions; pending → accepted/declined | Active present owned character only; switch/proxy boundaries; no PC feelings inferred or mechanical effects |
| Long project | awaiting_consent → active/paused/completed/abandoned | Each phase binds explicit owner consent to an existing submission; elapsed fictional work time and GM-adjudicated resolved results; no double consumption |
| Memory cluster | active revisions → reverted | Pointers checked against actor/campaign both at write and recall; originals/uncertainty preserved; no canon promotion |

Only command-boundary GM authorization may approve administrative world proposals.
PC identity is obtained from the authenticated interaction and actual ownership,
never a supplied JSON user or GM flag. Private continuity excludes absent PCs and
proxies; between-session projects instead use eligible ownership and explicit
phase consent. Shared project data consists of the agreed plan and evidence IDs,
not automatic disclosure of another character's private result text.

Consequence handlers are an explicit registry: service, goal and transmission.
Adding one requires a typed source/causality check, authority review, atomic
effect/receipt, bounded fan-out, and malicious/replay/rollback fixtures. Global
event access never grants an actor knowledge. Physical damage never automatically
transmits reports; channel knowledge remains independent from service state.

## Work, cost and time

No new per-actor model calls. Existing NPC director budgets are round 1, scene 3,
downtime 4; new opportunities share remaining capacity. Existing institution
execution remains separately capped at 2. Density materializes at most 32 actors
after SQLite ranking, returns at most 4 packets, each <=12,000 characters and
combined <=24,000; SQL work still scales with stored data. Other campaign prompt
sections retain their existing limits. Oversized actor packets are omitted rather
than losing authority constraints. Consequences scan at most 20 subscriptions
and 50 recent events per opportunity; historical bulk replay is not implicit.

Only explicit fictional triggers advance the clock. Uptime, read-only discovery,
diagnostics, recap requests and retrieval do not advance time or discover facts.
Paused project time does not count as work. Native action costs/rolls, institution
capacity, route/commitment and consent/review checks remain the source of truth.
Cost estimates are advisory, not current-price or total-billing guarantees.

## Evidence-backed explanations

GM `/vc-story why` accepts an event/mutation as before, or:

- `{"kind":"strategy","key":"clerk-plan"}`
- `{"kind":"goal_transition","key":"clerk-report"}`
- `{"kind":"consequence","key":"<receipt-key>"}`
- `{"route":{"from":"home","to":"station"}}`

Output includes actual stored lifecycle/error/reviewer/step/cost metadata, bounded
source/causal pointers and actual mutation ledger entries. Missing reasons remain
unknown, not model-produced explanations. A route descriptor is not proof of
permission or actual arrival. All results are GM-private, zero-write and create
no interaction receipts/player upserts/error-log mutations. Player discovery has
the same zero-write property but only returns character-authorized evidence.

## Upgrade, backup and rollback

1. Stop the bot and create/retain a full backup with the existing admin workflow.
2. Pull the accepted release in production only when explicitly deploying. This
   implementation task does not deploy, push, register commands or touch live data.
3. Install dependencies with the project's existing workflow (`npm install`, or
   `npm ci` where a lockfile is available). Existing schema initialization/migration
   applies on restart; no manual data reset/backfill is required for this roadmap.
4. Register updated slash-command definitions through the existing deployment
   workflow, restart and inspect GM expansion-status. Keep all new flags off until
   desired features are reviewed and enabled individually.
5. For rollback, stop execution, review native queued actions and the existing
   restore-preview, then restore a chosen full backup/snapshot explicitly. Code
   rollback uses a known release checkout. Earlier code may ignore new record
   kinds; do not run an old release against live new state without backup/review.

The integration fixtures cover representative synthetic 3.3/3.8 column/thread
shapes and v5.0 data, preserving characters, facts and memories through migration,
and both pre-expansion and expanded backups. They are not an exhaustive guarantee
for every historical/custom database or a claim of live migration testing.

Each accepted phase is committed independently, versions 5.1.0 through 5.8.0.
The shared release helper rolls 5.9.0 to 6.0.0 (never 5.10.0), rejects skipped phase
versions, and permits idempotent manifest rebuilds. `npm run validate` checks
network denial, compatibility, privacy, scope/agency, costs, review, time, replay,
backup/restore and generated release hashes. Live OpenAI/Discord/voice tests remain
optional, manual and separately authorized; none were performed here.
