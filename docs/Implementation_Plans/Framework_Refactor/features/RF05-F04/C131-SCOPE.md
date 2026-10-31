# RF05-F04 C131 — Intent dispatch uses its public validator

## Change

Switch only the Intent-owned dispatch source `bot/src/ai-intents.js` from the root compatibility re-export of `validateIntent` to the existing Intent public API. Preserve the validator implementation and identity, all dispatch behavior, and the root compatibility re-export for its remaining consumers. No persistence, policy, action, narration, or authorization behavior changes.

## Qualification

Add one fresh boundary regression that imports the changed dispatch module, proves its validator import is through Intent public, and checks that the public validator is the same function re-exported by the compatibility path. Exercise a valid setup proposal and a malformed extra-field proposal. Run `node --check` on the changed production source and the RF05 architecture ratchet once after the edit. Record exact results and hashes in `C131-HASHES.json`.

## Limits and rollback

This retires one internal compatibility-path dependency only. The root facade remains required by other consumers, and this does not decompose or relocate the mixed `ai-intents.js` dispatch implementation. No provider, network, production database, Discord, or deployment activity is in scope. Rollback restores the single import specifier and removes this feature's test and evidence.
