# RF04-F05 C125 — Native encounter composition source

Move the original `livePcRoster`, `partyTier` and `autoBuildComposition` wrappers and their single lazy composition instance into a Daggerheart-owned source. Retain the original `encounter.js` exports as direct re-exports through Daggerheart public. Use the same original factory and Node crypto random-index capability, and retain the root's unrelated `defaultObjective` random helper. This provides three native encounter functions needed for the World encounter reader; the remaining mixed encounter source dependencies and its cross-framework interface still require migration.

Rollback the new source, Daggerheart public exports and root re-exports together. No schema or saved data changes.
