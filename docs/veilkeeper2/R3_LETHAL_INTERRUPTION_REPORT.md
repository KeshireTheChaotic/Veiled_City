# R3 — lethal interruption completion from native death outcomes (slice complete)

Fear interruption completion now accepts an exact resolved native death outcome tied to the original final-HP damage/eligibility, owner/control, actor, scene and choice. It validates the supported move/result/terminal-state mapping and canonical resource ownership. Pending Hope allocation or Blaze final action remains held. Resolved allocation/Blaze require their committed child proofs. Outcome/eligibility/damage evidence is reread before commit.

The completion records death outcome identity/hash and whether the original action is blocked. Dead, unconscious, journey-ended, completed Blaze and unfilled-recovery cases cannot resume the old PC action even if an external actor projection is stale. Recovered PCs still require the existing current source/owner/adjudication continuation check; completion never creates dice or forces an action. Incapacitated characters need lawful native recovery/review or a fresh owner declaration.

Modified files: `rules/fear-reservations.js`, `rules/pre-roll-fear-coordinator.js`, `r3-fear-coordinator.test.mjs`, this report/hash manifest and ledger.

Verification complete, from `bot`: `node --test tests/veilkeeper2/r3-fear-coordinator.test.mjs tests/veilkeeper2/r3-discord-fear-announcements.test.mjs tests/veilkeeper2/r3-fear-reservations.test.mjs tests/veilkeeper2/r3-fear-durability.test.mjs tests/veilkeeper2/r3-fear-opportunity-reader.test.mjs`: 57 passed, zero failures/skips, 5197.89 ms; Node v26.13.0. Parent output: `lethal-interruption-final-test.log`.

An initial 36/36 coordinator run preceded the added Blaze/journey-end test coverage; only changed test/consumer coverage reran. Results are not additive. New integration uses actual saved native attack, PC damage, canonical lifecycle, death/critical/scar/allocation/Blaze receipts and file-backed Fear/roll reopen. Cases cover death/unconscious/journey-end blocking despite stale healthy projection, critical recovery continuation, pending/explicit Hope allocation, pending/completed Blaze, wrong/changing death proof and final authorization rollback. Canonical PC fate remains committed when the later cross-store interruption closure rolls back; retry does not undo or repeat that fate.

Source, GM review, adjudication and Blaze terminal inspectors remain injected fixtures; this does not prove real event provenance, live Discord/gameplay, dead-owner private-history entitlement or final executor integration. No source/choice/roll is fabricated by model parameters. Internal completion does not publish private death choices or update actor knowledge.

Pinned parity reference: `pre-roll-fear-rules.js:150–178` at `1ba6c7e15db1a66ba34b36336f31437beffe44d6`, including terminal death checks and retained original-action review for incapacitated owners. Actual wake/healing and lawful old-action recovery routes remain required.

Migration/rollback: optional death proof/block flag in completion JSON; no schema or production migration. Older nonlethal completion receipts remain readable; no earlier lethal completion path existed. Preserve PC effect/outcome and interruption receipts on rollback; never erase fate or a blocked-action flag to replay. No production entry point changed.

R3 and R0–R8 remain incomplete. Next exact phase: R3 native owner Armor/death ingress and real source/actor/GM/cost/final-execution adapters, including owner-only history access after death and native wake/recovery. Full feature/PvP/movement/item/economy parity, migration and concurrent/crash/live gates remain open. No live send, deployment, legacy retirement or completed-major-phase publication occurred. Publishing target remains the rebuild branch.
