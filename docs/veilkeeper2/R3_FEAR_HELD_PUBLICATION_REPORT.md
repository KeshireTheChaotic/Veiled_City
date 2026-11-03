# R3 — bind publication to the native roll hold (slice complete)

The native coordinator now exposes claim, uncertainty and acknowledgement operations which verify the saved roll hold against the reservation's campaign/request/decision before and after the Fear transaction. Claim and acknowledgement also use the existing current-opportunity reader. A standalone reservation or mismatched decision cannot authorize coordinator publication. An acknowledged announcement retains both reserved Fear and the owner-roll hold; no execution or completed-interruption release is implied.

Modified files: `rules/pre-roll-fear-coordinator.js`, `r3-fear-coordinator.test.mjs`, this report and SHA-256 manifest.

Verification complete: from `bot`, `node --test tests/veilkeeper2/r3-fear-coordinator.test.mjs`: 11 passed, zero failures/skips, 928.3189 ms. New file-backed tests cover claim→uncertain→reopen→acknowledgement→reopen/replay, missing/mismatched holds and final authority revocation rollback. Only the changed coordinator suite reran. Source/decision and delivery evidence are synthetic native dependencies; no live Discord send or inference occurred.

Migration/rollback: no schema change. Opt-in native adapter only; production remains unchanged. Saved holds, reservation receipts and attempt identities must be retained on rollback; removing them would permit duplicate operations. No data migration, legacy retirement or major-phase push occurred.

R3 and R0–R8 remain incomplete. Holds: live exact-audience publication adapter and reconciliation, native decision/reviewer authority, completed incoming attack/death settlement, atomic Fear debit/effects, shared-engine migration and full parity. Next exact phase: R3 native announcement preparation/transport using this coordinator, with current Discord audience revalidation before sending and durable uncertainty handling. Publishing target remains `rebuild/veilkeeper2-audience-first`; baseline is untouched.
