# I Heard You — phased implementation and operator guide

Baseline 8.0.0 (`cb2f384`), schema 440. Planned minor phases 8.1–8.9, followed by requested 9.0.0 major integration/recovery rollover. Each phase must pass the full network-denied offline gate and commit before the next phase begins. No planned phase is complete until evidenced below. User requested production pull on completion; pushing the release, if absent remotely, needs explicit authorization.

User authorized the final validated development push and production fast-forward during implementation. User also chose no automatic Help/net-disadvantage interpretation: require an actual saved human-GM ruling and adjudication; never charge Hope while ambiguous. Live flags, bot restarts, Discord registration and paid provider tests remain outside this implementation request.

## Contracts and safe rollout

Existing native city records, roll tables, ledger, scopes, reviews, snapshots and RNG remain authoritative. New flags default false and AI delegation remains manual. No live campaign migration, configuration activation, real Discord registration, model/TTS request or bot restart occurs during implementation. New schemas follow closed structured-output contracts from [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs), with local authority validation; a model shape/confidence is never consent.

Player narrative prompts are open-ended prose. Internal backend statuses and optional mechanical slash commands remain compatible; no A/B/C answer list, predefined PC line or consent button restricts the reply. Missing/ambiguous authority stays pending and requests open clarification. Current ownership, attendance, scene, scopes, revision, exact terms, source and resources are rechecked at commit. Disabling flags stops new work without deleting history; snapshot/backup restore is an explicit operator choice, not an automatic refund.

## Behavioral acceptance matrix

IHY-01..IHY-12 map to roadmap proposals; required scenario numbers 01–26 map to the production fixtures as phases close. Initial verdicts and unresolved limits: `I_HEARD_YOU_GAP_ANALYSIS.md`. Every release reruns prior suites; fixtures must report actual outcomes, known ambiguity and zero live requests rather than claim unrestricted live-model reliability.

## Phase 1 — 8.1.0 (starting HEAD cb2f384)

Extends the authenticated `index.js` routes, native listener memory, normal GM context/closed intent contracts, shared turn commit, post-commit owner-private delivery and native city records. No schema migration. `roll.prepare` is only preparation: no dice, Hope, spotlight, PC action or success. Manual GM `/vc-roll request json:` uses the same validator. `/vc-roll pending` is owner-scoped and zero-write, including its command entry point. Raw Duality cannot bypass an existing pending request when the new flag is enabled. Flag-off legacy behavior is unchanged.

| Behavior / acceptance scenario | Production evidence | Status / limits |
| --- | --- | --- |
| IHY-01, scenario 19: owner-authored speech/mixed attempts; exclude OOC, hypothetical, third-party and wrong controller | `i-heard-you-1-test.mjs`, captureDialogue/captureDeclaration and normal GM context | COMPLETE for conservative explicit first-person quoted syntax; arbitrary prose semantics remain UNVERIFIED |
| IHY-02 foundation, scenarios 01–02: actual distinct traits, sourced flat modifiers, no Proficiency/Experience fabrication | Same suite, GMService → commitGmTurn → real roll adapter → format/private publisher | PARTIAL: attacks, active feature mechanics, source completeness and amendment/resolution belong to phase 2; unsupported features stay provisional |
| Scenarios 15, 25: native replay/private delivery recovery/restart/snapshot | Same suite, real receipt and persistence modules | COMPLETE for pending preparation; collaboration receipts not implemented yet |
| Scenario 26: offline guard | New suite is in required `npm run validate` gate | Synthetic Responses only, no claim of verified arbitrary live-model interpretation |

New flags default off. Optional enabling commands (do not execute against a live campaign during development):

```text
/vc-city flags json:{"natural_language":true,"roll_requests":true,"dialogue_history":true,"scene_continuity":true}
/vc-story delegation json:{"mode":"routine_delegated","allow":["roll.prepare"],"max_operations":4,"max_cost":0,"expires_minute":1000000000}
/vc-roll pending
```

