# R3 — immutable incoming offer for a held Fear interruption (slice complete)

Added fixed native incoming-offer preparation inside the existing Fear transaction/store. It requires an acknowledged announcement and the coordinator's matching active roll hold. The native candidate retains the original interrupted source/revision, owner/control, target, NPC and decision; it includes target/encounter/statblock revisions, an inspected rule fingerprint, bounded native attack/defense terms and supported damage dice. Unknown or invalid fields are rejected. Candidate evidence is reread before commit.

The saved offer remains `awaiting_defense` with `effectsCommitted: false`. Replay is immutable; changed target/rule terms conflict. No Fear debit, attack RNG, Armor choice or damage is created. It does not authorize an owner response or assign PC behavior.

Modified files: `rules/fear-reservations.js`, `rules/pre-roll-fear-coordinator.js`, `r3-fear-coordinator.test.mjs`, this report and SHA-256 manifest.

Verification complete: from `bot`, `node --test tests/veilkeeper2/r3-discord-fear-announcements.test.mjs tests/veilkeeper2/r3-fear-coordinator.test.mjs tests/veilkeeper2/r3-fear-reservations.test.mjs tests/veilkeeper2/r3-fear-durability.test.mjs tests/veilkeeper2/r3-fear-opportunity-reader.test.mjs`: 35 passed, zero failures/skips, 1485.3638 ms. Output: parent workspace `fear-incoming-offer-test.log`. New actual file-backed tests cover offer/reopen/replay, retained Fear/roll hold, original-source/owner/rule mismatch, changing candidate and authorization rollback. Existing consumers reran because their Fear-store dependency changed.

Native attack legality is an injected reader obligation: current encounter/statblock, presence, range, access, target attackability, passives, hit features, conditions and house errata must be validated before supplying this record/fingerprint. A fingerprint or assertion supplied by a model is not proof. That real adapter and full parity are still missing. No live Discord or inference quality is established.

Migration/rollback: optional incoming record in the existing reservation JSON; no schema change or production migration. Preserve offers/holds/publication receipts on rollback; leave the opt-in coordinator unused. R3 and R0–R8 remain incomplete; no legacy retirement, deployment or major-phase push occurred. Next exact phase: R3 source-bound affected-owner defense review/confirmation before debit and attack RNG. Integration/publishing target remains `rebuild/veilkeeper2-audience-first`.
