# Veiled City: End-to-End AI-Managed Living World

Status: proposed implementation roadmap, not an implemented capability.
Audited baseline: `e180793`, version **5.8.0**, schema **440**, October 8, 2026.
Scope: all eleven optional living-world features introduced in 5.1–5.8.

## 1. Intended outcome

The AI GM should identify opportunities, propose valid operations, maintain their
lifecycles, request consent/review, execute authorized work through existing
resolvers, and incorporate committed results into later narration. Routine use
should not require a human GM to enter JSON for every scene, plan or memory.

"End-to-end AI-managed" means **application-governed autonomy**, not unrestricted
model authority. Players retain their choices; active human proxies retain NPC
control. Major world changes and exceptions still reach the human GM. The AI
manages that approval workflow rather than impersonating the approving person.
Eliminating all human/player decisions would require changing those safeguards
and is not proposed here.

This roadmap does not authorize deployment, production database edits, paid
validation, command registration, git commits, or feature activation. Those are
separate implementation/release actions.

## 2. Current state and remaining gaps

These are extensions to real existing implementations, not proposals to rebuild
the simulation or introduce a second generic director.

| Feature | Existing behavior at 5.8.0 | Missing end-to-end connection |
| --- | --- | --- |
| Emergent goals | Director generates bounded, source-backed investigation proposals; goal transitions/history exist | Richer actor-relative motivations and transitions; routine approval policy; AI visibility into proposal results and blocked reasons |
| Consequences | Typed goal/service/transmission handlers; subscriptions, causal checks, review and receipts | AI-assisted subscription setup; durable event cursor; routine policy execution; narration informed by committed effects |
| Scene continuity | Sourced occupancy, observer-relative access, barriers, departure and archival; in-person conversation checks | Typed AI scene operations; automatic reconciliation with authoritative movement/roster; scene packets and enforced witness checks across narrative paths |
| Emergent groups | Repeated contacts can propose a group; reviewed membership/schism lifecycle | Actor-scoped NPC response generation; routine approval policy; recruitment/exit/conflict lifecycle management |
| Strategies | Bounded prerequisite plans; approved steps execute through native resolvers | AI plan creation/replanning; reconciliation and recovery; policy approval of routine revisions; planner/result context |
| Personal arcs | Player-established private statements; GM-authored invitations; relevant context | Reliable extraction of explicit owner statements with confirmation; AI-authored invitations; authenticated responses and callback lifecycle |
| Discovery | Scoped, literal, read-only know/leads/changed/witness/arcs lookup | Read-only natural-language routing, accessible evidence packets and grounded answer rendering; no queries accidentally entering mutation/director paths |
| Long projects | Phases, owner consent, fictional duration and existing adjudicated downtime results | Conversational setup; consent/submission linkage; AI-assisted authorized adjudication; lifecycle integration across downtime/restart |
| Conflict mediation | Chronological queued travel and strategy-authority checks; native costs/commitments | Shared conflict results exposed to the AI; bounded deferral/replanning; institution/project/strategy coordination and stale-state handling |
| Memory consolidation | Reversible actor-owned clusters with uncertainty, evidence pointers and revision history | Automatic cluster candidate selection/maintenance; source-aware correction and retrieval; governed scheduling |
| Activity density | Bounded candidate/packet selection and affordability; ephemeral known-source dormant-NPC wake | Fair work allocation across feature types; location/faction coverage; explicit omissions/starvation telemetry; bounded useful retrieval |

### Verified integration points

- `bot/src/gm.js`: structured turn/director/downtime schemas, context assembly,
  model requests and narrative validation. New feature operations are not exposed
  as a complete typed structured-output contract.
- `bot/src/state.js`: authoritative mutation and private-scope enforcement.
- `bot/src/index.js`: party/private turn orchestration, director work, commit and
  publication paths. `bot/src/commands.js` also orchestrates manual director,
  downtime and aftermath paths; integration must cover all of them.
- `bot/src/simulation.js`: remaining-budget goal/consequence/strategy/group hooks.
  New opportunity results need durable receipts and operator/review feedback,
  not just execution of ordinary NPC actions.
