# R2 — durable private-hook ingestion

Completed storage/command-boundary slice; full R2 and import parity remain open.

## Delivered

`bot/src/v2/private-hook-store.js` adds a dedicated SQLite store with atomic import receipts, immutable hook revisions/current pointers and separate pending canon suggestions. Native campaign/source identity prevents altered command replay; identical replay returns the persisted receipt without adding revisions or reopening resolved hooks. Distinct authenticated commands may update a hook while preserving prior content and provenance. Key normalization collisions abort the whole transaction rather than overwrite distinct entries. Canon suggestions are never accepted canon and are excluded from ordinary seed reads. The default seed read also excludes resolved/discarded hooks. Native review/export APIs can read history and pending suggestions.

`character-package-service.js` adds native-only `importHooks`, using the existing owner/GM boundary and requiring human-GM authority. Authentication, character and revision are revalidated inside the storage transaction before and after writes. Failure rolls back hooks, proposals and receipt together. The store is not a generic AI capability. Prepared metadata cannot confer permission.

`r2-private-hooks.test.mjs` adds six fresh cases with disposable real SQLite storage and synthetic authenticated command readers. The seven existing package tests were rerun because their service changed.

## Actual evidence

Initial combined run: **12/13 passed**. The failed replay assertion exposed `character_name: undefined` in the first in-memory receipt while JSON persistence omitted it on replay. Normalizing the prepared record through JSON before hashing/storage fixed the production mismatch. The changed store suite was rerun: **6/6 passed**, zero failures/skips, 97.1338 ms. The seven unchanged package cases from the initial run remain passing and were not rerun. Current unique coverage: **13/13**.

Initial/final execution and output are preserved in R2_HOOKS_INITIAL_* and R2_HOOKS_TEST_*; exact hashes are in R2_HOOKS_HASHES.json. Tests verify reopen persistence, exact replay, changed-source conflict, version history, no replay-driven resurrection, atomic rollback on invalid final suggestions or final authority revocation, default canon exclusion, campaign/character isolation and key collision handling. They do not prove real Discord authentication or full campaign transactional consistency.

## Holds and recovery

The dedicated database is additive, rejects unrelated existing tables and is not the production campaign database. Native authentication and character revision readers are still injected, not production adapters. Relationship targets are retained in immutable payloads but **not applied** (`relationshipsApplied: 0`); native directional relationship validation remains required. Pending canon proposals require independent human review and integration with the canonical ledger. Private-planner source grants, complete export repository composition, backup/restore, schema migration, attachment handling and R7 delivery/command receipts remain open. Native low-level store reads must not be exposed directly to players or model tools.

No production database, legacy code/schema/content or command routing changed; no migration, retirement, deployment or push occurred. Rollback is to leave the opt-in modules unused. Do not retire the existing importer until relationships, canon review and migration are qualified.

**Next exact work:** complete native imported-hook relationship/canon-review adapters and private planning grants, then remaining R1/R2 integration and R3 deterministic rules. R0 dynamic-contract holds and R3–R8 gates remain open.
