# C114 ledger

## 2026-10-28 C114 Native PvP rounds synchronize the Session PvP window through a native port

Daggerheart's pvp-rounds.js stops importing the Session root module window-coordinator.js. Native rules gain a fixed nativePvpWindow port; Session gains a PvP window slot filled at load by window-coordinator.js. The adopted daggerheart--session adapter binds the port via connectNativePvpWindow from initializeNativeScenes (no index.js change). Breaking the pvp-rounds/window-coordinator cycle also retires three cyclic-edge records. Static reachability from index.js unchanged.

Tests: one frozen batch of 69 files: 399 tests, 399 pass, 0 fail. Architecture: 4 exact records retired. RF04 exit 0, 0 active violations, 819 modules; RF05 152 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
