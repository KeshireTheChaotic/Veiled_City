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

## Phase B: core civic actors (4.2.0, schema 420)

Gap analysis: v4 already supplies rumors, subjective NPC knowledge, obligations,
case threads and private publications. This phase adds institutions, districts,
audience belief/case records, explicit event links and a bounded deterministic
Institution Director. It extends the existing simulation update schema with
`city_action`; private player scenes cannot use it to mutate global city state.
No new player-facing rule is introduced. Institution action resolution is an
internal administrative request/record, never a Daggerheart roll or warrant grant.

`city_records` holds typed domains with indexed kind/status/actor/place and event
provenance. `world_event_links` holds typed causality/attributed hypotheses;
`district_locations` links existing locations rather than replacing location
state. All are additive and participate in snapshots, backups and GM exports;
player campaign exports omit these tables entirely.

### Setup and inspection

```text
/vc-city update json:{"kind":"district","key":"north","source_event":"incident-1","data":{"name":"North","indices":{"safety":50},"connections":[]}}
/vc-city update json:{"kind":"institution","key":"hospital","source_event":"incident-1","data":{"name":"Hospital","mandate":"Patient care","jurisdictions":["north"],"procedures":["file_case","document_request"],"capacity":4}}
/vc-city membership json:{"district":"north","location":"hospital","source_event":"incident-1"}
/vc-city records kind:institution
/vc-city flags json:{"institutions":true,"opportunities":true}
```

The source event must already exist in this campaign. Institution jurisdiction
must reference established districts/locations. Capacity is finite (0..100),
spends one per completed action, and never regenerates from wall-clock time.
District indices (0..100) are safety, resilience, attention, veil_pressure,
infrastructure and institutional_reach; no automatic PC modifiers or Exposure
changes are derived from them. Direct district changes over 20 points are rejected.

### Knowledge and cases

An employee's knowledge does not become institutional knowledge automatically.
`/vc-city report` requires key, institution, source_event, from_type:npc,
from_key, information_key, authorized:true and optional mechanism. The NPC must
already know that information; `unknown` is not transferable. Report content,
confidence and belief state come from the actual NPC record, not arbitrary text.
The report remains subjective and GM-private. Filing is an explicit GM-controlled
authorization, not a hidden model operation.

`update kind:case` accepts institution, jurisdiction, title, leads,
evidence_reports, custody, hypotheses, heat, escalation_criteria and status.
Evidence report keys must belong to the institution. Heat is descriptive 0..100,
not Stress, Fear or legal authority. Rules/setting/GM-established procedures are
required for material legal actions; the code does not invent universal law.

`update kind:belief` accepts audience, allegation, interpretation, evidence_events,
credibility, reach, counter_narratives and unverified. Each audience retains its
own interpretation, separate from physical evidence, canon and Veil Exposure.
These beliefs are not automatically published or shared with other actors.

### Institutional intents and review

`/vc-city action` accepts key, institution, type, jurisdiction, source_event,
report_keys and optional target_type/target_key/major/confidence. Supported types:
document_request, file_case, interview_request, inspect_request, issue_policy,
allocate_resources, negotiate_request, publish_finding, relocate_staff, seek_warrant.
The institution must have the named procedure and jurisdiction. Cited reports
must be known; filing a case, publishing a finding and seeking a warrant need
at least one report. Targets cannot be PCs or autonomous NPC-control requests.
An interview request never means that a target agreed or attended.

Policy changes, relocation and warrants require review by default. Use
`/vc-city review json:{"kind":"action","key":"intent-key","decision":"approve"}`;
modify (with patch), defer and reject are supported. Pending actions have no
resource cost. Approved issue_policy can set policy or new_jurisdictions, but
only to established locations/districts. A warrant action records a request,
not judicial approval, PC arrest or a search.

Opt-in institutions process at most two queued intents per fictional NPC Director
cycle (or `/vc-city run`). The cycle receipt is durable and all costs/event
records commit atomically. Invalidated intents become blocked with provenance.
Existing pause controls also pause this director. No additional LLM call is
needed per institution. Public hooks are still delivered by the existing
commit-before-publication machinery, not directly from institutional secrets.

### Causality, commitments and opportunities

`/vc-city link` accepts from, to, relation and optional asserted_by. Relations:
caused_by, enabled_by, reported_by, investigates, contradicts, resolved_by,
scheduled_from. Both event endpoints must exist in the campaign. Strict causal
cycles are rejected; attributed explanations remain hypotheses and can disagree.
Only GM inspection exposes the graph; there is no player-wide city-state query.

`/vc-city commitment` accepts key, source_event, type (appointment, promise,
social, supernatural), terms, participants (`npc:key` or `character:id`), start,
end, location_key and accepted_by. PC participation requires an explicit owner
acceptance recorded by the GM; no automatic absent-PC obligation is invented.
The record links an existing-style simulation obligation and fictional deadline.
Overlapping NPC commitments are rejected; cancel explicitly with key/op:cancel.
No due event forces attendance, spending or supernatural debt.

Opportunities are off by default. Enable the flag and use `/vc-city opportunity
query:<scene>` or a matching fictional director opportunity. It intersects
relevant committed records into a GM-only proposal with source events and
investigation/negotiation/mitigation options. It does not name a new culprit,
rewrite a mystery answer, force an encounter or automatically publish secrets.
GM civic retrieval is relevance-filtered before limits, at most eight records
and 10000 characters; this is private reference, not actor knowledge.

### Validation and deployment

`npm run test:city` adds hospital witness, divergent audience beliefs, jurisdiction,
private discovery, pending/no-cost review, finite capacity, cycle replay,
causal graph, consent/conflicting commitments, context budget, cross-guild and
backup/restore fixtures. `npm run validate` retains every existing regression.
Restart and re-register commands. In a disposable live campaign, verify a nurse
report, reviewed administrative request, private response and backup restore.
Live model narration and Discord permissions/delivery remain untested here.
