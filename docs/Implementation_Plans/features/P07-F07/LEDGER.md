# P07-F07 — Ledger

**Status:** COMPLETE — raw duplicate mappings merged; 2/2 fresh checks passed.

| Field | Result |
|---|---|
| Baseline | `47f93d755e8afc00a13206f148cf759f3c826269`; branch `codex/clean-ai-gm-2026-10`. |
| Findings | Raw registry scan found duplicate keys for `world-narrative-bridge.js`, `gm.js`, `native-feature-catalog.js`, and `native-adversary-context.js`. |
| Planned changes | `bot/tests/ai-gm-2026-10/coverage.json`; new `p07-f07.test.mjs`; this scope and ledger. |
| Test evidence | Final frozen run `p07-f07-20261022-02`: `node --test tests/ai-gm-2026-10/p07-f07.test.mjs`, exit 0; 2 passed, 0 failed/cancelled/skipped/todo; 62.7856 ms. `node --check tests/ai-gm-2026-10/p07-f07.test.mjs` passed. An earlier run failed because assertions anticipated mappings not yet in this feature's frozen registry; assertions were corrected and the final run passed. |
| SHA-256 | `coverage.json`: `3264FE4835DF021A2EF5E3F386DD8479A7526466E8EB4576E2F30DC9A74F4164`; test: `45F5857F979EEECBF128E68B9EFA7E20C58FD0F23EE26DD5087955196C6E3EB5`. |
| Cost/cache | No provider or network calls; no cache change. |
| Holds/questions | None. |
| Rollback | Revert only the F07 coverage normalization and feature documentation/test commit. |
| Resulting feature commit | `3d5e1cd` (full SHA recorded in the phase ledger). |
