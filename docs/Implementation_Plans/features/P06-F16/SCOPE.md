# P06-F16 — Enable After-Hours Emergency Department HIPAA and Procedure

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** FROZEN FOR TARGETED QUALIFICATION. **Audit:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

Occurrence `environment:after-hours-emergency-department:hipaa-and-procedure`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#after-hours-emergency-department/features/0`: routine access to patient information requires appropriate credentials, consent, or a credible workaround.

The native adapter will make this exact passive source rule available only through the matching current native environment profile and entitled scene context. It creates no credential, consent, workaround, patient identity, access decision, action result or mechanical effect. PC attempts remain subject to their normal accepted action and GM adjudication. This mirrors the printed source and adds no new narrative limitation.

Changed production: `native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js`, new `native-environment-procedure.js`, and `native-environment-scene.js`. Fresh test `p06-f16.test.mjs`, catalog check p06-f01, plus p06-f04 through f15 because those tests import changed shared feature/capability/scene contracts. Frozen run ID `p06-f16-20261021-a`; one batch command covers p06-f01 and p06-f04 through p06-f16, then syntax checks the six changed JS/MJS files and parses the two changed JSON files. No legacy tests or provider runs. Follow [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md).
