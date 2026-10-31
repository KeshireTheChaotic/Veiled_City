# RF06-F04 R71 — Use Discord's existing attachment interface for story replies

Change the story command's JSON attachment construction to the existing `createAttachment` function exposed by the Discord public API. Preserve its GM permission check, all domain routes, result and preview construction, 1,900-character visible-content limit, ephemeral setting, mention suppression, attachment filename, and reply timing. The handler remains in its current application location.

Owned source path: `bot/src/story-commands.js`. Owned evidence: the fresh R71 test, this scope/ledger/log, the R70 result-SHA correction, and the RF06 phase ledger. No Discord public implementation, index/db, SQL, persistence, World/session rules, transaction, shared manifest, or gameplay change.
