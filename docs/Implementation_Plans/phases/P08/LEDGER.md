# P08 — OpeningDirector × Audience-First Integration: ledger

**Status:** ORIGINAL IMPLEMENTATION COMPLETE; CORRECTIVE FRESH DELTA PASSED; HIGH-LIFECYCLE ACCEPTANCE PARTIALLY UNQUALIFIED; RELEASE NOT AUTHORIZED.
**Reference:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` / `81569d08699343e401fc11ba1eaed0f10b4fd37a`.  
**GitHub reference check at plan preparation:** compare reference to target branch returned `identical`, `ahead_by=0`, `behind_by=0`. The live Codex checkout must still verify its actual HEAD and dirty worktree.

| Feature | Current status | Required evidence |
|---|---|---|
| [P08-F01](../../features/P08-F01/LEDGER.md) | COMPLETE / DOC-ONLY | Current-source crosswalk committed |
| [P08-F02](../../features/P08-F02/LEDGER.md) | CORRECTIVE DELTA PASS / END-TO-END UNQUALIFIED | GM-hook projection firewall; fresh canary tests |
| [P08-F03](../../features/P08-F03/LEDGER.md) | CORRECTIVE DELTA PASS / END-TO-END UNQUALIFIED | Contracted dramatic intent projection; semantic quality unqualified |
| [P08-F04](../../features/P08-F04/LEDGER.md) | CORRECTIVE DELTA PASS / LIFECYCLE UNQUALIFIED | Separate additive cohort job, plan, writer scope and outbox identity |
| [P08-F05](../../features/P08-F05/LEDGER.md) | PLANNER AGENDA DELTA PASS / EPISTEMIC INTEGRATION UNQUALIFIED | Scoped world signals, NPC cognition, acknowledged continuity |
| [P08-F06](../../features/P08-F06/LEDGER.md) | CORRECTIVE DELTA PASS / END-TO-END UNQUALIFIED | Truthful owner fallback and coverage status |
| [P08-F07](../../features/P08-F07/LEDGER.md) | CORRECTIVE DELTA PASS / END-TO-END UNQUALIFIED | Scoped telemetry; no staging/provider claims |

## Phase-wide evidence register

| Field | Planned evidence / actual result |
|---|---|
| Status | **IMPLEMENTATION COMPLETE — NOT RELEASE QUALIFIED OR AUTHORIZED** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | Initial `293091d9e8cd4432c59f12f6e89991b4ed7a5be8`; implementation commit `25809f5b22966f8bcae6d244dd42b1772539846e` on `codex/clean-ai-gm-2026-10`. User-created P07/P08/P09 planning files outside the scoped feature docs remain unmodified and untracked. |
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
- **Feature commit sequence:** F01 `d0cd18a`; F02 `09eb0b7`; F03 `acfc8e2`; F04 `25809f5`; F05 `f2d7ba5`; F06 `cb848d9`; F07 `860ba47`. The F04 commit also records final union and phase status.

## Final phase report format (fill only with observed data)

`PHASE | IMPLEMENTATION COMPLETE / LIVE ACCEPTANCE UNQUALIFIED | see final feature commit | F01-F07 and listed production modules | FINAL UNION: 11 PASS / 0 FAIL; JS CHECKS PASS | PROVIDER 0 / TOKENS 0 / COST $0 | TELEMETRY ADDED; NO LIVE CACHE/LATENCY SAMPLE | F04 DB/Discord/restart and semantic coverage unverified | NONE | NONE | FEATURE-COMMIT REVERTS; NO DATA MIGRATION | NOT AUTHORIZED`

## Corrective Follow-up — 2026-10-22

| Field | Actual corrective evidence |
|---|---|
| Baseline | `codex/clean-ai-gm-2026-10`, HEAD `d52c5ac52f7a993e642af7d11a93101351717ea1`; tracked tree clean. Preserved unrelated untracked P07/P08/P09 planning docs untouched. |
| Corrective source | `docs/Implementation_Plans/phases/P08/Veiled_City_P08_Corrective_Handoff.md`; owner behavior spec and ENGINE constitution read in full. |
| Changed production | `bot/src/assembly-context.js`, `commands.js`, `opening-cohort-runner.js`, `opening-cohort-state.js`; exact SHA256 values in F02–F07 follow-up ledgers. |
| Fresh tests | `p08-f02-correction.test.mjs` (1), F03 (1), F04 (2, including actual `handleCommand` route with a mock Discord interaction), F05 (1), F06 (1), F07 (1); shared fresh SQLite fixture. Final `p08-corrective-delta-20261022-01`: `node --test tests/ai-gm-2026-10/p08-f02-correction.test.mjs tests/ai-gm-2026-10/p08-f03-correction.test.mjs tests/ai-gm-2026-10/p08-f04-correction.test.mjs tests/ai-gm-2026-10/p08-f05-correction.test.mjs tests/ai-gm-2026-10/p08-f06-correction.test.mjs tests/ai-gm-2026-10/p08-f07-correction.test.mjs`; exit 0; 7 passed, 0 failed/cancelled/skipped/todo; 1.524s. `node --check` on all 11 changed JS/MJS files passed in that blocking call. No poll/watch. |
| Repair history | First three attempts failed on incomplete new test fixtures (5/7, 6/7, 6/7); fixture repairs were batched. Final passing batch was not rerun. |
| Confidentiality and agency | SQLite canaries for nested `export_meta.visibility`, nested GM labels and deep metadata were excluded from owner writer projection; GM hook remained in planner-only native source. Planner `convergence_goal` canary did not enter public/owner writer brief. No PC action, feeling, speech, consent, position, resource or dice choice is produced by these changes. |
| Cohort / receipts | `/vc-session assemble` reaches the cohort gate after a valid terminal initial attempt without planning when no acknowledged camera exists. Source now resolves original camera through saved opening attempt, turn binding, public assembly delivery evidence and delivered Discord message IDs. Transactional claim, stale unsent revision replacement, positive camera/cohort publication, concurrent independent workers and crash/restart were not exercised end-to-end; those remain local holds. |
| World / coverage | Planner receives active native NPC/faction goal agenda scoped to current guild/session/scene and public scoped world opportunities. Disposable-SQLite test verified NPC/faction goal inclusion and no clock/canon/simulation-record mutation. False NPC belief, private clue, acknowledged-vs-unacknowledged memory and positive public cue projection remain unqualified. Coverage helper/status preserve `dramatic_coverage=unverified`; transport is not semantic proof. |
| Cost / cache | Zero provider calls/tokens; $0 provider cost. No cache added or exercised. Only observed corrective batch time is 1.524s; no live/staging latency or savings claim. |
| Local holds | Positive native outbox/Discord acknowledgement, immutable camera under changed viewpoint with real outbox records, multi-process idempotency, stale writer-await revocation, pause during actual send, restart recovery, full private entry/fallback delivery, world epistemic integration and semantic dramatic fulfillment. No new narrative restriction awaits owner answer. |
| Critical blockers / rollback / release | No critical blocker identified. Roll back only the four scoped production files and corrective tests/ledger entries; disposable test DBs were removed and no campaign data/receipt was changed. Release remains **NOT AUTHORIZED / NOT CERTIFIED**; no push, merge, CI, staging, provider, deployment or restart. |

### Corrective final frozen union — run `p08-corrective-delta-20261022-02`

A regression inspection found that mutable `world_context.requests` could make an opening's assembly fingerprint stale on the transition from queued to planning. The implementation was corrected to fingerprint stable audience-filtered planner beats only, and F05 gained a disposable-SQLite regression for the schedule→begin transition. The previous corrective union was rerun because this changed the production input and a feature test; this is the sole final union after repair.

| Evidence | Actual result |
|---|---|
| Branch / base / HEAD at execution | `codex/clean-ai-gm-2026-10`; base `d52c5ac52f7a993e642af7d11a93101351717ea1`; phase source HEAD remains that SHA until local commit. |
| Changed production SHA256 | `assembly-context.js` `2462ed0de5f8dfd0aad975fa5248340323f5a101d6d0a345bacf2ccd4bff5526`; `commands.js` `09b5fdd7f99c36d606d417f96414e62aef62c04137e745d85ea2989bbc8e8ab2`; `opening-cohort-runner.js` `d0520902e22c4432c22058ffbc082d4f5d384b1020b2cded5fd2411dd7136edd`; `opening-cohort-state.js` `3139aea484e74ebd066f1597dcfe01d7a27579973304535d2a74ceb06ada3b55`. |
| Fresh tests and SHA256 | fixture `4c2ad984a17eb29923df19d22a33123a450b40a13f055293bbfbe382a903b126`; F02 `86e9f7a182990c07359a4021cd757d4f7055f3268705b79a927715e6c22063d8`; F03 `4c04929b55dd78863a7c2d05db192aafb9f377d8c74272ab9db3d45a5eb18dfe`; F04 `48760a6934f22dafd57467424206209caf31badffda1d10bb6a424cdb7779781`; F05 `0f65cecd00dc7f3f548d11fcb20a10e8536a2665a235c23f6cc5b24f15d0d651`; F06 `22f9f301326b8e24284a47545eb61f20f913789b407565a60ac6b2b12d09bd1f`; F07 `9557262df1b840a9715d93f82317bae6142dd6b2b4c9d320c4f6681c2d538510`. |
| Exact test command | `node --test tests/ai-gm-2026-10/p08-f02-correction.test.mjs tests/ai-gm-2026-10/p08-f03-correction.test.mjs tests/ai-gm-2026-10/p08-f04-correction.test.mjs tests/ai-gm-2026-10/p08-f05-correction.test.mjs tests/ai-gm-2026-10/p08-f06-correction.test.mjs tests/ai-gm-2026-10/p08-f07-correction.test.mjs` from `bot/`. |
| Terminal result / syntax | Exit 0; 8 pass, 0 fail/cancelled/skipped/todo; 1.655 seconds. `node --check` passed on all 11 changed JS/MJS files in same blocking call. No polling. |
| Earlier attempts | Three initial fixture-failure runs were repaired. First final passing run `...-01` later became stale due fingerprint issue; rerun was justified by associated production/test change. This run is final. |
| Cost / cache | Provider calls 0; tokens 0; expense $0. No cache or live provider latency evidence. |
| Remaining local holds | Successful acknowledged camera→cohort outbox delivery, cross-process claim race, changed-viewpoint camera immutability with real outbox data, uncertain send/restart, pause during real transport, stale writer completion, full private fallback and NPC epistemic/semantic matrix. These are unverified, not claimed as passed. |
| Critical blocker / rollback / release | No critical blocker found. Roll back only corrective P08 production files, fresh tests and corresponding ledger/crosswalk addenda; test SQLite DBs removed, no campaign data/receipts touched. Release NOT AUTHORIZED / NOT CERTIFIED. |

### Expanded high-priority corrective qualification — 2026-10-22 — RUNNING / UNQUALIFIED

After the prior final union, F02 added a direct `openingEntryProjection` canary assertion and passed its focused batch: exit 0; 1 pass; 0.528s; updated F02 test SHA256 `f76aafd6078c73fc19f6a75134b5807897695a9c54f7d3f804c07380b0a6e3f9`. F04 then expanded real lifecycle tests and a two-process SQLite worker race harness. The focused F04 command passed `node --check` for its test and worker, and emitted six scenario-pass lines before the worker-contention case exceeded the shell's 30-second execution window without a terminal result. Per the mandatory no-poll rule, there was no polling or rerun; this expanded batch is RUNNING / UNQUALIFIED. Its final union has not been run. Fixture/test/worker hashes are recorded in F04's addendum. Thus A1–A9 are not all closed: positive initial camera→cohort flow, stale unsent refresh, pause-during-planning, and uncertain-send no-retry have scenario evidence in the uncompleted F04 invocation; cross-process overlap remains unverified. F02 writer/fallback acceptance and owner DM delivery remain unverified. Critical blockers: none identified. Release remains NOT AUTHORIZED / NOT CERTIFIED. Do not commit this still-unqualified expanded batch as supported feature evidence.

### P08 corrective completion — 2026-10-22 — PARTIAL / LOCAL HOLD

Baseline branch `codex/clean-ai-gm-2026-10` HEAD `45834f10de1087527c4c3941250980c726573dc4`; only pre-existing untracked handoff and acceptance documents were present, preserved without edits. Owner behavior spec, ENGINE constitution, root README, implementation README/CODEX_START_HERE, TEST_PROTOCOL, TEST_EXECUTION_NO_POLL, DECISION_GATES, P08 handoff/acceptance, phase scope/ledger and active F02–F07 scope/ledger pairs were read before source edits.

Changed production: `bot/src/assembly-context.js` (`2a58680aaf30cb54dc1af58ae682efc280720cfa4cdd8c5656a8e61061c9ba34`), `gm.js` (`9cfccfd5dcd85be0610ac0801e41782a56c3d786a47dc186ef7305ce2f1c7e8d`), `opening-cohort-runner.js` (`aab01dd46d842e9e538fc3c9e6d2d13233e0afd9f4d21a53a87105679f7bf9a7`), `db.js` (`7f63786fd09dbe2250933127bcb45705d2d4e68f738d128fc126b7545800b0f0`), `publication-outbox.js` (`33e09af4997e53b1fe5d853581b33fdc15cd5e8fbcfc9cd8c4aafd6d55c654a5`) and `publishing.js` (`72caa3589ca4cff56548b611a83b63fb28d997f77466532e762c5dcda3d5913b`). Fresh test/worker: `p08-correction-completion.test.mjs` SHA `d88142d5e2bb3b578f71a0a7dadb367dc0c198968d8d9ff92b2d75bfe8a3a06c`; `p08-correction-completion-worker.mjs` SHA `3b0aee2c85b01d380c99a759e12122d51e75e81286e5607ca0fbac1a033eea94`.

Final frozen fresh batch `p08-correction-completion-20261022-01` ran once after batched repairs. Exact command: `node --test tests/ai-gm-2026-10/p08-correction-completion.test.mjs` from `bot/`; exit 0, 6 pass, 0 fail/cancelled/skipped/todo, Node duration 2.103s (tool wall 2.9s). Same call ran eight changed-file syntax checks; all passed. `git diff --check` passed. Three prior blocking runs failed during fixture/harness/SQLite setup repairs; no tests were polled. No old or broad test was run. Provider calls 0, tokens 0, cost $0; no cache or live latency evidence.

Observed: the native GM planner request now includes bounded current NPC/faction goals and audience-filtered public opportunity hints separately; writer brief excludes GM planner goals and uses only optional audience-safe direction. Contradictory/nested GM labels fail closed and legitimate owner text survives. Original camera eligibility covers 0→2 and 1→2 while excluding original two-owner openings. SQLite transition CAS covers source/roster/attempt revision; two independent Node processes race on one persisted publication and only one claims it. SQLite busy timeout now allows bounded cross-process contention. Final pause/source gate is immediately before transport. No extra creative restriction, forced party formation, PC actions, knowledge, dice, mechanics or receipts were introduced.

Local holds: no full positive session-opening→camera ACK→two-owner cohort→public outbox/Discord mock and distinct owner-private publication test in this completion batch; cross-process whole-runner authoring/transport is unqualified beyond CAS; no after-commit restart/uncertain reconciliation, stale writer completion, real pause-during-send, real ACK ID persistence, generated semantic privacy/coverage, actor-relative belief/memory or live provider/Discord/staging validation. The previous expanded F04 run remains RUNNING / UNQUALIFIED, was not polled or rerun. This fresh test is bounded replacement evidence for CAS/harness mechanics, not a retroactive result for that batch. Cost/cache: provider 0, tokens 0, $0; no cache data. Rollback only six production files plus fresh test/worker and scoped P08/F02–F07 ledger/scope addenda; no DB migration or campaign state/receipt edits. No critical blocker observed; release NOT AUTHORIZED / NOT CERTIFIED.

### Superseding final completion union — `p08-correction-completion-20261022-02`

The expanded fresh test adds successful initial and additive opening paths. In both original-roster cases (zero owners and one owner), `runSessionOpening()` produced a delivered camera using the actual native accepted-output, SQLite outbox and mocked Discord boundary. After enough distinct owner check-ins, `runOpeningCohort()` produced and delivered exactly one additive public scene. Outbox rows had exact Discord message/channel IDs. Initial attempt source and receipt remained unchanged. No party membership, PC location, arrival or choice was added. Owner-private brief projections retained each owner's own note and excluded the other owner's. Cross-process tests used two independent Node workers and separate SQLite connections; one of two publication claims won, while separate authoring CAS checks rejected stale status/attempt/revision claims. The full runner was not raced across processes, so exactly one planner/writer/ACK across simultaneous whole jobs remains unqualified.

Final test SHA256 `cd4047d28201a2785c4362fe3e15c967210fa4957b4e2b6b9a28578617c62662`; worker SHA `3b0aee2c85b01d380c99a759e12122d51e75e81286e5607ca0fbac1a033eea94`. `node --test tests/ai-gm-2026-10/p08-correction-completion.test.mjs` from `bot/` exited 0 with 7 passed, 0 failed/cancelled/skipped/todo in 3.780s. Six changed production JS plus both fresh MJS syntax checks passed in the same blocking call; `git diff --check` passed. This replaces the prior six-test completion result. Earlier failed fixture/harness runs were repaired; one expanded test query failed and was repaired before the final result. The old expanded F04 run remains RUNNING/UNQUALIFIED and was not polled or rerun.

Remaining holds: actual late-owner private DM delivery (only distinct private projections plus original-owner output were exercised), full runner cross-process single planner/writer contention, crash after commit, uncertain-send restart/reconciliation, real Discord/provider behavior, semantic scene fulfillment/coverage, false-belief and acknowledged-memory matrix, and live latency/cost. There were zero provider calls, zero tokens and $0; no cache or live latency evidence. No production data/receipts were read or written. No new narrative restriction was introduced; release remains NOT AUTHORIZED / NOT CERTIFIED.

### Final post-guard changed-code batch — `p08-correction-completion-20261022-02`

After the final `publishing.js` edit added source/pause checks after Discord recipient/channel lookup and before actual public/private transport, the completion suite ran once more. Exact command from `bot/`: `node --test tests/ai-gm-2026-10/p08-correction-completion.test.mjs`; terminal exit 0, 7 pass, 0 fail/cancelled/skipped/todo, 3.664s. All six modified JS modules and both new MJS test files passed `node --check` in the same call. Test SHA `cd4047d28201a2785c4362fe3e15c967210fa4957b4e2b6b9a28578617c62662`; final production hashes: `assembly-context.js` `2edd45ad2eea844eaf969e794c35bcf18cdd9898c43232c33f644da53d313d15`, `gm.js` `9cfccfd5dcd85be0610ac0801e41782a56c3d786a47dc186ef7305ce2f1c7e8d`, `opening-cohort-runner.js` `aab01dd46d842e9e538fc3c9e6d2d13233e0afd9f4d21a53a87105679f7bf9a7`, `db.js` `7f63786fd09dbe2250933127bcb45705d2d4e68f738d128fc126b7545800b0f0`, `publication-outbox.js` `33e09af4997e53b1fe5d853581b33fdc15cd5e8fbcfc9cd8c4aafd6d55c654a5`, `publishing.js` `e28278c4be8d686209608fa56d8a713daef7474fbd643eb3e87cc96e6fe8eeab`. `git diff --check` passed. No change to code/tests followed this run.

The offline test proves zero→two and one→two successful opening/cohort publication with exact mocked ACKs, two private packet projections with independent source notes, preserved original camera receipt identity, no party/location assignment, nested confidentiality, actual planner agenda serialization and writer confidentiality, source-bound authoring CAS, and one process-level publication claimant across two SQLite workers. It does not prove whole-runner cross-process single author/writer/ACK, private late-owner DM send, crash/restart uncertain-send safety, actual Discord/provider, or semantic narrative coverage. No user production data/receipts were read or written. Provider 0 calls/tokens/$0; no cache or live latency evidence. Release NOT AUTHORIZED / NOT CERTIFIED.

### Terminal test evidence after receipt-snapshot refinement

Run `p08-correction-completion-20261022-02`; test `p08-correction-completion.test.mjs` final SHA256 `97151ba29fb1faed6bccdda7db0822029061fb85ad83a869b4b3b5a0848f81a8`. Command from `bot/`: `node --test tests/ai-gm-2026-10/p08-correction-completion.test.mjs`; exit 0; 7 passed, 0 failed/cancelled/skipped/todo; 3.696s. The two happy-path scenarios now compare every immutable initial camera outbox ID, turn binding, status and mock Discord ACK before/after additive publication; all are identical. All six changed JS and both fresh MJS syntax checks passed in the same blocking call; `git diff --check` passed. This supersedes the earlier test hash/timing; no production or test source changed after this run. Remaining local holds remain unchanged.
