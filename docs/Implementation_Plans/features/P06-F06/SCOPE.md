# P06-F06 — Enable source-qualified Too Loud to Think

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** FROZEN FOR TARGETED QUALIFICATION. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Governing authority and exact source

[OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md) governs the experience. Exact source: `environment:haunted-nightclub:too-loud-to-think`, `content/GM_PRIVATE/ENVIRONMENTS/environments.json#haunted-nightclub/features/0`: delicate auditory or verbal investigation has disadvantage unless the PC changes the environment.

## Existing native behavior

`native-environment-noise.js` already routes a GM's contextual applicability ruling into native ordinary PC action-roll disadvantage, tracks a real owner action that quiets the scene, and preserves the modifier's saved ancestry. The supported descriptor uses a passive trigger, no feature target, ordinary PC action disadvantage protocol and no resource cost. It makes no roll and spends no player resource itself. The GM may continue judging exact applicability; the player owns the PC action and environment-changing choice.

## Frozen change and acceptance

Activate only the source-pinned occurrence, register its existing handler, and require the exact descriptor-to-contract mapping. Fresh tests cover source drift, executable discovery, exact roll-modifier contract and rejection of forged fields. No new limitation on narrative or autonomy is introduced.

Production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`. Tests: new `bot/tests/ai-gm-2026-10/p06-f06.test.mjs`, with changed catalog-count assertions in `p06-f01.test.mjs`.

Rollback only this occurrence descriptor, handler allowlist, capability guard and tests. Preserve native saved readers and receipts.
