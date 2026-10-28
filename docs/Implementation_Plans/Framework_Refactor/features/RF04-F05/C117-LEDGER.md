# C117 ledger

## 2026-10-28 C117 World seed drafts validate AI intents through a World port; simulation drops an unused Knowledge re-export

World's seed-drafts.js stops importing the Intent shim ai-intent-contracts.js: World gains a fixed worldIntentValidation port bound by the adopted intent--world adapter from Intent's public validateIntent via connectWorldIntentValidation in initializeWorldExecution. World's simulation.js drops its unused re-export of Knowledge's updateRelationshipDimensions from the relationship-state.js shim (no importer in bot/src, bot/tests or bot/scripts; db.js imports the shim directly). No new provider slot; no index.js change; static reachability from index.js unchanged.

Tests: one frozen batch of 112 files: 764 tests, 763 pass, 1 fail (named in C117-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability). Architecture: 2 exact records retired. RF04 exit 0, 0 active violations, 824 modules; RF05 144 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
