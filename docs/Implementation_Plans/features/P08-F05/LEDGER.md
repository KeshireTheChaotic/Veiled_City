# P08-F05 — Living-world agenda, cognition and continuity at openings: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **PLANNER AGENDA DELTA PASSED; NPC EPISTEMIC / WRITER INTEGRATION UNQUALIFIED** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | `f45efc51acb5aeec62077e3be6acdd57f9e05b1a`; branch `codex/clean-ai-gm-2026-10`. |
| Source crosswalk / finding revision | Current contract verified statically in `opening-world-bridge.js`, `narrative-authority-context.js`, `narrative-speakers.js`, `npc-cognition-projection.js`, `narrative-memory.js`, and `narrative-salience.js`. |
| Changed production/docs paths | F05 scope and ledger only. No production code changed because the required source contracts already exist. |
| New test files / source and test hashes | None; no changed production code to test, and characterization of unchanged code is outside this plan's test boundary. |
| Test batch run ID, command, exit, counts | Not run; static source reconciliation only. |
| Provider calls/tokens/expense | Zero calls/tokens; $0. |
| Cache/latency evidence | No provider/cache exercised; no latency claim. |
| Proposed new creative restriction / owner decision | None proposed by the plan; add exact question if encountered |
| Local holds / unknowns | None yet established; investigate at implementation |
| Critical blockers | None yet established; assess in worktree |
| Rollback | Documentation-only source disposition. |
| Release | NOT AUTHORIZED / NOT CERTIFIED |


## Execution entries — append after real work, never fabricate

For each implementation batch record: date/time if available; current branch/HEAD and dirty-tree fingerprint; exact file diff and the authoritative input/source revision; scope decisions; source/test hashes; one frozen feature test batch and *terminal* result; failure repair/rerun if performed; call/token/expense evidence; any source or rule hold; confidentiality and agency assertions checked; rollback boundary. Attach links to freshly created evidence files only when they exist.

### Source reconciliation

F05 is already supported by the current native context path: scoped signals, actor-relative speaker cognition, authenticated active goals, and memory selected only after complete acknowledged delivery. Context collection is read-only and does not advance clocks or effects. No production edits or tests were needed. This closes source-level integration only; not runtime or semantic quality proof.

## Corrective Follow-up — 2026-10-22

| Field | Actual result |
|---|---|
| Baseline / changed production SHA256 | Baseline `d52c5ac52f7a993e642af7d11a93101351717ea1`; shared `bot/src/assembly-context.js` `e2f0343579802715032543502f7e32eb1b65018032ef5f2d3b696178c5bba1aa`. |
| Fresh test / SHA256 | `bot/tests/ai-gm-2026-10/p08-f05-correction.test.mjs` `0f65cecd00dc7f3f548d11fcb20a10e8536a2665a235c23f6cc5b24f15d0d651`. |
| Batch | `p08-corrective-delta-20261022-01`; final union exit 0; 7 passed, 0 failed/skipped/todo; 1.524s; changed-file syntax checks passed. |
| Proven boundary | Planner-only agenda includes active native NPC and faction goals scoped to current guild/session/scene; source-bound public opportunity context is carried separately. Disposable DB assertions show no clock, canon or simulation-record mutation from context collection. |
| Holds / cost | NPC false-belief treatment, public/private clue filtering, acknowledged-vs-unacknowledged memory and full writer context with real signals were not exercised. Zero provider calls/tokens, $0; no cache/latency sample. |
| Rollback / release | Revert only scoped agenda/context addition and F05 fresh test/docs; no state mutation. Release NOT AUTHORIZED / NOT CERTIFIED. |

### Corrective verification addendum — 2026-10-22, supersedes prior corrective batch result

The earlier passing union was invalidated by finding that `world_context.requests` could change when the opening job moved from queued to planning, staling the attempt's own fingerprint. `assembly-context.js` now fingerprints only stable audience-filtered beats and their bounds/authority. Fresh regression `p08-f05-correction.test.mjs` asserts scheduling then beginning an opening leaves the fingerprint unchanged. Final frozen union run ID `p08-corrective-delta-20261022-02` ran once after that change: exit 0; 8 passed, 0 failed/cancelled/skipped/todo; 1.655 s; `node --check` passed for all 11 changed JS/MJS paths. No legacy or broad suite ran. No provider calls/tokens, $0; no cache or live latency measurement. Exact final source/test SHA256 values are recorded in the P08 phase ledger. This is local delta evidence only; acceptance holds remain and release is NOT AUTHORIZED / NOT CERTIFIED.
