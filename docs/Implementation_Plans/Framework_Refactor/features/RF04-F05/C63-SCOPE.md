# RF04-F05 C63 — World modules read Knowledge records and disclosure through the World port

Base 5ad59454. Four World legacy modules (world-identity-persistence, world-sanctioned-sources, world-encounter-beats, world-simulation-receipts) stop importing the root narrative-records.js and disclosure-authority.js shims and call Knowledge's original listNarrativeRecords and factVisibleTo through the existing worldKnowledgeSources port. world-background-identities and world-resolution are deferred: they also import the NARRATIVE_RECORD_LIMIT constant.

Rollback: Revert only the C63 commit: restore the five direct Knowledge shim imports in four World modules and the five exact transitions from C63-RETIRED.json.
