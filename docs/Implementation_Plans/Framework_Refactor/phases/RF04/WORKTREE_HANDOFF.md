# Active RF04 worktree handoff — 2026-10-29

Migration workspace: C:\Users\Keshi\.codex\worktrees\rf04-memory\Veiled_City, branch codex/rf04-memory. Last qualified migration commit: 92de0048 (C180/C181); RF04 ratchet zero active errors, RF05 still 53 groups/errors. Current C182-C185/C186 sources are unqualified until their fresh tests complete.

The original D:\Library\Development\Veiled_City checkout belongs to the concurrent Live Play debugging task. Do not write, restart its bot, change its database or merge this branch into it during that work. This worktree starts from the committed migration checkpoint and intentionally excludes uncommitted Live Play behavior changes.

An external GitHub Desktop action on the prior rf04-isolated checkout stashed its changes, reset it, and checked out main. That checkout has been left on main. Stash 65970ec1913343678ec8cb00bec558d0eab4e6c0 (base92de0048) was applied into this new worktree without popping or dropping it. The prior uncommitted source/design work was recovered; local ignored test drafts and registry artifacts are restored separately. Do not reset or clean either checkout to resolve a future mismatch.

Before writes, verify the explicit workdir and current branch. If they differ from this workspace/branch, stop that write and inspect the state. Active-turn sandbox permissions may require explicitly escalated bounded local commands here; no Git configuration workaround is needed.

Only new feature-local tests qualify each current source batch. Older fresh test files supplied locally for bridge registration are metadata/reproducibility artifacts and must not be executed as inherited coverage. Existing dependency libraries may be shared through the ignored node_modules junction. Do not copy .env files, live SQLite databases, historical fixtures or legacy suites.

Source editing ownership: standalone_repair owns C182-C185 memory services and shared GM/Narrative context callers first; civic_luna completes C186 after those caller locks and metadata are released. test_luna owns new tests, logs, syntax checks and ratchets; launch only after parent review and the complete source/metadata freeze. No test watching or polling. C187 remains a design proposal.

C182-C186 fresh verification completed: five cases pass, RF04 exit0, RF05 remains46groups. User requests commit/merge into codex/clean-ai-gm-2026-10, archive temporary worktrees, then pause. No C187 implementation is authorized in this finishing batch.
