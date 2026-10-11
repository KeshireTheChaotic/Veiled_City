# Typed Intent Refinement Progress

## D00 v8 - rebaseline and Session 2 reproduction

Status: complete. Starting HEAD: `2dc347a77e1fd4988856b8e578e5c148fe82cb24`.

- Reconciled the full v8 package and the available original v7 ZIP against the actual branch. Existing T00-T08 functionality is retained; delta gaps are not being rebuilt under historical ticket names.
- Baseline commands actually run: `npm ci --ignore-scripts` (37 packages, 38 audited, zero vulnerabilities), `npm run check` (211 modules/scripts; 24 commands), and `npm run validate` (85/85 suites).
- Offline validation denied network access and reported `live_requests=0`, `billable_tokens=0`.
- Added sanitized Session 2 evidence plus three red-first, non-default reproduction scripts. They cover malformed secondary spans, recoverable target ambiguity, deterministic review normalization, input/output claim-span separation, Discord 2,000-character limits, unbounded DM fallback, source-only roll collisions, missing typed-request publication, missing component dispatch, unwired scene windows and permissive reconciliation.
- The reproduction scripts fail for the expected owning-phase reasons. They are not yet default green gates; H01-H05 and D01-D06 must turn them green before registration.
- Actual red results: semantic replay failed S2-06 with `PLAYER_INTENT` exact-offset rejection, S2-17 because ambiguity was accepted instead of persisted, and S2-21 with `POST_TURN_REVIEW`; the claim-span negative correctly reproduced `NARRATIVE_INTEGRITY/source_span`. Message-contract reproduction measured a 2,029-character assembly reply and found unbounded session-end and DM sends. The v7 structural audit found all five expected F08/F10-F13 gaps.
- Changed files: `bot/scripts/fixtures/session2-sanitized.json`, `bot/scripts/session2-replay-test.mjs`, `bot/scripts/session2-message-contract-test.mjs`, `bot/scripts/v7-delta-baseline-test.mjs`, `docs/TYPED_INTENT_DELTA_AUDIT.md`, and this ledger.
- D00 changes no runtime, persistence, authority, privacy or rollback behavior. No bot, production database, Discord registration, deployment or paid provider was used.

Next phase: H01 exact source-span identity and recoverable parsing.

## H01 v8 - exact source-span identity and recoverable parsing

Status: complete. Starting HEAD: `30257fb12420dcf158212fe1a56e2134863ca4df`.

- Red first: D00 `session2-replay-test.mjs` reproduced whole-list `PLAYER_INTENT` failure when an optional secondary proposal had invalid offsets. The focused H01 test was added before runtime changes.
- Added exact UTF-16 occurrence accounting for repeated phrases, overlap rejection, bounded offset-only diagnostics and dependency-safe partial recovery.
- The live GM path now quarantines malformed optional clauses, retains independently valid interpretations and adds a scoped non-authoritative clarification. State preview/commit persists diagnostic receipts without model-fabricated text.
- Existing fatal gates remain for actor/principal mismatch, stale source, consumed spans and target redirection. Diagnostics cannot be accepted for adjudication and authorize no effect.
- Focused commands: `node scripts/h01-source-recovery-test.mjs`, `node scripts/typed-intent-lifecycle-test.mjs`, and `node scripts/session2-replay-test.mjs`. H01 cases pass; the aggregate replay remains intentionally red only for H02 and H03 cases.
- `npm run check` passed with 215 modules/scripts and 24 commands. `npm run validate` passed 86/86 suites with the new H01 gate registered, network denied, `live_requests=0`, and `billable_tokens=0`.
- Persistence is additive in existing city records (`semantic_intent_diagnostic`); no schema migration. Rollback is a source revert; retained diagnostic rows are inert.
- No production data, live bot, Discord registration, deployment, network provider or paid model was used.

Next phase: H02 contextual referents, movement and clarification.

## H02 v8 - contextual referents, movement and clarification

Status: complete. Starting HEAD: `bb3be0df653528678ea3a729c3961afe6519f58c`.

- Red first: the D00 S2-17 case showed that an altered ambiguous interpretation could reuse an earlier proposal identity and be returned as accepted. The dedicated H02 test captured pending referent and new-source behavior before integration.
- Proposal replay now verifies the complete immutable proposal payload. Changed targets, ordering or meaning for the same source occurrence fail closed.
- Material ambiguity persists as `awaiting_referent`, with bounded candidates and no typed acceptance or scene effect. Unique native place resolution may ground a candidate but still does not grant access.
- Added new authenticated-source resolution for a still-current owner/session/scene/principal. The accepted record points to the clarification source and the prior proposal becomes `clarified`.
- The normal persistence path uses native place resolution, resumes matching pending referents, preserves interior/exterior route semantics and leaves locks, wards, contested paths and encounter movement to existing native access checks.
- Focused tests: `h02-referent-movement-test.mjs`, `session2-replay-test.mjs`, `typed-intent-lifecycle-test.mjs`, scene-entry, narrative-inference and movement-authorization suites. S2-17 is green; the aggregate remains red only for H03.
- Updated the pre-existing RELAX discovery fixture to name its same-turn `laundromat` target key, matching the structured contract instead of relying on an ungrounded generic referent. Its original bounded-retry and native-worldbuilding assertions remain unchanged.
- `npm run check` passed with 216 modules/scripts and 24 commands. `npm run validate` passed 87/87 suites after synchronizing release metadata, with network denied, `live_requests=0`, and `billable_tokens=0`.
- Persistence is additive in existing semantic proposal/typed-intent records; no schema migration. Rollback is a source revert and leaves pending/clarified audit records inert.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: H03 deterministic post-turn state review.

## H03 v8 - deterministic post-turn state review

Status: complete. Starting HEAD: `d809cc9451575c86b56120b22bcaee767df0e0ec`.

- Red first: `h03-post-turn-review-test.mjs` reproduced the Session 2 `references=changed` / no reference mutation failure as `POST_TURN_REVIEW/review_without_mutation`.
- Review reasons, confidence bounds and scene-transition shape remain mandatory. Category decisions are now computed from structured events, relationships, handouts and NPC-cognition drafts instead of trusting model metadata.
- Mismatched flags are normalized before native preview. No synthetic `npc_update`, `location_update` or other mutation is created to satisfy the review, and world additions/movement remain governed by their own native services.
- A normalized committed player turn writes an idempotent GM-private `post_turn_review_audit` tied to its authenticated world-input source. Preview rolls the audit back; it grants no consequence authority and contains no player text.
- Focused H03, Session 2 replay, operations, production, NPC cognition and RELAX suites passed. The Session 2 review mismatch no longer consumes a correction-model call.
- `npm run check` passed with 217 modules/scripts and 24 commands. `npm run validate` passed 88/88 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- Persistence is additive in existing city records; no schema migration. Reverting the phase leaves inert private audit records that authorize nothing.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: H04 narrative claim evidence and consequence reconciliation.

## H04 v8 - narrative claim evidence and consequence reconciliation

Status: complete. Starting HEAD: `985e5843edac5c7cd24ee6e5bff34a389d14c1d3`.

- Red first: `h04-narrative-claim-evidence-test.mjs` failed with `NARRATIVE_INTEGRITY/claim_shape` because input and output evidence had no distinct contract.
- Added a closed separated claim shape with `authored_source_span` and `output_claim_span`. The closed legacy shape remains readable, but its `source_span` is output evidence only.
- Authored evidence is checked against active owner-authored source ancestry. Output evidence must occur exactly once on exactly one actual publication surface; duplicate party/private attachment and cross-surface spans fail closed.
- Completed movement now requires a matching active native arrival/travel receipt in addition to saved position. Existing access, possession, damage, disclosure, obligation, canon, witness and epistemic gates remain intact.
- Updated privacy regressions to assert the earlier output-surface rejection where a private claim is attached to party prose. Session 2 S2-24 now succeeds with separated unresolved intent evidence and cannot assert completed entry.
- Focused H04, Session 2 replay, narrative contracts/understanding/inference, scene-entry and RELAX suites passed.
- `npm run check` passed with 218 modules/scripts and 24 commands. `npm run validate` passed 90/90 suites with H04 and the aggregate Session 2 replay registered, network denied, `live_requests=0`, and `billable_tokens=0`.
- Persistence and schema storage are unchanged; this is a structured-output compatibility extension plus stricter validation. Rollback remains the existing authoritative transaction.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: H05 Discord payload limits and reliable assembly delivery.

## H05 v8 - Discord payload limits and reliable assembly delivery

Status: complete. Starting HEAD: `1ec4061d238300844ad543ffd20893b6cf670792`.

- Red first: `session2-message-contract-test.mjs` reproduced the 2,029-character assembly response, unbounded session-end `editReply`, and unbounded direct-message fallback. `h05-discord-delivery-test.mjs` initially failed because the interaction and assembly-part delivery services did not exist.
- Extended the shared chunker to keep every message at or below 1,900 UTF-16 code units, avoid half-surrogate and mention splits, and balance Markdown code fences across individual Discord messages.
- Added one-initial-response plus follow-up interaction delivery and applied it to assembly launch/status and session-end recaps. GM logs and the runtime DM fallback now use the same chunk boundary.
- Assembly delivery reuses the saved plan and records stable per-chunk public/private delivery states. State is marked before Discord I/O; an ambiguous interruption becomes `uncertain` and is not automatically resent or regenerated.
- Existing interaction receipts still prevent same-interaction mutation replay. Assembly launch audit/logging is recorded once in the saved plan, so a response failure cannot duplicate the public opening or private hooks.
- Focused H05, Session 2 message contract, interaction lifecycle, refactor and operations suites passed.
- `npm run check` passed with 221 modules/scripts and 24 commands. `npm run validate` passed 92/92 suites with H05 and the Session 2 message boundary gate registered, network denied, `live_requests=0`, and `billable_tokens=0`.
- No SQL migration was required; assembly part state is additive inside existing `assembly_plan_json`. Rollback is a source revert; saved delivery states remain inert metadata.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: D01 unique roll identity, rules grounding and pending lifecycle.

## D01 v8 - unique roll identity, rules grounding and pending lifecycle

Status: complete. Starting HEAD: `1ef0483095cfd5ff008766a4565749fd45182e44`.

- Red first: `d01-roll-lifecycle-test.mjs` reproduced acceptance of fabricated `srd:` and `house:` references, then exposed the same-source roll-key alias, missing `nativeAdjudications` publication and actionable-looking `needs_review` lifecycle.
- Typed request identity now hashes the authenticated source event, accepted proposal occurrence, action type, roll kind and stable accepted-source revision. Legacy declaration requests retain their historical source-only identity; new typed occurrences cannot collide.
- Added a versioned Daggerheart SRD reference catalog with roll-kind applicability. Campaign override, house and homebrew references must resolve to an active ruling in the exact campaign; unsupported or scene-qualified references become provisional and create no fake roll request.
- Native adjudication records now distinguish `roll_pending` from `needs_review`, save bounded review reasons and owner/character audience, and render review requests as explicitly non-actionable.
- Post-commit publication scans committed `mutation.nativeAdjudications` as well as the legacy receipt shape, re-reads the native request, limits delivery to recognized live lifecycle states and reuses per-owner request/revision publication receipts.
- Focused D01 and T03 arbitration tests passed, including two roll-required occurrences in one Discord message, stable replay, two private deliveries and delivery replay suppression.
- Commands actually run: `npm run check` passed with 223 modules/scripts and 24 commands; `npm run validate` passed 93/93 suites after release-manifest synchronization, with network denied, `live_requests=0` and `billable_tokens=0`.
- Persistence remains additive in existing `roll_request`, `native_adjudication` and `roll_publication` city records; no SQL migration. Revert leaves committed historical requests readable and does not reroll or reverse native receipts.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: D02 source-grounded private bonus and feature arbitration.

## D02 v8 - source-grounded private bonus and feature arbitration

Status: complete. Starting HEAD: `5c6e39dbd3f5cb368aa6ba80fe8c054ce9799471`.

