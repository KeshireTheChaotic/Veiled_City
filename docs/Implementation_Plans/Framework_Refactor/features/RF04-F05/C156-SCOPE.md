# RF04-F05 C156 — Session owns opening entry source; Narrative and Publication read it through ports

Base d2c72447. Opening entry projection and narrative candidate move into Session (reading attendance through the Session slot); Narrative and Publication consume them via existing consumer-owned ports; gm.js uses Session public API. Root opening-entry-context retired. Also repoints stale rf04-f05-c104 for Session-owned slot providers (stale since C155). Test: rf04-f06-c56 (untracked per repo test policy).

Rollback: Revert only the C156 commit: move opening-entry-source.js back to bot/src/opening-entry-context.js, restore gm.js, pvp-output.js and narrative-authority-context.js imports, drop the added port names and adapter bindings, and restore the transitions from C156-RETIRED.json.
