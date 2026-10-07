# Veiled City v3.5.2 — Production Test Teardown Fix

- Fixed `npm run test:production` printing **PASS** but remaining active instead of returning to the shell.
- The voice repeat regression no longer starts unnecessary real audio playback during the test.
- Added explicit teardown for all VoiceNarrator test instances.
- Added an event-loop cleanup turn before the production regression test exits.
- No database migration, slash-command changes, gameplay changes, or production voice behavior changes.
- v3.5.1 dependency-security hardening remains unchanged.
