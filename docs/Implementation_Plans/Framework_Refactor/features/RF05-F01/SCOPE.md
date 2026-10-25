# RF05-F01 — AI-provider generation feedback boundary

## Objective

Move the observed status-only generation feedback implementation into the AI-provider framework, while keeping operational turn tracing outside that framework. Preserve typing refresh, optional single progress notice, timer cleanup, text, and non-fatal notification failures.

## Authorized changes

- Relocate the implementation of `beginGenerationFeedback` to `bot/src/frameworks/ai-provider/generation-feedback.js` and expose this observed capability through the provider public API.
- Replace its direct `turn-trace-context.js` import with an optional injected `onProgress` callback. The current application call site captures and supplies the trace callback.
- Remove the old `bot/src/generation-feedback.js` path after migrating its sole production consumer. The frozen path transition is removed only after its exact source path no longer exists; no saved reader or native receipt uses this helper.
- Add a new focused deterministic regression test under `bot/tests/ai-gm-2026-10/`. Run only this feature test once after freezing, then syntax-check changed JS/MJS and execute the RF05 architecture ratchet.
- Inventory but do not extract `gm.js` provider transport in this feature; transport extraction remains RF05-F02.

## Invariants and exclusions

This status-only capability does not judge, authorize, or commit a turn. It cannot issue provider/model calls or affect dice, Fear, game state, source visibility, or publication receipts. Keep the existing message text and timer defaults. Do not run or import prior test files, including historical RF evidence tests. No broad validation, remote services, provider spend, production database, CI, push, merge, restart, or deployment.

## Exit evidence

Fresh tests prove initial typing, optional progress callback once, callback absence safety, and cancellation before a delayed notice. Record exact HEAD, source/test hashes, architecture output, syntax and test exit codes, costs, and rollback. This feature does not qualify RF05 transport or complete RF04.
