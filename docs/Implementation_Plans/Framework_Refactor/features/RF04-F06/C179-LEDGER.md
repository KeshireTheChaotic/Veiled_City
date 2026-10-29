# C179 verification ledger

C179 was tested together with C178 after both source and metadata sets were frozen. The initial batch exited 1 because the child script for C179 did not parse: one assertion message contained an unescaped apostrophe. C178 passed in that run; no C179 assertion had executed. I changed only that test string and reran the failed C179 test by name:

```powershell
node --import ./scripts/offline-guard.mjs --test --test-concurrency=1 --test-reporter=tap --test-name-pattern='World civic retirement preserves canonical functions' tests/ai-gm-2026-10/rf04-f01-c179.test.mjs
```

The blocking runner returned terminal output directly; no persistent log file was created.

**Corrected result:** exit 0; 1 test passed, 0 failed, 0 skipped. C178 was not rerun after its pass.

The fresh case checks canonical civic function and array identity; the canonical module's source-port binding and removed root shim; the Intent port's uncomposed fail-closed result; the existing Intent–World adapter's bound call, error-object identity, single invocation and guild forwarding; and a real `city-commands` community update through the World public API that writes one saved row and one audit mutation. It also checks route text for the changed civic consequence, simulation, command and AI intent consumers. These tests do **not** establish successful native influence mutation or full actor, payload and return-value forwarding. The command fake is in-memory and does not qualify production database or Discord deployment behavior.

Both extracted child scripts passed `node --check --input-type=module -`; all 15 changed production/test JavaScript files passed `node --check`. RF04 passed: 842 modules, no unowned modules, 1,223 accepted legacy occurrences, no active groups, and no transition errors. RF05 failed with 55 active groups and 55 transition errors (1,168 accepted occurrences); the first reported examples are remaining root module-location transitions outside this feature. Full commands and tested hashes are in [C179-RUN.json](C179-RUN.json).

**Disposition:** C179's focused changed-code test and RF04 boundary gate passed. RF05 remains unqualified because of the 55 reported transition errors. This test is a bounded routing and guard check, not broad civic, Intent, or product qualification.
