# RF04-F05 C161 — Persistence reads Knowledge relationship, presentation and archive readers only through startup composition

Base 582f700c. The database facade no longer imports or standalone-binds the Knowledge relationship state, presentation evidence and historical archive roots; the existing persistence--knowledge adapter binds them at startup. Three Knowledge root shims retired.

Rollback: Revert only the C161 commit: restore bot/src/historical-archive.js, bot/src/presentation-evidence.js and bot/src/relationship-state.js, the db.js imports and standalone persistence port bindings, repointed tests, and the transitions from C161-RETIRED.json.