- Red first: `d02-roll-options-test.mjs` began with the missing owner-private registry module, then asserted authoritative ownership, operation/trait/roll-kind relevance, explicit cost and exclusivity, foreign-option rejection and zero resource/request mutation.
- Added deterministic candidate discovery for the prepared trait, already reviewed modifier events, Experiences, equipped/active domain features, assets, conditions, Help and Tag Team. Numeric effects are accepted only from bounded structured sheet metadata or existing reviewed modifier sources; names and prose are never parsed into bonuses.
- Explicit `applies_to` metadata filters unrelated options. Missing applicability, inactive equipment and mechanics without a native reviewed application path are visibly `requires_additional_authorization` or `blocked`, rather than guessed or silently stacked.
- Applicable reviewed Experiences are `requires_owner_choice`, retain the separate 1 Hope cost and do not spend during discovery. Mutually exclusive groups and frequency limits are retained for later owner interaction.
- Net-disadvantage Help is explicitly blocked pending an exact saved GM ruling for that combination. Other Help and Tag Team entries disclose their separate participant consent, review, cost and session requirements without exposing another character's sheet.
- Model-proposed keys not found on the authenticated owner's applicable registry are rejected with a generic reason; foreign option values are never returned. Rejection leaves the native request pending and unchanged.
- Focused D02 and existing I Heard You collaboration tests passed. `npm run check` passed with 225 modules/scripts and 24 commands; `npm run validate` passed 94/94 suites after manifest synchronization, with network denied, `live_requests=0` and `billable_tokens=0`.
- The `roll_option_registry` is an additive character-private city record tied to the source request and sheet/request fingerprints. It grants no application, spending, consent, dice or outcome authority and requires no SQL migration.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: D03 interactive private Discord roll menus.

## D03 v8 - interactive private Discord roll menus

Status: complete. Starting HEAD: `1558583f274bb189fd7ea31a6cbe1adc5d4f86c3`.

- Red first: `d03-roll-menu-test.mjs` began with the missing menu service and specified owner binding, private payloads, preview-before-spend, stale revision rejection, exactly-once confirmation and restart reconstruction.
- Added `/vc-roll menu request:<key>` as an ephemeral accessible entry point. It renders bounded owner-only formula, applicable Experience choices, costs, exclusivity, review blockers and status; `/vc-roll contribute` remains the non-component fallback.
- Opaque `roll_menu_token` records bind guild, active session, user, character, request, source, registry and exact request revision. Discord custom IDs expose only a short token and action, never character sheet details.
- Select menus preview/deselect choices without spending. Confirm revalidates current ownership, source proof, option state, exclusivity and request revision, then invokes the existing native Experience operation transactionally. Roll uses the existing native roll operation.
- Tokens move through `active` to `applying` and `used` (or `cancelled`). A stale, foreign, closed or repeated control cannot spend, roll or disclose options; rollback returns an interrupted synchronous operation to its prior state.
- Menus paginate at 20 choices, include refresh/close controls and can be reconstructed after restart from current native request state. Additional-authority Help/Tag Team/feature paths remain visibly inert until their existing consent/review prerequisites are satisfied.
- Focused D03, D02, I Heard You collaboration and interaction-lifecycle tests passed. `npm run check` passed with 227 modules/scripts and 24 commands; `npm run validate` passed 95/95 suites after manifest synchronization, with network denied, `live_requests=0` and `billable_tokens=0`.
- Persistence is additive in character-private `roll_menu_token` and `roll_option_registry` city records; no SQL migration. Tokens grant UI authorization only, while native operation receipts remain outcome/cost authority.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: D04 alternate traits, Experiences and owner-controlled sharing.

## D04 v8 - alternate traits, Experiences and owner-controlled sharing

Status: complete. Starting HEAD: `7adf98db84f0dcb1db2b9e225b9c626f3e3f1e14`.

- Red first: `d04-trait-sharing-test.mjs` specified an exact request-bound reviewed alternate trait, rejection of a fabricated proof, recalculated native breakdown, exact Experience spend, private-by-default results and explicit redacted party publication.
- Human GM adjudication now supports `alternate_trait` sources tied to one request, current scene, character, from/to traits, reason and saved ruling. Discovery offers only recorded traits with that active proof; arbitrary model or owner trait substitution remains invalid.
- Owner confirmation updates the prepared input and recomputes the existing native `rollBreakdown`. It cannot run after paid options, with Tag Team, after rolling, with unresolved mechanics or with stale proof. Trait choice itself has no inferred cost.
- Private menus can confirm one alternate trait, then require a fresh recalculated view before Experience choices. Existing Experience operations still require exact reviewed relevance, explicit owner confirmation and one transactional Hope spend per choice.
- Added affirmative `share` to the native roll operation. Only the acting owner can share an actual saved result; default remains private. The party projection includes character, authored attempt, saved total/duality and status, but omits traits, Experiences, cards and private option state.
- Party delivery uses a stable disclosure source and publication receipt. Retry cannot repost, reroll or respent; a foreign/denied share creates neither disclosure nor cost.
- Focused D04, D03 and I Heard You collaboration tests passed. `npm run check` passed with 229 modules/scripts and 24 commands; `npm run validate` passed 96/96 suites after manifest synchronization, with network denied, `live_requests=0` and `billable_tokens=0`.
- Persistence is additive in existing roll request/operation records plus party-scoped `roll_disclosure` and `roll_party_publication`; no SQL migration. Native roll/cost receipts remain authoritative.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: D05 multiplayer action windows, contests and consent.

## D05 v8 - multiplayer action windows, contests and consent

Status: complete. Starting HEAD: `ac3494c41d55df1ff77eaf39e04fce62447d66f8`.

- Red first: `d05-live-window-test.mjs` failed on the missing production coordinator and specified ordinary independence, two-message scarce-resource overlap, consent-pending direct PC conflict and live `state.js` integration.
- Added a closed optional `coordination` envelope to typed intent output: explicit reason/beat, bounded resolved reads/writes, authoritative current location, operation, affected participants and consent references. Prompt guidance requires omission for ordinary nearby movement/dialogue/independent work.
- The authoritative mutation transaction now passes accepted typed intents and dependency nodes through `coordinateTypedActionWindows` before filtering scene actions. Coordinated nodes alone become pending; uncoordinated nodes retain normal ready execution.
- Production coordination rechecks the acting character's saved location, active source/session/scene, audience, exact accepted intent, resource syntax and native consent records before joining the existing window service.
- A direct PC conflict or cooperative action without all required current consents creates a scoped `scene_action_pending/awaiting_consent` record and suspends only that compound node. It records an attempt but authorizes no target participation, response, roll, movement, damage or result.
- Existing optimistic window revisions, explicit reaction windows, exclusive winner enforcement, native receipt requirements, replay and late-action refusal remain unchanged and green.
- Focused D05, T04.1 window, typed lifecycle/regression tests passed. `npm run check` passed with 230 modules/scripts and 24 commands; `npm run validate` passed 97/97 suites after manifest synchronization, with network denied, `live_requests=0` and `billable_tokens=0`.
- Persistence is additive in existing scene-window records plus `scene_action_pending`; no SQL migration. Rollback is transactional and no model coordination metadata is itself outcome authority.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: D06 compound continuation and strict consequence reconciliation.

## D06 v8 - compound continuation and strict consequence reconciliation

Status: complete. Starting HEAD: `c7e76a9469eddcea3832db6d86c5d911e36b0623`.

- Red first: `d06-continuation-test.mjs` began with the missing typed-roll outcome bridge and specified receipt creation, selective descendant resume, replay and strict live reconciliation.
- A terminal typed native roll now creates one stable `action_outcome_receipt` from the accepted action, request and saved roll ID. Success/failure is derived from actual total, Critical state and stored Difficulty; no model-provided result is used.
- Finalization marks the accepted intent and native adjudication resolved, attaches the exact receipt, then resolves or fails only its compound node and recomputes the same-source DAG. Successful prerequisites make eligible descendants ready; failed prerequisites block only causal descendants; independent nodes remain ready.
- Replay returns the same receipt and cannot reroll, respent or transition a terminal node differently. Attack actions wait through damage/type phases and finalize only when the native request becomes resolved.
- `needs_review` is now a first-class reconciled disposition with an actual matching review request. Production `commitGmTurn` calls consequence reconciliation with `strict:true`; an immediate consequential action lacking resolved, pending, review, blocked or clarification authority aborts the transaction.
- Focused D06, T06 reconciliation, T04 compound and T03 rules tests passed. `npm run check` passed with 232 modules/scripts and 24 commands. The pre-manifest run passed every behavioral gate and stopped only at the expected stale hash; after synchronization, `npm run validate` passed 98/98 suites with network denied, `live_requests=0` and `billable_tokens=0`.
- Persistence is additive in existing accepted intent, native adjudication, outcome receipt and compound records; no SQL migration. All updates share the native roll transaction and roll back together.
- No production data, live bot, Discord registration, deployment or paid provider call was used.

Next phase: D07 scoped memory, lore and referent integration.

## T00 — reproducible baseline

Status: implementation inventory complete; baseline captured at `6c3167dbbf015739e1723272121552d60b9f2ec8`.

- [x] Preserve the modified 10.0.0 source on `codex/typed-intent-refinement`.
- [x] Record source, runtime, call graph, sinks, language consumers, records, and receipts.
- [x] Install locked dependencies and run focused offline checks.
- [x] Run the full offline validator and catalogue its independent pre-existing fixture failure.
- [x] Establish an executable T05a privacy red case.
- [x] Record the Tyrell target and the still-incomplete Billy end-to-end target.

## T05a — memory audience-isolation security gate

Status: security gate implemented and focused validation passed.

- [x] Derive persistence independently from party/player and recipient-bound private surfaces; unsupported/GM-only context cannot establish a memory.
- [x] Prevent private message text from contributing to party significance.
- [x] Bind saved summary text and provenance to the supporting surface.
- [x] Reject unsafe/legacy provenance during retrieval and prevent party-turn and cross-character reads.
- [x] Verify the inspected code has no `context_memory` path into NPC cognition or another summarizer.
- [x] Pass the focused audience-isolation, source, quality, format, syntax, typed-intent, GM-recovery, natural-language-scope, narrative-contract, and scene-entry checks.
- [x] Run the full offline validator and preserve its independent baseline failure without weakening assertions.

The fail-red baseline demonstrated that private-message-only text selected a party memory. The fail-green fixture now covers party narration, two separate private recipients, a second character owned by the same human, a forbidden cross-player private-scene message, unsafe legacy rows, surface-bound summaries, and absence of NPC-memory writes. Party generation retrieves only public/party memory; a private turn may additionally retrieve only its exact user/character scope. Retrieval also requires active, compatible source ancestry.

The full validator still stops at the previously catalogued `production-regression-test.mjs` compatibility assertion: its legacy fake authenticated turn omits required typed fields, causing a paid-retry count of two instead of the fixture's expected one. Direct runs also found that `relax-end-to-end-test.mjs` reaches three calls instead of one through the same obsolete fixture shape, and the pre-existing `autonomous-world-test.mjs` atomic-unsourced expectation no longer throws under the supplied modified typed-intent baseline. None of these independent failures was changed under this privacy-only ticket.

## T00.1 - authority stabilization and full-suite compatibility

Status: complete on 2026-10-10. Implementation commit: `c5242a490183d70f8d9d15b8bcbb716b85075b4c`; reviewed starting commit: `7786d560c9d69483684692e039c6ce27d8da13e4`. The progress-report commit is the commit containing this entry. Package version remains `10.0.0`.

Changed scope:

- Runtime: `bot/src/autonomous-world.js`, `bot/src/typed-intents.js`, `bot/src/gm.js`, and `bot/src/scene-entry.js`.
- Tests: `bot/scripts/movement-authorization-regression-test.mjs`, `autonomous-world-test.mjs`, `production-regression-test.mjs`, `relax-end-to-end-test.mjs`, `implementation-phase-c-test.mjs`, and `validate-offline.mjs`.
- Contract/release inventory: `CODEX_TYPED_INTENT_BRANCH_PLAN_v3.md`, `manifest.json`, and `MANIFEST.txt`.
- `bot/src/context-memory.js` was not changed; the completed T05a audience-isolation behavior remains in force.

Red-first evidence:

- `node scripts/production-regression-test.mjs` reproduced `turnCalls 2 !== 1`.
- `node scripts/relax-end-to-end-test.mjs` reproduced `3 !== 1` for the provider call count.
- `node scripts/autonomous-world-test.mjs` reproduced the missing expected exception for the unsourced movement proposal.
- The new targeted suite was run before the implementation and failed at SEC-01 because missing `player_intents` did not throw. This established that a narrative `scene_actions.move` could bypass typed authorization and mutate movement state.

Authority and native-effect diff:

