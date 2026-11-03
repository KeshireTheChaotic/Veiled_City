# R3 — native ordinary-roll action windows

Connected ordinary roll preparation, durable roll evidence, owner-result inspection and action control states. Preparation opens awaiting_notice; acknowledged exact stakes open awaiting_player_roll; validated owner dice open ready_to_resolve. No resolved state or gameplay effect is granted. Transition proofs are checked inside action transactions; exact event replay remains inert.

Fresh command from bot: `node --test tests/veilkeeper2/r3-roll-action.test.mjs`. Actual result: 2/2 passed, zero failures/skips, 59.7061 ms. Tests compose real preparation/roll/action SQLite services and result inspection, with native source/actor/adjudication doubles. They cover staged evidence windows, no-effect readiness, exact owner-result replay and stale control preserving the open roll window. No unrelated suites reran.

Separate stores do not yet make preparation and action/outcome commits one atomic campaign transaction. Crash reconciliation, current live source proofs, notice refresh, cancellation, all roll variants and real effect/receipt consumption remain open. R3 and broader gates remain incomplete. No production change, migration, deployment or phase push occurred. Rollback leaves opt-in coordination unused. Next: unify authoritative action/resource/outcome persistence and qualify crash/replay behavior before enabling effects.
