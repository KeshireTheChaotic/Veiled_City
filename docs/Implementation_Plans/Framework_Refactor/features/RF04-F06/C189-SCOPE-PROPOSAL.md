# C189 proposal — retire the World constraint compatibility export

Design only; no implementation or qualification.

`bot/src/city-constraints.js` re-exports seven World functions. Twelve current production importers use three of them: `activeCityProxy`, `assertNpcAvailability`, and `worldActorControl`. The live transition manifest records nine importer edges plus the shim location; the three World-owned imports have no records. Retire only the ten observed records after migrating all twelve callers, without creating new exceptions.

World callers (`autonomous-world.js`, `city-groups.js`, `world-resolution.js`) can use World public directly. Intent callers (`ai-intents.js`, `scene-intent-board.js`) need only a fixed two-method consumer for `activeCityProxy` and `assertNpcAvailability`, bound through the existing Intent–World pair and `initializeWorldExecution`. Narrative callers (`gm-world-scope.js`, `narrative-clauses-v9.js`, `narrative-authority.js`, `narrative-authority-context.js`, `narrative-speakers.js`, `narrative-salience.js`) need the same two methods through their existing Narrative–World pair and initializer. Publication's `native-hook-output.js` needs only `activeCityProxy` through Publication–World composition. Reuse an existing semantically equivalent consumer if current source establishes one; otherwise add only these bounded methods.

The original World `active-proxy.js` and `availability.js` implementations retain every control and availability rule. `worldActorControl` already uses `worldNativeActorControl`, bound by Daggerheart–World composition in `initializeWorldActorControl` before world execution. Preserve that order and do not add a second actor-control provider or infer consent/agency from availability. Adapter construction must not read state.

Next exact action: verify the twelve current call sites, write the C189 scope with exact transition IDs, route the original functions without algorithm changes, then qualify the changed contracts with fresh tests. Preserve all concurrent Live Play changes and passing earlier tests.
