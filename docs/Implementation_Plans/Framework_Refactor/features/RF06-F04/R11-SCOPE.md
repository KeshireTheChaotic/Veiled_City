# RF06-F04 R11 — Command mutation classification

Frozen after fdceb53c. Agent B owns idempotency.js and Discord public; no Agent A/publication/index/registry overlap. Move only original READ_ONLY key set, commandKey and isMutatingCommand into Discord command-mutations.js; preserve root exported functions and same identities. Receipt replay/capture and synchronous db.transaction code remain byte-identical. Unknown commands still default mutating; no command reclassified.

Fresh synthetic command interactions/receipt store verify classification, completed duplicate replay, private reply behavior, persistence before failed response, once-only capture, warning/read-only suppression and rollback callback ordering. Synthetic storage is contract evidence, not actual SQLite/native effects. No repository, schema, commit contract, rule, source/audience policy or live-service change.
