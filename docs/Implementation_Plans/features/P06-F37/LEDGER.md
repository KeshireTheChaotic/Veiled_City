# P06-F37 — ledger

Status: SUPPORTED / TARGETED PASS.

- Branch/start SHA: `codex/clean-ai-gm-2026-10` / `c54a1d7542745264e6b88ce09a69fdb512014eca`.
- Occurrence: [`environment:aster-vale-predictive-lab:everything-logs`](../P06-F01/occurrences/environment--aster-vale-predictive-lab--everything-logs/SCOPE.md).
- Changed modules: `native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js` (including the existing contract's missing `fear:0`), `native-house-errata.js/json`, coverage map, updated F01 counts and new F37 tests. The existing `native-environment-trace.js`, GM arbitration and typed-roll finalization are included in the mapped fresh tests.
- Frozen batch `p06-f37-20261021-a`: 127/128 pass; one contract mismatch revealed the absent zero-Fear field. After that production repair, the full mapped batch `p06-f37-20261021-repair` passed 128/128 across 35 fresh files, exit 0, 2919.325 ms. Unique affected coverage 128/128.
- Implementation/tested SHA: `70a5b734d11a4e64dd649e8e0b506258c70ab634`; changed-file syntax: 5/5; changed JSON parse: 3/3. Exact input hashes: [targeted evidence](../../evidence/P06_F37_TARGETED.json).
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache savings claimed; Codex usage unavailable.
- Owner questions/restrictions: none proposed.
- Local holds: DB-backed live replay, Discord delivery and full release qualification. The selected existing route is covered by fresh exact-source and dispatch/saved-reader boundary tests; it was not run against live persistent campaign state.
- Critical blocker: none. Release authorization: false.
