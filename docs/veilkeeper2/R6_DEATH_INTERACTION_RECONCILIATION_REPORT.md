# R3/R6 — canonical death interaction reconciliation (slice complete)

Added a native repair path for transport bookkeeping after an already committed death review, move choice or recovery allocation. It reads the immutable observed envelope, original delivered prompt/options, exact interaction binding and insertion order, current owner/control identity, existing canonical native receipt and privately entitled issued-source ancestry. Only that canonical receipt's reference/hash and a fixed reconciliation proof can repair the interaction row. The path does not call ingress, resolve fate, allocate resources, advance the workflow or contact Discord.

Repair leaves acknowledgement and hold history intact. It preserves delivered/uncertain replies; an unfinished reply attempt becomes uncertain and an unsent reply becomes withheld. A repaired row cannot retry that confirmation through the normal reply-claim API. Repeated native repair is idempotent. Missing effects, identity/source drift or revoked caller authorization remain held. Already committed owner evidence remains inspectable after death or prompt expiry without reviving an active source grant or allowing a new choice.

The opt-in workflow exposes this operation only with an explicit native caller authorization check, including transaction-boundary rechecks. This is trusted native composition, not a player/model RPC or a new AI tool; external command/session caller authorization still needs implementation.

Modified files: new `bot/src/v2/death-interaction-reconciliation.js`, fixed transport reconciliation method in `interaction-receipts.js`, native composition in `native-death-workflow.js`, extended `bot/tests/veilkeeper2/r3-discord-death-decisions.test.mjs`, report/hash manifest and ledger. No gameplay validator, legacy route, production entrypoint or existing test was retired.

Verification complete on Node v26.13.0, worktree root:

```text
node --test bot/tests/veilkeeper2/r3-discord-death-decisions.test.mjs bot/tests/veilkeeper2/r6-death-dispatcher.test.mjs
46 passed; 0 failed/cancelled/skipped; 17781.9787 ms
```

The exec session was polled to completion without restarting. Output is in the tool transcript. Actual native scene/source/action/prompt/decision modules are used with cold rule/source reopening; the composed workflow also reopens the file-backed interaction store before repair. Gap cases deliberately simulate a missing local receipt after a canonical commit; they do not constitute process-kill/crash qualification. Checks include all three receipt kinds, death/expiry, unchanged dice/resources, withheld confirmation, missing consequence, edited source, denied caller and final authorization rollback. Discord SDK/gateway/permission/send/reply methods and native attack/Armor bootstrap remain simulated. Unchanged publication suites were not rerun. No live Discord, production database or whole-phase acceptance is claimed.

Migration/rollback: additive JSON `reconciliation` proof and `withheld` reply status in the existing opt-in interaction table; no schema or production migration. Keep all interaction/source/prompt/decision/action databases. Older code must leave repaired/withheld records untouched and must not reset claims. Disabling the native composition is the rollback; canonical effects and receipts remain authoritative. This repair cannot invent a missing canonical consequence, prove Discord accepted an uncertain acknowledgement, or replace expired/changed prompts.

Known holds: owner/GM command/session authorization and receipt disclosure; reviewed prompt supersession and unsaved-send-response recovery; conversational outcome publication and Fear continuation wiring; full native import/rules/GM/Blaze adapters and parity; process/crash/live qualification and authoritative migration. R3/R6 and R0–R8 remain incomplete. Next exact phase: authenticated native command/session composition and stale-prompt review, followed by remaining actual rules/GM/executor adapters. No major-phase gate, phase merge/push or production deployment occurred. Rebuild branch remains the only phase-publication target.
