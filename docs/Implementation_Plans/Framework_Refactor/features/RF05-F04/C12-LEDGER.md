# RF05-F04 C12 — Operations metrics public API

**Status:** COMPLETE FOR THE GM PUBLIC-IMPORT SLICE; RF05-F04 and RF05 remain incomplete.
**Base HEAD:** `5af97889c61547fcd38a4cde7be17102de4ce61b`
**Scope:** [`C12-SCOPE.md`](C12-SCOPE.md)

`operational-metrics.js` moved byte-identically to the Operations framework (git blob `98bd6bbf7eaf9ee882f0765a1bd3152858bb26ad` before and after). Its `./turn-trace-context.js` import now resolves to the Operations-owned trace module from C11, so metrics and trace share one async-local context. Operations public exports `OperationalMetrics`, `measureNative`, `measureStage`, `operationalMetrics` and `parseModelPricing`; the root path is a compatibility re-export, so all 16 other consumers keep the same class and singleton. `gm.js` now imports metrics from Operations public. No telemetry field, pricing, redaction, retry or timing behavior changed.

The fresh C12 regression verifies public/compatibility identity, retry and stage accounting inside a turn trace (including guild filtering and the error path), and that snapshots and incidents retain no prompt, error-code or reference text. One frozen affected-GM batch passed **21/21** across twelve fresh test files (exit **0**, **6,055.9301 ms**, network blocked by `offline-guard`). Changed JavaScript/MJS syntax passed **5/5**. No inherited telemetry suites ran.

RF05 architecture ratchet failed on existing debt: 581 source modules, zero unowned, 2,747 imports, largest cycle 181, 955 active violation groups and 955 transition errors. The new module, Operations public and the GM import have zero findings. Two active findings touch the root path from unchanged consumers (`opening-cohort-runner.js`, `session-opening-runner.js`); both are pre-existing RF04-F04 records counted in the same 955. Exact GM transition `8a8741b10098f1133f6eddaaea564be46205579c1f50f39ba81ccc95f524ae71` was retired and preserved in `C12-RETIRED.json`. Root compatibility location assignment `c325db32238f8b8c337062787e8ae4e65a4825ea09c608e1929644917ae839d7` remains active. **51** RF05-F04 assignments remain.

Provider calls/tokens/spend, network, and production database use: zero; Codex usage: UNMEASURED. Release is **NOT AUTHORIZED**. Roll back only the C12 commit; preserve all prior work and existing user edits. Hashes and results: [`C12-RUN.json`](C12-RUN.json).

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
