# R6 — atomic GM-private narrative persistence

Completed persistence slice, 2026-11-14. R6 and all major phases remain incomplete.

`character-package-service.js` now passes an optional source-bound narrative into `private-hook-store.js`. A dedicated narrative history table retains immutable revisions, campaign/character/source/importer provenance, attachment hash and filename. Hooks, relationships, pending canon suggestions, narrative and import receipt share one transaction and final authority check. Exact source replay is inert; changed narrative on the same source conflicts. Omitting narrative leaves the existing narrative unchanged. Narrative never grants canon, publication, PC control, knowledge or gameplay authority and is not exposed as a planning record.

Existing nonempty private-hook databases missing the new table are rejected before DDL or writes. There is no automatic schema adoption. Migration remains held; operators must preserve the original store and review a separate migration. No legacy database or production file was modified.

Validation complete: five fresh narrative checks passed (350.1159ms); 29 affected checks in five existing files passed (139.4636ms), zero failures/skips. These exercise actual SQLite transactions, disk reopen, immutable history, pending canon, final-role revocation rollback, replay conflicts, byte/metadata bounds and exact unchanged file hash/schema after rejected old-schema open. The affected files cover both changed modules' direct consumers; no native module imports them yet. SDK/inference/live Discord were not used. Do not rerun these unchanged checks.

Modified implementation: `bot/src/v2/private-hook-store.js`, `bot/src/v2/character-package-service.js`. New coverage: `bot/tests/veilkeeper2/r6-private-narrative-import.test.mjs`. Exact source/test hashes and outcomes are in R6_PRIVATE_NARRATIVE_HASHES.json.

Rollback: keep the dedicated database and immutable histories; prior code must not open the expanded schema. Revert code only with the matching prior snapshot/schema after review. A rejected old-schema open changes no bytes. No automatic downgrade, deletion, external delivery, major-phase merge/push or legacy retirement occurred.

Next exact R6 work: connect the authenticated attachment reader and private store to the existing command with durable interaction receipts; explicitly initialize/adopt the store at startup, preserve it in snapshots/restores and include imported native data in GM exports. Sheet imports, automatic campaign snapshot/log parity and full command parity remain deferred.
