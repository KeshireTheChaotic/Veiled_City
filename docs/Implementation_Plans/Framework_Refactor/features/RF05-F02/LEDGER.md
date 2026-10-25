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
