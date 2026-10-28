# RF04-F05 C128 — Operations reads the World simulation overview through a port

Base fca840c2. operations/overview.js no longer imports root simulation.js; it reads the original World simulationOverview through the new consumer-owned operationsWorldOverview port (frameworks/operations/contracts/world-overview.js), bound by the operations--world adapter via initializeOperationsWorldOverview in index.js and compose-startup.mjs. The operations--world pair is adopted in BRIDGE_CONTRACTS.json with test reference rf04-f06-c28.test.mjs (two-digit name for C128). Overview content and visibility are unchanged.

Rollback: Revert only the C128 commit: restore the simulation.js import in operations/overview.js, remove the Operations World overview port, operations--world adapter, initializer, its index/compose-startup calls and the pair adoption, and restore the exact transition from C128-RETIRED.json.
