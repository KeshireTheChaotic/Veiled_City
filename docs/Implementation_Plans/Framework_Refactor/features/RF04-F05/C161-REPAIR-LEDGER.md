# C161-REPAIR ledger

## RF04-F05 — Standalone database binding restoration

Restored the three C161-removed Knowledge reader shims and the database module's original standalone imports and bindings. Restored only the six associated transition records. The repair closes the demonstrated failure where opening a saved campaign with relationships reached an unbound relationship-state port during `VeiledDB` schema migration.

Modified production files: `bot/src/db.js`, `bot/src/relationship-state.js`, `bot/src/presentation-evidence.js`, `bot/src/historical-archive.js`, and `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json`. The new local-only test is `bot/tests/ai-gm-2026-10/rf04-f05-c161-standalone-repair.test.mjs`.

Fresh test ran once, then had one test-only repair and a targeted rerun. First result: 1 test, 0 passed, 1 failed because the test expected `ally` for trust score 4; production rules return `trusted`. Corrected only the expectation. Final result: 1/1 passed, exit 0, 0 skipped/cancelled; all five `node --check` commands exited 0. The test seeded a disposable SQLite database using the production schema, added one saved relationship, opened it twice with standalone `VeiledDB` construction and no application composition, verified the relationship evidence and directional trust projection survived reopen, and called the standalone administrative archive projection. Exact attempts, timestamps, commands and hashes are in `C161-REPAIR-RUN.json`.

Known limits: this qualifies only the saved-relationship reopen path, its startup migration, and a bounded standalone archive projection read. Full Persistence, all saved database shapes and release behavior remain unqualified. RF04 passed its coordinated ratchet after the metadata freeze (842 modules, zero active violation groups and zero transition errors). RF05 remains open with 65 active legacy-location groups/errors. Release is not authorized.

Next exact phase: C164 assembly workflow dependency review, subject to its separate ownership decision; no further C161 work is pending.
