# RF04-F05 C05 — Knowledge evidence and World event integration

Base `ccae77566632405b492eb83a0fbbdd08ecfa1eb8` with preserved working changes, including qualified C23. Reopened by the migration/local-hold audit. Existing Knowledge evidence rules are already extracted; their runtime composition still imports the legacy World calendar.

Move the single lazy evidence engine from the old reader into Knowledge. Define the exact Knowledge-owned event/audit consumer, bind World public event/audit functions in `knowledge--world`, and call an inert initializer from real startup. Keep old evidence exports as aliases of the actual Knowledge functions; pure evidence/historical reads remain usable without startup binding. Native fact establishment requires the fixed World event source and remains one synchronous rollback-capable transaction.

Do not change evidence classes, source recursion, visibility, GM authority, canon promotion, errors, native receipts, schema or game behavior. Do not require a new audience or creative restriction. World remains event issuer; Knowledge remains evidence authority.

Author new `rf04-f05-c05.test.mjs` using actual disposable SQLite and new fixtures for shared old/public identity, pure pre-composition reads, fail-closed uncomposed writes, actual establishment receipt/source/private scope, rollback/retry and reopen/retraction. Include the now-affected P04 fresh test file in one frozen batch because its actual evidence source changes; this also closes its split final-file coverage gap. No other previously passing tests run. Check changed JS/MJS and phase-aware architecture, retire only exact absent source records, log real results/hash/cost/rollback. No production DB/provider/services/CI/push/merge/deploy/restart. RELEASE NOT AUTHORIZED.
