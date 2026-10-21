# P06-F12 — Enable Maintenance Memory

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** FROZEN FOR TARGETED QUALIFICATION. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

Occurrence `environment:veil-anchor-chamber:maintenance-memory`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#veil-anchor-chamber/features/1`: the chamber shows a historical scene associated with the Anchor's creation and reveals one true piece of campaign metaplot.

The native scene adapter will accept an exact current GM-authored establishment receipt as the truth anchor. The resulting audience-scoped receipt references that fact, commits no cost, PC action, PC knowledge state or mechanical consequence, and renders the established detail as a chamber memory. Narrative presentation can remain expressive around the selected established truth.

Production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`, `bot/src/native-environment-scene.js`, `bot/src/gm-arbitration-contract.js`. Fresh test: new `bot/tests/ai-gm-2026-10/p06-f12.test.mjs`; shared P06-F01 and P06-F04 through F11 catalog/capability tests plus P06-F03 schema test are affected.

Frozen run ID `p06-f12-20261021-a`; command from repository root: `node --test bot/tests/ai-gm-2026-10/p06-f01.test.mjs bot/tests/ai-gm-2026-10/p06-f03.test.mjs bot/tests/ai-gm-2026-10/p06-f04.test.mjs bot/tests/ai-gm-2026-10/p06-f05.test.mjs bot/tests/ai-gm-2026-10/p06-f06.test.mjs bot/tests/ai-gm-2026-10/p06-f07.test.mjs bot/tests/ai-gm-2026-10/p06-f08.test.mjs bot/tests/ai-gm-2026-10/p06-f09.test.mjs bot/tests/ai-gm-2026-10/p06-f10.test.mjs bot/tests/ai-gm-2026-10/p06-f11.test.mjs bot/tests/ai-gm-2026-10/p06-f12.test.mjs`; changed JS/MJS syntax only. One blocking batch; repair only failed affected tests if required.

No new limitation on narrative, GM creativity, NPC/faction autonomy or invention. No provider tests or release authorization.
