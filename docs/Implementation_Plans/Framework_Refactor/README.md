# Veiled City framework isolation

> Current checkpoint (2026-10-26): RF04 and RF05 are implemented in part and remain open. The current-code [audit](AUDIT-20261026/BEFORE.json), [reopened local holds](AUDIT-20261026/LOCAL_HOLDS.md), [adjusted execution plan](AUDIT-20261026/PLAN.md), and [current source crosswalk](AUDIT-20261026/CURRENT_SOURCE_CROSSWALK.csv) supersede the historical checkpoint summaries below. At the audit baseline: 599 source modules, zero unowned, 2,391 exact transitions, a 181-module cycle, RF03/RF04 ratchets pass with accepted debt, RF05 fails on 950 expired RF04 records. No baseline expansion or deadline renewal. RELEASE NOT AUTHORIZED.

RF00 is an offline inventory and migration design, anchored to `f43d002693cb4ee38038b5dbb2c1049de95b3ffd` on `codex/clean-ai-gm-2026-10`. It does not relocate or modify application implementation. The owner handoff is preserved at [its supplied path](../phases/RF00/Veiled_City_RF00_Framework_Isolation_Sol_6_1_Medium_Handoff.md).

After reopened C03-P04/C23/C05 and Intent C03: [current evidence](AUDIT-20261026/CURRENT.json) records 608 modules, 2,382 exact open transitions, nine retired since audit, RF04 ratchet pass with accepted debt, and RF05 failure on 943 expired RF04 groups/errors. Narrative–World grant/source, Intent–World schema, Knowledge–World evidence event and the Intent dependency engine now have real consumer evidence. Wider phase obligations remain open.

Read root AGENTS.md first, then the [owner behavior specification](../OWNER_AI_GM_BEHAVIOR_SPEC.md), complementary [ENGINE constitution](../../../content/ENGINE/AI_GM_CONSTITUTION.md), [test policy](../TEST_PROTOCOL.md), [no-poll policy](../TEST_EXECUTION_NO_POLL.md), then the active [RF02 scope](phases/RF02/SCOPE.md) and feature pair. Historical P-series and RF00/RF01 audit evidence remain unchanged; the live package policy and exact transition list evolve with authorized migrations.

## Current evidence

- [Repository inventory](REPOSITORY_INVENTORY.csv): every tracked path, metadata classification and accountable owner.
- [Application inventory](TRACKED_APPLICATION_INVENTORY.csv): runtime, support assets, SQL, scripts and tests. Historical tests and suite scripts are path/stat-only records, never executed or used as fixtures.
- [Source ownership](FRAMEWORK_OWNERSHIP.csv) and [explicit decisions](OWNERSHIP_DECISIONS.json): one owner per runtime source/support module, destination, rationale, exports, measured size/dependencies, side-effect candidates, risk and migration phase.
- [Dependency graph](DEPENDENCY_GRAPH.json), [readable report](DEPENDENCY_REPORT.md) and [individual migration obligations](PROJECTED_IMPORT_OBLIGATIONS.csv): imports, re-exports, literal dynamic imports, callsite candidates, cycles and reverse dependents. Lexer limitations are recorded, not treated as runtime proof.
- [Integration registry](BRIDGE_REGISTRY.md): observed pairs/directions and injected database callsites; proposed contracts are not falsely advertised as existing APIs.
- [Authority trace](AUTHORITY_TRACE.md), [function decomposition](FUNCTION_OWNERSHIP.md), [migration crosswalk](SOURCE_RELOCATION_CROSSWALK.csv), [architecture rules](ARCHITECTURE_RULES.md), and [phase dependencies](PHASE_DEPENDENCIES.md).

355 tracked `bot/src` paths have exclusive accountable owners. Two supported non-test CLI wrappers and two new offline audit modules are also source-classified. Initial graph: 2,283 import occurrences, 2,121 internal import occurrences, 1,374 projected ownership/public-contract obligations; one strongly connected component includes 211 modules. All individual edges are retained. These unresolved obligations explicitly prevent a claim of architectural isolation. The 63 proposed pairs are evidence-backed planning records, not 63 empty packages or established contracts.

## Historical checkpoint — RF02

The owner lifted RF02's hold in the [kickoff](RF02/KICKOFF.md). Six old implementation paths are retired through actual moves/splits; two mixed character files have pure slices extracted. [Acceptance](RF02/ACCEPTANCE_MATRIX.md), [relocation crosswalk](RF02/RELOCATION_CROSSWALK.csv), [current ownership](RF02/CURRENT_OWNERSHIP.csv), [graph](RF02/CURRENT_DEPENDENCY_GRAPH.json), [bridge status](RF02/CURRENT_BRIDGE_REGISTRY.md) and [phase ledger](phases/RF02/LEDGER.md) record the actual scope and evidence.

35 fresh RF02 tests passed, with 68 changed-file syntax checks. `architecture:check` now explicitly runs RF02 rules and passes zero new/unaccepted violations; strict mode exposes 2813 raw obligations. The 211-module cycle remains. 75 retained RF02-deadline records block a later-phase gate; the [local holds](RF02/LOCAL_HOLDS.md) are not secretly renewed. RF03 has **not** started. This satisfies the master's representative RF02 exit, not the whole candidate inventory or full isolation.

## Executable gate established in RF01

`npm --prefix bot run architecture:check` checks current source ownership, parsed imports, exact public APIs/pairs/consumers and counted expiring legacy debt. `npm --prefix bot run architecture:strict` exposes all raw debt and intentionally fails while migration remains incomplete. See [policy and limitations](RF01/ENFORCEMENT.md), [phase ledger](phases/RF01/LEDGER.md) and [acceptance matrix](RF01/ACCEPTANCE_MATRIX.md). New source cannot use a legacy exception; adding an edge to the existing 211-module cycle fails even if its membership is unchanged.

RF01's two transparent injected contracts and explicit application composition remain implemented and tested. Existing native runners have not adopted those two adapters. RF02 subsequently performs the separately authorized representative migrations above. Strict architectural isolation is not yet achieved.

## Historical RF00 audit

RF00 used `node bot/tooling/architecture/inventory.mjs` against its explicit legacy ownership inventory. Its frozen outputs remain historical migration evidence. Do not run it over the new package topology or overwrite that audit to make an enforcement gate pass; use RF01's checker/current ownership evidence instead.

RF00's original test result remains in its [ledger](phases/RF00/LEDGER.md); it was not rerun or reused for RF01. Only newly authored RF01 feature tests were executed, with blocking terminal evidence. Neither phase requalifies game mechanics or live services.

Held RF02 candidates and RF03–RF07 remain incremental implementation work. No source relocation is approved as complete merely because its proposed destination exists in a CSV. **RELEASE NOT AUTHORIZED.**
