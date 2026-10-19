# Pre-roll Fear — native interruption contract

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

This implements the [owner-approved first purchase](PVP_CAMPAIGN_AND_PRE_ROLL_FEAR_CONTRACT.md): **one existing campaign Fear for one otherwise-legal native standard NPC attack before one existing unrolled action request**. It does not qualify the whole W5 campaign-PvP replacement or unimplemented feature catalog. Application0.0.0.1/schema460 are unchanged; no SQL migration or historical outcome rewrite.

It uses the existing `gm_discretion`, `roll_requests`, `roll_collaboration` and `narrative_encounters` opt-ins and real active encounter/template/binding/presence requirements. This change does not enable flags or start a bot. There is no new unconditional provider call or live command registration.

## Production path

1. The existing combined semantic GM request receives source/audience-filtered pending request selectors in `arbitrationPromptBoard.pre_roll_fear`. No separate Fear model request. Unified arbitration v1 remains readable; closed v2 adds at most one exact `request_ref`/`npc_intent_ref` pair.
2. The native opaque origin, accepted owner source, current principal, pending request snapshot, scene/session, NPC control/presence, encounter/template, rules and target are validated. A proposal is not execution authority. Unsupported printed features, Experience, added odds, multiple targets or extra NPC actions are not purchased by this route.
3. In the existing native transaction, `pre_roll_fear_interrupt` reserves1 from available preexisting Fear. The capped pool retains the held unit until commitment. Every reservation projection is checked against native mutation/event ancestry before a negative campaign-pool write; editing a projection status cannot release funds.
4. The native incoming attack retains private owner defense review. A separate native owner-private notice announces the exact spend, NPC/target and actual defense-review reference. The normal publication outbox persists chunks, audience and native output proofs. Only delivered chunks with exact message/channel IDs and matching notice ancestry acknowledge this intervention. Another notice, a send invocation or uncertainty cannot authorize it.
5. The original request and secondary Tag Team consumers stay held before any dice or optional spending. Independent requests and notices remain available. Native NPC dice require actual ACK plus the rightful owner's defense choice. One transaction changes the reservation to `executing`, debits exactly1 and saves the original native cost/spotlight/dice receipts.
6. A hit still needs the owner's Armor decision and native damage receipt. Final HP still needs the owner's verified terminal death workflow. While outstanding, current source/owner/scene and the unchanged pending request snapshot are rechecked. Native miss/damage/death consumers complete the reservation from actual terminal/dice proofs, without requiring a dead PC to attempt another action. Normal native eligibility still prevents that PC acting; completed bookkeeping is not action permission. Saved attack reads use committed ancestry, not a new attack against later PC resources.

`fear-reservations.js` owns ancestry/accounting; `pre-roll-fear.js` owns source-bound eligibility, ACK and original-roll gates; `pre-roll-fear-notice.js` owns the closed private projection; `pre-roll-fear-recovery.js` owns authenticated reviewed recovery. Existing DB, arbitration, incoming attack, roll collaboration and outbox services remain the only effect engines.

## GM recovery — existing command, no new registration

GM-only, ephemeral, exact-key operations through `/vc-roll effect json:`:

```json
{"op":"pre-roll-fear-review","key":"pre-roll-fear:REQUEST_KEY"}
```

Review returns a current `revision`, status, whether a native effect committed and whether delivery needs reconciliation. Then, as appropriate:

```json
{"op":"pre-roll-fear-resume","key":"pre-roll-fear:REQUEST_KEY","expected_revision":"REVIEW_REVISION"}
{"op":"pre-roll-fear-cancel","key":"pre-roll-fear:REQUEST_KEY","expected_revision":"REVIEW_REVISION","reason":"Why the unused intervention is cancelled"}
```

Resume does not confirm defenses, spend Armor or choose death. If a legitimate defense choice was saved before an ACK failure, reviewed resume uses that choice only after exact acknowledged delivery and current native legality. A committed attack returns its saved receipt, not new dice.

Cancellation only revokes unused permission: `awaiting_announcement`, no cost/dice/effect. It can cancel stale/retracted context, including a delivered-but-unexecuted announcement, because it authorizes no new effect. There is no Fear refund: the held unit was never debited. Exact review CAS and an immutable GM-private audit mutation prevent stale decisions. Cancelled NPC offers cannot execute or project new actionable invitations. Duplicate cancellation preserves history.

An uncertain/in-flight send remains held. Use the existing exact-part outbox reconciliation with actual transport evidence first; never invent an ACK or blindly resend. A known-not-sent job may follow existing retry/reconciliation rules. No GM recovery overrides owner choices or reverses committed costs, HP, dice, post-action Fear or historical publications. Corrupt native ancestry fails closed and requires an explicitly authorized projection repair, not a cancel waiver.

## Tests and limits

Three default mandatory suites cover the native lifecycle, actual combined GM/commit/publisher path, secondary Tag Team gates, independent actions/delivery, accounting/status tamper, wrong ACK substitution, current NPC control, source retraction, owner Armor/death, exact-state recovery, restart and replay. New tests24/24; directly affected final regression group102/102 plus4 focused arbitration cases. [Current ledger](NO_DEFERRALS_LEDGER.md) records commands/results and the owner-directed targeted-only boundary; historical CI passes and the interrupted full run are not substituted for current qualification.

Deterministic provider and Discord fixtures do not establish live latency, transport/read acknowledgement or unrestricted model semantics. The existing semantic+narrative fixture uses its normal two synthetic provider responses, with no additional Fear request. No paid/live calls are made.

The first supported selector targets an existing native `roll_request` action/attack from accepted owner intent in the current scope. Reaction requests, already rolled requests, Tag Teams and custom PvP round/attack requests are not silently converted into this ledger. Broader feature/encounter/PvP integrations require their real native adapters and do not gain permission from this purchase. Generic non-PvP Hope/Critical/Stress/Fear rules and the separate post-action PvP Fear account are unchanged.

Rollback: stop new v2 selection/preparation; retain v1 readers, reservation ancestry and completed native costs/dice/effects/outbox history. Review unused reservations before release. Never delete once-keys, refund a committed spotlight, reroll, alter an owner choice or resend uncertain parts.
