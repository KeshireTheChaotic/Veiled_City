# RF05-F04 C30 — World post-turn review contract

## Objective

Move the pure post-turn state-review validator and its structured-output derivation into a World-owned module, publish it through World public, and have GM use that public API. Preserve the legacy `director.js` export as an identity-compatible reader for other callers.

## Behavioral contract

Keep required review categories, validation messages/diagnostics, derivation from the structured mutation bundle, normalization output, mutation of `result.state_review`, and return shape byte-for-byte equivalent in behavior. This validates the GM's review of proposed output; it does not apply consequences, grant mechanics, or replace native state validation.

## Files

- Add `bot/src/frameworks/world/director-review.js`.
- Export `validatePostTurnStateReview` through `bot/src/frameworks/world/public.js`.
- Keep the exact legacy export from `bot/src/director.js` by re-exporting World public.
- Switch `gm.js` to the World public validator while retaining the existing World public categories import.
- Add `bot/tests/ai-gm-2026-10/rf05-f04-c30.test.mjs`.

## Verification

The fresh test checks public/compatibility identity, successful normalization from structured output, required-field failure diagnostics, and the GM import route. Run once with changed-source syntax checks and the RF05 phase-aware architecture ratchet. If the exact GM-to-`director.js` transition disappears, preserve its full record in a C30 retirement artifact and remove only that ID from the live manifest. No legacy tests, provider, database, network, CI, or production service.

## Exit evidence

Record hashes and actual terminal outcomes, transition count, whole-phase gate, rollback and cost. RF05-F04/RF05 stay incomplete until all assigned obligations are met. Release not authorized.
