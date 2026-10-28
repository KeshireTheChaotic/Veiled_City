# RF04-F05 C91 — World identity and Narrative-World bridge sources

Base 45df09f2. Two legacy modules left changed but undocumented by the parallel agent: world-identity-persistence.js takes scene-fiction hashing (jsonHash) and the expected scene-fiction hold from the kernel, and narrativeSourceVisible through World's existing worldNarrativeAuthorship port, instead of the Narrative root scene-fiction-context.js; the Narrative-World bridge takes activeCityProxy from World's public API instead of the root city-constraints.js. This slice documents, tests (protocol-compliant: imports only the two changed modules) and qualifies that change; the same frozen batch also qualified S10 and C82.

Rollback: revert only the C91 commit and restore its three exact transitions from C91-RETIRED.json.
