# RF04-F05 C155 — Session owns opening cohort state; Narrative and Publication read it through ports

Base c581a6e9. Opening cohort state moves into Session; Narrative inspects cohort sources and Publication reads cohort candidates through consumer-owned ports; gm.js uses Session public API. Root opening-cohort-state retired. Test: rf04-f06-c55 (untracked per repo test policy).

Rollback: Revert only the C155 commit: move opening-cohort-state.js back to bot/src, restore gm.js, pvp-output.js and narrative-authority-context.js imports, drop the added Narrative and Publication port names and adapter bindings, and restore the transitions from C155-RETIRED.json.
