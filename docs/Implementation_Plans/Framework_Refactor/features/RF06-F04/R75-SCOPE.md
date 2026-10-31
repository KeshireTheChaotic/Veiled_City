# RF06-F04 R75 — Use Discord's public chunking interface in command dispatch

Change only `commands.js`'s import of `chunkDiscordLines` and `splitDiscordText`, replacing the legacy `discord/chunking.js` compatibility path with the existing Discord public API. Preserve the chunking implementation, message order and contents, reply/follow-up sequencing, ephemeral translation, source/audience filters, and command behavior.

Owned source path: `bot/src/commands.js`. Owned evidence: the fresh R75 test (ignored/local), this scope/ledger, focused test and architecture logs, the exact-transition archive, and RF06 phase ledger. No Discord public API implementation, `index.js`, `db.js`, persistence repository, transaction, or gameplay behavior changes. The one existing transition `2a85b60d4f9d73d367f0db3958c1463b43c9283f7af39b324fd9e74cd8ef3490` for this private compatibility import was retired in the coordinated shared-manifest window and archived in `R75-RETIRED.json`.
