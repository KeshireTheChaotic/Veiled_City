# RF05-F04 C133 — Application supplies the Intent review catalog

## Change

Remove only the `FEATURE_FLAGS` dependency from the Operations-owned `ai-review.js` source. Extend its existing `reviewInbox` call with one explicit required feature-catalog argument. The application-owned `story-commands.js` imports the existing Intent public contract and supplies it on the `ai-inbox` path. Preserve all other review dependencies, return fields, authorization checks and command behavior. Add no pair, module, or new framework interface.

## Qualification

The fresh structural regression checks that the Operations function requires an injected catalog, no longer imports this value from Intent, and the application command supplies the public Intent contract. Include the C131/C132 public-contract regressions because they share these modules. Run changed-file syntax and the RF05 architecture ratchet after the source move.

## Limits and rollback

The current command path is the only production `reviewInbox` callsite found in source. Preserve every existing value in the returned eligibility rows. Other Operations-to-Intent dependencies remain unchanged for separately scoped work. No persistence, gameplay, authorization, narration, or effect semantics change. No provider, network, production database, Discord, or deployment activity is in scope. Rollback restores the existing mapping import and the original three-argument call.
