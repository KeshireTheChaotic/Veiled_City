# RF05-F04 C10 — Intent GM-arbitration contract public API

## Objective

Move the self-contained, import-free `gm-arbitration-contract.js` implementation byte-identically to `frameworks/intent/gm-arbitration-contract.js`, expose its existing contracts from Intent public, and route the GM's schema import through that public API. Retain the root module as a compatibility re-export for existing application, World, and Daggerheart consumers.

## Behavioral and authority contract

Preserve exact exported values, schema branches, matcher behavior, and error construction. Arbitration remains an AI proposal; native rules, authoritative validators, PC agency, Daggerheart outcomes, consent, and transaction receipts retain their current owners and behavior. No other consumer import changes in this slice.

Retire only GM transition `57e5bc30d209d7aa530428a034da2bc8fb26acf52065b046d599bb46c3d167cb` after the GM imports Intent public. Preserve its exact record. Keep the separately assigned root compatibility-location debt.

## Verification

Create a new test at `bot/tests/ai-gm-2026-10/rf05-f04-c10.test.mjs`. Import the actual `GMService`, compare the public and root compatibility exports, exercise representative schema matching and failure behavior, and verify the GM uses Intent public. Run one frozen blocking union with all fresh current-GM tests affected by the `gm.js` import change; do not run inherited tests, even if they import the compatibility path. Syntax-check changed JavaScript/MJS and run the RF05 architecture ratchet. No providers, network, production data, broad validation, or polling.

## Exit evidence

Record source/test hashes, actual test/syntax/architecture results, existing compatibility consumers and root-location hold, remaining F04 assignments, costs, rollback, and release status. This does not complete RF05-F04 or RF05.
