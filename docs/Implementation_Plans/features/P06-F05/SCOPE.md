# P06-F05 — Enable source-qualified Upload in Progress countdown

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** FROZEN FOR TARGETED QUALIFICATION. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Governing specification and exact source

[OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md) is the behavioral authority. Native code remains authority for Fear and saved effects; players own their PC actions, rolls and choices.

Occurrence: `environment:apartment-veil-breach:upload-in-progress`, from `content/GM_PRIVATE/ENVIRONMENTS/environments.json#apartment-veil-breach/features/2`. It costs 1 Fear to begin a four-step fictional upload countdown. A successful relevant player action can tick it back or redirect it.

## Existing native route and bounded change

`native-environment-countdown.js`, `native-environment-dispatch.js`, and the unified arbitration contract already contain source-bound start/advance/adjust operations, exact Fear accounting, immutable receipts, relevant-action ancestry, owner-selected tick-back/redirect, replay protection, and private projection. The change activates the exact descriptor and requires its existing handler contract to match Action, spotlight action, no feature target, no feature roll and exactly one Fear.

No timer, automatic tick, invented recording, recipient knowledge, forced PC act, or new narrative/autonomy restriction is introduced. Native code still owns Daggerheart mechanics and receipts.

## Changed modules and tests

Production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`. Fresh coverage: new `bot/tests/ai-gm-2026-10/p06-f05.test.mjs`; updated catalog inventory assertions in `p06-f01.test.mjs`. The batch tests the source-qualified discovery and exact descriptor-to-capability mapping; it is not whole runtime or release certification.

## Acceptance and rollback

Only the exact source hash and `upload_countdown` handler expose the adapter. Drift, forged handler/cost/trigger/target/roll/status stay held. Revert the occurrence descriptor, handler allowlist, capability guard and this feature test together; do not alter saved readers or existing receipt state.
