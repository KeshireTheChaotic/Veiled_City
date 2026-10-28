# C128 ledger

## 2026-10-28 C128 Operations reads the World simulation overview through a port

operations/overview.js no longer imports root simulation.js; it reads the original World simulationOverview through the new consumer-owned operationsWorldOverview port (frameworks/operations/contracts/world-overview.js), bound by the operations--world adapter via initializeOperationsWorldOverview in index.js and compose-startup.mjs. The operations--world pair is adopted in BRIDGE_CONTRACTS.json with test reference rf04-f06-c28.test.mjs (two-digit name for C128). Overview content and visibility are unchanged.

Tests: one frozen batch of 91 files: 527 tests, 523 pass, 4 fail (named in C128-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability; rf04-f05-c39.test.mjs | both World consumers preserve original bodies and use their own exact native evidence interface; rf04-f05-c41.test.mjs | World seed implementation body remains byte-identical after exact import replacement; rf04-f05-c42.test.mjs | original Narrative authority and speaker bodies including pre-existing dirty source are unchanged). Architecture: 1 exact records retired. RF04 exit 0, 0 active violations, 839 modules; RF05 123 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
