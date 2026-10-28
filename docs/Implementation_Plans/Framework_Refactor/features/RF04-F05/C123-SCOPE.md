# RF04-F05 C123 — Daggerheart encounter library

Move the existing `EncounterLibrary` class and its stateless selection/normalization helpers into Daggerheart. Retain the original `encounter.js` export as a direct re-export of the same class through the Daggerheart public API. Preserve synchronous file access, lookup ordering, random selection, thrown errors, class identity and cold-import behavior. The root module retains its separate identical `pick` helper for the existing default-objective workflow. This is a prerequisite for World encounter reader isolation; its other legacy encounter dependencies remain.

Rollback: restore the original class and helper/imports to `encounter.js`, remove the Daggerheart class source and public export. No schema or saved data changes.
