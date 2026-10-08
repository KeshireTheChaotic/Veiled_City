# End-to-end implementation record

Baseline: 5.8.0 (`e180793`). The nine-phase roadmap is
`SUGGESTIONS-End-To-End.md`. This document records implemented work; later phases
remain unimplemented until their release entry is added.

## Phase A — 5.9.0: governed intent boundary

- Closed version-1 schemas cover eleven feature families. Unknown authority,
  reviewer, consent, principal and patch fields are rejected locally.
- Existing structured turn, director, downtime and aftermath requests expose
  bounded intents. Legacy fixture/response bundles without intents mean `[]`.
- All authoritative mutation paths use the same dispatcher and native adapters.
  The goal adapter is available initially; other feature adapters are fail-closed
  until their domain phases. This is not eleven-feature autonomous completion.
- `/vc-story delegation` configures manual, suggest-only or expiring routine
  delegation with an explicit operation allowlist and operation/cost ceilings.
  Defaults remain manual. Flags do not imply delegation. No automatic activation.
- `/vc-story ai-inbox` is read-only and GM-private. `/vc-story ai-review` requires
  authenticated GM authorization plus the item's current fingerprint.
- Source prerequisites, target and policy revisions are checked again at commit.
  Native effects and application-owned idempotency receipts share a transaction.
  Failed operations retain blocked diagnostics privately without partial effects.
- First-pass narration is conservatively withheld for intent-bearing bundles;
  pending operations cannot masquerade as committed fiction. Receipts enter later
  GM planning context. No second paid rendering call is introduced.

Example (fictional expiry must be after the current campaign minute):

```json
{"mode":"routine_delegated","allow":["goal.propose"],"max_operations":1,"max_cost":0,"expires_minute":1440}
```

Revocation uses `mode: manual`, an empty allowlist and `expires_minute: null`.
It increments the policy revision; pending intents cannot use an old delegation.
No command registration or live-provider validation is automatic.

Validation: required offline suite includes `end-to-end-a-test.mjs`, synthetic
Responses output through actual authoritative commit, suggest-only/no effect,
forged authority, policy/target revisions, private scope and restart replay.

## Phase B — 6.0.0: scene and witnesses

Scene intents share delegation, revisions and native validation. Native successful
NPC travel reconciles arrival atomically. Authenticated player check-in reconciles
only an already established character location; missing locations remain unknown.
No model-supplied owner or proxy consent is accepted. GM packets cap occupancy at
32 and actor packets at 16 accessible entries. New AI knowledge must match an
actual accessible source or preserve already acquired evidence. Remote/hidden/
departed witnesses fail closed. Implicit physical conversations enforce sound;
remote exceptions require an explicitly established communication mode. Native
roster, route, combat and archived-scene state remain authoritative.

Validation: `end-to-end-b-test.mjs` plus existing scene, narrative and offline
suites. No real Discord/model/TTS calls. Automatic presence does not infer a
location from an entry hook or invent arrival for an absent PC.

## Phase C — 6.1.0: motivations and durable consequences

All seven goal transitions use owned evidence and native goal history; contested
conclusions/non-routine methods require review. AI planning context carries owned
goals, source packets, state fingerprints and receipts. The existing request can
propose objectives beyond the deterministic investigation fallback without extra
actor requests. Typed physical service subscriptions validate established service
locations and native event classes. `consequence.apply` optionally delegates
routine effects, with cumulative operation/cost ceilings per opportunity.

Each subscription has an atomic row-sequence cursor (50 inspected events per
drain, four generated effects, twenty subscriptions); old sources are no longer
lost behind the latest-50 window. Native consequence receipts prevent duplicate
effects. Generated effect events carry bounded causal lineage: depth four,
fan-out four and no repeated subscription. Retracted sources block execution.
Other native consequence handlers remain human-reviewed; no disclosure authority
is granted by a subscription. Mandatory tests cover a 65-event backlog/restart.

## Phase D — 6.2.0: groups and strategies

Existing requests include bounded per-member actor packets and typed proposals /
responses. Each responding NPC must own the source, remain available/non-proxied
and respect established refusal preferences. Responses cannot overwrite dissent.
Routine form/join/leave decisions finalize through native group validation after
all candidates respond; split/merge/dissolve retain explicit human review.

Typed strategy creation/replanning uses native goal/source/DAG/deadline/cost
validation, then authorized approval. Run/pause/resume/abandon reference current
plan fingerprints. Aggressive/disclosure/negotiated steps require human review.
AI-approved plans recheck delegation for every automatic opportunity, so revocation
stops future autonomous work. Native resolvers still own dice, resources and actual
outcomes. Ordinary director proposals exclude actors with active plans; strategy
work excludes actors already processed that opportunity and deduplicates owners.
Blocked/planned/actual outcomes enter subsequent planning context and GM inbox.

