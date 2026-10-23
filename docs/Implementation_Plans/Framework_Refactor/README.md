# Veiled City framework isolation

RF00 is an offline inventory and migration design, anchored to `f43d002693cb4ee38038b5dbb2c1049de95b3ffd` on `codex/clean-ai-gm-2026-10`. It does not relocate or modify application implementation. The owner handoff is preserved at [its supplied path](../phases/RF00/Veiled_City_RF00_Framework_Isolation_Sol_6_1_Medium_Handoff.md).

Read root AGENTS.md first, then the [owner behavior specification](../OWNER_AI_GM_BEHAVIOR_SPEC.md), complementary [ENGINE constitution](../../../content/ENGINE/AI_GM_CONSTITUTION.md), [test policy](../TEST_PROTOCOL.md), [no-poll policy](../TEST_EXECUTION_NO_POLL.md), then the active [RF01 scope](phases/RF01/SCOPE.md) and feature pair. Historical P-series and RF00 audit evidence remain unchanged except the current registry now has an explicitly preserved RF00 snapshot.

## Current evidence

- [Repository inventory](REPOSITORY_INVENTORY.csv): every tracked path, metadata classification and accountable owner.
- [Application inventory](TRACKED_APPLICATION_INVENTORY.csv): runtime, support assets, SQL, scripts and tests. Historical tests and suite scripts are path/stat-only records, never executed or used as fixtures.
- [Source ownership](FRAMEWORK_OWNERSHIP.csv) and [explicit decisions](OWNERSHIP_DECISIONS.json): one owner per runtime source/support module, destination, rationale, exports, measured size/dependencies, side-effect candidates, risk and migration phase.
- [Dependency graph](DEPENDENCY_GRAPH.json), [readable report](DEPENDENCY_REPORT.md) and [individual migration obligations](PROJECTED_IMPORT_OBLIGATIONS.csv): imports, re-exports, literal dynamic imports, callsite candidates, cycles and reverse dependents. Lexer limitations are recorded, not treated as runtime proof.
- [Integration registry](BRIDGE_REGISTRY.md): observed pairs/directions and injected database callsites; proposed contracts are not falsely advertised as existing APIs.
- [Authority trace](AUTHORITY_TRACE.md), [function decomposition](FUNCTION_OWNERSHIP.md), [migration crosswalk](SOURCE_RELOCATION_CROSSWALK.csv), [architecture rules](ARCHITECTURE_RULES.md), and [phase dependencies](PHASE_DEPENDENCIES.md).

355 tracked `bot/src` paths have exclusive accountable owners. Two supported non-test CLI wrappers and two new offline audit modules are also source-classified. Initial graph: 2,283 import occurrences, 2,121 internal import occurrences, 1,374 projected ownership/public-contract obligations; one strongly connected component includes 211 modules. All individual edges are retained. These unresolved obligations explicitly prevent a claim of architectural isolation. The 63 proposed pairs are evidence-backed planning records, not 63 empty packages or established contracts.

## Current executable gate — RF01

`npm --prefix bot run architecture:check` checks current source ownership, parsed imports, exact public APIs/pairs/consumers and counted expiring legacy debt. `npm --prefix bot run architecture:strict` exposes all raw debt and intentionally fails while migration remains incomplete. See [policy and limitations](RF01/ENFORCEMENT.md), [phase ledger](phases/RF01/LEDGER.md) and [acceptance matrix](RF01/ACCEPTANCE_MATRIX.md). New source cannot use a legacy exception; adding an edge to the existing 211-module cycle fails even if its membership is unchanged.

Two transparent injected contracts and explicit application composition are implemented and tested. Existing native runners have not adopted them. RF02 file migrations have **not** begun; the owner has held them. Strict architectural isolation is not yet achieved.

## Historical RF00 audit

RF00 used `node bot/tooling/architecture/inventory.mjs` against its explicit legacy ownership inventory. Its frozen outputs remain historical migration evidence. Do not run it over the new package topology or overwrite that audit to make an enforcement gate pass; use RF01's checker/current ownership evidence instead.

RF00's original test result remains in its [ledger](phases/RF00/LEDGER.md); it was not rerun or reused for RF01. Only newly authored RF01 feature tests were executed, with blocking terminal evidence. Neither phase requalifies game mechanics or live services.

RF02–RF07 remain incremental implementation work. No source relocation is approved as complete merely because its proposed destination exists in a CSV. **RELEASE NOT AUTHORIZED.**
