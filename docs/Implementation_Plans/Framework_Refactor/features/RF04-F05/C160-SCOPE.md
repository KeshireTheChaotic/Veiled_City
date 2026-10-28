# RF04-F05 C160 — Narrative reads World encounters through a fixed port

Base d58518c5. Narrative director source consumes World encounter catalog configuration and candidate snapshots through the Narrative-owned narrativeWorldEncounters port bound by the narrative--world adapter; gm.js uses the World public API; the World encounter beats root shim is retired.

Rollback: Revert only the C160 commit: restore bot/src/world-encounter-beats.js, the gm.js and narrative-director-source.js imports, repointed tests and BRIDGE_CONTRACTS.json, drop the narrativeWorldEncounters port and adapter binding, and restore the transitions from C160-RETIRED.json.
