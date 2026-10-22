# P08-F04 — Start/check-in cohort assembly and immutable receipts: ledger

| Field | Planned evidence / actual result |
|---|---|
| Status | **LOCAL ARCHITECTURE HOLD — UNSUPPORTED; NO SOURCE/TEST CHANGE** |
| Repository / target | `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10` |
| Supplied reference | `81569d08699343e401fc11ba1eaed0f10b4fd37a` (reconcile checkout HEAD at execution) |
| Actual checkout SHA and dirty tree | `acfc8e2bab13efc7cc83ca2b5888f06b2e1d519a`; branch `codex/clean-ai-gm-2026-10`. |
| Source crosswalk / finding revision | Confirmed initial flow and owner-entry flow. Existing `assembly_plan` is session-singleton; `session_opening_job` binds initial roster and one attempt; slot keys include plan hash; refresh refuses delivered/uncertain history. |
| Changed production/docs paths | F04 scope and ledger only. No production change. |
| New test files / source and test hashes | None; not permissible to test unchanged production for this feature. |
| Test batch run ID, command, exit, counts | Not run; no affected production code changed. |
| Provider calls/tokens/expense | Zero calls/tokens; $0. |
| Cache/latency evidence | Not measured; no provider/cache invoked. |
| Proposed new creative restriction / owner decision | None proposed by the plan; add exact question if encountered |
| Local holds / unknowns | **Requires distinct persisted cohort plan/job/slot state and recovery contract**. No safe current boundary allows automatic post-check-in party authoring. |
| Critical blockers | None yet established; assess in worktree |
| Rollback | Documentation-only hold record; no production effects. |
| Release | NOT AUTHORIZED / NOT CERTIFIED |


## Execution entries — append after real work, never fabricate

For each implementation batch record: date/time if available; current branch/HEAD and dirty-tree fingerprint; exact file diff and the authoritative input/source revision; scope decisions; source/test hashes; one frozen feature test batch and *terminal* result; failure repair/rerun if performed; call/token/expense evidence; any source or rule hold; confidentiality and agency assertions checked; rollback boundary. Attach links to freshly created evidence files only when they exist.

### Source reconciliation

`present`/`arrive` invokes `prepareOpeningEntryOpportunity` and `deliverOpeningEntry`; neither performs shared planning. Session plan and opening job are singleton/immutable identities. Attempting to replace/reopen them would violate existing receipt and exactly-once guarantees. This is a feature-local hold, not a critical blocker; proceed with F05–F07.