- An executable move now requires a current, active, source-event-bound `typed_intent` for the same actor, principal, session, scene, audience, location and exact target. The typed intent must be immediate and have the existing `auto` resolution; conditional, quoted, blocked and roll-required proposals cannot execute movement.
- Missing, `null`, empty or observation-only `player_intents` cannot authorize a move. Target A cannot be redirected to target B, and an exterior approach cannot be upgraded to an interior arrival.
- The only compatibility path is an explicit `legacy_scene_entry` adapter. It revalidates the persisted owner-authored declaration, active source ancestry, actor/owner/principal revision, session, scene, audience, current location and target, then emits a durable `legacy_scene_entry_adapter` authorization receipt before native travel resolution.
- Valid unrelated legacy display fixtures may omit typed fields, but that omission is not converted into movement authority. Live structured output that omits required typed fields remains a contract failure.
- The three compatibility fixtures now use the current structured response shape and retain the original one-call expectations; no retry count was weakened.

Persistence, privacy and rollback:

- No database schema or migration changed. `legacy_scene_entry_adapter` is an additive city-record kind using existing persistence APIs. Example receipt fields include its stable record key, active source event, declaring character subject, session/scene, target, prior location, and principal-revision basis.
- Adapter receipts use `visibility=character` and `subject_key=<declaring character>`; they do not broaden a private declaration to party memory. T05a tests prove party/private surface separation, cross-character denial, safe summaries, legacy-row rejection and NPC isolation.
- Transactional negatives assert both the character location and proposed world entity roll back. `previewAuthoritativeMutation` uses the same authorization checks, creates no committed record, and consumes no RNG; native dice behavior is unchanged.
- Rollback is a revert of the T00.1 implementation/report commits. No schema rollback is necessary. Existing additive adapter receipts remain inert audit records unless a separately reviewed migration removes them.

Validation evidence:

- `npm ci`: PASS; 37 packages installed, 38 packages audited, 0 vulnerabilities.
- `npm run check`: PASS; JavaScript syntax/format coverage included 195 modules/scripts and 24 root Discord commands.
- Focused commands passed: `production-regression-test.mjs`, `relax-end-to-end-test.mjs`, `autonomous-world-test.mjs`, `movement-authorization-regression-test.mjs`, `memory-audience-isolation-test.mjs`, `typed-intents-regression-test.mjs`, and `implementation-phase-c-test.mjs`.
- `npm run validate`: PASS, 76/76 suites, including SEC-01 through SEC-09 and the unchanged T05a gate. The offline guard denied network access; `live_requests=0` and `billable_tokens=0`. No required security test was skipped.
- No bot was launched, no production campaign database was accessed, no deployment occurred, and no paid OpenAI request was made.

All T00.1 acceptance criteria are satisfied. T01 is the single recommended next phase and has not started. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## T01 - authenticated source envelopes and semantic acceptance

Status: complete on 2026-10-10. Implementation commit: `7941bab95a3850ee9de375d9b18bdd5a404b6e8a`; starting HEAD: `0e770f6c60de2546a561340dd16149a6b0e9df3c`. Package version remains `10.0.0`.

- Red first: `node scripts/typed-intent-lifecycle-test.mjs` failed with `ERR_MODULE_NOT_FOUND` for the not-yet-created authenticated-envelope contract.
- Added immutable `authored_turn` events captured before native routing, plus additive `authored_turn_envelope` consumed-span annotations bound to receipt references.
- Added version-2 `semantic_intent_proposal` records with exact occurrence offsets, stable IDs, ordered dependencies, framing, target grounding, desired outcome and separately attributed unverified outcome claims.
- Added `acceptIntentForAdjudication()`. It revalidates active owner ancestry, principal and scene revision, exact raw hash/span occurrence, audience, framing, consumed spans and resolved target. Accepted records use `accepted_for_adjudication` and contain no outcome receipt.
- Preserved the pre-T01 flat model contract through a versioned adapter and retained reads of historical `interpreted` movement and `legacy_scene_entry_adapter` records. No new mechanical effect was introduced.
- Production intake now preserves raw text for context while supplying the GM a separate unconsumed view and receipt-linked span ledger. Native-consumed clauses cannot execute again.
- Persistence is additive; there is no SQL schema migration. Rollback is a revert of the T01 commits. New proposal/envelope rows are inert audit inputs if reverted.
- Focused tests passed: T01 lifecycle, typed intents, T00.1 movement authorization, implementation phase C, production recovery, RELAX and T05a memory isolation.
- `npm ci` passed (37 packages, 38 audited, 0 vulnerabilities); `npm run check` passed (197 modules/scripts, 24 commands); `npm run validate` passed 77/77 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- No bot, production database, Discord registration, deployment or paid model was used.

T02 is the next phase. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## T02 - typed routing replaces general phrase authority

Status: complete on 2026-10-10. Implementation commit: `bc593e813ac884dce3fa18b5e4c5dfc0fb3ce7d1`; starting HEAD: `12fe17d`. Package version remains `10.0.0`.

- Red first: `typed-routing-authority-test.mjs` failed because no accepted-intent routing lookup existed.
- Added `currentAcceptedIntent()` and changed autonomous reveal, local-zone movement and NPC introduction to require current accepted structural type/source/actor/target records. Removed `worldRequirements()` and `interpretAuthoredText()` from that authoritative path.
- Nonstandard fragment, passive and address syntax now routes identically when its authenticated semantic proposal is accepted. Exact wording remains contextual evidence, not a verb whitelist.
- Model-authored candidates remain compatibility-only pending review inputs; they cannot execute movement, consent, spending or rolls. Historical scene-entry review remains source/target/revision gated.
- Exact owner roll/Help/Tag Team and consent adapters were deliberately retained. Polite requests, questions, reported agreement and inferred participation remain nonbinding and spend nothing.
- Updated autonomous and recovery fixtures to supply current structured search/interact/local-zone intents instead of relying on lexical fallback.
- No SQL migration or new mechanical effect. Rollback is a revert of the T02 commits; T01 proposal and acceptance rows remain readable.
- Focused T02, autonomous-world, natural-language-scope, native roll collaboration and native consent suites passed.
- `npm run check` passed (198 modules/scripts, 24 commands); `npm run validate` passed 78/78 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- T00.1 movement authorization and T05a privacy remained green; no production/live/paid access occurred.

T03 is complete: grounded rules arbitration and native pending/resolved receipts.

## T03 - rules-grounded adjudication and native receipts

Status: complete on 2026-10-10. Package version remains `10.0.0`.

- Red first: `rules-adjudication-test.mjs` initially failed because `adjudicateAcceptedIntent()` and `selectRuleBasis()` did not exist.
- Added one tested conflict algorithm: applicable saved ruling, exact campaign override, verified SRD RAW, compatible house/homebrew extension, then explicit provisional handling. Reference namespaces and bounds are native-validated; existing manually reviewed roll, consent and cost gates remain stronger.
- A current accepted intent can now produce either an idempotent no-roll outcome receipt or a real native pending roll request. State application converts every model `roll_required` disposition through that path inside the surrounding transaction; a label or narrated result alone is insufficient.
- Roll-required structured output now includes bounded Difficulty, trait, kind, risks, stakes, explanation, modifier/attack inputs and namespaced rule references. Provisional risky proposals stop for reviewed grounding rather than inventing RAW.
- Player-authored success remains an unverified claim. Replays reuse stable adjudication/request/receipt identities and do not draw dice twice; the existing native roll collaboration path remains authoritative for Daggerheart faces, Hope/Fear, resources, reactions and damage.
- Focused tests passed for T03, I Heard You native mechanics/collaboration, T00.1 movement, implementation phase C, and T01/T02 lifecycle/routing. `npm run check` passed 199 modules/scripts and 24 commands.
- `npm run validate` passed 79/79 suites after the release manifest was synchronized, with the network guard active, `live_requests=0`, and `billable_tokens=0`.
- No live bot, production database, deployment, merge or paid model was used.

T04 is next: ordered compound actions and causal dependencies.

## T04 - compound actions and causal dependencies

Status: complete on 2026-10-10. Package version remains `10.0.0`.

- Red first: `compound-action-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the action dependency resolver existed.
- Added stable ordered compound-action records derived from accepted source occurrences. Enriched structured intents may name unique earlier indices; they are converted to stable proposal dependencies, while missing, forward, duplicate and cyclic dependencies are rejected.
- Pending prerequisites suspend only their descendants. Failure, block or clarification propagates only along causal edges, and independent ready actions remain executable with separate receipts.
- State application now builds the plan before autonomous effects, omits pending/suspended scene actions and rejects effects attached to blocked nodes. Terminal transitions use compare-and-set status plus a native receipt and replay only the identical receipt.
- The existing transaction remains the publication boundary: proposed world changes and dependency records roll back together on failure. No player authority, proxy control, travel/access, consent or native mechanics gate was relaxed.
- Focused T04, autonomous-world, movement-authorization, T01 lifecycle and T03 adjudication suites passed. `npm run check` passed 201 modules/scripts and 24 commands.
- `npm run validate` passed 80/80 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- No live bot, production database, deployment, merge or paid model was used.

T04.1 is next: shared-scene multi-actor action windows and conflict orchestration.

## T04.1 - shared-scene multi-actor orchestration

Status: complete on 2026-10-10. Package version remains `10.0.0`.

- Red first: `scene-action-window-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the scene-window service existed.
- Added optional scene-scoped windows for explicit combat spotlight, cooperation, contested resources, reactions, direct PC conflict and GM-declared beats. Ordinary Discord posts do not open a window or wait for unrelated players.
- Participants require separate current accepted intents and resolved read/write identities. Native classification separates independent, sequential, cooperative, scarce-resource, opposed and attributed-testimony cases.
- Audience and location boundaries prevent private/different-scene conflicts. Direct PC conflict and Help/Tag Team/Group Action require separate persisted affirmative owner consent; missing or declined consent cannot create a roll.
- Lock/resolve uses optimistic revisions and existing native receipts. Exclusive writes allow at most one winning outcome; independent actions keep separate receipts. Closed beats reject late claims, while explicitly opened reaction opportunities are preserved without wall-clock forfeiture.
- Focused T04.1, native collaboration and consent suites passed. `npm run check` passed 203 modules/scripts and 24 commands.
- `npm run validate` passed 81/81 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- No live bot, production database, deployment, merge or paid model was used.

T05b is next: general memory identity, epistemic lifecycle and retrieval.

## T05b - memory identity, epistemics and lifecycle

Status: complete on 2026-10-10. Package version remains `10.0.0`.

- Red first: `memory-lifecycle-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the lifecycle service existed.
- Added source-backed memory identities scoped by entity kind, explicit parent/location and audience. Same-name objects in different places stay distinct; supported renames retain aliases and increment identity revision.
- Added explicit observation, testimony, inference, attempt, claimed-result and native-fact revisions. Native facts require committed receipts, so rumors, private prose and claimed custody/success cannot become objective state by retention.
- Corrections supersede prior revisions, retractions and inactive ancestry fail closed, and bounded retrieval checks active identity/source plus exact audience. Expiration is based on fictional campaign ticks; pending action references preserve needed objects.
- New audience-bound context memories also write the lifecycle representation while retaining the existing fail-closed `context_memory` compatibility rows. No unsafe legacy record was promoted.
- Focused T05b, unchanged T05a audience isolation, context conversation and autonomous-world suites passed. `npm run check` passed 205 modules/scripts and 24 commands.
- `npm run validate` passed 82/82 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- No live bot, production database, deployment, merge or paid model was used.

T06 is next: receipt-reconciled consequences and audience-safe narration.

## T06 - verified consequences and narration reconciliation

Status: complete on 2026-10-10. Package version remains `10.0.0`.

- Red first: `consequence-reconciliation-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the reconciliation boundary existed.
- Added post-commit/pre-publication reconciliation that re-reads accepted intents and binds narration to native outcome receipts, active arrival/travel receipts, actual pending roll requests, verified block/clarification states or nonconsequential acknowledgement.
- Unverified player-authored success cannot be narrated as accomplished while pending. Pending narration may state stakes/uncertainty; resolved narration reuses the stable native receipt.
- Stored projections inherit party versus private character/player boundaries. Publication continues through the transactional outbox, so retry and restart do not rerun mechanics or alter outcomes.
- Focused T06, outbox/recovery, source-backed movement and production regression suites passed. `npm run check` passed 207 modules/scripts and 24 commands.
- `npm run validate` passed 83/83 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- No live bot, production database, deployment, merge or paid model was used.

T07 is next: retire obsolete lexical authority while preserving reviewed adapters.

## T07 - legacy language authority retirement

