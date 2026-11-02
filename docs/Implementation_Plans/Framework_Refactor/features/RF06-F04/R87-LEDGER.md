# RF06-F04 R87 — Canon proposal text boundary complete

`commands.js` now delegates only canon-proposal list rendering to the Discord-owned `canonProposalsText` formatter. The Application command retains GM authorization, optional character resolution, original `listCanonProposals` call and ephemeral reply. No Persistence or cross-framework contract changed.

From `bot/`: `node --test tests/ai-gm-2026-10/rf06-f04-r87-canon-proposal-text.test.mjs` — exit 0, 4/4 passed, 0 failed/skipped/cancelled. Tests cover exact proposal rendering/source labels, optional context, empty output, the 1,950-character clipping limit, the GM command's query arguments and ephemeral response, and denial before reads for non-GMs. Syntax checks passed for commands, Discord public and formatter modules; changed-path `git diff --check` passed.

No SQL/schema, persistence, Native authority, proposal lifecycle, provider/live Discord, production DB, CI, deployment, push or merge qualification is claimed. R86 persistence draft remains separate and uncommitted pending source and index coordination.
