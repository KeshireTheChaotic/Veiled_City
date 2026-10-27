# RF05-F04 C10 — Intent GM-arbitration contract public API

**Status:** COMPLETE FOR THE GM PUBLIC-IMPORT SLICE; RF05-F04 and RF05 remain incomplete.
**Base HEAD:** `f5619c45c3e0ba2dc288d42a94c580e047b25478`
**Scope:** [`C10-SCOPE.md`](C10-SCOPE.md)

The import-free 79-line arbitration schema/matcher source moved byte-identically into Intent. The GM imports the contract through Intent public; the root path re-exports it so the other 42 recorded consumers keep their existing imports. The matcher remains a proposal-shape validator only and creates no native result, PC choice, or receipt.

Fresh changed-code batch: **16/16 passed** across ten files, exit **0**, duration **1,419.9164 ms**, one blocking launch. Changed JavaScript/MJS syntax passed **5/5**. The new test verifies real GM service loading, public/compatibility identity, representative schema match/rejection, failure diagnostic, and GM import path. No inherited arbitration tests were run.

RF05 architecture ratchet failed on existing debt: 579 source modules, zero unowned, 2,743 imports, largest cycle 181, 955 active groups/errors. There are zero findings for the new Intent module and the GM public import. Three existing World-to-root compatibility imports remain direct cross-framework findings (`0f087e92887acba18084d3e63b38325d0dd3cf13e40625392bfae4397169187f`, `6027439adfc4e3209457bf566405b6788b0d4b6e59ced587cc22f33ab368eb78`, `278aeba5890605bca6ce3c4cd7496061f8a89ef6e9c7c56a5c451ce5dcbea4b1`); those caller modules were not changed. The root compatibility-location assignment also remains. GM transition `57e5bc30d209d7aa530428a034da2bc8fb26acf52065b046d599bb46c3d167cb` was retired and preserved. **53** RF05-F04 assignments remain.

Provider calls/tokens/spend, network, and production database use: zero; Codex usage: UNMEASURED. Release is **NOT AUTHORIZED**. Roll back only the C10 source/evidence commit, restoring the GM import and exact transition; preserve the compatibility source and all prior work.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
