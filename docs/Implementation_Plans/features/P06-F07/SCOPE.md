# P06-F07 — Enable source-qualified Emergency Cascade

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** FROZEN FOR TARGETED QUALIFICATION. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Exact source and native route

Occurrence `environment:district-blackout:emergency-cascade`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#district-blackout/features/1`: choose hospital, traffic, fire, elevator, refrigeration or public safety; a real mundane emergency develops and competes for attention.

`native-environment-scene.js` already validates the actual local infrastructure source, creates an immutable source-bound scene receipt and leaves PC response unselected. The combined GM prompt already documents this exact scene-action route. This change activates only the exact existing handler. No Fear is spent by the feature; no numerical service damage, PC injury or PC action is inferred.

## Frozen change and acceptance

Production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`. Fresh test: new `bot/tests/ai-gm-2026-10/p06-f07.test.mjs`; changed catalog-count assertions in `p06-f01.test.mjs`. Existing P06-F04/F05/F06 tests also run because their shared production modules change.

Only the exact source/handler, Action/spotlight/no-target/no-roll and empty-cost contract exposes this feature. Source drift and forged descriptors remain held. No new creative or autonomy limitation is introduced.

Rollback the exact descriptor, handler allowlist, capability guard and feature test; preserve existing source readers and receipts.
