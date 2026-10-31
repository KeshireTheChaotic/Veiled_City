# RF06-F04 R76 — Route private PvP terms pagination through Discord public

Change only the `splitDiscordText` import in `pvp-menu.js`, replacing the legacy `discord/chunking.js` shim with the existing `frameworks/discord/public.js` export. Preserve the function, 1,400-character page boundary, text, review controls, current owner/source checks, ephemeral audience and follow-up behavior.

Owned source path: `bot/src/pvp-menu.js`. Owned evidence: fresh R76 test (ignored/local), this scope/ledger, focused test and architecture logs, and RF06 phase ledger. No Discord public implementation, public API, index, database facade/schema, persistence repository, transition registry, mechanics, consent, or publication behavior changes. Agent A granted exclusive ownership of the source path; Agent C confirmed no AF overlap.
