# RF04-F05 C96 — Session continuity reads World sources through the existing scene World port

Base d96de0d2. Two Session legacy modules (dialogue-continuity, story-continuity) stop importing requireCitySource from the World root module city-core.js and delegate to the existing Session sessionSceneWorldSources port, already bound to World's public requireCitySource by session--world connectSessionSceneWorld from initializeSessionSceneWorld (no port, adapter, initializer or index.js change). The new test imports only the two changed modules and checks fail-closed reads before composition plus the removed import.

Rollback: Revert only the C96 commit: restore the two direct ./city-core.js requireCitySource imports in dialogue-continuity.js and story-continuity.js, and restore the 2 exact transitions from C96-RETIRED.json.
