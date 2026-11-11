# R0/R6 — native command boundary (complete slice)

Reviewed current Git state, AGENTS.md, governing behavior specifications, the source-pinned rebuild gates, current handoff and SESSION_REVIEW_2026-11-03.md after the user's 2026-11-10 continuation request. Resolved review finding 4: native command additions now belong to `bot/src/v2/command-definitions.js`; the legacy declaration file is restored exactly to pinned commit `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. No source outside v2 now differs from the baseline. Native code reuses only pure baseline command metadata/schema validation as a migration dependency, not legacy handlers.

The generated native schema retains all 24 root commands and matches the pre-extraction schema exactly, including descriptions, ordering, required fields and digest constraints. It preserves typed `/vc-gm` and `/vc-player` operations and optional owner-character attendance selection. An isolated native registrar plus `register:v2:native` requires explicit native opt-in and a target guild matching the allowed guild; it cannot fall back to global registration. Legacy start/registration entrypoints are unchanged. No running bot, data store, guild command or inference was changed by this work.

Changed: legacy declaration restoration; new native declaration overlay/registrar; package script; native schema compatibility test import; new native boundary tests; live runbook, current review/start summary and handoff. Source/test hashes are in R6_COMMAND_BOUNDARY_HASHES.json.

Verification complete, Node v26.13.0, worktree root:

```text
node --test bot/tests/veilkeeper2/r6-command-schema-compat.test.mjs bot/tests/veilkeeper2/r6-native-command-boundary.test.mjs
9 passed; 0 failed/cancelled/skipped; 622.9016 ms
```

Separate before/after comparison parsed the full pre-extraction schema and deep-compared it with the new generator: identical. Pre-extraction JSON SHA-256: `b043d6b71afe9624669a9b5bba461f8c45342007efd3f711a15168d17c3b4ba7` (serialization order specific). Native tests verify schema limits/typed routes, exact preservation of baseline declarations after removing only owned additions, fresh independent generation, guild-only REST target, refusal before REST on invalid config, explicit env-file loading and no automatic retry/success log after a failed registration. REST/env-file calls are simulated; no live registration is proved or performed. Passed unchanged runtime suites were not rerun.

Fresh origin check: baseline still pinned; origin rebuild `fda77bd84b216e0e883c8b1348b12e7611787388` matches the inspected checkout. No upstream baseline audit refresh is triggered. R0 dynamic contracts and R0–R8 gates remain open; no full phase completion, migration or live-quality claim follows.

Migration/rollback: no state/schema conversion. Registered Discord schema is unchanged by this extraction; future registration must use the native script as documented. Restoring the prior native definitions would mix the legacy source boundary again; retain the overlay instead. No old command implementation or test was removed, and no compatibility/removal hold was released. Next: move private-channel registration and reviewed draft publication into native services, then address autonomous validated prose publication and remaining R0–R8 scope. Publication after major phases targets the rebuild branch only; no push or production cutover was performed.
