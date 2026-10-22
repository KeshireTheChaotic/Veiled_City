# P07-F04 — Ledger

**Status:** COMPLETE — 2 fresh tests passed; changed-file syntax passed.

| Field | Result |
|---|---|
| Baseline | `4d07d4c260406c3cd364590f1c83d649b0a07e10`. |
| Changed production | `bot/src/narrative-opportunity-guidance.js`, `bot/src/gm.js`. |
| Tests | One fresh offline policy-text test; syntax checks for changed JS/MJS. |
| Test run | `p07-f04-20261022-01`; `node --test tests/ai-gm-2026-10/p07-f04.test.mjs`; exit 0; 2 passed, 0 failed/cancelled/skipped/todo; 60.0833 ms. Syntax checks passed for `gm.js`, `narrative-opportunity-guidance.js`, and the fresh test. |
| SHA-256 | `gm.js` `CCBD45F77E8C9FAA7B0E42F80DCA3477041645806B86E3122E5205469EA0FD49`; guidance module `D5806AE7B37B39E20F5E727D199EBB068FB600425ADA60156E7189E68C962EB7`; test `1461B5067AAB759322B3F6EFB898FB634F346544FB13683C165356D6371F7878`; coverage `02A2A97A693DB8C8502AD8B23ACE3D84F050B454D0787AD099849CCEAEB4A6EA`. |
| Model calls/cost | Existing Director request receives this text; no request added. Provider calls/tokens/cost remain zero in tests. |
| Restrictions | None proposed; guidance does not require convergence or fixed pacing. |
| Rollback | Revert only F04 prompt module/insertion/test/docs; no state change. |
| Completion SHA | `cccd0304fa491a9a8425d9693cf94f11e3eacbc7`. |
