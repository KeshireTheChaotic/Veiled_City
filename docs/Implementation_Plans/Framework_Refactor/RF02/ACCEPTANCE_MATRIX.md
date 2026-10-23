# RF02 acceptance — representative migrations with explicit local holds

Intake `bd85d23da791285dbcc75ffdd6552e1d3a6dfdfd`, branch `codex/clean-ai-gm-2026-10`. **The master roadmap's representative low-coupling migration exit is satisfied. The complete candidate inventory is NOT migrated.** No new violation is hidden by that distinction; held original dependencies remain strict-gate debt. RF03 has not begun.

| Feature / contract | Actual evidence | Status |
|---|---|---|
| F01 generic exceptions and keyed queue | Classes/queue relocated, regex policy operations-owned, 37 consumers updated, old modules removed; 4 fresh tests | COMPLETE |
| F02 content index and root | Whole index moved unchanged, cwd/CONTENT_ROOT resolver extracted and used by actual config, disposable private/public/seeded Markdown + subprocess path tests; 5 tests | COMPLETE representative move; package workflow HELD |
| F03 logging and operational diagnostics | Logger and opening diagnostics moved unchanged; severity/argument/closed-field behavior verified; 4 tests | COMPLETE representative moves; shared telemetry/other mixed diagnostics HELD |
| F04 character file/text/archive slice | Live text/path/name callers migrated; ZIP encoding extracted to neutral kernel; real player export and explicit-scoped narrative ZIP exercised with fresh readers; 5 tests | COMPLETE pure slice; rules/observation/native persistence workflows HELD |
| F05 interaction text delivery | Module relocated behind explicit split capability, one existing command binding; reply/edit/follow-up/mentions/attachments/per-part source checks/uncertain error tested; 6 tests | COMPLETE representative helper; shared chunk/privacy/lifecycle HELD |
| F06 source linkage and helper integration | Fresh named-export existence regressions and actual relocated content→text→mock interaction with queue/stale exception; 11 tests | COMPLETE |
| Fresh affected-code evidence union | 4 + 5 + 4 + 5 + 6 + 11 = **35 current passing tests**, all terminal exit 0; unchanged successful batches retained, not repeated | PASS |
| Changed JS/MJS syntax | **68** current changed production/test files; no syntax failure | PASS |
| Exclusive current ownership | 385 scanned source/support modules, zero unowned | PASS |
| RF02 ratchet gate | Package command advanced explicitly to RF02, exit 0; **zero active violation groups/transition errors** | PASS |
| Strict architecture gate | Exit 1, **2813 raw obligations**, down from 2861; 2791 exact transition records, down 48 | EXPECTED remaining legacy debt |
| Baseline integrity | No new/enlarged/extended transition entries; immutable baseline unchanged | PASS |
| Large dependency cycle | Still 211 modules / 1120 cyclic import occurrences | NOT REMOVED; later decomposition required |
| Later-phase readiness | RF03-phase read-only gate snapshot fails with **75 RF02-expired records** | HELD; no deadline extension or RF03 execution |
| Old compatibility facades | Six retired source paths absent; no new old-path facade/re-export; mixed character modules retain real remaining workflow bodies | PASS |
| Preservation audit | 45 modified original modules' retained executable declarations preserved after explicit expected edits; 17 relocated declarations equivalent; 3 whole-file moves byte-identical | PASS, static AST/text evidence |
| Native state and operations | Schema/native catalog/errata/lockfile/Docker/content/CI unchanged; no production DB or service accessed | PASS static evidence; runtime not certified |
| ESM linkage | Requested names/default/aliases/JSON/stars touching new topology checked without evaluating source | PASS within tested static scope; not a complete ESM loader/ambiguity proof |
| Live startup/Discord, production recovery, dice, full native outbox and story quality | No such runtime execution authorized or performed | NOT QUALIFIED |

## Evidence integrity and failures

See [FINAL_EVIDENCE.json](FINAL_EVIDENCE.json), individual terminal files and [PRESERVATION_AUDIT.json](PRESERVATION_AUDIT.json). Tests are wholly new RF02 cases, never inherited suites/fixtures. No test polling. Logs are ignored local artifacts; terminal results and their digests are committed.

F04 first batch failed two newly authored filename expectations (3 pass/2 fail, exit 1). Existing normalization keeps the combining accent as `_`, producing `E_lan`; only tests were corrected. Repaired batch passed 5/5. No production naming behavior changed to satisfy the test.

An evidence-assembly command exceeded Node's default child-output buffer while reading the large historical transition manifest; the corrected read used a bounded 16 MiB buffer. Another byte comparison incorrectly treated Git-normalized versus working-tree CRLF text as product drift in the unchanged lockfile/errata. Corrected checks compare Git-normalized text and the existing intake raw SHA anchors; both match. Neither audit-assembly failure is counted as a passing test. F01 staged whitespace check reported the supplied Markdown's intentional trailing-space line breaks and one extra blank line at the extracted class file end; these are formatting observations, not gameplay changes or a claimed clean whitespace gate.

## Holds and rollback

[LOCAL_HOLDS.md](LOCAL_HOLDS.md) and its exact transition/candidate JSON identify retained modules, evidence, owner and smallest next step. No new limitation on GM creativity, PC agency or NPC autonomy was imposed; no owner decision is needed to retain original safe behavior. The next phase must resolve held boundaries under its own authorization; it may not silently renew expired RF02 exceptions.

Rollback local feature checkpoints newest first (F06→F01), first preserving later edits and reverting any documentation closeout. Do not reset/clean. Revert dependent source/public API/import/config changes and corresponding live transition removals together. No data/schema migration or rollback is needed. No push, merge, CI, deployment, restart, production DB access or paid providers. **RELEASE NOT AUTHORIZED.**