- `simulation-motivation.js`, `city-consequences.js`, `scene-continuity.js`,
  `city-groups.js`, `simulation-strategy.js`, `personal-continuity.js`,
  `long-projects.js`, `memory-clusters.js`, `city-constraints.js`: reuse existing
  validators/resolvers and extend their authority interfaces deliberately.
- `context-planner.js`, `npc-cognition.js`, `expansion-contracts.js`,
  `provenance.js`, `publishing.js`, `idempotency.js`, `serial-queue.js`, `db.js`:
  reuse scoped retrieval, contracts, explanations, delivery and persistence.
- `seed-data.js` / `seed-drafts.js`: foundational seeding exists, but the new
  feature-specific draft types and event-to-actor provenance mapping are missing.

## 3. Non-negotiable constraints

1. Preserve the AI GM constitution, Daggerheart rules, Veiled City house rules,
   saved rulings, native dice and mechanical resolvers. No new currencies,
   automatic PC healing/advancement/income, invented rolls or mechanics in prose.
2. Only authenticated player input can establish PC consent, beliefs, vows or
   voluntary actions. Silence, model confidence and inferred intent are not consent.
3. Separate GM planning context from each actor's legitimate knowledge. Physical
   presence, reports, rumor, inference and established truth are different states.
4. Apply visibility/ownership before retrieval/ranking. Never reveal hidden aliases,
   private arc text, proxy packets or other characters' information through tools,
   summaries, refusals, review notices or diagnostics.
5. The application controls authority, IDs, budgets, receipts, dice and commits.
   Model output cannot set `gm:true`, impersonate reviewers, activate flags,
   select a different principal or grant itself permission.
6. Only explicit fictional-time triggers advance the world. Discovery, review
   inbox polling, memory lookup and wall-clock uptime do not advance simulation.
7. All automatic execution is opt-in, bounded and recoverable. Existing feature
   flags enable capabilities; they do not automatically grant approval authority.
8. Mandatory tests deny network and use synthetic databases/model outputs.
   Live-model/Discord/TTS tests are optional, manual and separately authorized.

## 4. Shared lifecycle and authority model

Use one shared contract with typed domain adapters into the existing modules:

`scoped state → AI intent → validation/policy → consent or review if required →
native resolution/atomic receipt → scoped delivery → future context`

The AI proposes **intent**, not database patches or guaranteed results. Narration
must distinguish invitations/plans from completed actions and use actual resolver
results for consequences, costs, movement, failed checks and disclosure.

### Application-owned authority classes

| Class | Examples | Executor |
| --- | --- | --- |
| Read-only | Discovery, evidence lookup, inspection of own plan | Scoped deterministic query; optionally grounded answer within an existing response |
| Routine delegated | Reconcile proven occupancy, manage a minor NPC investigation, compact verified memory pointers | Application policy may commit only explicitly allowlisted operations with current prerequisites |
| Consent-required | PC promise extraction, collaboration, project spending, private invitation response | Authenticated owner/proxy response; no automatic acceptance |
| Human review | Major NPC removal, faction transformation, destructive/supernatural changes, disputed authority, policy exceptions | Human GM review; AI can prepare and track the proposal |
| Forbidden | Forged consent, unknown actor evidence, impossible travel, secret disclosure, model dice, unsafe scope | Reject without compensating mutations; retain private diagnostic evidence |

Add an explicit per-campaign delegation configuration, default **off**. Suggested
modes: `manual`, `suggest_only`, `routine_delegated`; use a per-operation allowlist,
resource/time ceilings, expiration/revocation and review thresholds. These are
proposed settings, not existing commands or supported JSON fields.

Confidence can route uncertain work to clarification/review, never override a
failed invariant. An AI-created pending item cannot approve itself through a
second model-produced operation. Policy approval records a distinct application
principal and policy revision, not a fabricated human GM identity.

## 5. Phased implementation

