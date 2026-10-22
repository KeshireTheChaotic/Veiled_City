# P08-F02 — GM-private hook and knowledge firewall: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **ORIGINAL PASS RETAINED; CORRECTIVE DELTA PASSED; DELIVERY / ASYNC REVOCATION UNQUALIFIED** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | Baseline `d0cd18a1364cfc6fc5c10f344399a8e496e18046`; only F02 source/test plus this feature's plan files added by this feature. |
| Source crosswalk / finding revision | F01 crosswalk confirmed `gm_hooks` in owner material and separate GM planner input. F02 removes the former and retains the latter. |
| Changed production/docs paths | `bot/src/assembly-context.js`; `bot/tests/ai-gm-2026-10/p08-f02.test.mjs`; this feature scope and ledger. |
| New test files / source and test hashes | Source `aa92b83b6e45816acf3d1c652b1fb5b632cfcf16`; test `38bd601a0e695bf04bde20b5799b60e5947757db`. |
| Test batch run ID, command, exit, counts | `p08-f02-20261022-01`; `node --test tests/ai-gm-2026-10/p08-f02.test.mjs` from `bot/`; exit 0; 1 passed, 0 failed/skipped; 0.350s; `node --check src/assembly-context.js` exit 0. No rerun. |
| Provider calls/tokens/expense | Zero provider calls/tokens; $0 provider expense. |
| Cache/latency evidence | No cache layer or provider latency measured; local targeted test duration 0.350s only. |
| Proposed new creative restriction / owner decision | None proposed by the plan; add exact question if encountered |
| Local holds / unknowns | None yet established; investigate at implementation |
| Critical blockers | None yet established; assess in worktree |
| Rollback | Revert only `assembly-context.js`, its fresh test and F02 plan changes; no persisted data migration. |
| Release | NOT AUTHORIZED / NOT CERTIFIED |


## Execution entries — append after real work, never fabricate

For each implementation batch record: date/time if available; current branch/HEAD and dirty-tree fingerprint; exact file diff and the authoritative input/source revision; scope decisions; source/test hashes; one frozen feature test batch and *terminal* result; failure repair/rerun if performed; call/token/expense evidence; any source or rule hold; confidentiality and agency assertions checked; rollback boundary. Attach links to freshly created evidence files only when they exist.

### Feature execution

At baseline `d0cd18a...`, changed the owner-character projection to an explicit allowlist that excludes GM hooks and skips structured values labeled GM/private/hidden. Kept separate GM-only hooks available to planner inputs. The canary test verified ordinary owner notes/player narrative remain while GM/private labels do not enter `assemblyHookSources`. This does not prove absence of leaks in historical drafts or delivered records; none were inspected/mutated by this feature. Test measured offline code behavior only; no Discord/provider/semantic quality evidence.

### Final post-F04 union regression

Because F03/F04 later changed `assembly-context.js`, this feature's fresh test was included again in `p08-final-delta-20261022-02`: exit 0, 11 total P08 fresh tests passed, 0 failed/skipped, 0.758s. Final source hash for the shared projection is `e03786b13b740d0a93113b58cd53876969eaaf36`; F02 test hash remains `38bd601a0e695bf04bde20b5799b60e5947757db`. No provider calls, token usage, cache activity or live secret-disclosure behavior was observed.

## Corrective Follow-up — 2026-10-22

| Field | Actual result |
|---|---|
| Baseline / source | `codex/clean-ai-gm-2026-10` at `d52c5ac52f7a993e642af7d11a93101351717ea1`; tracked tree clean. Owner spec, ENGINE constitution, required process docs, P08 handoff and active F02–F07 scope/ledgers read. |
| Changed production / SHA256 | `bot/src/assembly-context.js` `e2f0343579802715032543502f7e32eb1b65018032ef5f2d3b696178c5bba1aa`. |
| Fresh test / SHA256 | `bot/tests/ai-gm-2026-10/p08-f02-correction.test.mjs` `86e9f7a182990c07359a4021cd757d4f7055f3268705b79a927715e6c22063d8`; shared disposable DB fixture `4c2ad984a17eb29923df19d22a33123a450b40a13f055293bbfbe382a903b126`. |
| Batch | `p08-corrective-delta-20261022-01`, final union command in phase ledger; exit 0, 7 pass, 0 fail/skip/todo, 1.524s. Changed JS/MJS `node --check` passed. Three earlier failed union attempts were test-fixture repairs, not passing runs; final pass was not rerun. |
| Proven boundary | Nested GM/export/deep metadata canaries did not enter owner sources or owner writer brief; ordinary owner material remained; separate native GM hook remained available in GM planner inputs. |
| Holds / cost | No accepted prose/fallback/Discord delivery or stale owner/source revocation during an actual writer await. Zero provider calls/tokens, $0; no cache/latency evidence. |
| Rollback / release | Revert only scoped `assembly-context.js`, fresh test and F02 corrective record; no campaign DB touched. Release NOT AUTHORIZED / NOT CERTIFIED. |

