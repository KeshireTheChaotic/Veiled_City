# RF04-F07 ledger — changed-code qualification and phase gate

**Status:** QUALIFICATION AUDIT COMPLETE; RF04 PHASE EXIT NOT MET.  
**Base HEAD:** `c20d0b0d86d067a54de0d4bf8a252ed146c4c021`.  
**Scope:** See `SCOPE.md`.

The acceptance matrix consolidates only specific fresh evidence already recorded in RF04 feature ledgers. The latest RF04 architecture ratchet is the F06 run: 566 source modules, zero unowned, 2722 imports, 2442 accepted legacy occurrences, zero active violations and zero transition errors. No test runner was invoked for F07 because it changes no production code, and previously passing tests were left untouched.

RF04 does **not** meet phase exit. F01–F04 retain source-adoption obligations; F05's Narrative–World pair and bootstrap composition remain a local hold; F06 qualifies only its exact offline private-source cases. This is not a critical blocker: continue any independent RF05 work supported by existing domain ports, while preserving the RF04 hold. See `F07-ACCEPTANCE_MATRIX.md` and `F07-RUN.json`.

Test executions: none for F07. Cost: provider 0, tokens 0, USD $0; Codex usage UNMEASURED. Rollback: remove the F07 scope, ledger, matrix and run record. RELEASE NOT AUTHORIZED.

## C01 — Owner-authorized deadline reconciliation

The owner selected Option B. The exact feature scope DEADLINE-REASSIGNMENT-SCOPE.md identified 12 current expired RF04 edges whose targets are Publication-owned and assigned to RF06 in the migration crosswalk. Their IDs, source edges, owner values, maximum occurrences and frozen baseline remain unchanged; remove_in_feature and expires_after now consistently point to RF06-F03/RF06. The original full records and per-edge technical dependency/removal criteria are in ../../phases/RF04/DEADLINE-REASSIGNMENT.json.

The three phase-aware ratchets were run once after the manifest update: RF04 passed (572 modules, zero unowned, 2732 imports, zero active/error); RF05 failed (955 active groups/errors); RF06 failed (1997 active groups/errors) and its runtime entry gate remains held. This metadata-only slice ran no tests and changed no production code. The RF04 phase still does not exit because source-adoption obligations remain; the 357 Daggerheart-owned RF04 records remain assigned individually to RF04 because the recorded exact dependencies do not establish a later owner for them. Cost: provider 0, tokens 0, USD 0; Codex usage UNMEASURED. Rollback only the 12 original deadline pairs from the machine-readable audit. RELEASE NOT AUTHORIZED.

## C02 — Stale fresh-test reconciliation (PARTIAL)

Reconciliation found 11 P08/P10 fresh test files failing 36/46 at HEAD `70dacfc4` without any new change: 32 cases never perform the bootstrap Session/World event composition required since RF04-F05-C02 (production calls it in `index.js`); P10-F07 imported root `opening-diagnostics.js`, removed by an RF02 move; three P08-F04 cases used fixtures and wording superseded by P08 commit `08e965bb` (status rows always carry `data`; "transport acknowledged"; Director pause check). Test-only repairs: composition initialization in `p10-fixture.mjs` and two P08 files, the Operations public import, and current-contract fixtures. No production code changed.

One batch: **45/47 pass**, exit 1 (`phases/RF04/rf04-f07-c02-test.log`). Open: `p08-f04-correction` "independent Node worker processes claim one session cohort" (EPERM removing its temp directory) and `p10-f08` "two isolated SQLite workers share one durable initial planner claim". Both are multi-process Windows cases; they ran alongside a background full-suite run, so contention is not ruled out. Rerun them alone before qualifying. RELEASE NOT AUTHORIZED.