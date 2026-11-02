# RF06-F04 R94 — Campaign-rollback confirmation presentation

`commands.js` delegates only the existing private campaign-rollback confirmation string to Discord's `campaignRollbackConfirmationText`. The command retains the GM guard, snapshot lookup/read, deferred response, publication cleanup, restore operation, configured-surface synchronization, GM log, and reply ordering.

`node --test tests/ai-gm-2026-10/rf06-f04-r94-campaign-rollback-confirmation.test.mjs` from `bot/` — exit 0, 2/2 passed. The focused test preserves the eight-character ID, label interpolation, and safety notice, including the existing empty-label interpolation. Syntax checks passed for commands, Discord public, formatter and test. The shared RF05 architecture ratchet was not run for R94; no full phase-gate qualification is claimed. Source ownership/crosswalk records are pending their coordinated window.
