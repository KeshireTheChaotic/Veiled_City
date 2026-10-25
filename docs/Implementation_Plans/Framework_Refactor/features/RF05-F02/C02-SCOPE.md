# RF05-F02 C02 — Restore deferred Responses-client validation

## Objective

RF05-F02 extracted model dispatch into `frameworks/ai-provider/model-transport.js` as a behavior-preserving move, but added a construction-time `client.responses.create` check that the original `GMService.requestModel` never had. Constructing `GMService` with a provider client that lacks `responses` (as the qualified RF04-F04 C08/C09 opening-runner tests do, with the writer replaced) now throws before any request. Remove only that added check so a missing client method fails at dispatch, inside the guarded provider call, exactly as before.

## Contract

Configuration remains required at construction. Dispatch without `responses.create` raises the original `TypeError` inside the try block: one `model_request` error metric with `PROVIDER_ERROR`, one model incident, no retry. No change to retry limits, delays, metrics, tracing, cancellation or any production path that supplies the real OpenAI client (always constructed by `GMService` when no client is injected).

## Verification

New `rf05-f02-c02.test.mjs`; rerun RF04-F04 C08/C09 (failing at HEAD since RF05-F02, 0/5), the RF05-F02 transport test and the RF05 GM-constructing tests in one batch. Syntax and RF04/RF05 ratchets. No provider, network or production data.