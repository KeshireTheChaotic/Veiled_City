# RF04-F05 C151 — Opening entry and assembly evidence roots retired

Base afbd0a63. Publication pvp-output reads Session opening entry and assembly coverage evidence through a fixed Publication consumer bound by the publication--session pair; both root readers are removed. Four RF04 records retired. Fresh bridge test is named rf04-f06-c51 (two-digit reference).

Rollback: Revert only the C151 commit: restore root opening-entry-evidence.js and assembly-evidence.js, the pvp-output.js imports, drop the Publication consumer, publication--session adapter and initializer, and restore the transitions from C151-RETIRED.json.
