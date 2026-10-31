# RF06-F04 R70 — Use Discord's existing attachment interface for city replies

Change the city command's attachment construction to the existing `createAttachment` function exposed by the Discord public API. Preserve the city permission check, all domain dispatch and input handling, JSON bytes, filename, response text, ephemeral option, and the existing deferred `editReply` versus immediate `reply` branch. The city handler remains in its current application location; this slice changes only the Discord attachment dependency.

Owned source path: `bot/src/city-commands.js`. Owned evidence: the fresh R70 test, this scope/ledger/log, and the RF06 phase ledger. No Discord public implementation, index/db, SQL, persistence, World behavior, transaction, shared manifest, or gameplay change.