Phases are dependency-ordered. Audit the current checkout before each phase,
record SATISFIED / EXTENDED / NEW / BLOCKED evidence, reuse equivalent behavior,
and do not create empty releases. If the existing per-phase release policy is
retained, illustrative versions are 5.9.0, 6.0.0, 6.1.0 through 6.7.0; `.9` rolls
to the next major `.0`. These are planning labels, not instructions to bump now.

### Phase A — Typed AI intents and explicit delegation

**Goal:** Provide the missing AI-to-application bridge without granting blanket
GM access. This phase blocks all later autonomous mutations until its gates pass.

Proposed changes:

- Define a versioned, strict, discriminated intent schema for the eleven features.
  Each operation has a bounded payload, source/evidence references, actor/subject,
  causal prerequisite references, expected state revision and proposed impact.
  The application computes effective impact/authority and canonical IDs.
- Bind the real guild, session, scene, scope, authenticated actor and invocation
  receipt outside model output. Do not accept arbitrary tool names, SQL, module
  paths, command invocations or generic object patches.
- Extend existing turn, director and downtime output contracts with bounded typed
  intent collections; preserve legacy responses with empty/absent intent defaults
  through an explicit compatibility adapter. No silent loss of old mutations.
- Refactor domain entry points to separate validation, intent creation, authorized
  lifecycle transition and presentation. Commands and AI adapters call the same
  services. Do not fabricate Discord interactions or pass `gm:true` for AI work.
- Add the delegation policy and a shared principal/decision contract. Reuse city
  records and ledger unless an audited storage requirement justifies a migration.
- Return structured accepted/pending/blocked/rejected results, validation reasons,
  actual effects, costs and receipts to orchestration and subsequent AI context.
- Wire every relevant entry point: party/private turns, round/scene/downtime
  directors, manual passes and aftermath. Unsupported origins fail closed.
- Integrate with existing queues/transactions/publication recovery. Never perform
  model or Discord network requests while holding a SQLite transaction.
- Establish a staged-result/narrative contract: validate and dry-run intent, resolve
  in the native transaction, and publish only claims matching committed results.
  Contradictory outcome narration must not survive a refused or failed operation.

Acceptance:

- Fake structured AI output traverses the real dispatch/commit path once; retry,
  restart, stale revision and publication failure do not duplicate effects.
- Model-supplied flags, human reviewer IDs, consent and privileged scopes fail.
- Suggest-only mode creates reviewable proposals without effects or costs.
- Flags off preserve existing 5.8 behavior and existing slash commands.

### Phase B — Automatic scene reconciliation and witness-safe context

**Goal:** The AI GM can maintain scene continuity without manual occupancy JSON.

Proposed changes:

- Supply bounded current scene/occupancy/evidence/access packets to relevant GM
  and actor contexts. Actor packets contain only actually accessible observations.
- Derive deterministic occupancy from committed roster/encounter/movement/arrival
  state where sufficient evidence exists. Model-proposed occupancy must reference
  that state; narration alone cannot establish arrival or a hidden witness.
- Add typed presence/departure/barrier/evidence operations for legitimate new
  observations. Believed/uncertain presence cannot become actual presence merely
  because the model requests it; scene descriptors never edit combat state.
- Enforce sight/sound and location checks for relevant NPC observation, knowledge
  creation, dialogue/conversation and narrative claims—not only the explicit
  `mode:in_person` conversation command. Distinguish remote channels from overhearing.
- Preserve actual route durations, commitments, absent-PC and proxy boundaries.
  Archive old presence atomically on transitions, including private-scene paths.
- Provide useful "unknown/not witnessed" feedback so the AI can ask or narrate
  uncertainty instead of inventing evidence to satisfy a validator.

Acceptance: A sourced arrival updates presence; a remote, departed or hidden
witness learns nothing unauthorized; barriers affect access; scene transitions,
private scopes, restart and rollback preserve the same physical truth.

### Phase C — Full motivation and causal-consequence lifecycle

**Goal:** Actor goals and ordinary consequences progress without manual approval
of every low-impact investigation, while major changes remain review-gated.

Proposed changes:

