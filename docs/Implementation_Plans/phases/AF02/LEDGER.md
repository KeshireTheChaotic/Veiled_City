# AF02 — Native general-operation layer

**IN PROGRESS — resource/modifier/duration foundation verified, Agent C.** This is not completion of AF02 or AF03–AF07.

Delivered: small closed resource, numeric-modifier and duration plans in `bot/src/frameworks/daggerheart/feature-operation-plans.js`. Existing `feature-costs.js` now uses bounded resource planning and supplies a shared synchronous Fear/NPC Stress writer. The existing `feature-window-rules.js` reaction-cost path calls that writer after its source/actor/choice checks and existing immutable replay receipt gate. Receipt formats, existing state writers and owner-controlled payments remain unchanged. The helper creates no new mutable truth store, model execution route or authority grant.

Modified files: the three production modules above; added fresh `bot/tests/ai-gm-2026-10/af02-operations.test.mjs` and this phase's evidence/report.

## Verification — complete for this foundation

Run `AF02-C-operations-1`: four changed-file `node --check` calls — **exit 0**. From `bot/`, `node --test tests/ai-gm-2026-10/af02-operations.test.mjs` — **5 passed, 0 failed, 0 skipped, exit 0**. Tests cover strict shape/balance handling, optional token caps, closed count/threshold/band/conditional modifiers, committed-event duration matching, additive native costs, rejection of PC/token payment substitution, and real in-memory SQLite rollback of Fear when the second native write fails. Exact baseline and input hashes are in EVIDENCE.json. Completed unchanged tests must not be rerun.

## Owner source ruling — resolved

The owner selected **once per scene total** for `adversary:aster-vale-forecast-engine:expected-value`. HR15 v1 pins one gain per Engine actor/scene, independent of which PC gains advantage, with cap 3. AF04 now qualifies the bounded token-gain adapter separately; spending and die replacement remain held.

The shared native token service now supports source-derived gain/spend/clear plans, opaque preparations, immutable occurrence receipts, balance projections, historical inspection and replay across service restart. The host must supply native source/actor/trigger authorization, including historical source proof; a model supplies no amount, cap or occurrence scope. It uses existing city-record/world-event persistence and native synchronous transactions.

`advantage-opportunity-source.js` captures immutable, GM-private native roll-preparation evidence. `feature-opportunity-rules.js` consumes that evidence behind exact autonomous-mode, current GM-owned actor, location/template and source/erratum checks. The existing roll-request factory/composition is wired to that observer. Source-only or held proposals do not block valid PC requests; no player dice, resources, knowledge or NPC cognition are changed.

Final run `AF02-C-token-opportunities-3`: eight changed-file syntax checks — **exit 0**. Fresh `af02-tokens.test.mjs` plus `af02-opportunities.test.mjs` — **7 passed, 0 failed, 0 skipped, exit 0**. Earlier token-only checks passed before reader/provenance hardening and source integration; the tested production code then changed, justifying the final combined run. Exact hashes are in TOKENS-EVIDENCE.json. Tests use real disposable SQLite, actual native roll preparation, two PCs/two Engines, per-scene deduplication, cap saturation, manual/control gates, restart replay, stale preparation, source drift, spending underflow, private provenance and rollback. The integration test explicitly qualifies cloned source descriptors in memory; production review-only status is unchanged.

## Remaining scope / next exact phase

Continue **AF02**: finish source-qualified trigger/token/choice operation integration, current/saved receipt and replay verification, movement/scene and multi-owner workflow coverage. Then **AF03**, migrate the 20 existing occurrences with real receipt parity while preserving the nine exceptional proof gates. The arithmetic foundation and SQLite test alone do not qualify that migration, all-feature execution, runtime AI behavior, provider/Discord delivery or release. No old handlers/readers were removed.

## Shared owner-response operations — verified

