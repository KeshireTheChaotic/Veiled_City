# RF04-F05 C133 — Session-World opening bridge reads Narrative-World beats through a World slot

Base e440b094. opening-world-bridge.js (session--world) no longer imports the narrative--world world-narrative-bridge.js; it reads the original worldDirectorBridgeBeats and openingOpportunityRequests through the new World slot worldNarrativeBridgeSource (World root-sources contract, World public), which world-narrative-bridge.js binds at load (startup-reached via gm.js). Batch failures are all preexisting; the C120 held test's load failure (missing narrativeUnitSource export) reproduces on committed files. Supplemental 72-file batch of gm/opening/director consumers: 170/170 pass.

Rollback: Revert only the C133 commit: restore the world-narrative-bridge.js import in opening-world-bridge.js, remove the World narrative bridge slot, its public export and the bind in world-narrative-bridge.js, and restore the exact transition from C133-RETIRED.json.
