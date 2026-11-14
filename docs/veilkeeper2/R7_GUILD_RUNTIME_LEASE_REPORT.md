# R7 — shared local native guild lease

Completed slice, 2026-11-13. R7 and all other major phases remain incomplete.

## Delivered

`native-start.js` now acquires a shared local guild lease before runtime-directory preparation, inference initialization, repository/root/client creation or login. Two native launchers for the same guild cannot bypass it by choosing different data directories. Other guilds use independent files. Normal shutdown releases the lease after client destruction; preflight/startup failures release it through cleanup. SQLite releases the process lock after a crash without clock expiry, stale-PID guessing or deleting journals.

`guild-runtime-lease.js` resolves the default lease directory through Git's common directory so a main checkout and its worktrees share one location. It writes outside Git metadata, to the main checkout's `.vk2-runtime-leases` directory. Packaged/custom Git layouts must configure `VK2_GUILD_LEASE_DIR`; every competing native launcher must use the same directory. Per-directory game-state locks and manifests remain in place. Lease rows contain only guild identity/version, never credentials or source bodies.

The scope is local native-process exclusion. Legacy launchers and other machines do not honor this lease. Changing configured paths or moving active lease files can defeat coordination; do not do so. No global Discord ownership or production exclusivity is asserted.

## Files and actual checks

Changed: new `guild-runtime-lease.js`, `native-start.js`, new `r7-guild-runtime-lease.test.mjs`, existing native-start/runtime-resume fixture environments (isolated shared lease directories), dependency graph and accompanying evidence.

31 distinct checks across four affected files pass:26 native lease/start/resume checks (2815.0873ms) and five provider-factory import-dependent checks (547.9482ms). The expanded default-path case passed alone after a missing-layout error was clarified (553.965ms). No unchanged completed suite was rerun. Tests include real SQLite locks, a real owned subprocess killed after acquiring its lease, separate runtime directories, no second client/login/provider call, startup-failure release, wrong/future/foreign schema holds and preserved data. Client/login transport is simulated, not live Discord.

A read-only probe resolved the actual rebuild worktree's default to `D:/Library/Development/Veiled_City_2/baseline/.vk2-runtime-leases`; it did not exist and was not created. Evidence: `.reports/guild-lease-default-20261113.json`. No online startup, Discord send, inference, production mutation or lease was acquired in that checkout.

Static graph:129 native modules,90 reachable,39 uncomposed,eight audited legacy imports,zero missing imports; four generic AI capabilities unchanged. This slice introduces a new local coordination database outside game directories, not a game-state schema migration.

## Migration, rollback and holds

Stop and inspect previously launched native/legacy processes before adopting the new coordination path: old launchers do not retroactively acquire this lease. Existing populated game manifests are not rewritten. Retain all runtime/game/interaction journals. To relocate lease files or roll back the new launcher, first stop native processes cleanly and verify their identities; never remove an active lease file to force startup. Leaving an inactive lease file is safe; its identity/version is checked on the next acquisition.

Production is unchanged; no major-phase merge/push occurred. Cross-machine ownership, legacy/native coexistence, shutdown faults, populated adoption, backup/restore, outbox crash recovery, performance and human/live acceptance remain independent holds. This is not full R7 qualification.

Next R7: reviewed populated migration/adoption and reversible backup/restore, with actual source/owner/recipient/receipt comparison before any online resume. Continue R3 mechanical readiness and R4/R5 conversational autonomy; local process exclusion does not prove GM behavior or effect parity.
