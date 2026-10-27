# C63 ledger

## 2026-10-27 C63 World modules read Knowledge records and disclosure through the World port

Four World legacy modules (world-identity-persistence, world-sanctioned-sources, world-encounter-beats, world-simulation-receipts) stop importing the root narrative-records.js and disclosure-authority.js shims and call Knowledge's original listNarrativeRecords and factVisibleTo through the existing worldKnowledgeSources port. world-background-identities and world-resolution are deferred: they also import the NARRATIVE_RECORD_LIMIT constant.

Tests: one frozen batch of 2 files: 9 tests, 9 pass, 0 fail. Architecture: 5 exact records retired. RF04 exit 0, 0 active violations, 729 modules; RF05 488 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
