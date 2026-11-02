# RF05-F04 C147 — Application-owned expansion status

## Objective

Separate the GM expansion-status projection from the legacy source root. The
status joins Narrative's immutable expansion definitions with read-only
campaign configuration, schema and record counts. Application owns that
cross-framework assembly; Narrative continues to own the feature definitions,
and Persistence remains behind the existing database facade.

## Frozen behavior

Preserve the existing `expansionStatus(db, guild)` arguments, ordered reads,
feature rows, strict boolean flag handling, record counts, bounds, recovery
guidance, authority text, result keys and exceptions. Keep the existing
story-command GM/admin guard and ephemeral response. Do not add a query,
receipt, write, migration, provider call, or Discord request.

## Frozen paths

- `bot/src/expansion-contracts.js` (remove after migrating its only caller)
- `bot/src/application/workflows/expansion-status.js` (new)
- `bot/src/story-commands.js` (change only the import path)
- `bot/tests/ai-gm-2026-10/rf05-f04-c80.test.mjs` (new)
- `docs/Implementation_Plans/Framework_Refactor/features/RF05-F04/C147-SCOPE.md`
- `C147-LEDGER.md`, `C147-HASHES.json`, and `C147-RETIRED.json`
- `C147-TEST.log`, `C147-SYNTAX.log`, and `C147-ARCHITECTURE.log`
- The exact ownership/crosswalk row and two exact live transition records,
  updated under the coordinated shared registry/index window.

## Qualification

The fresh test must verify exact feature projection, strict flags, read order,
database read allowlist, error identity, GM guard ordering, private response,
and final import ownership. Run that test and changed-file syntax checks once
after the source is frozen. Run the RF05 ratchet once and record the current
peer-work snapshot without attributing unrelated findings to C147.

This feature moves one read-only Application workflow. It does not complete
RF05, alter source authority, or qualify the full command surface or a live
campaign. Preserve unrelated RF06/AF work and releases.
