# RF05-F04 C132 — Intent feature-flag contract ownership

## Change

Move the existing `FEATURE_FLAGS` mapping, unchanged, from `ai-intents.js` into the existing Intent-owned contract module `frameworks/intent/ai-intent-contracts.js`. Publish it from Intent public. Keep the `ai-intents.js` export as the compatibility surface. Preserve `ai-review.js`'s current import from that root compatibility module: the architecture ratchet demonstrated that an Operations-owned source cannot import Intent public directly, and this slice does not add an Intent–Operations integration. Add no new interface, module, or manifest row.

## Qualification

The fresh regression checks the full mapping, parity with the Intent payload catalog, compatibility-export identity, and the public Intent import used by dispatch while confirming the Operations compatibility reader remains unchanged. It runs with the preceding C131 public-validator regression because `ai-intents.js` is shared and changed in both slices. The first ratchet attempt rejected the proposed direct Operations-to-Intent import; after restoring the compatibility import, rerun the changed-code union and RF05 ratchet.

## Limits and rollback

This moves only immutable-by-convention configuration data; preserve the existing object shape and mutability. No feature enablement, gameplay, persistence, policy, narration, or effect behavior changes. The root `ai-intents.js` export remains. No provider, network, production database, Discord, or deployment activity is in scope. Rollback restores the map to `ai-intents.js` and removes its public export, while retaining unrelated C131 work.
