# RF05-F04 C05 — GM Intent contract public API

## Objective

Move the self-contained `ai-intent-contracts.js` implementation into the Intent framework, export its existing contracts from the Intent public API, and change the application GM to import `intentArraySchema` and `INTENT_PROMPT` through that API. Retain the former root path as a compatibility re-export for existing production consumers.

## Behavioral and ownership contract

The schema values, prompt text, validator, accepted proposals, and exported object/function identities must remain unchanged. This is an ownership and import change only. Intent contracts remain proposals; they do not authorize native mechanics, PC actions, consent, or effects. Do not alter any Daggerheart authority or other cross-framework caller.

Retire only exact transition `9adda1062fb5ec114195328c1ff9008f15f9722203ff40fe98e27b719e6564b4` (`gm.js` → root `ai-intent-contracts.js`) after the new public import is verified. Keep the separate root-module location and other callers' exact transition records active; no deadline or baseline change.

## Verification

Write `bot/tests/ai-gm-2026-10/rf05-f04-c05.test.mjs`. Import the real `GMService`, verify its public Intent import, compare all public/compatibility exports by identity or value, and exercise the existing validator on bounded valid/invalid proposals. Run this fresh test once after the source is frozen, syntax-check changed JavaScript, and run the RF05 architecture ratchet. No legacy tests, providers, network, production data, or broad validation.