- Add typed propose/reprioritize/pause/resume/supersede/complete/abandon intents
  based on actor-owned evidence, constraints, relationships, obligations and results.
  Retain original motivations and source-linked change history.
- Extend beyond the existing deterministic investigation template using bounded
  actor packets in existing requests; no mandatory per-NPC model fan-out.
- Permit allowlisted routine goal transitions under delegation policy; preserve
  human review for disallowed methods, major impact or contested interpretation.
- Let the AI propose narrowly scoped consequence subscriptions using only the
  existing typed handler registry. Policy validates trigger, source, physical or
  communication causal path, affected entity and bounded effect independently.
- Replace reliance on the latest-50-event opportunity window with a durable,
  campaign-scoped cursor/work queue and existing idempotent handler receipts.
  Drain incrementally under budgets; stale/retracted sources cannot execute.
- Keep AI/handler-generated downstream events bounded by causal depth and fan-out;
  reject causal cycles and self-triggering chains. Restore/replay must not resurrect
  rejected proposals or reset receipts to reapply costs.
- Feed committed/pending/blocked consequences and active goal lifecycle back into
  GM context and the review surface. Never narrate pending changes as accomplished.

Acceptance: An NPC reacts to learned evidence, revises an obsolete goal and
produces one bounded routine effect; unrelated actors remain unaware. A backlog
larger than 50 events drains without loss/double application. Major effects wait
for review and source retraction prevents execution without partial costs.

### Phase D — NPC-managed groups and adaptive strategies

**Goal:** AI-portrayed NPCs can organize, decline, plan, negotiate, retreat and
replan within their established knowledge and finite authority.

Proposed changes:

- Generate group lifecycle proposals from established contacts/shared objectives,
  not arbitrary named actors in global GM text.
- Generate each non-proxied NPC response from its own knowledge, preferences,
  commitments, loyalty and available role. Record evidence and the AI portrayal
  principal distinctly from human responses. Dissent is a valid outcome.
- Permit only allowlisted minor formations/joins/leaves under delegation policy;
  major merges, dissolutions, schisms or faction transformations remain human review.
  Membership grants no automatic knowledge, resource pool or institutional authority.
- Expose owned objectives, valid next actions, dependencies, available resources,
  routes, risk hypotheses and native review classes to the strategy planner.
- Add typed creation/revision/reconciliation/pause/abandon intents. Validate the
  DAG, cost ceiling, stop conditions and permissible methods before policy approval.
- Require material legitimately known developments for replans; never adapt to an
  undiscovered enemy secret. Account for completed/pending/cancelled steps before
  revision, and carry real costs/evidence across revisions.
- Coordinate strategy steps with ordinary director actions so the same actor does
  not receive two incompatible actions or duplicate objectives in one opportunity.
- Return native rolls/results to the next planning/narrative pass. Include failure,
  delay, diplomacy, delegation and abandonment; do not guarantee success.

Acceptance: NPCs may decline recruitment; a human proxy is never simulated; a
known shortage causes a feasible replan or retreat; the last resource unit is
spent at most once; revised plans cannot replay submitted steps or skip review.

### Phase E — Conversational personal arcs and read-only discovery

**Goal:** Players can use these features naturally, while the AI remains a
facilitator rather than an author of PC desires or choices.

Proposed changes:

- Recognize an explicit owner's statement as a candidate arc, bound to its real
  message/interaction and selected character. Separate first-person commitments,
  hypothetical discussion, roleplayed lies and GM/NPC assumptions.
- Require owner confirmation before turning ambiguous dialogue into durable arc
  state. Exact explicit commands may follow the existing deterministic owner path.
  A model cannot emit its own confirmation or substitute another character.
- Let the AI propose private nonbinding invitations referencing established arcs
  and accessible source evidence. Track delivered/accepted/declined/deferred state,
  rate-limit repeats, and respect rejection without costs or persuasion loops.
- Use authenticated buttons/commands or an unambiguous reply-to-proposal flow for
  owner responses. Bind consent to proposal revision, scope and expiration; do not
  reuse it after the invitation or selected character changes.
