# C178 verification ledger

C178 was tested together with C179 after both source and metadata sets were frozen. The initial batch command, run from `bot/`, was:

```powershell
node --import ./scripts/offline-guard.mjs --test --test-concurrency=1 --test-reporter=tap tests/ai-gm-2026-10/rf04-f04-c178.test.mjs tests/ai-gm-2026-10/rf04-f01-c179.test.mjs
```

The blocking runner returned terminal output directly; no persistent log file was created.

The batch exited 1 with one pass and one failure. **C178 passed 1/1.** It verified direct Session public/service function identity, the complete seven-function Session source binding and replacement rejection, schedule receipts and duplicate-start idempotence, a real begin/rebase sequence with deterministic epoch and saved superseded generation, stale rebase refusal without a second mutation/event, current epoch fence, and Publication port forwarding for absent and persisted turn proofs. A tampered turn proof was rejected. The disposable in-memory database fake exercises the original Session factory through the moved service; it is not SQLite or production database qualification.

The failing C179 case did not execute its assertions: its child-module script had an unescaped apostrophe in an assertion string. That test-only syntax defect was repaired and only the C179 case was rerun; C178 was not rerun. The corrected C179 case passed 1/1. See [C179-RUN.json](C179-RUN.json) for its outcome and limits.

Syntax checks passed for both extracted child scripts and all 15 changed production/test JavaScript files. RF04 passed: 842 modules, 0 unowned, 1,223 raw/accepted legacy occurrences, 0 active groups, 0 transition errors. RF05 failed with 55 active groups and 55 transition errors (1,168 accepted occurrences); examples are remaining legacy module-location records such as `action-continuation.js`, `assembly-context.js`, `assembly-state.js`, `autonomous-world.js`, and `character-observation.js`. No test or production source was edited after the final test outcomes.

**Disposition:** C178's focused changed-code case and the RF04 boundary gate passed. RF05 remains unqualified due to the 55 reported repository transitions. The fake test is limited to service composition, persisted epoch/turn-proof checks, and duplicate issue prevention; it does not qualify Discord publication or production storage.
