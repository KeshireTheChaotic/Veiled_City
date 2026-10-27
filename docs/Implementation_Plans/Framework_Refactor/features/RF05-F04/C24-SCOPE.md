# RF05-F04 C24 — World action catalog extraction

## Objective

Move the existing autonomous action and major-impact vocabularies from the large legacy World simulation module into a small World-owned catalog module, and expose them through World public.

## Behavioral contract

Preserve exact array values, ordering, and object identity through the compatibility exports in `simulation.js`. Keep all action validation, costs, resolution, effects, and receipts unchanged. This is a World-only extraction; it does not compose Intent schemas or route through a pair adapter.

## Ownership and tests

- World owns `frameworks/world/action-catalog.js` and its public exports.
- `simulation.js` imports and re-exports the exact arrays for historical consumers.
- Fresh test: `bot/tests/ai-gm-2026-10/rf05-f04-c24.test.mjs`, checking World public, simulation compatibility, and existing NPC Director schema vocabulary identity.

## Verification

Run the new changed-code test once, syntax-check changed JS/MJS, and run the RF05 architecture ratchet. Do not execute inherited tests, providers, network, production data, CI, or services.

## Exit evidence

Record exact hashes, test/syntax/architecture outcomes, current transition counts, rollback, cost, and release status. This slice does not complete RF05-F04 or RF05.