Status: complete on 2026-10-10. Package version remains `10.0.0`.

- Red first: `legacy-authority-migration-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the executable authority inventory existed.
- Added a source-call-graph audit proving production message intake does not invoke legacy free-form roll/consent routing and autonomous effects do not call lexical player-action classifiers.
- Documented all retained uses: response/invitation hints, verbatim dialogue continuity, inert candidate/OOC filtering, referent resolution, reviewed historical scene-entry adaptation, exact current owner roll authorization and exact proposal/revision consent.
- Historical records remain readable but old prose cannot fall through into fresh movement, consent, spending, dice or outcomes. No SQL migration or destructive record rewrite was introduced.
- Focused T07, typed routing, scene entry, native collaboration and consent suites passed. `npm run check` passed 209 modules/scripts and 24 commands.
- `npm run validate` passed 84/84 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- No live bot, production database, deployment, merge or paid model was used.

T08 is next: aggregate qualification, hardening and release readiness.

## T08 - release qualification and hardening

Status: complete on 2026-10-10. Package version remains `10.0.0`.

- Red first: `typed-intent-qualification-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the aggregate qualification policy existed.
- Added deterministic release blocking for false success, mis-scoped NPC knowledge, unnecessary/missing rolls, duplicate receipts, invalid cross-player conflicts, secret leaks, unauthorized effects and skipped security suites. Semantic omission, overreach and false refusal remain separately measured.
- Registered every phase-owned suite in the default network-denied validator and retained the existing GitHub Actions `npm ci --ignore-scripts` plus `npm run validate` gate.
- Added release notes covering authority changes, additive persistence, migration/rollback, bounded limitations and safe production pull without starting the bot.
- `npm ci` passed: 37 packages installed, 38 audited, 0 vulnerabilities. `npm run check` passed 211 modules/scripts and 24 commands. Manifest integrity and `git diff --check` passed.
- `npm run validate` passed 85/85 suites, preserving all 76 baseline suites and adding nine phase-owned gates. Network was denied; `live_requests=0` and `billable_tokens=0`. Optional live-model evaluation was not run because paid/model calls were prohibited.
- Diff versus `main` was reviewed for the typed-intent branch scope. No SQL schema migration was added; production campaign data was not accessed during qualification.

All planned phases are complete. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Deferred findings

T04 through T08, including T04.1 and the general T05b lifecycle, have not started. The next phase is T04: ordered compound actions and causal dependencies.

Legacy `context_memory` rows without the new native audience/provenance marker are deliberately omitted from player-turn retrieval. A reviewed migration or deletion policy belongs to T05b; silently blessing their historical scope would recreate the leak. Broader salience, expiry, correction/supersession, aliasing, and semantic retrieval also remain T05b work.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

### Owner-requested v9.2 blocked checkpoint publication (2026-10-11)

Following the P0 stop report, the owner explicitly requested committing, pushing to origin and pulling to production. This new instruction authorizes Git publication of the current blocked draft only, superseding the earlier success-conditioned publication restriction for this checkpoint. It does not complete V9-PVP-B, waive either cross-actor regression, qualify D08, or authorize bot startup. Final source validation remains 105 suites passed / 1 failed (20/22 authorship tests); no runtime behavior is changed by this publication step. The owner's preserved planning inputs are included with the draft. Rollback is a reviewed revert of the dedicated checkpoint commit, retaining known-red regression coverage and completed native phase history. Production local changes must be preserved through a nonoverlapping fast-forward-only pull; no production database or credentials are accessed. Actual Git publication outcome and SHA are reported in the handoff.

## D07 - scoped memory, lore and referent integration

Status: complete on 2026-10-10. Starting HEAD: `1e390a7c015787b984ed43c2f44c6c8454d3a6e2`. Package version remains `10.0.0`.

- Red first: `node --import ./scripts/offline-guard.mjs scripts/d07-scoped-memory-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the scoped live-memory service existed.
- Added a bounded `scopedSceneMemory()` projection combining the T05b lifecycle with fail-closed T05a compatibility memories. It prioritizes current-location parent identity, active current source, pending causal identity and query relevance while preserving observation/testimony/inference/attempt/claimed-result/native-fact labels.
- Live `GMService.buildContext()` and the actual budgeted turn prompt now receive the audience-scoped memory and native-position packet. Party turns cannot retrieve character/player/GM-private memory; a same-user character switch does not transfer a character-private clue.
- Added location-aware alias resolution. Same-named `Night Owl`/front-door identities under different parents remain ambiguous without current location and resolve only within the current parent when location is known. Native co-located character/scene-presence records ground names such as Tyrell and Choso without granting control, access, consent or consequences.
- Non-movement typed targets may bind one audience-visible memory/native-position identity. Accepted intent remains an adjudication input only. Compound-action records retain bounded `memory_identity_refs`, and pending causal references protect an otherwise expired memory using fictional campaign ticks.
- NPC cognition was not broadened: prompt visibility is not witness evidence, and existing witnessed/told/inferred validators remain authoritative. Repeated testimony such as a cursed-parcel rumor stays testimony and cannot become canon or a native fact through retrieval.
- Persistence is additive and uses existing city records; there is no SQL migration. Rollback is a revert of the D07 commit. Existing identity/revision records remain readable and inert if the live projection is reverted.
- Focused D07, T05a, T05b, H02 and D06 suites passed. `npm run check` passed 234 modules/scripts and 24 commands.
- The first full validation reached the integrity gate after all earlier functional suites passed, then correctly failed because the newly registered validator changed the manifest. After `node scripts/sync-release.mjs 10.0.0`, `npm run validate` passed 99/99 suites with network denied, `live_requests=0`, and `billable_tokens=0`.
- No live bot, production database, deployment, merge, Discord registration or paid model was used.

D08 is next: aggregate Session 2 qualification, privacy-safe observability and release documentation. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## D08 v8 - qualification blocked by reopened D05 authority/integration defects

Status: BLOCKED; incomplete and not release-qualified. Starting HEAD and D07 commit: `9e749076021e4e99221136c0f4caaff35a464fcd`.

The D07 final source passed `npm run check` (234 modules/scripts, 24 commands), `npm run validate` (99/99 suites, network denied, zero live requests/billable tokens) and `git diff --check`, then was committed independently. The working tree was clean at the D08 start.

Qualification uncovered substantive safety and production-integration gaps in the earlier D05 completion claim. That claim is reopened; passing its existing test demonstrates opening/suspension only, not end-to-end native consent and conflict completion.

- **Reproduced authorization defect:** `node --import ./scripts/offline-guard.mjs scripts/d08-window-security-test.mjs` fails with `Missing expected exception: stale unrelated consent must not authorize a new PC conflict`. The synthetic fixture supplies an `action_consent` with retracted source ancestry, another owner, old session/scene and unrelated tea-sharing terms. `joinActionWindow()` nevertheless accepts it for a current kick because `consent()` checks only status, subject and `decision=accept`. No production data is used. The regression is intentionally red and is not a waived final release gate.
- **Unimplemented production consumer:** repository-wide source search finds `lockActionWindow()` and `resolveActionWindow()` only at their definitions. `coordinateTypedActionWindows()` joins and sets compound nodes pending, but no production consumer locks/resolves the window or resumes those coordinated nodes from matching native outcome receipts. `scene_action_pending` also lacks an authenticated consent-response consumer. A successful service-only manual test cannot establish production playability.
- **Required repair before progression:** connect separately authenticated native consent to the exact current affected owners, action/terms, principal revision, session, scene, source ancestry and scope; reject stale/foreign/retracted/unrelated consent. Wire native adjudication and terminal receipts through window locking/resolution and compound continuation, with compare-and-set revisions, restart recovery and exclusive custody conservation. Do not select a winner, grant participation, fabricate consent or manufacture receipts to close the window.
- The D00 structural audit still fails F08/F12 after D01/D05 because its searches do not recognize the intentional legacy source-key adapter and the new coordination bridge. Update it to trace those paths and retain behavioral tests; do not merely remove its assertions. Actual run: `node --import ./scripts/offline-guard.mjs scripts/v7-delta-baseline-test.mjs` failed those two structural checks; F10/F11/F13 passed.
- D08 observability draft: red-first `d08-observability-test.mjs` failed with `ERR_MODULE_NOT_FOUND`, then passed after adding a closed, private-text-free `failureTrace()` and attaching current turn attempts to generation/state error audit records. The owner subsequently requested committing, pushing and pulling this unfinished work to production. It does not resolve the D05 defects or constitute phase completion.
- No D08 full-suite result or completion is claimed. The last complete successful suite is the committed D07 99/99 baseline. A four-player end-to-end release replay is NOT qualified; distributed existing scenarios cannot substitute for the missing consent/window completion path.
- No production database, deployment, live bot, Discord registration, paid model, merge or push was used.

Resume by repairing the reopened D05 consent and completion boundary against the red D08 security fixture, adding real production-path completion/restart tests, then finishing D08 and registering all qualification suites. The owner-requested checkpoint is a work-in-progress commit, not a D08 completion commit. Production pull authorization does not authorize bot startup or campaign database changes. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Checkpoint validation after the owner's commit/push/pull request: focused `d08-observability-test.mjs` passed; `npm run check` passed (237 modules/scripts, 24 commands); `npm run validate` passed the existing 99/99 registered suites with network denied and zero live requests/billable tokens. The separate D08 security regression remains red and excluded from that registered count; these successful baseline results do not qualify D08. Release manifests were synchronized at version `10.0.0`.

## V9-00 — Narrative PvP rebaseline (2026-10-10)

Starting branch: `codex/typed-intent-refinement`; pinned SHA: `26e4d6e8f0c3335a250e81952ac9c092c38450b2` (matches the v9 audit).
This is v9.1, not a rerun of v8. D00–H05 and D01–D07 remain baseline implementations, D05's authority/completion claim is reopened, and D08 remains **BLOCKED**.
The five v9.1 inputs, existing progress/contracts/audit/release notes and offline validator were read and reconciled with the current source.
Inspected authority paths include typed acceptance, principal/envelope, state-before-coordination adjudication, action windows, native roll preparation/collaboration/finalization, private menu/sharing, command and message adapters.
The local multiplayer/SRD reference catalog and existing native-mechanics tests remain authoritative for ordinary mechanics; the explicit PvP contract overrides only PC-versus-PC outcomes.

Preexisting working-tree changes: ten root documents were relocated into `docs/`; `docs/README.md` and the five v9.1 inputs were untracked. Their contents/layout are preserved. They are included as baseline documentation inputs rather than silently restoring obsolete root copies. No preexisting runtime edits were present.

Actual initial runs:

- `npm run check`: PASS, 237 modules/scripts, 24 commands.
- `npm run validate`: FAIL at `expansion-h-test.mjs` (missing root `CODEX_INTENT_REFINEMENT_PLAN.md` in stale manifest), after earlier functional suites passed. This is a layout/inventory failure, not a changed runtime baseline.
- `node --import ./scripts/offline-guard.mjs scripts/d08-window-security-test.mjs`: FAIL, `Missing expected exception: stale unrelated consent must not authorize a new PC conflict`. Stale/foreign/retracted tea consent authorizes the current kick.
- `node --import ./scripts/offline-guard.mjs scripts/d08-observability-test.mjs`: PASS, private-text-free source/attempt correlation and recovery.
- Original `v7-delta-baseline-test.mjs`: FAIL F08/F12. Corrected checks recognize the explicit legacy identity adapter and the actual state coordination bridge, and execute the D01/D05 behavioral suites. Corrected run: PASS F08/F10/F11/F12/F13. This proves opening/suspension, NOT terminal window completion.
- `node --import ./scripts/offline-guard.mjs --test scripts/v9-baseline-regressions-test.mjs scripts/v9-pvp-contract-test.mjs`: 42 tests, 0 passed, 42 failed, none skipped. Ten known-red checks reproduce G03–G11/G14; seven exercise native services, three are explicitly labeled source-adapter checks pending stronger Discord integration fixtures. All 32 PvP scenario IDs have availability fixtures that fail because the service is absent; these are NOT 32 behavioral scenario qualifications. The owning phases must implement their scenario-specific behavioral tests before claiming acceptance.

Red ledger: G04 continuation is not scheduled; G05 missing Difficulty becomes success; G06/G14 delivery is pending during external I/O; G07 whole composite source is shared; G08 closed identity is reused; G10 no-session lookup throws. G03 Message `.ok`, G09 menu publication parity and G11 unbounded discovery were confirmed in source, with adapter-level red checks. G12/G13 remain source-confirmed, not independently reproduced in this phase. PvP is absent. Existing T05a memory isolation remains unchanged.

No runtime behavior, SQL schema, campaign state, credentials or live services changed. No production access, paid calls, bot launch or deployment occurred. No flags were changed: configured production flags were deliberately not inspected; synthetic tests configure only temporary fixtures. Rollback is a file-level revert of this phase; preserve the user's document moves.

Final V9-00 validation: `npm run check` PASS (239 modules/scripts, 24 commands); `npm run validate` PASS, **99/99** registered suites, network denied, `live_requests=0`, `billable_tokens=0`, after `node scripts/sync-release.mjs 10.0.0` reconciled the preserved document layout. `git diff --check` PASS. The 42 forward-phase red checks and separate D08 security failure remain explicitly excluded and unresolved, not waived. V9-00 is complete; its commit is the commit containing this section (full SHA recorded in the next phase). V9-01 is next only after that commit. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## V9-01 — Current action-bound native consent

Status: complete (generic participation boundary and fail-closed PvP boundary). Starting HEAD / V9-00 commit: `c4e08d78f347ffafc8c7e64cff825fdce868bc29`.

- Red first: `node --import ./scripts/offline-guard.mjs scripts/v9-action-consent-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the native contract existed. The original D08 stale tea regression was already red at V9-00.
- Added `action-consent.js`: `requestActionConsent`, `respondActionConsent`, `validateActionConsent`, and reusable current source/owner verifier `consentAction`. Immutable request digests bind exact accepted action and source hash/offset, resources, operation, consequences, required owners/principals, session/scene, audience, window revision and fictional expiry. Authenticated owner replies are separate indexed source events and private versioned receipts.
- Replaced the weak three-field consent check in `scene-action-window.js`. Revalidation happens before participant replay, so an already joined participant cannot bypass revocation. Missing/legacy/stale/foreign/changed consent cannot grant participation, dice, costs, damage or reactions.
- Generic consent explicitly rejects direct PC conflict. V9-PVP-A owns the separate immutable bilateral narrative terms/agreement validator; until then PvP remains attempt-only. There is deliberately no generic consent-to-attack/damage compatibility path. Production response/coordinator integration remains the scheduled V9-02 work, not claimed here.
- Corrected the existing T04.1 fixture that forged legacy unscoped accepted rows: it now asserts their rejection, with the new A07 native service fixture supplying the genuine positive approval coverage. No retry/resource/privacy assertion was weakened.
- Added A02/A03/A07 positives/negatives, exact replay, revocation, source/reply retraction, fictional expiry, scene change, same-owner different-character switch, principal revision, audience and digest tampering. Negative mutations are transactionally rolled back. No outcome receipt is produced by consent.
- Registered `d08-window-security-test` and `v9-action-consent-test` as mandatory gates (101 total). Both focused suites PASS. Also ran `scene-action-window-test`, `d05-live-window-test`, `i-heard-you-4-test`, `memory-audience-isolation-test`: all PASS.
- `npm run check`: PASS, 241 modules/scripts, 24 commands. `npm run validate`: PASS **101/101**, network denied, zero live requests and billable tokens. `git diff --check`: PASS. Manifests synchronized at `10.0.0`.
- Persistence: additive `action_consent_request`, `action_consent`, `action_consent_reply`; no SQL migration/destructive rewrite. Old unsafe consents are inert. Revert this phase for code rollback, but doing so reopens the known authority vulnerability; do not deploy the vulnerable baseline. No production DB, bot, `.env`, paid API or deployment accessed.

