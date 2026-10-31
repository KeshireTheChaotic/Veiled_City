# RF06-F03 R65 — original reservation qualification

Status: complete for the original owner-withdrawal caller; no production API migration authorized by this scope.

Use a fresh disposable SQLite database and current production producers to build an executable All Lanes Stop owner invitation. Verify a nonempty original `nativeGmNotice`, then inject a SQLite reservation insert failure into the original owner withdrawal caller. Require the complete caller transaction to roll back, followed by successful original replay and an owner-bound queued reservation. No fabricated decision/receipt ancestry, mocked authority, transport, schema change, or transaction-sensitive repository migration.

Frozen initial batch: the new `rf06-f03-r65.test.mjs` only. Record failures and repair only this qualification. Existing passing suites remain complete. Agent A retains shared production source, transition registries, and default Git index ownership; Agent C retains AF changes.
