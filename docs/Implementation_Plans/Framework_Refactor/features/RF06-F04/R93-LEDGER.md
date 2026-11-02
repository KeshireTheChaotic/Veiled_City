# RF06-F04 R93 — Backup-restore confirmation presentation

`commands.js` delegates only the existing private backup-restore confirmation string to Discord's `backupRestoreConfirmationText`. The command retains the GM guard, backup lookup, deferred response, restore operation, configured-surface synchronization, GM log, and edit-reply ordering.

Static source review confirms the existing confirmation template was moved without changing its interpolated fields or destination. Tests, syntax checks, and architecture ratchets were not run for this slice in this turn; no runtime or phase-gate qualification is claimed. The source ownership/crosswalk and RF06 phase-ledger records are pending their coordinated window.
