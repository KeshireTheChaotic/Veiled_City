# P07-F24 — Ledger

**Status:** PARTIAL — public accepted writer output and outbox delivery/recovery verified. Private-recipient publication and simultaneous cross-process sender contention remain outside this fixture. Baseline `a067857b1029d8579fb41b2517065e7e098305a6`; feature commit SHA in phase closeout.

| Evidence | Result |
|---|---|
| Pipeline | Real `GMService.runWorldDirector` → delegated V9 writer → `applyAuthoritativeMutation` → accepted native narrative unit → `queueDirectorPublications` → `deliverTurnOutbox`. Accepted text came from the established native unit; player agency/mechanics safety assertions passed. |
| Provider/transport | Two deterministic offline provider responses per workflow; only transport callback mocked. No paid provider, network, CI, production DB or Discord. |
| Recovery | Disposable SQLite closed/reopened after outbox commit; uncertain transport was not resent, exact mock bot message reconciliation completed after awaiting the serialized reconciliation result, proven `notSent` allowed one retry, and delivered reads caused no duplicate send. |
| Test | `node --test bot/tests/ai-gm-2026-10/p07-f24.test.mjs`; one repair batch after first failure; final exit 0, 2 passed, 0 failed/skipped/cancelled/todo, Node duration 2807.408 ms. Syntax check and `git diff --check` passed. |
| Cost | Four deterministic injected offline responses across two workflows; no live/provider/network/Discord/CI cost. No new model calls in production path and no caching change. |
| Failure history | First batch: 1/2 passed; awaited serialized reconciliation was omitted in the test, so the assertion read before the transaction completed. Repair awaited it and matched the persisted destination; final batch passed. The earlier failed result is retained here. |
| Limit | Not evidence for private-recipient publication, simultaneous cross-process send contention, live Discord, staging/production state, rollout, or semantic narrative quality. |
