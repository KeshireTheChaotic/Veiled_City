# C58 ledger

## 2026-10-27 C58 delete ten unreferenced root re-export shims

Ten root files that only re-exported framework APIs and had no source importer were deleted: authority-projection, entity-memory, legacy-authority (Knowledge); native-established-fact, world-information-transfer (World); npc-cognition, npc-cognition-projection, npc-conversations, simulation-motivation, simulation-strategy (NPC). Fresh tests that imported them now import the re-exported modules directly (same functions, renames kept); two identity checks between a shim and its public API were removed as meaningless, and two tests stopped reading a deleted shim's source text. Legacy `bot/scripts` suites that import these paths were not changed (outside the fresh-test gate, already broken by earlier deletions).

Tests: one frozen batch of 25 files: 225 tests, 224 pass, 1 fail — rf04-f05-c01 asserts the live RF04 gate passes, which is only true after retirement; rerun once after retirement: 13/13 (C58-RUN.json `supplemental_tests`). Full fresh suite was green (2029/2029) immediately before this slice.

Architecture: 10 exact LEGACY_MODULE_LOCATION records retired (RF04-F01 ×2, RF04-F02 ×5, RF04-F03 ×3). RF04 exit 0, 0 active violations, 723 modules; RF05 523 (was 533). Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
