# RF03-F03 corrective C10 — native death-move eligibility

Extract the existing final-HP/resource precondition and owned-death-feature mapping hold into a Daggerheart-owned factory. Preserve exact bounds, messages, `PC_DEATH_MOVE` failure semantics, the distinction between Risk It All's special mapping hold and other owner-selected moves, and all current owner choices. The persistence/source proof and state-changing death move remain in `pc-death.js` and retain their existing synchronous transaction, dice and receipt flow.

Write new fresh tests only under `bot/tests/ai-gm-2026-10/`; do not run historical tests or fixtures. Freeze before one blocking targeted batch; syntax-check changed JS/MJS and run the RF03 architecture ratchet once. No dice, DB, source record, transaction, schema, narrative, or gameplay expansion. Capture exact terminal and source hashes in this ledger's companion terminal record. Roll back native module/provider/test/evidence together.
