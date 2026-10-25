# RF04-F07 — Changed-code qualification and phase gate

Audit the exact current RF04 scope/feature ledgers, F01–F06 hold records, changed-code test logs, hashes and latest RF04 architecture ratchet. Carry forward only tests that were actually executed against the current or unchanged associated production source. Do not rerun unchanged passing tests, legacy suites, or a broad union. This slice changes no runtime code and cannot convert local holds or unqualified workflows into completion claims.

Produce an acceptance matrix by F01–F07, a phase ledger update, and a machine-readable run record. A feature may be marked qualified only at its recorded scope. RF04 can exit only if all scoped phase criteria have evidence, no local hold conflicts with phase exit, and current architecture enforcement shows no unauthorized edge, unowned module or transition error. If any criterion is open, mark RF04 INCOMPLETE and state the next exact feature; proceed with independent safe RF05 work as its prerequisite permits.

No tests are run for this audit-only slice because no production source is changed; rely on the exact fresh targeted evidence referenced by hash in feature ledgers. Reconcile the latest architecture result from the F06 run. Record known unknowns, rollback (documentation-only), cost and release status. RELEASE NOT AUTHORIZED.
