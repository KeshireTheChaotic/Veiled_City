# RF05-F04 C19 — World autonomy prompt public API

## Objective

Publish the existing `AUTONOMOUS_WORLD_PROMPT` through World public and change the application GM to consume that contract there. Keep `autonomous-world.js` and all world proposal, context, validation, and native mutation behavior in place.

## Behavioral and ownership contract

Move only the immutable prompt value and preserve its exact bytes. Do not narrow autonomous world invention, add approval gates, alter NPC/faction behavior, or change player control, audience, Daggerheart authority, or native receipts. The root module re-exports the identical value and keeps runtime functions. GM schema and runtime imports remain compatible.

## Verification

Create the fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c19.test.mjs` to verify public/compatibility identity and GM's public import. Freeze the complete current shared-GM fresh test union: C16-C19, P10-F08, and RF05-F02, RF05-F03-C02, RF05-F04 C02, C03, C05-C13, C15. Run once blocking, plus syntax checks of changed JS/MJS and the RF05 architecture ratchet. No inherited suites, paid providers, network, production data, CI, or services.

## Exit evidence

Record exact source/test hashes, actual batch results, architecture state, assigned transition count, rollback, cost, and release status. No transition is retired unless the exact edge disappears and its record permits retirement. This slice alone does not complete RF05-F04/RF05.
