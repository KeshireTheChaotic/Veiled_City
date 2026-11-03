# R3 — unified Hope outcome concurrency and reopen evidence

Fresh file-backed tests run two independent Node processes against one action database concurrently. Both receive the identical outcome receipt; reopening shows one action revision, one resource revision and one Hope spend. Exact replay after reopen remains inert. A separate case verifies final-authorization rollback survives close/reopen with unresolved action, unchanged Hope and no outcome receipt, then allows a newly authorized commit.

Command from bot: `node --test tests/veilkeeper2/r3-action-durability.test.mjs`. Actual outcome: 2/2 passed, zero failures/skips, 206.6668 ms. Uses real files, child processes and production SQLite transaction code. Native cost/authority callbacks are synthetic. No existing suite reran because production code did not change.

This proves focused competing-process and orderly-reopen behavior, not abrupt process-kill/power-loss recovery, all campaign transactions or live ownership/consent. Native proof persistence, reservation/cancellation, isolated-store migration, all other rules and R0–R8 gates remain incomplete. No production data, deployment or phase push changed. Rollback leaves opt-in code unused. Next: durable immutable native action terms and owner-consent events feeding this transaction, followed by full rule parity and live qualification.