AI policy replacement is explicit: merge desired existing allowlisted operations when retaining earlier delegation. Expiry is fictional time. No consent or spending is delegated. Roll resolution/Help/Tag Team are not enabled by this first-phase release. Requests are historical sheet snapshots pending fresh authority checks at resolution; missing values and attack features stay `needs_review`. Current safe speech recognition accepts `I say to listener: "..."` (also ask/reply/whisper) and legacy `say:`; unrecognized text remains available to normal GM clarification, not assumed speech/fact.

Verification: targeted IHY1 suite and the complete required `npm run validate` passed with network denial and zero billable requests. Existing regression suites remain in the gate. Phase closure reruns the full gate after final source/doc synchronization. Production remains 8.0.0 until all requested phases and the major release complete.

## Phase 2 — 8.2.0 (starting HEAD e24695b)

Reuses native Duality/damage RNG, saved rolls, character resources, GM Fear, adversary HP thresholds, spotlight, sourced city records, existing typed review and after-commit private publishing. Fixes ordinary advantage to one net d6 after source cancellation. Confirmed helper dice are distinct native rolls; highest applicable helper/own die only. Net disadvantage with Help is deliberately blocked pending human rules adjudication, per the user's direction. There is no new automatic interpretation of that combination.

Authentic present owners authorize their own exact contribution. Feasibility/Experience relevance and active weapon formulas are human-reviewed against saved campaign rulings; ownership/name alone does not invent feature effects. Tag proposals are nonbinding and uncharged until the other actual owner agrees. Initiator pays 3 Hope once per session; owner-level usage also prevents switching PCs to bypass the official SRD's per-player limit. Each rolls separately with no discarded-roll metacurrency; both players identify the same real saved result before one native outcome applies. Successful attacks roll owner-specific approved damage, combine once, and await both owners' actual type selection when types differ. Native adversary threshold/HP handling runs once and spotlight counts one action. Reactions never generate action metacurrency. Group actions are not relabelled as Help/Tag Team.

The normal authenticated private/public routes recognize conservative free prose (including `I spend 1 Hope to help NAME by ...`, `I spend 1 Hope to use my NAME Experience by ...`, `I spend 3 Hope to initiate Tag Team with NAME by ...`, `I join the Tag Team by ...`, `I roll.`, `I choose NAME's result for both actions.`, and `I roll my damage.`). These are examples, not story response menus. Unrecognized prose stays in ordinary GM interpretation; ambiguous mechanics stay uncommitted. Spending declarations are captured exactly and sent through existing GM context as `roll.adjudicate` proposals requiring human feasibility/rules review. A GM cannot expand the captured authorization; source, current revision, actual owner, scene and resources are rechecked. There is no extra per-NPC or semantic-provider request. Actual dice/results remain application-owned.

New commands:

```text
/vc-city flags json:{"natural_language":true,"roll_requests":true,"roll_collaboration":true,"semantic_integrity":true,"scene_continuity":true,"dialogue_history":true}
/vc-story delegation json:{"mode":"routine_delegated","allow":["roll.prepare","roll.adjudicate"],"max_operations":4,"max_cost":0,"expires_minute":1000000000}
/vc-roll pending
/vc-roll result request:<exact saved request key>
/vc-roll contribute json:<request, expected_revision, unique key, owned mechanical op and exact authorization>
/vc-roll adjudicate json:<GM key, character_id, kind, ruling_key, adjudicated data>
```

`roll.adjudicate` remains human-reviewed even if allowlisted; delegation never creates PC assent. Existing `/vc-story ai-inbox` and `/vc-story ai-review` expose/review these proposals. `/vc-roll adjudicate` can record participation, flat/advantage/disadvantage modifiers, visible Difficulty or an active owned plain-attack source. Save the actual governing ruling using `/vc-rules ruling` first. The raw Duality path uses the same metacurrency helper, remains compatible without pending request bindings, and cannot claim resolution of a pending request. `pending` and `result` are private zero-write reads. Publication receipts preserve request/revision identity; resend/inspection never rerolls or charges. A Discord acknowledgement lost after sending may duplicate text on retry, not mechanical effects.

