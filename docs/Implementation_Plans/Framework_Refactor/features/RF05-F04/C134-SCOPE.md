# RF05-F04 C134 — Operations imports kernel revision hashing

## Change

Replace the `stateRevision` compatibility import from Intent's root module in Operations-owned `ai-review.js` with the existing neutral kernel implementation. Preserve the helper implementation and its serialized revision behavior. No framework interface or pair API is added.

## Qualification

Add a fresh regression that proves Operations imports the kernel helper, not the Intent compatibility export, and verifies stable/changed revision values. Run the changed-code fresh RF05-F04 union, changed-file syntax checks, and RF05 architecture ratchet.

## Limits and deferred work

The same `ai-review.js` module still uses Intent-owned delegation policy, intent context and review action capabilities. The existing Intent–Operations bridge is marked proposed with no API, and RF01 owns interface definition and lifecycle tests. Those dependencies remain unchanged for a separately approved pair contract. No persistence, gameplay, authorization or review behavior changes. No provider, network, production database, Discord or deployment activity is in scope.
