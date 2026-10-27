# RF05-F04 C13 — Knowledge authority projection public import

**Status:** COMPLETE FOR THE SCOPED PUBLIC-IMPORT EDGE; RF05-F04 AND RF05 REMAIN INCOMPLETE.
**Base HEAD:** `ee5f5f24ff8ceec2a25292ce6ecc5030a69253e8`
**Branch:** `codex/clean-ai-gm-2026-10`
**Scope:** [`C13-SCOPE.md`](C13-SCOPE.md)

## Implementation and results

`gm.js` now imports `projectAuthorityRecords` through Knowledge public. The root compatibility reader remains unchanged, and its exact transition `44030eadc4099d258170c650827e85d01ff58bf128ca62652198f53ada5bbb06` is preserved in `C13-RETIRED.json`. The fresh test verifies GM module loading, the public import route, the Knowledge public wildcard export, and the compatibility-reader route.

The final repaired test run passed **2/2**, exit **0**, in **607.07 ms**. The initial run failed 1/2 because its assertion expected a named export where the existing public API uses `export *`; only the assertion changed, and the repaired whole file ran once. Changed-file syntax passed **2/2**. The RF05 ratchet failed at **950** existing groups/errors (581 modules, zero unowned); its report shows **zero active findings and zero transition errors for `gm.js`**. After retiring this exact edge, **50 RF05-F04 records** remain (1 legacy location, 1 external capability owner, 48 private API imports). Exact hashes and terminal outputs are in `C13-RUN.json` and `phases/RF05/rf05-f04-c13-*.log`.

No provider, network, production database, or Discord calls; cost is zero and Codex usage is unmeasured. Rollback restores only the GM import and this transition from the retained record. Release remains **NOT AUTHORIZED**.

## Evidence

No tests or syntax checks have run for this slice yet. No provider, network, production database, or Discord calls are authorized or planned. Cost is zero; Codex usage is unmeasured.

## Holds and rollback

Unrelated RF04/RF05 architecture debt remains deferred and does not block this import change. Rollback only this C13 import/transition/evidence slice; preserve all other worktree edits and the `c13-wip` stash. Release remains **NOT AUTHORIZED**.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