| Behavior / scenarios | Evidence | Observed scope / limits |
| --- | --- | --- |
| IHY-02; 01–15 | Required `i-heard-you-1-test.mjs` and `i-heard-you-2-test.mjs`; actual GMService/commit/intent, native command/routing/review/RNG/roll/city/HP/spotlight services | Core standard mechanics implemented; source-backed manual adjudication for unrepresented active card/equipment exceptions; no unsupported bonuses |
| IHY-03; 17, 22 | Same IHY2 suite; production narrative claim validator, private-message scan, known actor IDs and deterministic paraphrase categories | Bounded local tripwires; unknown paraphrases/idioms remain UNVERIFIED. Metaphors, reports and speculative statements are not world mutations |
| 15, 18, 25–26 | Scoped native revisions/owner checks, logical publication receipts, saved dice/usage, snapshot/restart, required offline guard | Native once-only effects; no billable validation. Further cross-phase recovery negatives remain in final integration |

Native source lookup now rejects omitted active scoped modifier records rather than silently dropping known modifiers. Unsupported feature activation and missing stats require provisional human review. No automatic arbitrary card engine or PC-target armor spending was added; native adversary-target attack threshold handling is reused. All earlier release suites remain mandatory. Phase gate passed with dummy credentials and network denial; final closure resynchronizes metadata and reruns it after documentation changes.

## Phase 3 — 8.3.0 (starting HEAD 7139071)

P04 extends the existing closed `dialogue.interpret` intent with optional correction references. A correction must target the same NPC's prior interpretation of the same PC, using a different authenticated speech source that NPC actually heard. Native memories preserve both exact utterances and both subjective readings; no global truth, relationship, pact or PC preference changes. Cognition packets attach actor-owned correction pointers and active/retracted/unverified source labels. Historical testimony survives source retraction but cannot authorize new consequences.

P05 hooks the native committed request-bound attack into existing encounter/memory services. Only mapped, active world combatants with actual current sight access receive an observation of the PC's visible weapon use. Pending declarations, remote/defeated NPCs and human proxies are excluded. No trait numbers, Difficulty, Hope, Experience, damage, intent or hidden features enter the observation. Actual roll IDs and source pointers persist; replay cannot add memories. No new adversary mechanics, automatic resource-consuming preparations or additional model calls: existing sourced goal/review/resource services remain necessary for lawful adaptation. Non-request-bound legacy attacks and secondhand tactical reports retain their existing manual source paths; arbitrary inferred capabilities remain UNVERIFIED.

| Behavior / scenarios | Evidence | Status |
| --- | --- | --- |
| IHY-04; 19, 23, 25 | Required `i-heard-you-3-test.mjs`: actual dispatcher/intent/native memories/cognition, divergent listeners, foreign correction rejection, original preservation, snapshot/restart | COMPLETE for source-linked listener corrections; unrestricted interpretation remains PARTIAL |
| IHY-05; 21, 23, 25 | Same suite: native owner roll → encounter witness capture → memory → cognition, actual remote/defeated exclusion, replay and retraction | COMPLETE for observable request-bound weapon use; no automatic capability inference or new feature |

No new commands or flags. Uses `dialogue_history`, `scene_continuity`, `tactical_memory` and request-bound roll flags; `dialogue.interpret` may use existing explicit delegation. All flags remain unchanged in live campaigns. Schema remains 440. Disabling these flags stops new capture, not historical records. Required full offline validation is the release gate.

## Phase 4 — 8.4.0 (starting HEAD aa4d6b2)

