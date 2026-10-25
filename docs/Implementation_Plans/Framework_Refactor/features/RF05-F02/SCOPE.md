# RF05-F02 — isolate raw model request transport

## Objective

Extract the existing raw OpenAI Responses API client and bounded transient-failure retry loop from application-owned `bot/src/gm.js` into an AI-provider-owned transport module. Preserve client configuration, retry limits/delays, cancellation, call options, usage telemetry, error categories, incident recording and observable retry attribution.

## Source boundary

`GMService.requestModel` is the only target slice. `GMService.requestStructured` and `structuredResponse` continue to own game/narrative request policy, authority instruction injection, schema adaptation, prompt augmentation, JSON parsing, and structured-output repair. No request payload, model selection, audience, prompt, output, native mechanics, state or receipt behavior may change.

The provider module receives the existing OpenAI Responses client and neutral Node APIs. `gm.js` retains client construction under its exact RF05-F04 external-capability transition; do not remove or reschedule that transition in F02. Application-owned metrics and turn tracing enter through explicit injected callbacks; the provider must not import operational metrics or async-local application context. Register and import the observed AI-provider public API. Keep the existing GMService method as a behavior-preserving delegate.

## Testing and constraints

Create one brand-new changed-code-only test at `bot/tests/ai-gm-2026-10/rf05-f02-model-transport.test.mjs`. Use an in-memory mock client and injected clock/retry wait; test success telemetry, bounded transient retry, terminal provider error, cancellation before dispatch, abort after response, retry cap, and application-wrapper delegation where feasible. Never call a live provider. Run only the frozen feature test once, changed-file syntax checks, and the RF05 phase-aware architecture ratchet. No historical tests, fixtures, suites, broad validation, CI, DB, deployment, restart, push or merge.

## Exit evidence

Record exact source/test hashes, terminal exit and counts, syntax results, architecture result, cost (provider calls/tokens/USD = zero), rollback and holds. If preserving an exact behavior requires crossing an unsupported framework boundary, keep it injected or hold the smallest affected seam; do not move GM policy into the provider.
