# RF04-F05 C152 — Owner action terminal root retired

Base 6ad6f0a1. Intent typed-intents reads the Session owner action terminal overlap through a fixed Intent consumer bound by the intent--session pair; the root reader is removed. Two RF04 records retired. Fresh bridge test is named rf04-f06-c52 (two-digit reference).

Rollback: Revert only the C152 commit: restore root owner-action-terminal.js and the typed-intents.js import, drop the Intent consumer and adapter binding, and restore the transitions from C152-RETIRED.json.