Audit reused native organization requests, arc candidates/invitations, project drafts, custody recipient confirmation, discovery and private inboxes. The authenticated public/private routes now recognize addressed prose replies without JSON. Any text following `Regarding <proposal key>, ...` is preserved verbatim as a nonbinding owner reply: questions, counteroffers, qualifiers and unrelated suggestions do not change the terms. Exact native application additionally requires the displayed current revision and complete terms; a conservative example is `Regarding <key>@<expected_revision>, I agree to: <exact terms>`. This is an optional mechanical authorization grammar, not an offered story response or a restriction on ordinary roleplay. Bare-key agreement, “sure”, quotations, stale revisions and someone else's words cannot bind. Unknown prose stays with ordinary GM interpretation; no model can authorize the owner. Revision and terms are available privately through `/vc-intel continuity`; counterterms need a new native proposal before agreement. Proposal keys/revisions are backend identifiers, not narrative choices.

Supported direct application reuses native organization confirmation/decline, arc confirmation/rejection/deferral and invitation response, project-draft acceptance and evidence-recipient confirmation/decline. These do not bypass human world review, force arrival or spend resources. Existing project-phase submission consent, meeting and multi-party negotiations retain native authenticated/manual review paths; they are not inferred from arbitrary prose. P06 remains PARTIAL for universal workflow/natural-language coverage; no claim of unrestricted interpretation. Replies and exact terms survive restart/snapshot and appear in existing private continuity/GM context. Native replay receipts are checked before a closed offer can be repeated.

`/vc-intel discover mode:case query:<literal>` and open queries such as “What do we have on Violet?” extend native read-only discovery. The combined view separates character knowledge/clues, owner hypotheses, authorized artifact authority and scoped custody observations. SQL authorization/literal matching precedes limits, including old evidence. It never reads hidden mystery solutions, private NPC beliefs or hidden custodians into player output. Unknown queries remain unknown and do not close clue routes or invent proof.

| Behavior / scenarios | Evidence | Scope |
| --- | --- | --- |
| IHY-06; 16–18, 25 | Required IHY4 native route/service tests; nonbinding questions/counterterms/quotes, actual owner/terms/revision, stale/foreign rejection, replay and snapshot | COMPLETE for tested exact owner organization reply; broader workflows retain native human paths and remain PARTIAL |
| IHY-07; 20, 25–26 | IHY4 scoped discovery/actual old handout/hypothesis/private metadata exclusion; SP9 existing genuine command read-only path | COMPLETE for literal authorized workspace; arbitrary inquiry semantics UNVERIFIED |

No new flags or AI spending delegation; uses existing `natural_language`, `discovery` and native domain flags. Required offline gate denies network; no live data/configuration change. Schema 440 unchanged.

## Phase 5 — 8.5.0 (starting HEAD ee9e535)

P08 audit found existing read-only physical/custody/canon/case-report checks in `reconcileHistory`, native strategy DAG/source validation, accepted commitments and actual roll resource receipts. Extended that same diagnostic, not a repair engine. Open dependent records now inspect source ancestry (sixteen-hop bound), missing/retracted lineage, current strategy objective/deadline, incompatible actual commitments and saved receipt arithmetic/one-Hope costs. Historical testimony and competing NPC beliefs are excluded; present sheets are not compared against historical receipt totals because later legal spending is not a contradiction.

Use existing GM-private `/vc-story why json:{"op":"reconcile"}`; target an old record with `record_kind` and `record_key` (strategy, commitment, long_project, organization_request, roll_request, roll_operation or consent_reply), or existing `handout_id`. Diagnostics name exact records/sources and require backup plus explicit human/native revision, never automatic refunds, dice replacement, source resurrection or canon edits. Bounded coverage/truncation is reported; missing historical receipts cannot be reconstructed as facts. P08 COMPLETE for tested objective detectors, PARTIAL for unrestricted semantic/legacy-history reconciliation.

