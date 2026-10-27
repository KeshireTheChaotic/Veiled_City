# RF04-F03 C68 evidence custody source

The original custody composition now forwards source lookup through its existing Knowledge-owned World consumer; `city-core.js` and the pair both expose the same original World `requireCitySource` function. No custody factory, native authority or persisted format changed. Startup already binds that consumer.

Fresh focused test `bot/tests/ai-gm-2026-10/rf04-f05-c68.test.mjs` uses the actual composition and custody entry with a fake read-only database. Missing and retracted sources are rejected before writes; an active source reaches the original human-review guard. Initial run failed 0/1 because the test expected a later unsupported-operation error instead of the actual earlier original-registration guard (exit 1, TAP 184.1251 ms). The test expectation was corrected; final run passed 1/1 (exit 0, TAP 181.402 ms). This does not qualify saved database, transaction, delivery or live behavior. `node --check` passed for the changed source and test. Test and log remain local. Source SHA256 `FCD1BA48B1A8AF8AC46C59D0E6F43F8B3A86CBDF77565E32955E97DD3B22DB24`; final test SHA256 `61990BAA6B5C88583753A07C91589BA3FBE93D8664100B0D2CF335AE2D8A9E8C`. Provider calls/tokens/cost 0/0/$0; Codex usage unmeasured.

Transition retirement and architecture gate remain pending coordinated changes to the shared manifest; phase remains open. RELEASE NOT AUTHORIZED.

Coordinated checkpoint: RF04 ratchet passed at 762 modules, zero active violations and zero transition errors; RF05 remains at 334 transition errors. Exact retired records and graph evidence are retained in the associated retirement files and RF04 phase ledger. RF04 remains incomplete.
