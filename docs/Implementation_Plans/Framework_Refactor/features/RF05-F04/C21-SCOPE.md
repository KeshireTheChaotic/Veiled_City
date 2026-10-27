# RF05-F04 C21 — World simulation update schema public API

## Objective

Move the standalone, data-only `simulationUpdateSchema` into a World-owned contract module and publish it through World public. Route the GM schema assembly through that API while retaining the mixed NPC director schema and its Intent dependency in the compatibility module.

## Behavioral and ownership contract

Preserve exact schema shape, field order, required fields, enums, and object identity through the root compatibility export. Do not alter what simulation updates can be proposed, validated, persisted, or adjudicated. The NPC director schema and Intent integration remain unchanged. No Daggerheart mechanics, player authority, NPC autonomy, audience, or receipt behavior changes.

## Verification

Add fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c21.test.mjs` for schema identity/equality and GM public import. Run the complete current fresh GM-dependent union: C16-C21, P10-F08, and RF05-F02, RF05-F03-C02, RF05-F04 C02, C03, C05-C13, C15. Run one blocking batch only, syntax-check changed JS/MJS, and run the RF05 ratchet. No inherited tests, live providers, network, production data, CI, or services.

## Exit evidence

Record exact source/test hashes, test/syntax/architecture outcomes, current transition count, rollback, costs, and release status. Retire no transition unless its precise edge is absent and the transition record allows retirement. This slice does not complete RF05-F04 or RF05.
