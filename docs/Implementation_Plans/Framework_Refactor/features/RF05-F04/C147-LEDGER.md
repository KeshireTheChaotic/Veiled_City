# RF05-F04 C147 — GM expansion status workflow

Status: complete for the scoped Application boundary; RF05 remains incomplete.

Source commit: `1eb315c0` (`RF05 F04 C147 move expansion status into
application`), parent `19805e9006bebc4fd053fc08c57e217bbece2159`.

## Delivered so far

- Moved `expansionStatus(db, guild)` into
  `bot/src/application/workflows/expansion-status.js`. The Application
  workflow assembles Narrative's immutable feature definitions with the
  existing read-only campaign status methods.
- Changed the sole production caller in `story-commands.js` to the Application
  workflow and removed the root implementation. The handler's GM/admin guard
  and ephemeral response remain unchanged.
- Verified that the extracted function body is byte-identical to the committed
  implementation: SHA-256
  `4293b33a8759c450dbb1256bf0f9183bb85b48990a5ba90769c384ac30bee2b0`.

## Qualification

- Fresh test: `node --test tests/ai-gm-2026-10/rf05-f04-c80.test.mjs` from
  `bot/` — 3 passed, 0 failed, 0 skipped, exit 0, 160.9406 ms.
- Changed-file syntax: 3/3 passed.
- The test checks exact feature projection and strict flags, database method
  allowlist and order, error identity, the command GM guard and the ephemeral
  response. No live service or campaign database is used.
- RF05 ratchet: exit 1; 1108 modules, 1 unowned, 4486 imports, 584 accepted
  legacy occurrences, 7 active violation groups and 0 transition errors.
  The first five reported errors all identify Agent C's separate Native roll
  condition host or its consumers; C147 paths have no reported violation.
  The Native host still needs its Daggerheart ownership decision entry.
- Two exact transition records were retired and preserved in
  `C147-RETIRED.json`. The existing relocation row now assigns the Application
  workflow, and ownership decisions list it under Application.
- Historical `DEPENDENCY_GRAPH.json` was not regenerated while peer source
  drafts are active. No phase-gate pass is claimed.

## Preserved and deferred

The workflow makes the same three read calls with the same arguments and
returns the same keys, feature rows, bounds, recovery text and authority text.
No write, receipt, migration, provider request, or Discord request was added.
RF05 and release qualification remain incomplete.

Next: complete the exact application ownership/crosswalk row and retire only
the old module-location and import transition records, then record the final
RF05 architecture snapshot and commit the C147 evidence.
