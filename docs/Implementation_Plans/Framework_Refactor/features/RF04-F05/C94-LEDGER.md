# C94 ledger

## 2026-10-27 C94 native modules read the World source via the existing port

Three Daggerheart legacy modules (encounter, roll-collaboration, roll-requests) stop importing requireCitySource from the World root composition city-core.js and instead call the existing Daggerheart nativeWorldSource port, already bound to World's public requireCitySource by initializeNativeWorldEvents (C81). No new port, adapter or startup change. The new test imports only the three changed modules (uncomposed load) and checks their exact import replacement, per TEST_PROTOCOL.md.

Tests: one frozen batch of 6 files: 39 tests, 39 pass, 0 fail. Architecture: 3 exact records retired. RF04 exit 0, 0 active violations, 785 modules; RF05 266 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
