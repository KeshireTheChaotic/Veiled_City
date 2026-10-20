# Campaign PvP policy

Development checkpoint: **IN PROGRESS, not phase-qualified or deployed**. The commands below persist native policy/safety controls; the uncommitted v4 executor still needs complete producer, owner-workflow, multiplayer, recovery and publication qualification. Do not infer end-to-end support from the presence of an enabled policy.

Campaign PvP is an explicit GM-controlled policy for qualified, source-bound native PC attacks. When enabled, those attacks can resolve without bilateral approval. The policy does not itself start an attack, select a target, roll dice, or create effects. Players' choices remain voluntary.

## GM controls

Use the `/vc-roll pvp` JSON endpoint:

```json
{"op":"campaign-mode","enabled":true}
```

Set `enabled` to `false` to disable the policy. Both changes require GM/admin permission. Check the saved setting with:

```json
{"op":"campaign-status"}
```

## Owner safety stop

An owner can stop hostile PvP effects involving their character:

```json
{"op":"safety-stop","character_id":"YOUR_CHARACTER_ID"}
```

The stop holds new and unfinished hostile PvP effects involving that character. It is sticky: turning campaign PvP off or on does not clear it, and there is no GM override or implicit re-enrollment. Committed native outcomes are unchanged.

## Preserved rules

Campaign policy does not bypass owner choices for defense, Armor, or death. It does not authorize automatic attacks or rolls, and it does not make voluntary player choices on anyone's behalf. Historical v3 bilateral approval behavior remains intact; enabling this policy applies only to qualified native attack routes that support campaign mode.

## Native private controls and recovery

Source-grounded ordinary equipped/unarmed attacks can produce owner-private native requests under the enabled policy. The attacker reviews and confirms their own mechanics; base target Evasion is not a defender signature. Actual damage produces a separate affected-owner Armor offer and, where applicable, their native death workflow. No PvP Hope or Critical Stress is awarded. Unsupported feature mappings stay in scoped review; the feature catalog is qualified separately.

Use `/vc-roll pvp-menu reference:REQUEST_OR_DAMAGE_OFFER` for private controls. The urgent safety-stop control saves before Discord transport and is not queued behind narration. Inspect your own sticky stop with `/vc-roll pvp json:{"op":"safety-status","character_id":"YOUR_CHARACTER_ID"}`.

If a pending native Armor offer becomes stale after an independent sheet change, its affected owner can use **Reinspect pending defense**, or `/vc-roll pvp json:{"op":"armor-refresh","damage":"EXACT_PENDING_OFFER"}`. Recovery creates a new source-bound offer, preserves the old binding/source, supersedes its permission and requires a fresh private review before Armor selection. It does not reroll, choose Armor, alter HP or override safety/source/owner changes. Applied outcomes cannot be refreshed.

The approved pre-roll Fear purchase remains one existing campaign Fear for one acknowledged, otherwise-lawful standard NPC spotlight. Custom PvP and fully owner-authored unrolled Tag Team requests use the same reservation/announcement/owner-defense/native-result lifecycle. Shared costs are never refunded or reselected by an interrupt. A native death outcome that prevents the original action produces scoped GM-private recovery review, not permission for an incapacitated PC to roll. Already committed native outcomes remain intact.

Uncertain Discord delivery is inspected/reconciled through the existing outbox tools; never reroll or blindly resend to recover a notice. These instructions describe the W5 implementation candidate; qualification status is recorded in the phase ledger, not implied by documentation.
