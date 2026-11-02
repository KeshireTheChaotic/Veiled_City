# R0 — public bindings and effective schema

**Completed audit slice; R0 removal/migration gate remains open.** Baseline `1ba6c7e15db1a66ba34b36336f31437beffe44d6`; dedicated branch `rebuild/veilkeeper2-audience-first`. This report's containing commit is the exact audit checkpoint (`git log -1 -- docs/veilkeeper2/R0_BINDING_REPORT.md`).

Implemented AST resolution for named exports, aliases, wildcard exports, namespace imports, cycles, conflicts, explicit `.bind(...)` calls, factory return objects, and route-dependent command branches. `PUBLIC_BINDINGS.json` resolves 4,224 exports and 4,909 imported bindings across all 1,077 pinned runtime modules, with zero unresolved declarations. `COMPOSITION_BINDINGS.json` records 333 explicit bindings and 821 returned object contracts. This is declaration/source resolution, not proof of every runtime invocation.

`COMMAND_BINDINGS.json` maps all 219 command paths through the actual root aliases and existing branch conditions, including delegated city, story and simulation handlers. Each has a source branch, candidate calls, native source-definition chains and a destination. Conditional input operations and unknown runtime guards remain explicit. No Discord interaction was executed; no authorization or command behavior pass is claimed.

`PUBLIC_DISPOSITIONS.json` gives every exported symbol a named port/retain/replace destination and responsible phase. Destinations establish implementation obligations, not completed ports. `RECORD_CONTRACTS.json` records 2,911 source callsites, 456 literal record kinds and 1,009 dynamic/unfiltered uses. All dynamic uses remain explicit holds against removal or automatic schema conversion; opaque historical payloads must survive until typed projections are proved.

`EFFECTIVE_SCHEMA.json` supplements the original SQL-only inventory with all 33 statically resolved `add()` calls from `migrateSchema`. Four columns are absent from `schema.sql` but present after startup: `campaigns.director_paused`, `facts.archived`, `facts.provenance_json`, `facts.confidence`. All 55 tables now have named persistence destinations, original primary keys and scope/source/status columns. Thread primary-key conversion, relationship backfill and schema version 460 have separate source-linked migration obligations. No existing database or migration body was executed; only extracted column definitions were applied to a new in-memory SQLite schema.

The [official SRD page](https://www.daggerheart.com/srd/) currently identifies Daggerheart SRD 2.0 and its August 25, 2026 change date, matching the pinned catalog's declared edition. Full rule text and algorithm-by-algorithm parity remain R3 work.

Validation completed:

- `node --test tests/veilkeeper2/r0-bindings.test.mjs tests/veilkeeper2/r0-schema.test.mjs`: **8/8 passed**, zero skipped/failed, exit 0, **71.7408 ms** Node duration. Fresh authored source fixtures only; no legacy suites/fixtures imported or repurposed. Exact tested-file hashes and timestamps are in R0_BINDING_TEST_EVIDENCE.json.
- Syntax passed for both analyzers, both generation entrypoints and both fresh tests. The record-report entrypoint also passed syntax. Original five audit tests were not rerun because their tested helper did not change.
- Binding generation exited 0 in **3.4171505 s**; effective-schema generation exited 0 in **0.2767048 s**; record/destination generation exited 0 in **1.4132331 s** (tool elapsed). A later schema-report refresh corrects only source line labels; no tested analyzer changed.

Files: new `binding-audit.mjs`, `bindings.mjs`, `schema-audit.mjs`, `schema.mjs`, `records.mjs`, two fresh tests and the reports above. The original generator's unchanged-legacy-source guard now excludes only the new `bot/src/v2` root, so new isolated implementation does not invalidate the pinned legacy audit.

Rollback: audit files only; legacy runtime, schema and content unchanged. No deletion, migration or deployment. Original CHECKPOINT_HASHES.json belongs to commit `4a0a6e4c`; it is historical evidence, not a claim about subsequently edited reports. New slice hashes are in R0_BINDING_HASHES.json.

Next: close dynamic record/provider contracts per migration boundary and verify public mechanics against authoritative rules. These remain release/removal holds. Isolated R1 preparation can proceed without using, removing or converting any unresolved legacy path; full R0 acceptance is not being silently waived.
