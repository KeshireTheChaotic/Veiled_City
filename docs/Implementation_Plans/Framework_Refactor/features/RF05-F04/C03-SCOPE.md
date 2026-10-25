# RF05-F04 C03 — GM World public-context API adoption

## Objective

Change the application GM service's `cityContext` import from the legacy `city-core.js` compatibility module to the existing World framework public API. Preserve the exact result, arguments, and behavior of the GM-only civic reference context. This slice does not change civic evidence selection or expose that private context to players.

## Ownership and behavior

`cityContext` is World-owned and already exported by `frameworks/world/public.js`. `gm.js` is application-owned. The compatibility function in `city-core.js` delegates to that World function. The only authorized source edge for this slice is existing transition `bc2b84be1b485b3cf0bcc69b77180fa5bbe85a0b48def3d1590cd8a18e18a4e4` (`gm.js` → `city-core.js`). No other imports or transition deadlines may change.

## Verification

Create `bot/tests/ai-gm-2026-10/rf05-f04-c03.test.mjs`. Import the actual GM service, verify its import uses the World public API, and compare public and compatibility-reader results using a fresh local fake database with public and excluded private/action records. Syntax-check only changed JavaScript and the new test; run the RF05 phase-aware architecture ratchet. No legacy tests, provider, service, production database, or network.

Record exact hashes and terminal results, preserve the full retired transition record, and retain the wider RF05 gate status. Release remains NOT AUTHORIZED.
