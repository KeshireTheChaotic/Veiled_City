# RF04-F05 — World observation reader retirement

Move the original four-line World observation registration reader into `frameworks/world/observation-reader.js`. The two historical script import targets change to that reader under the owner's path-only authorization. Preserve the exact original bind side effect and function exports; application startup continues to register the native source through World execution as before. No observation, audience, source, test assertion or saved-state policy changes. The historical suites are not executed.

Rollback by restoring `bot/src/world-observation.js`, removing the owner reader and reversing the two script import paths, together with restoring the exact original record preserved in OBSERVATION-READER-RETIREMENT-RECORDS.json. Earlier root-reader tests remain historical evidence for their original bytes.
