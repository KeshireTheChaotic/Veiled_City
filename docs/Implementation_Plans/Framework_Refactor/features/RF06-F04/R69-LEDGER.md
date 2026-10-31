# RF06-F04 R69 — Seed-command Discord response boundary

Base: `5efd590dede6a73d56d8ecadc1b434a8eb679eba` (`AF07 qualify full-turn feature rejection`).

The original response construction now lives in the Discord framework and is reached through its public API. `handleSeedCommand` retains the original domain calls, error behavior, result, and reply timing. The command caller still checks GM authorization before invoking it. The helper does not decide audience or authority; it only formats the same GM-only response and wraps the same JSON attachment.

Fresh changed-code result: `node --test tests/ai-gm-2026-10/rf06-f04-r69.test.mjs` — exit 0, 3 passed, 0 failed. Changed-source syntax checks: `node --check` for `src/seed-commands.js`, `src/frameworks/discord/seed-command-output.js`, `src/frameworks/discord/public.js`, and the R69 test — exit 0 for all four. Initial focused run was 2/3 because the long-content fixture populated a field the original summary does not read; corrected the fixture to use a long draft key, then the final run passed 3/3.

The three cases exercise the existing read-only draft handler and exact query arguments; non-empty and empty draft summaries; record summary fallback; ephemeral and `allowedMentions` options; attachment name and JSON bytes; and visible-text truncation at 1,950 characters while preserving the complete attachment. No database, provider, or live Discord connection is opened.

Shared architecture check identified the one legacy `EXTERNAL_CAPABILITY_OWNER` transition for the removed `AttachmentBuilder` import (id prefix `b39ff4f0`). It remains pending until Agent A finishes the concurrent C130 manifest checkpoint and releases an exact transition window. No manifest or other-agent path is included here. The persistent schema remains 460. No gameplay, publication delivery, Discord live behavior, or release qualification is claimed.

Rollback: revert only the R69-owned source and evidence paths. The source rollback restores direct `AttachmentBuilder` construction in `seed-commands.js` and removes the new Discord helper/export. Next exact work: obtain the isolated R69 transition lease, re-evaluate the next independent RF06-F04 command boundary, and record that next slice after the current shared-manifest checkpoint.
