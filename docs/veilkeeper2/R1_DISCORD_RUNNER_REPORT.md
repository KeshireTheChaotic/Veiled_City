# R1 — refreshed native turn orchestration

The new no-send runner owns one rehearsal application per turn. It refreshes intake before and after every provider call, revalidates the original native source before dispatch, refreshes before releasing the draft handle, and exposes asynchronous refreshed publication inspection. Unknown publication IDs cannot cause intake. No transport send is installed.

Fresh tests: `node --test tests/veilkeeper2/r1-discord-turn-runner.test.mjs`. Final result: 3/3 passed, zero failures/skips. Orchestration doubles test refresh ordering, revoked evidence during inference, later invalidation and unknown publication rejection. An initial 3/3 run preceded adding the explicit pre-dispatch source check; the suite was rerun because code changed. This is sequencing evidence, not live Discord or complete integration qualification.

Remaining: integration tests with real scene-store/intake/rehearsal, live Discord qualification, async API races, durable publication/replay, complete channel support and all R3–R8 work. Pending application handles are in memory; there is no exactly-once or durability claim. Production and legacy paths remain unchanged. Rollback leaves the opt-in runner unused. Next: qualify the full native chain and durable pending-turn lifecycle. No major phase has completed or been pushed.