Validation: `end-to-end-d-test.mjs` plus existing groups/strategy suites; independent
dissent, actor exclusion, native execution and delegation revocation; no paid calls.

## Phase E — 6.3.0: owner continuity and read-only conversation

Explicit first-person vow/desire quotations create private unconfirmed candidates,
never inferred feelings or established arcs. `/vc-intel continuity` reads the
owner inbox without writes; `/vc-intel arc` confirms/rejects/defers a candidate by
current `expected_revision`, with attendance/ownership/source/expiry rechecked.
Example: `{"op":"confirm","key":"<candidate record_key>","arc_key":"vow",
"expected_revision":"<inbox fingerprint>"}`. AI candidates may only reference
authenticated exact quotes. Only an owner response establishes the arc.

Delegated `arc.invite` produces a private, nonbinding callback grounded in the
existing owner statement (not unrestricted model prose). Invitation responses
bind arc revision, expiry, current ownership/attendance and receipt fingerprint;
accept/decline/defer never spend PC resources. A fictional-day cooldown prevents
repeated callbacks after refusal/defer. Private sources remain private.

Supported natural-language discovery questions (e.g. “What do I know about X?”,
“What leads do I have about X?”, “What has changed for me?”) route before message
storage, player upserts, model generation or queued directors. Deterministic,
literal, authorized lookup renders recorded evidence privately, with uncertainty;
there is no extra model call, alias expansion, discovery grant or campaign write.
Other phrasings can use `/vc-intel discover`. Test E measures `total_changes()`
and fictional clock around the actual route, including unknown-secret queries.

## Phase F — 6.4.0: projects and conflict feedback

Typed AI project proposals disclose phases, fictional duration, prerequisites,
collaborators and existing-downtime-only authority. They are private drafts, not
consent or work. `/vc-downtime long-project-status` is an owner-scoped zero-write
inbox, including between sessions. `accept-proposal` binds the draft fingerprint;
each owner independently submits and consents using the current `phase_revision`.
Acceptance binds owner, phase and immutable submission definition. No PC spending,
automatic success, completed-result fabrication or group consent is introduced.

Routine `project.advance` uses an opaque in-process application principal, never
model-supplied `gm:true`. Existing resolved completed downtime result IDs, ownership,
fictional work time and unused-result checks remain mandatory. The actual downtime
commit invokes bounded continuation; restart/replay reuses native receipts. Source
loss/unavailable participants or NPC collaborators pause while preserving evidence
and excluding paused work time. NPC collaborators require their own legitimate
evidence and existing active sourced commitments, outside PC owner consent paths.

Typed mediation runs shared native NPC/institution validation without rerolling or
spending; blocked results suggest only bounded deferral/replanning/human review.
Institution personnel now recheck native availability/commitments at execution.
Contested claims are never promoted into legal title. Actual commits still own
resource/capacity consumption. Fixed the pre-existing misplaced long-project
command branch in arrival planning; real command fixtures now exercise it.

Validation: `end-to-end-f-test.mjs`, existing phase/chronological-conflict/native
capacity suites, real command consent, two-day restart and single-use outcomes.

## Phase G — 6.5.0: memory maintenance and fair density

Deterministic source-pointer candidates cover NPCs, factions and institutions,
with eight actors/sources inspected per maintenance opportunity. Delegated memory
consolidate/revise/revert operations preserve originals, uncertainty and revision
history. Corrected/challenged sources revise indices; retracted/unavailable sources
are excluded at recall and can automatically revert an affected index. Retrieval
matches bounded tokens instead of requiring a whole-query substring. No embeddings
or additional provider requests. Reverted indices are not automatically resurrected.

Activity density rotates ordinary actions, motivations, consequences, strategies,
groups, memory and project work within existing round/scene/downtime budgets 1/3/4.
Only eligible work consumes a slot; omitted categories get explicit deferral
telemetry. Institutions retain their separate two-operation native workflow.
Cycle receipts record category status, budget usage, actor/packet sizes and rotation.
Existing source-aware NPC/faction/location relevance remains the candidate firewall;
queued AI plan execution now rechecks flag, policy revision, expiry and delegation
even when conflict mediation is disabled. No wall-clock scheduling is introduced.

AI management context caps whole scoped records at 24,000 characters and reports
omissions; authority metadata is never cut off to fit a partial record.
Validation: test G covers source correction/retraction, original preservation,
token retrieval and fair real director opportunities; existing 1000-actor and
100-day offline fixtures remain mandatory.

## Remaining phases

## Phase H — 6.6.0: seeds and review UX

