# RF05-F02 execution ledger

**Status:** COMPLETE FOR SCOPED RAW-TRANSPORT BOUNDARY. RF05 phase gate remains failed on inherited RF04 debt.
**Base HEAD:** `14c75839ec7d5dc487b6c726805c4abfd355350b`
**Scope:** [`SCOPE.md`](SCOPE.md)

## Source audit

- `gm.js` is application-owned and contains provider request transport mixed with broad GM orchestration.
- The raw client method creates one Responses API call per attempt with SDK retries explicitly disabled; its own bounded retry supports 408/409/429, 5xx, API connection errors and API timeout errors, caps configured retries to 0–5, honors a bounded `retry-after`, and preserves abort checks before/after dispatch and while waiting.
- Success and failure both record model duration, usage/cache counts, and retry state. The existing trace records purpose/model/duration/retry/error; provider incidents carry a fresh reference and privacy-safe code.
- `requestStructured` and `structuredResponse` add authority instructions, context/schema policy, malformed-output retry, and narrative/game-specific prompt changes. They remain in `gm.js` under this feature.
- `randomUUID`, `performance.now`, and retry waiting are transport-only imports. OpenAI client construction remains in `gm.js` until its exact RF05-F04 transition; F02 injects that existing client into the provider transport. `turnTraceFor` also has a separate use in scene observation, so its import remains application-owned after extraction.
- The first checker diagnosis found that F01's provider `public.js` was not listed in `PACKAGES.json`; F02 registers that observed, already-consumed endpoint. It also found the old bootstrap import transition after F01 moved its only import. Since the exact source edge no longer exists, F02 removes only that now-unused row; unrelated baseline records are preserved. The original transition requiring `gm.js`'s OpenAI import through RF05-F04 is retained.

## Implementation, test, and architecture evidence

Moved the raw Responses API dispatch and bounded transient retry loop into `frameworks/ai-provider/model-transport.js`, exposed through the registered AI-provider public entrypoint. `GMService.requestModel` now passes the original options object to the transport. `gm.js` retains construction of `OpenAI` and `this.ai` under its exact RF05-F04 transition because shadow engagement still consumes that client. Provider telemetry and trace access are injected callbacks. Structured request authority, schema/prompt changes, parsing, malformed-output retry, and GM workflows remain in application-owned `gm.js`.

Fresh final test `bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs` passed **7/7**, exit **0**, TAP duration **657.8748 ms**. Cases cover successful usage/cache telemetry, bounded recoverable retry, terminal provider error, cancellation before dispatch, abort after response, retry cap and long server deferral, and exact GMService delegation. An earlier run had **6 pass / 1 fail**, exit **1**, duration **660.9521 ms** because the application wrapper normalized omitted defaults rather than forwarding the original options; the implementation was corrected to pass options unchanged, and the frozen final batch passed once. Both terminal summaries are retained as `rf05-f02-initial-test.log` and `rf05-f02-test.log`; there was no polling. No model provider was contacted.

Changed-file syntax passed **4/4**, exit **0**. Architecture ratchet exited **1** with 568 source modules, zero unowned, 2725 imports, largest cycle 181, 2439 raw occurrences, 1467 accepted, 967 active groups, and 967 transition errors. It found **no active violation or transition error on any F02/F01 changed provider/application path**. The full phase gate remains failed because of unresolved earlier RF04 transition obligations; this is not release qualification. The newly observed provider public entrypoint is registered in `PACKAGES.json`. The one no-longer-present `index.js -> generation-feedback.js` transition was removed by exact ID `9d5997dd2f768f84bffa18314b35622169aebe49bbd1e233eca4f245678db0ec`; the OpenAI import transition assigned to RF05-F04 remains unchanged.

Hashes and concise results are in `RF05-F02-RUN.json` and `phases/RF05/rf05-f02-*.log`. Provider calls 0, tokens 0, USD $0; Codex usage UNMEASURED.

After later scoped imports changed the shared `gm.js` module, a fresh targeted recheck ran `rf05-f02-model-transport.test.mjs`, `rf05-f04-c02.test.mjs`, and `rf05-f04-c03.test.mjs` once. The batch passed **9/9**, exit **0**, duration **1,917.7243 ms**; all seven F02 tests passed. Exact batch details and the current GM hash are in `RF05-F02-RUN.json`.

