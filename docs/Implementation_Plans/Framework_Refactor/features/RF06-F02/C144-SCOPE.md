# RF06-F02 C144 — Knowledge–Persistence relationship reader composition

Under the owner's exact RF06 prerequisite authorization, expose the existing Persistence-owned relationship evidence consumer through a Persistence public entrypoint and bind it to the original Knowledge public function through the observed Knowledge–Persistence pair and a narrow application initializer. Production startup calls that initializer before database construction. The existing standalone `db.js` facade continues binding the same original function at module load, so `new VeiledDB(path,schema)` and saved reads remain available without application initialization.

Adopt only this actual pair API, application consumer and local fresh test in the pair registry and package policy; preserve existing observed metadata. This is not a transition exemption, deadline extension or baseline change. The legacy `db.js -> presentation-evidence.js` consumer and root location records remain. The separate same-constructor application facade decomposition is still required before those edges can be retired.

Rollback the pair, public Persistence export, application composition and startup call, DB import-path change and their exact registry/package additions together. Do not remove the standalone binding or original reader. No schema or saved format migration.
