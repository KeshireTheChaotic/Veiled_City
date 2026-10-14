# Saved assembly delivery recovery

Starting source: `391988528c2a366bb4aa57fc2493ef6b205cb340` (10.0.0). This is an assembly transport/projection repair, not a campaign reset, new assembly generation, or rules change.

Accepted typed intents are canonical adjudication inputs; authenticated human declarations own intent; native receipts own outcomes.

## Finding

Session 6's saved freeform hooks were passed to the generated-private publication guard without certified parts. The guard correctly rejected the first hook before Discord transport. Legacy delivery bookkeeping had already marked the part delivering, classified the rejection as uncertain, stopped processing, and misleadingly displayed the unattempted second character as FAILED. The read-only diagnostic reported zero database changes. GM notes in the assembly command response are ephemeral GM-only, not player delivery.

## Repair and authority

- The saved plan and its raw proposals remain intact. Existing plans are not regenerated to recover delivery.
- Assembly publishes native operational orientation plus independently validated GM-owned parts using the current output-part proof, transactional outbox, archive and private delivery machinery. Orientation reports check-in and saved position, explicitly not new arrival/co-location or action resolution. An optional exact current owner declaration is attributed as unadjudicated, not an outcome. Registered data is mention-escaped.
- New assembly plans may supply `public_parts` and per-entry `private_parts` through the existing single structured planning request. Native NPC/world/receipt validation remains mandatory; fabricated receipts, unsupported prose, other owners' private evidence, and PC decisions cannot authorize delivery. There is no new provider call.
- Raw public openings/private hooks remain GM-private proposals. A DELIVERED orientation does **not** mean an arbitrary raw hook was certified or sent. Existing saved plans without structured parts still receive truthful orientation, not an invented convergence event. This repair does not add fresh NPC authoring or relax its residual semantic-risk contract.
- Per-session/plan/audience transport jobs reuse stable turn identities and acknowledged outbox parts. Source, owner/control, scene, roster, plan and actual recipient/body are revalidated on restart and immediately before send. Native metadata records are bookkeeping, not fictional-effect receipts. No roll, movement, consent, resource, canon or character knowledge is created by orientation.
- Legacy uncertainty holds only its affected scope. Other recipients can proceed. Unknown native sends remain uncertain; demonstrably unsent native sends can retry saved authorized bytes. Acknowledged legacy history is retained and labelled LEGACY_DELIVERED, not retrospectively certified.
- GM-private reconciliation requires an explicit human attestation that the exact unacknowledged legacy hooks were checked and not delivered. The button is bound to its issuing GM, saved plan, owners and delivery-state revision. It records an audit and marks only those legacy parts not sent; it does not send or regenerate anything. Delivered/acknowledged parts are never reset. Unknown technical exceptions are not hidden as successful delivery.

## After deployment

1. Restart Veilkeeper when ready. Deployment does not restart it.
2. GM runs `/vc session assemble` (legacy `/vc-session assemble` handler is also supported).
3. Check Tyrell's DM/private channel. If **all** legacy uncertain hooks represented by the control were not delivered, click **I checked: hooks were not delivered** in the GM-only response.
4. Run `/vc session assemble` again. It resumes the saved plan's verified delivery without regenerating or duplicating acknowledged parts. Billy/public orientation can already have completed independently.

Do not click the confirmation if delivery occurred or remains unknown. Partial acknowledged legacy hooks require exact-part investigation, not this blanket confirmation. Native outbox uncertainty uses the existing GM-only publication reconciliation controls, not the legacy button. No reseed, session reset, slash registration, dependency change or manual SQL cleanup is required.

## Qualification and rollback

`assembly-authority-test.mjs` exercises real command/component adapters, synthetic Discord transports, saved-plan reuse, source-backed owner-private NPC dialogue, cross-owner/public rejection, GM-only bounded followups, interrupted/definite-unsent delivery, restart/owner/plan/source changes, concurrency and legacy acknowledged history. All fixtures use temporary SQLite and a network-denied runner. Detailed actual results are in the progress ledger.

No schema migration or historical outcome rewrite. Rollback is code-only to the starting source with the bot stopped; retain the new city records/world events/outbox/audit rows. Never erase delivery acknowledgements or resend uncertain publications. Reverting code does not make raw legacy prose publishable; it restores the previous blocked transport path. Live Discord delivery/performance remains unqualified until the owner-authorized restart and checks.
