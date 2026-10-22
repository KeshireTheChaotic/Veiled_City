# P07-F09 — Ledger

**Status:** COMPLETE — mandatory precedence corrected; 3 fresh tests pass.

| Field | Result |
|---|---|
| Baseline | `47f93d755e8afc00a13206f148cf759f3c826269`; branch `codex/clean-ai-gm-2026-10`. |
| Changed code | `bot/src/world-narrative-bridge.js`; fresh feature test and coverage mapping. |
| Test | Final bridge batch after the F10 hold ran `node --test tests/ai-gm-2026-10/p07-f03.test.mjs tests/ai-gm-2026-10/p07-f06.test.mjs tests/ai-gm-2026-10/p07-f09.test.mjs tests/ai-gm-2026-10/p07-f10.test.mjs tests/ai-gm-2026-10/p07-f12.test.mjs`; exit 0; 15 passed, 0 failed/cancelled/skipped/todo; 490.7311 ms. An earlier frozen union exposed stale F03/F09 expected order; one targeted repair batch passed 6/6. |
| SHA-256 | Final bridge `27C8F47141FEE2B60D1702308BFCB2616795FF0BB98ADD516FA8A256D7B5AE22`; F09 test `6C1F3379070E5C5C35E13A4D9C6FCF27774C6F65D854985DD7B639002ACD9A37`; refreshed F03 test `21F1EE619842504FC3FC66B2ABD297286A9B0FE7B4C8AA57D055B2A0025A3273`; coverage `14C55AC3D5142E9D7B34118126E420BA5843680E5C7369656139C7C0A1D0AA2E`. |
| Semantics | `unresolved_narrative_task` and opening requests are mandatory; `resolved_player_intent` is causal; `conversation_development` is optional personal. Scene transitions remain causal urgency 3. |
| Cost/cache | No provider/network calls; no cache change. |
| Holds | More mandatory items than four remain truthful omissions in the packet; no implicit resolution. |
| Rollback | Revert the F09 classification and feature-specific test/docs commit. |
| Provider/cache | No provider calls, network calls, caching, persistence, or state mutations; no cost or live performance measurements. |
| Completion commit | Shared source-ranker commit `607dba7b9a88696b956a9f7d0358edb8b7381410`; safe final closeout `07d090322ef155368c3b1dad877fc019d1ba6946`. |
| Comparator guard | Final policy check separately verified mandatory/causal classes ignore overlap metadata; F09 remains protected by this restriction. |
