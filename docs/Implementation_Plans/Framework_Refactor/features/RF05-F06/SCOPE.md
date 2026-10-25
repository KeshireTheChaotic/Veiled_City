# RF05-F06 — Phase qualification checkpoint

## Objective

Freeze an offline evidence checkpoint for the RF05 changes completed so far. Re-run only a previously passing fresh test whose associated production module changed afterward; preserve prior passing evidence for tests whose production code did not change. Run the current phase-aware architecture checker and changed-code syntax checks. Do not claim RF05 complete while any RF05-owned obligations or RF04 prerequisites remain.

## Test selection

The fresh F02 test imports `GMService` from `gm.js`, and `gm.js` changed in the qualified F04 selector extraction after the F02 test's prior pass; therefore re-run that file once as the changed-code union member. F01, F03, F04 and F05 test sources and their directly exercised production modules have not changed since their recorded passing runs; preserve those results without rerunning them.

## Verification

Run `rf05-f02-model-transport.test.mjs` once in one blocking targeted invocation, changed JavaScript syntax checks, and the RF05 phase-aware architecture checker. No inherited tests, broad validation, provider, database, network, CI, or polling.

## Exit evidence

Record exact included and carried-forward tests, terminal result, syntax, architecture gate, current transition counts/holds, source hashes, rollback, costs, and release status. This checkpoint can remain PARTIAL / UNQUALIFIED; it cannot waive RF04 or RF05 debt.
