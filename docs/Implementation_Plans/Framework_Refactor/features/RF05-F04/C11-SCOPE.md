# RF05-F04 C11 — Operations turn-trace public API

## Objective

Move the existing `AsyncLocalStorage` turn-trace module byte-identically to `frameworks/operations/turn-trace-context.js`, publish its four existing exports through Operations public, and route the GM's `turnTraceFor` import through that public API. Keep the root file as a compatibility re-export so all callers share the same underlying `AsyncLocalStorage` instance.

## Behavioral and authority contract

Preserve trace isolation by async execution context, guild filtering, SQL instrumentation, and all existing exports. Trace state remains diagnostic-only and must not acquire game authority, source text, player-private content, or behavior-changing policy. Do not change narration, Daggerheart mechanics, native receipts, or turn commit behavior.

Retire only GM transition `0100afe6e8d5d090579b29adb38eb9f1fc8c51bfcfcc96021e446222ff7dc2e2` after the GM imports Operations public. Preserve the exact original record. Retain the assigned root module-location transition for the compatibility path.

## Verification

Create `bot/tests/ai-gm-2026-10/rf05-f04-c11.test.mjs`. Import real `GMService`, verify public and compatibility exports share identity, exercise an async trace through both entry paths across an await, and verify GM uses Operations public. Run one frozen blocking union with all current fresh tests affected by `gm.js`; do not execute inherited or historical tests. Syntax-check changed JavaScript/MJS and run the RF05 architecture ratchet. No providers, network, production data, broad validation, or polling.

## Exit evidence

Record source/test hashes, actual outcomes, architecture counts and existing holds, remaining RF05-F04 assignments, costs, rollback, and release status. This slice does not complete RF05-F04 or RF05.
