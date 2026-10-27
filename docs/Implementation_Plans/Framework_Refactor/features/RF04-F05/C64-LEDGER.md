# C64 ledger

## 2026-10-27 C64 Daggerheart owns the range bands

Owner decision 2026-10-27: range bands are Daggerheart rules vocabulary. RANGE_BANDS now lives in frameworks/daggerheart/range-bands.js and the Daggerheart public API. Session's scene validation reads the same list through a new Session-owned sessionRangeBands port bound by the Daggerheart-Session adapter in the native scene bootstrap; Session no longer defines or exports range bands. The five Daggerheart rule modules that imported RANGE_BANDS from the root scene-continuity.js shim now take it from their own framework and their scene reads from the nativeScenes port. rf04-f04-c02 reads the list from Daggerheart (its root-shim identity check is obsolete) and rf03-f06 composes the native scene port.

Tests: one frozen batch of 26 files: 195 tests, 195 pass, 0 fail. Architecture: 5 exact records retired. RF04 exit 0, 0 active violations, 731 modules; RF05 483 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
