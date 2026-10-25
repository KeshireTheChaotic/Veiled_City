# RF05-F04 C06 ledger — Narrative schema public API

**Status:** COMPLETE FOR THIS SOURCE-OWNERSHIP AND GM-IMPORT SLICE; RF05-F04 remains partial.
**Base HEAD:** `b3e205947e088a98f2043761abf5f7c4c05995dd`.

The data-only Narrative schema implementation moved byte-for-byte to `frameworks/narrative/gm-fiction-schema.js`; the Narrative public API explicitly exports all 19 existing contracts. The original root path now re-exports the same objects for existing production callers. `gm.js` consumes `nativeOutcomeSchema` and `narrativeRequestSchema` only through the Narrative public API. Schema values and proposal authority are unchanged.

Fresh changed-code test `bot/tests/ai-gm-2026-10/rf05-f04-c06.test.mjs` passed **1/1**. The single frozen affected-GM batch covering F02 transport, F03-C02 guidance, F04-C02 Session principal, F04-C03 World context, F04-C05 Intent API, and C06 schema adoption passed **12/12**, exit **0**, duration **3,381.2046 ms**. Changed JavaScript syntax passed **5/5**, exit **0**. All test files import the current `GMService` where relevant; no unchanged unrelated fresh tests were rerun.

The RF05 architecture ratchet exits **1** on pre-existing debt: **575** modules, **0** unowned, **2,738** import occurrences, largest cycle **181**, **955** active groups and **955** transition errors. The exact GM-to-root-schema finding and transition error are both absent; two other root-schema consumers remain. No new finding was introduced on the changed public import. Transition `eba1e3e1be87a71d8f22b88a6c02da7e495f5ce53f41f75c699bab80934481b1` was retired and preserved in `C06-RETIRED.json`; **57** RF05-F04 assignments remain. Current hashes and actual results are in `C06-RUN.json`.

No provider calls, tokens, network, database access, or live service use. Codex usage is **UNMEASURED**. Roll back only C06 by restoring the GM root import and exact retired transition, restoring the original root schema implementation, and removing the Narrative copy/public export and C06 test/evidence. Preserve all other consumer compatibility readers and the five pre-existing user edits. Release remains **NOT AUTHORIZED**.
