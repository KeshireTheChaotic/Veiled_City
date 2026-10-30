# AF02 — Native general-operation layer

**IN PROGRESS — resource/modifier/duration foundation verified, Agent C.** This is not completion of AF02 or AF03–AF07.

Delivered: small closed resource, numeric-modifier and duration plans in `bot/src/frameworks/daggerheart/feature-operation-plans.js`. Existing `feature-costs.js` now uses bounded resource planning and supplies a shared synchronous Fear/NPC Stress writer. The existing `feature-window-rules.js` reaction-cost path calls that writer after its source/actor/choice checks and existing immutable replay receipt gate. Receipt formats, existing state writers and owner-controlled payments remain unchanged. The helper creates no new mutable truth store, model execution route or authority grant.

Modified files: the three production modules above; added fresh `bot/tests/ai-gm-2026-10/af02-operations.test.mjs` and this phase's evidence/report.

## Verification — complete for this foundation

Run `AF02-C-operations-1`: four changed-file `node --check` calls — **exit 0**. From `bot/`, `node --test tests/ai-gm-2026-10/af02-operations.test.mjs` — **5 passed, 0 failed, 0 skipped, exit 0**. Tests cover strict shape/balance handling, optional token caps, closed count/threshold/band/conditional modifiers, committed-event duration matching, additive native costs, rejection of PC/token payment substitution, and real in-memory SQLite rollback of Fear when the second native write fails. Exact baseline and input hashes are in EVIDENCE.json. Completed unchanged tests must not be rerun.

## Owner source ruling — resolved

The owner selected **once per scene total** for `adversary:aster-vale-forecast-engine:expected-value`. HR15 v1 pins one gain per Engine actor/scene, independent of which PC gains advantage, with cap 3. Recording the ruling does not enable the currently review-only occurrence.

The shared native token service now supports source-derived gain/spend/clear plans, opaque preparations, immutable occurrence receipts, balance projections, historical inspection and replay across service restart. The host must supply native source/actor/trigger authorization, including historical source proof; a model supplies no amount, cap or occurrence scope. It uses existing city-record/world-event persistence and native synchronous transactions.

`advantage-opportunity-source.js` captures immutable, GM-private native roll-preparation evidence. `feature-opportunity-rules.js` consumes that evidence behind exact autonomous-mode, current GM-owned actor, location/template and source/erratum checks. The existing roll-request factory/composition is wired to that observer. Source-only or held proposals do not block valid PC requests; no player dice, resources, knowledge or NPC cognition are changed. Production Expected Value remains review-only until AF04 activation qualification.

Final run `AF02-C-token-opportunities-3`: eight changed-file syntax checks — **exit 0**. Fresh `af02-tokens.test.mjs` plus `af02-opportunities.test.mjs` — **7 passed, 0 failed, 0 skipped, exit 0**. Earlier token-only checks passed before reader/provenance hardening and source integration; the tested production code then changed, justifying the final combined run. Exact hashes are in TOKENS-EVIDENCE.json. Tests use real disposable SQLite, actual native roll preparation, two PCs/two Engines, per-scene deduplication, cap saturation, manual/control gates, restart replay, stale preparation, source drift, spending underflow, private provenance and rollback. The integration test explicitly qualifies cloned source descriptors in memory; production review-only status is unchanged.

## Remaining scope / next exact phase

Continue **AF02**: finish source-qualified trigger/token/choice operation integration, current/saved receipt and replay verification, movement/scene and multi-owner workflow coverage. Then **AF03**, migrate the 20 existing occurrences with real receipt parity while preserving the nine exceptional proof gates. The arithmetic foundation and SQLite test alone do not qualify that migration, all-feature execution, runtime AI behavior, provider/Discord delivery or release. No old handlers/readers were removed.

## Shared owner-response operations — verified

The existing group reaction planner now selects Stress/Hope/condition consequences from immutable source-owned descriptors. Flashbang and Command the Blood retain their exact native owner-choice gates; silence remains pending. Their execution, recipient, consent, mutation and historical receipt providers remain in place. No generic route gains permission to execute these proof-sensitive features.

Run `AF02-C-owner-reactions-1`: three changed-file syntax checks passed. `node --test tests/ai-gm-2026-10/af02-owner-reaction-operations.test.mjs` — **4 passed, 0 failed, 0 skipped, exit 0**. Independent branches, required owner choices, Critical behavior, immutable option lists and exact source proposal restrictions passed. See OWNER-REACTIONS-EVIDENCE.json. Full multiplayer delivery/restart scenario qualification remains AF07 work.
