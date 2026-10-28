# C161 ledger

## 2026-10-28 C161 Persistence reads Knowledge relationship, presentation and archive readers only through startup composition

The database facade no longer imports or standalone-binds the Knowledge relationship state, presentation evidence and historical archive roots; the existing persistence--knowledge adapter binds them at startup. Three Knowledge root shims retired.

Tests: one frozen batch of 121 files: 796 tests, 791 pass, 5 fail (named in C161-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability; rf04-f05-c39.test.mjs | both World consumers preserve original bodies and use their own exact native evidence interface; rf04-f05-c41.test.mjs | World seed implementation body remains byte-identical after exact import replacement; rf04-f05-c42.test.mjs | original Narrative authority and speaker bodies including pre-existing dirty source are unchanged; rf04-f05-c46.test.mjs | each clean World caller preserves all non-import code and original calendar binding names; dirty callers preserved byte-for-byte). Architecture: 6 exact records retired. RF04 exit 0, 0 active violations, 835 modules; RF05 63 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
