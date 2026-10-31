# RF06-F04 R69 — Isolate seed-command Discord response construction

Move the existing GM seed command's Discord response payload construction into a Discord-owned helper exported through the Discord public API. Preserve the exact summary, 1,950-character content limit, ephemeral flag, mention suppression, JSON serialization and `seed-drafts.json` attachment. The application handler keeps command parsing, World/content operations, errors and `interaction.reply`; its existing caller keeps the GM authorization check.

Owned source paths: `bot/src/seed-commands.js`, `bot/src/frameworks/discord/public.js`, and new `bot/src/frameworks/discord/seed-command-output.js`. Owned evidence paths: the fresh R69 test, this scope/ledger/log, and the RF06 phase ledger. No SQL, persistence, transaction, World behavior, command registration, authorization, index startup, or gameplay changes.

At implementation start, the exact legacy transition for the old direct Discord attachment capability was pending Agent A's C130 shared-manifest checkpoint. After C130 committed, R69 retired only that exact record in its separately leased transition commit (`508b424e1b38ec7ead8cf39f2a5e3edf22555cde`), with the original entry retained in `R69-RETIRED.json`.
