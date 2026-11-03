# R3 — Fear reservation reopen verification (slice complete)

Added `bot/tests/veilkeeper2/r3-fear-durability.test.mjs`. It uses separate temporary file-backed roll and Fear SQLite databases and reconstructs the native opportunity reader after closing and reopening both. Production source is unchanged.

Verification complete: from `bot`, `node --test tests/veilkeeper2/r3-fear-durability.test.mjs`: 3 passed, zero failures/skips, 226.0563 ms. Persisted pending reservations preserve capacity and immutable replay; subsequently saved owner dice prevent announcement advancement after another reopen. Announced notices replay without duplicate history. A final authorization failure rolls cancellation back; successful cancellation and released capacity survive reopening. A rehydrated reservation still requires current source authority.

Evidence limits: real local SQLite and orderly reopen, with injected native owner/source/decision inspection and synthetic delivered notices. No abrupt process kill, simultaneous cross-store operation, Discord publication, live inference or gameplay quality is established. No unchanged passing suite reran.

R3 remains partial. Known holds: native GM decision provenance, interruption coordination between roll recording and announcement, atomic Fear spending/attack settlement, live delivery and full rule parity. No migration, production switch, legacy retirement or major-phase push occurred. Rollback is removal of this isolated test; it changes no deployed state. Next exact phase: continue R3 with native pre-roll interruption coordination before enabling Fear execution. Integration/publishing destination remains `rebuild/veilkeeper2-audience-first`; baseline remains frozen.
