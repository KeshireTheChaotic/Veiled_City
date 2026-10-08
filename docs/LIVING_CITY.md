# Living City phased implementation

## Design and authority contract

Baseline: 4.0.0. Existing simulation clocks, typed NPC actions, resource budgets,
residue, obligations, relationships, mutation ledger, receipt capture, private
publication and logical backups are reused. Calendar/event indexing is new;
institutions and civic graphs need extensions. No PC mechanics, SRD rules,
house-rule authority order, hidden mystery answers or canon are changed.
The AI constitution and Rules Desk retain their separately documented scopes.

Phases are separate minor releases and commits: A 4.1.0 (foundation),
B 4.2.0 (core civic actors), C 4.3.0 (interdependencies), D 4.4.0 (opt-in depth).
Each phase must pass deterministic offline validation before its commit.
Live Discord/model smoke tests remain a deployment gate, never inferred from
offline results. No release is automatically deployed or pushed to origin.

## Phase A: core infrastructure

Gap analysis: fictional tick/minute advancement and scheduled NPC actions already
exist. New calendar configuration, scheduled civic notices, semantic event index
and source validation extend those primitives rather than replacing them.

Additive schema 410 introduces city_calendar, world_events and city_schedule.
Old campaigns stay in relative-day mode until a GM chooses an explicit epoch.
Timezone is campaign configuration, independent of the host. All tables enter
logical snapshots/backups and GM-full exports; player exports omit them.
Query-critical status, source, visibility, due time and review state are columns.

Scheduled events record an appointment/deadline becoming due, not attendance,
PC behavior, resource spending, legal authority, harm or objective canon.
Major effects stay pending with no cost/consequence before GM approval.
Due processing is bounded and runs only on explicit fictional clock advancement,
including existing simulation and downtime paths. Round/scene opportunities
advance ticks only; they do not invent elapsed minutes. No wall-clock job exists.

Event records index existing mutation/residue records or explicit GM observations.
Retraction/supersession preserves prior versions in the mutation ledger. Index
visibility cannot be broader than the underlying source. Event identity and
schedule state make retries deterministic; committed hooks use existing durable
simulation publication and can be retried after Discord failure.

### Commands and examples

All `/vc-city` commands are GM-only and return ephemeral JSON attachments.

```text
/vc-city status
/vc-city calendar json:{"epoch":"2030-01-01T00:00:00Z","timezone":"UTC"}
/vc-city schedule json:{"key":"hearing-1","title":"Tuesday hearing","due_minute":1980,"visibility":"gm","organizer":"municipal-court","location_key":"courtroom"}
/vc-city preview
/vc-city events
/vc-city event json:{"key":"incident-1","kind":"incident","title":"Established incident","source_kind":"gm","source_id":"GM session notes"}
/vc-city review json:{"key":"hearing-1","decision":"approve"}
/vc-sim advance minutes:60
```

Calendar epoch denotes fictional minute zero. It cannot be changed once set;
use a pre-configuration snapshot to undo an incorrect choice. `timezone` is an
IANA display zone. Omit epoch to retain relative days. `due_minute` is an absolute
fictional minute; `due_at` accepts an explicitly offset ISO datetime only when an
epoch exists. Optional `due_tick` is an additional prerequisite, not elapsed time.
Schedules accept end_minute, organizer, invitees, requirements and location_key.
`op:cancel` or `op:reschedule` requires the schedule key; rescheduling a fired
event requires a new key. `major:true` schedules need review; approve, defer,
reject and modify preserve audit history. A reviewed routine deadline only
records becoming due; consequential outcomes must use their own reviewed paths.

`event` accepts source_kind mutation, residue, event or gm. Existing source IDs
are required and campaign-scoped. Default visibility is gm; player/character
scope requires a valid subject. Optional status is active, retracted or
superseded; superseded_by must reference another existing event.

### Upgrade and release gates

Stop/restart on the new code to apply additive schema, register commands with
`npm run register`, and run `/vc-admin doctor`. Create a backup before configuring
a fictional epoch. Restore/rollback uses existing tooling. Run `npm run validate`;
calendar/event tests cover due-once, relative-mode migration, rollback, privacy,
cross-guild source rejection, pending review, output retry and bounded backlog.
Live smoke test: configure a disposable campaign, schedule a deadline, advance
across it, retry publishing, inspect ledger and restore backup. No live coverage
is claimed by these instructions.
