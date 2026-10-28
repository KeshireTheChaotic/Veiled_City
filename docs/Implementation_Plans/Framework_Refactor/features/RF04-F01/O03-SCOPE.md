# RF04-F01 O03 — World actor configuration callers

Four World-owned callers (autonomous-world, seed-data, seed-drafts and world-authoring) consume `configureSimulationEntity` directly from the World public API instead of the same-owner root simulation reader. That reader already re-exported this exact function. Keep the root path and all validation, audit, saved-state and initialization behavior. No transition is retired for these same-owner imports.

Rollback the four import changes together. No schema, policy, gameplay rule or transition is changed.
