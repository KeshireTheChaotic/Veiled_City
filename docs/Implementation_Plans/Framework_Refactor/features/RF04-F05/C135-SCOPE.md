# RF04-F05 C135 — Remove three root shims whose importers use owner public APIs

Base ab8239ff. Deleted root re-export shims native-environment-audience.js (five Daggerheart legacy importers now import assertEnvironmentAudience from the Daggerheart public API), supply-dependencies.js (application simulation-commands.js and World simulation.js now import from the World public API) and scene-action-window.js (no production importer; Session public already exports its functions). The application import from the World public API also clears simulation-commands.js's later-phase private-API record. Local fresh tests repointed to the owner public APIs. No behavior change.

Rollback: Revert only the C135 commit: restore root native-environment-audience.js, supply-dependencies.js and scene-action-window.js re-export shims and their importers' root imports, repoint the local tests back, and restore the exact transitions from C135-RETIRED.json.
