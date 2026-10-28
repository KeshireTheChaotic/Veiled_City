# C102 ledger

## 2026-10-28 C102 World reads Intent AI intent dispatch and typed-intent readers through a World port

Two World legacy modules (simulation, autonomous-world) stop importing the Intent root modules ai-intents.js and typed-intents.js. autonomous-world imports stateRevision from the kernel module that ai-intents.js re-exported (same function). World gains a fixed worldIntentDispatch port; Intent gains two provider slots (AI intent dispatch, typed-intent readers) that ai-intents.js and typed-intents.js fill at load with their originals. The existing intent--world adapter binds the port via connectWorldIntentDispatch from the existing initializeWorldExecution bootstrap (no index.js change). The new test imports only changed contracts and the bootstrap with feature-local fake originals.

Tests: one frozen batch of 119 files: 778 tests, 777 pass, 1 fail (named in C102-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability). Architecture: 6 exact records retired. RF04 exit 0, 0 active violations, 797 modules; RF05 226 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
