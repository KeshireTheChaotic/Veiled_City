# P08-F02 — GM-private hook and knowledge firewall: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **COMPLETE — 1 FRESH TEST PASSED; RUNTIME DISTRIBUTION UNVERIFIED** |
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
