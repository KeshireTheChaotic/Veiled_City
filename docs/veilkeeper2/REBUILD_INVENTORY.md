# R0 inventory

**R0 complete — inventory and disposition gate, 2026-11-14.** Current acceptance: [R0_PHASE_REPORT.md](R0_PHASE_REPORT.md), [R0_PHASE_ACCEPTANCE.json](R0_PHASE_ACCEPTANCE.json). The frozen structural snapshot below remains historical; its earlier hold is superseded for inventory acceptance only. R3 mechanical parity, R7 migration and R8 removal/release gates remain open.

Fresh Git-object verification covers all1099 pinned /1123 upstream source files,1077/1101 JavaScript modules,4224/4327 public endpoints,219 command routes and55 effective tables per revision. R0_PHASE_PRESERVATION_MAP.json assigns11495 exact source-bound preservation destinations across both revisions; planned native replacements remain gated. R0_SOURCE_RECEIPT_GRAPH.json includes imports, public definitions, bindings, command branches, rule definitions/registrations, schema, record provenance expressions and535/560 historical test artifacts. R0_VERIFIED_REFERENCES.json verifies270 citation locations across both revisions, preserving29 explicit corrections.

All4353 dynamic/injected contract occurrences across the two revisions remain explicit blockers to native adoption/deletion. None were guessed resolved or classified public. No deletion is proposed, so no zero-consumer proof is asserted. The baseline production runtime remains retained until the later replacement/migration gates pass.

Baseline: `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. Generated with `node bot/tooling/veilkeeper2/inventory.mjs`.

- baseline: 1ba6c7e15db1a66ba34b36336f31437beffe44d6
- head: 1ba6c7e15db1a66ba34b36336f31437beffe44d6
- trackedFiles: 5404
- parsedModules: 1100
- runtimeModules: 1077
- functions: 10711
- imports: 4480
- unresolvedImports: 0
- parseErrors: 0
- commands: 24
- commandLeaves: 219
- tables: 55
- referenceRanges: 135
- invalidReferences: 12
- legacyTestArtifacts: 535
- contentFiles: 66
- gate: R0 HOLD: candidate dispositions, dynamic call binding, migration and mechanic completeness need review

The complete tracked-file hash manifest, AST module/function/import/callsite graph, command schema, SQL tables and foreign keys, source-reference hashes, rule definitions and registration sites are adjacent JSON artifacts. Every parsed runtime module has a candidate destination in MODULE_DISPOSITIONS.json. These are review obligations, not approved deletions.

No runtime, campaign, migration, live model, or Discord execution has occurred. No legacy test was run. Historical test paths/hashes identify coverage obligations only. No source/receipt graph or dynamic dispatch completeness is claimed.
