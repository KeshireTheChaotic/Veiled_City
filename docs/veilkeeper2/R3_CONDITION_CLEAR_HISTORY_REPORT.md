# R3 — historical native condition clears

Implementation slice complete. R3 and all R0–R8 acceptance gates remain incomplete.

Added rules/condition-clear-history.js: deterministic read-only inspection of a previously committed condition clear, after the original condition/effect has been independently validated. Its inspector body matches the audited upstream condition-recovery-rules.js at 15a8f44671f227c6bec69bf30744e03c5692809b exactly (line endings normalized). The original audit pin predates the historical/current-owner distinction; this port deliberately preserves the newer historical authority checks. Remote baseline and rebuild refs were rechecked unchanged on 2026-11-11. No old runtime module is imported, no legacy typed-intent classifier is revived, and no AI capability is added.

The reader verifies condition, clear receipt, native publication, exact before/after ledger transition, original human-authored source/span/owner audit, original scene/session/controller revision, private scope and successful/no-roll outcome. Today's owner, attendance or location does not rewrite sealed historical authority. Historical typed_intent rows are evidence only. This function cannot authorize a new clear or independently establish original condition ancestry.

Expanded legacy-readonly-repository.js with guild-scoped native mutation-row and owner-authored source-index reads. Callers use its synchronous validation snapshot. No SQL writes, migrations or inference access were added; raw native source data may be private and remains outside model context.

44 distinct checks passed across six affected native test files, Node v26.13.0. New independent SQLite fixtures: 14 checks in 1378.9984 ms; 30 changed-import-dependent checks in 3027.9754 ms. Dependency log: .reports/r3-condition-clear-history-dependencies-20261111.txt. The focused test was not rerun after passing. Coverage includes public/private valid history with changed current ownership, read-only source hashes, guild isolation, altered statuses/authority/audit/session/source spans/outcome, resealed unrelated-condition changes, private scope expansion, stale rows and altered raw text. These are local native checks, not Discord, model or human-quality acceptance. Source/test hashes and the exact affected list accompany this report.

Modified files: native legacy read repository; new condition-clear-history reader; new r3-condition-clear-history.test.mjs; this report and associated hashes/affected list. Existing tests, source databases and unrelated README/line-ending work are preserved.

Migration/rollback: additive, uncomposed read-only native adapter. No stored state/schema changed, no new gameplay operation issued, and no legacy code/tests retired. Removing this unused reader and the added read methods leaves runtime persistence unchanged. This does not establish populated-state adoption or full migration rollback. No major-phase merge/push, live Discord request or production mutation occurred.

Known holds: original condition/effect/parent feature, owner reaction, GM cost and expiry validators still require assembly. Missing or malformed evidence holds; the reader is not a substitute for those validators. Root gameplay does not yet consume this inspector or authorize ordinary owner rolls. Runtime rules parity, living-world behavior, migration and live quality remain unqualified.

Next exact R3 work: assemble original condition ancestry over the same source snapshot, including actual effect, feature, reaction and GM cost validators; then compose complete condition discovery, source-qualified modifiers, owner notices/dice/Fear and atomic outcomes. Continue all R0–R8 phases. Computer use remains forbidden.
