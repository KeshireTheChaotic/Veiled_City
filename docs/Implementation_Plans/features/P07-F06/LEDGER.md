# P07-F06 — Ledger

**Status:** COMPLETE — 4 fresh acceptance tests passed; coverage map parsed.

| Field | Result |
|---|---|
| Baseline | `5c1da825f6bffd52d30a3882af19df6f2ddf6a3c`. |
| Fresh test | `bot/tests/ai-gm-2026-10/p07-f06.test.mjs`; imports only modified P07 policy modules and Node standard libraries. |
| Actual run | `p07-f06-20261022-01`; `node --test tests/ai-gm-2026-10/p07-f06.test.mjs`; exit 0; 4 passed, 0 failed/cancelled/skipped/todo; 346.899 ms. `node --check` passed for the fresh test; updated `coverage.json` parsed successfully. |
| SHA-256 | Test `B22F3C2B661CF4F1641F5DDB614E30CF001452C57CC55ED00BCB49057D53F087`; coverage map `EEBBF68E589FC013370D9BC4EFA30DF456F8476BDDB03646C3743CF1A1B83C88`. |
| Previously passing tests | F02 4/4, F03 3/3, F04 2/2 are not rerun because their associated production modules have not changed since those passes. |
| Changed production | None in F06; acceptance covers `narrative-opportunity-policy.js`, `world-narrative-bridge.js`, `narrative-opportunity-guidance.js`. |
| Cost and cache | No provider calls/tokens/cost; no cache change. Offline test runtime is not live latency evidence. |
| Live limits | No model semantic testing, Discord, DB, cross-process replay/delivery or release qualification. |
| Acceptance boundary | Fresh cases prove same-NPC authenticated speech overlap; private/unverified/split-NPC evidence exclusion; urgency/response guidance; deterministic selection and cap. Named campaign-flavored scenarios, generated prose quality, actual no-op Director response, and end-to-end delivery/replay are not exercised. Other cross-character links remain unknown until exposed by an equally safe native source. |
| Rollback | Revert F06 evidence/test commit; no state migration. |
| Completion SHA | `35fa2eb5510bdff14cb9648e41513cf81878efe3`. |
