# P08 — OpeningDirector × Audience-First Integration: ledger

**Status:** IMPLEMENTATION COMPLETE — OFFLINE DELTA PASSED; RELEASE / LIVE ACCEPTANCE NOT AUTHORIZED.
**Reference:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` / `81569d08699343e401fc11ba1eaed0f10b4fd37a`.  
**GitHub reference check at plan preparation:** compare reference to target branch returned `identical`, `ahead_by=0`, `behind_by=0`. The live Codex checkout must still verify its actual HEAD and dirty worktree.

| Feature | Current status | Required evidence |
|---|---|---|
| [P08-F01](../../features/P08-F01/LEDGER.md) | COMPLETE / DOC-ONLY | Current-source crosswalk committed |
| [P08-F02](../../features/P08-F02/LEDGER.md) | COMPLETE / FINAL UNION PASS | GM-hook projection firewall; fresh canary tests |
| [P08-F03](../../features/P08-F03/LEDGER.md) | COMPLETE / FINAL UNION PASS | Contracted dramatic intent projection; semantic quality unqualified |
| [P08-F04](../../features/P08-F04/LEDGER.md) | IMPLEMENTED / FINAL UNION PASS | Separate additive cohort job, plan, writer scope and outbox identity |
| [P08-F05](../../features/P08-F05/LEDGER.md) | SUPPORTED BY EXISTING CODE / STATIC | Scoped world signals, NPC cognition, acknowledged continuity |
| [P08-F06](../../features/P08-F06/LEDGER.md) | COMPLETE / FINAL UNION PASS | Truthful owner fallback and coverage status |
| [P08-F07](../../features/P08-F07/LEDGER.md) | COMPLETE / FINAL UNION PASS | Scoped telemetry; no staging/provider claims |

## Phase-wide evidence register

| Field | Planned evidence / actual result |
|---|---|
| Status | **IMPLEMENTATION COMPLETE — NOT RELEASE QUALIFIED OR AUTHORIZED** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | Initial `293091d9e8cd4432c59f12f6e89991b4ed7a5be8`; P08 feature commits on `codex/clean-ai-gm-2026-10`; final F04 commit pending at ledger preparation. User-created P07/P09 plans remain unmodified and untracked. |
| Source crosswalk / finding revision | `../P08_SOURCE_CROSSWALK.md`; current-source findings reconciled. |
| Changed production/docs paths | F01–F07 ledgers/scopes and crosswalk; production `assembly-context.js`, `gm.js`, `pvp-output.js`, `opening-entry.js`, `session-opening-runner.js`, `assembly-publications.js`, `operational-metrics.js`, `opening-cohort-state.js`, `opening-cohort-runner.js`, `narrative-authority-context.js`, `commands.js`, two evidence helpers; five fresh tests. |
| New test files / source and test hashes | Only fresh `p08-f02`, `p08-f03`, `p08-f04`, `p08-f06`, `p08-f07`; exact hashes in F02/F03/F04/F06/F07 ledgers. |
| Test batch run ID, command, exit, counts | Final frozen union `p08-final-delta-20261022-02`; `node --test tests/ai-gm-2026-10/p08-f02.test.mjs tests/ai-gm-2026-10/p08-f03.test.mjs tests/ai-gm-2026-10/p08-f04.test.mjs tests/ai-gm-2026-10/p08-f06.test.mjs tests/ai-gm-2026-10/p08-f07.test.mjs`; exit 0; 11 passed, 0 failed/cancelled/skipped/todo; 0.758s. `node --check` on every changed JS file passed. No legacy tests or broad validation. |
| Provider calls/tokens/expense | Zero provider calls/tokens; $0 provider expense. |
| Cache/latency evidence | Scoped metric collection implemented; no provider/Discord latency or cache measurement executed. |
| Proposed new creative restriction / owner decision | None added. Existing PC agency, privacy, rules authority and creative freedom preserved in scoped changes. |
| Local holds / unknowns | F04 cross-process race and actual DB/outbox/Discord/restart paths untested; generated-goal semantic privacy and dramatic coverage are not verifiable offline; staging/provider behavior unverified. |
| Critical blockers | None. |
| Rollback | Revert feature commits individually; no persisted records or historical receipts changed by this work. |
| Release | NOT AUTHORIZED / NOT CERTIFIED |


## Phase implementation notes

- **Source baseline / branch / dirty tree:** Started clean of tracked edits at `293091d9e8cd4432c59f12f6e89991b4ed7a5be8` on requested branch; planning docs were preserved.
- **P08-F01 crosswalk and findings:** Completed; four privacy/brief/world/coverage gaps confirmed; initial vs later attendance paths and public-first order already existed.
- **Production changes:** F02 owner source allowlist; F03 source-bound dramatic intent; F04 separate additive cohort orchestration; F06 owner fallback and unverified coverage; F07 stage metrics. F05's actor-relative NPC cognition, visible agenda and acknowledged continuity were already supported by current native code.
- **Fresh batches:** Initial F02/F03/F06 batches passed. Final union `p08-final-delta-20261022-02` ran after all shared production edits and passed 11/11; exact command and hashes are in feature ledgers.
- **Syntax:** `node --check` on all changed JS in final union passed.
- **Safety:** Canary projection test and writer packet projection test passed. Semantic model-generated privacy is not proven.
- **Provider usage:** No paid/live providers; zero calls/tokens/$0. No provider cost or caching improvement claim.
- **Delivery/restart:** Native fallback/ack and separate cohort outbox paths preserve saved readers and delivery identities in code; end-to-end Discord/restart was not run.
- **Cohort:** F04 is implemented as a distinct session-keyed job/plan/scope/outbox flow; no historical plan or receipts are rewritten. Full database/outbox delivery and cross-process concurrency remain unverified.
- **Staging/release:** Not authorized; no release qualification.
- **Owner questions:** None pending; no new creative restriction was introduced.

## Final phase report format (fill only with observed data)

`PHASE | IMPLEMENTATION COMPLETE / LIVE ACCEPTANCE UNQUALIFIED | see final feature commit | F01-F07 and listed production modules | FINAL UNION: 11 PASS / 0 FAIL; JS CHECKS PASS | PROVIDER 0 / TOKENS 0 / COST $0 | TELEMETRY ADDED; NO LIVE CACHE/LATENCY SAMPLE | F04 DB/Discord/restart and semantic coverage unverified | NONE | NONE | FEATURE-COMMIT REVERTS; NO DATA MIGRATION | NOT AUTHORIZED`