V9-01's commit is the commit containing this entry; full SHA follows in V9-PVP-A. D08 remains **BLOCKED** on lifecycle, publication and PvP qualification, despite the repaired original consent test. Next: V9-PVP-A only. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## V9-PVP-A — Bilateral narrative stakes and boundaries

Starting HEAD / V9-01 commit: `697f088fe3c6c576472718c5ec34f903ccb1e2bd`. Status: complete; phase commit is the commit containing this entry (full SHA in the following phase).

- Red-first `node --import ./scripts/offline-guard.mjs scripts/v9-pvp-agreement-test.mjs` failed with `ERR_MODULE_NOT_FOUND` for the absent narrative PvP service. Added sanitized four-owner fixture utility with actual database close/reopen support.
- New `narrative-pvp.js` services: source-grounded proposal, private full terms review/inbox, immutable counteroffers, independent native accept/decline/withdraw, use-time bilateral agreement verification and attempt-only staging. `pvp-authority.js` centralizes real-PC target classification and the non-PvP combatant boundary. Both owners' native review/decision records remain separate, scoped and source-bound.
- Closed terms include every contract policy, both best/worst/tie descriptions, all seven mandatory boundaries, modes and selected trait allowlists. Counteroffers reset both approvals, including edits to a locked but unrolled agreement. Saved dice forbid retroactive revision. Neutral refusal/withdrawal records no winner, cost, reaction or roll. Full terms are available only to current affected owners via `/vc-roll pvp`; command adapters never trust caller-supplied interaction identity.
- Production `state.js` gates PC-targeted consequential intents before ordinary native adjudication even when mislabeled/without coordination; independent nodes retain their own plans. Staged PC effects cannot use `resource_delta`. Unproven player-originated cross-PC harm is blocked; normal NPC/adversary native attack/damage services retain their original mechanics with a native identity guard against PC combatants. Reconciliation recognizes a real `pvp_attempt` receipt as attempt-only, not success.
- Focused agreement suite PASS **15/15**, including actual Discord command full long-term review, restart after partial acceptance, source retraction, locked-unrolled edit, foreign owner/role switch, changed audience/mode/Hope, neutral decline/withdrawal and actual pre-roll state-path bypass rejection. Also ran original D08 security, D01 roll lifecycle, D05 live windows and IHY2 native collaboration: PASS.
- First full check PASS (245 modules/scripts, 24 commands). First full validation FAIL at manifest integrity after additional use-time source hardening changed the service hash during the run; 74 suites passed before the integrity failure. No functional assertion was relaxed. The final exact-source full run follows after resynchronization.
- Second full run PASS 102/102. Diff review then exposed a separate post-state bypass: `resolveTypedNativeRolls` could consume an unrelated sole pending request when a model labeled the PC conflict as `roll`. A corrected native fixture reproduced the unauthorized consumption (its first draft was invalid because the legacy declaration capture intentionally requires explicit attempt framing). Added the structural real-PC gate before that adapter's native call; focused regression now verifies no dice, cost or request consumption. General unrelated-request correlation remains V9-04, not prematurely claimed. A final full 103-suite run follows this additional guard.
- Final exact-source `npm run check`: PASS (246 modules/scripts, 24 commands); `npm run validate`: PASS **103/103**, including both registered PvP-A suites, network denied, zero live requests/billable tokens. `git diff --check`: PASS. Release manifests synchronized at `10.0.0` and separately rechecked after the final documentation update. No forward-phase availability fixture is misreported as completed gameplay.
- Additive persistence only: `pvp_attempt`, `pvp_proposal`, `pvp_terms_revision`, `pvp_terms_review`, `pvp_consent`, `pvp_agreement`, neutral `pvp_resolution_receipt`, indexed terms-offer/reply events. No SQL migration or production data. Default generic legacy PC conflicts remain inert; no conversion of old attack results into narrative wins.
- Rollback: revert this phase, retaining additive audit rows. Reverting removes narrative staging; do not resume old unsafe PC attacks automatically. Optional bonus policies other than base trait deliberately require native review; no unverified feature/cost is automated. Actual rolls, window completion, durable continuation, notices/outbox integration and post-result author projections remain the ordered later phases.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes. D08 remains **BLOCKED** until all later mandatory release gates pass. No deployment, live bot, production DB, `.env`, registered commands or paid endpoints were accessed.

## V9-02 — Native window lifecycle and non-damaging PvP staging (2026-10-11)

Starting HEAD / V9-PVP-A commit: `2b8d807d11cfe15e47b8eeed2d17ac912203091f`. Status: complete; phase commit contains this entry. D08 remains **BLOCKED**.

- Red first: `node --import ./scripts/offline-guard.mjs scripts/v9-window-lifecycle-test.mjs` exited 1, missing `window-coordinator.js`. Behavioral cases cover different model labels/same native resource, preserved holds, genuine physical custody, owner denial, restart, absent receipt denial, exclusive custody, neutral recovery and bilateral staging without a defender declaration.
- Corrected invalid fixture constructions (presence source missing location; retraction missing database key). Corrected V9-00 G08's missing receipt source. Temporarily restoring the original identity then reproduced the intended `notStrictEqual` failure; restoring the fix passed G08. This supersedes the baseline's overbroad G08 reproduction claim: its earlier failure did not reach that assertion.
- Added `window-coordinator.js`: current-source/owner/position validation, explicit GM or all-native-consents entry closure, risky-request preparation after lock, exact physical evidence-receipt reconciliation, truthful winner/blocked receipts, explicit GM stale-window cancellation, native consent response consumption, private inbox/recovery and persisted lifecycle logs. No clock-based forfeit or synthetic dice/custody/winner.
- `state.js` coordinates before ordinary roll preparation. `action-dependency.js` preserves holds and metadata. Exact source/resource occurrences map retries to the original window; separate messages collide on native scene/location/resource identity regardless of model beat label. New posts after closure get a new occurrence. Private audience scopes never merge. Late entry receives an explicit clarification, not participation or an exception.
- `/vc-roll window`: private `inbox`, action-bound `request`, authenticated `respond`, explicit `close`, GM-only native `custody` and neutral `cancel`. Adapter derives GM authority and interaction identity. Bilaterally locked `/vc-roll pvp` stages a locked window with two consented participants and zero fabricated typed declarations. Actual PvP dice/outcomes remain V9-PVP-B.
- D05 now uses genuine envelope/proposal/acceptance instead of forged accepted rows, retaining its assertions. Existing consent remains revocable after lock; fresh acceptance on a changed/locked offer is forbidden. Retraction blocks adjudication; explicit GM cancellation imposes no fictional failure.
- Focused window suite PASS 5/5; G08 PASS 1/1; D05 live windows, T04.1 scene windows, V9-01 consent and original D08 security PASS. First check PASS 248 modules/scripts, 24 commands; first full validate PASS 104/104, zero live/billable requests. Final exact-source validation follows additional late-entry/legacy identity hardening.
- Additive occurrence/lifecycle/action receipts only; no SQL migration. Old windows without native identity require GM review/cancellation, not inferred winners. Rollback: revert phase, leaving additive rows inert. Roll-driven DAG continuation remains V9-03 and PvP comparison remains V9-PVP-B. No production database, credentials, bot, live commands or API used.
- Final exact-source check PASS (248 modules/scripts, 24 commands); full validate PASS **104/104**, exit 0, network denied, zero live requests/billable tokens. Two additional exact-source runs passed after late-entry/source identity and adapter membership/GM-role hardening. `git diff --check` PASS. Manifest resynchronized at 10.0.0; integrity rechecked after this documentation-only result update. Next phase: V9-PVP-B, only after this phase commit.

## V9-PVP-B — BLOCKED: post-result narrative authorship boundary (2026-10-11)

Starting HEAD / completed V9-02 commit: `1149dc908636d78177e3e38a3e850c2de0215500`. **Not complete; no phase-completion commit.** Draft source/tests are preserved in an owner-requested blocked checkpoint, not a qualified release. V9-03 through V9-08 have not begun. D08 remains **BLOCKED**.

