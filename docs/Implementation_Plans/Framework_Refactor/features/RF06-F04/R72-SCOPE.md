# RF06-F04 R72 — Use Discord's existing attachment interface for simulation status

Change only the read-only simulation status command's JSON attachment construction to the existing `createAttachment` function exposed by the Discord public API. Preserve the GM gate, exact status reads and order, `Simulation state` content, JSON serialization, filename, ephemeral option and reply timing. The transaction, update, review and publication branches remain untouched.

Owned source path: `bot/src/simulation-commands.js`. Owned evidence: the fresh R72 test, this scope/ledger/log, the R71 result-SHA correction, and the RF06 phase ledger. No Discord public implementation, index/db, SQL, persistence, World/NPC behavior, transaction, shared manifest, or gameplay change.

The removed direct `discord.js` attachment capability left the exact legacy transition `2c6af039aa088ea19066e0bca6a3dbc799561261fc20fd082fbc04398ece5270` unused. After the focused source proof and Agent A's C131/AF manifest checkpoints, the record was retired in the separately coordinated R72 manifest window and archived in `R72-RETIRED.json`.
