# AF06 — Obsolete context consumer audit

**IN PROGRESS — current static audit complete, Agent C.** The current JavaScript scan finds 49 source-context occurrences: 27 adversary projectors and 22 environment facades. Their implementations occupy 24 candidate modules. The only external symbol consumer found is Daggerheart's public export surface (23 reference sites). No durable state-writer call was found in the candidate modules. Exact paths, symbols, source hashes and references are in CONTEXT-CONSUMERS.json.

Delivered files: `audit-context-consumers.mjs`, `CONTEXT-CONSUMERS.json`, this ledger. The script reads source text; it does not load the application, access campaign data or run inherited tests. Final execution **exit 0**. Its first attempt counted the public re-export as an environment facade and stopped at its inventory assertion (23 instead of 22); limiting facade discovery to native environment modules corrected the scan. No production behavior was changed by this audit.

Known limits: exact static symbols cannot prove runtime equivalence or exclude computed/external clients. The shared public export surface is concurrently involved in RF05/RF06 work. No code, authored content, old tests or historical readers were deleted. Professional Entry's separate native first-use/Advantage machinery is explicitly protected.

## Environment facades — removed after native consumer verification

Fresh `af06-native-context-scene.test.mjs` exercised all 22 exact environment source contexts through the actual native environment-profile receipt writer/reader and `nativeEnvironmentSituation`. Profile replay, original source hashes, private/wrong-location isolation, scene transition holds and read-only historical inspection passed: **1 test passed, 0 failed, exit 0**. World-authoring/audience ports use injected native test providers and disposable SQLite; this is not live model or Discord evidence.

The 22 nine-line `native-environment-*` context facades listed in CONTEXT-CONSUMERS.json were then deleted after checking their exact hashes and verifying zero current runtime import/symbol consumers. The underlying factory module, public exports, authored content, actual effect readers and Professional Entry mechanics remain. No inherited tests were removed or run. Current retirement ownership is in RETIRED-CONTEXT-FACADES.json; historical RF/audit manifests remain snapshots.

Next exact work: **AF06 retire the two old factory implementations and their public exports**, coordinating around the concurrently edited public surface, and qualify the remaining generalized effect consumers. AF04 Null Foam's owner area ruling is resolved; its mixed reaction/condition integration remains unfinished. AF07 runtime/model qualification is unfinished.
