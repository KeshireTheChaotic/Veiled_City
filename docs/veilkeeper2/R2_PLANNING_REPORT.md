# R2 — separate GM-private planning

Completed private-planning boundary/composition slice; full R2 remains open.

`bot/src/v2/private-planner.js` implements a separate native-authorized planning call for secret-dependent or independent developments. Authorization binds the current source, principal, campaign, scene, source revision and an explicit record set. Every ancestor must be authorized; the full metadata closure is checked before any body read. Body hashes/revisions and native authorization are checked before and after inference, and again when inspecting the resulting opaque private plan. Pending canon proposals are not accepted planning record kinds.

The private instructions preserve testimony/belief/hook distinctions, NPC ignorance and absolute player ownership. Output remains a private proposal with no execution or publication authority. Its handle is issued by a separate authority and cannot enter the audience model gateway or publication queue. The ordinary audience path never receives private text or private plan output. Prompt instructions do not constitute semantic proof of actual provider behavior.

`rehearsal.js` optionally composes native `plan`/`inspectPlan` methods separately from `respond`. Ordinary conversation does not call the private planner; the model-facing interface still has exactly four generic capabilities. There is no implicit private-to-public transition or approval of suggested observations.

## Evidence

Six fresh private-planner tests plus nine rehearsal tests: **15/15 passed**, zero failures/skips, 75.477 ms. The rehearsal module changed, so its existing checks were rerun. No unrelated passing suites were rerun. Tests cover mismatched scope, unauthorized ancestry, cycles, excluded pending proposals, body substitution, authority changes during inference, later correction, canceled calls, private/public handle separation and separate provider packets. The integration test proves that private planning is optional and its result is not copied into a subsequent audience call.

Execution/output: R2_PLANNING_TEST_EVIDENCE.json and R2_PLANNING_TEST_OUTPUT.txt. Exact source/test/document hashes: R2_PLANNING_HASHES.json. Native policy/readers and providers are injected test doubles, not live Discord or actual model evaluations.

## Holds and rollback

Native authorization policy and record adapters for imported hooks, clocks, reviewed canon and relationships remain to be composed. Autonomous world-event triggers without player messages, actor cognition, conversion of private proposals into validated observations/actions, scoped disclosure and durable plan/replay handling remain open. No private planning result is currently executed or published. R3–R8 and existing R0/R1 holds remain outstanding.

This change does not modify legacy runtime source/schema/content or production state. The user's documentation cleanup was committed independently as `3ca9db9d`; the relocated governing specifications are under `docs/`, and removed historical documentation remains available at the pinned Git revision. That cleanup is not evidence of runtime retirement or migration acceptance. No deployment or push occurred. Rollback is to leave the opt-in v2 modules unused.

**Next exact work:** imported relationship handling and native adapters for private planning/recall; then remaining provider integration and R3 deterministic rules.