The existing group reaction planner now selects Stress/Hope/condition consequences from immutable source-owned descriptors. Flashbang and Command the Blood retain their exact native owner-choice gates; silence remains pending. Their execution, recipient, consent, mutation and historical receipt providers remain in place. No generic route gains permission to execute these proof-sensitive features.

Run `AF02-C-owner-reactions-1`: three changed-file syntax checks passed. `node --test tests/ai-gm-2026-10/af02-owner-reaction-operations.test.mjs` — **4 passed, 0 failed, 0 skipped, exit 0**. Independent branches, required owner choices, Critical behavior, immutable option lists and exact source proposal restrictions passed. See OWNER-REACTIONS-EVIDENCE.json. Full multiplayer delivery/restart scenario qualification remains AF07 work.

## Native Help opportunity capture — complete for this delta

Paid Help now triggers the same source-bound observer after the saved native collaboration receipt. It verifies the helper's actual die, request, owner, Hope payment, authorization and resource delta. A later request amendment preserves the historical opportunity rather than minting another scene gain. Modified production files: `advantage-opportunity-source.js`, `roll-collaboration-rules.js`, root `roll-collaboration.js` and exported observer in `roll-requests.js`.

After these production changes, the combined AF02 token/opportunity run passed **9 tests**. AF04 activation then changed the source/errata input, justifying the later combined AF01/AF02/AF04 run: **18 passed, 0 failed, 0 skipped, exit 0**, with six syntax checks passed. These supersede the earlier seven-test snapshot for this delta. HR17's later source addition was separately qualified by four AF04 source/capability tests. See AF04/EVIDENCE.json. No unchanged suite was rerun.

## Atomic GM costs and mixed-area cohort plans — complete for this delta

`gm-capability-rules.js` now uses the shared resource writer for ordinary GM costs, enclosing payment, the existing immutable receipt and spotlight recording in one native transaction. The separate pre-roll Fear authority remains in place. Fresh native cost-path tests using disposable SQLite prove rollback after Stress/spotlight failures and once-only replay: **2 passed, 0 failed, exit 0**. Its changed-file syntax check passed.

`group-target-rules.js` supplies read-only native area/cohort planning and the exact-target selector now used by `group-feature-execution-rules.js`. Area planning uses an established local zone, source/scene/range checks and paged occupancy; it includes caster/allies and holds uncertain, hidden or player-controlled NPC occupants rather than omitting them. It neither establishes suppression nor rolls or applies conditions. Fresh area/cohort tests: **4 passed, 0 failed, exit 0**; two changed-file syntax checks passed. Null Foam is still held until this plan is connected to independently authorized reactions and condition consumers. Exact files and hashes are in COST-AREA-EVIDENCE.json.

## Generic mixed-reaction coordinator — complete for this delta

`mixed-reaction-rules.js` now separates authenticated PC reaction invitations from native GM-controlled NPC d20 reactions, and `prepareMixedReactionCohort` places both routes behind an injected synchronous transaction. NPC modifiers must match one exact Experience in the source statblock or default to 0. The coordinator validates persisted PC invitation ancestry and recomputes NPC roll arithmetic on replay; target/cohort drift, incomplete writes and invalid receipts hold. It creates no PC dice or owner choice and introduces no new authoritative state writer; host callbacks must use the existing native writers and transaction.

Modified files: `bot/src/frameworks/daggerheart/mixed-reaction-rules.js`, `bot/src/native-group-features.js`; added `bot/tests/ai-gm-2026-10/af02-mixed-reaction-path.test.mjs`. Changed-file syntax checks passed. Fresh SQLite-backed test run: **4 passed, 0 failed, 0 skipped, exit 0**. Cases cover mixed routing, source-backed NPC Experience/zero modifier, forged arithmetic rejection, replay without rerolls/reinvites, incomplete write rollback, and duplicate cohort rejection. The generic coordinator is exported but is not yet wired into the production group-feature executor or a feature-specific condition workflow; therefore Null Foam remains held and AF02 remains in progress. This is operation-level evidence, not end-to-end execution evidence.
