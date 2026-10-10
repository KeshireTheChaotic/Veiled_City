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