### Corrective verification addendum — 2026-10-22, supersedes prior corrective batch result

The earlier passing union was invalidated by finding that `world_context.requests` could change when the opening job moved from queued to planning, staling the attempt's own fingerprint. `assembly-context.js` now fingerprints only stable audience-filtered beats and their bounds/authority. Fresh regression `p08-f05-correction.test.mjs` asserts scheduling then beginning an opening leaves the fingerprint unchanged. Final frozen union run ID `p08-corrective-delta-20261022-02` ran once after that change: exit 0; 8 passed, 0 failed/cancelled/skipped/todo; 1.655 s; `node --check` passed for all 11 changed JS/MJS paths. No legacy or broad suite ran. No provider calls/tokens, $0; no cache or live latency measurement. Exact final source/test SHA256 values are recorded in the P08 phase ledger. This is local delta evidence only; acceptance holds remain and release is NOT AUTHORIZED / NOT CERTIFIED.

### Corrective completion evidence — 2026-10-22

Baseline: branch `codex/clean-ai-gm-2026-10-10` at `45834f10de1087527c4c3941250980c726573dc4`; prior user-created handoff/acceptance files preserved. Changed source `assembly-context.js` SHA256 `2a58680aaf30cb54dc1af58ae682efc280720cfa4cdd8c5656a8e61061c9ba34`. New shared test SHA256 `d88142d5e2bb3b578f71a0a7dadb367dc0c198968d8d9ff92b2d75bfe8a3a06c`. Final fresh batch `p08-correction-completion-20261022-01`, command from `bot/`: `node --test tests/ai-gm-2026-10/p08-correction-completion.test.mjs`; terminal exit 0, 6 passed, 0 failed/cancelled/skipped/todo, 2.103s; changed-file syntax checks passed. The assertion batch exercised contradictory nested privacy labels and safe owner text; the captured real planner request included native NPC/faction agenda while the writer packet excluded it. Three earlier attempts had terminal failures during fixture/harness repair; no incomplete process was polled. Provider calls/tokens $0; no cache, live latency, accepted prose, Discord or semantic-quality evidence. Rollback only these scoped source/test/doc changes; no campaign DB or historical receipt touched. Release NOT AUTHORIZED / NOT CERTIFIED.

### Expanded owner-entry projection verification — 2026-10-22

F02 fresh test SHA256 is now `f76aafd6078c73fc19f6a75134b5807897695a9c54f7d3f804c07380b0a6e3f9`. The changed-code test directly exercised `openingEntryProjection()` using a newly created native owner attendance opportunity and checked that safe owner material remained while nested export/GM canaries and the planner-only GM seed did not appear. Command: `node --check tests/ai-gm-2026-10/p08-f02-correction.test.mjs` then `node --test tests/ai-gm-2026-10/p08-f02-correction.test.mjs`; terminal exit 0, 1 pass, 0 fail, 0.528s. This does not yet test accepted writer prose or delivered fallback under real owner DM transport; those remain unqualified. Provider calls/tokens $0.

### Corrective completion evidence — 2026-10-22

