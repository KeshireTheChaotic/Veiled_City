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
