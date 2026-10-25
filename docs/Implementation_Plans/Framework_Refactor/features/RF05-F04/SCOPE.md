# RF05-F04 — Narrative model selection boundary

## Objective

Extract the existing lane-aware narrative model selection from the mixed `narrative-delegation.js` module into the Narrative framework public API. Keep player-intent/task coordination in the application-owned module. Preserve the exact current lane/model fallback order.

## Behavioral contract

For the same configuration, packet, and lane, select the same model as before. Observation may use the configured fast narrative model only when the scene is not protected; otherwise prefer the configured narrative model, followed by the existing combined/downtime/default GM model fallbacks. This is configuration routing only: it does not decide narrative content, audience, player actions, native outcomes, or creativity.

## Files and ownership

- New `frameworks/narrative/model-selection.js`: Narrative-owned model selection.
- `frameworks/narrative/public.js`: public export.
- `narrative-delegation.js`: retain application task coordination, remove the relocated selector.
- `gm.js`: compose Narrative public model selection with existing application coordinator.

## Verification

Write a new focused test at `bot/tests/ai-gm-2026-10/rf05-f04-model-selection.test.mjs`. Cover protected and unprotected observation, configured model precedence, and combined/downtime/default fallback order. Run only this test once in a frozen blocking batch; syntax-check changed JavaScript and run the RF05 phase-aware architecture checker. Do not call a provider or change runtime behavior.

## Exit evidence

Record source and test hashes, actual test/syntax/architecture results, exact removed transition identities if the source edge is gone, remaining RF05-F04 assignments, rollback, zero provider cost, and release status. This scoped slice does not complete RF05-F04 if other assigned workflow obligations remain.