- Red first: `node --import ./scripts/offline-guard.mjs scripts/v9-pvp-rounds-test.mjs` failed because native narrative/round exports did not exist. Initial native implementation passed 12/12 deterministic cases. Added actual Discord/retrieval/projection tests: after providing the review interface, 14/16 passed; two real failures showed sealed `feint 0` entering generic GM civic context and the Discord adapter producing zero native rolls. Both were repaired; subsequent run passed 16/16.
- Draft `pvp-rounds.js` provides separately owner-authored sealed choices, separate native roll authorization, actual saved Duality Dice, higher-total comparison (Critical never overrides), saved paired/strike receipts, bilateral continuation, first-to-three scoring, cap-safe single Hope award/redirect/flavor-only policy, no generic metacurrency/HP/Armor/Stress, neutral half-round withdrawal, private progress and explicit source-bound bilateral disclosure review. `pvp-terminal.js` projects native results to window/attempt/compound-node terminal status without consequential state changes. The production `/vc-roll pvp` adapter invokes the services; generic civic/ContextPlanner retrieval excludes sealed PvP protocol state.
- **Mandatory reproduced blocker:** new PVP30 assertion in `v9-pvp-rounds-test.mjs` calls winner-authenticated `authorPvpNarrative` with the winner's own subject ID but text `Choso apologizes for losing.` It incorrectly accepts that text. Focused `node --import ./scripts/offline-guard.mjs --test --test-name-pattern='PVP30' scripts/v9-pvp-rounds-test.mjs` exited 1, `Missing expected exception`. A later private/public disclosure signature authorizes delivery, NOT authorship of the losing PC's reaction. An attributed quote/disclaimer does not repair that authority violation.
- Exact missing boundary: the draft checks caller/subject/winner/receipt but cannot prove that arbitrary prose remains within the locked best/worst stake and contains only the author's actions. Existing material-claim validation is not a general PvP ownership/stakes checker. Merely trusting a player/model `subject_character` field, adding a keyword ban, suppressing the assertion, or rendering the text as a quote would hide rather than close the gap. No such workaround was applied.
- Safe next work needs a native, source-bound narrative scope contract: separately authored per-PC response evidence, exact output spans, allowed stake proof, rejection/quarantine of unsupported other-PC reactions and explicit treatment of ambiguous prose. If arbitrary prose cannot be natively certified, the owner must decide whether a new audited human-GM scope-review path is acceptable; it must never approve on behalf of the affected character or modify locked stakes. Until resolved, the draft author/share interfaces must not be released or used live.
- The new round suite is registered in default validation now, so this red gate blocks release rather than leaving a misleading green baseline. Full check/validation results follow. Existing V9-PVP-A suite still passed 15/15 after draft terminal integration. All fixture databases are temporary; no production database, credentials, live bot, registration, model call or deployment was used.
- Additive draft persistence only: round choices/authorizations/receipts, native rolls, strike/resource/continuation records, narrative review/disclosure/projection records and window terminal audit. No SQL migration. Preexisting PC attack rolls remain inert; optional PvP features remain paused for native review. Rollback of this checkpoint is a reviewed revert of its dedicated commit, preserving the committed V9-02 source and all unrelated user work. Do not reset the branch or discard the known-red regression.
- Actual final commands/results: `npm run check` PASS (251 modules/scripts, 24 root commands), exit 0. `npm run validate` FAIL, exit 1: **104 suites passed, 1 failed** (`v9-pvp-rounds-test`); that focused suite ran **16 tests, 15 passed, 1 failed**, no skipped/cancelled tests. Failure is the exact PVP30 authorship assertion above. Original D08 window-security test passes, but **D08 release remains BLOCKED**. Offline guard reported `network=denied`, `live_requests=0`, `billable_tokens=0`. `git diff --check` PASS. Manifest synchronized at 10.0.0 and separately integrity-checked after this documentation-only result update.
- Four-player release replay, source-grounded post-PvP author output qualification, later-phase release/rollback report and requested all-consent example output are **not completed**. Do not substitute the existing Session 2 suites or two-player native round fixtures for the V9-08 orchestration replay. Completed commits: V9-00 `c4e08d78f347ffafc8c7e64cff825fdce868bc29`; V9-01 `697f088fe3c6c576472718c5ec34f903ccb1e2bd`; V9-PVP-A `2b8d807d11cfe15e47b8eeed2d17ac912203091f`; V9-02 `1149dc908636d78177e3e38a3e850c2de0215500`. No V9-PVP-B completion commit exists.

### Owner-requested Git publication checkpoint (2026-10-11)

The owner explicitly requested committing, pushing to origin and pulling to the production checkout after the blocker report. This authorizes Git publication only; it does not resolve PVP30, qualify V9-PVP-B/D08, approve ambiguous narrative authorship, or authorize bot startup. The checkpoint retains the mandatory failing regression. The production checkout has an existing modified `bot/package-lock.json` and untracked campaign files; these must be preserved, with a fast-forward-only pull permitted only when incoming paths do not overlap. No production campaign database, WAL/SHM or `.env` is to be accessed. Publication outcomes and the checkpoint SHA are reported in the handoff, not guessed in advance.

## V9.2 resume — V9-PVP-B still BLOCKED on cross-actor output authority (2026-10-11)

Starting HEAD and fetched origin: `55b006ece3ab3cf4508c1531fee0e153cf0519eb`, branch `codex/typed-intent-refinement`. Previous completed phase remains V9-02 `1149dc908636d78177e3e38a3e850c2de0215500`. No completed phase was reimplemented. Preexisting local changes were the updated `docs/README.md` and six new v9.2/reference planning files; they are preserved. The v9.2 contract, implementation plan, source audit, augmented matrix/resume/reference, existing authority contracts/release notes and implicated source/command/test paths were read and reconciled. No unpublished runtime edits were present.

The owner's ruling is binding: independently source-verified per-player clauses; ambiguous prose stays private `needs_scope_review`; GM review is nonauthorizing. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

### Actual baseline and red-first results

- `node --import ./scripts/offline-guard.mjs --test --test-name-pattern='PVP30' scripts/v9-pvp-rounds-test.mjs`: FAIL, exact original `Choso apologizes for losing.` reached `Missing expected exception`; 0/1 passed. The sentence and rejection assertion were retained.
- `npm run check`: PASS, 251 modules/scripts and 24 root commands. First `npm run validate` failed manifest integrity at `expansion-h-test` because the owner's planning package changed the inventory. After `node scripts/sync-release.mjs 10.0.0`, the source-behavior baseline was reproduced: 104 suites passed, 1 failed (`v9-pvp-rounds-test`, 15/16 tests), exit 1; network denied, zero live requests/billable tokens.
- Added `v9-pvp-authorship-test.mjs` BEFORE changing runtime behavior. First run failed with `ERR_MODULE_NOT_FOUND` for the new authority service. This is an availability red; the original PVP30 above is the separately demonstrated behavioral defect.

### Draft implementation and verified scope

- Added `pvp-authorship.js`: closed native material templates; immutable owner/source/UTF-16 occurrence proof; exact receipt/terms/stake binding; separately invited affected-owner exact ratification; owner-private noncanonical drafts; author-invited nonauthorizing audited GM scope review; use-time validated per-clause review/disclosure/projection; draft review and owner narration inbox. No arbitrary English classification, blacklist, quote disclaimer or whole-paragraph semantic approval is trusted.
- `pvp-rounds.js` delegates narration to the clause service; duel, strikes, native RNG/receipts and Hope/window flows are reused. `/vc-roll pvp` adds draft, draft-review, narration-inbox, ratify and scope-review alongside hardened narrate/review/share. Adapter derives user, interaction and GM authority, never accepting a caller's GM flag. All replies remain private/chunked.
- Generic civic context now excludes all raw PvP protocol/projection records; only dedicated validated projection APIs may expose content. ContextPlanner's sealed-protocol exclusion is retained. Added candidate guard calls to narrative integrity and the turn outbox; GM does not regenerate an entire turn to override a `NARRATIVE_PVP` denial. **Those guard integrations are incomplete, as the P0 below demonstrates.**
- Positive round fixtures now submit explicit source-bound templates instead of assuming first-person prose proves ownership. The original negative sentence/assertion is unchanged. The corrected own-clause positive uses a fresh interaction ID after rejection: immutable source replay cannot repurpose the rejected submission's ID.
- Intermediate fixture mistakes (missing source FK for synthetic legacy/forged records) were corrected without changing authority assertions. Focused round suite PASS 16/16; original filtered PVP30 PASS 1/1; PVP30a–t suite initially PASS 20/20. Agreement PASS 15/15; window lifecycle PASS 5/5; original D08 window-security command exit 0. An intermediate full `npm run validate` PASS 106/106, with check PASS 253 modules/scripts, 24 commands. This predates the additional adversarial gate and is NOT the final release determination.

### Mandatory P0 discovered in final adapter audit — STOP

`assertPvpOutput()` filters proposals by **triggering** `scope.actorUserId`. Therefore, an AI output during Billy's otherwise unrelated party turn can still state `Choso apologizes for losing.` without any Choso source/ratification. Billy need not participate in the Jaxon/Choso duel. Two independent actual-path regressions now demonstrate this:

1. `validateNarrativeClaims()` accepts the unsupported cross-PC reaction (empty model claims do not save the boundary).
2. `queueTurnPublications()` with a real synthetic `beginTurnAttempt` enqueues the unsupported party prose instead of refusing it.

`node --import ./scripts/offline-guard.mjs --test --test-name-pattern='cross-actor' scripts/v9-pvp-authorship-test.mjs`: FAIL, 0 passed / 2 failed, both `Missing expected exception`. Full focused authorship suite: **20 passed / 2 failed**, none skipped/cancelled. The suite remains registered in default validation. Do not silently restrict the threat to the initiating two owners.

The candidate guard is also overbroad within an initiating owner's scene: it rejects all unconstrained prose, rather than quarantining only unsupported material while preserving independent authorized actions. Simply dropping the actor filter and blocking every player's entire scene is not a safe/playable substitute. The required next repair is output-surface/content authority independent of triggering principal, with source-verified clause rendering and recoverable private quarantine of unsupported spans; preserve native terminal results and independently authorized sibling actions. Existing generic narrative claims cannot certify arbitrary PvP meaning. Do not use a keyword detector, suppress either test, quote the raw paragraph, or fabricate a native receipt.

Implementation stopped at this P0 gate as instructed. V9-PVP-B remains incomplete; V9-03 through V9-08 are NOT started; D08 remains BLOCKED. No phase completion commit, push or production pull is authorized by the success-conditioned final publication request while this gate is red. HEAD remains the WIP checkpoint; new code/tests/docs remain uncommitted for review.

### Persistence, privacy, rollback and next validation

Draft persistence is additive city/world-event records only: narrative clauses/drafts, source authorization/ratification, reviews and v2 bundles/projections. No SQL schema migration, no rewrite of existing native resolution receipts or negotiated stakes. Existing raw narratives/projections must remain inert; no automatic migration to verified content. GM review never supplies PC consent. Tests use temporary fixture SQLite only; no production DB, WAL/SHM, `.env`, Discord, registered commands, paid model endpoint, bot startup or deployment was accessed.

Rollback is a reviewed selective reversal of this uncommitted runtime draft, preserving the owner's planning files, all four completed phase commits and the checkpoint; do not hard-reset or discard the known-red tests. Completed native rolls/costs/scores are not undone by a narrative draft. Further required work includes safe cross-actor output projection, independently authorized own-success expressiveness beyond the generic stake template, final positive ratified-reaction publication/adapters and complete four-player release qualification; these are not claimed as passed merely from a unit helper.

Latest check PASS (253 modules/scripts, 24 commands). A validation run started before the second cross-actor fixture was added failed at manifest integrity because that file changed during the run; it is not reported as a functional gate result. Final exact-tree check/validation will be run after this documentation and manifest synchronization; actual results will be appended below. `git diff --check` has passed on the draft to this point.

Actual post-documentation exact-source result: `node scripts/sync-release.mjs 10.0.0` synchronized 471 non-runtime files; `npm run check` PASS, exit 0 (253 modules/scripts, 24 root commands); `npm run validate` FAIL, exit 1, **105 suites passed / 1 suite failed**. The only failed suite is mandatory `v9-pvp-authorship-test` (**20 tests passed / 2 failed**, neither skipped nor cancelled), on the two cross-actor PVP30q assertions. `v9-pvp-rounds-test` PASS 16/16, including the original exact PVP30 negative; agreement PASS 15/15, window PASS 5/5 and original D08 consent PASS. The validator reported network denied, zero live requests and zero billable tokens. `git diff --check` PASS. The same full commands are repeated after synchronizing this result-only documentation change so the handed-off manifest/tree is also tested. No V9-PVP-B completion, commit, push or deployment is claimed; the next work remains the documented P0 output-surface ownership gate.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## V9.3.1 resume — uncommitted output/observation draft, mandatory compatibility gate BLOCKED (2026-10-11)

Starting local HEAD: `bf6b592d2ea1e44c9c666770b533e0800176c102`, branch `codex/typed-intent-refinement`. Fetched origin resolves to the same SHA; this does not establish equivalence of the dirty working tree. The initial dirty tree contained only the owner's modified `docs/README.md` and seven accompanying untracked reference/v9.3.1 planning documents. They were inspected and preserved, not rewritten. No production tree, campaign SQLite/WAL/SHM, credentials, live bot, command registration, paid model endpoint, merge, push or deployment was used. All runtime tests use offline doubles and temporary fixture databases. Completed V9-00/01/PVP-A/02 were not reimplemented. **There is no V9-PVP-B completion commit.**

