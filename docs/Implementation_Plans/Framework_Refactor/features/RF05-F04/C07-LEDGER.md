# RF05-F04 C07 — Narrative GM-world contract public API

**Status:** COMPLETE FOR SCOPED GM IMPORT SLICE; RF05-F04 and RF05 remain incomplete.
**Base HEAD:** `c227a66763839d4132e767665e0ee02fa8bb3534`
**Scope:** [`C07-SCOPE.md`](C07-SCOPE.md)

The existing closed GM-world schema and prompt now live in `frameworks/narrative/gm-world-contract.js`. Narrative's public API exports those exact contracts. `gm.js` imports through that API; `gm-world-narrative.js` retains rendering, source validation, storage, receipt behavior, and compatibility exports. The new data module depends only on Narrative's existing proposal schema. No narrative behavior or Daggerheart authority changed.

Fresh changed-code regression `rf05-f04-c07.test.mjs`, together with six fresh tests affected by the shared `GMService` import, passed **13/13** in one blocking batch (exit **0**, **3,956.3878 ms**, one launch). Changed JavaScript syntax passed **5/5** (exit **0**). The tests covered GM service loading, schema/prompt identity and shape, and the Narrative public import path. Test source hashes and exact invocations are in [`C07-RUN.json`](C07-RUN.json).

RF05 architecture ratchet failed (exit **1**) on existing debt: 576 source modules, zero unowned, 2,739 imports, largest cycle 181, 955 active violation groups and 955 transition errors. The changed GM edge and new contract have zero findings. Transition `cc8076bdca29df6585e651bdf86e712bcfbf8fbf7bbc52f37b0a30f248a87f7d` was retired only after the GM public import was confirmed; the original record is preserved in `C07-RETIRED.json`. There are **56** RF05-F04 assignments remaining. Provider/network/database use and provider cost: zero; Codex usage is unmeasured. Release is **NOT AUTHORIZED**.

Rollback by reverting only the C07 implementation/evidence commit. Preserve earlier feature commits, transition history, user changes, and unrelated diagnostic logs. This scoped slice does not close RF05-F04 or qualify the phase gate.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
