# RF05-F04 C06 ledger — Narrative schema public API

**Status:** COMPLETE FOR THIS SOURCE-OWNERSHIP AND GM-IMPORT SLICE; RF05-F04 remains partial.
**Base HEAD:** `b3e205947e088a98f2043761abf5f7c4c05995dd`.

The data-only Narrative schema implementation moved byte-for-byte to `frameworks/narrative/gm-fiction-schema.js`; the Narrative public API explicitly exports all 19 existing contracts. The original root path now re-exports the same objects for existing production callers. `gm.js` consumes `nativeOutcomeSchema` and `narrativeRequestSchema` only through the Narrative public API. Schema values and proposal authority are unchanged.

Fresh changed-code test `bot/tests/ai-gm-2026-10/rf05-f04-c06.test.mjs` passed **1/1**. The single frozen affected-GM batch covering F02 transport, F03-C02 guidance, F04-C02 Session principal, F04-C03 World context, F04-C05 Intent API, and C06 schema adoption passed **12/12**, exit **0**, duration **3,381.2046 ms**. Changed JavaScript syntax passed **5/5**, exit **0**. All test files import the current `GMService` where relevant; no unchanged unrelated fresh tests were rerun.

The RF05 architecture ratchet exits **1** on pre-existing debt: **575** modules, **0** unowned, **2,738** import occurrences, largest cycle **181**, **955** active groups and **955** transition errors. The exact GM-to-root-schema finding and transition error are both absent; two other root-schema consumers remain. No new finding was introduced on the changed public import. Transition `eba1e3e1be87a71d8f22b88a6c02da7e495f5ce53f41f75c699bab80934481b1` was retired and preserved in `C06-RETIRED.json`; **57** RF05-F04 assignments remain. Current hashes and actual results are in `C06-RUN.json`.

No provider calls, tokens, network, database access, or live service use. Codex usage is **UNMEASURED**. Roll back only C06 by restoring the GM root import and exact retired transition, restoring the original root schema implementation, and removing the Narrative copy/public export and C06 test/evidence. Preserve all other consumer compatibility readers and the five pre-existing user edits. Release remains **NOT AUTHORIZED**.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