### Red-first evidence and baseline reconciliation

- Executed the requested guarded `--test --test-name-pattern='cross-actor' scripts/v9-pvp-authorship-test.mjs` before runtime edits: both original assertions FAILED (`Missing expected exception`, 0/2 pass). Retained their exact `Choso apologizes for losing.` input, empty `narrative_claims`, real begin-turn record and zero-publication expectation. Original PVP30 was already green and its negative text/assertions remain unchanged.
- Baseline `npm run check` PASS (253 modules/scripts, 24 commands). The first actual full validation stopped at `expansion-h-test` manifest integrity because the newly supplied planning files were not inventoried. The historical 105-pass/1-fail log is not represented as that initial run's result.
- Added actual-commit Billy movement salvage and no-description/source-backed observation cases before their implementations. The no-description case initially published fabricated scar/apology text. After repair, it commits and enqueues a truthful unknown instead. An initial movement fixture needed real autonomous-location provenance; corrected the fixture, not the movement authority assertions.
- Additional red-first probes demonstrated queued output sent after source retraction, unsupported model facts persisted alongside safe prose, selected-field owner description submission leaked its unselected raw text, and cached voice could replay after source revocation. Repairs now pass the corresponding focused assertions. No exception suppression, fake mechanical receipts or prose/name-scan approval was added.
- New mandatory **OBS21 remains red**: an actual `commitGmTurn` inquiry about the co-located native Station Attendant, with an established GM NPC profile, returns only the generic protected-output fallback. The test expects the NPC and established blue coat to remain answerable. This is a playability regression, not a passing security fix.

### Draft source and authority interfaces (NOT release-qualified)

- New `pvp-output.js`: native session/scene/audience lookup independent of triggering owner; process-local prepared-output capability; hash/version-bound persisted output parts; separately validated v2 owner-clause projection, real arrival projection, read-side observation answers and neutral fallback. Raw generated surface paragraphs and proposed memories/handouts/cognition are held in GM-private noncanonical `pvp_output_quarantine`, not copied into shared memory. This is deliberately not arbitrary English semantic certification.
- `pvp-authorship.js` reexports the common output guard; existing per-player clause, exact affected-owner ratification, disclosure and native-round rules remain intact. Direct raw `validateNarrativeClaims` and `queueTurnPublications` now reject both original Billy bypasses. Model `prepared/approved/verified` flags confer no capability.
- `state.js` invokes preparation inside the authoritative transaction, before candidate persistence and again after native movement; preview rolls back the same records. Native typed intents, dice/cost/window flows are reused, not replaced. Parallel unsupported free-text fact/canon/reference/thread events in protected scope still reject/rollback; safe output is not permission to commit an unsupported fact. This conservative event guard still needs ordinary GM/environment compatibility qualification.
- New `character-observation.js`: exact current owner/source/revision verification; closed selected visible appearance fields; separate bounded public disclosure events; native witnessed speech/arrival receipts; deterministic known/partial/remembered/unknown answers. It never reads arbitrary private sheets/hooks as appearance. A question supplies neither another PC's reaction nor a defining fact.
- `/vc-character describe json` is an owner-private command adapter, not a model-provided authority flag. Submission source stays private; only explicit selected fields receive opted party disclosure. Currently supported fields are bounded hair/coat/disguise values. No unsolicited owner invitation/DM was added (the contract makes invitations optional); there is no question waiting state.
- `publication-outbox.js` binds queued payloads to saved native parts and rechecks sources/owner/terms/audience before transport; authority failures are held `uncertain`. Direct party/private director output uses the same queued-delivery service in the modified `index.js` and manual command adapter. This is partial sink integration, not a claim that every journal/aftermath path has qualified.
- `voice.js` accepts protected narration only from persisted delivered party output. The production caller passes the delivered payload and turn ID. Cached buffers retain native proof and revalidate before repeat/play; synthetic TTS tests used no paid synthesis.
- `city-core.js`/`context-planner.js` exclude sealed PvP protocol/output/quarantine and raw appearance/perception records from generic retrieval. The private owner description submission is excluded too; opted selected-field disclosure is distinct. Existing T05a isolation tests passed in full validation.
- Test/default-validation changes: expanded `v9-pvp-authorship-test.mjs` and new registered `v9-observation-compatibility-test.mjs`; no existing mandatory suite was disabled. Release inventory remains 10.0.0, synchronized by the prescribed script.

### Actual validation on the runtime draft

Commands run from `bot`, under `--import ./scripts/offline-guard.mjs` for focused tests:

| Command / gate | Actual result |
|---|---|
| `node --import ./scripts/offline-guard.mjs --test --test-name-pattern='cross-actor' scripts/v9-pvp-authorship-test.mjs` | PASS, 4/4 selected tests, including both unchanged originals; exit 0 |
| `node --import ./scripts/offline-guard.mjs scripts/v9-pvp-authorship-test.mjs` | FAIL, 31/32; OBS21 is the only failing test; exit 1 |
| `node --import ./scripts/offline-guard.mjs scripts/v9-observation-compatibility-test.mjs` | PASS, 14/14; exit 0 |
| Combined author/observation `--test --test-reporter=tap` run | 45/46 passed, 1 failed, no skipped/cancelled tests; exit 1 |
| Filtered original PVP30 round regression | PASS, 1/1; exit 0 |
| `node --import ./scripts/offline-guard.mjs scripts/v9-pvp-rounds-test.mjs` | PASS, 16/16; exit 0 |
| `node --import ./scripts/offline-guard.mjs scripts/v9-pvp-agreement-test.mjs` | PASS, 15/15; exit 0 |
| `node --import ./scripts/offline-guard.mjs scripts/v9-window-lifecycle-test.mjs` | PASS, 5/5; exit 0 |
| `node --import ./scripts/offline-guard.mjs scripts/d08-window-security-test.mjs` | PASS, exit 0; this is NOT D08 release qualification |
| `node scripts/sync-release.mjs 10.0.0` | PASS, 481 non-runtime files |
| `npm run check` | PASS, 256 modules/scripts, 24 root commands; exit 0 |
| `npm run validate` | FAIL, 105 suites passed / 1 failed; exit 1; authorship 31/32, OBS21 failure |

The full runner is fail-fast: its final registered observation suite was **not reached** after authorship failed. Its separate 14/14 focused pass is not substituted for default integration. Full report: `network=denied`, `live_requests=0`, `billable_tokens=0`. All preceding suites, including movement authorization, memory audience isolation, consent, native PvP modes and original D08 security, passed. Intermediate full runs affected by manifest changes during execution were discarded as release evidence. After this result-only documentation update, repeat manifest/check/validation/diff-check without editing the tree during execution; the handoff must state that repeat's actual outcome, not assume success. Nothing is to be committed as phase completion while OBS21 or any mandatory authority gate is red.

### Exact blocker and next repair — resume V9-PVP-B here, not V9-03

`observationQueries()` currently recognizes only native PC targets, and `prepareAuthorizedTurnOutput()` knows only PC observation/arrival/approved PvP-clause parts. In the same protected scene, the native NPC appearance query falls through to the generic neutral part and swallows ordinary NPC narration. Broadly trusting the NPC profile's arbitrary `public_identity` paragraph, model `observe` label, empty claims or name matches would reopen cross-character meaning laundering; merely suppressing OBS21 would hide the regression. Implement a bounded source-grounded NPC/environment projection through actual GM authority/native scene receipts, preserving normal NPC/scenery behavior without approving embedded PC agency. Reproduce OBS21 unchanged before that production-path repair. This technical acceptance blocker prevents a V9-PVP-B completion commit now.

Additional requirements are **not yet qualified**, even though their narrower draft tests passed:

- Complete OBS08 witnessed *departure* (current perception capture covers arrival), OBS12 visible native condition (no owner-minted injury), OBS15 active/unresolved PvP inquiry, OBS17 ordinary external/NPC effects, OBS21 NPC worldbuilding and OBS22 actual four-PC adapter sequence. Not all OBS01–22 have named complete behavioral coverage yet. The heard-speech test checks public speech/retraction; add the separate private speech exclusion fixture rather than relying on its broad title.
- Finish PVP30u–am mapping with actual production adapters, especially two-owner bounded ratified positive publication, both simultaneous protected contests, ordinary non-PvP damage preservation, and withheld reaction/withdrawal sibling continuity. Existing unit ratification tests do not replace the required combined publication positive.
- A separately audience-approved signed-stake/native-result part is still needed when no owner prose exists; don't expose private stakes or pretend the generic neutral fallback renders the original outcome. Current Billy-movement fixture proves the saved native PvP resolution record is byte-for-byte unchanged, not that all result publication requirements are finished.
- Audit remaining model-generated journal, encounter-aftermath, downtime/no-active-session and handout/cognition/state-string sinks; direct service fixtures are not complete actual `index.js` adapter coverage. Raw text must not become trusted simply because a scene/window changes. Check recipient/current ownership and terms on every saved replay.
- The modified private director publication key uses scene label/fictional minute and can collide for distinct transitions in the same minute. Replace it with a real stable native causal turn/cycle identity and add a production-adapter regression, without rerunning effects.
- Protected scope is conservative and still needs privacy/audience/no-global-freeze qualification for private-only proposals and unrelated recipients in the same scene. Do not weaken the unchanged direct cross-actor gates while repairing compatibility.

**STOP status:** V9-PVP-B remains incomplete/BLOCKED; V9-03–08 have not started; D08 release remains BLOCKED. No success-conditioned commit, push, production pull or deployment was performed. The changed runtime and tests are left as an uncommitted, known-red draft for review/resume; the original WIP HEAD and all owner files remain preserved.

### Persistence, saved-result proof and rollback

Additive city/world-event records only (`pvp_output_part`, `pvp_output_publication`, `pvp_output_quarantine`, `character_visible_fact`, selected `character_description_disclosure`, `character_perception_receipt`). No SQL schema migration or production database change. Native PvP dice/results/stakes, strikes, Hope, HP/Armor/Stress are not rewritten to repair prose. Source retraction invalidates delivery and cached voice; replay does not resample mechanics. Legacy unverified narrative/projection rows remain inert, never auto-upgraded to canonical material. Raw quarantine is GM-private and excluded from normal retrieval; a later review cannot consent for a PC.

Rollback means reviewed selective reversal of this uncommitted draft or a future dedicated completion commit, preserving owner documents, all completed phase commits and saved campaign native results. Do not hard reset, delete campaign data, remint old roll outcomes or convert historical raw text into verified claims. No production migration is authorized by this development session.

Post-documentation exact-tree repeat actually executed: manifest sync PASS (481 non-runtime files, 10.0.0); `npm run check` PASS (256 modules/scripts, 24 commands, exit 0); `npm run validate` FAIL (105 suites passed / 1 failed, exit 1), again solely OBS21 in authorship (31/32). Guard again reported network denied, zero live requests and zero billable tokens. `git diff --check` PASS, exit 0; no staged changes. No runtime behavior was changed between the two full runs. This result-only sentence is followed by manifest synchronization and the same check/validate/diff gates once more, with no edits during execution; no completion commit is permitted on this red tree.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

### Owner-authorized Git publication of the blocked V9.3.1 checkpoint (2026-10-11)

After the explicit failure/stop report, the owner requested: “Commit, Push to Origin, Pull to Production.” This authorizes publishing the current **known-red WIP checkpoint**, not a V9-PVP-B completion commit or a passing release. OBS21 and the remaining requirements above remain unresolved; V9-03–08 remain unstarted and D08 remains BLOCKED. The last actual full offline validation remains 105 suites passed / 1 failed. Only this authorization note and release-inventory synchronization are added for publication; no runtime behavior is changed to hide that result.

Development and origin were reconciled at `bf6b592d2ea1e44c9c666770b533e0800176c102` on `codex/typed-intent-refinement`. Production Git metadata shows the same branch/HEAD with an existing modified `bot/package-lock.json` and untracked backup/campaign-content paths. Preserve all of them. Production may only fast-forward to the explicitly published checkpoint after checking incoming path overlap; do not stash/reset/clean, read production SQLite/WAL/SHM or `.env`, install dependencies, register Discord commands, launch/restart the bot, or run campaign migrations. Actual publication SHA and push/pull outcomes are to be verified and reported in the handoff; this note does not presume they succeeded.

## V9.3.2 development resume — V9-PVP-B still INCOMPLETE (2026-10-11)

