# RF04-F05 C94 — native modules read the World source via the existing port

Base 1544a5b6. Three Daggerheart legacy modules (encounter, roll-collaboration, roll-requests) stop importing requireCitySource from the World root composition city-core.js and instead call the existing Daggerheart nativeWorldSource port, already bound to World's public requireCitySource by initializeNativeWorldEvents (C81). No new port, adapter or startup change. The new test imports only the three changed modules (uncomposed load) and checks their exact import replacement, per TEST_PROTOCOL.md.

Rollback: Revert only the C94 commit: restore the three direct ./city-core.js requireCitySource imports in encounter.js, roll-collaboration.js and roll-requests.js, and restore the 3 exact transitions from C94-RETIRED.json.
