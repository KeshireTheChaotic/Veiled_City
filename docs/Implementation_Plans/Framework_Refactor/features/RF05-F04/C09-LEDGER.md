# RF05-F04 C09 — Intent decision-advisory public boundary

**Status:** COMPLETE FOR THE SCOPED IMPLEMENTATION/PUBLIC-IMPORT SLICE; RF05-F04, RF05-F05, and RF05 remain incomplete.
**Base HEAD:** `abf798ce26439d88938a8ab4cb2e61f382c37a08`
**Scope:** [`C09-SCOPE.md`](C09-SCOPE.md)

The 41-line decision-advisory implementation moved byte-identically to Intent. Its existing database access remains an explicit argument; no database, provider, Discord, native rules, or application module was imported into Intent. The root path now re-exports the Intent module for compatibility. `gm.js` and `turn-orchestration.js` import through Intent public. The exact source-location assignment for the compatibility path remains active; C09 does not claim the root path has been removed.

The first frozen batch passed 14/15 but exposed a stale C05 test assertion that required exactly two names on the GM's Intent import. The production behavior and the new C09 regression passed; the C05 assertion was broadened to permit additional named contracts on the same public import. A complete final batch was then run once against the final test bytes: **15/15 passed**, exit **0**, duration **1,367.1831 ms**, nine fresh files. Syntax checks passed **7/7**. The C05 assertion repair and its new hash are recorded in `C05-RUN.json` and this run file.

RF05 architecture ratchet failed on existing debt: 578 modules, zero unowned, 2,742 imports, largest cycle 181, 955 active violation groups and 955 transition errors. There are zero findings on the changed GM, turn-orchestration, Intent module/public API, or compatibility path. The exact GM and turn-orchestration private-import transitions were retired and preserved. The root compatibility path's source-location assignment remains active. RF05-F04 has **54** assignments and RF05-F05 has **441**.

Provider calls/tokens/spend, network, and production database use: zero; Codex usage: UNMEASURED. Release is **NOT AUTHORIZED**. Rollback by reverting only the C09 source/evidence commit; preserve all earlier feature commits and user changes.
