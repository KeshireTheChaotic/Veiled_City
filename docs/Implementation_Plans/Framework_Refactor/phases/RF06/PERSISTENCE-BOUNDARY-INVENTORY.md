# RF06 persistence boundary inventory

**Inspection base:** `a9069bbbd75ff0fa0648c50e90812ff59a240ee3` on `codex/clean-ai-gm-2026-10`.
**Scope:** Read-only inspection of `bot/src/db.js`; no runtime edits or database access.
**Inspected source SHA-256:** `65D2179E79AAFB927A87EF62D5569DD01A2D5D813CABEE2CB70526322D5E96AA`.

## Current shape

`db.js` is a 2,436-line `VeiledDB` class with 13 imports and 411 direct `this.db.prepare(...)` / `this.db.exec(...)` call sites. The ownership manifest assigns the file to Persistence but explicitly requires decomposition before relocation (`DECOMPOSE_BEFORE_MOVE`). Its single class currently combines connection setup, schema migration, SQL access, domain projections, multi-step domain operations, and durable transaction receipts.

The high-confidence seams visible in the current source are:

- **Connection and schema lifecycle:** constructor, `migrateSchema`, `close`, and `schemaVersion`.
- **Transaction boundary:** synchronous `transaction(fn)` uses `BEGIN IMMEDIATE` at depth one and savepoints for nested work. It rejects asynchronous callbacks and preserves the original error if rollback cleanup fails. This behavior must remain one tested repository contract.
- **Persistence operations:** scoped reads and writes across campaign, character, session, world, narrative, action, and rules records. These SQL operations can be grouped by repository/table ownership only after the domain caller contract is mapped.
- **Domain orchestration embedded in persistence:** `advanceSimulationClock` calls `processCityDue`; `setCityCalendar` and character/session operations perform validation or multi-step transitions; snapshot/restore and recovery methods coordinate several tables.
- **Durable turn and publication receipts:** turn-attempt commitment, no-send proof, publication claim/acknowledgment, and interrupted-send recovery share database transactions and must not be split in a way that weakens their atomicity or exactly-once evidence.

## Decomposition rule

First identify the existing callers and exact transaction contract for each method group. Move orchestration into its owning domain or application workflow while leaving SQL, schema knowledge, and the synchronous transaction primitive behind Persistence interfaces. Keep a multi-domain operation in a thin application workflow unless it is a specifically registered two-framework integration. Do not relocate the class or copy business rules into repositories as a substitute for decomposition.

## Evidence and hold

The file SHA-256 and exact method/caller map must be captured in the active RF06-F01 feature ledger before any source edit. This inspection does not satisfy RF06 entry prerequisites: RF04 and RF05 remain incomplete, and the domain interfaces and native commit contract are not yet qualified. Runtime migration remains held. The hold is sequencing evidence, not a demonstrated production failure.

No tests, syntax checks, production database, service, provider, or network were used for this read-only inventory. Rollback is limited to removing this document and its RF06 ledger reference.
