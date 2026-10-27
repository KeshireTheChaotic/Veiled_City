# RF04-F05 C57 — World modules read Session scenes and principals through World ports

Base a5d0f91e. Five World legacy modules (native-environment-scene, world-encounter-beats, world-observation, world-resolution, world-simulation-receipts) imported Session functions from the root re-exports `bot/src/scene-continuity.js` and `bot/src/conversation-principal.js`. They now use World's existing ports: `worldSessionScene` (widened with Session's original `scenePresence`, `sceneAccess` and `recordScenePresence`) and `worldConversationPrincipal`. The Session–World adapter binds the widened set.

In scope: port widening, adapter binding, import rewrites, retirement of the seven exact `DIRECT_CROSS_FRAMEWORK_IMPORT` records, one new test, and the rf04-f05-c20 bind fixture (widened port).

Deferred: `autonomous-world.js` and `native-environment-instance.js`, which carried uncommitted edits from earlier Codex work at the time; Knowledge and Character consumers of the same re-exports.

Rollback: revert only the C57 commit — restores the seven imports and records (C57-RETIRED.json) and the two-function World scene port. RELEASE NOT AUTHORIZED.
