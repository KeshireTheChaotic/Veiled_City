# C95 ledger

## 2026-10-27 C95 native environment modules read World identity origin via the authoring port

Two Daggerheart legacy modules (native-environment-arrivals, native-environment-door-chain) stop importing worldIdentityOrigin from the World root composition world-authorship.js. The existing Daggerheart nativeWorldAuthoring port gains worldIdentityOrigin, bound to World's public original by the existing daggerheart--world connectNativeWorldAuthoring from the existing initializeEnvironmentScene bootstrap (no test binds that port with a fixed key list; no index.js change). The new test imports only the changed port contract and adapter, per TEST_PROTOCOL.md. Supplemental run of the seven initiative tests that compose the environment scene or import the migrated modules: 23/23 pass.

Tests: one frozen batch of 2 files: 8 tests, 8 pass, 0 fail. Architecture: 2 exact records retired. RF04 exit 0, 0 active violations, 785 modules; RF05 264 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
