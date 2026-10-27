# RF04-F05 C65 environment revalidation repair

**Status:** targeted offline test passed; phase and release remain open. See `C65-RECURSION-SCOPE.md`. Base checkout was `d429def383eca8925163dc5f38e3ba656a734acd`; independent agents changed other files concurrently in the shared working tree.

An actual private environment profile caused synchronous recursion: inspecting the profile revalidates its native Narrative audience; building that context asks for the same environment and reenters inspection. The original fresh test reached `RangeError: Maximum call stack size exceeded` on this supported profile creation path. Daggerheart's scoped lookup now guards the same database/guild/profile key during its synchronous evaluation, clearing the guard in `finally`. During that inner revalidation, the same in-progress environment projection is absent from the nested context; the outer lookup still returns native capabilities. All source, recipient and audience checks remain active. No schema, game rule or external provider change.

Test `bot/tests/ai-gm-2026-10/rf04-f05-c65-private-instance.test.mjs` uses a disposable SQLite database and production composition. It covers profile establishment, private recipient/scope isolation, the original source-details fingerprint, repeated lookup, guard cleanup after an injected lookup exception, database reopen and source retraction. It does not establish all environment feature semantics, actual publication, or live behavior.

Actual attempts, each invoked once with `node --import ./scripts/offline-guard.mjs --test --test-concurrency=1 --test-reporter=tap` and the test path from `bot/`:

1. Exit 1, 0/1: test imported a non-exported catalog function. Local log SHA-256 `28794948CBEDCAEBAA1BE9DBC66782C904682D0751D1D71776EF3F24FF75BF52`.
2. After test-only import correction: exit 1, 0/1, stack overflow in the actual lookup/revalidation path. Local log SHA-256 `0EA92F8245E848037E220007D2869B1F31AD7D488E8B026922F503EE02A8CD4C`.
3. After the guard and expanded regression case: exit 0, **1/1 passed**, TAP 1,897.6636 ms. Local log SHA-256 `2164BE10045699A4D82227F44077FEF1849E74547EF3CB1B91E2027BB71D2B8C`. Node syntax checks passed for changed production and test files.

Final test SHA-256 `2443895443BF6BE02981B41345425D460C51141F20BBE39737A2C0F14502E7F9`; final changed production SHA-256 `DA001557326855EB81428040253A9BFB7F3AF601EFC5AC0DCE0EAC04C0AC3742`. Local tests, logs and exit files are ignored and absent from a clean checkout, per owner decision. The final RF04 architecture gate must be run after concurrent source changes are integrated. Roll back the guard and local test/evidence together. Provider calls/tokens/cost 0/0/$0; Codex usage unmeasured. RELEASE NOT AUTHORIZED.
