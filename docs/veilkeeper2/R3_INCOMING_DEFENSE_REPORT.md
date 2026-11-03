# R3 — source-bound affected-owner defense review (slice complete)

Added native incoming defense review and choice persistence to the existing Fear store/coordinator. Every operation rechecks the immutable native attack candidate and active roll hold. The coordinator inspects the evidence source: campaign/scene, principal, actor and exact private owner audience must match the affected PC. Native review/choice evidence must match offer hash, owner/control and attack; confirmation must reference the saved review and a later native sequence. A repeated immutable choice is inert.

Explicit withholding records `hold_for_owner`. Later explicit base-defense confirmation can reach `ready`, retaining both choices. Silence cannot advance anything. A ready offer still has `effectsCommitted: false`: no Fear debit, RNG, Armor spend or damage occurs. Non-base feature defenses cannot be confirmed through this base-only route and retain withholding/review requirements.

Modified files: `rules/fear-reservations.js`, `rules/pre-roll-fear-coordinator.js`, `r3-fear-coordinator.test.mjs`, this report and hash manifest.

Verification complete, from `bot`:

- `node --test tests/veilkeeper2/r3-discord-fear-announcements.test.mjs tests/veilkeeper2/r3-fear-coordinator.test.mjs tests/veilkeeper2/r3-fear-reservations.test.mjs tests/veilkeeper2/r3-fear-durability.test.mjs tests/veilkeeper2/r3-fear-opportunity-reader.test.mjs`: 38 passed, zero failures/skips, 1822.1095 ms. Parent output: `fear-owner-defense-test.log`.
- After adding the feature-defense regression, the changed test suite alone ran: `node --test tests/veilkeeper2/r3-fear-coordinator.test.mjs`: 19 passed, zero failures/skips, 1613.5997 ms. Parent output: `fear-owner-defense-extra-test.log`. Total unique cases at this source checkpoint: 39; overlapping runs are not additional coverage.

New file-backed evidence covers review→withhold→reopen→confirm→reopen/replay, retained resources/dice holds, unreviewed and out-of-order choices, public/wrong-owner/revoked sources, stale candidate, authorization rollback and feature-defense exclusion. Native source/event readers are injected test fixtures; native event provenance, ordering and real Discord review/choice UI remain to be connected. No test proves live behavior or full parity.

Migration/rollback: review/choice records extend existing incoming JSON; no schema or production migration. Preserve original offer/source hashes and owner choices on rollback. No production path, legacy runtime or deployment changed. R3 and R0–R8 remain incomplete; no completed-major-phase push occurred. Next exact phase: R3 atomic native Fear debit and fixed native attack RNG after current explicit defense checks, with saved immutable outcome and no resource/dice replay. Feature defense routes, owner Armor/death settlement and native legality adapters remain required. Publishing target remains the rebuild branch.
