# C104 ledger

## 2026-10-28 C104 Application opening modules read Session opening functions through public Session slots

Application modules opening-cohort-runner.js, opening-entry.js, session-opening-recovery.js and session-opening-runner.js stop importing private Session root modules (assembly-context, opening-cohort-state, session-opening-attendance, opening-entry-context, session-opening, assembly-state). Session's public API gains six fixed provider slots (contracts/opening-sources.js); each Session root module binds its slot at load with its originals, and every binding module is reached statically from index.js. assemblySourceError is imported directly from the Session public API. The new test imports only the changed contract and Session public API with feature-local fake originals.

Tests: one frozen batch of 63 files: 256 tests, 256 pass, 0 fail. Architecture: 10 exact records retired. RF04 exit 0, 0 active violations, 800 modules; RF05 214 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
