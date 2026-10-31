# RF06-F04 R72 — Simulation status attachment contract

Base: `7209b3269ec89795fd4d588d029928c609143fe6` (`RF06 F04 R71 use Discord story attachment interface`).

The simulation command now uses `createAttachment` from the existing Discord public API. Only the read-only `status` path was exercised; it preserved the original owner gate, six database reader calls and argument order, output text, `simulation.json` name, JSON bytes, ephemeral option and reply behavior. Mutation, transaction and publication branches were not executed or changed. The only production source path is `bot/src/simulation-commands.js`.

Pre-edit source SHA256: `266fa375906d89a3ae52b734c449491638318b0b216786d24582de36286cd180`. Fresh test path SHA256: `fc1f57ef5c4b4df3b03123e683a5aed1f5ec0d9222089705d00a529205a8bf99` (`bot/tests/ai-gm-2026-10/rf06-f04-r72.test.mjs`). The repository keeps ignored fresh test files local; this test is not staged unless an exact commit lease directs otherwise.

Fresh changed-code result: `node --test tests/ai-gm-2026-10/rf06-f04-r72.test.mjs` — exit 0, 1 passed, 0 failed. Changed-source syntax: `node --check src/simulation-commands.js` and `node --check tests/ai-gm-2026-10/rf06-f04-r72.test.mjs` — exit 0. The actual handler test uses in-memory read-only methods and performs no database, Discord or provider access.

The changed-file architecture inspection found zero active violations and one exact unused `EXTERNAL_CAPABILITY_OWNER` transition, which was retired only after source/test qualification under Agent A's exclusive manifest window. Its complete original record is in `R72-RETIRED.json`. The coordinated RF06 checker remains red on earlier-phase obligations; changed-path and final summary evidence are recorded in `R72-TEST.log`. This is not a phase-wide pass.

Rollback: revert only the R72 source and evidence paths. Next exact feature: RF06-F04 R73 inspect the read-only long-output branches in `roll-menu.js`; move only Discord attachment construction after confirming a fresh fixture can exercise the existing output without invoking owner-choice or persisted-receipt mutations.
