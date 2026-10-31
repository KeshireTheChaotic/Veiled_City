# RF06-F04 R74 — Route the private PvP review attachment through Discord

Change only the existing private PvP menu attachment construction to the Discord public `createAttachment` helper. Preserve the owner and source gates, proposal/terms review, menu controls, text, filename, ephemeral response, mention suppression, and every consent, reaction, roll, damage, publication, and recovery path. The menu remains navigation and private review; opening it does not authorize participation or publish proposal contents to another audience.

Owned source path: `bot/src/pvp-menu.js`. Owned evidence: the fresh R74 menu test (ignored/local), this scope/ledger, the focused test logs, and the RF06 phase ledger. The helper and Discord public API are pre-existing. No transaction-sensitive repository, database facade/schema, shared public API, startup code, transition registry, mechanics, or game behavior changes. Agent C confirmed no overlap; Agent A granted the exact R74 source window.
