# RF04-F05 C154 — Narrative salience reads record listing through the Knowledge readers port

Base 6b1863de. Narrative salience reads Knowledge narrative record listing and limit through the existing Narrative Knowledge readers port; root narrative-records shim retired.

Rollback: Revert only the C154 commit: restore root narrative-records.js, the narrative-salience.js import, drop the added port names and adapter bindings, and restore the transitions from C154-RETIRED.json.