Required IHY5 suite exercises actual DB/source/reconciliation functions, retracted ancestry, stale objective/deadline, duplicate commitments, malformed versus valid native-style receipts, targeted lookup, unchanged beliefs, zero writes/time and campaign isolation. Existing SP6 command/auth checks remain required. No schema/flag/delegation change; full network-denied gate required before commit.

## Phase 6 — 8.6.0 (starting HEAD 16dce14)

P09 audit traced actual prepare/commit director paths, native action validators, actor-owned goals/knowledge, rotating categories and existing pacing silence. New default-off `narrative_relevance` extends those paths with read-only ranking of at most 32 proposed native actions. It reuses the native legality/resource validator, actual actor knowledge and goal relevance, active known source/session proximity and recent actual repeated actions. Model rationale alone earns no score; unknown/retracted information is refused. Execution rechecks authority and costs. Established sourced reactions rank ahead of unrelated proposals, without making known facts into actor knowledge or revealing private planning scores.

Relevance priority alternates with the existing category rotation, preserving opportunities for nonordinary work rather than spending extra budget. Round/scene/downtime remain 1/3/4; institutions remain at most 2. Queued work and deferred typed intents retain existing persistence. The quiet/OOC or explicit pause-background path returns before generation, snapshots, receipts and fictional-time advancement: zero work is valid, not a failed quota. Ordinary legitimate fictional triggers still advance only their supplied fictional duration. No new scheduler, per-NPC request or forced threat/PC choice.

Enable (not executed): `/vc-city flags json:{"narrative_relevance":true}`. Existing simulation/delegation gates still apply; no new delegated operation. IHY6 required production functions prove grounded ordering, native legality, forged/retracted source refusal, actual one-action commit/replay and zero-write/time/provider quiet path; existing end-to-end G proves category rotation. P09 COMPLETE for this bounded deterministic ranking; subjective narrative quality remains UNVERIFIED. Schema440 and previous behavior with the new flag off are preserved. Full offline release gate required.

## Phase 7 — 8.7.0 (starting HEAD 451fc38)

P10 reuses saved ended-session recaps, scoped native facts/events, private continuity, actor goals, review records, fictional schedules and read-only reconciliation. New default-off `session_briefs` enables `/vc-intel recap` reconstruction and `/vc-intel brief` (actual current owned character), plus authenticated GM-only `/vc-story brief`. Shared output includes only public/party records. Character output adds only that actual character/player scope, not another PC's findings; raw world-event details never enter a player brief. GM preparation adds actor-owned motives, pending reviews, upcoming fictional schedules and continuity warnings. Every item labels provenance/status/uncertainty; an actor motive, hypothesis, scheduled event or old source is not a fact about the future.

Views are reconstructed from persisted history, not a new model summary or cache. No quotes/PC intentions are invented, schedules executed, recall marked, time advanced, accounts created or receipts written. Packet/record limits and omissions are explicit; an incomplete recap does not prove no other events occurred. Prior saved player-safe recap text is reused as historical text, not revalidated as new canon. Disabling the flag restores the previous recap command; no migration/delegation change.

Enable (not executed): `/vc-city flags json:{"session_briefs":true}`. IHY7 required suite exercises real public/private/GM views and actual command entry points, GM permission denial, two-character scope isolation, raw secret-detail exclusion, zero writes/time and exact reconstruction after restart. P10 COMPLETE for bounded persisted scoped briefs, not model truth verification. Schema440 remains unchanged; full required offline gate before commit.

## Phase 8 — 8.8.0 (starting HEAD 67a386a)

