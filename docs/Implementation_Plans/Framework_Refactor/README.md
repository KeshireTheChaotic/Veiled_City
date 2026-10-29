# Veiled City framework isolation

> **Current status — IN PROGRESS.** The 2026-10-29 C182–C186 checkpoint has scoped passing evidence. RF04 remains incomplete and RF05 has 46 unresolved groups/errors. See [merge verification](features/RF04-F06/C182-C186-MERGE-VERIFICATION.md) and the [RF04 ledger](phases/RF04/LEDGER.md) for current detail. Release qualification is not established.

**Historical checkpoint narrative — COMPLETE (archived).** Earlier checkpoint summaries and audit counts were removed from this overview. The audit files, migration records, phase ledgers, and feature evidence retain the source history.

Read root AGENTS.md first, then the [owner behavior specification](../OWNER_AI_GM_BEHAVIOR_SPEC.md), complementary [ENGINE constitution](../../../content/ENGINE/AI_GM_CONSTITUTION.md), [test policy](../TEST_PROTOCOL.md), [no-poll policy](../TEST_EXECUTION_NO_POLL.md), then the current [RF04 scope](phases/RF04/SCOPE.md), [RF05 scope](phases/RF05/SCOPE.md), and only the active feature scope/ledger. Historical P-series and RF00/RF01 audit evidence remain unchanged; the live package policy and exact transition list evolve with authorized migrations.

## Current evidence

- [Repository inventory](REPOSITORY_INVENTORY.csv): every tracked path, metadata classification and accountable owner.
- [Application inventory](TRACKED_APPLICATION_INVENTORY.csv): runtime, support assets, SQL, scripts and tests. Historical tests and suite scripts are path/stat-only records, never executed or used as fixtures.
- [Source ownership](FRAMEWORK_OWNERSHIP.csv) and [explicit decisions](OWNERSHIP_DECISIONS.json): one owner per runtime source/support module, destination, rationale, exports, measured size/dependencies, side-effect candidates, risk and migration phase.
- [Dependency graph](DEPENDENCY_GRAPH.json), [readable report](DEPENDENCY_REPORT.md) and [individual migration obligations](PROJECTED_IMPORT_OBLIGATIONS.csv): imports, re-exports, literal dynamic imports, callsite candidates, cycles and reverse dependents. Lexer limitations are recorded, not treated as runtime proof.
- [Integration registry](BRIDGE_REGISTRY.md): observed pairs/directions and injected database callsites; proposed contracts are not falsely advertised as existing APIs.
- [Authority trace](AUTHORITY_TRACE.md), [function decomposition](FUNCTION_OWNERSHIP.md), [migration crosswalk](SOURCE_RELOCATION_CROSSWALK.csv), [architecture rules](ARCHITECTURE_RULES.md), and [phase dependencies](PHASE_DEPENDENCIES.md).

## Historical evidence index

**RF00–RF02 historical audit and migration summary — COMPLETE (archived).** Detailed records remain in the [RF00 ledger](phases/RF00/LEDGER.md), [RF01 enforcement](RF01/ENFORCEMENT.md) and [ledger](phases/RF01/LEDGER.md), and [RF02 acceptance](RF02/ACCEPTANCE_MATRIX.md) and [ledger](phases/RF02/LEDGER.md). These snapshots do not establish RF04/RF05 completion.

**Current phase state:** RF04 and RF05 remain in progress. Follow their active scopes and ledgers. **RELEASE NOT AUTHORIZED.**
