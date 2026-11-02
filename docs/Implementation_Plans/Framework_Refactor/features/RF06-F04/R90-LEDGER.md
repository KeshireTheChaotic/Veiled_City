# RF06-F04 R90 — Relationship list presentation complete

`commands.js` delegates only relationship-list text assembly to Discord's `relationshipListText`. The Application command keeps character resolution, GM/user filters, exact Persistence arguments and post-read character scoping; the reply remains ephemeral.

From `bot/`: `node --test tests/ai-gm-2026-10/rf06-f04-r90-relationship-list-text.test.mjs` — final run exit 0, 3/3 passed, 0 failed/skipped/cancelled. An initial row-cap assertion used rows that exceeded the existing 1,950-character limit before 30 rows were visible; the corrected compact fixture verifies the row cap independently while a separate case verifies clipping. Syntax checks passed for commands, Discord public, formatter and test; changed-path `git diff --check` passed. The RF05 ratchet exits 1 on Agent C's unowned Native helper; it reports 0 transition errors and no R90 path in the available errors.

No SQL/schema, audience-policy, relationship lifecycle, provider/live Discord, production DB, CI, deployment, push, merge or full-phase qualification is claimed. The source ownership/crosswalk record accompanies this slice; the RF06 phase-ledger row will follow once the commit SHA is known.
