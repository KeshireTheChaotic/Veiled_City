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

### Expanded owner-entry projection verification — 2026-10-22

F02 fresh test SHA256 is now `f76aafd6078c73fc19f6a75134b5807897695a9c54f7d3f804c07380b0a6e3f9`. The changed-code test directly exercised `openingEntryProjection()` using a newly created native owner attendance opportunity and checked that safe owner material remained while nested export/GM canaries and the planner-only GM seed did not appear. Command: `node --check tests/ai-gm-2026-10/p08-f02-correction.test.mjs` then `node --test tests/ai-gm-2026-10/p08-f02-correction.test.mjs`; terminal exit 0, 1 pass, 0 fail, 0.528s. This does not yet test accepted writer prose or delivered fallback under real owner DM transport; those remain unqualified. Provider calls/tokens $0.
