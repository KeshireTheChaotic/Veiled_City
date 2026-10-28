# C149 ledger

## 2026-10-28 C149 GM hook import root moves into Narrative

The GM hook package normalizer root moves into the Narrative framework; Persistence reaches it through a fixed consumer bound by the narrative--persistence pair, and commands.js uses the Narrative public API. Three open RF04 records retired.

Tests: one frozen batch of 121 files: 798 tests, 790 pass, 8 fail (named in C149-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability; rf04-f05-c39.test.mjs | both World consumers preserve original bodies and use their own exact native evidence interface; rf04-f05-c41.test.mjs | World seed implementation body remains byte-identical after exact import replacement; rf04-f05-c42.test.mjs | original Narrative authority and speaker bodies including pre-existing dirty source are unchanged; rf04-f05-c46.test.mjs | each clean World caller preserves all non-import code and original calendar binding names; dirty callers preserved byte-for-byte; rf04-f05-c51.test.mjs | pair adapter uses only the two public APIs and all 47 native consumers dropped direct World calendar imports; rf04-f05-c55.test.mjs | Daggerheart-Session adapter uses only the two public APIs and all migrated native consumers dropped the root scene import; rf04-f05-c56.test.mjs | all migrated native consumers dropped the root principal import and startup binds before services). Architecture: 3 exact records retired. RF04 exit 1, 1 active violations, 838 modules; RF05 81 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.

Note: the fresh test was run as rf04-f06-c149.test.mjs (see RUN) and renamed to rf04-f06-c49.test.mjs, since bridge test references require two-digit numbers; contents unchanged.
