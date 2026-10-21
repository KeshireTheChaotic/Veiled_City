# P06-F04 — Enable source-qualified Sirens Outside responder arrival

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** TARGETED PASS. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Governing owner specification

[OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md) governs GM behavior. The existing source-bound responder adapter preserves NPC initiative while leaving player decisions and mechanics native.

## Exact occurrence

`environment:occult-crime-scene:sirens-outside` — `content/GM_PRIVATE/ENVIRONMENTS/environments.json#occult-crime-scene/features/2`. Printed action spends 1 Fear to bring one mundane authority, media, property-management, or emergency-response person into the scene at an inconvenient moment.

## Deliverable and boundaries

Enable only the already implemented `sirens_outside` native adapter. It requires a current native environment instance, an unused GM opportunity, exact 1 Fear, one new ordinary NPC identity at the current location, and the closed category list. It records an immutable receipt and publishes a narrow arrival sentence. It does not create a combatant, PC reaction, custody, attack, PC resource effect, or automatic PC response. No narrative or NPC-autonomy restriction is added.

## Changed modules and fresh tests

Production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`. Fresh tests: `bot/tests/ai-gm-2026-10/p06-f04.test.mjs`; the existing fresh catalog test is updated because the supported occurrence count changes. Run only those affected fresh files, plus syntax checks for changed JS/MJS.

## Acceptance and limits

The exact current source must resolve to the one registered handler and one-Fear closed category contract. Source drift, duplicate source identity, altered cost/trigger/handler and caller-forged descriptors must remain held. Existing adapter runtime already checks current owner/source/audience/scene, native opportunity, exact spend, identity collision and idempotent replay; this delta changes only its catalog activation and capability-contract validation. Test results must not be described as full release qualification.

## Rollback

Revert this occurrence descriptor, handler registration, capability validation and fresh test mapping together. Preserve native saved readers, owner documents and unrelated worktree state.
