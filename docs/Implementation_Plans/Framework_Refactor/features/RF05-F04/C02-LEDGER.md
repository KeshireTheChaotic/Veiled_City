# RF05-F04 C02 ledger

**Status:** SCOPED SLICE QUALIFIED — one application-to-Session public API adoption; feature F04 remains partial.

Changed `bot/src/gm.js` to import `conversationPrincipal` from `frameworks/session/public.js`; the old compatibility reader and function identity remain unchanged. The fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c02.test.mjs` passed 1/1, exit 0, TAP 964.9156 ms. Both changed JavaScript files passed `node --check`. It verifies GMService imports successfully, public and compatibility exports are identical, and a disposable SQLite owner assignment returns the expected current authenticated principal. No provider, network, Discord, or production database was used.

The first RF05 ratchet identified the exact former import as `UNUSED_TRANSITION`, confirming the source edge is absent. Its complete original record is preserved in `C02-RETIRED.json`; no baseline, occurrence maximum, or deadline changed. The post-retirement architecture result is recorded in `RF05-F04-C02-ARCHITECTURE.json` and the phase ledger. The phase-wide gate is expected to remain failed on unrelated transition debt; this slice must show zero new violations and no active violation on its changed path.

**Run record:** [`C02-RUN.json`](C02-RUN.json) records the base SHA, changed-source and test hashes, actual terminal times/results, syntax checks, both architecture outcomes, transition identity, zero provider/database/network use, and rollback. Test passed 1/1 in one blocking invocation; changed JavaScript syntax passed 2/2. The initial architecture result had 968 transition errors because it reported the now-absent exact edge as `UNUSED_TRANSITION`; after removing only that record while preserving it in `C02-RETIRED.json`, the gate remains failed on 967 unrelated existing errors/groups. The changed `gm.js` path has no active violation/error. No feature-wide or release qualification is claimed.

**Rollback:** restore the old import in `gm.js`, remove the new fresh test and this C02 evidence, and restore the exact transition record from `C02-RETIRED.json`. Preserve RF05-F04 C01 and all user edits. **RELEASE NOT AUTHORIZED.**

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
