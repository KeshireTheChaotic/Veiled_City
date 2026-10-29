# C165–C167 verification ledger

## RF04-F06 — Application workflow relocation

Moved seven application workflows into `bot/src/application/workflows/`, preserved their named exports through `public.js`, repointed production callers, and removed the former root files. Tests import the public registry and verify that every moved module export is the same function exposed by the registry.

The fresh C165–C167 test contributes 3/3 passing cases in one combined run with C175. It verifies registry exports and removed root paths, manual/no-op behavior, per-session in-flight deduplication, and that an uncertain saved publication cannot obtain a delivery recovery review or reach a send path. The combined command passed 4/4 total with no failures, skips, or cancellations. No old tests or `compose-startup.mjs` were used.

`node --check` passed all 15 changed JS/MJS paths in the combined source and test scope. The initial RF04 gate found one `UNREGISTERED_BRIDGE_CONSUMER` for C175’s `bot/src/gm.js` import of the Session–World pair public API; `BRIDGE_CONTRACTS.json` did not yet list `gm.js`. The metadata owner added that consumer and the narrow C175 scope statement. The one authorized post-repair RF04 rerun passed with 843 source modules, zero unowned modules, zero active groups, and zero transition errors. RF05 was also rerun once because its original count included this metadata violation; it remains incomplete with 59 active legacy module-location groups/errors.

`git diff --check` and JSON parsing passed. The feature test uses a fake in-memory database and did not access network, production SQLite, or live providers. It does not establish full application runtime or release qualification. Exact command, counts, source hashes, and gate results are in `C165-C167-RUN.json`.

Next exact phase: C176 Session opening-attendance composition relocation as separately proposed; RF05 remains open.

## Gate-only rerun after registry repair

Registry SHA-256: `7B5C11CB428214E61B09C5A896BB3A58862C382D56053EB528BDDCE608930683`. RF04 exit 0, pass, 843 modules, 0 unowned, 0 active groups, 0 transition errors. RF05 exit 1, 843 modules, 0 unowned, 59 active groups and 59 transition errors; the first remaining items are legacy Session and World module locations. These were gate-only reruns: no tests or production sources were rerun or changed. Exact machine-readable results are in `C165-C167-RUN.json`.
