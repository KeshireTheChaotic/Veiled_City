# RF04-F05 C158 — Intent reads Knowledge maintenance through a fixed port

Base 0b9119da. Ai-intents consumes history reconciliation and memory cluster maintenance through the Intent-owned intentKnowledgeMaintenance port bound by the intent--knowledge adapter; story-commands uses the Knowledge public API; two Knowledge root shims retired.

Rollback: Revert only the C158 commit: restore bot/src/history-reconciliation.js and bot/src/memory-clusters.js, the ai-intents.js and story-commands.js imports, repointed tests and BRIDGE_CONTRACTS.json, drop the intentKnowledgeMaintenance port, adapter binding and initializeIntentKnowledge, and restore the transitions from C158-RETIRED.json.
