# C60 ledger

## 2026-10-27 C60 native rules read World proxy and NPC availability through native ports

Twelve Daggerheart legacy modules stop importing the root city-constraints.js shim. activeCityProxy goes through the existing nativeWorldProxy port; assertNpcAvailability (native-environment-witnesses, pvp-fear-moves) goes through a new nativeNpcAvailability port bound by the Daggerheart-World adapter in the existing native World bootstrap. p09-f06 now composes startup ports for its real Pack Pressure flow.

Tests: one frozen batch of 27 files: 185 tests, 185 pass, 0 fail. Architecture: 12 exact records retired. RF04 exit 0, 0 active violations, 722 modules; RF05 509 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
