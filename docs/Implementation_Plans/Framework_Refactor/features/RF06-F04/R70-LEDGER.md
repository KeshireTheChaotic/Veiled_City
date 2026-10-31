# RF06-F04 R70 — City command attachment contract

Base: `2107318d1f286e4ace6f028c76ecdd3a7ea17679` (`RF06 F04 R69 isolate seed command Discord reply`).

The city handler now uses `createAttachment` from the existing Discord public API. Its command permission check, result production, content and JSON serialization are unchanged. Immediate interactions still receive the same ephemeral reply; deferred interactions still receive the same `editReply` payload without a newly added ephemeral option. The only production source path is `bot/src/city-commands.js`.

Pre-edit worktree source SHA256: `005014bb47a6a04354da8b6657230821140be1ee6245f4156d149d155631e3da`. The worktree hash is recorded before the R70 edit; Git's checked-out blob can have a different line-ending hash on this Windows checkout. The source diff replaces only the direct `AttachmentBuilder` import and constructor with the existing public API call.

Fresh changed-code result: `node --test tests/ai-gm-2026-10/rf06-f04-r70.test.mjs` — exit 0, 2 passed, 0 failed, 881.9968 ms. Changed-source syntax: `node --check src/city-commands.js` and `node --check tests/ai-gm-2026-10/rf06-f04-r70.test.mjs` — exit 0. Both cases invoke the real city command handler with an in-memory event-list reader and verify the existing GM permission callback, query arguments, exact response text, attachment filename/JSON, and the distinct immediate/deferred response options. No database or live Discord connection is opened.

No new transition record is retired in R70; the command still imports `PermissionFlagsBits` directly from `discord.js`, and its remaining Discord capability is unchanged. R69's old AttachmentBuilder transition remains pending Agent A's C130 manifest commit and subsequent exact RF06 manifest lease. No full RF06/RF07, live Discord, or release qualification is claimed.

Rollback: revert only the R70 city-command source and evidence paths. Next exact work: RF06-F04 R71 qualify the existing story-command JSON attachment through Discord's public attachment API while retaining its GM gate, result composition, preview text, and reply options.