Existing `seed-data`/`seed-*` workflows now recognize `consequence_template`,
`strategy_template`, `scene_reference`, `group_template`, `project_template` and
`memory_candidate`. JSON envelopes use `{kind,key,data}` where data matches the
feature's closed payload in `ai-intent-contracts.js`. Approval validates the
contract/dependencies and stores a reviewed template only; native execution still
requires a fresh scoped intent, runtime sources and delegation. No occupancy,
membership, work, memory grant, PC arc/consent or policy activation is seeded.

Accepted NPC dossier knowledge receives additive, content-bound source links from
its original file pointer to the accepted seed event. Originals are unchanged;
corrected/unknown knowledge is not granted a link. Source checks and deterministic
motivation use these mappings. Reseeding remains add-only and preserves tombstones.

`/vc-story ai-inbox` accepts optional `{kind,page,status}` for AI receipts, goals,
consequences, groups, strategies and seed drafts. Actual flags, policy, expiry,
pause, source/impact/before/after/ledger receipts explain eligibility; no invented
retrospective explanation. `/vc-story ai-review` authenticates current GM role and
revision for approve/reject/defer; AI proposals additionally support `modify` with
a complete `replacement_intent`, followed by a separate approval. Native edits use
existing native commands. PC drafts/consent cannot be approved by this GM workflow.
Read-only inbox/owner commands republish notices without replaying effects.

Validation: test H covers seed-to-owned-source-to-AI-proposal, inert template review,
reseed idempotency, read-only repair, defer/reject receipts and forbidden GM consent.

## Phase I — 6.7.0: production whole-loop evaluation

The actual GM request builder now includes bounded AI management state in turn,
world-director, NPC-director, downtime and aftermath prompts. This integration
audit found that building context alone did not deliver it to the model. It also
found director output checks that skipped intent-only proposals; both are fixed.
Normal/private turns share the extracted `turn-orchestration.js` production commit
boundary with evaluation. Intent-only turns receive rollback snapshots. NPC
director intents reuse its existing request and consume fictional work slots;
Omitted proposals retain deferred receipts. Consequence, strategy, memory,
project and typed director operations share one cumulative delegated budget per
NPC director opportunity, including the fair scheduler.
there is no new per-feature/per-actor inference loop. Institution strategy steps
have a closed native request contract, including jurisdiction and report keys.
Routine requests still pass native authority, capacity and personnel checks.
Legacy NPC goal mutation is refused when emergent goals are enabled: the model
must use sourced, policy-governed intents. Flags-off legacy behavior is preserved.

`end-to-end-i-test.mjs` exercises all eleven scoped triggers through actual prompt
construction, synthetic Responses, production commit and future model context.
It covers native goals, presence, group acceptance, strategy/action inspection,
service subscription, owner-confirmed arc invitation/decline, nonbinding project
draft, reversible memory correction, density diagnostics and zero-write private
conversational discovery. Discovery deliberately bypasses model/commit routing:
no paid interpretation or mutating intent is needed for an authorized lookup.
Fake Discord receives only conservative post-commit narration. Forged authority,
stale policy, private global mutation, duplicate origin, restart and backup restore
are tested. Other mandatory phase fixtures cover project consent/completion,
source retraction, causal backlog, dissent, budget fairness and old schemas.

Scope: these are synthetic deterministic contract tests, not evidence that an
unrestricted live model always proposes good actions. Intent-bearing first-pass
prose is currently withheld in favor of a neutral continuity message, even when
an intent succeeds. Native hooks, private inboxes and subsequent grounded context
carry outcomes; no automatic paid prose-repair request is introduced. Network,
Discord registration, TTS and production gameplay are not part of validation.
Storage remains existing city/simulation records; schema stays 440 and existing
backup/restore paths include policy, drafts, receipts and source records.

## Feature / delegation / seed matrix

Set feature flags with `/vc-city flags json:<object>`. Flags alone grant no AI
authority. The operation names below are the actual delegation allowlist keys.

| Feature flag | Routine operations (explicit allowlist) | Bootstrap / boundary |
| --- | --- | --- |
| `emergent_goals` | `goal.propose`, `goal.reprioritize`, `goal.pause`, `goal.resume` | Owned seeded knowledge; conclusions/unsafe methods reviewed |
| `consequences` | `consequence.subscribe`, `consequence.unsubscribe`, `consequence.apply` | Reviewed templates; routine physical service effects only |
| `scene_continuity` | `scene.record` | Sourced reference only; actual arrivals, witness and proxy checks |
| `emergent_groups` | `group.propose`, `group.respond` | Templates; independent NPC evidence/choices, major transitions reviewed |
| `strategies` | `strategy.propose`, `strategy.replan`, `strategy.run`, `strategy.pause`, `strategy.resume`, `strategy.abandon` | Templates; native steps/costs, aggressive/disclosure steps reviewed |
| `personal_arcs` | `arc.candidate`, `arc.invite` | Never seeded as PC truth; owner confirmation/response required |
| `discovery` | None; read-only player route | Existing visible facts/continuity; no writes, aliases or model call |
| `long_projects` | `project.propose`, `project.advance`, `project.pause`, `project.resume`, `project.abandon` | Templates; independent phase consent and actual downtime results |
| `conflict_mediation` | `mediation.reconcile` | Native action records; inspection, not a new roll or spend |
| `memory_consolidation` | `memory.consolidate`, `memory.revise`, `memory.revert` | Reviewed candidates; original owned evidence preserved |
| `activity_density` | `density.inspect` | No live seed state; bounded fair native scheduling |

