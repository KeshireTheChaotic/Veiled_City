# RF05-F04 C03 ledger — GM World public-context API

**Status:** COMPLETE FOR THIS IMPORT SLICE; RF05-F04 remains partial.
**Base commit:** `b4ac04107f6dd8492f55ccb9faf9275a1560dd60`.
**Changed runtime module:** `bot/src/gm.js` (application-owned), SHA-256 `18D95C46C8A0E7843109D605F4DFE51291F96EA8729EB1748F91FDD3463A6132`.

`GMService` now imports `cityContext` from `frameworks/world/public.js`. The legacy `city-core.js` compatibility function still delegates to the same World implementation. No context policy, private audience, or civic evidence selection changed.

## Verification

Fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c03.test.mjs`, SHA-256 `70C5CFE574BAED1818BD3F05F8698AB9758A61C2A1FE44883ADE0FE8DD43ACD5`, was frozen and run as `node --test --test-concurrency=1 --test-reporter=tap tests/ai-gm-2026-10/rf05-f04-c03.test.mjs` from `bot/`. An initial run failed 1/1 on the test's incorrect expected fake-database call count (expected 2, actual 4 because both APIs were compared). The test was corrected; the final file then passed **1/1**, exit **0**, duration **625.478 ms**. No production code changed between these runs. Changed JavaScript syntax checks passed **2/2**, exit **0**.

The RF05 architecture ratchet reports **572** source modules, **0** unowned, **2,732** imports, **955** active violation groups and **955** transition errors; it remains failed on existing debt. A changed-path inspection reports no active findings for `gm.js`. The exact old import transition `bc2b84be1b485b3cf0bcc69b77180fa5bbe85a0b48def3d1590cd8a18e18a4e4` was retired after the checker showed one extra transition error for the now-absent edge. Its full source record is preserved in [`C03-RETIRED.json`](C03-RETIRED.json); the baseline and all unrelated deadlines and counts remain unchanged. Updated transition manifest SHA-256: `E11757427F1E17F71079BE76C2E3E5C1D08F3429CB4DF07EED2ED333A0DA9025`.

No provider, Discord, network, or production database was used. Model calls: **0**. Provider cost: **$0**. `git diff --check` passed. The test's database is a deterministic local fake, so this slice does not establish a live database or gameplay claim.

## Remaining obligations and rollback

RF05-F04 has **60** assigned transition entries remaining; this slice does not complete its workflow decomposition or RF05. Roll back only this slice by restoring the single `gm.js` import, restoring the exact transition from `C03-RETIRED.json`, and removing C03's test and evidence. Preserve the previous RF05 work, the five pre-existing user edits, and RF04 logs. Release remains **NOT AUTHORIZED**.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