Baseline: branch `codex/clean-ai-gm-2026-10` at `45834f10de1087527c4c3941250980c726573dc4`; only pre-existing untracked handoff/acceptance files were present and preserved. Changed source `assembly-context.js` SHA256 `2a58680aaf30cb54dc1af58ae682efc280720cfa4cdd8c5656a8e61061c9ba34`. New shared test SHA256 `d88142d5e2bb3b578f71a0a7dadb367dc0c198968d8d9ff92b2d75bfe8a3a06c`. Final fresh batch `p08-correction-completion-20261022-01`, command from `bot/`: `node --test tests/ai-gm-2026-10/p08-correction-completion.test.mjs`; terminal exit 0, 6 passed, 0 failed/cancelled/skipped/todo, 2.103s; changed-file syntax checks passed. It exercised contradictory nested privacy labels, canary exclusion and preservation of legitimate owner material; it also proved GM agenda text absent from owner/public writer packet. Accepted writer output, private fallback transport, principal revocation during writer await and full delivery/restart remain local holds. Three earlier blocking attempts failed during fixture/harness/SQLite repair; no polling. Provider calls/tokens $0; no cache, live latency or semantic-quality evidence. Rollback only scoped source/test/doc changes; no campaign DB or historical receipt touched. Release NOT AUTHORIZED / NOT CERTIFIED.

### Superseding completion run — `p08-correction-completion-20261022-02`

After the initial six-test completion batch, the fresh test was expanded with actual `runSessionOpening()` and `runOpeningCohort()` flows for zero→two and one→two owners, SQLite-backed publication rows, mocked Discord ACKs, and two distinct owner-private brief projections. The first expanded run failed only because its inspection SQL used a nonexistent `messages.user_id`; it was corrected to `discord_user_id`, then the final frozen test was run once more after adding the owner-source separation assertion. Final test SHA256 `cd4047d28201a2785c4362fe3e15c967210fa4957b4e2b6b9a28578617c62662`. Command from `bot/`: `node --test tests/ai-gm-2026-10/p08-correction-completion.test.mjs`; exit 0; 7 passed, 0 failed/cancelled/skipped/todo; Node duration 3.780s, tool wall 4.35s. All six changed JS and two MJS syntax checks passed in the same blocking call. Both cohort flows received one actual mock-Discord message ID per public scene, left the original session-opening attempt/source unchanged, and created no shared party or PC location. Separate owner packets retained their own note and excluded the other owner's note. This proves the exercised local integration only. Cross-process entire runner (single planner/writer and ACK), uncertain-send restart, late-owner DM delivery, real provider/Discord, and semantic quality remain unqualified. Provider calls/tokens/$0; no cache or live latency data.

### Final frozen run after pre-transport pause guard — `p08-correction-completion-20261022-02`

The completion suite was run once more after `publishing.js` added pause/source revalidation after Discord channel/member lookup and immediately before public/private send. Terminal result: exit 0; 7 passed, 0 failed/cancelled/skipped/todo; 3.664s. Test SHA256 `cd4047d28201a2785c4362fe3e15c967210fa4957b4e2b6b9a28578617c62662`. Final tested production hashes: `assembly-context.js` `2edd45ad2eea844eaf969e794c35bcf18cdd9898c43232c33f644da53d313d15`; `gm.js` `9cfccfd5dcd85be0610ac0801e41782a56c3d786a47dc186ef7305ce2f1c7e8d`; `opening-cohort-runner.js` `aab01dd46d842e9e538fc3c9e6d2d13233e0afd9f4d21a53a87105679f7bf9a7`; `db.js` `7f63786fd09dbe2250933127bcb45705d2d4e68f738d128fc126b7545800b0f0`; `publication-outbox.js` `33e09af4997e53b1fe5d853581b33fdc15cd5e8fbcfc9cd8c4aafd6d55c654a5`; `publishing.js` `e28278c4be8d686209608fa56d8a713daef7474fbd643eb3e87cc96e6fe8eeab`. All six JS and both MJS syntax checks passed in the same call. This terminal run supersedes earlier 6-test/7-test timings and validates both mocked opening flows. No live service/provider, cache or semantic evaluation. Release NOT AUTHORIZED / NOT CERTIFIED.

### Final receipt-preservation assertion — `p08-correction-completion-20261022-02`

After strengthening the fresh scenario to snapshot every initial opening outbox identity/status/Discord ACK before cohort publication and compare it afterward, reran the frozen test once. Exit 0; 7 passed, 0 failed/cancelled/skipped/todo; 3.696s. Final test SHA256 `97151ba29fb1faed6bccdda7db0822029061fb85ad83a869b4b3b5a0848f81a8`. The same call passed all six changed JS and both fresh MJS syntax checks. This is the terminal result; no test or production source changed afterward. It demonstrates exact mocked initial ACK preservation in the successful 0→2 and 1→2 flows, not crash/restart behavior.
