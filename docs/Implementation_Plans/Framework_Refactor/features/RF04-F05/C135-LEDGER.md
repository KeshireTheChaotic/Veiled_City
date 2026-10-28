# C135 ledger

## 2026-10-28 C135 Remove three root shims whose importers use owner public APIs

Deleted root re-export shims native-environment-audience.js (five Daggerheart legacy importers now import assertEnvironmentAudience from the Daggerheart public API), supply-dependencies.js (application simulation-commands.js and World simulation.js now import from the World public API) and scene-action-window.js (no production importer; Session public already exports its functions). The application import from the World public API also clears simulation-commands.js's later-phase private-API record. Local fresh tests repointed to the owner public APIs. No behavior change.

Tests: one frozen batch of 34 files: 207 tests, 206 pass, 1 fail (named in C135-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability). Architecture: 4 exact records retired. RF04 exit 0, 0 active violations, 818 modules; RF05 85 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
