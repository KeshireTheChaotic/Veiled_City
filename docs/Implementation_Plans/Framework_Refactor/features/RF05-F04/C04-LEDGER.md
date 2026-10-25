# RF05-F04 C04 ledger — Narrative public-guidance import

**Status:** COMPLETE FOR THIS CONSUMER-IMPORT SLICE; RF05-F04 remains partial.
**Base commit:** `0ea8d924149b36a6ae938d83463bf91e48c61732`.

The GM service now imports `WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE` through `frameworks/narrative/public.js`. RF05-F03 C02 moved the exact existing string into Narrative and retained the root path as a one-line re-export for three existing in-repository tests. This changes ownership/import paths only; narrative guidance and creative behavior are unchanged.

Fresh shared test `bot/tests/ai-gm-2026-10/rf05-f03-c02.test.mjs` passed **1/1**, exit **0**, duration **550.797 ms**; syntax checks passed **5/5**. Its hashes, terminal details, and the RF05 architecture result are recorded in `../RF05-F03/C02-RUN.json`. The RF05 ratchet remains failed with 955 active groups/errors; this slice adds no changed-path findings. Only transition `2b47b1791f56a173edcc96b4b833d6797ed7c82ad05fb49a0060cfd85027eb1c` is retired for this consumer adoption and preserved in `C04-RETIRED.json`. The RF05-F03 root-location transition remains active for compatibility. RF05-F04 has **59** assigned entries remaining. No provider/model calls or cost. Release remains **NOT AUTHORIZED**.

Rollback through the combined RF05-F03 C02 / RF05-F04 C04 slice: restore the GM root import and exact transition, and remove only the moved constant/public export/test/evidence. Preserve the root compatibility reader and its still-active RF05-F03 location transition.
