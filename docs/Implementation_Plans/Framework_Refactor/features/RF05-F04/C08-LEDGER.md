# RF05-F04 C08 — World minor-NPC schema public API

**Status:** COMPLETE FOR SCOPED PROPOSAL-SCHEMA IMPORT; RF05-F04 and RF05 remain incomplete.
**Base HEAD:** `9c5b5fc0ce8a3ab209efad9b009b20b9426e723c`
**Scope:** [`C08-SCOPE.md`](C08-SCOPE.md)

The existing `minorNpcSchema` is now defined in the World framework and exported through its public API. The mixed `city-depth.js` module keeps its mutation/persistence behavior and compatibility export; `gm.js` imports the schema from World public. Schema properties and object identity remain unchanged.

The frozen fresh batch ran eight changed-code test files once and passed **14/14**, exit **0**, in **1,349.9331 ms**. It included the new C08 regression and six existing fresh tests plus C07's test, all of which import the changed `GMService`. Changed JavaScript/MJS syntax passed **5/5** (exit **0**), and `git diff --check` passed.

The RF05 architecture ratchet failed on existing debt: 577 source modules, zero unowned, 2,741 imports, largest cycle 181, 955 active groups and 955 transition errors. The new schema module and GM-to-World public import have no findings. Five existing findings remain on the touched `city-depth.js` module: its legacy location, two unrelated import edges, and two cycles; two expired transitions belong to those unchanged source edges. Those findings were not introduced by C08. Exact transition `41a184d8e346809f13aa4feaf6a4c65501a4b20b1c040844046b09f4f857e886` was retired and preserved. **55** RF05-F04 assignments remain.

Provider calls, provider tokens, provider spend, network, and production database access: zero; Codex usage: UNMEASURED. Release is **NOT AUTHORIZED**. Rollback by reverting only the C08 implementation/evidence commit; preserve earlier commits and pre-existing user edits.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