- Route natural-language "what do I know", "open leads", "what changed" and
  witness queries into a strict read-only path before generic turn handling.
- Retrieve authorized evidence first, then optionally render a grounded answer in
  the existing request. Source IDs/uncertainty must survive rendering; inaccessible
  identity joins and imagined discoveries remain forbidden.
- Do not upsert players, record recalls, create receipts/visit cursors, advance
  clocks or run directors on discovery queries, including failed/malformed queries.
  A separate explicit "mark visited" action is a mutation, not a read query.

Acceptance: Two PCs receive different valid answers; a switched/proxied/absent
character cannot expose private arcs; a declined beat is not repeatedly offered;
a natural-language discovery request produces no database or world-time writes.

### Phase F — AI-orchestrated downtime and conflict recovery

**Goal:** Long projects can be proposed and managed conversationally and persist
across sessions without manual phase bookkeeping or automatic PC spending.

Proposed changes:

- Generate phase/prerequisite/duration/collaborator proposals grounded in known
  fiction and existing downtime mechanics. Clearly disclose proposed commitments
  and costs before requesting owner consent.
- Authenticate each participant independently and bind each phase's acceptance to
  the exact revision and existing submitted downtime project. Do not treat general
  party agreement as every collaborator's spending authorization.
- Support eligible NPC collaborators only through sourced, explicitly authorized
  NPC commitments/delegation; do not invent consent or put NPCs in PC-owner paths.
- Extend the existing downtime resolver with typed phase outcome references.
  Application dice/rules and recorded results remain authoritative; the model may
  not create a completed result merely to satisfy a long-project prerequisite.
- Under an explicit routine adjudication policy, advance satisfied ordinary phases
  from actual resolved results and elapsed fictional work time. Major/ambiguous
  rulings or unapproved costs go to human review. Consent is not consent to success.
- Pause safely on source loss, interrupted attendance/availability or withdrawn
  consent; retain partial results and work time, excluding paused elapsed time.
- Consolidate physical, resource, timing and delegation conflict checks before
  both NPC and institution commits. Prefer existing chronology/priority rules;
  otherwise defer/review with a typed reason rather than inventing a winner.
- Return conflict feedback to the AI for a bounded safe alternative proposal.
  Retrying cannot reroll, consume another unit, silently move actors or resolve
  disputed legal title as established fact.

Acceptance: A multi-day project survives restart, obtains phase-specific consent,
uses existing adjudicated results once, pauses without losing evidence, and resumes
only when authorized. Competing NPC/institution plans cannot double-spend capacity
or execute incompatible travel; factual conflicts and contested claims differ.

### Phase G — Automatic memory maintenance and fair density budgets

**Goal:** The AI uses durable memory and large-city simulation without manual
cluster creation, runaway context, starvation or additional per-actor calls.

Proposed changes:

- Select eligible low-priority source clusters deterministically at explicit
  fictional maintenance opportunities. Propose bounded pointer sets/topics using
  existing AI requests where necessary; prefer deterministic excerpts by default.
- Check actor/campaign ownership, source liveness, confidence and contradictions
  before consolidation and again at recall. A summary is an index, not knowledge
  transfer, canonical truth or permission to forget source evidence.
- Automatically mark/revise/suppress affected clusters when evidence is corrected,
  challenged, superseded or retracted. Preserve prior revisions and original
  sources; user/GM reversal remains supported.
- Improve retrieval beyond exact whole-query matching, using bounded token/entity
  matching over accessible evidence. If semantic reranking is later desired,
  make cost, privacy and cache behavior an explicit optional design, not a hidden
  mandatory embedding/provider pipeline.
- Coordinate existing 1/3/4 NPC opportunity budgets across ordinary actions,
  motivations, consequences, strategies and group work. Prevent one category's
  persistent backlog from starving all later categories.
- Preserve the separately bounded institution workflow; make its interaction with
  shared capacity/authority explicit rather than silently increasing total work.
- Extend relevance/fairness to locations and factions using their established
  activity/knowledge, not global dramatic importance. Cold-state wakeups need
  legitimate sources; retain history and durable tiers.
