# P07-F10 — Ledger

**Status:** COMPLETE — one additional source-grounded non-conversation intersection path; local holds remain for other relationship classes.

| Field | Result |
|---|---|
| Baseline | `47f93d755e8afc00a13206f148cf759f3c826269`; branch `codex/clean-ai-gm-2026-10`. |
| Changed code | `bot/src/world-narrative-bridge.js` ranking characterization; new offline feature test; coverage mapping. |
| Evidence contract | A `resolved_player_intent` signal carries its authenticated typed-intent hash and the exact root world-event hash. The lookup must still return a resolved intent and active public/party root. |
| Test | Final changed-contract batch `p07-corrective-20261022-01` passed all 3 F10 tests. `node --check` passed for the bridge and F10 test. The new cases test exact public source hashes, distinct resolved actors, private/stale/one-actor rejection, and selector mapping. |
| SHA-256 | Bridge `332B880564BBF4E37026DEDD9D46A71725E6BDB0CF9CD798A45C7213B6550F22`; test `03A962DBE19F2826FA29B0B2212F964B7210E7F7F039EAE5B8A21538E7AD2E5E`; coverage `14C55AC3D5142E9D7B34118126E420BA5843680E5C7369656139C7C0A1D0AA2E`. |
| Cost/cache | No provider/network calls; no cache change. |
| Local holds | NPC/faction, relationship, backstory and distinct-location causal intersections are not inferred; current cross-signal adapters do not establish them. |
| Rollback | Revert only F10 source classification, coverage, test and documentation. |
| Provider/cache | Zero provider/network calls; no cache, persistence, or live performance measurement. |
| Completion commit | Shared source-ranker commit is recorded in both F09/F10 ledgers after local commit. |
