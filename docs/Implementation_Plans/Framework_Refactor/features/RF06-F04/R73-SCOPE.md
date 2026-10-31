# RF06-F04 R73 — Route roll-menu attachment wrapping through Discord

Change only the existing private roll-options menu attachment construction to the Discord public `createAttachment` helper. Preserve Discord button/select components, current request/registry/token validation, owner checks, menu content, ephemeral setting, mention suppression, and confirmation/roll transaction paths. The menu continues to create its existing UI registry and private token; this slice does not execute an owner choice or a roll.

Owned source path: `bot/src/roll-menu.js`. Owned evidence: the fresh R73 SQLite test, this scope/ledger/log, the R72 result-SHA correction, and RF06 phase ledger. No Discord public implementation, index/db, SQL, persistence repository, mechanic, shared manifest, or gameplay change.
