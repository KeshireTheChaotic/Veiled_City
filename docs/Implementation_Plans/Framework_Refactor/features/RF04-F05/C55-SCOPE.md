# RF04-F05 C55 — Native rules reach Session scenes through own port

Base 1b212744. 34 Daggerheart legacy modules imported Session's `currentScene`, `scenePresence`, `sceneAccess` and `recordScenePresence` from the root re-export `bot/src/scene-continuity.js`. They now call the same original Session functions through a Daggerheart-owned port (`nativeScenes`, `frameworks/daggerheart/contracts/scenes.js`), bound by the existing Daggerheart–Session adapter (`connectNativeScenes`) from a bootstrap that `index.js` calls before runtime services. The module list is fixed in C55-CONSUMERS.json.

In scope: port, connector, bootstrap, bridge consumer registration, the one-line import rewrite in the 34 modules, retirement of their 34 exact `DIRECT_CROSS_FRAMEWORK_IMPORT` records (RF04-F01 deadline), one new test, and the bootstrap call in three existing tests whose real flows now need it.

Deferred: the five Daggerheart modules that also import `RANGE_BANDS` (gm-action-capability, native-group-features, pc-effects, pc-incoming, pvp-attacks). Rule factories receive that array by value at module load, before composition, so a lazy port cannot supply it; where the range vocabulary should live (Daggerheart rules vs Session validation) is a separate decision. Non-Daggerheart `scene-continuity` consumers also remain.

Rollback: revert only the C55 commit — restores the 34 direct imports and records (C55-RETIRED.json), removes the port, connector, bootstrap and bridge consumer entry. RELEASE NOT AUTHORIZED.
