# GM arbitration notice reservation — static inventory complete

The original synchronous entrypoint is `reserveGmArbitrationNotice(db,guild,decision)` in `bot/src/native-publications.js:26`. `guild` is the original guild ID argument; `decision` is the GM arbitration decision record key. The function returns the original checkpoint row synchronously and lets original errors propagate. It does not open a transaction, create an outbox, send a message or perform mechanics.

`gmArbitrationSpec` first reads `gm_arbitration_decision`, retains its original allowed-operation/risk checks, derives owner/character from native fields or original scope, and calls the original `nativeGmNotice` projector with owner-private scope. Missing or invalid projection remains rejected. The key is the original hash of decision, owner and projection revision. Source event, private notice reference, revision and recipient fields come from the original specification; a forwarding interface must not reconstruct them.

`reserveNativeNotice` checks the existing checkpoint only **after** that specification/projection validation. It returns an existing row unchanged, or saves the original `gm_arbitration_publication` checkpoint with `status: queued`, original subject/visibility, `reservation_version: 2` and original reservation hash. This pointer grants no publication or consent authority. Do not add an earlier cache/replay shortcut, extra commit, new connection, async wrapper, new reservation key or prior-row upgrade.

| Stage | Original owner and behavior | Boundary to preserve |
| --- | --- | --- |
| Reservation | `reserveGmArbitrationNotice` → `gmArbitrationSpec` → `reserveNativeNotice` | Same DB object and synchronous callpoint; only queued checkpoint persistence |
| Materialization | `queueNativeNotice` opens its existing `db.transaction` | Current scene, original render/source checks, native notice, turn attempt, outbox and pending receipt remain together |
| Delivery/recovery | `publishNativeNotice` uses the existing per-DB serial queue and `deliverTurnOutbox` | Delivered history remains history; legacy/uncertain work is held; no blind resend or reroll |

## Callers and transaction evidence

The source/hash map is in [I02-RESERVATION-MAP.json](I02-RESERVATION-MAP.json). Lexical ancestry proves only the displayed syntax, not every possible dynamic caller.

| Original point | Observed context | Required qualification |
| --- | --- | --- |
| `environment-trace-rules.js` `captureEnvironmentTrace` | Passes original risk `d.decision`, not the newly returned offer key; catches only its original expected review failures | Preserve the failed-result hook and expected-error/review behavior |
| `typed-roll-outcome-rules.js` `finalize` → trace capture | `finalizeTypedRollAction` wraps `finalize` in `db.transaction` | Real nonempty finalization rollback must include its notice checkpoint; do not claim raw dice history outside that unit rolls back |
| `group-feature-execution-rules.js` `applyGroupReactionOutcome` | Reservation is lexically inside its existing transaction, after settling the group execution | Same connection/call order and real effect/cost/checkpoint rollback |
| `feature-effect-rules.js` `cancelFeatureReaction` | Reservation follows original group settlement; helper itself has no transaction | Its `withdrawGmReactionInvitation` caller has an existing transaction; prove the complete path rather than adding one |
| `commands.js` environment trace choice | Original `chooseEnvironmentTrace` returns, then command resolves the decision and reserves its notice | No encompassing lexical command transaction is demonstrated here; preserve timing and investigate its existing recovery separately |
| Root Native composition factories | Forward the existing function into trace/group/effect rule capabilities | Keep the original function/arguments; a narrower interface must not copy reservation policy |

## Prerequisites for a forwarding contract

1. Agree one Native→Publication capability forwarding only this exact function and all three original arguments. Preserve return/error identity, synchronous throws and DB receiver/connection. Do not expose queue/materialize/send as substitutes.
2. Build a fresh disposable-SQLite case through the actual supported Native producer and original owner-private projector. Include valid nonempty reservation and missing/foreign/stale projection refusals; do not mock away source authority.
3. Force an unexpected failure after the checkpoint write in the **actual caller unit**, proving rollback of that unit's Native rows and reservation without inventing rollback of earlier immutable roll history. Check that reservation alone creates no turn/outbox/delivery work.
4. Verify unchanged-decision/revision reuse, prior checkpoint/status preservation and no independent commit. Qualify materialization/recovery separately before migrating its implementation or transaction-sensitive repositories.
5. Compose the exact original source at startup through an agreed existing pair, retain original initializer return and call order, and prove the real guarded startup path. Source/public/registry edits need an explicit exclusive slice window.

This inventory authorizes no production migration and proves no complete Native unit of work. The specific contract remains a local hold; RF05 completeness as a whole is not its prerequisite.
