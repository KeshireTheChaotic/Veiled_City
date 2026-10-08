# Sourced living-world expansion

No PC/SRD/house-rule mechanics change. Administrative descriptors and investigative
opportunities are subjective GM-private world state, not canon or player rules.
The [gap analysis](EXPANSION_GAP_ANALYSIS.md) records existing foundations and
fresh phase audits. All mandatory tests use network denial and dummy credentials;
fixture success is not proof of live-model quality. No live migration/deployment.

## 5.1.0 — Phase A: motivations and consequences

Enable with `/vc-city flags json:{"emergent_goals":true,"consequences":true}`.
Both default disabled. Existing NPC/faction director opportunities share their
1/3/4 budget with bounded motivation/consequence candidates. No extra inference
calls are required. NPC/faction/institution goals can form from legitimately
known source events, not arbitrary global GM facts; proposals remain pending.
Original interpretation and before-state remain in source-linked history.

GM commands:

- `/vc-sim goal json:{"key":"clerk-report","actor_type":"npc","actor_key":"clerk","information_key":"report","source_event":"observed-report","goal_key":"investigate-report","objective":"Investigate the reported anomaly","priority":70}`
- `/vc-sim goal json:{"key":"clerk-report","decision":"approve"}` (or reject).
  Further proposals use `op`: reprioritize, pause, resume, complete, abandon,
  supersede; supersede also requires an unused `new_goal_key`. Approvals recheck
  source knowledge, availability, proxy and the unchanged prior goal.
- `/vc-sim consequence json:{"op":"subscribe","key":"station-damage","source_event":"gm-configuration","handler":"service","event_kinds":["infrastructure_damage"],"entity_key":"station-power","location_key":"station","payload":{"delta":-10}}`
- `/vc-sim consequence json:{"op":"run"}` processes one goal and one consequence
  opportunity; no fictional time is implied. Inspect `/vc-city records
  kind:consequence` or `kind:goal_transition`; review with consequence JSON
  `{"key":"<candidate-key>","decision":"approve"}` (reject/defer supported).

Handlers reuse typed service, goal and transmission validators. A service source
must physically affect that service; channels/reports remain independent of
physical damage. Pending/blocked effects apply no cost or disclosure. Each
campaign/event/subscription/handler/entity/version has a durable receipt. Failed
approval rolls back effects and records an explainable blocked candidate.
Subscriptions currently scan the latest 50 events and at most 20 subscriptions;
historical bulk replay is not implied. Rejected candidates do not regenerate.
Cancel a subscription with consequence JSON
`{"op":"unsubscribe","key":"station-damage","source_event":"gm-configuration"}`.
Already proposed candidates remain separately reviewable/rejectable.

Upgrade: back up, stop the bot, pull the accepted release, run `npm ci` where a
lockfile is available (otherwise `npm install`), register changed commands and
restart. New records reuse existing schema 440 tables and are included in full
backups/restores and excluded from player exports. Disable flags to stop new
autonomous proposals; preserve records/history. Roll back state only via an
explicit GM snapshot/backup review, and code via a known release checkout.

## 5.2.0 — Phase B: scene-local continuity

Enable `/vc-city flags json:{"scene_continuity":true}` (default off).
`/vc-story scene` accepts source-backed descriptive occupancy JSON:
`{"entity_type":"npc","entity_key":"clerk","source_event":"arrival-observed","location_key":"station","zone":"desk","range":"Close","visibility":"party"}`.
The source must establish the location and appropriate disclosure boundary.
NPCs must already have arrived through existing movement/travel state. PCs need
active roster presence and explicit owner-established fiction (`accepted_by`),
and proxy choices remain protected. No PC or combat record is mutated.

`state` is actually_present, believed_present, uncertain or departed. Hidden
occupants are always GM-private; `known_to` contains explicitly authorized
observer identities (`npc:key` / `character:id`). Barriers use entity_type barrier,
two zones (`zone`, `to_zone`) and `blocks:["sight","sound"]`. Descriptive range
bands are Melee, Very Close, Close, Far and Very Far; no distances, speeds or
mechanical costs are added. Actual encounter state always overrides descriptors.