- Add bounded omission/backlog/deferral telemetry and packet-size metrics. Do not
  solve oversized packets by stripping privacy, consent or authority constraints.

Acceptance: Hundreds of fictional days and a large city preserve old-clue access,
source disagreements and private boundaries. Every eligible work category makes
bounded progress; packet/result limits hold; idle wall-clock time changes nothing.

### Phase H — Seed-aware bootstrap and operational review UX

**Goal:** Existing content can prepare the AI-managed world, and humans can handle
exceptions without manually creating all underlying data.

Proposed changes:

- Extend `/vc-admin seed-data` and existing `seed-*` draft workflows with typed
  adapters for reviewed consequence templates, strategy templates, sourced scene
  references, group proposals, project templates and memory-cluster candidates.
  Reuse archives and materializers; do not bypass normal validation on approval.
- Normalize provenance links between accepted seed documents/source events and
  an actor's explicitly seeded knowledge. Current dossier knowledge may refer to
  a file path rather than the event key required by autonomous goal formation.
  Migrate pointers additively and explainably without granting new information.
- Distinguish templates/reference fiction from live state: a location dossier does
  not establish current occupancy; a historical group does not recruit a PC; a
  project template does not start work or spend resources.
- Never infer/approve PC arcs, consent, feelings or private disclosure from GM
  notes. Player-authored content may produce owner-confirmable suggestions only.
- Keep seeding separate from feature activation and delegation authority. A seeded
  campaign remains safe with all new policy settings disabled.
- Consolidate a GM-private review inbox for pending/blocked/stale proposals with
  source, impact, actual costs, policy decision, before/after and recovery options.
  Reuse existing commands, diagnostics and delivery receipts instead of creating
  a parallel review manager.
- Supply authenticated approve/reject/modify/defer and player accept/decline
  controls; detect stale revisions, duplicate deliveries, revoked roles and changed
  proxies at response time. Repair missing notices without reapplying mutations.
- Add "why did/didn't the AI use this feature?" diagnostics from actual eligibility,
  policy, source, budget and ledger data—not generated retrospective fiction.

Acceptance: A seeded fixture can produce an authorized AI proposal from its own
known evidence without manual JSON wiring. Reseeding is add-only/idempotent and
cannot activate autonomy or resurrect rejected drafts. Review/consent transport
survives Discord failure and role/ownership changes without privilege escalation.

### Phase I — Whole-loop evaluation, compatibility and staged rollout

**Goal:** Demonstrate the complete conversation-to-state-to-future-context loop,
not merely that isolated service functions accept handcrafted JSON.

Proposed changes:

- Extend the existing network-denied validation runner, fake Responses, narrative
  contracts, expansion quality benchmark and endurance fixtures.
- Run production orchestration with synthetic model proposals, scoped players,
  fictional time, application dice and fake Discord delivery. Exercise every
  feature without manual internal service calls standing in for its AI trigger.
- Test narratives against actual committed outcomes: pending/rejected changes are
  not described as completed; failed/delayed actions do not invent successes;
  publication repair cannot replay costs or expose private pending work.
- Include cross-feature stories: seeded evidence → NPC observation → motivation →
  group dissent → strategy → travel conflict → native resolution → causal effect →
  private discovery → memory correction → long-project continuation.
- Attack forged authority/consent, hidden aliases, unknown actor evidence, injected
  seed/transcript instructions, changed proxies, stale policy/revisions, source
  retraction, over-budget loops, duplicate interactions and backup restoration.
- Track false positives/regressions, proposal-to-commit/review/decline counts,
  causal traceability, starvation/deferral, model requests/tokens, packet bounds,
  conserved costs and read-only write counts. Report synthetic scope honestly.
- Verify old campaigns/flags, old response formats, slash permissions, existing
  commands and pre/post-expansion backups. Add schema changes only if justified,
  with lossless migration and rollback fixtures.
