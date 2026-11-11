# R3 — read-only historical saved-roll source

Implementation slice complete. All R0–R8 acceptance gates remain incomplete.

Added getSavedRoll to legacy-readonly-repository.js, preserving audited upstream database.js line1857 guild/id lookup and raw row plus parsed payload_json shape. Native numeric and string IDs are accepted; malformed identity, JSON and absent tables hold. A payload UUID is not silently substituted for the stored roll-row ID. This is native ancestry input only, not an inference read or permission to roll. No source writes or migrations were added.

72 distinct affected native checks reached passing outcomes, Node v26.13.0. Two focused fresh SQLite checks passed in 117.8166ms. The initial 70-check dependency run passed69/failed1 in 6999.8921ms: the read-only API test used an unanchored write-verb regex that incorrectly matched save inside getSavedRoll. Corrected it to match write verbs at the start of method names; the actual SQLite write-rejection assertion remains. Only that failed check was rerun, passing in 83.2645ms. Previously passed checks were not rerun. Initial log: .reports/r3-saved-roll-source-dependencies-20261111.txt. Hashes/affected list preserve final inputs and failure/fix outcomes.

Fresh coverage: original native row/payload and guild/id behavior, integer/string identity, no source-byte change, malformed JSON, absent schema and invalid IDs. Existing history/snapshot/startup/resume checks passed. These are local SQLite/native checks, not live Discord, model, human quality or complete rules parity.

Modified files: legacy-readonly-repository.js; new r3-saved-roll-source.test.mjs; the narrow write-verb assertion in r6-legacy-readonly-repository.test.mjs; this report and hashes/affected list. No unrelated dirty files were staged.

Migration/rollback: additive read method, no state/schema change. Removing it leaves stored rolls unchanged. No old runtime/tests retired, populated migration qualification, production mutation, major-phase merge/push or provider/Discord call.

Known holds: historical group-feature execution and reaction-effect assembly, original feature/cost/owner-choice/condition provenance, current modifiers and root owner-roll composition. A stored payload or matching hash is not authority by itself.

Next exact R3 work: compose actual historical GM decision, saved-roll, NPC reaction and policy dependencies into group-feature/effect ancestry; then complete original condition validation with clear/expiry histories before enabling source-qualified rolls. Continue R0–R8; computer use remains forbidden.
