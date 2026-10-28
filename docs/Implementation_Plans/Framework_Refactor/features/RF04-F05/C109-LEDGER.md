# C109 ledger

## 2026-10-28 C109 Session reads native review, arbitration, recovery, movement condition and owner consent through a Session port

Session's window-coordinator.js, scene-entry-native.js and negotiations.js stop importing the native root modules rules-arbitration.js, gm-action-review.js, native-condition-recovery.js, native-group-features.js and the owner-consent.js shim. Session gains a fixed sessionNativeRules port; native rules gain action review, rules arbitration and condition recovery provider slots filled at load by their root modules, and reuse the existing movement condition slot and public hasOwnerConsent. The existing daggerheart--session adapter binds the port via connectSessionNativeRules from initializeNativeScenes (no index.js change). scene-entry-native.js keeps its import of native-environment-access.js: it is that module's only static path from index.js and the VIP admission slot depends on it. Removing the edges broke 24 recorded import cycles, which are retired. Static reachability from index.js is unchanged except the pure owner-consent.js shim.

Tests: one frozen batch of 71 files: 410 tests, 410 pass, 0 fail. Architecture: 29 exact records retired. RF04 exit 0, 0 active violations, 808 modules; RF05 170 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
