# C176 verification ledger

The frozen C176 service migration was verified alongside C177 in a single fresh, changed-code-only batch. The final qualifying command, run from `bot/`, was:

```powershell
node --import ./scripts/offline-guard.mjs --test --test-concurrency=1 --test-reporter=tap tests/ai-gm-2026-10/rf04-f04-c176.test.mjs tests/ai-gm-2026-10/rf04-f04-c177.test.mjs
```

**Final result:** exit 0; 2 tests, 2 passed, 0 failed, 0 skipped. The C176 case exercised the changed Session service and public export identity, owner attendance registration, World-event fail-closed behavior and rollback before binding, binding to the native event function, and saved registration, carry, and opening-entry replay behavior. The test uses a new in-memory database fake and a child Node process. It imports only the changed Session public API and changed attendance service directly; unchanged provider contracts are reached through the public API.

Three earlier combined attempts failed on test-only expectation, binding-shape, and generated-regex mistakes. A targeted C176 run later passed 1/1, but parent review classified it as diagnostic only because that draft imported unchanged contract modules directly. It does not count as qualification. The final test was corrected to go through the changed public API and passed in the qualifying batch. Full attempt details and hashes are in [C176-RUN.json](C176-RUN.json).

Syntax checks passed for four changed production JavaScript files and both new tests (6/6). The RF04 ratchet passed: 843 modules, 0 unowned modules, 1,229 raw and accepted legacy occurrences, 0 active violation groups, and 0 transition errors. The RF05 ratchet failed with 57 active groups and 57 transition errors (1,172 accepted occurrences); its first examples are pre-existing root module-location transitions for action-continuation, assembly-context/state, autonomous-world, and character-observation. No test or production file was changed after the final qualifying batch.

**Disposition:** C176 changed-code behavior and RF04 boundary are qualified. RF05 remains blocked by the 57 reported repository transition errors; the batch provides no evidence that those errors are caused by C176.
