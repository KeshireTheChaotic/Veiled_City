# RF06-F04 R88 — NPC proxy status presentation

Move the existing `/vc npc status` output construction into a Discord-owned formatter. Preserve the Application command's active-session lookup, GM/user-scoped `listNpcProxies` filters, the original global/query/per-row GM checks, GM-only owner mentions, empty-state copy and ephemeral reply. The formatter imports only the Discord-owned `npcControlLabel` helper.

The fresh tests cover exact GM and player text, the empty state, actual command dispatch, query arguments, permission-check count, owner mention privacy and ephemeral delivery. No Persistence SQL, proxy lifecycle, authorization policy or Native authority moves.