`/vc-story scene-view` is GM-only/read-only. Optional JSON
`{"observer_type":"npc","observer_key":"clerk"}` limits results to genuinely
accessible presence and strips private history/other observers. A departed or
remote witness cannot overhear. Explicit in-person NPC conversations use
`mode:"in_person"` and require reciprocal sound access; existing directed remote
contact channels remain valid and do not imply third-party overhearing.

Completing a director scene transition archives presence as private scene residue
atomically with the transition. Historical residue is not current occupancy or
actor knowledge. Reappearance requires a new arrival/travel source. Backup and
rollback reuse existing tables and snapshots; no manual migration or reset.

## 5.3.0 — Phase C: groups and strategies

Enable `/vc-city flags json:{"emergent_groups":true,"strategies":true}`; both
default off. `/vc-story group` accepts
`{"key":"circle-formation","group_key":"circle","name":"Circle","source_event":"observed-contact","members":["clerk","porter"],"operation":"form"}`.
Each NPC needs an explicit response using
`{"key":"circle-formation","op":"respond","member":"clerk","decision":"accept"}`
(or decline); GM `op:approve` / `reject` completes review. Other operations:
join, leave, dissolve, split, merge; split/merge require `from_groups` and existing
source membership. Full dissolution needs every member's acceptance. Proxies
cannot be autonomously recruited. Community membership grants no secrets,
resources, debts or allegiance; new groups start at capacity zero.

`/vc-story strategy` accepts
`{"key":"clerk-plan","actor_type":"npc","actor_key":"clerk","goal_key":"investigate","information_key":"report","source_event":"observed-report","cost_ceiling":3,"alternatives":["Retreat"],"risks":["Insufficient supplies"],"steps":[{"key":"prepare","requires":[],"action":{"type":"prepare"}}]}`.
GM `op:approve` starts the plan. `op:run` advances one action or reconciles its
result; director cycles share existing bounded opportunities. Routine actions
still use application-generated dice; consequential steps remain pending their
existing review. Optional `deadline_minute` is fictional simulation time, never
wall-clock time. No plan has guaranteed outcomes or PC targets.

Use pause/resume/abandon/reject for lifecycle control. Pause cancels queued steps
without costs; executed steps retain costs/history. A cancelled step needs a
new-key replan, not replay. `op:replan` requires a different legitimately known
source, the same owner/objective, new unsubmitted step keys and another approval.
Run to reconcile a submitted result before replanning. Source loss, exhausted
resources, ended objectives or deadlines block execution with an audit reason.
Inspect GM `/vc-city records kind:strategy` or `kind:group_transition`. Disable
flags to stop new opportunities; already queued actions use their native review
and cancellation controls. Backups and rollback follow the Phase A procedure.

## 5.4.0 — Phase D: personal arcs and discovery

Enable `/vc-city flags json:{"personal_arcs":true,"discovery":true}` (off by
default). Present players with an active owned character may use
`/vc-intel arc json:{"key":"promise","type":"vow","statement":"Find my brother without violence"}`.
Types: dilemma, stake, relationship, vow, choice, desire. These are explicit
player statements, not inferred PC feelings or established world truth. Repeating
the key revises the statement with source/history; no mechanical changes occur.

GM `/vc-story arc-beat` JSON:
`{"character_id":"<id>","arc_key":"promise","key":"sibling-lead","source_event":"observed-lead","invitation":"Would you like to follow this lead?"}`.
Only a present character with an established arc is eligible. The invitation is
private and nonbinding. Player `/vc-intel arc` JSON
`{"key":"sibling-lead","op":"respond","decision":"decline"}` (or accept)
has no costs or automatic effects; acceptance does not choose a PC action.

`/vc-intel discover json:{"mode":"know","query":"visitor"}` returns only
recorded knowledge available to the active owned character. Other modes: leads,
witness, changed, arcs. `changed` accepts `since_minute` (explicit fictional
minute); it is a caller-supplied cursor, not a stored last-visit update. Results
are bounded to 50 scoped facts/events; old literal clue searches still search
before the limit. Claims retain uncertainty and source; unknown stays unknown.
No hidden identity/alias joins, world advancement, generation, canon, receipts,
player upserts or error-log writes occur. Character switching changes the private
scope immediately; proxies do not gain private personal access. Full backups
preserve these records; disable flags without deleting history. No live test.