Starting local SHA: `355269d28e6e6aa370c0e5ab0b159adef5db3e45`, branch `codex/typed-intent-refinement`. No remote equivalence is assumed. Initial owner changes were `docs/README.md` and the untracked v9.3.2 planning/reference package; all are preserved. No production, credentials, live bot, real Discord command registration, or paid endpoint was accessed. The owner subsequently authorized implementation and success-conditioned branch commit/push, **not** production access. No phase completion or push has occurred in this resume.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

### Actual baseline and red-first evidence in this resume

- Before runtime edits: OBS21 alone failed (0/1, exit 1); authorship failed 31/32, solely OBS21. Cross-actor filter passed 4/4, observation 14/14, rounds 16/16, agreement 15/15, windows 5/5; the standalone D08 window security script exited 0. These are not D08 release qualification.
- Baseline `npm run check`: PASS, 256 modules/scripts, 24 root commands. Actual baseline `npm run validate`: FAIL, 74 suites passed / 1 failed, at expansion-h manifest inventory because newly supplied owner planning files were not yet inventoried. This differs from the historical 105/1 runtime baseline; neither count is substituted for the other.
- New NPC observation regression suite first failed meaningfully 1/6 after correcting a synthetic Discord fixture username. After native selected-field GM evidence was added it passed 6/6. OBS21 setup now establishes a real GM-selected blue coat; its expected NPC answer remains unchanged, and arbitrary embedded PC apology is not copied.
- New Hope/Fear suite first passed 1/10 and failed 9/10 against old policy. Revised zero-Hope/cosmetic-rejection expectations first failed 0/4 against existing behavior. Subsequent 41-test agreement/round/Fear run passed 39/41; the remaining two failures were test winner assumptions on equal totals, corrected to preserve native tie comparison.
- First expanded native-effect run passed 13/15; raw SQLite mutation column parsing was repaired, then 15/15 passed. These later effect tests were added after the initial service draft and are **not** claimed as red-first implementation evidence.
- Intermediate exact-tree sync/check/full validation passed: inventory 494 non-runtime files, check 261 modules/scripts and 24 root commands, validate **109 registered suites**, exit 0, network denied, zero live requests/billable tokens. Later source/test additions mean this is **not final-tree qualification**.
- A later generic-outcome adversarial run passed 2/3 and failed resource isolation: handing saved PvP Critical dice to ordinary `applyRollOutcome` granted Hope and cleared Stress. The guard repair passed 3/3, including unchanged ordinary Hope/Critical/Fear. A later NPC/interruption run first passed 1/2 (NPC route absent), then 2/2 after adding a real encounter-bound NPC preparation route. Preparation is not a qualified adversary attack/damage path.

### Draft interfaces and remaining gates

Additive draft records: selected GM `world_visible_fact`; `pvp_fear_context`, `pvp_fear_trigger`, `pvp_exchange_gate`, authenticated `pvp_fear_move_decision`, native mutation-backed `pvp_fear_effect_receipt`, scoped `action_interrupt_receipt`. No SQL schema migration. V2 offers require fixed no-Hope/immediate-Fear policies; native dice/totals/winners/strikes are unchanged. Genuine Fear survives withdrawal and keeps terminal/dependent windows held. Human GM commands select bounded existing countdown/access/NPC preparation routes; no campaign Fear or future spotlight is minted. Existing positive PvP Hope fixture expectations were superseded, not ordinary Daggerheart mechanics.

Still unqualified: full 137 legacy + 54 FEARHOPE matrix mapping; legacy-v1 history/re-offer behavior; complete OBS08/12/15/17/22 adapters; all journal/aftermath/no-session sinks; native NPC proof/privacy/TOCTOU; invalid-source/scene/owner and interrupted-action audited recovery; native attack compatibility; all Fear publication/outbox/voice/restart cases. No broad narrative exception, fabricated receipt or waived suite is permitted. V9-03–08 have not started, and D08 remains BLOCKED. This is a partial development ledger, **not** a completion report.

Rollback remains selective reviewed reversal of development changes only, preserving owner files and all completed commits. Historical v1 dice/resources must not be rewritten or clawed back. Source-invalid effects may not execute; real obligations remain due for audited recovery. Before any completion commit, run all required focused tests, sync 10.0.0 manifests, check, full offline validate and diff-check on the same final tree, then record actual results.

### Further actual red/green repairs (same incomplete phase)

- Two exchange-corruption tests first failed 0/2: a forged gate membership set or substituted pair reference could authorize a Fear selection. Exact reconstruction from both saved round receipts, native pair totals/winner and participant-ordered trigger/effect membership now rejects both; the focused suite then passed 22/22.
- Legacy fresh-consent regression first failed while the unrolled bilateral re-offer positive already passed (1/2). `respondPvp(accept)` now validates v2 before saving a signature; both tests passed. Original historical terms are preserved; explicit rolled-v1 audit/migration qualification remains outstanding.
- Native NPC privacy and goal-CAS tests both reproduced missing rejections. After correcting a temporary-fixture method name, the native NPC ancestry test also reproduced a missing rejection. Party publication now requires actual public NPC state/presence, a selection locks encounter/binding/goal/presence revision, and the saved effect revalidates the completed native NPC action plus its mutation receipt. Hope/Fear suite passed 27/27 at that point.
- New private-speech/departure/false-witness checks first passed 1/3: departure memory was absent, and a remote observer could be named as a prior description witness. Native movement now captures departure witnesses **before** changing position in the same transaction; perception only recalls departure from the visible origin, not a remote destination. Description observer lists require actual visibility. Observation suite then passed 17/17.
- Added GM-private `needs_review` audit and `fear-reconcile` adapter. Recovery supersedes a stale decision and reselects current context only after current roll/source/owner proof; it cannot waive a trigger, restore revoked consent/source, or rerun a saved effect. Initial recovery API test was red because the export did not exist (not claimed as a behavior-level status failure); subsequent source-retraction and target-CAS/restart recovery passed with the 28-test suite.
- A resolved-label-without-effect continuation test first failed 0/1. Resolved trigger labels now require actual effect proof before terminal/continuation checks; the 29-test suite passed.
- Revoked Fear projection initially aborted Billy's independently authorized movement (0/1). Output preparation now records a GM-private **publication-only** hold for that stale saved part, without relaxing direct raw/output delivery checks or undoing/executing native effects. The actual commit-path movement regression passed 1/1.
- Journal and session-end adapters reproduced unratified `Choso apologizes for losing.` publication and persistence as a party recap fact (2 behavior failures after fixture corrections). Journal boundaries now reject unsupported archive prose even after session closure. Protected session recap synthesis is held in GM-private `pvp_output_quarantine`, **not** a shared recap/fact/journal; the command explicitly reports the hold and still closes a session whose native Fear obligations are settled. This conservative draft does not yet render a complete source-certified archived recap, and that compatibility gap remains open. Both targeted regressions passed 2/2.

All changes remain uncommitted development work. The next focused/full run must verify the latest tree; the earlier 109-suite result does not cover these later edits. These targeted passes do not claim all 191 matrix cases or B/D08 completion.

### Current mandatory P0 STOP — generic PC resource effects bypass native outcome authority

Further same-tree validation actually executed before the following new regressions: sync 10.0.0 PASS (494 non-runtime files); `npm run check` PASS (261 modules/scripts, 24 root commands); combined seven focused suites PASS **123/123**, zero skipped/cancelled; standalone `d08-window-security-test.mjs` exit 0; `npm run validate` PASS **109 registered suites**, exit 0, network denied / zero live requests / zero billable tokens. These passes **precede** the newly exposed P0 and are not release qualification.

New default-registered behavior tests in `v9-pvp-authorship-test.mjs`, both actually red (0/2, exit 1):

1. `FH40 P0 actual manual World Director cannot invent participant injury through generic events`: actual `/vc-director run` adapter, genuine resolved native bilateral contest, synthetic provider `resource_delta hp +1`, empty claims, no incoming attack/reaction/damage receipt. Choso's marked HP changed **0 → 1**, despite sanitized output.
2. `FH40 P0 private self-target GM turn cannot invent injury behind safe output`: actual `captureWorldInput` + begin-turn receipt + `commitGmTurn`, current Choso owner declares **`I wait.`**, private scope, synthetic HP event without native damage receipt. Marked HP again changed **0 → 1**. No new player intent authorizes the injury.

Root cause: `state.js:applyGMEvents(resource_delta)` guards current-turn `pvp_action_ids` and harmful cross-character **player** scopes, but a World Director has no actor and a private GM turn targets its own acting PC. Neither branch establishes a native incoming attack, reaction, damage, cost or independent consequence source. `prepareAuthorizedTurnOutput` correctly quarantines prose; that cannot certify the parallel resource event. `assertProtectedModelEvents` currently covers free-text fact/reference events, not this native-effect eligibility boundary. This is an existing consequential-authority gap exposed by new tests, not a reason to accept the model's harm.

**Do not proceed to V9-03 or create a completion commit/push.** The owner's hard-stop rule requires stopping on this unresolved P0. Next implementation must bind PC resource effects to exact separately authorized native outcomes, including real incoming NPC attack/reaction/target legality under ordinary Daggerheart rules (FH41). Current `simulation.validateAction` expressly forbids PC-target autonomous attacks; the existing NPC preparation route is not an incoming PC damage receipt. Do not fabricate such a receipt or merely globally throw/strip every resource event: that would mask the gap and break legitimate non-PvP consequences or independent actions. Add the missing native causal adapter/eligibility contract and positive compatibility coverage, then close both red tests without changing their no-authorized-receipt preconditions.

Other outstanding acceptance work remains as listed above: complete 191-case behavioral mapping, full archived recap/source projection, visible-condition and four-PC observation coverage, legacy rolled-v1 read-only audit, all Fear delivery/voice/proxy/recovery and completed-third-party progress cases. The native-effect stop is the immediate resume point. Matrix test names were corrected to avoid claiming FH39 evidence-backed reveal or FH37 completed-progress coverage from generic gate/pending-action tests.

Status: **V9-PVP-B BLOCKED, V9-03–08 NOT STARTED, D08 BLOCKED.** Starting/remaining HEAD is `355269d28e6e6aa370c0e5ab0b159adef5db3e45`; changes remain an uncommitted known-red development draft. Owner files are retained. No staging, development commit, push, production access, deployment, live Discord or paid call was performed. Final check/full validation/diff-check must now include both new P0 tests; record the actual fail-fast suite counts in the handoff, not the earlier 109-pass result.

Actual final runtime-tree rerun (including both P0 regressions): manifest sync PASS (494 files, 10.0.0); `npm run check` PASS (261 modules/scripts, 24 commands); `npm run validate` **FAIL, exit 1, 105 suites passed / 1 failed**. The failed authorship suite passed **34/36**, failing only the two new FH40 P0 injury tests; no skipped/cancelled tests. The fail-fast runner did not reach observation/NPC/Hope-Fear suites after that failure; their preceding focused passes are recorded separately, not substituted for default integration. Report: network denied, zero live requests and zero billable tokens. `git diff --check` PASS, exit 0; no staged diff; HEAD/branch unchanged. This results-only annotation is followed by manifest synchronization and final syntax/diff checks; it does not claim a passing phase or green release.

### Owner-authorized Git publication of the blocked V9.3.2 checkpoint (2026-10-11)

Following the P0 stop, the owner explicitly requested: "Commit, push to origin, and pull to production." This authorizes a **known-red WIP checkpoint**, not phase completion or release qualification. V9-PVP-B and D08 remain BLOCKED; V9-03 through V9-08 remain unstarted. The last actual full validation is **105 suites passed / 1 failed**, including the two mandatory FH40 failures above. No runtime behavior or tests are changed for this publication.

Development and production Git metadata both start at `355269d28e6e6aa370c0e5ab0b159adef5db3e45` on `codex/typed-intent-refinement`; development matches its fetched origin. Production has an existing local `bot/package-lock.json` modification, which must be preserved, along with any untracked campaign/backup files. The related owner-supplied v9.3.2 planning package and README edits are included unchanged in the checkpoint. Only this note and release-inventory synchronization are added now.

Production authorization is Git-only fast-forward after checking incoming path overlap. Do not read credentials or campaign SQLite/WAL/SHM, install dependencies, run migrations, register commands, or launch/restart the bot. Actual commit SHA and push/pull outcomes must be verified in the handoff; this note does not presume success. Resume implementation at the native PC resource-effect authority blocker, not at V9-03.
