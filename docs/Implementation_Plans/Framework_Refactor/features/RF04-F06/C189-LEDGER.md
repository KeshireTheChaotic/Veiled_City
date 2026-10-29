# C189 evidence ledger

**Status:** COMPLETE for the bounded compatibility retirement; RF04 remains INCOMPLETE.
**Base / branch:** `f534e73e405c1e298fed651609123c849e804180` / `codex/clean-ai-gm-2026-10`.

World compatibility export `city-constraints.js` was removed after all twelve callers were verified and migrated. World callers now use the World public API. Intent, Narrative and Publication callers use consumer-owned ports connected by the existing `intent--world`, `narrative--world` and `publication--world` pairs. The original World functions and Daggerheart–World actor-control binding remain intact; `index.js` still initializes actor control before World execution. Ten exact transition records were archived in `C189-RETIRED.json` and removed; no new exceptions, transition allowance or baseline change.

Changed production files: 12 root callers; 3 new owner contract modules and 3 owner public exports; 3 existing pair public adapters; 3 existing Application composition modules; removal of the root compatibility module. Architecture records updated: bridge contracts, transition manifest and C189 archive. Fresh feature scope/test evidence is in this directory.

The changed-file syntax command checked 24 production `.js` modules and the test module and completed successfully. The test initially failed because its source-inspection fixture resolved paths one directory too high; only the test fixture path was corrected. The targeted test then passed **2/2**, exit **0**. That successful invocation used the same test bytes now stored as `bot/tests/ai-gm-2026-10/rf04-f06.test.mjs`; it was renamed only because the architecture registry accepts at most two-digit case suffixes. The test was not rerun after the filename-only move. The repository ignores `bot/tests/`, so this new test and its result are local artifacts; the committed bridge registry keeps its existing reproducible test references.

Pre-change RF04 ratchet: **858** source modules, **0** unowned, **2** cycles (largest **79**), **0** active groups, **0** transition errors; pass. Final architecture results are recorded in `C189-RUN.md` after the completed-file ratchet. The RF05 gate remains a separate downstream check and is not release qualification.

Coverage demonstrates port behavior, caller routing, pair binding shape and ordering. It does not establish complete runtime startup, native SQLite semantics, live Discord/provider behavior, or the full audience/privacy policy. No gameplay, schema, saved-state, PC agency, or narrative policy changed. Provider calls/tokens/cost: **0 / 0 / $0**; Codex usage: **UNMEASURED**. Release authorization: **NOT AUTHORIZED**.

Next: continue the remaining RF04 source ownership and bridge adoption work from the active RF04 phase scope; this feature does not complete RF04.
