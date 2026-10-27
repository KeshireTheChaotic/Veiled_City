# RF05-F04 C20 — World simulation prompt public API

## Objective

Publish the existing `SIMULATION_PROMPT` from World public and route GM prompt assembly through that API. Keep the mixed simulation schema module and its World/Intent schema dependency in place.

## Behavioral and ownership contract

Extract only the existing simulation instruction string. Preserve its exact bytes and all current autonomous NPC/faction, memory, rumor, obligation, privacy, receipt, and GM-review boundaries. Do not change world behavior, mechanical effects, player decisions, native adjudication, or how proposal schemas are validated. The root compatibility module retains and re-exports the identical string; all schema values and cross-framework schema dependencies stay where they are.

## Verification

Add fresh `bot/tests/ai-gm-2026-10/rf05-f04-c20.test.mjs` for public/compatibility identity and GM public import/use. After changing `gm.js`, run the full current fresh shared-GM union: C16-C20, P10-F08, and RF05-F02, RF05-F03-C02, RF05-F04 C02, C03, C05-C13, C15. This is 20 targeted fresh files. Also syntax-check all changed JS/MJS and run the RF05 ratchet. Use one blocking test launch and do not poll.

## Exit evidence

Record source/test hashes, actual terminal outcomes, architecture state, remaining F04 transitions, rollback, costs, and release status. Retire no transition without its exact verified edge and matching frozen record. This slice does not close RF05-F04/RF05.
