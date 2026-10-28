# C108 ledger

## 2026-10-28 C108 Native rules read World projects, observation, simulation and identity checks through a native port

Daggerheart's consent-native.js, ordinary-effect-proof.js and pvp-fear-moves.js stop importing the World root modules long-projects.js, world-observation.js, simulation.js, city-depth.js and the location-language.js shim. Daggerheart gains a fixed nativeWorldActions port; World gains observation and city depth provider slots filled at load by world-observation.js and city-depth.js, reuses the C107 long project slot, and supplies configureSimulationEntity, submitNpcAction and preflightNpcIdentity from its public API. The existing daggerheart--world adapter binds the port via connectNativeWorldActions from initializeNativeWorldEvents (no index.js change).

Tests: one frozen batch of 139 files: 940 tests, 939 pass, 1 fail (named in C108-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability). Architecture: 5 exact records retired. RF04 exit 0, 0 active violations, 806 modules; RF05 180 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
