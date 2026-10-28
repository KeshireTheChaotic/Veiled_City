# RF04-F05 C114 — Native PvP rounds synchronize the Session PvP window through a native port

Base a3b2b63e. Daggerheart's pvp-rounds.js stops importing the Session root module window-coordinator.js. Native rules gain a fixed nativePvpWindow port; Session gains a PvP window slot filled at load by window-coordinator.js. The adopted daggerheart--session adapter binds the port via connectNativePvpWindow from initializeNativeScenes (no index.js change). Breaking the pvp-rounds/window-coordinator cycle also retires three cyclic-edge records. Static reachability from index.js unchanged.

Rollback: Revert only the C114 commit: restore the direct window-coordinator.js import in pvp-rounds.js, remove the native PvP window port, the Session PvP window slot and its bind, connectNativePvpWindow and its call in initializeNativeScenes, and restore the exact transitions from C114-RETIRED.json.
