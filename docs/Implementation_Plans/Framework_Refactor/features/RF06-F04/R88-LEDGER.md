# RF06-F04 R88 — NPC proxy status presentation complete

`commands.js` delegates only `/vc npc status` text construction to `npcProxyAssignmentsText` in Discord. The command retains session resolution, GM/user query filters, each original GM check, and the ephemeral reply. GM mentions remain limited to the existing GM display path.

From `bot/`: `node --test tests/ai-gm-2026-10/rf06-f04-r88-npc-proxy-assignments.test.mjs` — final run exit 0, 3/3 passed, 0 failed/skipped/cancelled. An initial assertion expected one fewer permission check; inspection showed the existing global dispatcher check plus the query and per-row checks, and the corrected test verifies that unchanged sequence. Syntax checks passed for the command, Discord public API, formatter and test; changed-path `git diff --check` passed. The RF05 ratchet exits 1 on the separately authored, currently unowned Native roll-condition helper; it reports zero transition errors. The RF06 ratchet remains incomplete, with 375 transition errors.

No SQL/schema, proxy lifecycle, provider/live Discord, production DB, CI, deployment, push, merge or full-phase qualification is claimed. The source ownership/crosswalk record will accompany this slice; the RF06 phase-ledger row will follow once the commit SHA is known.
