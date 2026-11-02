# RF06-F04 R90 — Relationship list presentation

Move only the existing `/vc relationship list` text assembly into a Discord-owned formatter. Preserve Application-owned character lookup, GM/user filters, the exact `listRelationships` arguments, post-read character scoping, the 30-row cap, 1,950-character clipping, empty-state copy and ephemeral reply. No Persistence SQL, audience policy, relationship mutation or canon authority moves.

Fresh tests cover exact line text, empty output, row and character limits, actual GM/player command filters and ephemeral delivery. The formatter receives only the rows already filtered by the command.
