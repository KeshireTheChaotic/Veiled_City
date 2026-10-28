# RF04-F05 C126 — Native encounter actor validation

Extract the original stateless `encounterActors` body from Daggerheart's grounding factory into one Daggerheart-owned actor factory. Both the existing grounding workflow and a lazy public source use that one implementation. The historical `encounter.js` reader imports and re-exports the public source, preserving its use by `proposeWorldEncounter` and existing consumers. Use only the original World source/key, Session scene/presence and NPC evidence ports: no new bootstrap binding, source policy or actor state.

Rollback the actor factory and source, Daggerheart public export, grounding delegation and root reader together. No schema or saved data changes.