- Provide manual → suggest-only → limited delegated rollout, each explicitly
  enabled by the GM with documented budgets/recovery. Shadow mode proposes/evaluates
  without effects; it is not permission to make extra paid calls.
- Keep deployment, model calls, TTS and production migration outside mandatory
  acceptance. Any optional live evaluation has an explicit budget and approval.

Acceptance: Full `npm run validate` passes with network denied and zero paid calls;
all eleven features have a demonstrated scoped AI trigger and lifecycle loop;
legacy compatibility holds; major review and PC/proxy consent cannot be bypassed;
restart/restore/retry leave one consistent world. No claim that fixtures prove
unrestricted real-model reliability.

## 6. Cost, execution and rollout requirements

- Reuse existing paid gameplay requests for bounded typed proposals where possible.
  Runtime AI narration still incurs normal configured provider usage; these
  changes are not a promise of free gameplay or unchanged token counts.
- New per-NPC/per-feature calls are disabled by default. Additional inference,
  semantic indexing or repair calls require explicit configuration, hard limits,
  budget accounting and refusal behavior when exhausted.
- Bound retries, proposal count, causal depth, result fan-out, context bytes/tokens
  and work per fictional trigger. Persist deferral instead of recursively asking
  models to overcome a failed invariant. Offline required tests never call providers.
- Voice remains a separate existing opt-in pathway. Review notices, private
  evidence, memory maintenance and background management must not silently trigger
  paid narration or TTS; no voice/channel/payment policy change is implied.
- Provide distinct controls for feature enablement, AI delegation, director pause,
  policy revocation and canceling queued actions. Disabling flags alone currently
  does not cancel native queued actions; the new UX must make that explicit and
  offer an authorized cancellation path without automatic refunds.
- Revalidate policy, source, consent and principal at execution time, including
  after restart. A once-authorized queued action is not permanently authorized.
- Keep human GM override, inspection, pause, review and backup/restore usable.
  Do not deploy/push or mutate production while implementing the roadmap unless
  separately requested.

## 7. Required deliverables per phase

1. Fresh audit with HEAD, proposal-by-proposal verdicts and exact reusable files.
2. Minimal design listing changed contracts, authority decisions, scope, state
   lifecycle, command/UX effects, cost/time bounds and storage/migration impact.
3. Real service/orchestration implementation, not prompt-only instructions or a
   separate mock engine; preserve existing human commands as override/debug paths.
4. Positive and adversarial offline fixtures, including authenticated identity,
   private scope, stale state, refusal, replay, failure, restart and restore.
5. Updated feature/delegation/seed matrix, examples, operator recovery and clear
   distinction between current supported fields and proposed configuration.
6. Transparent validation results and limitations. If phase commits are requested
   for implementation, validate and commit that phase before beginning the next;
   follow minor rollover policy and any requested usage-limit pause threshold.

## 8. Completion checklist

- [ ] All eleven features have typed AI inputs, scoped context and result feedback.
- [ ] Routine delegated operations need no human JSON or repeated manual approval.
- [ ] Major changes and ambiguous/contested authority reach real human review.
- [ ] PC choices, consent and proxy control remain authenticated and revocable.
- [ ] Scene presence and actor knowledge reconcile with actual movement/evidence.
- [ ] Actor goals/groups/plans can progress, fail, decline, adapt and terminate.
- [ ] Natural-language discovery is grounded and strictly read-only.
- [ ] Long projects use existing authorized mechanics, results and fictional time.
- [ ] Memory updates preserve original evidence, uncertainty and ownership.
- [ ] Fair bounded scheduling prevents starvation and runaway causal/model loops.
- [ ] Seed templates and evidence mapping help bootstrap without activating autonomy.
- [ ] Review/consent/publication failures repair without duplicate effects or leaks.
- [ ] Native dice, conservation, review, privacy and rule authority remain binding.
- [ ] Legacy campaigns, flags, response formats, commands and backups remain valid.
- [ ] Whole-loop offline gates pass; no paid/live/production success is implied.

The result should be an AI GM that manages the complete authorized workflow,
while the application—not generated prose—remains the authority for what occurred.
