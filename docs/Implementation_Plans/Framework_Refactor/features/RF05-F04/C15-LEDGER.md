# RF05-F04 C15 execution ledger

**Status:** COMPLETE FOR THE SCOPED NARRATIVE WRITER CONTRACT EDGE; RF05-F04 AND RF05 REMAIN INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `61dabd3dac4254a085f4be1b0af8ad5be879bd33`
**Scope:** [`C15-SCOPE.md`](C15-SCOPE.md)

## Implementation and evidence

The exact v9 act-kind list, native-clause schema, response schema and instruction strings now have Narrative-owned modules. Narrative public exports the three writer contract values. Root `narrative-acts-v9.js`, `narrative-clauses-v9.js` and `narrative-writer-v9.js` remain compatibility readers; their compiler, native clause construction, act verification and output mapping remain in place. The application GM imports the contract through Narrative public.

A new test exercised the actual `GMService.generateNarrative` request using a mocked `requestModel`; it verified the request schema object, concatenated instruction strings and parsed response. Result: **1/1 passed**, exit **0**, **609.2199 ms**. All nine changed JavaScript/MJS files passed syntax checks. The RF05 architecture ratchet remains failed at **950** aggregate groups/errors (584 source modules, zero unowned, 2,753 imports); no new active finding appeared on changed paths. Raw and accepted legacy occurrence totals each decreased by one. One exact private import transition was preserved and retired; **48 RF05-F04 assignments remain**.

Full SHA256 values, commands, logs, report, cost and rollback are in [`C15-RUN.json`](C15-RUN.json). One mocked request, zero paid provider calls/tokens/spend, zero network, production database or Discord calls; Codex usage is UNMEASURED.

## Rollback and limits

Restore the original GM import and transition record, put the exact existing schema/instruction values back in the compatibility modules, and remove only C15's new Narrative modules, public exports, test and evidence. No stored data, player control, creative wording, audience, Daggerheart mechanics, native receipts or publication behavior changed. RF05-F04/RF05 remain incomplete; **RELEASE NOT AUTHORIZED**.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.
