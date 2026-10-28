# RF04-F05 C159 — Intent reads World operations through a fixed port

Base fc691587. Ai-intents and typed-intents consume native World operation grants, receipts and place lookup through the Intent-owned intentWorldOperations port bound by the intent--world adapter; city-groups and simulation use the World public API; two World root shims retired.

Rollback: Revert only the C159 commit: restore bot/src/native-world-operations.js and bot/src/location-language.js, the ai-intents.js, typed-intents.js, city-groups.js and simulation.js imports, repointed tests and BRIDGE_CONTRACTS.json, drop the intentWorldOperations port and adapter binding, and restore the transitions from C159-RETIRED.json.
