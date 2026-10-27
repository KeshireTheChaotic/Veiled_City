# RF04-F05 C67 — World encounter source visibility

Replace the World encounter reader's legacy Narrative context import with the existing World-owned Narrative authorship consumer and the original neutral JSON hash. Preserve encounter filtering, visibility policy, inputs and output. Runtime callers are the Narrative Director source and World narrative bridge, both reached after application startup binds Narrative–World. The consumer throws when called before this binding; a positive encounter read with only a partially composed application can therefore behave differently. No supported standalone encounter-reader workflow has been established by this slice.

Rollback: restore the original `scene-fiction-context.js` import in `world-encounter-beats.js` and restore the exact retired transition records, if retired. No schema or persisted data changes.
