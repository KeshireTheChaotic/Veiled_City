# RF04-F05 C59 — Remove provenance and roster shims

Base 1b30d37c. Application modules commands.js and story-commands.js import roster and provenance functions from the Session and Knowledge public APIs instead of root re-export shims; both shims are deleted. Retires four exact records (two LEGACY_MODULE_LOCATION, two IMPORTS_PRIVATE_API). Rollback: revert only the C59 commit. RELEASE NOT AUTHORIZED.