P11 extends the existing `expansion-quality-test.mjs` production validator benchmark, rather than a parallel rules engine. `fixtures/i-heard-you-golden.json` contains 25 named hand-authored synthetic cases: 23 asserted source/paraphrase/private-surface/UX/metaphor/idiom judgments and two explicitly UNVERIFIED unknown paraphrases. The emitted `I_HEARD_YOU_EVALUATION` JSON reports actual validator decisions, false positives/negatives and unresolved ambiguity counts. Unknown acceptance is expressly not proof of truth. Rules/resource/collaboration violations are measured by required native IHY2 assertions, not falsely inferred from text-only cases. Existing IHY1–7 and prior suites remain required, covering real GM/commit/owner/review/dice/scoping/recovery paths.

The required runner now emits `VALIDATION_REPORT` JSON with actual per-suite exit status, failures, zero live requests/billable tokens and limitations, including on failure. Reports are stdout artifacts, not campaign state. Offline guard now also denies UDP and marks a guarded process failed after any attempted outbound request, even when test/application code catches the error. Its intentional security probe runs in a child process whose required failing exit is asserted by the existing narrative-contract suite; no outbound request is transmitted. Tests use dummy credentials and synthetic provider/Discord doubles.

Observed targeted evaluation: 23/23 asserted cases passed, zero false positives/negatives, two unknowns honestly UNVERIFIED. P11 COMPLETE for required reproducible offline evaluation and reporting; unrestricted model meaning/judgment remains UNVERIFIED. No runtime flags, AI delegation, schema or live state change. Full offline gate before commit.

## Phase 9 — 8.9.0 (starting HEAD 52700aa)

P12 audit reused `seed_draft`, `seed_reference`, native source events, reviewed add-only seed materializers and snapshots. New `content-packages.js` validates closed, bounded, canonical-SHA256 definitions for NPCs, places, factions, campaign mysteries, rules references and safe player material. Every definition has explicit GM/public privacy and named HTTPS source/license citations. Citation strings are not a legal rights verification: actual authenticated GM rights approval is mandatory. Unknown runtime/owner/resource fields, forged hashes, unsupported kinds, duplicate identities, public fixed truths/GM notes and credential/query-bearing source URLs are refused.

GM commands (JSON inputs; all responses private):

```text
/vc-admin seed-package-preview json:<package document>
/vc-admin seed-package-import json:{"package":<document>,"rights_approved":true}
/vc-admin seed-package-review json:{"id":"package:<sha256>","expected_revision":"<current fingerprint>","decision":"approve","public_export":false}
/vc-admin seed-package-export json:{"id":"package:<sha256>","public_only":true}
```

Preview/export are zero-write reads, including command entry points. Import stages an inert native reference draft; approval creates a native reference only, never an NPC, actor knowledge, live mystery truth or rule installation. Definitions can subsequently be proposed through existing `/vc-story author` and reviewed native authoring workflows, which retain identity/canon/mechanical validators. Import replay is content-addressed, including rejected tombstones. Edits after rights review require reimport and fresh review. Collisions are previewed, never overwritten. No new content/PC tables or parallel canon ledger.

Public export additionally requires separate human `public_export:true` review at the exact current revision, exports only public definitions and their referenced citations, and blocks common personal/runtime identifiers and actual campaign PC names. Arbitrary prose cannot be proven secret/PII-free by a regex: human public review remains necessary and its limits are explicit. Private GM export requires explicit `public_only:false`; neither mode exports runtime sheets/resources/memories/rolls. Rules references are inert citations, never automatic homebrew. Package format: `veiled-city-content-package-v1`, name/version/license, sources `{id,title,url,license}`, entries `{kind,key,visibility,source_refs,definition}`, optional verified sha256. Maximum 12 entries/8 sources/24000 characters; Discord JSON inputs retain Discord's own text limits.

IHY9 required real seed/reference/review/command tests prove inertness, existing NPC preservation/collision, source/hash/rights/revision/privacy/PII denial, replay, changed-content re-review and restart export equality. P12 COMPLETE for bounded inert portability, not automatic installation or semantic/legal certification. No new flags or AI delegation; explicit GM-only operations. Schema440 unchanged. Full offline gate before commit.
