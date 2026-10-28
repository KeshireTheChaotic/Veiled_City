# RF04-F05 C111 — World reads Session pacing advice and mystery configuration through a World port

Base 98785d16. World's simulation.js, seed-drafts.js and world-authoring.js stop importing the Session root module story-continuity.js. World gains a fixed worldStoryContinuity port; Session gains a story continuity provider slot filled at load by story-continuity.js. The existing session--world adapter binds the port via connectWorldStoryContinuity from initializeWorldExecution (no index.js change). Static reachability from index.js is unchanged.

Rollback: Revert only the C111 commit: restore the direct ./story-continuity.js imports in simulation.js, seed-drafts.js and world-authoring.js, remove the World worldStoryContinuity port, the Session story continuity slot and its bind in story-continuity.js, connectWorldStoryContinuity and its call in initializeWorldExecution, and restore the 3 exact transitions from C111-RETIRED.json.
