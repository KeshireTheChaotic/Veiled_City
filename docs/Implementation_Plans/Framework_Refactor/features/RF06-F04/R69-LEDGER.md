# RF06-F04 R69 — Seed-command Discord response boundary

Base: `5efd590dede6a73d56d8ecadc1b434a8eb679eba` (`AF07 qualify full-turn feature rejection`).

Result: source qualification commit `2107318d1f286e4ace6f028c76ecdd3a7ea17679`; exact transition retirement and archive commit `508b424e1b38ec7ead8cf39f2a5e3edf22555cde`.

The original response construction now lives in the Discord framework and is reached through its public API. `handleSeedCommand` retains the original domain calls, error behavior, result, and reply timing. The command caller still checks GM authorization before invoking it. The helper does not decide audience or authority; it only formats the same GM-only response and wraps the same JSON attachment.

Fresh changed-code result: `node --test tests/ai-gm-2026-10/rf06-f04-r69.test.mjs` — exit 0, 3 passed, 0 failed. Changed-source syntax checks: `node --check` for `src/seed-commands.js`, `src/frameworks/discord/seed-command-output.js`, `src/frameworks/discord/public.js`, and the R69 test — exit 0 for all four. Initial focused run was 2/3 because the long-content fixture populated a field the original summary does not read; corrected the fixture to use a long draft key, then the final run passed 3/3.

The three cases exercise the existing read-only draft handler and exact query arguments; non-empty and empty draft summaries; record summary fallback; ephemeral and `allowedMentions` options; attachment name and JSON bytes; and visible-text truncation at 1,950 characters while preserving the complete attachment. No database, provider, or live Discord connection is opened.

Shared architecture check identified the one legacy `EXTERNAL_CAPABILITY_OWNER` transition for the removed `AttachmentBuilder` import (id `b39ff4f00cace8abe2b841cc7c666dc5aeadb713322e7f1ca98eb6f6a0f28fbc`). Agent A first committed its separate C130 manifest changes; the exact R69 record was then retired and archived in the separate transition checkpoint. The RF05 ratchet passed at 1,071 modules, 4,340 imports, 596 accepted legacy occurrences, zero active groups and zero transition errors. The RF06 ratchet remains red at 383 earlier-phase active groups/transition errors; a source-specific inspection found zero active/transition errors for `seed-commands.js` and confirmed the R69 record is absent. The persistent schema remains 460. No gameplay, publication delivery, Discord live behavior, or release qualification is claimed.

Rollback: revert only the R69-owned source and evidence paths. The source rollback restores direct `AttachmentBuilder` construction in `seed-commands.js` and removes the new Discord helper/export. Next exact work: obtain the isolated R69 transition lease, re-evaluate the next independent RF06-F04 command boundary, and record that next slice after the current shared-manifest checkpoint.
