# RF06 — execution ledger

**Status:** ENTRY HOLD — read-only intake only; RF06 runtime implementation has not started.
**Intake HEAD:** `b0423923c834eb1d9c639249d66a37ccdbb2fb9c`
**Branch:** `codex/clean-ai-gm-2026-10`
**Scope:** [`SCOPE.md`](SCOPE.md)

## Prerequisite evidence

The roadmap states that RF06 requires domain interfaces and the exact commit contract from RF03–RF05. RF04 remains incomplete. RF05 is recorded as an incomplete checkpoint: architecture ratchet failed with 967 transition errors; RF05-F03/F04/F05 retain 289/62/442 exact assigned entries. `state.js` still contains cross-domain mutation/commit orchestration and `turn-orchestration.js` remains a mixed transactional commit workflow. These are explicit sequencing dependencies, not evidence of a critical runtime defect. RF06 runtime changes therefore remain locally held while safe static planning continues.

## Source inventory

Read-only source locations in `bot/src/db.js`: constructor line 28, `migrateSchema` line 39, transaction coordinator line 607, turn attempt persistence line 1315, publication status line 1521, and publication claim line 1529. The ownership inventory classifies `db.js` as persistence but explicitly requires domain-call decomposition before relocation. No database was opened and no runtime source was modified in this intake.

The frozen transition manifest currently assigns 17 entries to RF06-F02, 179 to F03, 160 to F04, 43 to F05, and 5 to F07. No transition entries currently target F01 or F06. These counts do not define feature scope or authorize blanket removal. F06/F07 objectives are absent from the inspected source plan and remain unscoped pending authoritative assignment evidence.

## Tests and architecture

No tests or syntax checks were run for this documentation-only intake; no production modules changed. RF05's latest recorded architecture result remains failed, exit 1, and is cited rather than rerun because this intake changes no source or architecture inputs.

## Holds and rollback

Do not start RF06 source migration until RF03–RF05 interfaces and the exact native commit/receipt contract satisfy the roadmap gate. Preserve all existing RF05/RF04 work, user edits, and diagnostic logs. Rollback only this RF06 intake commit if needed. Release remains **NOT AUTHORIZED**.

## Next step

Complete the held RF05-owned boundaries or obtain a separately recorded owner decision that changes the phase dependency. Then write RF06-F01's active scope and ledger from the verified feature assignments before any RF06 source edit.

## Owner-authorized Option B publication dependencies

The RF04 owner-authorized deadline reconciliation assigns 12 existing consumer edges to RF06-F03 because their exact targets are Publication-owned output, outbox, transport or handout modules in the relocation crosswalk. RF06-F03's manifest count is now 191 (179 prior + 12 reassigned); this is assignment evidence, not implementation or phase entry. The source edges remain active and require RF06 publication API adoption and fresh affected-code tests before retirement. No RF06 production source or test changed. The RF06 entry gate remains held until RF03–RF05 interfaces and commit semantics qualify. Exact original/updated records and RF04/RF05/RF06 gate results: `../RF04/DEADLINE-REASSIGNMENT.json`. Release remains NOT AUTHORIZED.

## RF06 persistence inventory checkpoint

At `a9069bbbd75ff0fa0648c50e90812ff59a240ee3`, a read-only inspection of `bot/src/db.js` recorded its 2,436 lines, 13 imports, 411 direct SQL call sites, and the connection/schema, synchronous transaction, repository, embedded domain-orchestration, and durable turn/publication receipt seams. The specific decomposition observations and sequencing rules are in [`PERSISTENCE-BOUNDARY-INVENTORY.md`](PERSISTENCE-BOUNDARY-INVENTORY.md). No source or database was changed or opened, so no tests or syntax checks were run. RF06 runtime work remains held by its existing entry gate; this inventory does not qualify an RF06 implementation feature or release.
