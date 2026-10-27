# RF05-F04 C09 — Intent decision-advisory public boundary

**Status:** COMPLETE FOR THE SCOPED IMPLEMENTATION/PUBLIC-IMPORT SLICE; RF05-F04, RF05-F05, and RF05 remain incomplete.
**Base HEAD:** `abf798ce26439d88938a8ab4cb2e61f382c37a08`
**Scope:** [`C09-SCOPE.md`](C09-SCOPE.md)

The 41-line decision-advisory implementation moved byte-identically to Intent. Its existing database access remains an explicit argument; no database, provider, Discord, native rules, or application module was imported into Intent. The root path now re-exports the Intent module for compatibility. `gm.js` and `turn-orchestration.js` import through Intent public. The exact source-location assignment for the compatibility path remains active; C09 does not claim the root path has been removed.

The first frozen batch passed 14/15 but exposed a stale C05 test assertion that required exactly two names on the GM's Intent import. The production behavior and the new C09 regression passed; the C05 assertion was broadened to permit additional named contracts on the same public import. A complete final batch was then run once against the final test bytes: **15/15 passed**, exit **0**, duration **1,367.1831 ms**, nine fresh files. Syntax checks passed **7/7**. The C05 assertion repair and its new hash are recorded in `C05-RUN.json` and this run file.

RF05 architecture ratchet failed on existing debt: 578 modules, zero unowned, 2,742 imports, largest cycle 181, 955 active violation groups and 955 transition errors. There are zero findings on the changed GM, turn-orchestration, Intent module/public API, or compatibility path. The exact GM and turn-orchestration private-import transitions were retired and preserved. The root compatibility path's source-location assignment remains active. RF05-F04 has **54** assignments and RF05-F05 has **441**.

Provider calls/tokens/spend, network, and production database use: zero; Codex usage: UNMEASURED. Release is **NOT AUTHORIZED**. Rollback by reverting only the C09 source/evidence commit; preserve all earlier feature commits and user changes.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
