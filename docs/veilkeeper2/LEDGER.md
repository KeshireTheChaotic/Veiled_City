# Veilkeeper 2.0 rebuild — R0 inventory checkpoint

**Inventory tooling complete; R0 acceptance gate remains open. R1–R8 are not implemented.**

Baseline: `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. Branch: `rebuild/veilkeeper2-audience-first`. The commit containing this ledger is the checkpoint commit; inspect with `git log -1 -- docs/veilkeeper2/LEDGER.md` rather than embedding a self-referential commit hash.

## Delivered and verified

- A fresh clone at `D:\Library\Development\Veiled_City_2\baseline` and dedicated Git worktree at `D:\Library\Development\Veiled_City_2\rebuild`. The desktop worktree tool rejected the nested clone as outside its exact workspace-root allowlist; native Git created the worktree successfully. The deprecated directory was not accessed or changed.
- The remote baseline branch was read with `git ls-remote`; it matched the pinned SHA. The complete handoff is preserved beside this ledger. Governing owner, Audience-First, Creative-First, Agency-Preserving, Weighted Lore and test protocol documents were read before any architecture change. No runtime architecture has been changed.
- Executable AST inventory and opt-in fresh tests under `bot/tooling/veilkeeper2/` and `bot/tests/veilkeeper2/`. Locked dependencies installed using `npm ci --ignore-scripts --no-audit --no-fund`; no dependency versions changed. `.gitignore` now excludes installed `node_modules`.
- Full file-byte SHA-256 manifest: 5,404 baseline tracked files. Parsed 1,077/1,077 runtime JS modules and 23 other non-test modules; zero parse failures and zero unresolved static imports in the final inventory. All 10,711 detected functions have source ranges and hashes. Import edges are resolved; callsites are recorded without pretending computed/injected dispatch has been resolved.
- Declarative Discord schema materialized without constructing a client or registering commands: 24 top-level commands, 219 leaf command paths, complete options and choices.
- Baseline SQL executed only in a fresh in-memory SQLite database: 55 tables, columns, defaults and foreign keys recorded. Static SQL and migration sites are recorded separately; JavaScript backfills have not been exercised.
- Complete native feature definitions and house errata retained in the catalog. Read-only source compilation verified all 153 feature occurrences against content. Baseline declarations classify 79 as supported and 74 as review-only; house errata classify 4 as supported and 13 as review-only. These are baseline declarations, **not new mechanical qualification**.
- 135 unique handoff source links checked against `git show` at the immutable commit. Twelve end ranges extend one line beyond the last actual line. The AST symbol audit found 145 overlapping definitions and two mismatches, corrected in SOURCE_REVIEW.md. Overlap is not proof of every semantic claim in the handoff.
- 535 historical test/fixture artifacts inventoried by filename/hash in the final output; no legacy test imported, reused, modified or executed. Early scanner iterations accidentally included fixture files in static analysis; final selection excludes them. No fixture was used as new test input or runtime evidence.

## Actual validation

Completed once on frozen audit code:

- Syntax: `node --check` on the three new tooling modules and the new test file: **4/4 passed**, exit 0.
- From `bot/`: `node tooling/veilkeeper2/test.mjs`, selecting only `node --test tests/veilkeeper2/r0-audit.test.mjs`: **5/5 passed**, zero failures/skips; Node-reported duration **65.0705 ms**, exit 0. Tests cover parser import/reexport resolution, dynamic/missing edges, function and callsite attribution, SQL detection, exact reference bounds, parse failure and conservative destination handling.
- Final inventory generation: `node bot/tooling/veilkeeper2/inventory.mjs`: exit 0, **7.8902051 seconds** tool-reported elapsed time. An initial root-path error was corrected before successful generation; subsequent generator changes refreshed only the inventory, not completed tests.
- `git diff --exit-code <baseline> -- bot/src bot/sql content`: exit 0. Legacy runtime, schema and content remain byte-equivalent under Git normalization.
- Exact source/test hashes, timestamps, runtime version and exit status: R0_TEST_EVIDENCE.json. Actual test output: R0_TEST_OUTPUT.txt. Artifact hashes: CHECKPOINT_HASHES.json.

These checks qualify the new audit helpers and generated source inventory only. They do not qualify gameplay, model quality, mechanical parity, migration, Discord delivery or release performance. No old suite, broad validation, model request, Discord send, production DB or deployment was used.

## Holds and deferred work

1. Module destinations are explicit **candidates**, not completed individual public-symbol dispositions. Resolve every exposed mechanic and authorization/publication contract to a reviewed destination, including methods returned from factories and re-exported through composition ports.
2. CALL_GRAPH.json contains all parsed callsites, but computed member calls, dependency-injected callbacks, string registries and event handlers still need semantic binding. Static reachability alone cannot establish zero consumers. No deletion is authorized.
3. STATE_SCHEMA.json is a structural inventory, not an importer or semantic source/receipt migration graph. Map JavaScript schema additions/backfills, embedded city-record variants, pending choices, original IDs, ACL lineage and uncertain publications. Build disposable dry-run and rollback evidence in R7.
4. RULE_CATALOG.json is exhaustive for the existing native feature file, not all core Daggerheart mechanics. Audit the other rule modules, command mechanics, class/domain/equipment rules and applicable official SRD text before asserting full parity. Existing review-only entries remain holds, not silently enabled handlers.
5. Character/GM-private formats are inventoried; semantic round-trip and imported private-hook isolation coverage are still pending. The old player/GM serializers remain intact.
6. Deployment documentation explicitly distinguishes historical offline evidence from live qualification. No live status claim, baseline latency/cost measurement, independent human quality review or cutover authorization exists here.

## Migration and rollback

No migration, data mutation, runtime replacement, deletion or deployment occurred. Both the frozen baseline checkout and rebuild worktree retain the original application and schema. No campaign database was copied or opened. The rollback for this checkpoint is to keep using the unchanged baseline; do not restore or overwrite any production database. Future migration must use verified read-only snapshots, preserve original IDs and recipient receipts, and prove reversibility before any cutover.

## Next exact phase

**Continue R0**, starting with factory/public-port and command-to-handler bindings in `bot/src/application/composition/`, `bot/src/framework-to-framework/`, `bot/src/commands.js`, and the source/receipt validators identified by CALL_GRAPH.json. Replace candidate destinations with reviewed symbol-level mappings and close rule/table/format completeness holds. Only then begin R1 in `bot/src/v2/` with a no-send application and the four generic capabilities described in GENERIC_NATIVE_API.md. R1–R8 remain requested work, not completed or waived phases.
