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

## Remaining phases

E: owner confirmation and natural-language
read-only discovery. F: projects and mediation. G: memory maintenance and fairness.
H: seeds and complete review UX. I: cross-feature orchestration and rollout.

Release policy: phase minors roll .9 to the next major .0. After Phase I, perform
the requested final major release and deploy the clean, verified checkout while
preserving production configuration, runtime data and local content.
