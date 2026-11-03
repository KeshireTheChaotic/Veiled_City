# R3 — action-store first-read lock handling (fix complete)

The integrated Blaze qualification run exposed a real startup race in the existing independent-process test: `openActionStore` queried `sqlite_master` before installing its busy timeout. One concurrent worker failed on that first query with SQLite error 5. Move the existing 5000 ms timeout before the first schema read; retain schema isolation and transaction semantics. No application retry, polling or repeated effect is introduced.

Modified runtime file: `rules/action-store.js`. This fix is committed separately from Blaze functionality. Initial integrated candidate: 79/80 passed, one startup failure, 6429.7472 ms; parent `blaze-approval-test.log`. Corrected integrated candidate: 80/80 passed, zero failures/skips, 6523.8898 ms; parent `blaze-approval-fixed-test.log`. The complete command and candidate scope are recorded in R3_BLAZE_APPROVAL_REPORT.md. These are integrated working-tree results, not standalone whole-phase qualification of this small commit.

Runtime observed in this run is Node v26.13.0; earlier Node v24.19.0 reports remain historical. No causal claim that the version change alone produced the race is made. Separate-process contention exercised one schedule; exhaustive/crash qualification remains open. No unchanged passed suite reran without the constructor code change.

No schema/data migration or production deployment. Rollback leaves the opt-in store unused; do not undo lock handling when enabling concurrent startup. R3 remains partial; continue Blaze terminal-action and remaining parity work. No completed-major-phase publication occurred.
