# RF04-F05 C153 — Public referent and scoped query roots retired

Base bcac5370. Narrative context modules read Knowledge public identity mentions and scoped fact queries through a fixed Narrative consumer bound by the knowledge--narrative pair; both root readers are removed. Four RF04 records retired. Fresh bridge test is named rf04-f06-c53 (two-digit reference).

Rollback: Revert only the C153 commit: restore root public-referents.js and scoped-query.js, the narrative-context.js and narrative-authority-context.js imports, drop the Narrative consumer and adapter binding, and restore the transitions from C153-RETIRED.json.
