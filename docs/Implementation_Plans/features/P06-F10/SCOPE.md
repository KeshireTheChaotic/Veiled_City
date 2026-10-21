# P06-F10 — Broaden Automatic Correction to authored mundane details

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** TARGETED PASS; OCCURRENCE SUPPORTED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Exact source and authorized behavior

Occurrence `environment:veil-anchor-chamber:automatic-correction`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#veil-anchor-chamber/features/2`: “Spend a Fear to rewrite one mundane environmental detail in the chamber and force the PC to adapt.” The owner explicitly answered **“Broaden the native adapter”** when asked to choose between four closed environmental types and the source's broader wording.

## Frozen implementation

Keep the existing exact source, current sealed GM origin, active spotlight action, native one-Fear cost, scene/location/audience binding, replay protection, saved receipt format, and publication path. Replace the four-item property/value allowlist with open, bounded strings for one authored mundane `property` and `value`; the native adapter records only that declared scene detail and leaves PC response unselected. It does not assign PC actions or add Daggerheart mechanics.

Production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`, `bot/src/native-environment-scene.js`. Fresh test: new `bot/tests/ai-gm-2026-10/p06-f10.test.mjs`; rerun P06-F01 and P06-F04 through F09 because the shared catalog/capability code changes. No legacy tests or fixtures.

Frozen run ID `p06-f10-20261021-a`; command from repository root: `node --test bot/tests/ai-gm-2026-10/p06-f01.test.mjs bot/tests/ai-gm-2026-10/p06-f04.test.mjs bot/tests/ai-gm-2026-10/p06-f05.test.mjs bot/tests/ai-gm-2026-10/p06-f06.test.mjs bot/tests/ai-gm-2026-10/p06-f07.test.mjs bot/tests/ai-gm-2026-10/p06-f08.test.mjs bot/tests/ai-gm-2026-10/p06-f09.test.mjs bot/tests/ai-gm-2026-10/p06-f10.test.mjs`; changed JS/MJS syntax only. Execute once blocking; repair in a separate batch only if needed.

No new narrative, NPC autonomy, faction autonomy or invention limitation. The frozen delta passed 19 unique tests after repairing two failed assertions in their owning files; five syntax checks passed. See the [feature ledger](LEDGER.md) and [targeted evidence](../../evidence/P06_F10_TARGETED.json). Implementation commit: `95e21990e740d17cda5f4386ffbeb35a6070516a`. No provider calls or release authorization.
