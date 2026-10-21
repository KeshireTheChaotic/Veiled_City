# P06-F15 — Enable After-Hours Emergency Department Something in Imaging

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** FROZEN FOR TARGETED QUALIFICATION. **Audit:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

Occurrence `environment:after-hours-emergency-department:something-in-imaging`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#after-hours-emergency-department/features/2`: reveal an impossible scan, monitor or lab detail that provides a clue and creates a record.

The adapter will accept one creative GM-authored anomaly and clue in the current source-bound environment, save a durable audience-scoped record, and expose it to current scene context. It creates no patient identity, diagnosis, treatment, PC action, knowledge state beyond the entitled observed clue, resource cost or mechanical outcome. No prose or NPC creativity restriction is proposed.

Changed production: `native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js`, new `native-environment-imaging.js`, `native-environment-dispatch.js`, `native-environment-scene.js`, `gm-arbitration-contract.js`, `gm-unified-arbitration.js`. New tests: `p06-f15.test.mjs`; coverage/catalog check `p06-f01`; shared affected tests p06-f03 through f14 because each imports a changed shared source contract, schema, or environment route. Frozen run ID `p06-f15-20261021-a`. Run the one `node --test` batch over p06-f01 and p06-f03 through p06-f15, then `node --check` only the 10 changed JS/MJS files and parse the two changed JSON files. No legacy tests or provider runs. See [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md).
