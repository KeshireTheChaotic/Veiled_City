# P07-F08 — Ledger

**Status:** COMPLETE — 3 fresh tests passed; source/test syntax passed.

| Field | Result |
|---|---|
| Baseline | `47f93d755e8afc00a13206f148cf759f3c826269`; branch `codex/clean-ai-gm-2026-10`. |
| Changed code | `bot/src/narrative-opportunity-policy.js`; fresh feature test and coverage mapping. |
| Test | `p07-f08-20261022-02`: `node --check src/narrative-opportunity-policy.js`; `node --check tests/ai-gm-2026-10/p07-f08.test.mjs`; `node --test tests/ai-gm-2026-10/p07-f08.test.mjs`; exit 0; 3 passed, 0 failed/cancelled/skipped/todo; 60.4241 ms. This run followed the fresh selector mapping being added. |
| SHA-256 | Policy `6A5FDB4D50AE759DE170213B46ADB8815FC31035065937E5F93BE6FA6E40E266`; test `6687524B1110D218D3ED75C0C0BD91E2A6124132E67B0E283B86F82F8F54FECB`; coverage `FA6006464EC051D4EA1DE77DA0F72634E00D125B02BA65D0E03B3A97CE3F751E`. |
| Cost/cache | No provider/network calls; no cache change. |
| Holds | None. |
| Rollback | Revert the F08 comparator and feature-specific test/docs commit. |
| Completion commit | `a90cfc8bae205938ead910298017d574b3321326` (amended with mapping + selector assertion below). |
