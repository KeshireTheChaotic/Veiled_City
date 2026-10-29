# Veiled City framework isolation

> Latest qualified checkpoint (2026-10-29): C182-C185 Knowledge memory services and C186 Session assembly context are committed, with Live Play changes integrated at `38e83880`. Five fresh cases pass 5/5; the affected narrative-memory integration case passes 1/1. Merged-source syntax and RF04 ratchet pass; RF05 retains 46 unresolved groups/errors at 851 modules. See the [merge verification](features/RF04-F06/C182-C186-MERGE-VERIFICATION.md) and [RF04 ledger](phases/RF04/LEDGER.md). This finishing checkpoint is ready for the authorized target fast-forward and temporary-worktree archival, followed by pause. RF04 remains incomplete; C187 remains design only.

The following checkpoints are historical. Their counts and holds must be checked against the current phase ledger before resuming work.

> Current checkpoint (2026-10-27, through C73): RF04 and RF05 are implemented in part and remain open. The current-code [audit](AUDIT-20261026/BEFORE.json), [reopened local holds](AUDIT-20261026/LOCAL_HOLDS.md), [adjusted execution plan](AUDIT-20261026/PLAN.md), and [current source crosswalk](AUDIT-20261026/CURRENT_SOURCE_CROSSWALK.csv) supersede the historical checkpoint summaries below. At the audit baseline: 599 source modules, zero unowned, 2,391 exact transitions, a 181-module cycle, RF03/RF04 ratchets pass with accepted debt, RF05 fails on 950 expired RF04 records. No baseline expansion or deadline renewal. RELEASE NOT AUTHORIZED.

RF00 is an offline inventory and migration design, anchored to `f43d002693cb4ee38038b5dbb2c1049de95b3ffd` on `codex/clean-ai-gm-2026-10`. It does not relocate or modify application implementation. The owner handoff is preserved at [its supplied path](../phases/RF00/Veiled_City_RF00_Framework_Isolation_Sol_6_1_Medium_Handoff.md).

[Exact checkpoint commits](AUDIT-20261026/CHECKPOINTS.json) now run through C73 at `7055e001edb69f830871b134eb01a9914dd67d9a`. The latest coordinated ratchet recorded in the [RF04 ledger](phases/RF04/LEDGER.md) passes RF04 at 765 modules, zero unowned, three cycles with the largest at 104 modules, 1,604 accepted legacy occurrences and zero active violations; RF05 fails on 328 groups/errors. The transition manifest holds 1,590 entries. RF03, RF06 and RF07 gates and the exact open/resolved counts (1,958 open, 433 resolved) were last derived at C40 in [current source evidence](AUDIT-20261026/CURRENT.json). Scoped integration since C40 adds native NPC seed, testimony, staffing and reference evidence, World calendar and fact proofs, Session and World ports for native rules, root shim removal, and the native environment engine moving into Daggerheart (C65). C66–C73 route World, Knowledge and Session readers through existing ports; RF04-F03 C72 is a local hold. Several C65–C73 tests imported unchanged production modules and are diagnostic only under the [test protocol](../TEST_PROTOCOL.md); their compliant replacements qualify forwarding with fakes, not positive workflows, saved databases or startup. RF04/RF05 remain incomplete. Owner requires all new tests and logs local only: tests registered from C38 onward are absent from a clean checkout until supplied locally, and architecture verification there will fail with INVALID_BRIDGE_TEST_REFERENCE. Committed hashes/results qualify only the tested working-tree bytes. C39/C40 final-file gaps after fixture repairs are explicitly retained; no broad legacy test, clean-checkout, live-service or release certification.

Read root AGENTS.md first, then the [owner behavior specification](../OWNER_AI_GM_BEHAVIOR_SPEC.md), complementary [ENGINE constitution](../../../content/ENGINE/AI_GM_CONSTITUTION.md), [test policy](../TEST_PROTOCOL.md), [no-poll policy](../TEST_EXECUTION_NO_POLL.md), then the current [RF04 scope](phases/RF04/SCOPE.md), [RF05 scope](phases/RF05/SCOPE.md), and only the active feature scope/ledger. Historical P-series and RF00/RF01 audit evidence remain unchanged; the live package policy and exact transition list evolve with authorized migrations.

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