## Staged operator rollout and recovery

1. Back up using existing campaign backup controls. Inspect `/vc-story
   expansion-status` and `/vc-story ai-inbox`. Defaults remain manual/off; seeding
   is separate and cannot activate flags, delegation, occupancy or PC consent.
2. Enable selected flags, for example `/vc-city flags
   json:{"emergent_goals":true,"memory_consolidation":true}`. Configure shadow
   proposals with `/vc-story delegation
   json:{"mode":"suggest_only","allow":[],"max_operations":1,"max_cost":0,"expires_minute":null}`.
   Existing gameplay requests can propose; no extra shadow provider calls run.
3. After inspecting sourced receipts, delegate narrowly with `/vc-story delegation
   json:{"mode":"routine_delegated","allow":["goal.propose","memory.consolidate","memory.revise","memory.revert"],"max_operations":1,"max_cost":0,"expires_minute":1440}`.
   Replace 1440 with a future **fictional** minute. Limits are per dispatch/
   opportunity, not a provider spending budget. Begin with one operation and zero
   cost; explicitly raise limits only after reviewing actual behavior.
4. For review, refresh `/vc-story ai-inbox json:{"kind":"ai_intent","page":1}`.
   Copy the returned key and `expected_revision` into `/vc-story ai-review` JSON
   with `decision` approve/reject/defer. `modify` needs a complete
   `replacement_intent`; approval is a separate action. Native review kinds are
   `goal_transition`, `consequence`, `group_transition`, `strategy`, `seed_draft`.
5. Repair lost notices by reopening the read-only inbox; never replay costs or
   reissue successful mutation commands to repair delivery. Owners use
   `/vc-intel continuity`, `/vc-intel arc` and `/vc-downtime long-project-status` /
   `long-project`. Humans cannot consent on another PC's behalf through AI review.
6. Revoke with `/vc-story delegation
   json:{"mode":"manual","allow":[],"max_operations":1,"max_cost":0,"expires_minute":null}`.
   Existing director pause remains `/vc-admin director pause`. Revocation changes
   policy revision and queued AI strategy execution rechecks it. Turning a flag
   off is not cancellation of legacy human-approved native work. Inspect native
   queues; use `/vc-story strategy` with `op: pause`/`abandon` to cancel pending
   plan steps, or native action review to reject a queued action. Completed work
   is not refunded. Restore a verified backup for deliberate world rollback.

## Phase audit / release ledger

Each phase reused the native domains listed below and passed the full required
network-denied validator before its commit. Verdicts were implement gaps, retain
native rules/consent, reject authority inferred from prompts or seed text. No
phase adds a database engine, parallel review manager or mandatory paid request.

| Phase | Audited starting HEAD | Released | Principal reusable boundaries / changed modules |
| --- | --- | --- | --- |
| A | `e180793` | 5.9.0 / `a4fe31c` | GM schemas, state transactions, city records; new contracts/dispatcher |
| B | `a4fe31c` | 6.0.0 / `0e2d184` | Scene continuity, simulation travel, NPC cognition and observation |
| C | `0e2d184` | 6.1.0 / `e314941` | Motivation lifecycle, source indexing, native consequence cursors |
| D | `e314941` | 6.2.0 / `3cba7ba` | Groups, subjective actor packets, native strategies/queued guards |
| E | `3cba7ba` | 6.3.0 / `e4c548a` | Personal continuity, owned commands, early read-only message routing |
| F | `e4c548a` | 6.4.0 / `24f2a11` | Long projects, downtime results, opaque application principal |
| G | `24f2a11` | 6.5.0 / `7c5bd3a` | Memory clusters, native scheduler, bounded context and telemetry |
| H | `7c5bd3a` | 6.6.0 / `83da52c` | Seed archives/drafts, additive owned evidence, native review inbox |
| I | `83da52c` | 6.7.0 | Real prompt/commit/publication/restore loop and rollout documentation |

Release policy: phase minors roll .9 to the next major .0. After Phase I, perform
the requested final major release and deploy the clean, verified checkout while
preserving production configuration, runtime data and local content.
