# R3 — native pre-roll hold coordination (slice complete)

`rules/roll-store.js` now serializes a fixed Fear hold with owner dice recording in the same SQLite transaction domain. A hold requires a delivered, unrolled request; an already saved roll cannot acquire one. The hold binds one immutable native decision, blocks only its request, survives reopening and releases only on matching native cancellation evidence. Closed holds cannot be reused. No general unlock, AI tool or direct state patch was introduced.

`rules/pre-roll-fear-coordinator.js` saves the hold before reserving Fear and revalidates native opportunity/hold authority around reservation. A failed reservation leaves a visible durable hold requiring reconciliation. Cancellation saves the validated cancellation first, then releases the roll hold; interruption between those steps is safely resumable. This is explicit ordering across separate stores, not an atomic multi-store transaction. Announcement, spending, incoming attack/death settlement and completed-interruption release remain unimplemented.

Verification complete:

- From `bot`, `node --test tests/veilkeeper2/r3-fear-coordinator.test.mjs tests/veilkeeper2/r3-roll-store.test.mjs tests/veilkeeper2/r3-roll-lifecycle.test.mjs tests/veilkeeper2/r3-roll-action.test.mjs tests/veilkeeper2/r3-fear-opportunity-reader.test.mjs tests/veilkeeper2/r3-fear-durability.test.mjs`: 19 passed, zero failures/skips, 480.1727 ms.
- Remaining changed-dependency consumer: `node --test tests/veilkeeper2/r3-roll-preparation.test.mjs`: 2 passed, zero failures/skips, 53.8385 ms. No already-passing unchanged suite reran within this checkpoint.

New file-backed cases cover hold/replay/reopen, independent requests, rejection after saved dice, hold authorization rollback, reservation failure, cancellation-proof mismatch and interrupted release/retry. Native source/decision/delivery dependencies are synthetic. No abrupt crash or simultaneous competing processes, live Discord delivery or live inference was tested.

Pinned parity reference: `pre-roll-fear-rules.js:181–195` holds the original request while an interruption is pending; baseline remains pinned at `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. Modified source: roll store and new coordinator; new test: `r3-fear-coordinator.test.mjs`; report/hash manifest record this slice.

Migration/rollback: opt-in roll databases gain only `vk3_roll_fear_holds`; no production data was opened or migrated. Existing request/event layouts are unchanged. Old roll-store code rejects this additional table, so rollback requires preserving the new database and restoring a pre-change copy; do not discard holds or downgrade an active store in place. Full migration rehearsal remains open.

R3 and R0–R8 remain partial. Next exact phase: R3 concurrent-process hold/roll qualification, reviewed orphan-hold recovery, authoritative publication coordination and validated Fear execution behind the generic dispatcher. No legacy retirement, deployment or completed-major-phase push occurred. Publishing target remains `rebuild/veilkeeper2-audience-first`.