## Holds and rollback

RF04 remains incomplete and RF05's current ratchet reports prior-phase debt; this F02 slice remains independent. Do not change player-facing behavior or any native receipt path. Roll back only the RF05-F02 feature commit; preserve RF05-F01, prior history, user edits, and unrelated diagnostics.

## Next step

Next exact feature: RF05-F03, the context-budget and disclosure boundary. Continue to preserve RF04's outstanding phase holds.

## C02 — Restore deferred Responses-client validation

Corrective: RF05-F02 had added a construction-time `client.responses.create` check that the original request path lacked, breaking qualified RF04-F04 C08/C09 (0/5 at HEAD). Removed only that check; dispatch failure behavior is the original one. Final batch 28/28 across 15 files, exit 0; RF04 ratchet passes; RF05 unchanged at 955. See `C02-LEDGER.md`. Release NOT AUTHORIZED.

### Shared GM refresh after RF05-F04 C17

After the shared GM module changed, the remaining fresh RF05 tests that import GMService passed 24/24 in one targeted batch, exit 0, 8,429.1518 ms. Test files: bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs, rf05-f03-c02.test.mjs, and RF05-F04 C02, C03, C05-C13, and C15. Current gm.js SHA-256: F24D8C7A77F3B6C322A567E5BB955DD562E42A8167E68612CFD62D9D4E503928. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-shared-gm-refresh.log (SHA-256 DEC67CE28CFD17A7C310573CC4609CD284C169FDCC7549501590314978F20304). No live provider or service use.


### Shared GM refresh after RF05-F04 C18

The full frozen fresh GM-dependent union was rerun after the current `gm.js` change: 36/36 passed across 18 files, exit 0, 17,868.0517 ms. Current gm.js SHA-256: 1F5ED13BBD86D1DF42F5C19D69A16110703090A4E9F20CFFEF73E0DB229C039E. Log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c18-final-test.log (SHA-256 1E776695140D172988B2AA5D6977329D2EDC06D88EDCF8126B24044593592A59). No provider, network, production database, Discord, or CI access.


### Shared GM refresh after RF05-F04 C19

The complete fresh GM-dependent union ran once after the current GM module change: 37/37 passed across 19 files, exit 0, 17,944.705 ms. Current gm.js SHA-256: 8B8C27CF365C4E3E04B5F154889F7493B9A172869B18B79E5AD0405EAC53DBBA. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c19-final-test.log (SHA-256 FF1885EB05C5F85509C1D98E99A8DA0CC7650CF969B2678222ADFEF8C62F999C). No paid provider or service use.


### Shared GM refresh after RF05-F04 C20

After the current gm.js change, the complete fresh GM-dependent union passed 38/38 across 20 files, exit 0, 18,370.7892 ms. Current gm.js SHA-256: 8CE164DE119CDC91EE439D04ADFE9CD5F734B1C7CC5F1C5CAA181C3B44A60416. Terminal log: docs/Implementation_Plans/Framework_Refactor/phases/RF05/rf05-f04-c20-final-test.log (SHA-256 E7278E0BBEA19857328CAAD1EB4896ABDBA0F8CD0090D22F5771547E47E52BD7). No live provider or service use.

## 2026-10-26 RF05-F02 C03 native action scheduling ownership

The original action/span dependency objective is reopened alongside earlier transport work. Relocated the Intent engine byte-for-byte (SHA256 837aa40bea1ae6bd5cf9402f88dc508fe9373367a9c05badcfce53b22494d71d), retained same-function old readers and moved the actual state application import to Intent public. Six fresh scheduler/SQLite tests passed6/6, exit0, TAP1468.6515ms; syntax5/5. Stable plan ordering, durable receipt/wake-up replay, private dependency propagation, interrupts and no PC effects exercised using explicit new accepted-row fixtures, without certifying upstream acceptance/native execution. One application private-import record retired; five domain caller and root-location obligations remain. RF04 ratchet passes608modules/0unowned/2806imports/2402rawaccepted/SCC181/0activeerrors; RF05 remains943expiredgroups/errors. Exact evidence: features/RF05-F02/C03-RUN.json. Provider0tokens0cost$0; CodexUNMEASURED; RF05 incomplete; RELEASE NOT AUTHORIZED.
