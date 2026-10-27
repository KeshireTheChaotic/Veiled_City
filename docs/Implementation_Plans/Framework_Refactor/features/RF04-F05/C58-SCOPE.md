# RF04-F05 C58 — Delete unreferenced root re-export shims

Base 7ae4d26f. Delete ten root re-export shims with no source importer, repoint fresh tests to the re-exported modules, retire the ten LEGACY_MODULE_LOCATION records. No source behavior change. Rollback: revert only the C58 commit (restores shims, test paths and records from C58-RETIRED.json). RELEASE NOT AUTHORIZED.
