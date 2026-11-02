# R2 — weighted recall policy

Completed policy/composition slice; full R2 acceptance remains open.

## Delivered

`bot/src/v2/recall-planner.js` implements native weighted selection using canonical causal IDs, fictional-time decay, reversible default-prompt retirement, focused recall and active native pins. It ports the existing mention/interaction/return/lead/GM-reuse weights (3/5/6/7/1), six-tick decay cadence and retirement condition from pinned `bot/src/frameworks/narrative/narrative-salience.js`. Repeated projections of one canonical cause contribute once. Conflicting copies fail closed. Model scores and model-authored echoes are not accepted as native recall evidence.

`context-authority.js` adds metadata-only entitlement checks, including recursive source closure and optional actor-known intersection. Candidates and causal/pin sources must pass before ranking; ranking fetches no bodies. `rehearsal.js` optionally composes these native readers before the existing scoped packet and single provider invocation. Optional recall failure leaves the current utterance available. The planner returns only references, with no mutation, identity creation, truth promotion, canon update or mechanical authority.

No-interest candidates remain eligible, matching the previous absence-of-profile behavior. Low-weight older records leave default recall but remain stored and available through entitled focused retrieval. The planner derives retirement at the current fictional tick rather than writing a retirement flag into knowledge records.

## Actual checks

Fresh `r2-recall.test.mjs` and a new rehearsal integration case cover duplicate causes, rejected model echoes, conflicting causal identities, exact decay boundaries, private-source/ancestor exclusion, actor ignorance, revoked sources, retirement, pins, returns and unchanged testimony/history. Existing context and rehearsal suites were rerun because their production modules changed. **20/20 passed**, zero failures/skips, 76.0334 ms. Kernel, knowledge persistence and source-authority suites were unchanged and not rerun.

Evidence: R2_RECALL_TEST_OUTPUT.txt, R2_RECALL_TEST_EVIDENCE.json and R2_RECALL_HASHES.json. Native readers and provider are test doubles; this proves policy and offline composition, not authentication of real world events, full legacy ranking equivalence, live model quality or Discord operation.

## Holds and migration

Production adapters must map authenticated owner interaction/GM-origin evidence to canonical native causes and preserve immutable cause IDs/ticks across projections. They must derive pins from active commitments, occupancy, encounters, canon and other legacy obligations. The injected-reader contract is not itself proof those adapters exist. Query/name/alias relevance, durable profile reconciliation, legacy migration, identity collision and persistence gates, private imports/exports, provider tool invocation and live qualification remain pending. Weighted selection cannot serve as authority for any of those.

No production data or configuration changed, no legacy path was removed, and no deployment/push occurred. The original salience implementation remains intact. Rollback is to leave the opt-in runtime unused. Full migration/restore evidence remains R7/R8 work.

**Next exact work:** R2 private-hook/player-export boundaries and native recall evidence adapters; continue remaining R1/R2 integration, then R3 deterministic rules. R0 dynamic-contract holds and all R3–R8 gates remain open.
