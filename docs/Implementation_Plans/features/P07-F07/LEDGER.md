# P07-F07 — Ledger

**Status:** COMPLETE — raw duplicate mappings merged; 2/2 fresh checks passed.

| Field | Result |
|---|---|
| Baseline | `47f93d755e8afc00a13206f148cf759f3c826269`; branch `codex/clean-ai-gm-2026-10`. |
| Findings | Raw registry scan found duplicate keys for `world-narrative-bridge.js`, `gm.js`, `native-feature-catalog.js`, and `native-adversary-context.js`. |
| Planned changes | `bot/tests/ai-gm-2026-10/coverage.json`; new `p07-f07.test.mjs`; this scope and ledger. |
| Test evidence | Final frozen union run `p07-corrective-20261022-01` included `p07-f07.test.mjs`; 2 passed, 0 failed/cancelled/skipped/todo. The same F07 test was run once again as part of the final changed-contract batch after its test and registry mappings were updated. `node --check` passed. |
| SHA-256 | `coverage.json`: `14C55AC3D5142E9D7B34118126E420BA5843680E5C7369656139C7C0A1D0AA2E`; test: `7B75C01DED8D865ACDBC543EC12CA9E67D41AED94989FBC44A158AB918AEFF69`. |
| Cost/cache | No provider or network calls; no cache change. |
| Holds/questions | None. |
| Rollback | Revert only the F07 coverage normalization and feature documentation/test commit. |
| Resulting feature commit | `4c8b480f59554707ed3390fcb4150e23d9ca6f4b`; later coverage tests add F08–F12 mappings in their feature commits. |
