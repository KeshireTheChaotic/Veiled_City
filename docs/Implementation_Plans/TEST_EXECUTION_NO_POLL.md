# Test execution — do not watch or poll for completion

**Owner override (2026-10-21):** Codex usage is wasted by repeatedly checking whether tests are finished. This policy applies to **every** phase, feature, and test batch, and supersedes older directions to watch test output or periodically query a test session.

## Mandatory behavior

1. **Start each scoped test batch exactly once.** Prefer one blocking tool execution with enough timeout for completion, stdout/stderr redirected to a local log, and a captured exit code. Let the execution tool itself wait; **do not** request repeated progress or liveness updates. A finished tool call is one completion signal, not polling.
2. **Never watch a running test:** do not run `watch`, `tail -f`, `Get-Content -Wait`, timer/sleep loops, `ps`/`Get-Process` checks, filesystem-marker loops, or repeated `write_stdin` / session-status calls. Do not use Codex thinking cycles or tokens merely to ask whether a test finished.
3. If execution must be detached because of tool time limits, launch a single supervised test process that writes `stdout`, `stderr`, and a final **exit-code/status file**. Immediately continue useful **independent** coding, documentation, or ledger work; do not modify source files under test until that test result is collected. Check the result **only at a natural milestone** when it is needed for a decision, never on a clock or repeated interval. If not finished at that milestone, record `RUNNING — NOT QUALIFIED` and proceed with other independent tasks. Do not consume further calls solely to wait. A test is completed only after its actual exit code is available.
4. **No streaming logs while running.** Once the process has exited, open the log **once** and read a brief summary (exit code, number passed/failed/skipped and short failure excerpts). Read detailed failure context only for concrete failed assertions. Avoid reposting huge passing logs into the Codex conversation.
5. **One batch per frozen feature/phase, then one batched repair and targeted rerun if needed.** Never spawn the same suite twice because its first run is slow; never launch unrelated or inherited suites. If there are multiple new tests for one changed feature, run them in **one batch**, not one interactive invocation per file.
6. Record `run_id`, tested SHA/working-tree fingerprint, command, paths, start/end timestamps if known, final exit code and summary in that feature and phase's `LEDGER.md`. Pending, timed-out or incomplete runs are **not passed**. Do not fabricate counts, results or timing.
7. This policy does **not** change the separate hard test boundary: fresh tests only, against production code actively modified in this plan; no legacy suite, golden fixture or broad validation reuse.

## Preferred execution mode

From `bot/` run a **single blocking invocation** of the relevant newly written tests. Configure the tool's native timeout to encompass the reasonable test batch rather than using frequent short yields. Redirect full output to a feature-local log and examine the result after the call returns. Avoid extra shell/process/wait tools whose only purpose is to monitor.

**If an asynchronous session is unavoidable:** make the test launcher itself persist the exit code atomically on completion and return control to Codex immediately. Continue an unrelated work item. At the next meaningful phase checkpoint, retrieve completion evidence once; if still active, leave it pending instead of polling.

**Example handoff rule:** `Launch once → perform other independent work or let blocking runner finish → collect one terminal result → log outcome → repair if needed.`

**Prohibited pattern:** `Launch → status? → wait 5s → status? → wait 5s → read partial log → status? …`.
