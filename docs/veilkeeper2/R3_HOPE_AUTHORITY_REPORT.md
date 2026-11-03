# R3 — owner-authorized native action costs

Added a native Hope-cost authority and pure generic dispatcher preparation definition. Current PC ownership/control, campaign/scene, source revision, pending native action revision, canonical cost slot and exact explicit owner cost consent must agree. The model supplies only action/consent references. Native commit revalidates these bindings inside the existing atomic Hope transaction; preparation spends nothing.

Fresh command from bot: `node --test tests/veilkeeper2/r3-hope-authority.test.mjs`. Final result: 2/2 passed, zero failures/skips. Cases compose real Hope SQLite storage with synthetic current authority readers to cover valid/replayed cost, no preparation spend, stale/proxy control, revised action, mismatched consent and amount injection. A prior 2/2 run preceded strengthening explicit consent campaign/scene checks; the suite reran after that change. No unrelated suites reran.

Native action/consent creation, durable actor control, reservation/cancellation, complete action/cost/outcome atomicity and default dispatcher installation remain open. Spending a cost does not establish the action's consequence. The isolated store remains opt-in and must not become a parallel production authority. R0–R2 holds and R3–R8 gates remain incomplete. No production change, migration, deployment or phase push occurred. Next: native action state and cost reservation transaction integrating these proofs.

Revision-proof follow-up complete: missing action/control revisions now fail explicitly. Added regression case; changed suite 3/3 passed, zero failures/skips, 57.8718 ms. This supersedes the earlier 2/2 checkpoint for the changed authority. No scope or production integration claim changed.
