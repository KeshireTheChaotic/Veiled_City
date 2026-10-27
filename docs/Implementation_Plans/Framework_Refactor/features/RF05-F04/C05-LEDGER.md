# RF05-F04 C05 ledger — Intent contract public API

**Status:** COMPLETE FOR THIS CONSUMER-IMPORT SLICE; RF05-F04 remains partial.
**Base commit:** `caa88b2e0d0e26c6bc4e2ca3879359f1c3c50794`.

The Intent contract implementation now resides in `frameworks/intent/ai-intent-contracts.js` and is exported by the Intent public API. `gm.js` imports the existing prompt and schema through that API. The former root path remains a compatibility re-export for other production consumers. Export identity and schema behavior are preserved; these contracts remain proposals and do not authorize mechanics or PC actions.

The fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c05.test.mjs` passed **1/1**, exit **0**, duration **550.7978 ms**, one launch. Changed JavaScript syntax checks passed **5/5**, exit **0**. The RF05 ratchet failed as expected on **955** existing violation groups/transition errors, with **574** modules, **0** unowned, and **2,736** import occurrences. Changed-path inspection found no boundary finding for the GM's new public Intent import or the new Intent implementation/public module. The retained root compatibility path still has four exact cross-framework consumer findings (`delegation-catalog.js`, `ordinary-effects.js`, `seed-drafts.js`, and `simulation-schema.js`) plus its location obligation; those are outside this slice and remain assigned. No provider calls, tokens, model spend, network, or database access.

Only transition `9adda1062fb5ec114195328c1ff9008f15f9722203ff40fe98e27b719e6564b4` was retired and preserved in `C05-RETIRED.json`. The transition manifest SHA-256 after removal is `45390102A001F991450BD01CD88DB89CE3DFB3630697AB099058E975C96C6D86`; **58** RF05-F04 transition entries remain. Full file hashes and terminal outcomes are in `C05-RUN.json`.

Rollback only this C05 slice: restore the GM import and its exact transition; restore the former root implementation; remove the Intent public export, moved implementation, and C05-only test/evidence. Preserve the compatibility path for the other callers and all five pre-existing user edits. Release remains **NOT AUTHORIZED**.

### C05 regression refresh after C09

The GM's Intent public import now contains additional named contracts. The fresh C05 test's import check was broadened to continue asserting `intentArraySchema` and `INTENT_PROMPT` on that public import. It passed 1/1 as part of C09's complete affected-code batch (15/15 overall; exit 0; 1,367.1831 ms). Current test hash and GM hash are in `C05-RUN.json` under `refresh_after_c09`.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
