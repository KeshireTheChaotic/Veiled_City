# Veiled City framework isolation

RF00 is an offline inventory and migration design, anchored to `f43d002693cb4ee38038b5dbb2c1049de95b3ffd` on `codex/clean-ai-gm-2026-10`. It does not relocate or modify application implementation. The owner handoff is preserved at [its supplied path](../phases/RF00/Veiled_City_RF00_Framework_Isolation_Sol_6_1_Medium_Handoff.md).

Read the [owner behavior specification](../OWNER_AI_GM_BEHAVIOR_SPEC.md), complementary [ENGINE constitution](../../../content/ENGINE/AI_GM_CONSTITUTION.md), [test policy](../TEST_PROTOCOL.md), [no-poll policy](../TEST_EXECUTION_NO_POLL.md), then the active [RF00 scope](phases/RF00/SCOPE.md) and feature pair. Historical P-series evidence remains unchanged.

## Current evidence

- [Repository inventory](REPOSITORY_INVENTORY.csv): every tracked path, metadata classification and accountable owner.
- [Application inventory](TRACKED_APPLICATION_INVENTORY.csv): runtime, support assets, SQL, scripts and tests. Historical tests and suite scripts are path/stat-only records, never executed or used as fixtures.
- [Source ownership](FRAMEWORK_OWNERSHIP.csv) and [explicit decisions](OWNERSHIP_DECISIONS.json): one owner per runtime source/support module, destination, rationale, exports, measured size/dependencies, side-effect candidates, risk and migration phase.
- [Dependency graph](DEPENDENCY_GRAPH.json), [readable report](DEPENDENCY_REPORT.md) and [individual migration obligations](PROJECTED_IMPORT_OBLIGATIONS.csv): imports, re-exports, literal dynamic imports, callsite candidates, cycles and reverse dependents. Lexer limitations are recorded, not treated as runtime proof.
- [Integration registry](BRIDGE_REGISTRY.md): observed pairs/directions and injected database callsites; proposed contracts are not falsely advertised as existing APIs.
- [Authority trace](AUTHORITY_TRACE.md), [function decomposition](FUNCTION_OWNERSHIP.md), [migration crosswalk](SOURCE_RELOCATION_CROSSWALK.csv), [architecture rules](ARCHITECTURE_RULES.md), and [phase dependencies](PHASE_DEPENDENCIES.md).

355 tracked `bot/src` paths have exclusive accountable owners. Two supported non-test CLI wrappers and two new offline audit modules are also source-classified. Initial graph: 2,283 import occurrences, 2,121 internal import occurrences, 1,374 projected ownership/public-contract obligations; one strongly connected component includes 211 modules. All individual edges are retained. These unresolved obligations explicitly prevent a claim of architectural isolation. The 63 proposed pairs are evidence-backed planning records, not 63 empty packages or established contracts.

## Reproduce the audit

From repository root: `node bot/tooling/architecture/inventory.mjs`. This reads Git paths and application source text and writes only this initiative's generated documentation. It never imports the inspected application, runs inherited tests, opens SQLite, starts Discord or calls a provider. Re-run only after relevant source/ownership changes; source hashes identify drift. The generated graph includes the new tooling under its own owner.

Fresh audit-tooling tests: `cd bot` then `node --test --test-concurrency=1 --test-reporter=tap tests/ai-gm-2026-10/rf00-f06.test.mjs`, one blocking frozen batch under the no-poll policy. RF00 does not requalify game mechanics or live services. See [phase ledger](phases/RF00/LEDGER.md) for actual terminal evidence.

RF01–RF07 remain incremental implementation work. No source relocation is approved as complete merely because its proposed destination exists in a CSV. **RELEASE NOT AUTHORIZED.**
