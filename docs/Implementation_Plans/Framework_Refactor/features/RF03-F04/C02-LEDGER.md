# RF03-F04 corrective C02 ledger

Status: QUALIFIED / C02 only. Base commit: `4e32b3d`.

## Scope and authority

Extract only the current Daggerheart-backed environment odds proposal contract and source-defined handler identities. Keep all scene/world source reading and transaction responsibilities in the current provider.

## Implementation and test evidence

`frameworks/daggerheart/environment-odds-contract.js` owns the existing feature identities, handler/kind map and pure proposal contract. `native-environment-noise.js` injects its source hash/failure capabilities lazily and retains all scene/source/presence/audience/database ancestry behavior. Ordinary narrative flexibility is unchanged.

Fresh test cases: `rf03-f04-c02.test.mjs` contains 3 cases. In the final frozen union with F02-C03, the two source/context cases passed; the provider-delegation assertion failed because its expected source string did not reflect the newly lazy hash closure. Only that failed case was rerun after correcting the assertion: targeted run exit 0, 1/1 passed, TAP 339.7516 ms, blocking wall 508 ms, log SHA-256 `cfb7591d296a21d2b8bf40b1e91f1b372a266b9e1740bfe7ca6588a8d800b4a7`. The preceding union had 7 tests, 6 passed/1 failed, exit 1, duration 713.1247 ms, log SHA-256 `0b2609dd6d3584c098e263e7d09d12665265918b8313f7fdf955af398dfde16b`; all implementation cases passed and the only failure was the stale source assertion. Earlier startup-cycle failures are retained in terminal history. Three changed JS/MJS syntax checks passed in the union; the test's changed syntax recheck passed. RF03 ratchet exit 0: 390 modules, 0 unowned, 2,313 imports, largest cycle 182, 2,601 raw/accepted legacy occurrences, 0 active groups, 0 transition errors; gate log SHA-256 `2718db78779dbf5b0690f72cb2c0ca69339cc52dd6d1603fab0745c1be6a7bf9`. Source SHA-256: provider `db01712b9b4a0afcf60cde9732cf4f7f3b4c50e25adb5103c5eb0874cb04596e`; native module `70457b0f0406e8338b6ce91e62de5d89ca5b6e45486024ee2bda9666ddbb86ff`; final test `0745f664a9c89783e228f0dc58a6bb8a5f2a5c72b96ed3ed61446b078170cdad`. Provider calls 0 / $0; Codex usage UNMEASURED.

This qualifies the source-bound proposal contract only. Scene persistence, native roll application, and the world-authoring-to-Daggerheart pair remain held. Full attempt history is in `phases/RF03/F04_C02_TERMINAL.json` and its logs.

## Rollback

Revert the native contract, provider wiring, fresh test and evidence together. No world data migration.
