# P07-F12 — Ledger

**Status:** PARTIAL — focused acceptance fixtures exercise source selection; candidate-to-Director integration held under F11.

| Field | Result |
|---|---|
| Baseline | `47f93d755e8afc00a13206f148cf759f3c826269`. |
| Changed paths | Fresh P07-F07..F12 tests/coverage and P07 phase documentation. |
| Test | Initial `p07-f12-20261022-01` passed 2/2; after the causal-vs-optional boundary was tightened, the test was updated and is included in the final targeted repair batch. |
| Final evidence | F12's 2/2 tests passed in the final bridge batch (15 tests total, exit 0). Test SHA-256 `156098128C2E78C3A87FA5ADA5D670A158D9E1EC338C28B672C0ABE831AB9A8D`; coverage SHA-256 `14C55AC3D5142E9D7B34118126E420BA5843680E5C7369656139C7C0A1D0AA2E`. |
| Cost/cache | No live providers, network or cache change. Offline test time is not live latency evidence. |
| Holds | Native SQLite/Discord candidate-to-delivery integration and live narrative semantics are not proved by the available focused offline fixture. |
| Rollback | Revert only F12 acceptance/documentation delta; no persisted state changed. |
| Batch/limitations | The final bridge batch after the test was updated exited 0 with F12's 2/2 tests passing (15 tests total). The earlier frozen union found stale F03/F09 expected order; affected tests were repaired in a targeted batch and passed. Cross-module Director handoff, persisted SQLite, Discord, and live publication behavior remain unverified. |
| Provider/cache | No provider/network calls; no caching or live cost/latency measurements. |
